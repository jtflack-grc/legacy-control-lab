import type { ScreenDefinition } from "../screen.js";
import {
  createGoMenuScreen,
  ibmErrorField,
  menuCommandFooter,
  menuHeader,
  MENU_LAYOUT,
  outputField,
} from "./screenHelpers.js";
import { APP_NAME } from "../../branding.js";
import { createAuditMenuScreen } from "./auditMenu.js";

/** Post-sign-on hub — routes to mission, range, campaigns, IBM i evidence, and platform tools. */
export function createMainHubScreen(
  systemName: string,
  userName: string,
  commandValue = "",
  message = "",
): ScreenDefinition {
  return {
    id: "MAIN",
    title: "MAIN",
    rows: 24,
    cols: 80,
    commandLine: true,
    fields: [
      ...menuHeader("MAIN", systemName, APP_NAME),
      outputField("USER", 2, 6, `User  . . . . . . . . . . . . . : ${userName}`),
      outputField("SYS", 3, 6, `System  . . . . . . . . . . . . : ${systemName}`),
      outputField("BLANK1", 4, 1, " ".repeat(80)),
      outputField("PROMPT", 5, 6, "Select one of the following:"),
      outputField("SEC1", MENU_LAYOUT.optionStartRow, 6, " 1. Governance mission menu (AUDIT)"),
      outputField("SEC2", MENU_LAYOUT.optionStartRow + 1, 6, " 2. Work with range systems"),
      outputField("SEC3", MENU_LAYOUT.optionStartRow + 2, 6, " 3. Work with campaigns"),
      outputField("SEC4", MENU_LAYOUT.optionStartRow + 3, 6, " 4. Work with scorebook"),
      outputField("SEC5", MENU_LAYOUT.optionStartRow + 4, 6, " 5. Security evidence menu"),
      outputField("SEC6", MENU_LAYOUT.optionStartRow + 5, 6, " 6. Jobs and batch menu"),
      outputField("SEC7", MENU_LAYOUT.optionStartRow + 6, 6, " 7. Spool and messages menu"),
      outputField("SEC8", MENU_LAYOUT.optionStartRow + 7, 6, " 8. SQL services (QSYS2 views)"),
      outputField("SEC9", MENU_LAYOUT.optionStartRow + 8, 6, " 9. Command group index (CMDLAB)"),
      outputField("SEC10", MENU_LAYOUT.optionStartRow + 9, 6, "10. Display mission briefing"),
      outputField("SEC11", MENU_LAYOUT.optionStartRow + 10, 6, "11. Display command coverage"),
      outputField("SEC12", MENU_LAYOUT.optionStartRow + 11, 6, "12. Workshop / facilitator menu"),
      outputField("OPT90", MENU_LAYOUT.signoffRow, 6, "90. Sign off"),
      ...(message
        ? [ibmErrorField("MSG", 19, 6, message.slice(0, 74))]
        : []),
      ...menuCommandFooter(commandValue),
    ],
    functionKeys: [
      { key: "F3", label: "Exit", action: "EXIT_MENU" },
      { key: "F4", label: "Prompt", action: "PROMPT" },
      { key: "F9", label: "Retrieve", action: "RETRIEVE" },
      { key: "F12", label: "Cancel", action: "CANCEL" },
    ],
  };
}

export function createMainMenuScreen(systemName: string, userName: string): ScreenDefinition {
  return createMainHubScreen(systemName, userName);
}

/** MAIN menu selections — post-sign-on navigation hub. */
export const mainMenuSelectionCommands: Record<string, string> = {
  "1": "GO AUDIT",
  "2": "WRKRANGE",
  "3": "WRKCMPGN",
  "4": "WRKSCORE",
  "5": "GO SECURITY",
  "6": "GO JOB",
  "7": "GO SPL",
  "8": "WRKSQLSVC",
  "9": "GO CMDLAB",
  "10": "DSPMISSION",
  "11": "DSPCMDCOV",
  "12": "GO WORKSHOP",
};
export function createSecurityMenuScreen(
  systemName: string,
  _userName: string,
  commandValue = "",
): ScreenDefinition {
  return createGoMenuScreen("SECURITY", systemName, "Security", [
    " 1. Work with user profiles",
    " 2. Work with system values",
    " 3. Display security audit journal",
    " 4. Work with object authorities",
    " 5. Display library list",
    " 6. Work with active jobs",
    " 7. Work with spooled files",
    " 8. Display messages",
    " 9. Security command menu",
    "10. User profile commands",
    "11. System value commands",
    "12. Service tools menu",
    "13. Authority commands",
    "14. Journal / audit commands",
    "15. Object / library commands",
    "16. Job / subsystem commands",
    "17. Work with system status",
    "18. Work with disk status",
    "19. Work with system activity",
    "20. IBM i security paths (stock + lab)",
  ], commandValue);
}

export function createServiceToolsMenuScreen(
  systemName: string,
  _userName: string,
  commandValue = "",
): ScreenDefinition {
  return createGoMenuScreen("SECTOOLS", systemName, "Service Tools", [
    " 1. Display service tools concept",
    " 2. Display privileged session",
  ], commandValue);
}

export function createJobMenuScreen(
  systemName: string,
  _userName: string,
  commandValue = "",
): ScreenDefinition {
  return createGoMenuScreen("JOB", systemName, "Job Menu", [
    "1. Display job",
    "2. Display job log",
    "3. Work with active jobs",
  ], commandValue);
}

export function createSpoolMenuScreen(
  systemName: string,
  _userName: string,
  commandValue = "",
): ScreenDefinition {
  return createGoMenuScreen("SPL", systemName, "Spool Menu", [
    "1. Work with spooled files",
    "2. Display messages",
  ], commandValue);
}

export const goMenuSelectionCommands: Record<string, Record<string, string>> = {
  SECURITY: {
    "1": "WRKUSRPRF",
    "2": "WRKSYSVAL",
    "3": "DSPJRN JRN(QSYS/QAUDJRN)",
    "4": "WRKOBJ",
    "5": "DSPLIBL",
    "6": "WRKACTJOB",
    "7": "WRKSPLF",
    "8": "DSPMSG",
    "9": "GO CMDSEC",
    "10": "GO CMDUSR",
    "11": "GO CMDSYS",
    "12": "GO SECTOOLS",
    "13": "GO CMDAUT",
    "14": "GO CMDJRN",
    "15": "GO CMDOBJ",
    "16": "GO CMDJOB",
    "17": "WRKSYSSTS",
    "18": "WRKDSKSTS",
    "19": "WRKSYSACT",
    "20": "GO SECSTOCK",
  },
  SECSTOCK: {
    "1": "CHGPWD",
    "2": "WRKAUTL",
    "3": "DSPAUT",
    "4": "DSPSECAUD",
    "5": "ANZPRFACT INACT(90)",
    "6": "DSPPRVSSN",
    "7": "CHGACTPRFL USRPRF(BACKUPADM) STATUS(*ACTIVE)",
    "8": "DSPSTCONC",
  },
  SECTOOLS: {
    "1": "DSPSTCONC",
    "2": "DSPPRVSSN",
  },
  JOB: {
    "1": "DSPJOB",
    "2": "DSPJOBLOG",
    "3": "WRKACTJOB",
  },
  SPL: {
    "1": "WRKSPLF",
    "2": "DSPMSG",
  },
};
