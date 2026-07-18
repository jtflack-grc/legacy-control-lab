import type { ScreenDefinition } from "../screen.js";
import { commandField, ibmScreenHeader, outputField, standardFunctionKeys } from "./screenHelpers.js";
import {
  FEATURED_COMMAND_ARTICLES,
  articleForMission,
} from "../../grc/iOnGrcArticles.js";
import { helpSignOnLines } from "../../lab/signOnCredentials.js";

const HELP_LINES = [
  "Governance lab quick reference:",
  "  WRKUSRPRF / DSPUSRPRF  User profile review",
  "  WRKSYSVAL / DSPSYSVAL  System values (QSECURITY, QAUDCTL)",
  "  WRKOBJ / DSPOBJAUT     Object authority review",
  "  DSPJRN                 Audit journal",
  "  DSPEVID / SUBMITMSN    Mission evidence and scoring",
  "  WRKFINDING             Record audit findings",
];

function missionArticleLines(missionId: string | undefined): string[] {
  const article = missionId ? articleForMission(missionId) : undefined;
  if (!article) return [];
  return [
    "",
    `Mission ${missionId} article:`,
    `  ${article.title.slice(0, 68)}`,
    `  ${article.hook.slice(0, 68)}`,
  ];
}

function featuredArticleLines(userName: string): string[] {
  if (userName.trim().toUpperCase() !== "IONGRC") {
    return ["", "For i on GRC article context, sign on IONGRC / IONGRC."];
  }
  const lines = ["", "i on GRC paths (DSPCMDHLP / F1 on screen):"];
  for (const entry of FEATURED_COMMAND_ARTICLES.slice(0, 3)) {
    lines.push(`  ${entry.command} — ${entry.article.title.slice(0, 48)}`);
  }
  return lines;
}

export type HelpScreenOptions = {
  missionId?: string;
};

export function createHelpScreen(
  systemName: string,
  userName: string,
  options?: HelpScreenOptions,
): ScreenDefinition {
  const fields = [
    ibmScreenHeader("HELP", "Command Help", systemName),
    outputField("USER", 2, 6, `User . . . . . . . . . . . . . : ${userName}`),
  ];

  const contentLines = [
    ...HELP_LINES,
    ...helpSignOnLines(systemName),
    ...missionArticleLines(options?.missionId),
    ...featuredArticleLines(userName),
  ];

  contentLines.slice(0, 15).forEach((line, index) => {
    fields.push(outputField(`HELP${index}`, 4 + index, 6, line.padEnd(74).slice(0, 74)));
  });

  fields.push(
    outputField("CMD_LABEL", 20, 6, "Command"),
    outputField("CMD_PREFIX", 20, 14, "===>"),
    commandField("COMMAND", 20, 19, 60),
    standardFunctionKeys(),
  );

  return {
    id: "HELP",
    title: "Command Help",
    rows: 24,
    cols: 80,
    commandLine: true,
    fields,
    helpArticle:
      userName.trim().toUpperCase() === "IONGRC" && options?.missionId
        ? articleForMission(options.missionId)
        : undefined,
    functionKeys: [
      { key: "F1", label: "Help", action: "HELP" },
      { key: "F3", label: "Exit", action: "EXIT_MENU" },
      { key: "F12", label: "Cancel", action: "CANCEL" },
    ],
  };
}
