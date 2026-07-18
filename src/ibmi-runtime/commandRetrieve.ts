import type { ScreenDefinition } from "../screen-runtime/screen.js";
import type { IbmiSession } from "./sessionService.js";

const COMMAND_FIELD_IDS = new Set(["COMMAND", "SUBFILE_CMD"]);
const MAX_COMMAND_HISTORY = 50;

/** True when the screen has a command-line input field F9 can populate. */
export function screenHasRetrievableCommandLine(screen: ScreenDefinition): boolean {
  return screen.fields.some((field) => COMMAND_FIELD_IDS.has(field.id));
}

/** Record a submitted command in session history (deduped, most-recent first). */
export function recordSessionCommand(session: IbmiSession, rawCommand: string): void {
  const command = rawCommand.trim();
  if (!command) return;
  if (session.commandHistory[0] === command) {
    session.commandRetrieveIndex = 0;
    return;
  }
  session.commandHistory.unshift(command);
  if (session.commandHistory.length > MAX_COMMAND_HISTORY) {
    session.commandHistory.pop();
  }
  session.commandRetrieveIndex = 0;
}

/**
 * IBM i–style F9 retrieve: first press shows the most recent command,
 * each subsequent press walks further back in history.
 */
export function retrieveNextCommand(session: IbmiSession): string | undefined {
  const history = session.commandHistory;
  if (history.length === 0) return undefined;
  const index = session.commandRetrieveIndex ?? 0;
  const effectiveIndex = Math.min(index, history.length - 1);
  const command = history[effectiveIndex];
  if (effectiveIndex < history.length - 1) {
    session.commandRetrieveIndex = effectiveIndex + 1;
  }
  return command;
}

export function applyRetrievedCommandToScreen(
  screen: ScreenDefinition,
  command: string,
): ScreenDefinition {
  const retrieved = command.padEnd(74).slice(0, 74);
  return {
    ...screen,
    fields: screen.fields.map((field) =>
      COMMAND_FIELD_IDS.has(field.id) ? { ...field, value: retrieved } : field,
    ),
  };
}
