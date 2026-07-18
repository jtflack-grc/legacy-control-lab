import type { ScreenDefinition } from "../screen-runtime/screen.js";
import type { SessionLane } from "../ibmi-runtime/sessionLane.js";
import { homeMenuForLane } from "../ibmi-runtime/sessionLane.js";
import { createAuditMenuScreen } from "../screen-runtime/screens/auditMenu.js";
import {
  createJobMenuScreen,
  createMainHubScreen,
  createSecurityMenuScreen,
  createServiceToolsMenuScreen,
  createSpoolMenuScreen,
} from "../screen-runtime/screens/mainMenu.js";
import { createSecurityStockMenuScreen } from "../screen-runtime/screens/securityStockMenu.js";
import {
  createCommandGroupMenuScreen,
  isCommandGroupMenu,
} from "../screen-runtime/screens/commandGroupMenu.js";
import type { IbmiSession } from "../ibmi-runtime/sessionService.js";
import { createWorkSqlServicesScreen } from "../screen-runtime/screens/workSqlServices.js";
import { listCommandsByGroupMenu } from "../catalog/commandCatalogService.js";
import { buildCommandCoverageReport } from "../catalog/commandCatalogService.js";
import { createCommandCoverageScreen } from "../screen-runtime/screens/commandCoverage.js";
import { createCommandHistoryScreen } from "../screen-runtime/screens/commandHistoryScreen.js";
import {
  createStockFilesMenuScreen,
  createStockGeneralSystemMenuScreen,
  createStockGoSecurityMenuScreen,
  createStockIbmMainMenuScreen,
  createStockUserTasksMenuScreen,
  IBM_MAIN_MENU_ID,
  stockIbmMenuSelectionCommands,
} from "../screen-runtime/screens/stockIbmMainMenu.js";

/** IBM i-style sign-off selection on application menus. */
export const SIGNOFF_MENU_SELECTION = "90";

const CMD_GROUP_MENUS = new Set<ScreenDefinition["id"]>([
  "CMDSEC",
  "CMDUSR",
  "CMDAUT",
  "CMDSYS",
  "CMDJRN",
  "CMDOBJ",
  "CMDFILE",
  "CMDJOB",
  "CMDSPL",
  "CMDMSG",
  "CMDIFS",
  "CMDPTF",
  "CMDSRC",
  "CMDSQL",
  "CMDTCP",
  "CMDLAB",
]);

const DIRECT_MAIN_CHILDREN = new Set<ScreenDefinition["id"]>([
  "AUDIT",
  "SECURITY",
  "JOB",
  "SPL",
  "WRKSQLSVC",
  "DSPCMDCOV",
  "DSPCMDHST",
  "CMDLIST",
  "CMDLAB",
]);

const OPERATOR_CMD_PARENTS: Partial<Record<ScreenDefinition["id"], ScreenDefinition["id"]>> = {
  CMDSEC: "SECURITY",
  CMDUSR: "SECURITY",
  CMDSYS: "SECURITY",
  CMDAUT: "SECURITY",
  CMDJRN: "SECURITY",
  CMDOBJ: "SECURITY",
  CMDJOB: "SECURITY",
  CMDFILE: "SECURITY",
  CMDSPL: "SECURITY",
  CMDMSG: "SECURITY",
  SECTOOLS: "SECURITY",
  SECSTOCK: "SECURITY",
};

/** Parent menu for F3 / one-level-back when the navigation stack is empty. */
export function menuParentId(
  screenId: ScreenDefinition["id"],
  lane: SessionLane = "auditor",
): ScreenDefinition["id"] | undefined {
  const home = homeMenuForLane(lane);
  if (screenId === home) return undefined;
  if (lane === "iongrc" && screenId !== IBM_MAIN_MENU_ID) return IBM_MAIN_MENU_ID;
  if (lane === "operator") {
    if (screenId === "MAIN") return "SECURITY";
    if (OPERATOR_CMD_PARENTS[screenId]) return OPERATOR_CMD_PARENTS[screenId];
    if (DIRECT_MAIN_CHILDREN.has(screenId) && screenId !== "SECURITY") return home;
    if (CMD_GROUP_MENUS.has(screenId) && screenId !== "CMDLAB") {
      return OPERATOR_CMD_PARENTS[screenId] ?? "CMDLAB";
    }
    if (screenId === "CMDLAB") return home;
    return home;
  }
  if (screenId === "MAIN") return undefined;
  if (DIRECT_MAIN_CHILDREN.has(screenId)) return "MAIN";
  if (screenId === "CMDLAB") return "MAIN";
  if (CMD_GROUP_MENUS.has(screenId) && screenId !== "CMDLAB") return "CMDLAB";
  return undefined;
}

export function withSignoffSelection(map: Record<string, string>): Record<string, string> {
  return { ...map, [SIGNOFF_MENU_SELECTION]: "SIGNOFF" };
}

export function shouldPushScreenStack(from: ScreenDefinition["id"], to: ScreenDefinition["id"]): boolean {
  if (from === to) return false;
  if (from === "SIGNON" || from === "CMDPROMPT") return false;
  return true;
}

export function recreateMenuScreen(
  menuId: ScreenDefinition["id"],
  systemName: string,
  userName: string,
  commandValue = "",
  message = "",
  session?: IbmiSession,
): ScreenDefinition {
  switch (menuId) {
    case "MAIN":
      return createMainHubScreen(systemName, userName, commandValue, message);
    case "AUDIT":
      return createAuditMenuScreen(systemName, userName, commandValue, message);
    case IBM_MAIN_MENU_ID:
      return createStockIbmMainMenuScreen(systemName, userName, commandValue, message);
    case "IBMUSR":
      return createStockUserTasksMenuScreen(systemName, userName, commandValue);
    case "IBMGEN":
      return createStockGeneralSystemMenuScreen(systemName, userName, commandValue);
    case "IBMFL":
      return createStockFilesMenuScreen(systemName, userName, commandValue);
    case "IBMSTOCKSEC":
      return createStockGoSecurityMenuScreen(systemName, userName, commandValue);
    case "IONGRCMAIN":
      return createStockIbmMainMenuScreen(systemName, userName, commandValue, message);
    case "SECURITY":
      return createSecurityMenuScreen(systemName, userName, commandValue);
    case "SECSTOCK":
      return createSecurityStockMenuScreen(systemName, userName, commandValue);
    case "SECTOOLS":
      return createServiceToolsMenuScreen(systemName, userName, commandValue);
    case "JOB":
      return createJobMenuScreen(systemName, userName, commandValue);
    case "SPL":
      return createSpoolMenuScreen(systemName, userName, commandValue);
    case "WRKSQLSVC":
      return createWorkSqlServicesScreen(systemName, session?.subfilePage?.WRKSQLSVC ?? 0);
    case "DSPCMDCOV":
      return createCommandCoverageScreen(systemName, buildCommandCoverageReport());
    case "DSPCMDHST":
      return createCommandHistoryScreen(systemName, []);
    case "CMDLIST":
      return createCommandGroupMenuScreen(
        "CMDLAB",
        systemName,
        listCommandsByGroupMenu("CMDLAB"),
        commandValue,
        session?.menuPage?.CMDLAB ?? 0,
      );
    default:
      if (CMD_GROUP_MENUS.has(menuId)) {
        return createCommandGroupMenuScreen(
          menuId,
          systemName,
          listCommandsByGroupMenu(menuId),
          commandValue,
          session?.menuPage?.[menuId] ?? 0,
        );
      }
      return createMainHubScreen(systemName, userName, commandValue, message);
  }
}
