import type { ScreenDefinition } from "../screen.js";
import { ibmScreenHeader, outputField } from "./screenHelpers.js";

export function createDisplayServiceToolsConceptScreen(systemName: string): ScreenDefinition {
  const fields = [
    ibmScreenHeader("DSPSTCONC", "Display Service Tools Concept", systemName),
    outputField("BLANK1", 2, 1, " ".repeat(80)),
    outputField("H1", 4, 6, "QSECOFR user profile"),
    outputField("L1", 5, 6, "  Interactive security officer profile used for day-to-day"),
    outputField("L2", 6, 6, "  administration from a 5250 session."),
    outputField("BLANK2", 7, 1, " ".repeat(80)),
    outputField("H2", 9, 6, "QSECOFR service tools user ID"),
    outputField("L3", 10, 6, "  Separate SST identity for licensed internal service tools."),
    outputField("L4", 11, 6, "  Not the same as the QSECOFR user profile."),
    outputField("BLANK3", 12, 1, " ".repeat(80)),
    outputField("NOTE1", 14, 6, "This lab does not implement service tools or SST access."),
    outputField("NOTE2", 15, 6, "Synthetic training environment only."),
    outputField("FKEYS", 23, 1, "F3=Exit   F12=Cancel".padEnd(80)),
  ];

  return {
    id: "DSPSTCONC",
    title: "Display Service Tools Concept",
    rows: 24,
    cols: 80,
    fields,
    functionKeys: [
      { key: "F3", label: "Exit", action: "EXIT_MENU" },
      { key: "F12", label: "Cancel", action: "CANCEL" },
    ],
  };
}
