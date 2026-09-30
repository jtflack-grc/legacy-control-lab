import { randomBytes, timingSafeEqual } from "node:crypto";
import type { ScreenId } from "../screen-runtime/screen.js";
import type { SessionLane } from "../ibmi-runtime/sessionLane.js";
import type { GrcArticleLink } from "../grc/iOnGrcArticles.js";

export type LabSessionSnapshot = {
  sessionId: string;
  systemName: string;
  userName: string;
  screenId: ScreenId;
  lane?: SessionLane;
  initialMenu?: string;
  lastCommand?: string;
  guidanceMode?: string;
  personaId?: string;
  helpArticle?: GrcArticleLink;
  focusFindingComposer?: boolean;
  sessionToken?: string;
  updatedAt: string;
};

const sessions = new Map<string, LabSessionSnapshot>();

/** Lab coach treats sessions older than this as disconnected (stale TN5250 tab). */
export const LAB_SESSION_STALE_MS = 90_000;

/** Signed-on sessions refresh this often so idle users keep the coach panel. */
export const LAB_SESSION_HEARTBEAT_MS = 30_000;

export function generateLabSessionToken(): string {
  return randomBytes(32).toString("base64url");
}

export function isLabSessionFresh(snapshot: LabSessionSnapshot, now = Date.now()): boolean {
  const updated = Date.parse(snapshot.updatedAt);
  if (Number.isNaN(updated)) return false;
  return now - updated < LAB_SESSION_STALE_MS;
}

export function upsertLabSession(snapshot: LabSessionSnapshot): LabSessionSnapshot {
  const existing = sessions.get(snapshot.sessionId);
  const stored: LabSessionSnapshot = {
    ...snapshot,
    sessionToken: existing?.sessionToken ?? generateLabSessionToken(),
  };
  sessions.set(snapshot.sessionId, stored);
  return stored;
}

export function removeLabSession(sessionId: string): void {
  sessions.delete(sessionId);
}

function normalizeSystemName(systemName: string): string {
  return systemName.trim().toUpperCase();
}

function tokensMatch(expected: string, provided: string): boolean {
  const a = Buffer.from(expected);
  const b = Buffer.from(provided);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export function verifyLabSessionToken(
  systemName: string,
  userName: string,
  token: string | undefined,
): LabSessionSnapshot | undefined {
  if (!token?.trim()) return undefined;
  const trimmed = token.trim();
  const now = Date.now();
  const normalizedSystem = normalizeSystemName(systemName);
  const normalizedUser = userName.trim().toUpperCase();
  const matches = [...sessions.values()]
    .filter((session) => normalizeSystemName(session.systemName) === normalizedSystem)
    .filter((session) => session.userName === normalizedUser)
    .filter((session) => isLabSessionFresh(session, now))
    .filter((session) => session.sessionToken && tokensMatch(session.sessionToken, trimmed))
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  return matches[0];
}

/** Resolve a token to its exact fresh session without trusting a caller-supplied user name. */
export function verifyLabSessionTokenForSystem(systemName:string,token:string|undefined):LabSessionSnapshot|undefined {
  if(!token?.trim()) return undefined;
  const provided=token.trim();const now=Date.now();const system=normalizeSystemName(systemName);
  return [...sessions.values()]
    .filter((session)=>normalizeSystemName(session.systemName)===system)
    .filter((session)=>isLabSessionFresh(session,now))
    .filter((session)=>session.sessionToken!==undefined&&tokensMatch(session.sessionToken,provided))
    .sort((a,b)=>b.updatedAt.localeCompare(a.updatedAt))[0];
}

export function authorizeLabSessionMutation(
  systemName: string,
  userName: string,
  sessionToken: string | undefined,
): { ok: true; snapshot: LabSessionSnapshot } | { ok: false; status: number; error: string } {
  if (!sessionToken?.trim()) {
    return { ok: false, status: 401, error: "Lab session token required (X-Lab-Session-Token)" };
  }
  const snapshot = verifyLabSessionToken(systemName, userName, sessionToken);
  if (!snapshot) {
    return { ok: false, status: 403, error: "Invalid or expired lab session token" };
  }
  return { ok: true, snapshot };
}

/** Read APIs that expose live session or mission state require a valid lab session token. */
export function authorizeLabSessionRead(
  systemName: string,
  userName: string,
  sessionToken: string | undefined,
): { ok: true; snapshot: LabSessionSnapshot } | { ok: false; status: number; error: string } {
  return authorizeLabSessionMutation(systemName, userName, sessionToken);
}

export function findLabSession(systemName: string, userName?: string): LabSessionSnapshot | undefined {
  const now = Date.now();
  const normalizedSystem = normalizeSystemName(systemName);
  const matches = [...sessions.values()]
    .filter((session) => normalizeSystemName(session.systemName) === normalizedSystem)
    .filter((session) => isLabSessionFresh(session, now))
    .filter((session) => !userName || session.userName === userName.trim().toUpperCase())
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  return matches[0];
}

/** Coach APIs: exact system+user, then same user on another system; partition-only when user omitted. */
export function findCoachLabSession(
  systemName?: string,
  userName?: string,
): LabSessionSnapshot | undefined {
  const user = userName?.trim().toUpperCase();
  const system = systemName?.trim();
  if (system && user) {
    const exact = findLabSession(system, user);
    if (exact) return exact;
    return findLabSessionForUser(user);
  }
  if (system) {
    return findLabSession(system);
  }
  if (user) {
    return findLabSessionForUser(user);
  }
  return undefined;
}

export function findLabSessionForUser(userName: string): LabSessionSnapshot | undefined {
  const now = Date.now();
  const normalizedUser = userName.trim().toUpperCase();
  const matches = [...sessions.values()]
    .filter((session) => isLabSessionFresh(session, now))
    .filter((session) => session.userName === normalizedUser)
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  return matches[0];
}

export function clearLabSessionsForSystem(systemName: string): void {
  for (const [sessionId, snapshot] of sessions) {
    if (snapshot.systemName === systemName) {
      sessions.delete(sessionId);
    }
  }
}

export function findLatestLabSession(systemName: string): LabSessionSnapshot | undefined {
  return findLabSession(systemName);
}

export function listLabSessions(): LabSessionSnapshot[] {
  return [...sessions.values()];
}

export function clearLabSessionFocus(sessionId: string): void {
  const snapshot = sessions.get(sessionId);
  if (!snapshot) return;
  sessions.set(sessionId, { ...snapshot, focusFindingComposer: undefined });
}
