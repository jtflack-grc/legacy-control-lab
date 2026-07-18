import type { ScreenDefinition } from "../screen.js";
import type { SubsystemEntry } from "../../ibmi-runtime/subsystemService.js";
import { ibmScreenHeader, outputField, subfileScreenFooter } from "./screenHelpers.js";

export function createWorkSubsystemsScreen(systemName: string, subsystems: SubsystemEntry[]): ScreenDefinition {
  const fields = [
    ibmScreenHeader("WRKSBS", "Work with Subsystems", systemName),
    outputField("HDR", 4, 6, "Subsystem   Status      Description"),
  ];
  subsystems.forEach((entry, index) => {
    fields.push(
      outputField(
        `SBS${index}`,
        5 + index,
        6,
        `${entry.name.padEnd(12)} ${entry.status.padEnd(12)} ${entry.description.slice(0, 40)}`,
      ),
    );
  });
  fields.push(...subfileScreenFooter("F3=Exit   F12=Cancel"));
  return {
    id: "WRKSBS",
    title: "Work with Subsystems",
    rows: 24,
    cols: 80,
    commandLine: true,
    fields,
    functionKeys: [
      { key: "F3", label: "Exit", action: "EXIT_MENU" },
      { key: "F12", label: "Cancel", action: "CANCEL" },
    ],
  };
}
