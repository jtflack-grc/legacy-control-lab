import type { ScreenDefinition } from "../screen-runtime/screen.js";
import { renderScreenToBuffer } from "../screen-runtime/screenRenderer.js";
import type { ScreenBuffer } from "../screen-runtime/screenBuffer.js";
import { refreshScreen, supportsRefresh } from "../screen-runtime/screenRefresh.js";
import { createMainHubScreen } from "../screen-runtime/screens/mainMenu.js";
import {
  createSignonScreen,
  createSignonScreenWithError,
} from "../screen-runtime/screens/signon.js";
import {
  authenticateUser,
  createSession,
  hydrateSessionFromProfile,
  signOffSession,
  type IbmiSession,
} from "../ibmi-runtime/sessionService.js";
import { homeMenuForLane, sessionLane } from "../ibmi-runtime/sessionLane.js";
import { parseAidInput, type ParsedAidInput } from "./aid.js";
import {
  buildScreenGds,
  buildStartupConfirmation,
  formatFrameHex,
  getTerminalDimensions,
  stripTelnetEscapes,
  unwrapGds,
} from "./gds.js";
import { routeAuditMenuInput } from "./menuRouter.js";
import { executeCatalogCommand, MENU_SCREEN_IDS } from "../ibmi-runtime/commandRuntime.js";
import {
  handleChangePasswordSubmit,
  handleFindingEditorSubmit,
  handleMessageDetailSubmit,
  openFindingComposer,
} from "../ibmi-runtime/commandHandlers.js";
import {
  changeWorkWithInfoPage,
  switchToIntermediateMessages,
} from "../ibmi-runtime/displayMessagesHandlers.js";
import {
  openCommandPrompt,
  submitCommandPrompt,
} from "../ibmi-runtime/commandPromptService.js";
import { getCatalogCommand } from "../catalog/commandCatalogService.js";
import { createCommandHelpScreen } from "../screen-runtime/screens/commandHelp.js";
import { resolveContextualHelpScreen } from "../grc/contextualHelp.js";
import { articleForScreen } from "../grc/iOnGrcArticles.js";
import { registerLiveSession, unregisterLiveSession } from "../lab/liveSessionRegistry.js";
import { LAB_SESSION_HEARTBEAT_MS, removeLabSession, upsertLabSession } from "../lab/sessionRegistry.js";
import { startMissionAttempt } from "../missions/missionEngine.js";
import {
  changeSubfilePage,
  getSubfileTotalItems,
  PAGED_SUBFILE_SCREENS,
} from "../ibmi-runtime/subfilePaging.js";
import { handleSubfileScreenInput, shouldPushScreenStack } from "./subfileRouter.js";
import { handleQshellScreenInput } from "../ibmi-runtime/qshellHandlers.js";
import { isSubfileScreen, mapScreenFieldValues, resolveScreenFieldId } from "./fieldResolver.js";
import { SUBFILE_OPTION_FIELD_PATTERN } from "../screen-runtime/screens/screenHelpers.js";
import {
  menuParentId,
  recreateMenuScreen,
} from "./menuNavigation.js";
import {
  commandGroupPageCount,
  isCommandGroupMenu,
} from "../screen-runtime/screens/commandGroupMenu.js";
import { listCommandsByGroupMenu } from "../catalog/commandCatalogService.js";
import { menuSelectionCommand } from "../ibmi-runtime/commandRuntime.js";
import {
  applyRetrievedCommandToScreen,
  recordSessionCommand,
  retrieveNextCommand,
  screenHasRetrievableCommandLine,
} from "../ibmi-runtime/commandRetrieve.js";

function withSubfileHint(screen: ScreenDefinition): ScreenDefinition {
  const hint = "Type option in Opt column (e.g. 1 or 5), then press Enter.";
  return {
    ...screen,
    fields: screen.fields.map((field) => {
      if (field.id === "OPTS" || field.id === "HINT") {
        return { ...field, value: hint.padEnd(field.length).slice(0, field.length) };
      }
      return field;
    }),
  };
}
import {
  createNegotiationState,
  extract5250Records,
  initialServerOffers,
  isNegotiationData,
  processTelnetData,
  type NegotiationState,
} from "./telnetNegotiation.js";

export type SessionAdapterOptions = {
  systemName: string;
  devFrameLog: boolean;
  onDisconnect?: () => void;
};

export type SessionAdapter = {
  handleData: (data: Buffer) => Buffer[];
  getSession: () => IbmiSession;
  getCurrentScreen: () => ScreenDefinition;
  getScreenBuffer: () => ScreenBuffer;
  dispose: () => void;
};

function isSubScreen(screenId: ScreenDefinition["id"]): boolean {
  return screenId !== "SIGNON" && screenId !== "CMDPROMPT" && !MENU_SCREEN_IDS.has(screenId);
}

export function createSessionAdapter(options: SessionAdapterOptions): SessionAdapter {
  const session = createSession(options.systemName);
  let negotiation: NegotiationState = createNegotiationState();
  let currentScreen = createSignonScreen(
    options.systemName,
    session.displayName,
    session.deviceType,
  );
  let screenBuffer = renderScreenToBuffer(currentScreen);
  let pendingInitialScreen = true;
  let receiveBuffer: Buffer = Buffer.alloc(0);
  let screenCols = currentScreen.cols;
  let lastCommand = "";
  let screenStack: ScreenDefinition[] = [];
  let labSessionHeartbeat: ReturnType<typeof setInterval> | undefined;

  const logFrame = (direction: "IN" | "OUT", data: Buffer): void => {
    if (options.devFrameLog) {
      console.log(`[TN5250 ${direction}] ${formatFrameHex(data)}`);
    }
  };

  const syncLabSession = (): void => {
    if (!session.signedOn || !session.userName) return;
    upsertLabSession({
      sessionId: session.id,
      systemName: session.systemName,
      userName: session.userName,
      screenId: currentScreen.id,
      lane: session.lane,
      initialMenu: session.initialMenu,
      lastCommand: lastCommand || undefined,
      guidanceMode: session.guidanceMode,
      personaId: session.personaId,
      helpArticle: currentScreen.helpArticle ?? articleForScreen(currentScreen.id) ?? undefined,
      focusFindingComposer: session.focusFindingComposer || undefined,
      updatedAt: new Date().toISOString(),
    });
  };

  const stopLabSessionHeartbeat = (): void => {
    if (!labSessionHeartbeat) return;
    clearInterval(labSessionHeartbeat);
    labSessionHeartbeat = undefined;
  };

  const startLabSessionHeartbeat = (): void => {
    if (labSessionHeartbeat || !session.signedOn) return;
    labSessionHeartbeat = setInterval(() => {
      if (session.signedOn && session.userName) {
        syncLabSession();
        return;
      }
      stopLabSessionHeartbeat();
    }, LAB_SESSION_HEARTBEAT_MS);
    labSessionHeartbeat.unref?.();
  };

  const ensureLabSessionHeartbeat = (): void => {
    if (session.signedOn) startLabSessionHeartbeat();
  };

  const disposeLabSession = (): void => {
    stopLabSessionHeartbeat();
    unregisterLiveSession(session.id);
    removeLabSession(session.id);
  };

  const sendScreen = (screen: ScreenDefinition, nav?: { push?: boolean; restore?: boolean }): Buffer[] => {
    if (
      nav?.push !== false &&
      !nav?.restore &&
      shouldPushScreenStack(currentScreen.id, screen.id)
    ) {
      screenStack.push(currentScreen);
    }

    currentScreen = screen;
    screenBuffer = renderScreenToBuffer(screen);
    screenCols = screen.cols;

    if (MENU_SCREEN_IDS.has(screen.id)) {
      session.currentMenu = screen.id;
    }

    syncLabSession();
    ensureLabSessionHeartbeat();

    const frame = buildScreenGds(screen.fields);
    logFrame("OUT", frame);
    return [frame];
  };

  const returnToMenu = (
    menuId: ScreenDefinition["id"],
    message?: string,
    command = "",
  ): Buffer[] => {
    session.currentMenu = menuId;
    const screen = recreateMenuScreen(
      menuId,
      options.systemName,
      session.userName ?? "",
      command,
      message ?? "",
      session,
    );
    return sendScreen(screen, { push: false });
  };

  const returnToHomeMenu = (message?: string, command = ""): Buffer[] => {
    screenStack = [];
    return returnToMenu(homeMenuForLane(sessionLane(session)), message, command);
  };

  const handleCommandRetrieve = (): Buffer[] => {
    const retrieved = retrieveNextCommand(session);
    if (!retrieved) {
      return sendScreen(currentScreen, { push: false });
    }
    lastCommand = retrieved;
    if (MENU_SCREEN_IDS.has(currentScreen.id)) {
      return refreshCurrentMenu(undefined, retrieved);
    }
    if (screenHasRetrievableCommandLine(currentScreen)) {
      return sendScreen(applyRetrievedCommandToScreen(currentScreen, retrieved), { push: false });
    }
    return refreshCurrentMenu(undefined, retrieved);
  };

  const refreshCurrentMenu = (message?: string, command = ""): Buffer[] => {
    if (MENU_SCREEN_IDS.has(currentScreen.id)) {
      return returnToMenu(currentScreen.id, message, command);
    }
    return popNavigationScreen(message, command);
  };

  const popNavigationScreen = (message?: string, command = ""): Buffer[] => {
    if (screenStack.length > 0) {
      const previous = screenStack.pop()!;
      return sendScreen(previous, { restore: true });
    }

    const lane = sessionLane(session);
    const home = homeMenuForLane(lane);
    const parent = menuParentId(currentScreen.id, lane);
    if (parent) {
      return returnToMenu(parent, message, command);
    }

    if (currentScreen.id === home) {
      return sendScreen(
        recreateMenuScreen(
          home,
          options.systemName,
          session.userName ?? "",
          command,
          message ?? "",
          session,
        ),
        { push: false },
      );
    }

    return returnToHomeMenu(message, command);
  };

  const resolveFieldId = (row: number, col: number, address: number): string | undefined =>
    resolveScreenFieldId(currentScreen, screenBuffer, row, col, address);

  const mapFieldValues = (parsed: ParsedAidInput): Record<string, string> =>
    mapScreenFieldValues(currentScreen, screenBuffer, parsed);

  const applyRoute = (route: ReturnType<typeof routeAuditMenuInput>): Buffer[] => {
    if (route.kind === "screen") {
      return sendScreen(route.screen);
    }
    if (route.command === "SIGNOFF") {
      signOffSession(session);
      disposeLabSession();
      screenStack = [];
      return sendScreen(createSignonScreen(options.systemName, session.displayName, session.deviceType), {
        push: false,
      });
    }
    session.lastMessage = route.message;
    return refreshCurrentMenu(route.message);
  };

  const handleSignonInput = (parsed: ParsedAidInput): Buffer[] => {
    if (parsed.aid === "PF3" || parsed.aid === "PF12") {
      return sendScreen(createSignonScreen(options.systemName, session.displayName, session.deviceType), {
        push: false,
      });
    }

    if (parsed.aid !== "ENTER") {
      return sendScreen(currentScreen, { push: false });
    }

    const values = mapFieldValues(parsed);
    const auth = authenticateUser(values.USER ?? "", values.PASSWORD ?? "", options.systemName);
    if (!auth.ok) {
      return sendScreen(
        createSignonScreenWithError(
          options.systemName,
          auth.message ?? "Invalid user ID or password.",
          session.displayName,
        ),
        { push: false },
      );
    }

    session.signedOn = true;
    session.userName = auth.userName;
    session.job.user = auth.userName!;
    registerLiveSession(session);
    screenStack = [];
    hydrateSessionFromProfile(session, auth.userName, options.systemName);
    const homeMenu = homeMenuForLane(sessionLane(session));
    session.currentMenu = homeMenu;
    try {
      startMissionAttempt(session);
    } catch (err) {
      console.error(
        "[session] mission start failed:",
        err instanceof Error ? err.message : String(err),
      );
    }
    const initialScreen = recreateMenuScreen(
      homeMenu,
      options.systemName,
      auth.userName,
      "",
      sessionLane(session) === "operator" ? "CPF1124 - Sign-on complete." : "",
      session,
    );
    return sendScreen(initialScreen, { push: false });
  };

  const handleAuditMenuInput = (parsed: ParsedAidInput): Buffer[] => {
    if (parsed.aid === "PF3" || parsed.aid === "PF12") {
      const home = homeMenuForLane(sessionLane(session));
      if (currentScreen.id === home && parsed.aid === "PF12") {
        return sendScreen(currentScreen, { push: false });
      }
      return popNavigationScreen();
    }

    if (parsed.aid === "PF4") {
      const command = mapFieldValues(parsed).COMMAND?.trim() ?? "";
      if (/^\d+$/.test(command) && isCommandGroupMenu(session.currentMenu)) {
        const selected = menuSelectionCommand(session, command, session.currentMenu);
        if (selected) {
          return applyRoute(openCommandPrompt(session, selected.split(/\s+/)[0]!));
        }
      }
      return applyRoute(openCommandPrompt(session, command));
    }

    if (
      (parsed.aid === "PF7" || parsed.aid === "PF8") &&
      isCommandGroupMenu(session.currentMenu)
    ) {
      const menuId = session.currentMenu;
      const total = commandGroupPageCount(listCommandsByGroupMenu(menuId));
      const current = session.menuPage?.[menuId] ?? 0;
      const next =
        parsed.aid === "PF8"
          ? Math.min(total - 1, current + 1)
          : Math.max(0, current - 1);
      session.menuPage = { ...session.menuPage, [menuId]: next };
      return returnToMenu(menuId as ScreenDefinition["id"]);
    }

    if (parsed.aid === "PF1") {
      const contextual = resolveContextualHelpScreen(session, currentScreen.id);
      if (contextual) {
        return sendScreen(contextual);
      }
      return applyRoute(executeCatalogCommand(session, "HELP", "HELP"));
    }

    if (parsed.aid === "PF9") {
      return handleCommandRetrieve();
    }

    if (parsed.aid !== "ENTER") {
      return sendScreen(currentScreen, { push: false });
    }

    const command = mapFieldValues(parsed).COMMAND?.trim() ?? "";
    if (command) {
      recordSessionCommand(session, command);
      lastCommand = command;
    }

    return applyRoute(routeAuditMenuInput(session, command));
  };

  const handleSubScreenInput = (parsed: ParsedAidInput): Buffer[] => {
    if (currentScreen.id === "QSH") {
      if (parsed.aid === "PF3" || parsed.aid === "PF12") {
        session.qshellContext = undefined;
        return popNavigationScreen();
      }
      if (parsed.aid === "PF7" || parsed.aid === "PF8" || parsed.aid === "ENTER") {
        const route = handleQshellScreenInput(session, mapFieldValues(parsed), parsed.aid);
        if (route?.kind === "screen") return sendScreen(route.screen, { push: false });
        if (route?.kind === "message") return refreshCurrentMenu(route.message);
      }
      return sendScreen(currentScreen, { push: false });
    }

    if (parsed.aid === "PF3" || parsed.aid === "PF12") {
      return popNavigationScreen();
    }

    if (parsed.aid === "PF4") {
      const values = mapFieldValues(parsed);
      const command = values.SUBFILE_CMD?.trim() ?? values.COMMAND?.trim() ?? "";
      return applyRoute(openCommandPrompt(session, command));
    }

    if (parsed.aid === "PF1") {
      const contextual = resolveContextualHelpScreen(session, currentScreen.id);
      if (contextual) {
        return sendScreen(contextual);
      }
      return applyRoute(executeCatalogCommand(session, "HELP", "HELP"));
    }

    if (parsed.aid === "PF9") {
      return handleCommandRetrieve();
    }

    if (currentScreen.id === "DSPMSG") {
      if (parsed.aid === "PF22") {
        const route = switchToIntermediateMessages(session);
        if (route.kind === "screen") {
          return sendScreen(route.screen, { push: false });
        }
        return refreshCurrentMenu(route.message);
      }
      const infoPageDelta =
        parsed.aid === "PF8" || parsed.aid === "ROLL_UP"
          ? 1
          : parsed.aid === "PF7" || parsed.aid === "ROLL_DOWN"
            ? -1
            : 0;
      if (infoPageDelta !== 0) {
        changeWorkWithInfoPage(session, infoPageDelta);
        const refreshed = refreshScreen(session, "DSPMSG");
        if (refreshed) {
          return sendScreen(refreshed, { push: false });
        }
      }
    }

    const subfilePageDelta =
      parsed.aid === "PF8" || parsed.aid === "ROLL_UP"
        ? 1
        : parsed.aid === "PF7" || parsed.aid === "ROLL_DOWN"
          ? -1
          : 0;
    if (subfilePageDelta !== 0 && PAGED_SUBFILE_SCREENS.has(currentScreen.id)) {
      changeSubfilePage(session, currentScreen.id, subfilePageDelta);
      const refreshed = refreshScreen(session, currentScreen.id);
      if (refreshed) {
        return sendScreen(refreshed, { push: false });
      }
    }

    if (parsed.aid === "PF5" && supportsRefresh(currentScreen.id)) {
      const refreshed = refreshScreen(session, currentScreen.id);
      if (refreshed) {
        return sendScreen(refreshed, { push: false });
      }
    }

    if (parsed.aid === "PF10" && currentScreen.id === "DSPJOBLOG") {
      session.jobLogShowAll = true;
      const refreshed = refreshScreen(session, "DSPJOBLOG");
      if (refreshed) {
        return sendScreen(refreshed, { push: false });
      }
    }

    if (
      parsed.aid === "PF10" &&
      (currentScreen.id === "WRKSYSSTS" || currentScreen.id === "WRKDSKSTS")
    ) {
      session.monitorStatsResetAt = Date.now();
      const refreshed = refreshScreen(session, currentScreen.id);
      if (refreshed) {
        return sendScreen(refreshed, { push: false });
      }
    }

    if (parsed.aid === "PF16" && currentScreen.id === "WRKDSKSTS") {
      const route = executeCatalogCommand(session, "WRKSYSSTS", "WRKSYSSTS");
      if (route.kind === "screen") {
        return sendScreen(route.screen, { push: true });
      }
    }

    if (parsed.aid === "PF17" && currentScreen.id === "DSPLIB") {
      session.subfilePage = { ...session.subfilePage, DSPLIB: 0 };
      const refreshed = refreshScreen(session, "DSPLIB");
      if (refreshed) {
        return sendScreen(refreshed, { push: false });
      }
    }

    if (parsed.aid === "PF18" && currentScreen.id === "DSPLIB") {
      const total = getSubfileTotalItems(session, "DSPLIB");
      const maxPage = total > 0 ? Math.ceil(total / 7) - 1 : 0;
      session.subfilePage = { ...session.subfilePage, DSPLIB: maxPage };
      const refreshed = refreshScreen(session, "DSPLIB");
      if (refreshed) {
        return sendScreen(refreshed, { push: false });
      }
    }

    if (currentScreen.id === "FINDING") {
      if (parsed.aid === "PF6") {
        const route = openFindingComposer(session);
        syncLabSession();
        if (route.kind === "screen") {
          return sendScreen(route.screen, { push: false });
        }
        return refreshCurrentMenu(route.message);
      }
      if (parsed.aid === "ENTER") {
        const route = handleFindingEditorSubmit(session);
        syncLabSession();
        if (route.kind === "message") {
          return refreshCurrentMenu(route.message);
        }
        return sendScreen(route.screen, { push: false });
      }
      return sendScreen(currentScreen, { push: false });
    }

    if (parsed.aid !== "ENTER") {
      return sendScreen(currentScreen, { push: false });
    }

    if (currentScreen.id === "DSPMSGDTL") {
      const route = handleMessageDetailSubmit(session, mapFieldValues(parsed));
      if (route.kind === "message") {
        return refreshCurrentMenu(route.message);
      }
      return sendScreen(route.screen, { push: route.kind === "screen" });
    }

    if (currentScreen.id === "CHGPWD") {
      const route = handleChangePasswordSubmit(session, mapFieldValues(parsed));
      if (route.kind === "message") {
        return refreshCurrentMenu(route.message);
      }
      return sendScreen(route.screen, { push: false });
    }

    const values = mapFieldValues(parsed);
    if (options.devFrameLog) {
      console.log(
        `[TN5250] subfile ${currentScreen.id} values=${JSON.stringify(values)} cursor=${parsed.cursorRow},${parsed.cursorCol}`,
      );
    }

    const route = handleSubfileScreenInput(session, currentScreen.id, values);
    if (route) {
      if (route.kind === "screen") return sendScreen(route.screen, { push: true });
      return refreshCurrentMenu(route.message);
    }

    if (isSubfileScreen(currentScreen.id)) {
      const hasOption = Object.entries(values).some(
        ([id, value]) =>
          SUBFILE_OPTION_FIELD_PATTERN.test(id) && value.replace(/_/g, "").trim().length > 0,
      );
      const command = values.SUBFILE_CMD?.trim() ?? values.COMMAND?.trim() ?? "";
      if (command && !hasOption && !/^\d{1,2}$/.test(command)) {
        recordSessionCommand(session, command);
        lastCommand = command;
        const catalogRoute = executeCatalogCommand(
          session,
          command.split(/\s+/)[0]!.toUpperCase(),
          command,
        );
        if (catalogRoute.kind === "screen") return sendScreen(catalogRoute.screen);
        return refreshCurrentMenu(catalogRoute.message);
      }
      if (!hasOption && !command) {
        return sendScreen(withSubfileHint(currentScreen), { push: false });
      }
    }

    if (currentScreen.commandLine && !isSubfileScreen(currentScreen.id)) {
      const command = values.SUBFILE_CMD?.trim() ?? values.COMMAND?.trim() ?? "";
      if (command) {
        recordSessionCommand(session, command);
        lastCommand = command;
        const catalogRoute = executeCatalogCommand(
          session,
          command.split(/\s+/)[0]!.toUpperCase(),
          command,
        );
        if (catalogRoute.kind === "screen") return sendScreen(catalogRoute.screen);
        return refreshCurrentMenu(catalogRoute.message);
      }
    }

    return sendScreen(currentScreen, { push: false });
  };

  const handleCommandPromptInput = (parsed: ParsedAidInput): Buffer[] => {
    if (parsed.aid === "PF3" || parsed.aid === "PF12") {
      session.promptContext = undefined;
      return popNavigationScreen();
    }
    if (parsed.aid === "PF1") {
      const cmd = getCatalogCommand(session.promptContext?.commandName ?? "");
      if (cmd) {
        return sendScreen(createCommandHelpScreen(cmd, session.systemName));
      }
    }
    if (parsed.aid !== "ENTER") {
      return sendScreen(currentScreen, { push: false });
    }
    const values = mapFieldValues(parsed);
    const cmd = getCatalogCommand(session.promptContext?.commandName ?? "");
    const built = submitCommandPrompt(session, values, cmd);
    if (!built || !cmd) {
      return refreshCurrentMenu("CPF0006 - Prompt context lost.");
    }
    return applyRoute(executeCatalogCommand(session, cmd.name, built.commandText));
  };

  const handle5250Record = (record: Buffer): Buffer[] => {
    const payload = stripTelnetEscapes(record);
    if (payload.length === 0) return [];

    const gds = unwrapGds(payload);
    if (!gds) return [];

    if (gds.miscFlags1 === 0x80 || gds.miscFlags1 === 0x90) {
      return [];
    }

    const parsed = parseAidInput(
      gds.payload,
      screenCols,
      resolveFieldId,
      (fieldId) => currentScreen.fields.find((f) => f.id === fieldId)?.length,
    );

    if (options.devFrameLog) {
      console.log(`[TN5250] AID=${parsed.aid} fields=${JSON.stringify(parsed.fields)}`);
    }

    if (currentScreen.id === "SIGNON") return handleSignonInput(parsed);
    if (currentScreen.id === "CMDPROMPT") return handleCommandPromptInput(parsed);
    if (isSubfileScreen(currentScreen.id)) return handleSubScreenInput(parsed);
    if (MENU_SCREEN_IDS.has(currentScreen.id)) return handleAuditMenuInput(parsed);
    if (isSubScreen(currentScreen.id)) return handleSubScreenInput(parsed);
    return sendScreen(currentScreen, { push: false });
  };

  const pushInitialSession = (): Buffer[] => {
    const frames: Buffer[] = [];
    const startup = buildStartupConfirmation(options.systemName, session.displayName);
    logFrame("OUT", startup);
    frames.push(startup);
    frames.push(...sendScreen(currentScreen, { push: false }));
    return frames;
  };

  const handleData = (data: Buffer): Buffer[] => {
    logFrame("IN", data);
    receiveBuffer = Buffer.concat([receiveBuffer, data]);
    const outbound: Buffer[] = [];

    if (!negotiation.complete) {
      const { responses, remaining, negotiationComplete } = processTelnetData(
        receiveBuffer,
        negotiation,
      );
      receiveBuffer = Buffer.from(remaining);
      outbound.push(...responses);

      if (negotiationComplete && pendingInitialScreen) {
        pendingInitialScreen = false;
        const termType = negotiation.terminalType ?? "IBM-5292-2";
        const dims = getTerminalDimensions(termType);
        if (dims.rows !== currentScreen.rows || dims.cols !== currentScreen.cols) {
          currentScreen = { ...currentScreen, rows: dims.rows, cols: dims.cols };
          screenBuffer = renderScreenToBuffer(currentScreen);
          screenCols = dims.cols;
        }
        outbound.push(...pushInitialSession());
      }
      return outbound;
    }

    if (isNegotiationData(receiveBuffer)) {
      const { responses, remaining } = processTelnetData(receiveBuffer, negotiation);
      receiveBuffer = Buffer.from(remaining);
      outbound.push(...responses);
    }

    const records = extract5250Records(receiveBuffer);
    if (records.length > 0) {
      receiveBuffer = receiveBuffer.subarray(findLastEorEnd(receiveBuffer));
    }

    for (const record of records) {
      outbound.push(...handle5250Record(record));
    }

    return outbound;
  };

  logFrame("OUT", initialServerOffers());

  return {
    handleData: (data: Buffer) => {
      if (data.length === 0) return [];
      return handleData(data);
    },
    getSession: () => session,
    getCurrentScreen: () => currentScreen,
    getScreenBuffer: () => screenBuffer,
    dispose: disposeLabSession,
  };
}

export function getInitialNegotiationFrames(): Buffer[] {
  return [initialServerOffers()];
}

function findLastEorEnd(data: Buffer): number {
  let end = 0;
  for (let i = 0; i < data.length - 1; i++) {
    if (data[i] === 0xff && data[i + 1] === 0xef) end = i + 2;
  }
  return end;
}

export type { ScreenDefinition };
