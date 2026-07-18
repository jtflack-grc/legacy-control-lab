import type { IncomingMessage } from "node:http";
import type { FindingInput } from "../db/repositories/findingRepository.js";
import { getMissionAttempt } from "../db/repositories/missionRepository.js";
import { getSystemIdByName } from "../db/repositories/systemRepository.js";
import { saveFinding, getFindings } from "../missions/findings.js";
import { previewMissionScoreForAttempt } from "../missions/missionEngine.js";
import { SCORE_WEIGHTS } from "../missions/scoring.js";
import { loadControlMappings } from "../runtime/controlMapping.js";
import { verifyLabSessionToken } from "./sessionRegistry.js";

export const MAX_JSON_BODY_BYTES = 64 * 1024;

export async function readJsonBody(
  req: IncomingMessage,
  maxBytes = MAX_JSON_BODY_BYTES,
): Promise<Record<string, unknown>> {
  const chunks: Buffer[] = [];
  let total = 0;
  for await (const chunk of req) {
    total += (chunk as Buffer).length;
    if (total > maxBytes) {
      throw new Error(`Request body exceeds ${maxBytes} byte limit`);
    }
    chunks.push(chunk as Buffer);
  }
  const raw = Buffer.concat(chunks).toString("utf8").trim();
  if (!raw) return {};
  try {
    return JSON.parse(raw) as Record<string, unknown>;
  } catch {
    throw new Error("Invalid JSON body");
  }
}

export function authorizeMissionAttempt(
  systemName: string,
  attemptId: string,
  userName?: string,
  sessionToken?: string,
): { ok: true; userName: string } | { ok: false; status: number; error: string } {
  const attempt = getMissionAttempt(attemptId);
  if (!attempt) {
    return { ok: false, status: 404, error: "Mission attempt not found" };
  }

  if (!sessionToken?.trim()) {
    return { ok: false, status: 401, error: "Lab session token required (X-Lab-Session-Token)" };
  }

  const resolvedUser = (userName ?? attempt.userName).trim().toUpperCase();
  const snapshot = verifyLabSessionToken(systemName, resolvedUser, sessionToken);
  if (!snapshot) {
    return { ok: false, status: 403, error: "Invalid or expired lab session token" };
  }

  if (attempt.userName.toUpperCase() !== resolvedUser) {
    return { ok: false, status: 403, error: "Attempt does not belong to this session user" };
  }

  const expectedSystemId = getSystemIdByName(systemName);
  if (attempt.systemId !== expectedSystemId) {
    return { ok: false, status: 403, error: "Attempt does not belong to this system" };
  }

  return { ok: true, userName: resolvedUser };
}

export function listAttemptFindings(attemptId: string) {
  return getFindings(attemptId);
}

export function upsertAttemptFinding(
  attemptId: string,
  body: Record<string, unknown>,
): ReturnType<typeof saveFinding> {
  const attempt = getMissionAttempt(attemptId);
  if (!attempt) {
    throw new Error("Mission attempt not found");
  }

  const finding: FindingInput & { id?: string } = {
    id: typeof body.id === "string" ? body.id : undefined,
    title: String(body.title ?? ""),
    severity: String(body.severity ?? "MODERATE"),
    evidenceRefs: typeof body.evidenceRefs === "string" ? body.evidenceRefs : undefined,
    controlMapping: typeof body.controlMapping === "string" ? body.controlMapping : undefined,
    findingText: typeof body.findingText === "string" ? body.findingText : undefined,
    decisionImpact: typeof body.decisionImpact === "string" ? body.decisionImpact : undefined,
    recommendation: typeof body.recommendation === "string" ? body.recommendation : undefined,
  };

  return saveFinding(attemptId, attempt.missionId, finding);
}

export function scorePreviewForAttempt(attemptId: string) {
  const breakdown = previewMissionScoreForAttempt(attemptId);
  if (!breakdown) {
    throw new Error("Mission attempt not found");
  }
  return {
    ...breakdown,
    weights: SCORE_WEIGHTS,
    controls: loadControlMappings().map((control) => ({
      id: control.id,
      title: control.title,
    })),
  };
}
