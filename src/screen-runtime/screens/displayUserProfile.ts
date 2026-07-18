import type { ScreenDefinition } from "../screen.js";
import { getUserProfile } from "../../ibmi-runtime/userProfileService.js";
import { ibmScreenHeader, outputField } from "./screenHelpers.js";
import { ibmDetailFields } from "./ibmDetailLayout.js";

function profileOwner(userName: string): string {
  if (userName === "OLDVENDOR" || userName === "QPGMR" || userName === "PAYADMIN") return "*NONE";
  if (userName === "BACKUPADM") return "ITOPS";
  return "QSECOFR";
}

function passwordExpired(status: string): string {
  return status === "*DISABLED" ? "*YES" : "*NO";
}

export function createDisplayUserProfileScreen(
  systemName: string,
  userName: string,
): ScreenDefinition {
  const profile = getUserProfile(userName, systemName);
  if (!profile) {
    return {
      id: "DSPUSRPRF",
      title: "Display User Profile",
      rows: 24,
      cols: 80,
      fields: [
        ibmScreenHeader("DSPUSRPRF", "Display User Profile", systemName),
        outputField("ERR", 10, 6, `CPF2204 - User profile ${userName} not found.`),
        outputField("FKEYS", 23, 1, "F3=Exit   F12=Cancel".padEnd(80)),
      ],
      functionKeys: [
        { key: "F3", label: "Exit", action: "EXIT_MENU" },
        { key: "F12", label: "Cancel", action: "CANCEL" },
      ],
    };
  }

  const exempt = profile.activityProfileExempt ? "*YES" : "*NO";
  const dataOwner = profile.businessOwner?.trim() || "*NONE";

  const fields = [
    ibmScreenHeader("DSPUSRPRF", "Display User Profile", systemName),
    outputField("BLANK1", 2, 1, " ".repeat(80)),
    ...ibmDetailFields(4, "USR", "User profile", profile.userName),
    ...ibmDetailFields(5, "STS", "Status", profile.status),
    ...ibmDetailFields(6, "CLS", "User class", profile.userClass),
    ...ibmDetailFields(7, "SPC", "Special authority", profile.specialAuthorities),
    ...ibmDetailFields(8, "GRP", "Group profile", profile.groupProfile),
    ...ibmDetailFields(9, "MENU", "Initial menu", profile.initialMenu),
    ...ibmDetailFields(10, "INLPGM", "Initial program", profile.initialProgram ?? "*NONE"),
    ...ibmDetailFields(11, "CURLIB", "Current library", profile.currentLibrary ?? "*CRTDFT"),
    ...ibmDetailFields(12, "LMT", "Limit capabilities", profile.limitCapabilities ?? "*NO"),
    ...ibmDetailFields(13, "JOBD", "Job description", "QDFTJOBD/QGPL"),
    ...ibmDetailFields(14, "OWNER", "Owner", profileOwner(profile.userName)),
    ...ibmDetailFields(15, "DATAOWN", "Data owner", dataOwner),
    ...ibmDetailFields(16, "PWDEXP", "Password expired", passwordExpired(profile.status)),
    ...ibmDetailFields(17, "ACTEX", "Activity list exempt", exempt),
    ...ibmDetailFields(18, "SIGNON", "Previous sign-on", profile.lastSignon),
    ...ibmDetailFields(19, "TXT", "Text description", profile.text),
    outputField("FKEYS", 23, 1, "F3=Exit   F12=Cancel".padEnd(80)),
  ];

  return {
    id: "DSPUSRPRF",
    title: "Display User Profile",
    rows: 24,
    cols: 80,
    fields,
    functionKeys: [
      { key: "F3", label: "Exit", action: "EXIT_MENU" },
      { key: "F12", label: "Cancel", action: "CANCEL" },
    ],
  };
}
