import type { ScreenDefinition, ScreenField } from "../screen.js";
import { ibmErrorField, ibmHiOutput, outputField } from "./screenHelpers.js";
import {
  signonCopyrightCol,
  signonCopyrightLine,
  SIGNON_CURLIB_LABEL,
  SIGNON_DISPLAY_LABEL,
  SIGNON_INPUT_COL,
  SIGNON_INPUT_LABEL_COL,
  SIGNON_INPUT_LEN,
  SIGNON_MENU_LABEL,
  SIGNON_PASSWORD_LABEL,
  SIGNON_PROGRAM_LABEL,
  SIGNON_ROWS,
  SIGNON_SUBSYSTEM_LABEL,
  SIGNON_SYS_BLOCK_COL,
  SIGNON_SYSTEM_LABEL,
  SIGNON_TITLE_COL,
  SIGNON_USER_LABEL,
  signonSystemInfoLine,
  signonTitleLine,
} from "./signonLayout.js";

function signonInputField(id: string, row: number): ScreenField {
  return {
    id,
    row,
    col: SIGNON_INPUT_COL,
    length: SIGNON_INPUT_LEN,
    type: "input",
    protected: false,
    value: " ".repeat(SIGNON_INPUT_LEN),
  };
}

export function createSignonScreen(
  systemName: string,
  displayName = "QPADEV0001",
  _deviceType = "IBM-3477-FC",
): ScreenDefinition {
  const rows = SIGNON_ROWS;

  return {
    id: "SIGNON",
    rows: 24,
    cols: 80,
    fields: [
      ibmHiOutput("TITLE", rows.title, SIGNON_TITLE_COL, signonTitleLine()),
      outputField(
        "SYS_LINE",
        rows.system,
        SIGNON_SYS_BLOCK_COL,
        signonSystemInfoLine(SIGNON_SYSTEM_LABEL, systemName),
      ),
      outputField(
        "SUB_LINE",
        rows.subsystem,
        SIGNON_SYS_BLOCK_COL,
        signonSystemInfoLine(SIGNON_SUBSYSTEM_LABEL, "QINTER"),
      ),
      outputField(
        "DSP_LINE",
        rows.display,
        SIGNON_SYS_BLOCK_COL,
        signonSystemInfoLine(SIGNON_DISPLAY_LABEL, displayName),
      ),
      outputField("USR_LABEL", rows.user, SIGNON_INPUT_LABEL_COL, SIGNON_USER_LABEL),
      signonInputField("USER", rows.user),
      outputField("PWD_LABEL", rows.password, SIGNON_INPUT_LABEL_COL, SIGNON_PASSWORD_LABEL),
      {
        id: "PASSWORD",
        row: rows.password,
        col: SIGNON_INPUT_COL,
        length: SIGNON_INPUT_LEN,
        type: "password",
        protected: false,
        nonDisplay: true,
        value: " ".repeat(SIGNON_INPUT_LEN),
      },
      outputField("PRG_LABEL", rows.program, SIGNON_INPUT_LABEL_COL, SIGNON_PROGRAM_LABEL),
      signonInputField("PROGRAM", rows.program),
      outputField("MENU_LABEL", rows.menu, SIGNON_INPUT_LABEL_COL, SIGNON_MENU_LABEL),
      signonInputField("MENU", rows.menu),
      outputField("CURLIB_LABEL", rows.curlib, SIGNON_INPUT_LABEL_COL, SIGNON_CURLIB_LABEL),
      signonInputField("CURLIB", rows.curlib),
      ibmHiOutput("COPYRIGHT", rows.copyright, signonCopyrightCol(), signonCopyrightLine()),
    ],
  };
}

export function createSignonScreenWithError(
  systemName: string,
  message: string,
  displayName = "QPADEV0001",
): ScreenDefinition {
  const screen = createSignonScreen(systemName, displayName);
  return {
    ...screen,
    messageLine: message.slice(0, 80),
    fields: [
      ...screen.fields,
      ibmErrorField("ERROR", SIGNON_ROWS.error, SIGNON_INPUT_LABEL_COL, message.slice(0, 44)),
    ],
  };
}
