import { createMissionAttempt, ensureInternalMission } from "../db/repositories/missionRepository.js";
import { createUserProfile, getUserProfile } from "../db/repositories/userProfileRepository.js";
import { createSession, hydrateSessionFromProfile, type IbmiSession } from "../ibmi-runtime/sessionService.js";

export const AGENT_SERVICE_USER = "MCPAGENT";
export const AGENT_AUTHORITY_MISSION = "AA-001";

export function createAgentServiceSession(systemName: string): IbmiSession {
  if (systemName !== "CLAIMS400") throw new Error("TARGET_NOT_ALLOWED");
  ensureServiceProfile(systemName);
  ensureInternalMission(systemName, {
    id: AGENT_AUTHORITY_MISSION,
    title: "Agent Authority governed operation",
    briefing: "Internal mission context for governed synthetic Agent Authority operations.",
    persona: "agent-service",
  });
  const session = createSession(systemName);
  session.signedOn = true;
  session.userName = AGENT_SERVICE_USER;
  session.job.user = AGENT_SERVICE_USER;
  session.job.jobName = "AGTAUTH";
  session.job.type = "BATCH";
  hydrateSessionFromProfile(session, AGENT_SERVICE_USER, systemName);
  const attempt = createMissionAttempt(systemName, AGENT_AUTHORITY_MISSION, AGENT_SERVICE_USER, session.id, {
    personaId: "agent-service",
    guidanceMode: "internal",
  });
  session.missionAttemptId = attempt.id;
  return session;
}

function ensureServiceProfile(systemName: string): void {
  let profile = getUserProfile(systemName, AGENT_SERVICE_USER);
  if (!profile) {
    const result = createUserProfile(systemName, {
      userName: AGENT_SERVICE_USER,
      status: "*DISABLED",
      userClass: "*USER",
      text: "Internal Agent Authority service profile",
      groupProfile: "*NONE",
      specialAuthorities: "*SECADM",
      initialMenu: "AUDIT",
    });
    if (!result.ok) throw new Error(result.message);
    profile = getUserProfile(systemName, AGENT_SERVICE_USER);
  }
  if (!profile || profile.status !== "*DISABLED" || profile.userClass !== "*USER" ||
      profile.specialAuthorities !== "*SECADM" || profile.password !== null) {
    throw new Error("MCPAGENT_PROFILE_MISMATCH");
  }
}
