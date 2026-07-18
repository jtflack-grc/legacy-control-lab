import type { ScreenDefinition } from "../screen.js";
import { menuHeader, outputField } from "./screenHelpers.js";
import type { CatalogCommandDefinition } from "../../catalog/commandTypes.js";
import { resolveImplementationLevel } from "../../catalog/commandTypes.js";
import type { LabMessage } from "../../ibmi-runtime/messageCatalog.js";
import { articleForCommand, articleForTopic, type GrcArticleLink } from "../../grc/iOnGrcArticles.js";
import { appendArticleHelpLines, articleHelpLines } from "../../grc/articleHelpText.js";

export function createCommandHelpScreen(
  command: CatalogCommandDefinition,
  systemName: string,
): ScreenDefinition {
  const level = resolveImplementationLevel(command);
  const lines = [
    `Command . . . . . . . . . . . . . . . . . . : ${command.name}`,
    `Description . . . . . . . . . . . . . . . . : ${command.displayName}`,
    `Category . . . . . . . . . . . . . . . . . : ${command.category}`,
    `Support level . . . . . . . . . . . . . . . : ${level.replace(/_/g, " ")}`,
    "",
    "Purpose:",
    `  ${command.helpText ?? command.shortDescription ?? command.displayName}`,
    "",
    "Common parameters:",
    ...(command.parameters?.slice(0, 4).map((p) => `  ${p.name.padEnd(8)} ${p.label ?? p.name}`) ?? ["  *NONE"]),
    "",
    "Examples:",
    ...(command.examples?.slice(0, 2).map((ex) => `  ${ex}`) ?? [`  ${command.name}`]),
  ];

  return createHelpTextScreen(
    "DSPCMDHLP",
    "Display Command Help",
    systemName,
    appendArticleHelpLines(lines, articleForCommand(command.name)),
    articleForCommand(command.name),
  );
}

export function createMessageHelpScreen(message: LabMessage, systemName: string): ScreenDefinition {
  const lines = [
    `Message ID . . . . . . . . . . . . . . . . : ${message.messageId}`,
    `Severity . . . . . . . . . . . . . . . . . : ${message.severity}`,
    "",
    "Message:",
    `  ${message.shortText}`,
    "",
    "Cause:",
    `  ${message.secondLevelText ?? "No additional cause information."}`,
    "",
    "Recovery:",
    "  Review command help or use a related implemented command. Display and query",
    "  commands are often implemented before configuration commands in this lab.",
  ];
  return createHelpTextScreen("DSPMSGHLP", "Display Message Help", systemName, lines);
}

const TOPIC_HELP: Record<string, string[]> = {
  SPECIAL_AUTHORITY: [
    "Special authorities on IBM i are profile-level capabilities such as *ALLOBJ,",
    "*SECADM, *AUDIT, and *SAVSYS. They are not the same as menu options or groups.",
    "Evidence: DSPUSRPRF, DSPAUT, DSPJRN.",
  ],
  OBJECT_AUTHORITY: [
    "Object authority controls access to programs, files, and other objects.",
    "Review *PUBLIC authority and private authorities with DSPOBJAUT.",
  ],
  SYSTEM_VALUES: [
    "System values such as QSECURITY are configuration evidence, not conclusions.",
    "Pair DSPSYSVAL output with profile, object, and audit evidence.",
  ],
};

export function createTopicHelpScreen(topic: string, systemName: string): ScreenDefinition {
  const key = topic.toUpperCase();
  const baseLines = TOPIC_HELP[key] ?? [`Help topic ${topic} is not defined.`];
  const lines = [`Topic . . . . . . . . . . . . . . . . . . . : ${key}`, "", ...baseLines];

  return createHelpTextScreen(
    "DSPHLP",
    "Display Help",
    systemName,
    appendArticleHelpLines(lines, articleForTopic(key)),
    articleForTopic(key),
  );
}

export function createScreenArticleHelpScreen(
  screenId: string,
  article: GrcArticleLink,
  systemName: string,
): ScreenDefinition {
  const lines = [
    `Screen . . . . . . . . . . . . . . . . . . : ${screenId}`,
    "",
    "Context:",
    "  Press F3 to return to the screen you were working on.",
    "  Clickable article link appears in the lab coach panel.",
    ...articleHelpLines(article),
  ];
  return createHelpTextScreen("DSPHLP", `Display Help - ${screenId}`, systemName, lines, article);
}

export function createHelpTextScreen(
  id: ScreenDefinition["id"],
  title: string,
  systemName: string,
  lines: string[],
  helpArticle?: GrcArticleLink,
): ScreenDefinition {
  const fields = [...menuHeader(id, systemName)];
  lines.slice(0, 20).forEach((line, index) => {
    fields.push(outputField(`L${index}`, 2 + index, 2, line.slice(0, 76)));
  });
  fields.push(outputField("FKEYS", 24, 2, "F3=Exit   F12=Cancel"));
  return { id, title, rows: 24, cols: 80, commandLine: false, fields, helpArticle };
}
