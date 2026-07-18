import type { ScreenDefinition } from "../screen.js";
import { commandField, menuHeader, outputField } from "./screenHelpers.js";

export function createCommandHistoryScreen(
  systemName: string,
  entries: string[],
): ScreenDefinition {
  const fields = [
    ...menuHeader("DSPCMDHST", systemName),
    outputField("HINT", 2, 2, "Recent commands for this session (newest first)."),
    outputField("COL", 4, 2, "Seq  Command history"),
  ];

  entries.slice(0, 12).forEach((entry, index) => {
    fields.push(outputField(`H${index}`, 5 + index, 2, `${String(index + 1).padStart(3)}  ${entry.slice(0, 72)}`));
  });

  if (entries.length === 0) {
    fields.push(outputField("EMPTY", 6, 6, "No commands recorded in this session."));
  }

  fields.push(outputField("BOTTOM", 20, 2, "Bottom"));
  fields.push(outputField("SEL", 22, 1, "Selection or command"));
  fields.push(outputField("CMD", 23, 1, "===>"));
  fields.push(commandField("COMMAND", 23, 6, 74));
  fields.push(outputField("FKEYS", 24, 2, "F3=Exit  F12=Cancel"));

  return { id: "DSPCMDHST", title: "Display Command History", rows: 24, cols: 80, commandLine: true, fields };
}
