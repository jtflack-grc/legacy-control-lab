import type { ScreenDefinition } from "../screen.js";
import { ibmScreenHeader, outputField } from "./screenHelpers.js";

export function createDisplayMessageDescriptionScreen(
  systemName: string,
  messageId: string,
  text: string,
): ScreenDefinition {
  const fields = [
    ibmScreenHeader("DSPMSGD", "Display Message Description", systemName),
    outputField("MSGID", 4, 6, `Message ID . . . . . . . . . . : ${messageId}`),
    outputField("SEV", 5, 6, "Severity . . . . . . . . . . . : 00"),
    outputField("TEXT", 7, 6, `Message . . . . . . . . . . . : ${text.slice(0, 60)}`),
    outputField("HELP", 9, 6, "Help text . . . . . . . . . . : Synthetic lab message description."),
    outputField("FKEYS", 24, 2, "F3=Exit   F12=Cancel"),
  ];
  return {
    id: "DSPMSGD",
    title: "Display Message Description",
    rows: 24,
    cols: 80,
    fields,
    functionKeys: [
      { key: "F3", label: "Exit", action: "EXIT_MENU" },
      { key: "F12", label: "Cancel", action: "CANCEL" },
    ],
  };
}
