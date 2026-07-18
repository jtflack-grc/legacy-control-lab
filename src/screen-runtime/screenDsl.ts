import type { ScreenDefinition } from "./screen.js";
import { ibmScreenHeader, outputField } from "./screens/screenHelpers.js";

/** Register a hand-built screen definition (existing screens use this). */
export function defineScreen(definition: ScreenDefinition): ScreenDefinition {
  return definition;
}

function createGenericStubScreen(
  id: ScreenDefinition["id"],
  commandName: string,
  displayName: string,
  systemName: string,
  mode: "work" | "display",
): ScreenDefinition {
  const verb = mode === "work" ? "Work with" : "Display";
  const lines = [
    `Command . . . . . . . . . . . : ${commandName}`,
    `Description . . . . . . . . . : ${displayName}`,
    "",
    `${verb} — catalog stub screen generated from command metadata.`,
    "This command is cataloged for IBM i fidelity. Full interactive execution",
    "is not modeled; use DSPCMDHLP for syntax, parameters, and related commands.",
    "",
    "Press F3 to exit.",
  ];

  const fields = [ibmScreenHeader(commandName, displayName, systemName)];
  lines.slice(0, 16).forEach((line, index) => {
    fields.push(outputField(`L${index}`, 4 + index, 2, line.slice(0, 76)));
  });
  fields.push(outputField("FKEYS", 24, 2, "F3=Exit   F1=Help   F12=Cancel"));

  return { id, title: displayName, rows: 24, cols: 80, commandLine: true, fields };
}

/** Generic work-with screen for cataloged WRK* commands without full handlers. */
export function createGenericWorkWithScreen(
  commandName: string,
  displayName: string,
  systemName: string,
): ScreenDefinition {
  return createGenericStubScreen("GENWRK", commandName, displayName, systemName, "work");
}

/** Generic detail screen for cataloged DSP* commands without full handlers. */
export function createGenericDetailScreen(
  commandName: string,
  displayName: string,
  systemName: string,
): ScreenDefinition {
  return createGenericStubScreen("GENDSP", commandName, displayName, systemName, "display");
}
