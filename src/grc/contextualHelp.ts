import type { IbmiSession } from "../ibmi-runtime/sessionService.js";
import type { ScreenDefinition } from "../screen-runtime/screen.js";
import { getLabMessage } from "../ibmi-runtime/messageCatalog.js";
import { extractMessageId } from "../ibmi-runtime/commandPromptService.js";
import { sessionLane } from "../ibmi-runtime/sessionLane.js";
import { articleForScreen } from "./iOnGrcArticles.js";
import { loadArticlePacks } from "./articlePacks.js";
import {
  createMessageHelpScreen,
  createScreenArticleHelpScreen,
} from "../screen-runtime/screens/commandHelp.js";
import { createInfoScreen } from "../screen-runtime/screens/screenHelpers.js";

/** F1 / contextual help: message help first; full article blocks on IONGRC only. */
export function resolveContextualHelpScreen(
  session: IbmiSession,
  screenId: string,
  lastMessage?: string,
): ScreenDefinition | undefined {
  const msgId = extractMessageId(lastMessage ?? session.lastMessage ?? "");
  if (msgId) {
    const message = getLabMessage(msgId);
    if (message) {
      return createMessageHelpScreen(message, session.systemName);
    }
  }

  const lane = sessionLane(session);
  if (lane === "iongrc") {
    const article = articleForScreen(screenId);
    if (article) {
      return createScreenArticleHelpScreen(screenId, article, session.systemName);
    }
    return createInfoScreen("HELP", "Help", session.systemName, session.userName ?? "IONGRC", [
      "i on GRC practice partition.",
      "Navigate the stock IBM i Main Menu — Security and User tasks reach the commands from the articles.",
      ...loadArticlePacks().slice(0, 5).map((pack, i) => `${i + 1}. ${pack.menuLabel}`),
    ]);
  }

  if (lane === "auditor" || lane === "operator" || lane === "demo") {
    return createInfoScreen("HELP", "Help", session.systemName, session.userName ?? "AUDIT", [
      "Message and screen help only on this lane.",
      "For i on GRC article context, sign on IONGRC / IONGRC.",
    ]);
  }

  const article = articleForScreen(screenId);
  if (article) {
    return createScreenArticleHelpScreen(screenId, article, session.systemName);
  }

  return undefined;
}
