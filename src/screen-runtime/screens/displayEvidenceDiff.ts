import type { ScreenDefinition } from "../screen.js";
import type { RuntimeEntityType, StateChange } from "../../runtime/types.js";
import { formatEvidenceDiffLine } from "../../runtime/stateChangeFormat.js";
import { ibmColumnHeader, ibmHiOutput, outputField } from "./screenHelpers.js";

function mapEntityTypeFilter(type: string): RuntimeEntityType | undefined {
  const normalized = type.toUpperCase();
  if (normalized === "*ALL") return undefined;
  const map: Record<string, RuntimeEntityType> = {
    "*USRPRF": "user_profile",
    "*SYSVAL": "system_value",
    "*OBJAUT": "object_authority",
    "*IFSAUT": "ifs_authority",
    "*SPLF": "spooled_file",
    "*LIBL": "library_list",
  };
  return map[normalized];
}

export function createDisplayEvidenceDiffScreen(
  systemName: string,
  userName: string,
  missionId: string,
  filterType: string,
  changes: StateChange[],
): ScreenDefinition {
  const fields = [
    ibmHiOutput("HDR1", 1, 2, "DSPEVDDIFF".padEnd(10) + "Display Evidence Changes".padEnd(42) + systemName),
    outputField("TYPE", 3, 2, `Type . . . . . . . . . . . . . . . . . . . : ${filterType}`),
    outputField("MISSION", 4, 2, `Mission . . . . . . . . . . . . . . . . . : ${missionId}`),
    outputField("USER", 5, 2, `Session user . . . . . . . . . . . . . . . : ${userName}`),
    ibmColumnHeader(7, 2, "Date/Time           Type    Entity       Change summary"),
  ];

  if (changes.length === 0) {
    fields.push(outputField("EMPTY", 9, 6, "No evidence changes recorded for this attempt."));
  } else {
    changes.slice(0, 11).forEach((change, index) => {
      fields.push(
        outputField(
          `ROW${index}`,
          8 + index,
          2,
          formatEvidenceDiffLine(
            change.timestamp,
            change.entityType,
            change.entityId,
            change.before,
            change.after,
            change.actor,
          ),
        ),
      );
    });
  }

  fields.push(outputField("BOTTOM", 20, 2, "Bottom"));
  fields.push(outputField("FKEYS", 23, 2, "F3=Exit   F5=Refresh   F12=Cancel"));

  return {
    id: "DSPEVDDIFF",
    title: "Display Evidence Changes",
    rows: 24,
    cols: 80,
    commandLine: true,
    fields,
  };
}

export { mapEntityTypeFilter };
