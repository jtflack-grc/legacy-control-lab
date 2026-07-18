/**
 * Classic IBM i QDSIGNON layout — matches stock sign-on panel (5250 reference).
 */

export const SIGNON_COLS = 80;
export const SIGNON_INPUT_LEN = 10;

/** Title row — centered "Sign On" (row 1). High intensity (white). */
export const SIGNON_TITLE_COL = 23;
export const SIGNON_TITLE_TEXT = "             Sign On             ";

/** System block — labels left-aligned; shared colon column; values at col 71–80. */
export const SIGNON_SYS_LABEL_COL = 42;
export const SIGNON_SYS_COLON_COL = 68;
export const SIGNON_SYS_VALUE_COL = 71;
export const SIGNON_SYS_VALUE_LEN = 10;
export const SIGNON_SYS_BLOCK_COL = SIGNON_SYS_LABEL_COL;
export const SIGNON_SYS_BLOCK_WIDTH = SIGNON_COLS - SIGNON_SYS_LABEL_COL + 1;

/** User / password / program / menu / curlib labels (col 17); inputs at 53. */
export const SIGNON_INPUT_LABEL_COL = 17;
export const SIGNON_INPUT_COL = 53;

/** Build dotted label ending at SIGNON_SYS_COLON_COL (colons align on all three rows). */
export function signonSystemDottedLabel(prefix: string): string {
  const width = SIGNON_SYS_COLON_COL - SIGNON_SYS_LABEL_COL + 1;
  const cells = Array.from({ length: width }, () => " ");
  for (let i = 0; i < prefix.length; i++) {
    cells[i] = prefix[i]!;
  }
  cells[width - 1] = ":";
  let pos = prefix.length;
  while (pos < width - 1) {
    cells[pos++] = ".";
    if (pos < width - 1) cells[pos++] = " ";
  }
  return cells.join("");
}

export const SIGNON_SYSTEM_LABEL = signonSystemDottedLabel("System  ");
export const SIGNON_SUBSYSTEM_LABEL = signonSystemDottedLabel("Subsystem ");
export const SIGNON_DISPLAY_LABEL = signonSystemDottedLabel("Display ");
export const SIGNON_USER_LABEL = "User  . . . . . . . . . . . . . .";
export const SIGNON_PASSWORD_LABEL = "Password  . . . . . . . . . . . .";
export const SIGNON_PROGRAM_LABEL = "Program/procedure . . . . . . . .";
export const SIGNON_MENU_LABEL = "Menu  . . . . . . . . . . . . . .";
export const SIGNON_CURLIB_LABEL = "Current library . . . . . . . . .";

export function signonTitleLine(): string {
  return SIGNON_TITLE_TEXT;
}

/** System info line — label at col 42, value at col 71 (labels share left edge). */
export function signonSystemInfoLine(label: string, value: string): string {
  const cells = Array.from({ length: SIGNON_SYS_BLOCK_WIDTH }, () => " ");
  for (let i = 0; i < label.length && i < SIGNON_SYS_BLOCK_WIDTH; i++) {
    cells[i] = label[i]!;
  }
  const val = value.slice(0, SIGNON_SYS_VALUE_LEN).padEnd(SIGNON_SYS_VALUE_LEN);
  const valueOffset = SIGNON_SYS_VALUE_COL - SIGNON_SYS_LABEL_COL;
  for (let i = 0; i < SIGNON_SYS_VALUE_LEN; i++) {
    cells[valueOffset + i] = val[i]!;
  }
  return cells.join("");
}

/** Lab sign-on footer — Legacy Control Lab / i on GRC (not IBM). */
export function signonCopyrightLine(): string {
  return "(C) COPYRIGHT LCL IONGRC. 1974, 2026.";
}

export function signonCopyrightCol(): number {
  return SIGNON_COLS - signonCopyrightLine().length + 1;
}

export function signonUserInputCol(): number {
  return SIGNON_INPUT_COL;
}

export function signonPasswordInputCol(): number {
  return SIGNON_INPUT_COL;
}

/** Screen row map — QDSIGNON2 on 24×80. */
export const SIGNON_ROWS = {
  title: 1,
  system: 2,
  subsystem: 3,
  display: 4,
  user: 6,
  password: 7,
  program: 10,
  menu: 11,
  curlib: 12,
  copyright: 24,
  error: 14,
} as const;
