import type { ScreenDefinition } from "../screen.js";
import type { AuthorityFinding, ObjectAuthorityDisplay } from "../../ibmi-runtime/authorityService.js";
import { getUserProfile } from "../../ibmi-runtime/userProfileService.js";
import { createDisplayObjectAuthorityScreen } from "./displayObjectAuthority.js";
import { ibmColumnHeader, ibmScreenHeader, menuHeader, outputField, standardFunctionKeys } from "./screenHelpers.js";
import { ibmDetailFields } from "./ibmDetailLayout.js";

export function createWorkAuthorityScreen(systemName: string, findings: AuthorityFinding[]): ScreenDefinition {
  const fields = [
    ...menuHeader("Work with Authority", systemName),
    outputField("BLANK1", 2, 1, " ".repeat(80)),
    ibmColumnHeader(4, 6, "  Library     Object      Public auth  Issue"),
    outputField("LINE", 5, 6, "  ---------- ---------- ------------ ------------------------------"),
  ];

  findings.forEach((finding, index) => {
    const line = `  ${finding.library.padEnd(11)} ${finding.object.padEnd(11)} ${finding.publicAuthority.padEnd(12)} ${finding.issue}`;
    fields.push(outputField(`AUT${index}`, 6 + index, 1, line.slice(0, 80)));
  });

  fields.push(standardFunctionKeys());

  return {
    id: "WRKAUT",
    title: "Work with Authority",
    rows: 24,
    cols: 80,
    fields,
    functionKeys: [
      { key: "F3", label: "Exit", action: "EXIT_MENU" },
      { key: "F12", label: "Cancel", action: "CANCEL" },
    ],
  };
}

export function createDisplayAuthorityScreen(
  systemName: string,
  userName: string,
  _lines?: string[],
): ScreenDefinition {
  const profile = getUserProfile(userName, systemName);
  if (!profile) {
    return {
      id: "DSPAUT",
      title: "Display Authority",
      rows: 24,
      cols: 80,
      fields: [
        ibmScreenHeader("DSPAUT", "Display Authority", systemName),
        outputField("ERR", 10, 6, `CPF2204 - User profile ${userName} not found.`),
        outputField("FKEYS", 23, 1, "F3=Exit   F12=Cancel".padEnd(80)),
      ],
      functionKeys: [
        { key: "F3", label: "Exit", action: "EXIT_MENU" },
        { key: "F12", label: "Cancel", action: "CANCEL" },
      ],
    };
  }

  const fields = [
    ibmScreenHeader("DSPAUT", "Display Authority", systemName),
    outputField("BLANK1", 2, 1, " ".repeat(80)),
    ...ibmDetailFields(4, "USR", "User profile", profile.userName),
    ...ibmDetailFields(5, "CLS", "User class", profile.userClass),
    ...ibmDetailFields(6, "GRP", "Group profile", profile.groupProfile),
    ...ibmDetailFields(7, "SPC", "Special authority", profile.specialAuthorities),
    ...ibmDetailFields(8, "LMT", "Limit capabilities", profile.limitCapabilities ?? "*NO"),
    ...ibmDetailFields(9, "STS", "Status", profile.status),
    outputField(
      "NOTE",
      11,
      6,
      "Clause 6: special authorities are privacy-risk inputs — pair with AUTL review.",
    ),
    outputField("FKEYS", 23, 1, "F3=Exit   F12=Cancel".padEnd(80)),
  ];

  return {
    id: "DSPAUT",
    title: "Display Authority",
    rows: 24,
    cols: 80,
    fields,
    functionKeys: [
      { key: "F3", label: "Exit", action: "EXIT_MENU" },
      { key: "F12", label: "Cancel", action: "CANCEL" },
    ],
  };
}

export function createEditObjectAuthorityScreen(
  systemName: string,
  userName: string,
  authority: ObjectAuthorityDisplay,
): ScreenDefinition {
  const base = createDisplayObjectAuthorityScreen(systemName, userName, authority);
  return {
    ...base,
    id: "EDTOBJAUT",
    title: "Edit Object Authority",
    fields: [
      ibmScreenHeader("EDTOBJAUT", "Edit Object Authority", systemName),
      ...base.fields.filter((field) => field.id !== "HEADER"),
      outputField("HINT", 16, 6, "F6=Grant   F7=Revoke   Use GRTOBJAUT/RVKOBJAUT from command line."),
    ],
  };
}
