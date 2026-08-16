import "dotenv/config";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { APP_NAME, RUNTIME_NAME } from "./branding.js";
import { initDatabase, closeDatabase } from "./db/sqlite.js";
import { loadLabRuntimeConfig } from "./lab/labConfig.js";
import { startHostServers } from "./tn5250-host/websocketServer.js";
import { resolveIronTermPublicDir } from "./irontermServer.js";
import { startLabHttpServer } from "./lab/httpServer.js";
import { preloadAllActiveRangeScenarios } from "./range/scenarioLoadService.js";
import { startWebsockifyBridge } from "./websockifyBridge.js";
import { guardHostQshMode } from "./ibmi-runtime/pase/qshMode.js";
import { resolveBindHost } from "./bindHost.js";
import { createAgentAuthorityMcpRuntime } from "./agent-authority/mcp/mcpRuntime.js";

export type ServerConfig = {
  tn5250Port: number;
  wsPort: number;
  httpPort: number;
  websockifyPort: number;
  systemName: string;
  devFrameLog: boolean;
  serveIronTerm: boolean;
  httpBindHost: string;
  tn5250BindHost: string;
  websockifyBindHost: string;
  agentAuthorityEnabled: boolean;
  agentTarget: string;
};

export function loadConfig(): ServerConfig {
  return {
    tn5250Port: Number(process.env.TN5250_PORT ?? 8023),
    wsPort: Number(process.env.WS_PORT ?? 8024),
    httpPort: Number(process.env.HTTP_PORT ?? 8080),
    websockifyPort: Number(process.env.WEBSOCKIFY_PORT ?? 6080),
    systemName: process.env.SYSTEM_NAME ?? "CLAIMS400",
    devFrameLog: (process.env.DEV_FRAME_LOG ?? "true").toLowerCase() === "true",
    serveIronTerm: (process.env.SERVE_IRONTERM ?? "true").toLowerCase() === "true",
    httpBindHost: resolveBindHost("HTTP_BIND_HOST"),
    tn5250BindHost: resolveBindHost("TN5250_BIND_HOST"),
    websockifyBindHost: resolveBindHost("WEBSOCKIFY_BIND_HOST"),
    agentAuthorityEnabled:(process.env.LCL_AGENT_AUTHORITY_ENABLED??"false").toLowerCase()==="true",
    agentTarget:process.env.LCL_AGENT_TARGET??"lcl",
  };
}

function maybeResetDemoState(): void {
  const lab = loadLabRuntimeConfig();
  if (!lab.resetOnStart && !lab.demoMode) return;
  const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
  spawnSync("npx", ["tsx", "scripts/clean.ts", "generated"], {
    cwd: root,
    stdio: "inherit",
    shell: process.platform === "win32",
  });
}

export function startServer(config: ServerConfig = loadConfig()) {
  maybeResetDemoState();
  const labConfig = loadLabRuntimeConfig();
  guardHostQshMode({
    httpBindHost: config.httpBindHost,
    tn5250BindHost: config.tn5250BindHost,
    websockifyBindHost: config.websockifyBindHost,
  });
  initDatabase({ forceSeed: labConfig.resetOnStart || labConfig.demoMode });
  setImmediate(() => {
    try {
      const loaded = preloadAllActiveRangeScenarios();
      if (loaded.length > 1) {
        console.log(`[range] Preloaded scenarios: ${loaded.join(", ")}`);
      }
    } catch (error) {
      console.warn(
        "[range] Scenario preload skipped:",
        error instanceof Error ? error.message : String(error),
      );
    }
  });
  console.log(`${APP_NAME} — ${RUNTIME_NAME}`);
  console.log(`System: ${config.systemName}`);
  const agentAuthority=config.agentAuthorityEnabled?createAgentAuthorityMcpRuntime({target:config.agentTarget}):undefined;

  const servers = startHostServers({
    tn5250Port: config.tn5250Port,
    wsPort: config.wsPort,
    systemName: config.systemName,
    devFrameLog: config.devFrameLog,
    tn5250BindHost: config.tn5250BindHost,
    wsBindHost: config.tn5250BindHost,
  });
  let httpServer: ReturnType<typeof startLabHttpServer> | undefined;
  let websockify: ReturnType<typeof startWebsockifyBridge> | undefined;

  if (config.serveIronTerm) {
    const ironTermDir = resolveIronTermPublicDir();
    httpServer = startLabHttpServer({
      port: config.httpPort,
      host: config.httpBindHost,
      ironTermPublicDir: ironTermDir,
      systemName: config.systemName,
      websockifyPort: config.websockifyPort,
      ...(agentAuthority?{mcpHandler:agentAuthority.nodeHandler}:{}),
    });
    websockify = startWebsockifyBridge({
      listenPort: config.websockifyPort,
      listenHost: config.websockifyBindHost,
      targetHost: "127.0.0.1",
      targetPort: config.tn5250Port,
    });
    console.log("");
    console.log("=== Lab ===");
    console.log(`  Coach + terminal: http://localhost:${config.httpPort}/lab/`);
    console.log(`  Terminal only:    http://localhost:${config.httpPort}/tn5250/`);
    console.log(`  Bridge URL:       ws://localhost:${config.websockifyPort}/`);
    console.log("  Model: IBM-5292-2 · Sign on: AUDIT / TRAIN");
    console.log("");
  }

  async function shutdown(): Promise<void> {
    console.log("Shutting down...");
    if (httpServer) {
      await new Promise<void>((resolve) => httpServer!.close(() => resolve()));
    }
    if(agentAuthority) await agentAuthority.close();
    if (websockify) {
      await new Promise<void>((resolve) => websockify!.close(() => resolve()));
    }
    await servers.close();
    closeDatabase();
    process.exit(0);
  }

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);

  return { ...servers, httpServer, websockify };
}

const isMain =
  process.argv[1]?.includes("server") ||
  process.argv[1]?.endsWith("server.ts");

if (isMain) {
  startServer();
}
