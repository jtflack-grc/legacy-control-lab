import type { ScreenDefinition, ScreenField } from "../screen.js";
import {
  ibmErrorField,
  ibmScreenHeader,
  outputField,
  standardFunctionKeys,
} from "./screenHelpers.js";
import { IBM_DETAIL_LABEL_COL, IBM_DETAIL_VALUE_COL } from "./ibmDetailLayout.js";

const PWD_LEN = 10;
const PWD_COL = IBM_DETAIL_VALUE_COL;

function passwordField(id: string, row: number): ScreenField {
  return {
    id,
    row,
    col: PWD_COL,
    length: PWD_LEN,
    type: "password",
    protected: false,
    nonDisplay: true,
    value: " ".repeat(PWD_LEN),
  };
}

export function createChangePasswordScreen(
  systemName: string,
  userName: string,
  errorMessage = "",
): ScreenDefinition {
  const fields: ScreenField[] = [
    ibmScreenHeader("CHGPWD", "Change Password", systemName),
    outputField("BLANK1", 2, 1, " ".repeat(80)),
    outputField("USR_LABEL", 4, IBM_DETAIL_LABEL_COL, "User profile . . . . . . . . . . :"),
    outputField("USER", 4, PWD_COL, userName.padEnd(PWD_LEN).slice(0, PWD_LEN)),
    outputField("BLANK2", 5, 1, " ".repeat(80)),
    outputField("CUR_LABEL", 6, IBM_DETAIL_LABEL_COL, "Current password . . . . . . . . :"),
    passwordField("CURPWD", 6),
    outputField("NEW_LABEL", 8, IBM_DETAIL_LABEL_COL, "New password . . . . . . . . . . :"),
    passwordField("NEWPWD", 8),
    outputField("VER_LABEL", 10, IBM_DETAIL_LABEL_COL, "Verify new password . . . . . . :"),
    passwordField("VERPWD", 10),
    outputField(
      "HINT",
      13,
      6,
      "Press Enter to change password. F3 or F12 cancels without changing.",
    ),
    standardFunctionKeys(23, "F3=Exit   F12=Cancel"),
  ];

  if (errorMessage) {
    fields.push(ibmErrorField("ERROR", 23, 6, errorMessage.slice(0, 74)));
  }

  return {
    id: "CHGPWD",
    title: "Change Password",
    rows: 24,
    cols: 80,
    fields,
    functionKeys: [
      { key: "F1", label: "Help", action: "HELP" },
      { key: "F3", label: "Exit", action: "EXIT_MENU" },
      { key: "F12", label: "Cancel", action: "CANCEL" },
    ],
  };
}
