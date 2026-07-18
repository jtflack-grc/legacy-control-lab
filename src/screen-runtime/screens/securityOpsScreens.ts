import type { ScreenDefinition } from "../screen.js";
import { createInfoScreen } from "./screenHelpers.js";

export function createDisplayUserAuditScreen(
  systemName: string,
  userName: string,
  targetUser: string,
): ScreenDefinition {
  return createInfoScreen("CHGUSRAUD", "Change User Audit", systemName, userName, [
    `User profile . . . . . . . . . : ${targetUser}`,
    `Audit level  . . . . . . . . . : *CMD`,
    `Action auditing  . . . . . . . : *OBJ`,
    `Change auditing  . . . . . . . : *OBJ`,
    "",
    "Lab note: CHGUSRAUD is display-only in this training partition.",
    "On production IBM i, use CHGUSRAUD to set audit levels per profile.",
  ]);
}

export function createChangeSecurityAttributesScreen(systemName: string, userName: string): ScreenDefinition {
  return createInfoScreen("CHGSECA", "Change Security Attributes", systemName, userName, [
    "System security attributes are managed through system values in this lab.",
    "Use WRKSYSVAL or CHGSYSVAL for QSECURITY, QAUDCTL, and related values.",
    "",
    "Production IBM i: CHGSECA changes security level and auditing defaults.",
    "Lab: review current values with DSPSECA before any change request.",
  ]);
}
