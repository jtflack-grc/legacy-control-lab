import type { IbmiSession } from "../ibmi-runtime/sessionService.js";
import { insertCommandHistory } from "../db/repositories/runtimeRepository.js";
import { resolveEvidenceTags } from "../missions/evidenceTags.js";
import type { ParsedCommand } from "../ibmi-runtime/commandParser.js";
import type { MenuRouteResult } from "../ibmi-runtime/commandHandlers.js";

export function recordCommandHistory(
  session: IbmiSession,
  commandName: string,
  rawInput: string,
  parsed: ParsedCommand,
  result: MenuRouteResult,
  mutationIds?: string[],
): void {
  if (!session.missionAttemptId || !session.userName) return;

  const resultMessage =
    result.kind === "message"
      ? result.message
      : result.kind === "screen"
        ? `Screen ${result.screen.id}`
        : "OK";
  const resultCode = resultMessage.startsWith("CPF") ? resultMessage.split(" ")[0]! : "CPI0000";
  const screenId = result.kind === "screen" ? result.screen.id : undefined;
  const evidenceTags = [...resolveEvidenceTags(commandName, parsed)];

  insertCommandHistory({
    attemptId: session.missionAttemptId,
    timestamp: new Date().toISOString(),
    userName: session.userName,
    commandText: rawInput,
    commandName,
    resultCode,
    resultMessage,
    screenId,
    evidenceTags,
    mutationIds,
  });
}
