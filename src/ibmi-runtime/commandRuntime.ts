import type { IbmiSession } from "./sessionService.js";
import type { ParsedCommand } from "./commandParser.js";
import { normalizeCommandVerb, parseCommand } from "./commandParser.js";
import {
  catalogMessageForStatus,
  getCommand,
  unknownCommandMessage,
  type CommandDefinition,
} from "./commandCatalog.js";
import {
  getCommandHandler,
  menuSelectionCommands,
  type MenuRouteResult,
} from "./commandHandlers.js";
import { goMenuSelectionCommands } from "../screen-runtime/screens/mainMenu.js";
import { mainMenuSelectionCommands } from "../screen-runtime/screens/mainMenu.js";
import { recordMissionEvidence } from "../missions/missionEngine.js";
import { recordCommandHistory } from "../runtime/commandHistory.js";
import { listCommandsByGroupMenu } from "../catalog/commandCatalogService.js";
import { commandGroupSelectionMap } from "../screen-runtime/screens/commandGroupMenu.js";
import { openCommandPrompt } from "./commandPromptService.js";
import { sqlServiceSelectionCommands } from "../screen-runtime/screens/workSqlServices.js";
import {
  sessionHasSpecialAuthority,
  authorityRequiredMessage,
  sessionHasLimitedCapabilities,
  limitedUserCommandMessage,
  recordLimitedUserDenial,
} from "./authorityCheck.js";
import { recordSessionCommand } from "./commandRetrieve.js";
import { validateCommandParameters } from "./commandParameterValidation.js";
import { getCatalogCommand } from "../catalog/commandCatalogService.js";
import { withSignoffSelection } from "../tn5250-host/menuNavigation.js";
import {
  IBM_MAIN_MENU_ID,
  stockIbmMenuSelectionCommands,
} from "../screen-runtime/screens/stockIbmMainMenu.js";

export type { MenuRouteResult };

export type CommandResult = MenuRouteResult;

const CMD_GROUP_MENUS = new Set([
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

export const MENU_SCREEN_IDS = new Set([
  "AUDIT",
  "SECURITY",
  "SECSTOCK",
  "SECTOOLS",
  "JOB",
  "SPL",
  "MAIN",
  "CMDLIST",
  "DSPCMDCOV",
  "DSPCMDHST",
  "WRKSQLSVC",
  "IBMMAIN",
  "IBMUSR",
  "IBMGEN",
  "IBMFL",
  "IBMSTOCKSEC",
  "IONGRCMAIN",
  ...CMD_GROUP_MENUS,
]);

const PLATFORM_MENU_SELECTIONS: Record<string, Record<string, string>> = {
  WRKSQLSVC: sqlServiceSelectionCommands,
};

function selectionMapForMenu(menuId: string, session?: IbmiSession): Record<string, string> {
  if (menuId === "MAIN") return withSignoffSelection(mainMenuSelectionCommands);
  if (menuId === "AUDIT") return withSignoffSelection(menuSelectionCommands);
  if (menuId === IBM_MAIN_MENU_ID || menuId === "IONGRCMAIN") {
    return withSignoffSelection(stockIbmMenuSelectionCommands.IBMMAIN ?? {});
  }
  if (stockIbmMenuSelectionCommands[menuId]) {
    return withSignoffSelection(stockIbmMenuSelectionCommands[menuId]!);
  }
  if (PLATFORM_MENU_SELECTIONS[menuId]) return withSignoffSelection(PLATFORM_MENU_SELECTIONS[menuId]!);
  if (CMD_GROUP_MENUS.has(menuId)) {
    const page = session?.menuPage?.[menuId] ?? 0;
    return withSignoffSelection(
      commandGroupSelectionMap(menuId, listCommandsByGroupMenu(menuId), page),
    );
  }
  return withSignoffSelection(goMenuSelectionCommands[menuId] ?? {});
}

function commandNeedsPrompt(commandName: string): boolean {
  const catalog = getCatalogCommand(commandName);
  if (!catalog?.parameters?.length) return false;
  return catalog.parameters.some((param) => param.required);
}

export function routeAuditMenuInput(session: IbmiSession, rawInput: string): MenuRouteResult {
  const input = rawInput.trim();
  if (!input) {
    return { kind: "message", message: "CPF0006 - Selection or command required." };
  }

  const menuId = MENU_SCREEN_IDS.has(session.currentMenu as (typeof session)["currentMenu"])
    ? session.currentMenu
    : "AUDIT";
  const selection = input.match(/^(\d+)$/)?.[1];
  if (selection) {
    return routeMenuSelection(session, selection, menuId);
  }

  const parsed = parseCommand(input);
  if (!parsed) {
    const token = input.split(/\s+/)[0]?.toUpperCase() ?? input.toUpperCase();
    return { kind: "message", message: unknownCommandMessage(token) };
  }

  return executeCatalogCommand(session, parsed.name, input, parsed);
}

export function menuSelectionCommand(
  session: IbmiSession,
  selection: string,
  menuId: string,
): string | undefined {
  return selectionMapForMenu(menuId, session)[selection];
}

export function routeMenuSelection(
  session: IbmiSession,
  selection: string,
  menuId = "AUDIT",
): MenuRouteResult {
  const commandName = selectionMapForMenu(menuId, session)[selection];
  if (!commandName) {
    return { kind: "message", message: `CPF0006 - Selection ${selection} not valid.` };
  }

  const verb = normalizeCommandVerb(commandName.split(/\s+/)[0]!);
  if (commandNeedsPrompt(verb) && !commandName.includes("(")) {
    return openCommandPrompt(session, verb);
  }

  return executeCatalogCommand(session, verb, commandName);
}

export function executeCatalogCommand(
  session: IbmiSession,
  commandName: string,
  rawInput: string,
  parsedInput?: ParsedCommand,
): MenuRouteResult {
  const normalizedName = normalizeCommandVerb(commandName);
  const definition = getCommand(normalizedName);
  if (!definition) {
    return { kind: "message", message: unknownCommandMessage(normalizedName) };
  }

  if (definition.status !== "implemented") {
    return { kind: "message", message: catalogMessageForStatus(definition.name, definition.status) };
  }

  if (sessionHasLimitedCapabilities(session) && !definition.allowLimitedUser) {
    const message = limitedUserCommandMessage(normalizedName);
    recordLimitedUserDenial(session, normalizedName, rawInput, message);
    return { kind: "message", message };
  }

  if (
    definition.requiresAuthority.length > 0 &&
    !sessionHasSpecialAuthority(session, definition.requiresAuthority)
  ) {
    return { kind: "message", message: authorityRequiredMessage(definition.requiresAuthority) };
  }

  const parsed = parsedInput ?? parseCommand(rawInput);
  if (!parsed) {
    return { kind: "message", message: unknownCommandMessage(normalizedName) };
  }

  const catalogEntry = getCatalogCommand(definition.name);
  const paramCheck = validateCommandParameters(definition, parsed, catalogEntry);
  if (!paramCheck.ok) {
    return { kind: "message", message: paramCheck.message };
  }

  const handler = getCommandHandler(definition.handler);
  if (!handler) {
    return { kind: "message", message: catalogMessageForStatus(definition.name, definition.status) };
  }

  const result = handler(session, parsed, definition);
  if (result.kind === "message") {
    session.lastMessage = result.message;
  }
  recordSessionCommand(session, rawInput);
  recordMissionEvidence(session, normalizedName, rawInput, parsed);
  recordCommandHistory(session, normalizedName, rawInput, parsed, result);
  return result;
}

export function executeCommand(session: IbmiSession, command: ParsedCommand): CommandResult {
  return executeCatalogCommand(session, command.name, command.raw, command);
}

export function describeCommand(name: string): CommandDefinition | undefined {
  return getCommand(name);
}
