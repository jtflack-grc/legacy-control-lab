import type { ScreenDefinition } from "../screen.js";
import { menuCommandFooter, menuHeader, MENU_LAYOUT, outputField } from "./screenHelpers.js";
import type { CatalogCommandDefinition } from "../../catalog/commandTypes.js";

export const CMD_GROUP_PAGE_SIZE = 10;

const GROUP_TITLES: Record<string, string> = {
  CMDSEC: "Security Commands",
  CMDUSR: "User Profile Commands",
  CMDAUT: "Authority Commands",
  CMDSYS: "System Value Commands",
  CMDJRN: "Journal / Audit Commands",
  CMDOBJ: "Object / Library Commands",
  CMDFILE: "Database File Commands",
  CMDJOB: "Job / Subsystem Commands",
  CMDSPL: "Spool / Print Commands",
  CMDMSG: "Message Commands",
  CMDIFS: "IFS Commands",
  CMDPTF: "PTF / License Commands",
  CMDSRC: "Source / PDM Commands",
  CMDSQL: "SQL Service Commands",
  CMDTCP: "TCP/IP Commands",
  CMDLAB: "Lab Platform Commands",
};

export function commandGroupPageCount(commands: CatalogCommandDefinition[]): number {
  return Math.max(1, Math.ceil(commands.length / CMD_GROUP_PAGE_SIZE));
}

export function commandGroupPageSlice(
  commands: CatalogCommandDefinition[],
  page: number,
): CatalogCommandDefinition[] {
  const start = page * CMD_GROUP_PAGE_SIZE;
  return commands.slice(start, start + CMD_GROUP_PAGE_SIZE);
}

export function createCommandGroupMenuScreen(
  groupMenu: string,
  systemName: string,
  commands: CatalogCommandDefinition[],
  commandValue = "",
  page = 0,
): ScreenDefinition {
  const id = groupMenu.toUpperCase() as ScreenDefinition["id"];
  const title = GROUP_TITLES[groupMenu.toUpperCase()] ?? groupMenu;
  const totalPages = commandGroupPageCount(commands);
  const safePage = Math.min(Math.max(0, page), totalPages - 1);
  const pageCommands = commandGroupPageSlice(commands, safePage);

  const fields = [
    ...menuHeader(title, systemName),
    outputField("PROMPT", 3, 6, "Select one of the following:"),
  ];

  if (totalPages > 1) {
    fields.push(
      outputField(
        "PAGE",
        4,
        6,
        `Page ${safePage + 1} of ${totalPages}`.padEnd(74),
      ),
    );
  }

  pageCommands.forEach((cmd, index) => {
    const label = `${(index + 1).toString().padStart(2)}. ${cmd.displayName}`.padEnd(50);
    const row = (totalPages > 1 ? MENU_LAYOUT.optionStartRow - 1 : MENU_LAYOUT.optionStartRow) + index;
    fields.push(outputField(`O${index}`, row, 6, `${label} ${cmd.name}`));
  });

  fields.push(outputField("O90", MENU_LAYOUT.signoffRow, 6, "90. Sign off"));
  const fkeys =
    totalPages > 1
      ? "F3=Exit  F4=Prompt  F7=Previous  F8=Next  F12=Cancel"
      : "F3=Exit  F4=Prompt  F12=Cancel";
  fields.push(...menuCommandFooter(commandValue, fkeys));

  return {
    id,
    title,
    rows: 24,
    cols: 80,
    commandLine: true,
    fields,
    functionKeys: [
      { key: "F3", label: "Exit", action: "EXIT_MENU" },
      { key: "F4", label: "Prompt", action: "PROMPT" },
      ...(totalPages > 1
        ? [
            { key: "F7" as const, label: "Previous", action: "PAGE_UP" },
            { key: "F8" as const, label: "Next", action: "PAGE_DOWN" },
          ]
        : []),
      { key: "F12", label: "Cancel", action: "CANCEL" },
    ],
  };
}

export function commandGroupSelectionMap(
  groupMenu: string,
  commands: CatalogCommandDefinition[],
  page = 0,
): Record<string, string> {
  const map: Record<string, string> = {};
  const totalPages = commandGroupPageCount(commands);
  const safePage = Math.min(Math.max(0, page), totalPages - 1);
  commandGroupPageSlice(commands, safePage).forEach((cmd, index) => {
    map[String(index + 1)] = cmd.name;
  });
  return map;
}

export function isCommandGroupMenu(screenId: string): boolean {
  return screenId in GROUP_TITLES || screenId === "CMDLAB";
}
