import type { ScreenDefinition } from "../screen.js";
import type { ParsedCommand } from "../../ibmi-runtime/commandParser.js";
import type { IbmiSession } from "../../ibmi-runtime/sessionService.js";
import { getMessages } from "../../ibmi-runtime/messageService.js";
import { createDisplayMessagesBasicScreen } from "./displayMessagesBasic.js";
import { createDisplayMessagesScreen } from "./displayMessages.js";

export type MessageAssistLevel = "basic" | "intermed";

export function parseMessageAssistLevel(command: ParsedCommand | string): MessageAssistLevel {
  if (typeof command === "string") {
    return /ASTLVL\s*\(\s*\*?INTERMED\s*\)/i.test(command) ? "intermed" : "basic";
  }
  const ast = command.parameters.ASTLVL?.toUpperCase();
  if (ast === "*INTERMED" || ast === "INTERMED") {
    return "intermed";
  }
  return "basic";
}

export function messageAssistLevel(session: IbmiSession): MessageAssistLevel {
  return session.messageContext?.astLevel ?? "basic";
}

export function createDisplayMessagesForSession(
  session: IbmiSession,
  queueName: string,
  statusMessage?: string,
): ScreenDefinition {
  const messages = getMessages(queueName, session);
  if (messageAssistLevel(session) === "intermed") {
    return createDisplayMessagesScreen(
      session.systemName,
      queueName,
      messages,
      session.subfilePage?.DSPMSGINT ?? 0,
    );
  }
  return createDisplayMessagesBasicScreen(
    session.systemName,
    queueName,
    messages,
    session.messageContext?.infoPage ?? 0,
    statusMessage,
  );
}
