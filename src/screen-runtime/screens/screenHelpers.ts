import type { ScreenDefinition, ScreenField } from "../screen.js";

export const FKEY_HELP = "F1=Help";

/** Prepends F1=Help when a screen footer omits it. */
export function withHelpFkeys(fkeys: string): string {
  if (/F1=/.test(fkeys)) return fkeys;
  return `${FKEY_HELP}   ${fkeys}`;
}

export function functionKeyLine(fkeys: string): string {
  return withHelpFkeys(fkeys).padEnd(80);
}

export const DEFAULT_FKEYS = withHelpFkeys("F3=Exit   F4=Prompt   F9=Retrieve   F12=Cancel");
export const SUBFILE_VISIBLE_ROWS = 7;

/** Fixed rows for 24-line IBM i subfile panels — data never grows past row 13. */
export const SUBFILE_LAYOUT = {
  headerRow: 6,
  firstDataRow: 7,
  lastDataRow: 7 + SUBFILE_VISIBLE_ROWS - 1,
  pageHintRow: 20,
  pageHintCol: 71,
} as const;

export const SUBFILE_PAGE_FKEYS = withHelpFkeys(
  "F3=Exit   F5=Refresh   F7=Page up   F8=Page down   F12=Cancel",
);

export function sliceSubfilePage<T>(items: T[], page: number, pageSize = SUBFILE_VISIBLE_ROWS): T[] {
  const start = page * pageSize;
  return items.slice(start, start + pageSize);
}

export function subfilePagedFunctionKeys(): Array<{
  key: "F1" | "F3" | "F5" | "F7" | "F8" | "F11" | "F12";
  label: string;
  action: string;
}> {
  return [
    { key: "F1", label: "Help", action: "HELP" },
    { key: "F3", label: "Exit", action: "EXIT_MENU" },
    { key: "F5", label: "Refresh", action: "REFRESH" },
    { key: "F7", label: "Page up", action: "PAGE_UP" },
    { key: "F8", label: "Page down", action: "PAGE_DOWN" },
    { key: "F12", label: "Cancel", action: "CANCEL" },
  ];
}

export function subfilePageIndicator(page: number, totalItems: number, pageSize = SUBFILE_VISIBLE_ROWS): string {
  const start = page * pageSize;
  if (start + pageSize < totalItems) return "More...";
  if (page > 0) return "Bottom";
  return "";
}

export function outputField(
  id: string,
  row: number,
  col: number,
  text: string,
  options?: { intensity?: "normal" | "high"; color?: ScreenField["color"] },
): ScreenField {
  const normalized = id === "FKEYS" ? functionKeyLine(text) : text;
  return {
    id,
    row,
    col,
    length: normalized.length,
    type: "output",
    protected: true,
    value: normalized,
    intensity: options?.intensity,
    color: options?.color,
  };
}

/** White/high-intensity protected text — screen titles, column headers, banners. */
export function ibmHiOutput(id: string, row: number, col: number, text: string): ScreenField {
  return outputField(id, row, col, text, { color: "white" });
}

/** Subfile / work-with column header row (white on IBM i). */
export function ibmColumnHeader(
  row: number,
  col: number,
  text: string,
  id = "COLHDR",
): ScreenField {
  return ibmHiOutput(id, row, col, text);
}

/** Status or CPU banner line (white). */
export function ibmBannerField(id: string, row: number, col: number, text: string): ScreenField {
  return ibmHiOutput(id, row, col, text);
}

/** Error or escape message line (red). */
export function ibmErrorField(id: string, row: number, col: number, text: string): ScreenField {
  return outputField(id, row, col, text, { color: "red", intensity: "high" });
}

/** Work-with option prompt (turquoise/blue on IBM i subfile panels). */
export function ibmOptionPrompt(
  id: string,
  row: number,
  col: number,
  text = "Type options, press Enter",
): ScreenField {
  return outputField(id, row, col, text, { color: "blue" });
}

/** Option legend line (2=Change, 8=Work with spooled files, etc.) — blue on IBM i. */
export function ibmOptionLegend(id: string, row: number, col: number, text: string): ScreenField {
  return outputField(id, row, col, text, { color: "blue" });
}

/** Subfile Opt column field ids (JOPT0, SOPT3, WOPT1, …). */
export const SUBFILE_OPTION_FIELD_PATTERN =
  /^(OPT|SOPT|OOPT|JOPT|SPLT|FOPT|LOPT|WOPT|NOPT|DOPT|MOPT|MBROPT|OBJOPT|PGOPT|PTOPT|SQLOPT|UOPT|NIFC|NCNN)\d+$/;

export function isSubfileOptionField(field: Pick<ScreenField, "id" | "option">): boolean {
  return field.option === true || SUBFILE_OPTION_FIELD_PATTERN.test(field.id);
}

/** Empty option cells show IBM-style underscores; typed digits replace leading positions. */
export function formatSubfileOptionValue(length: number, value = ""): string {
  const digits = value.replace(/_/g, "").trim();
  if (!digits) return "_".repeat(length);
  return digits.padEnd(length, "_").slice(0, length);
}

/** Parse option entered on a subfile row (strips underscore padding). */
export function parseSubfileOption(raw?: string): string {
  return raw?.replace(/_/g, "").trim() ?? "";
}

export function commandField(
  id: string,
  row: number,
  col: number,
  length: number,
  value = "",
  options?: { preserveCase?: boolean },
): ScreenField {
  const option = SUBFILE_OPTION_FIELD_PATTERN.test(id);
  return {
    id,
    row,
    col,
    length,
    type: "command",
    protected: false,
    option,
    preserveCase: options?.preserveCase ?? true,
    value: option
      ? formatSubfileOptionValue(length, value)
      : value.padEnd(length, " ").slice(0, length),
  };
}

/** Subfile option column — same as commandField but explicit for new screens. */
export function optionField(
  id: string,
  row: number,
  col: number,
  length = 2,
  value = "",
): ScreenField {
  return commandField(id, row, col, length, value);
}

import { APP_NAME } from "../../branding.js";

/** 80-column header with one-column side margins so edge glyphs are not clipped in the canvas. */
function screenHeaderLine(left: string, middle: string, right: string): string {
  return ` ${left.padEnd(29)}${middle.padEnd(40)}${right.padStart(9)} `.slice(0, 80);
}

export function menuHeader(title: string, systemName: string, subtitle = APP_NAME): ScreenField[] {
  return [ibmHiOutput("HEADER", 1, 1, screenHeaderLine(title, subtitle, systemName))];
}

/** IBM i-style header: command name, screen title, system name on one line (white). */
export function ibmScreenHeader(commandName: string, title: string, systemName: string): ScreenField {
  const inner = `${commandName.padEnd(27)} ${title.padEnd(31)} ${systemName.padStart(9)}`.slice(0, 78);
  return ibmHiOutput("HEADER", 1, 1, ` ${inner} `);
}

export function subfileScreenFooter(
  fkeys = "F3=Exit   F5=Refresh   F11=Display text   F12=Cancel",
  commandValue = "",
  includeBottomHint = true,
): ScreenField[] {
  const fields: ScreenField[] = [];
  if (includeBottomHint) {
    fields.push(outputField("BOTTOM", 20, 71, "Bottom"));
  }
  fields.push(
    outputField("PARAMS", 21, 1, "Parameters or command"),
    outputField("CMD_PREFIX", 22, 1, "===>"),
    commandField("SUBFILE_CMD", 22, 6, 74, commandValue),
    outputField("FKEYS", 24, 1, fkeys),
  );
  return fields;
}

export function standardFunctionKeys(row = 23, text = DEFAULT_FKEYS): ScreenField {
  return outputField("FKEYS", row, 1, text);
}

/** Fixed rows for 24-line menu screens — keeps ===> and PF keys separated. */
export const MENU_LAYOUT = {
  optionStartRow: 6,
  signoffRow: 18,
  selectionRow: 20,
  commandRow: 21,
  functionKeyRow: 24,
  maxSingleColumnOptions: 12,
} as const;

export function menuCommandFooter(commandValue = "", fkeys = DEFAULT_FKEYS): ScreenField[] {
  return [
    outputField("SEL_LABEL", MENU_LAYOUT.selectionRow, 1, "Selection or command"),
    outputField("CMD_PREFIX", MENU_LAYOUT.commandRow, 1, "===>"),
    commandField("COMMAND", MENU_LAYOUT.commandRow, 6, 74, commandValue),
    standardFunctionKeys(MENU_LAYOUT.functionKeyRow, fkeys),
  ];
}

/** Sign-off row — left-aligned with numbered menu options (col 6). */
export function menuSignoffField(text = "90. Sign off"): ScreenField {
  return outputField("OPT90", MENU_LAYOUT.signoffRow, 6, text);
}

const MENU_FUNCTION_KEYS = [
  { key: "F1" as const, label: "Help", action: "HELP" },
  { key: "F3" as const, label: "Exit", action: "EXIT_MENU" },
  { key: "F4" as const, label: "Prompt", action: "PROMPT" },
  { key: "F9" as const, label: "Retrieve", action: "RETRIEVE" },
  { key: "F12" as const, label: "Cancel", action: "CANCEL" },
];

export function createGoMenuScreen(
  id: ScreenDefinition["id"],
  systemName: string,
  title: string,
  options: string[],
  commandValue = "",
  message = "",
): ScreenDefinition {
  const fields: ScreenField[] = [
    ...menuHeader(title, systemName),
    outputField("BLANK1", 2, 1, " ".repeat(80)),
    outputField("PROMPT", 3, 6, "Select one of the following:"),
    outputField("BLANK2", 4, 1, " ".repeat(80)),
  ];

  if (options.length <= MENU_LAYOUT.maxSingleColumnOptions) {
    options.forEach((option, index) => {
      fields.push(outputField(`OPT${index + 1}`, MENU_LAYOUT.optionStartRow + index, 6, option));
    });
  } else {
    const leftCount = Math.ceil(options.length / 2);
    options.forEach((option, index) => {
      const column = index < leftCount ? 6 : 42;
      const row = MENU_LAYOUT.optionStartRow + (index % leftCount);
      fields.push(outputField(`OPT${index + 1}`, row, column, option));
    });
  }

  fields.push(menuSignoffField());
  if (message) {
    fields.push(
      ibmErrorField("MSG", 19, 6, message.slice(0, 74)),
    );
  }
  fields.push(...menuCommandFooter(commandValue));

  return {
    id,
    title,
    rows: 24,
    cols: 80,
    commandLine: true,
    fields,
    functionKeys: MENU_FUNCTION_KEYS,
  };
}

export function createInfoScreen(
  id: ScreenDefinition["id"],
  title: string,
  systemName: string,
  _userName: string,
  lines: string[],
  messageLine?: string,
): ScreenDefinition {
  const fields: ScreenField[] = [
    ...menuHeader(title, systemName),
    outputField("BLANK1", 2, 1, " ".repeat(80)),
  ];

  lines.forEach((line, index) => {
    fields.push(outputField(`LINE${index + 1}`, 4 + index, 6, line.padEnd(74).slice(0, 74)));
  });

  fields.push(standardFunctionKeys());

  return {
    id,
    title,
    rows: 24,
    cols: 80,
    fields,
    functionKeys: [
      { key: "F1", label: "Help", action: "HELP" },
      { key: "F3", label: "Exit", action: "EXIT_MENU" },
      { key: "F12", label: "Cancel", action: "CANCEL" },
    ],
    messageLine,
  };
}
