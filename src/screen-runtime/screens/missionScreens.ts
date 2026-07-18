import type { ScreenDefinition } from "../screen.js";
import type { MissionProgress } from "../../missions/missionEngine.js";
import { menuHeader, outputField, standardFunctionKeys } from "./screenHelpers.js";

export function createDisplayEvidenceScreen(
  systemName: string,
  _userName: string,
  progress: MissionProgress,
): ScreenDefinition {
  const collectedKeys = new Set(progress.collected.map((item) => item.requirementKey));
  const fields = [
    ...menuHeader("Display Evidence Coverage", systemName),
    outputField("BLANK1", 2, 1, " ".repeat(80)),
    outputField(
      "SUMMARY",
      4,
      6,
      `Mission ${progress.missionId}: ${progress.evidenceCoverage.requiredCollected}/${progress.evidenceCoverage.requiredTotal} required evidence collected.`,
    ),
  ];

  progress.requirements.forEach((req, index) => {
    const mark = collectedKeys.has(req.requirementKey) ? "[X]" : "[ ]";
    const optional = req.optional ? " (optional)" : "";
    fields.push(outputField(`REQ${index}`, 6 + index, 6, `${mark} ${req.description}${optional}`.slice(0, 74)));
  });

  fields.push(
    outputField("HINT", 20, 6, "Write findings (option 8), then SUBMITMSN when ready."),
    standardFunctionKeys(),
  );

  return {
    id: "DSPEVID",
    title: "Display Evidence Coverage",
    rows: 24,
    cols: 80,
    fields,
    functionKeys: [
      { key: "F3", label: "Exit", action: "EXIT_MENU" },
      { key: "F12", label: "Cancel", action: "CANCEL" },
    ],
  };
}

export function createMissionScoreScreen(systemName: string, scoreLines: string[]): ScreenDefinition {
  const fields = [
    ...menuHeader("Mission Score", systemName),
    outputField("BLANK1", 2, 1, " ".repeat(80)),
  ];

  scoreLines.forEach((line, index) => {
    fields.push(outputField(`LINE${index}`, 4 + index, 6, line.slice(0, 74)));
  });

  fields.push(standardFunctionKeys());

  return {
    id: "SUBMITMSN",
    title: "Mission Score",
    rows: 24,
    cols: 80,
    fields,
    functionKeys: [
      { key: "F3", label: "Exit", action: "EXIT_MENU" },
      { key: "F12", label: "Cancel", action: "CANCEL" },
    ],
  };
}
