import type { IbmiSession } from "../ibmi-runtime/sessionService.js";

const liveSessions = new Map<string, IbmiSession>();

export function registerLiveSession(session: IbmiSession): void {
  liveSessions.set(session.id, session);
}

export function unregisterLiveSession(sessionId: string): void {
  liveSessions.delete(sessionId);
}

export function getLiveSession(sessionId: string): IbmiSession | undefined {
  return liveSessions.get(sessionId);
}

export function findLiveSession(systemName: string, userName: string): IbmiSession | undefined {
  const normalizedUser = userName.trim().toUpperCase();
  const normalizedSystem = systemName.trim().toUpperCase();
  let newest: IbmiSession | undefined;

  for (const session of liveSessions.values()) {
    if (!session.signedOn || !session.userName) continue;
    if (session.systemName.toUpperCase() !== normalizedSystem) continue;
    if (session.userName.toUpperCase() !== normalizedUser) continue;
    newest = session;
  }

  return newest;
}

export function resolveLiveSessionForLab(
  snapshot?: { sessionId: string; systemName: string; userName: string },
  fallbackSystemName?: string,
): IbmiSession | undefined {
  if (snapshot) {
    const linked = getLiveSession(snapshot.sessionId);
    if (linked?.signedOn && linked.userName) {
      return linked;
    }
    const bySnapshot = findLiveSession(snapshot.systemName, snapshot.userName);
    if (bySnapshot) return bySnapshot;
  }
  if (fallbackSystemName && snapshot?.userName) {
    return findLiveSession(fallbackSystemName, snapshot.userName);
  }
  return undefined;
}
