import type { IbmiSession } from "./sessionService.js";
import { getUserProfile } from "./userProfileService.js";
import { insertCoachEvent, insertGeneratedAudit, insertRuntimeJobLog } from "../db/repositories/runtimeRepository.js";

/** Commands a LMTCPB(*YES) profile cannot run — red-team boundary evidence. */
const LIMITED_ESCAPE_COMMANDS = new Set([
  "EDTOBJAUT",
  "GRTOBJAUT",
  "RVKOBJAUT",
  "CHGAUT",
  "CHGUSRPRF",
  "CRTUSRPRF",
  "DLTUSRPRF",
]);

function profileAuthorities(session: IbmiSession): string[] {
  const userName = session.userName;
  if (!userName) return [];
  const profile = getUserProfile(userName, session.systemName);
  if (!profile?.specialAuthorities) return [];
  return profile.specialAuthorities.split(/\s+/).filter(Boolean);
}

/** True when the signed-on user holds one of the required special authorities. */
const AUTHORITY_ALIASES: Record<string, string[]> = {
  "*AUDITVIEW": ["*AUDIT", "*SECADM"],
  "*OBJEXIST": ["*ALLOBJ", "*AUDIT"],
  "*OBJMGT": ["*ALLOBJ", "*SECADM"],
  "*OBJOPR": ["*ALLOBJ"],
};

export function sessionHasSpecialAuthority(session: IbmiSession, required: string[]): boolean {
  if (required.length === 0) return true;
  const held = new Set(profileAuthorities(session));
  if (held.has("*ALLOBJ")) return true;
  return required.some((auth) => {
    if (held.has(auth)) return true;
    const aliases = AUTHORITY_ALIASES[auth];
    return aliases?.some((alias) => held.has(alias)) ?? false;
  });
}

export function authorityRequiredMessage(required: string[]): string {
  const list = required.join(" or ");
  return `CPF2209 - Not authorized to command. Special authority ${list} required.`;
}

export function sessionHasLimitedCapabilities(session: IbmiSession): boolean {
  const userName = session.userName;
  if (!userName) return false;
  const profile = getUserProfile(userName, session.systemName);
  return profile?.limitCapabilities === "*YES";
}

export function limitedUserCommandMessage(commandName?: string): string {
  const command = commandName?.trim().toUpperCase();
  if (command === "EDTOBJAUT") {
    return "CPF9902 - Function check failed on command EDTOBJAUT.";
  }
  if (command === "GRTOBJAUT" || command === "RVKOBJAUT") {
    return `CPF9902 - Function check failed on command ${command}.`;
  }
  return "CPF9902 - Function check failed on command.";
}

function resolveObjectRefFromCommand(commandText: string): string | undefined {
  const match = commandText.match(/\bOBJ\(([^)]+)\)/i);
  return match?.[1]?.trim().toUpperCase();
}

/** Record AF journal + job log when a limited user attempts authority escape during a mission. */
export function recordLimitedUserDenial(
  session: IbmiSession,
  commandName: string,
  commandText: string,
  denialMessage: string,
): void {
  const attemptId = session.missionAttemptId;
  if (!attemptId) return;
  const normalized = commandName.trim().toUpperCase();
  if (!LIMITED_ESCAPE_COMMANDS.has(normalized)) return;

  const timestamp = new Date().toISOString();
  const actor = session.userName ?? "UNKNOWN";
  const objectRef = resolveObjectRefFromCommand(commandText) ?? normalized;

  insertGeneratedAudit({
    attemptId,
    entryTime: timestamp,
    userName: actor,
    entryType: "AF",
    objectRef,
    message: denialMessage,
    sourceCommand: commandText,
  });
  insertRuntimeJobLog({
    attemptId,
    timestamp,
    messageId: "CPF9902",
    messageText: denialMessage,
  });
  insertCoachEvent(
    attemptId,
    "authority_escape_denied",
    `LMTCPB boundary held — ${normalized} on ${objectRef} denied. Document as a red-team finding.`,
  );
}
