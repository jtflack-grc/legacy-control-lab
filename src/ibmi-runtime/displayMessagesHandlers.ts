import type { ScreenDefinition } from "../screen-runtime/screen.js";
import type { IbmiSession } from "./sessionService.js";
import { getMessages, removeMessage } from "./messageService.js";
import type { MenuRouteResult } from "./commandHandlers.js";
import {
  createDisplayMessagesBasicScreen,
  workWithInfoPageCount,
} from "../screen-runtime/screens/displayMessagesBasic.js";
import { buildWorkWithMessageRows } from "../screen-runtime/screens/workWithMessagesLayout.js";
import { createDisplayMessagesForSession } from "../screen-runtime/screens/displayMessagesRouter.js";
import { createDisplayMessagesScreen } from "../screen-runtime/screens/displayMessages.js";
import { createDisplayMessageDetailScreen } from "../screen-runtime/screens/displayMessageDetail.js";
import { parseSubfileOption } from "../screen-runtime/screens/screenHelpers.js";

function queueName(session: IbmiSession): string {
  return session.messageContext?.queueName ?? "QSYSOPR";
}

function refreshBasic(session: IbmiSession, statusMessage?: string): ScreenDefinition {
  const queue = queueName(session);
  return createDisplayMessagesBasicScreen(
    session.systemName,
    queue,
    getMessages(queue, session),
    session.messageContext?.infoPage ?? 0,
    statusMessage,
  );
}

export function changeWorkWithInfoPage(session: IbmiSession, delta: number): void {
  const queue = queueName(session);
  const maxPage = workWithInfoPageCount(getMessages(queue, session)) - 1;
  const current = session.messageContext?.infoPage ?? 0;
  const next = Math.min(maxPage, Math.max(0, current + delta));
  session.messageContext = {
    ...session.messageContext,
    queueName: queue,
    astLevel: "basic",
    infoPage: next,
  };
}

export function handleWorkWithMessagesBasicInput(
  session: IbmiSession,
  values: Record<string, string>,
): MenuRouteResult | undefined {
  const queue = queueName(session);
  const messages = getMessages(queue, session);
  const infoPage = session.messageContext?.infoPage ?? 0;
  const rows = buildWorkWithMessageRows(messages, infoPage);

  for (const row of rows) {
    const option = parseSubfileOption(values[row.optFieldId]);
    if (!option) continue;

    if (!row.message) {
      if (option === "4" || option === "5") {
        return { kind: "message", message: "CPF2405 - Message not found." };
      }
      continue;
    }

    if (option === "4") {
      const result = removeMessage(session, queue, row.message.id);
      if (!result.ok) {
        return { kind: "screen", screen: refreshBasic(session, result.message) };
      }
      return { kind: "screen", screen: refreshBasic(session) };
    }

    if (option === "5") {
      session.messageContext = {
        ...session.messageContext,
        queueName: queue,
        astLevel: "basic",
        selectedMessageId: row.message.id,
        infoPage,
      };
      return {
        kind: "screen",
        screen: createDisplayMessageDetailScreen(session.systemName, queue, row.message),
      };
    }
  }

  return undefined;
}

export function switchToIntermediateMessages(session: IbmiSession): MenuRouteResult {
  const queue = queueName(session);
  session.messageContext = { ...session.messageContext, queueName: queue, astLevel: "intermed" };
  session.subfilePage = { ...session.subfilePage, DSPMSGINT: 0 };
  return {
    kind: "screen",
    screen: createDisplayMessagesScreen(session.systemName, queue, getMessages(queue, session), 0),
  };
}

export function switchToBasicMessages(session: IbmiSession): MenuRouteResult {
  const queue = queueName(session);
  session.messageContext = { ...session.messageContext, queueName: queue, astLevel: "basic", infoPage: 0 };
  return { kind: "screen", screen: createDisplayMessagesForSession(session, queue) };
}
