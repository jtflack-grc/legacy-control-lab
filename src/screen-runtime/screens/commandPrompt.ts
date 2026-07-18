import type { ScreenDefinition } from "../screen.js";
import { commandField, outputField } from "./screenHelpers.js";
import type { CatalogCommandDefinition } from "../../catalog/commandTypes.js";

export function createCommandListScreen(
  systemName: string,
  commands: CatalogCommandDefinition[],
  filter = "",
): ScreenDefinition {
  const fields = [
    outputField("HEADER", 1, 1, ` CMDLIST`.padEnd(40) + systemName.padStart(40)),
    outputField("TITLE", 2, 2, "Prompt for Command"),
    outputField("HINT", 3, 2, "Type command name or option number, press Enter."),
    outputField("COL", 5, 2, "Opt  Command      Description"),
  ];

  const normalized = filter.trim().toUpperCase();
  const filtered = commands
    .filter((cmd) => !normalized || cmd.name.includes(normalized) || cmd.displayName.toUpperCase().includes(normalized))
    .slice(0, 12);

  filtered.forEach((cmd, index) => {
    fields.push(
      outputField(
        `C${index}`,
        6 + index,
        2,
        `     ${cmd.name.padEnd(12)} ${cmd.displayName.slice(0, 50)}`,
      ),
    );
  });

  fields.push(outputField("BOTTOM", 20, 2, "Bottom"));
  fields.push(outputField("SEL", 22, 1, "Selection or command"));
  fields.push(outputField("CMD", 23, 1, "===>"));
  fields.push(commandField("COMMAND", 23, 6, 74, filter));
  fields.push(outputField("FKEYS", 24, 2, "F3=Exit  F4=Prompt  F12=Cancel"));

  return { id: "CMDLIST", title: "Prompt for Command", rows: 24, cols: 80, commandLine: true, fields };
}

export function createCommandPromptScreen(
  systemName: string,
  command: CatalogCommandDefinition,
  values: Record<string, string>,
): ScreenDefinition {
  const title = `${command.displayName} (${command.name})`;
  const fields = [
    outputField("HEADER", 1, 6, title.padEnd(74).slice(0, 74), { color: "white" }),
    outputField("HINT", 3, 6, "Type choices, press Enter."),
    outputField("BLANK", 4, 1, " ".repeat(80)),
  ];

  const params = command.parameters ?? [];
  params.slice(0, 10).forEach((param, index) => {
    const row = 5 + index;
    const label = (param.label ?? param.name).padEnd(38, ".");
    const current = values[param.name.toUpperCase()] ?? param.default ?? param.defaultValue ?? "";
    fields.push(outputField(`LBL${index}`, row, 6, `${label} . . . . .`));
    fields.push(commandField(`P${index}`, row, 47, 33, current));
  });

  if (params.length === 0 && command.name === "CRTLIB") {
    fields.push(outputField("LBL0", 5, 6, "Library . . . . . . . . . . . . . . . . . . . . >"));
    fields.push(commandField("P0", 5, 47, 33, values.LIB ?? values.L ?? ""));
    fields.push(outputField("CHOICE1", 7, 6, "  *CURLIB      Current library"));
    fields.push(outputField("CHOICE2", 8, 6, "  *LIBL        Library list"));
  } else if (params.length === 0) {
    fields.push(outputField("NOPARAM", 6, 6, "This command has no promptable parameters."));
  }

  fields.push(outputField("BOTTOM", 20, 6, "Bottom"));
  fields.push(
    outputField(
      "FKEYS",
      24,
      1,
      "F3=Exit   F4=Prompt   F5=Refresh   F9=All parameters   F12=Cancel   F24=More keys".padEnd(80),
    ),
  );

  return {
    id: "CMDPROMPT",
    title: command.displayName,
    rows: 24,
    cols: 80,
    commandLine: false,
    fields,
    functionKeys: [
      { key: "F3", label: "Exit", action: "EXIT_MENU" },
      { key: "F4", label: "Prompt", action: "PROMPT" },
      { key: "F5", label: "Refresh", action: "REFRESH" },
      { key: "F9", label: "All parameters", action: "CMDPROMPT_ALL" },
      { key: "F12", label: "Cancel", action: "CANCEL" },
      { key: "F24", label: "More keys", action: "MORE_KEYS" },
    ],
  };
}

export function buildCommandFromPrompt(
  command: CatalogCommandDefinition,
  values: Record<string, string>,
): string {
  const parts = [command.name];
  for (const param of command.parameters ?? []) {
    const value = values[param.name.toUpperCase()]?.trim();
    if (!value) continue;
    parts.push(`${param.name.toUpperCase()}(${value})`);
  }
  return parts.join(" ");
}
