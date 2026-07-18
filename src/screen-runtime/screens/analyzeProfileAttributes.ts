import type { ScreenDefinition } from "../screen.js";
import type { SecurityFinding } from "../../ibmi-runtime/securityAnalysisService.js";
import { listUserProfiles, getUserProfile } from "../../ibmi-runtime/userProfileService.js";
import {
  ibmColumnHeader,
  ibmScreenHeader,
  outputField,
  standardFunctionKeys,
} from "./screenHelpers.js";
import { ibmDetailFields } from "./ibmDetailLayout.js";

export function createAnalyzeProfileAttributesScreen(
  systemName: string,
  title: string,
  headerLines: string[],
  findings: SecurityFinding[],
): ScreenDefinition {
  const fields = [
    ibmScreenHeader("ANZPRFACT", title, systemName),
    outputField("BLANK1", 2, 1, " ".repeat(80)),
    outputField("HINT", 3, 6, "Review inactive profiles before automated disable or vendor offboarding."),
  ];

  headerLines.forEach((line, index) => {
    fields.push(outputField(`HDR${index}`, 4 + index, 6, line.padEnd(74).slice(0, 74)));
  });

  const dataStart = 4 + headerLines.length + 1;
  fields.push(
    ibmColumnHeader(
      dataStart,
      6,
      "Profile      Last sign-on  Days idle  Finding",
      "COLHDR",
    ),
  );

  if (findings.length === 0) {
    fields.push(outputField("EMPTY", dataStart + 1, 6, "No inactive profile candidates in synthetic scenario."));
  } else {
    findings.slice(0, 10).forEach((finding, index) => {
      const row = dataStart + 1 + index;
      const profile = listUserProfiles(systemName).find((entry) => entry.userName === finding.userName);
      const last = profile?.lastSignon ?? "*NONE";
      const idleMatch = finding.finding.match(/Inactive (\d+) days/);
      const idle = idleMatch?.[1]?.padStart(9) ?? "        ";
      const line = `${finding.userName.padEnd(12)} ${last.padEnd(13)} ${idle} ${finding.finding.slice(0, 34)}`;
      fields.push(outputField(`ROW${index}`, row, 6, line.padEnd(74).slice(0, 74)));
    });
  }

  fields.push(outputField("BOTTOM", 20, 6, "Bottom"));
  fields.push(standardFunctionKeys(24, "F3=Exit   F5=Refresh   F12=Cancel"));

  return {
    id: "ANZPRFACT",
    title,
    rows: 24,
    cols: 80,
    fields,
    functionKeys: [
      { key: "F3", label: "Exit", action: "EXIT_MENU" },
      { key: "F5", label: "Refresh", action: "REFRESH" },
      { key: "F12", label: "Cancel", action: "CANCEL" },
    ],
  };
}

export function createActivityProfileListScreen(
  systemName: string,
  changedProfile: string,
): ScreenDefinition {
  const profiles = listUserProfiles(systemName).filter((profile) => profile.activityProfileExempt);

  const fields = [
    ibmScreenHeader("CHGACTPRFL", "Change Activity Profile List", systemName),
    outputField("BLANK1", 2, 1, " ".repeat(80)),
    outputField("HINT", 3, 6, "Profiles on the activity list are exempt from inactive-profile disable."),
    ibmColumnHeader(5, 6, "Profile      Activity list status", "COLHDR"),
  ];

  if (profiles.length === 0) {
    fields.push(outputField("EMPTY", 6, 6, "No profiles on activity list."));
  } else {
    profiles.forEach((profile, index) => {
      fields.push(
        outputField(
          `ROW${index}`,
          6 + index,
          6,
          `${profile.userName.padEnd(12)} *ACTIVE`,
        ),
      );
    });
  }

  const changed = getUserProfile(changedProfile, systemName);
  fields.push(...ibmDetailFields(12, "NOTE", "Changed profile", changed?.userName ?? changedProfile));
  fields.push(outputField("FKEYS", 23, 1, "F3=Exit   F12=Cancel".padEnd(80)));

  return {
    id: "CHGACTPRFL",
    title: "Change Activity Profile List",
    rows: 24,
    cols: 80,
    fields,
    functionKeys: [
      { key: "F3", label: "Exit", action: "EXIT_MENU" },
      { key: "F12", label: "Cancel", action: "CANCEL" },
    ],
  };
}
