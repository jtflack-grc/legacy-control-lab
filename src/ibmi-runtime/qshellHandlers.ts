import type { IbmiSession } from "./sessionService.js";
import type { MenuRouteResult } from "./commandHandlers.js";
import { createQshellScreen } from "../screen-runtime/screens/qshellScreen.js";
import { executeQshellLine, scrollQshell, ensureQshellSession } from "./pase/qshellRuntime.js";
import { resolveQshMode } from "./pase/qshMode.js";

export function startQshellSession(session: IbmiSession, initialCommand?: string): MenuRouteResult {
  if (resolveQshMode() === "disabled") {
    return {
      kind: "message",
      message:
        "QSH is disabled in this environment (LCL_QSH_MODE=disabled). Use CL commands on the green screen.",
    };
  }  ensureQshellSession(session);
  if (initialCommand?.trim()) {
    executeQshellLine(session, initialCommand.trim());
  }
  return { kind: "screen", screen: createQshellScreen(session) };
}

export function handleQshellScreenInput(
  session: IbmiSession,
  values: Record<string, string>,
  aid?: string,
): MenuRouteResult | undefined {
  const state = ensureQshellSession(session);

  if (aid === "PF7") {
    scrollQshell(state, 3, 14);
    return { kind: "screen", screen: createQshellScreen(session) };
  }
  if (aid === "PF8") {
    scrollQshell(state, -3, 14);
    return { kind: "screen", screen: createQshellScreen(session) };
  }

  const line = values.QSH_CMD?.trim() ?? "";
  if (!line) {
    return { kind: "screen", screen: createQshellScreen(session) };
  }

  const result = executeQshellLine(session, line);
  if (result.lines.some((entry) => entry === "QSH session ended.")) {
    return { kind: "message", message: "QSH session ended." };
  }

  return { kind: "screen", screen: createQshellScreen(session) };
}
