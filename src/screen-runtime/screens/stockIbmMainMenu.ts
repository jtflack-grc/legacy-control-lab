import type { ScreenDefinition } from "../screen.js";
import { createGoMenuScreen } from "./screenHelpers.js";

/**
 * Stock IBM i user navigation — QSYS/MAIN style (IBM i 7.x User Menu).
 * Sources: IBM i User's Guide — Main menu options; SecureMyi GO SECURITY golden.
 * IONGRC lane lands here so players navigate real menu paths, not a custom pack picker.
 */

export const IBM_MAIN_MENU_ID = "IBMMAIN" as const;

/** QSYS/MAIN — centered "Main Menu", stock option labels. */
export function createStockIbmMainMenuScreen(
  systemName: string,
  _userName: string,
  commandValue = "",
  message = "",
): ScreenDefinition {
  return createGoMenuScreen(
    IBM_MAIN_MENU_ID,
    systemName,
    "Main Menu",
    [
      " 1. User tasks",
      " 2. General system tasks",
      " 3. Files, libraries, and folders",
      " 4. Programming",
      " 5. Communications",
      " 6. Define or change system",
      " 7. Define or change menu",
      " 8. Security",
    ],
    commandValue,
    message,
  );
}

/** User tasks submenu (MAI-style). */
export function createStockUserTasksMenuScreen(
  systemName: string,
  _userName: string,
  commandValue = "",
): ScreenDefinition {
  return createGoMenuScreen(
    "IBMUSR",
    systemName,
    "User Tasks",
    [
      " 1. Work with your spooled files",
      " 2. Work with messages",
      " 3. Send a message",
      " 4. Work with user printers",
      " 5. Display user profile",
      " 6. Work with jobs",
    ],
    commandValue,
  );
}

/** General system tasks submenu. */
export function createStockGeneralSystemMenuScreen(
  systemName: string,
  _userName: string,
  commandValue = "",
): ScreenDefinition {
  return createGoMenuScreen(
    "IBMGEN",
    systemName,
    "General System Tasks",
    [
      " 1. Display system status",
      " 2. Display disk status",
      " 3. Work with system activity",
      " 4. Work with active jobs",
    ],
    commandValue,
  );
}

/** Files, libraries, and folders submenu. */
export function createStockFilesMenuScreen(
  systemName: string,
  _userName: string,
  commandValue = "",
): ScreenDefinition {
  return createGoMenuScreen(
    "IBMFL",
    systemName,
    "Files, Libraries, and Folders",
    [
      " 1. Work with libraries",
      " 2. Work with objects",
      " 3. Work with folders",
    ],
    commandValue,
  );
}

/**
 * IBM stock GO SECURITY menu (8 options) — matches data/screen-specs/golden/security.golden.json.
 * Lab expanded SECURITY (20 options) is for QSECOFR training; IONGRC uses this stock panel.
 */
export function createStockGoSecurityMenuScreen(
  systemName: string,
  _userName: string,
  commandValue = "",
): ScreenDefinition {
  return createGoMenuScreen(
    "IBMSTOCKSEC",
    systemName,
    "Security",
    [
      "     1. Change your password",
      "     2. Work with user profiles",
      "     3. Work with authorization lists",
      "     4. Work with adopted authority",
      "     5. Work with security auditing",
      "     6. Work with system values",
      "     7. Display security audit journal",
      "     8. Security tools",
    ],
    commandValue,
  );
}

export const stockIbmMenuSelectionCommands: Record<string, Record<string, string>> = {
  IBMMAIN: {
    "1": "GO IBMUSR",
    "2": "GO IBMGEN",
    "3": "GO IBMFL",
    "4": "GO CMDLAB",
    "8": "GO IBMSTOCKSEC",
  },
  IBMUSR: {
    "1": "WRKSPLF",
    "2": "DSPMSG",
    "5": "DSPUSRPRF",
    "6": "WRKACTJOB",
  },
  IBMGEN: {
    "1": "WRKSYSSTS",
    "2": "WRKDSKSTS",
    "3": "WRKSYSACT",
    "4": "WRKACTJOB",
  },
  IBMFL: {
    "1": "WRKLIB",
    "2": "WRKOBJ OBJ(QGPL/*ALL)",
  },
  IBMSTOCKSEC: {
    "1": "CHGPWD",
    "2": "WRKUSRPRF",
    "3": "WRKAUTL",
    "5": "DSPSECAUD",
    "6": "WRKSYSVAL",
    "7": "DSPJRN JRN(QSYS/QAUDJRN)",
    "8": "GO SECTOOLS",
  },
};
