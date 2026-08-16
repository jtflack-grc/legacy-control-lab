import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { buildCoachContext } from "./coachContext.js";
import { buildCoachShell } from "./coachShellApi.js";
import { resolveSessionLane } from "../ibmi-runtime/sessionLane.js";
import { listCoachEvents } from "../db/repositories/runtimeRepository.js";
import { buildMissionCoachPayload, listMissionSummaries } from "./missionApi.js";
import { getMissionProgressForUser, resolveCoachMissionProgress } from "../missions/missionEngine.js";
import {
  authorizeLabSessionMutation,
  authorizeLabSessionRead,
  clearLabSessionFocus,
  findCoachLabSession,
  findLabSession,
  verifyLabSessionToken,
} from "./sessionRegistry.js";
import {
  authorizeMissionAttempt,
  listAttemptFindings,
  readJsonBody,
  scorePreviewForAttempt,
  upsertAttemptFinding,
} from "./missionFindingsApi.js";
import { collectEvidenceForAttempt } from "./missionEvidenceApi.js";
import { restartMissionForLabUser, startMissionForLabUser } from "./missionStartApi.js";
import { loadLabRuntimeConfig } from "./labConfig.js";
import { buildDemoTrainerPayload, normalizeDemoPath } from "./demoTrainer.js";
import { buildIongrcTrainerPayload, normalizeIongrcPackId } from "./iongrcTrainer.js";
import { isSkillPathId, missionIdForSkillPath } from "./skillPaths.js";
import { getPublicLaneCredentialsForApi } from "./signOnCredentials.js";
import { APP_NAME, APP_SUBTITLE, RUNTIME_NAME, TAGLINE } from "../branding.js";
import { COMMAND_CATALOG_VERSION } from "../ibmi-runtime/commandCatalog.js";
import { countCatalogCommands } from "../ibmi-runtime/commandCatalog.js";
import { getDatabasePath, isDatabaseInitialized, getDatabase } from "../db/sqlite.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export type LabHttpServerOptions = {
  port: number;
  host?: string;
  ironTermPublicDir: string;
  systemName: string;
  websockifyPort: number;
  mcpHandler?: (req:http.IncomingMessage,res:http.ServerResponse)=>void|Promise<void>;
  authorityDeskHandler?: (req:http.IncomingMessage,res:http.ServerResponse,url:URL)=>Promise<{handled:boolean}>;
  authorityDeskPublicDir?: string;
};

const MIME: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".xml": "application/xml",
  ".md": "text/markdown; charset=utf-8",
};

const SECURITY_HEADERS: Record<string, string> = {
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "SAMEORIGIN",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
  "Content-Security-Policy":
    "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; connect-src 'self' ws://127.0.0.1:* ws://localhost:* wss://127.0.0.1:* wss://localhost:*; frame-src 'self'",
};

function labPublicDir(): string {
  return path.join(__dirname, "..", "..", "public", "lab");
}

function responseHeaders(extra: Record<string, string>): Record<string, string> {
  return { ...SECURITY_HEADERS, ...extra };
}

function labSessionTokenFromRequest(req: http.IncomingMessage): string | undefined {
  const header = req.headers["x-lab-session-token"];
  if (typeof header === "string" && header.trim()) return header.trim();
  if (Array.isArray(header) && header[0]?.trim()) return header[0].trim();
  return undefined;
}

function canExposeSessionToken(
  req: http.IncomingMessage,
  systemName: string,
  userName: string,
  snapshotToken: string | undefined,
): boolean {
  if (!snapshotToken) return false;
  if (process.env.NODE_ENV !== "production") return true;
  const headerToken = labSessionTokenFromRequest(req);
  if (headerToken && verifyLabSessionToken(systemName, userName, headerToken)) {
    return true;
  }
  // Browser same-origin fetch sets Sec-Fetch-Site. Do not treat Referer as auth.
  const site = req.headers["sec-fetch-site"];
  return typeof site === "string" && site.toLowerCase() === "same-origin";
}

export function sendJson(res: http.ServerResponse, status: number, body: unknown): void {
  const payload = JSON.stringify(body);
  res.writeHead(
    status,
    responseHeaders({
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
    }),
  );
  res.end(payload);
}

export function serveStaticFile(res: http.ServerResponse, filePath: string, root: string): boolean {
  const resolvedRoot = path.resolve(root);
  const resolved = path.resolve(filePath);
  const relative = path.relative(resolvedRoot, resolved);
  if (!relative || relative.startsWith("..") || path.isAbsolute(relative)) {
    res.writeHead(403, responseHeaders({ "Content-Type": "text/plain" }));
    res.end("Forbidden");
    return true;
  }

  if (!fs.existsSync(resolved) || fs.statSync(resolved).isDirectory()) {
    return false;
  }

  const ext = path.extname(resolved);
  res.writeHead(
    200,
    responseHeaders({ "Content-Type": MIME[ext] ?? "application/octet-stream" }),
  );
  res.end(fs.readFileSync(resolved));
  return true;
}

async function handleApi(
  req: http.IncomingMessage,
  res: http.ServerResponse,
  url: URL,
  systemName: string,
  websockifyPort: number,
): Promise<boolean> {
  if (!url.pathname.startsWith("/api/")) {
    return false;
  }

  if (url.pathname === "/api/lab/start-mission" && req.method === "POST") {
    try {
      const body = await readJsonBody(req);
      const system = typeof body.system === "string" ? body.system : systemName;
      const user = typeof body.user === "string" ? body.user : "AUDIT";
      const missionId = typeof body.missionId === "string" ? body.missionId : "";
      const campaignId = typeof body.campaignId === "string" ? body.campaignId : undefined;
      const sessionAuth = authorizeLabSessionMutation(
        system,
        user,
        labSessionTokenFromRequest(req),
      );
      if (!sessionAuth.ok) {
        sendJson(res, sessionAuth.status, { ok: false, error: sessionAuth.error });
        return true;
      }
      if (!missionId.trim()) {
        sendJson(res, 400, { ok: false, error: "missionId is required" });
        return true;
      }
      const result = startMissionForLabUser(system, user, missionId, campaignId);
      sendJson(res, result.ok ? 200 : result.status, result);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      sendJson(res, 400, { ok: false, error: message });
    }
    return true;
  }

  if (url.pathname === "/api/lab/restart-mission" && req.method === "POST") {
    try {
      const body = await readJsonBody(req);
      const system = typeof body.system === "string" ? body.system : systemName;
      const user = typeof body.user === "string" ? body.user : "AUDIT";
      const missionId = typeof body.missionId === "string" ? body.missionId : "";
      const sessionAuth = authorizeLabSessionMutation(
        system,
        user,
        labSessionTokenFromRequest(req),
      );
      if (!sessionAuth.ok) {
        sendJson(res, sessionAuth.status, { ok: false, error: sessionAuth.error });
        return true;
      }
      if (!missionId.trim()) {
        sendJson(res, 400, { ok: false, error: "missionId is required" });
        return true;
      }
      const result = restartMissionForLabUser(system, user, missionId);
      sendJson(res, result.ok ? 200 : result.status, result);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      sendJson(res, 400, { ok: false, error: message });
    }
    return true;
  }

  const evidenceMatch = url.pathname.match(/^\/api\/missions\/([^/]+)\/evidence$/);
  if (evidenceMatch) {
    const attemptId = decodeURIComponent(evidenceMatch[1]!);
    const system = url.searchParams.get("system") ?? systemName;
    const user = url.searchParams.get("user") ?? undefined;
    const sessionToken = labSessionTokenFromRequest(req);
    const auth = authorizeMissionAttempt(system, attemptId, user, sessionToken);
    if (!auth.ok) {
      sendJson(res, auth.status, { error: auth.error });
      return true;
    }

    if (req.method === "POST") {
      try {
        const body = await readJsonBody(req);
        const requirementKey =
          typeof body.requirementKey === "string" ? body.requirementKey : "";
        if (!requirementKey.trim()) {
          sendJson(res, 400, { error: "requirementKey is required" });
          return true;
        }
        const result = collectEvidenceForAttempt(attemptId, requirementKey);
        if (!result.ok) {
          sendJson(res, 400, { error: result.error });
          return true;
        }
        sendJson(res, 200, result);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        sendJson(res, 400, { error: message });
      }
      return true;
    }

    sendJson(res, 405, { error: "Method not allowed" });
    return true;
  }

  const findingsMatch = url.pathname.match(/^\/api\/missions\/([^/]+)\/findings$/);
  if (findingsMatch) {
    const attemptId = decodeURIComponent(findingsMatch[1]!);
    const system = url.searchParams.get("system") ?? systemName;
    const user = url.searchParams.get("user") ?? undefined;
    const sessionToken = labSessionTokenFromRequest(req);
    const auth = authorizeMissionAttempt(system, attemptId, user, sessionToken);
    if (!auth.ok) {
      sendJson(res, auth.status, { error: auth.error });
      return true;
    }

    if (req.method === "GET") {
      sendJson(res, 200, { attemptId, findings: listAttemptFindings(attemptId) });
      return true;
    }

    if (req.method === "POST") {
      try {
        const body = await readJsonBody(req);
        const finding = upsertAttemptFinding(attemptId, body);
        sendJson(res, 200, { finding });
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        sendJson(res, 400, { error: message });
      }
      return true;
    }

    sendJson(res, 405, { error: "Method not allowed" });
    return true;
  }

  const scorePreviewMatch = url.pathname.match(/^\/api\/missions\/([^/]+)\/score-preview$/);
  if (scorePreviewMatch && req.method === "GET") {
    const attemptId = decodeURIComponent(scorePreviewMatch[1]!);
    const system = url.searchParams.get("system") ?? systemName;
    const user = url.searchParams.get("user") ?? undefined;
    const sessionToken = labSessionTokenFromRequest(req);
    const auth = authorizeMissionAttempt(system, attemptId, user, sessionToken);
    if (!auth.ok) {
      sendJson(res, auth.status, { error: auth.error });
      return true;
    }
    try {
      sendJson(res, 200, scorePreviewForAttempt(attemptId));
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      sendJson(res, 404, { error: message });
    }
    return true;
  }

  if (url.pathname === "/api/controls" && req.method === "GET") {
    const { loadControlMappings } = await import("../runtime/controlMapping.js");
    sendJson(
      res,
      200,
      {
        controls: loadControlMappings().map((control) => ({
          id: control.id,
          title: control.title,
          framework: control.framework,
        })),
      },
    );
    return true;
  }

  if (req.method !== "GET") {
    return false;
  }

  if (url.pathname === "/api/health") {
    const labConfig = loadLabRuntimeConfig();
    let dbOk = false;
    try {
      const db = getDatabase();
      dbOk = isDatabaseInitialized(db);
    } catch {
      dbOk = false;
    }
    const health: Record<string, unknown> = {
      ok: dbOk,
      app: APP_NAME,
      runtime: RUNTIME_NAME,
      system: systemName,
      catalogVersion: COMMAND_CATALOG_VERSION,
      commandCount: countCatalogCommands(),
      demoMode: labConfig.demoMode,
      labUrl: "/lab/",
    };
    if (process.env.NODE_ENV !== "production") {
      health.databasePath = getDatabasePath();
    }
    sendJson(res, dbOk ? 200 : 503, health);
    return true;
  }

  if (url.pathname === "/api/lab/config") {
    const labConfig = loadLabRuntimeConfig();
    sendJson(res, 200, {
      appName: APP_NAME,
      appSubtitle: APP_SUBTITLE,
      runtimeName: RUNTIME_NAME,
      tagline: TAGLINE,
      systemName,
      websockifyPort,
      defaultMissionId: "CLAIMS-001",
      terminalModel: "5292-2",
      demoMode: labConfig.demoMode,
      showQuickstart: labConfig.showQuickstart,
      defaultScenario: labConfig.defaultScenario,
      laneCredentials: getPublicLaneCredentialsForApi(systemName),
    });
    return true;
  }

  if (url.pathname === "/api/lab/demo") {
    const path = normalizeDemoPath(url.searchParams.get("path"));
    const stepIndex = Number(url.searchParams.get("step") ?? "0");
    const system = url.searchParams.get("system") ?? systemName;
    sendJson(res, 200, buildDemoTrainerPayload(path, Number.isFinite(stepIndex) ? stepIndex : 0, system));
    return true;
  }

  if (url.pathname === "/api/lab/iongrc") {
    const packId = url.searchParams.get("pack") ?? undefined;
    const stepIndex = Number(url.searchParams.get("step") ?? "0");
    const system = url.searchParams.get("system") ?? systemName;
    const screenId = url.searchParams.get("screen") ?? undefined;
    const lastCommand = url.searchParams.get("command") ?? undefined;
    const articleId = url.searchParams.get("article") ?? undefined;
    sendJson(
      res,
      200,
      buildIongrcTrainerPayload(
        packId ?? screenId,
        Number.isFinite(stepIndex) ? stepIndex : 0,
        system,
        screenId,
        lastCommand,
        articleId ?? undefined,
      ),
    );
    return true;
  }

  if (url.pathname === "/api/missions") {
    const system = url.searchParams.get("system") ?? systemName;
    sendJson(res, 200, { systemName: system, missions: listMissionSummaries(system) });
    return true;
  }

  if (url.pathname === "/api/lab/session") {
    const system = url.searchParams.get("system") ?? systemName;
    const expectedUser = url.searchParams.get("user") ?? undefined;
    const snapshot = findCoachLabSession(system, expectedUser);
    if (!snapshot) {
      sendJson(res, 200, {
        connected: false,
        systemName: system,
        expectedUser: expectedUser?.toUpperCase(),
      });
      return true;
    }
    const body: Record<string, unknown> = {
      connected: true,
      systemName: snapshot.systemName,
      userName: snapshot.userName,
      screenId: snapshot.screenId,
      lane: snapshot.lane ?? "auditor",
      initialMenu: snapshot.initialMenu,
      guidanceMode: snapshot.guidanceMode,
      personaId: snapshot.personaId,
    };
    if (
      canExposeSessionToken(req, snapshot.systemName, snapshot.userName ?? "", snapshot.sessionToken)
    ) {
      body.sessionToken = snapshot.sessionToken;
    }
    sendJson(res, 200, body);
    return true;
  }

  if (url.pathname === "/api/lab/coach-shell") {
    const system = url.searchParams.get("system") ?? systemName;
    const snapshot = findCoachLabSession(system, url.searchParams.get("user") ?? undefined);
    const laneParam = url.searchParams.get("lane");
    const lane =
      laneParam === "operator" || laneParam === "auditor" || laneParam === "iongrc"
        ? laneParam
        : snapshot?.lane ??
          resolveSessionLane(
            snapshot?.userName ?? url.searchParams.get("user") ?? "",
            undefined,
            snapshot?.initialMenu,
          );
    const missionId = url.searchParams.get("mission") ?? "CLAIMS-001";
    const shell = buildCoachShell(system, lane, missionId);
    if (!shell) {
      sendJson(res, 404, { error: "Coach shell not found" });
      return true;
    }
    sendJson(res, 200, shell);
    return true;
  }

  if (url.pathname === "/api/lab/coach-context") {
    const systemParam = url.searchParams.get("system") ?? systemName;
    const userParam = url.searchParams.get("user") ?? "AUDIT";
    const sessionAuth = authorizeLabSessionRead(
      systemParam,
      userParam,
      labSessionTokenFromRequest(req),
    );
    if (!sessionAuth.ok) {
      sendJson(res, sessionAuth.status, { error: sessionAuth.error });
      return true;
    }
    const snapshot = sessionAuth.snapshot;
    const system = snapshot.systemName;
    const user = snapshot.userName;
    const screenId = snapshot.screenId;
    const lane =
      snapshot.lane ??
      resolveSessionLane(user, undefined, snapshot.initialMenu);
    const skillPathParam = url.searchParams.get("skillPath");
    const skillPath = isSkillPathId(skillPathParam) ? skillPathParam : undefined;
    const clientMissionParam = url.searchParams.get("mission")?.trim().toUpperCase();
    const progress =
      lane === "auditor"
        ? resolveCoachMissionProgress(system, user, {
            skillEntryMissionId: missionIdForSkillPath(skillPath),
            clientMissionId: clientMissionParam || undefined,
          })
        : undefined;
    const coachEvents = progress
      ? listCoachEvents(progress.attemptId).map((event) => ({
          eventKey: event.eventKey,
          message: event.message,
        }))
      : undefined;
    const previousKeysParam = url.searchParams.get("previousCollectedKeys");
    const previousCollectedKeys = previousKeysParam
      ? previousKeysParam.split(",").filter(Boolean)
      : undefined;
    const focusFindingComposer = snapshot.focusFindingComposer;
    if (snapshot.focusFindingComposer) {
      clearLabSessionFocus(snapshot.sessionId);
    }
    const demoPathParam = url.searchParams.get("demoPath");
    const demoStepParam = Number(url.searchParams.get("demoStep") ?? "0");
    const iongrcPackParam = url.searchParams.get("iongrcPack");
    const iongrcStepParam = Number(url.searchParams.get("iongrcStep") ?? "0");
    const playbookPathParam = url.searchParams.get("playbookPath");
    const playbookPath =
      playbookPathParam === "blueteam" || playbookPathParam === "redteam"
        ? playbookPathParam
        : skillPath === "blueteam" || skillPath === "redteam"
          ? skillPath
          : undefined;
    sendJson(
      res,
      200,
      buildCoachContext(screenId, progress, coachEvents, {
        guidanceMode: snapshot.guidanceMode,
        personaId: snapshot.personaId,
        lane,
        systemName: system,
        userName: user,
        helpArticle: snapshot.helpArticle,
        previousCollectedKeys,
        lastCommand: snapshot.lastCommand,
        focusFindingComposer,
        demoPath: demoPathParam ? normalizeDemoPath(demoPathParam) : undefined,
        demoStepIndex: Number.isFinite(demoStepParam) ? demoStepParam : 0,
        iongrcPackId: iongrcPackParam ? normalizeIongrcPackId(iongrcPackParam) : undefined,
        iongrcStepIndex: Number.isFinite(iongrcStepParam) ? iongrcStepParam : 0,
        playbookPath,
        skillPath,
        sessionId: snapshot.sessionId,
      }),
    );
    return true;
  }

  const progressMatch = url.pathname.match(/^\/api\/missions\/([^/]+)\/progress$/);
  if (progressMatch) {
    const missionId = decodeURIComponent(progressMatch[1]!);
    const system = url.searchParams.get("system") ?? systemName;
    const user = url.searchParams.get("user") ?? "AUDIT";
    const sessionAuth = authorizeLabSessionRead(
      system,
      user,
      labSessionTokenFromRequest(req),
    );
    if (!sessionAuth.ok) {
      sendJson(res, sessionAuth.status, { error: sessionAuth.error });
      return true;
    }
    const progress = getMissionProgressForUser(system, user, missionId);
    if (!progress) {
      sendJson(res, 404, { error: "No active mission attempt" });
      return true;
    }
    sendJson(res, 200, {
      missionId: progress.missionId,
      attemptId: progress.attemptId,
      coveragePercent: Math.round(progress.evidenceCoverage.score),
      evidence: progress.requirements.map((req) => ({
        key: req.requirementKey,
        description: req.description,
        collected: progress.collected.some((row) => row.requirementKey === req.requirementKey),
        optional: req.optional,
      })),
      evidenceTags: progress.evidenceTags,
    });
    return true;
  }

  const missionMatch = url.pathname.match(/^\/api\/missions\/([^/]+)$/);
  if (missionMatch) {
    const missionId = decodeURIComponent(missionMatch[1]!);
    const system = url.searchParams.get("system") ?? systemName;
    const payload = buildMissionCoachPayload(system, missionId === "default" ? undefined : missionId);
    if (!payload) {
      sendJson(res, 404, { error: "Mission not found" });
      return true;
    }
    sendJson(res, 200, payload);
    return true;
  }

  sendJson(res, 404, { error: "Not found" });
  return true;
}

/** Create HTTP server for IronTerm, lab shell, and mission APIs (does not listen). */
export function createLabHttpServer(options: LabHttpServerOptions): http.Server {
  const ironTermRoot = path.resolve(options.ironTermPublicDir);
  const labRoot = path.resolve(labPublicDir());

  return http.createServer(async (req, res) => {
    const url = new URL(req.url ?? "/", `http://${req.headers.host ?? "localhost"}`);

    if (url.pathname === "/mcp") {
      if (options.mcpHandler) await options.mcpHandler(req,res);
      else sendJson(res,404,{error:"Not found"});
      return;
    }

    if(url.pathname.startsWith("/api/agent-authority/")) {
      if(options.authorityDeskHandler) await options.authorityDeskHandler(req,res,url);
      else sendJson(res,404,{error:"Not found"});
      return;
    }

    if(url.pathname==="/lab/authority"||url.pathname.startsWith("/lab/authority/")) {
      if(!options.authorityDeskPublicDir){sendJson(res,404,{error:"Not found"});return;}
      const root=path.resolve(options.authorityDeskPublicDir);
      if(url.pathname==="/lab/authority"){res.writeHead(302,responseHeaders({Location:"/lab/authority/"}));res.end();return;}
      const relative=url.pathname.slice("/lab/authority/".length)||"index.html";
      if(serveStaticFile(res,path.join(root,relative),root))return;
      sendJson(res,404,{error:"Not found"});return;
    }

    if (await handleApi(req, res, url, options.systemName, options.websockifyPort)) {
      return;
    }

    if (url.pathname === "/" || url.pathname === "") {
      res.writeHead(302, responseHeaders({ Location: "/lab/" }));
      res.end();
      return;
    }

    if (url.pathname === "/health") {
      res.writeHead(302, responseHeaders({ Location: "/api/health" }));
      res.end();
      return;
    }

    if (url.pathname === "/docs" || url.pathname.startsWith("/docs/")) {
      const docsRoot = path.resolve(labRoot, "..", "..", "docs");
      const relative = url.pathname === "/docs" ? "quickstart.md" : url.pathname.slice("/docs/".length);
      const filePath = path.join(docsRoot, relative);
      if (serveStaticFile(res, filePath, docsRoot)) return;
    }

    if (url.pathname.startsWith("/assets/")) {
      const assetsRoot = path.resolve(labRoot, "..", "assets");
      const relative = url.pathname.slice("/assets/".length);
      const filePath = path.join(assetsRoot, relative);
      if (serveStaticFile(res, filePath, assetsRoot)) return;
    }

    if (url.pathname === "/lab" || url.pathname.startsWith("/lab/")) {
      const relative = url.pathname === "/lab" ? "/index.html" : url.pathname.slice("/lab".length);
      const filePath = path.join(labRoot, relative === "/" ? "index.html" : relative);
      if (serveStaticFile(res, filePath, labRoot)) return;
      const indexPath = path.join(labRoot, "index.html");
      if (fs.existsSync(indexPath)) {
        serveStaticFile(res, indexPath, labRoot);
        return;
      }
    }

    const ironTermPath = url.pathname === "/" ? "/index.html" : url.pathname;
    const filePath = path.join(ironTermRoot, ironTermPath);
    if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) {
      const indexPath = path.join(filePath, "index.html");
      if (serveStaticFile(res, indexPath, ironTermRoot)) return;
    }
    if (serveStaticFile(res, filePath, ironTermRoot)) return;

    res.writeHead(404, responseHeaders({ "Content-Type": "text/plain" }));
    res.end("Not found");
  });
}

/** Serve IronTerm static assets, the /lab coach shell, and mission JSON APIs. */
export function startLabHttpServer(options: LabHttpServerOptions): http.Server {
  const server = createLabHttpServer(options);

  server.on("error", (err: NodeJS.ErrnoException) => {
    if (err.code === "EADDRINUSE") {
      console.error(`[Lab] Port ${options.port} is already in use. Stop the other lab process or set HTTP_PORT in .env.`);
    } else {
      console.error(`[Lab] Failed to listen on port ${options.port}:`, err.message);
    }
    process.exit(1);
  });

  server.listen(options.port, options.host ?? "127.0.0.1", () => {
    const host = options.host ?? "127.0.0.1";
    console.log(`[Lab] Coach shell at http://${host === "0.0.0.0" ? "localhost" : host}:${options.port}/lab/`);
    console.log(`[IronTerm] Terminal at http://${host === "0.0.0.0" ? "localhost" : host}:${options.port}/tn5250/`);
    console.log(`[IronTerm] GPL-3.0 client — source: external/IronTerm-main/`);
  });

  return server;
}
