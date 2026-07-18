import type { ScreenDefinition } from "../screen.js";
import type { CatalogListRow } from "../../ibmi-runtime/catalogDataProviders.js";
import { getSystemValue, listSecuritySystemValues } from "../../ibmi-runtime/systemValueService.js";
import { listUserProfiles } from "../../ibmi-runtime/userProfileService.js";
import {
  commandField,
  ibmColumnHeader,
  ibmOptionLegend,
  ibmOptionPrompt,
  ibmScreenHeader,
  outputField,
  subfileScreenFooter,
} from "./screenHelpers.js";
import { ibmDetailFields } from "./ibmDetailLayout.js";

const AUDIT_SYSVAL_NAMES = ["QAUDCTL", "QAUDLVL", "QAUDFRCLVL", "QAUDENDACN"] as const;

export function auditSettingsRows(systemName: string): CatalogListRow[] {
  const values = listSecuritySystemValues(systemName);
  return AUDIT_SYSVAL_NAMES.map((name) => {
    const entry = values.find((row) => row.name === name) ?? {
      name,
      value: "*NONE",
      category: "Audit",
      description: "Audit setting",
    };
    return {
      line: `${entry.name.padEnd(16)} ${entry.value.padEnd(24).slice(0, 24)} ${entry.description.slice(0, 22)}`,
      drillDown: { command: "DSPSYSVAL", input: `DSPSYSVAL SYSVAL(${entry.name})` },
    };
  });
}

export function journalListRows(): CatalogListRow[] {
  return [
    {
      line: "QAUDJRN          QSYS         *ACTIVE",
      drillDown: { command: "DSPJRN", input: "DSPJRN JRN(QSYS/QAUDJRN) ENTTYP(PW AF CP)" },
    },
  ];
}

export function createWorkJournalListScreen(systemName: string, rows: CatalogListRow[]): ScreenDefinition {
  const fields = [
    ibmScreenHeader("WRKJRN", "Work with Journals", systemName),
    outputField("BLANK1", 2, 1, " ".repeat(80)),
    ibmOptionPrompt("OPTS", 3, 6),
    ibmOptionLegend("OPT_HINT", 4, 6, "  2=Change   5=Display"),
    ibmColumnHeader(6, 6, "Opt   Journal      Library    Status"),
  ];

  rows.slice(0, 7).forEach((row, index) => {
    const lineRow = 7 + index;
    fields.push(commandField(`WOPT${index}`, lineRow, 6, 2));
    fields.push(outputField(`WROW${index}`, lineRow, 10, row.line.slice(0, 68)));
  });

  fields.push(
    outputField("NOTE", 19, 6, "Lab: QAUDJRN receiver rotation uses CHGJRN/CRTJRNRCV — synthetic data only."),
  );
  fields.push(...subfileScreenFooter("F3=Exit   F5=Refresh   F12=Cancel"));

  return {
    id: "WRKJRN",
    title: "Work with Journals",
    rows: 24,
    cols: 80,
    commandLine: true,
    fields,
    functionKeys: [
      { key: "F3", label: "Exit", action: "EXIT_MENU" },
      { key: "F5", label: "Refresh", action: "REFRESH" },
      { key: "F12", label: "Cancel", action: "CANCEL" },
    ],
  };
}

export function createChangeJournalScreen(
  systemName: string,
  journal = "QSYS/QAUDJRN",
): ScreenDefinition {
  const fields = [
    outputField("HEADER", 1, 6, "Change Journal (CHGJRN)".padEnd(74), { color: "white" }),
    outputField("HINT", 3, 6, "Type choices, press Enter."),
    outputField("BLANK", 4, 1, " ".repeat(80)),
    outputField("JRN_LBL", 5, 6, "Journal . . . . . . . . . . . . . . . . . . . >"),
    commandField("JRN", 5, 47, 33, journal),
    outputField("MNG_LBL", 7, 6, "Manage receivers . . . . . . . . . . . . . . . >"),
    commandField("MNGRCV", 7, 47, 33, "*SYSDFT"),
    outputField("IMG_LBL", 9, 6, "Image size . . . . . . . . . . . . . . . . . . >"),
    commandField("IMAGESIZ", 9, 47, 33, "256000"),
    outputField("DLT_LBL", 11, 6, "Delete receivers . . . . . . . . . . . . . . >"),
    commandField("DLTRCV", 11, 47, 33, "*NO"),
    outputField("LAB", 14, 6, "Lab limit: receiver-threshold panels not modeled — see golden notes."),
    outputField("BOTTOM", 20, 6, "Bottom"),
    outputField(
      "FKEYS",
      24,
      1,
      "F3=Exit   F4=Prompt   F5=Refresh   F9=All parameters   F12=Cancel   F24=More keys".padEnd(80),
    ),
  ];

  return {
    id: "CHGJRN",
    title: "Change Journal",
    rows: 24,
    cols: 80,
    fields,
    functionKeys: [
      { key: "F3", label: "Exit", action: "EXIT_MENU" },
      { key: "F4", label: "Prompt", action: "PROMPT" },
      { key: "F12", label: "Cancel", action: "CANCEL" },
    ],
  };
}

export function createCreateJournalReceiverScreen(
  systemName: string,
  journal = "QSYS/QAUDJRN",
): ScreenDefinition {
  const fields = [
    outputField("HEADER", 1, 6, "Create Journal Receiver (CRTJRNRCV)".padEnd(74), { color: "white" }),
    outputField("HINT", 3, 6, "Type choices, press Enter."),
    outputField("JRN_LBL", 5, 6, "Journal . . . . . . . . . . . . . . . . . . . >"),
    commandField("JRN", 5, 47, 33, journal),
    outputField("RCV_LBL", 7, 6, "Receiver . . . . . . . . . . . . . . . . . . . >"),
    commandField("RCV", 7, 47, 33, "QAUDJRN0002"),
    outputField("TEXT_LBL", 9, 6, "Text . . . . . . . . . . . . . . . . . . . . . >"),
    commandField("TEXT", 9, 47, 33, "Security audit journal receiver"),
    outputField("LAB", 14, 6, "Lab: CRTJRNRCV confirms only — no live receiver chain on SQLite."),
    outputField("BOTTOM", 20, 6, "Bottom"),
    outputField(
      "FKEYS",
      24,
      1,
      "F3=Exit   F4=Prompt   F5=Refresh   F9=All parameters   F12=Cancel   F24=More keys".padEnd(80),
    ),
  ];

  return {
    id: "CRTJRNRCV",
    title: "Create Journal Receiver",
    rows: 24,
    cols: 80,
    fields,
    functionKeys: [
      { key: "F3", label: "Exit", action: "EXIT_MENU" },
      { key: "F4", label: "Prompt", action: "PROMPT" },
      { key: "F12", label: "Cancel", action: "CANCEL" },
    ],
  };
}

export function createChangeJournalReceiverAttributesScreen(
  systemName: string,
  journal = "QSYS/QAUDJRN",
  receiver = "QAUDJRN",
): ScreenDefinition {
  const fields = [
    ibmScreenHeader("CHGJRNRCVA", "Change Journal Receiver Attributes", systemName),
    outputField("BLANK1", 2, 1, " ".repeat(80)),
    ...ibmDetailFields(4, "JRN", "Journal", journal),
    ...ibmDetailFields(5, "RCV", "Receiver", receiver),
    ...ibmDetailFields(6, "THR", "Receiver threshold", "1000000"),
    ...ibmDetailFields(7, "MNG", "Manage receivers", "*SYSDFT"),
    outputField("LAB", 10, 6, "Lab limit: threshold alerts not simulated — document in audit evidence."),
    outputField("FKEYS", 23, 1, "F3=Exit   F12=Cancel".padEnd(80)),
  ];

  return {
    id: "CHGJRNRCVA",
    title: "Change Journal Receiver Attributes",
    rows: 24,
    cols: 80,
    fields,
    functionKeys: [
      { key: "F3", label: "Exit", action: "EXIT_MENU" },
      { key: "F12", label: "Cancel", action: "CANCEL" },
    ],
  };
}

export function createDisplayJournalReceiverScreen(
  systemName: string,
  journal = "QSYS/QAUDJRN",
  receiver = "QAUDJRN",
): ScreenDefinition {
  const fields = [
    ibmScreenHeader("DSPJRNRCV", "Display Journal Receiver", systemName),
    outputField("BLANK1", 2, 1, " ".repeat(80)),
    ...ibmDetailFields(4, "JRN", "Journal", journal),
    ...ibmDetailFields(5, "RCV", "Receiver", receiver),
    ...ibmDetailFields(6, "LIB", "Library", "QSYS"),
    ...ibmDetailFields(7, "STS", "Status", "*ACTIVE"),
    ...ibmDetailFields(8, "ENT", "First entry", "1"),
    ...ibmDetailFields(9, "LST", "Last entry", "1842"),
    ...ibmDetailFields(10, "THR", "Receiver threshold", "1000000"),
    outputField("LAB", 12, 6, "Receiver chain proof — save receivers before DLTRCV on production LPAR."),
    outputField("FKEYS", 23, 1, "F3=Exit   F12=Cancel".padEnd(80)),
  ];

  return {
    id: "DSPJRNRCV",
    title: "Display Journal Receiver",
    rows: 24,
    cols: 80,
    fields,
    functionKeys: [
      { key: "F3", label: "Exit", action: "EXIT_MENU" },
      { key: "F12", label: "Cancel", action: "CANCEL" },
    ],
  };
}

export function createDisplayAuditSettingsScreen(systemName: string): ScreenDefinition {
  const qaudctl = getSystemValue("QAUDCTL", systemName)?.value ?? "*AUDLVL *OBJAUD";
  const qaudlvl = getSystemValue("QAUDLVL", systemName)?.value ?? "*AUTFAIL *PGMFAIL";
  const qaudfrclvl = getSystemValue("QAUDFRCLVL", systemName)?.value ?? "*NONE";
  const qaudendacn = getSystemValue("QAUDENDACN", systemName)?.value ?? "*NOTIFY";

  const fields = [
    ibmScreenHeader("DSPAUD", "Display Audit Values", systemName),
    outputField("BLANK1", 2, 1, " ".repeat(80)),
    ...ibmDetailFields(4, "CTL", "Auditing control", qaudctl),
    ...ibmDetailFields(5, "LVL", "Auditing level", qaudlvl),
    ...ibmDetailFields(6, "FRC", "Force auditing level", qaudfrclvl),
    ...ibmDetailFields(7, "END", "End action", qaudendacn),
    outputField("LAB", 10, 6, "Evidence of logging baseline — pair with DSPSECAUD and QAUDJRN review."),
    outputField("FKEYS", 23, 1, "F3=Exit   F12=Cancel".padEnd(80)),
  ];

  return {
    id: "DSPAUD",
    title: "Display Audit Values",
    rows: 24,
    cols: 80,
    fields,
    functionKeys: [
      { key: "F3", label: "Exit", action: "EXIT_MENU" },
      { key: "F12", label: "Cancel", action: "CANCEL" },
    ],
  };
}

export function createChangeAuditSettingsScreen(systemName: string): ScreenDefinition {
  const qaudctl = getSystemValue("QAUDCTL", systemName)?.value ?? "*AUDLVL *OBJAUD";
  const qaudlvl = getSystemValue("QAUDLVL", systemName)?.value ?? "*AUTFAIL *PGMFAIL";

  const fields = [
    outputField("HEADER", 1, 6, "Change Audit Values (CHGAUD)".padEnd(74), { color: "white" }),
    outputField("HINT", 3, 6, "Type choices, press Enter."),
    outputField("CTL_LBL", 5, 6, "Auditing control . . . . . . . . . . . . . . . >"),
    commandField("QAUDCTL", 5, 47, 33, qaudctl),
    outputField("LVL_LBL", 7, 6, "Auditing level . . . . . . . . . . . . . . . . >"),
    commandField("QAUDLVL", 7, 47, 33, qaudlvl),
    outputField("FRC_LBL", 9, 6, "Force auditing level . . . . . . . . . . . . >"),
    commandField("QAUDFRCLVL", 9, 47, 33, "*NONE"),
    outputField("LAB", 14, 6, "Lab: CHGAUD maps to system values — mutations logged to QAUDJRN when enabled."),
    outputField("BOTTOM", 20, 6, "Bottom"),
    outputField(
      "FKEYS",
      24,
      1,
      "F3=Exit   F4=Prompt   F5=Refresh   F9=All parameters   F12=Cancel   F24=More keys".padEnd(80),
    ),
  ];

  return {
    id: "CHGAUD",
    title: "Change Audit Values",
    rows: 24,
    cols: 80,
    fields,
    functionKeys: [
      { key: "F3", label: "Exit", action: "EXIT_MENU" },
      { key: "F4", label: "Prompt", action: "PROMPT" },
      { key: "F12", label: "Cancel", action: "CANCEL" },
    ],
  };
}

export function createWorkAuditSettingsScreen(systemName: string, rows: CatalogListRow[]): ScreenDefinition {
  const fields = [
    ibmScreenHeader("WRKAUD", "Work with Audit Values", systemName),
    outputField("BLANK1", 2, 1, " ".repeat(80)),
    ibmOptionPrompt("OPTS", 3, 6),
    ibmOptionLegend("OPT_HINT", 4, 6, "  2=Change   5=Display"),
    ibmColumnHeader(6, 6, "Opt   System value    Value                     Text"),
  ];

  rows.forEach((row, index) => {
    const lineRow = 7 + index;
    fields.push(commandField(`WOPT${index}`, lineRow, 6, 2));
    fields.push(outputField(`WROW${index}`, lineRow, 10, row.line.slice(0, 68)));
  });

  fields.push(...subfileScreenFooter("F3=Exit   F5=Refresh   F12=Cancel"));

  return {
    id: "WRKAUD",
    title: "Work with Audit Values",
    rows: 24,
    cols: 80,
    commandLine: true,
    fields,
    functionKeys: [
      { key: "F3", label: "Exit", action: "EXIT_MENU" },
      { key: "F5", label: "Refresh", action: "REFRESH" },
      { key: "F12", label: "Cancel", action: "CANCEL" },
    ],
  };
}

export function createDisplayActivityProfileListScreen(systemName: string): ScreenDefinition {
  const profiles = listUserProfiles(systemName).filter((profile) => profile.activityProfileExempt);

  const fields = [
    ibmScreenHeader("DSPACTPRFL", "Display Activity Profile List", systemName),
    outputField("HINT", 3, 6, "Profiles exempt from inactive-profile disable (QSECIDL1)."),
    ibmColumnHeader(5, 6, "Profile      Activity list status"),
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

  fields.push(outputField("LAB", 12, 6, "Pair with ANZPRFACT/CHGACTPRFL for offboarding audit evidence."));
  fields.push(outputField("FKEYS", 23, 1, "F3=Exit   F12=Cancel".padEnd(80)));

  return {
    id: "DSPACTPRFL",
    title: "Display Activity Profile List",
    rows: 24,
    cols: 80,
    fields,
    functionKeys: [
      { key: "F3", label: "Exit", action: "EXIT_MENU" },
      { key: "F12", label: "Cancel", action: "CANCEL" },
    ],
  };
}

export function createChangeObjectAuditingScreen(
  systemName: string,
  _userName: string,
  objectRef = "",
  objectType = "*FILE",
  auditLevel = "*ALL",
): ScreenDefinition {
  const fields = [
    ibmScreenHeader("CHGOBJAUD", "Change Object Auditing", systemName),
    outputField("TITLE", 3, 2, "Change Object Auditing"),
    outputField("BODY", 5, 2, "Set auditing values for a library object after corrective action."),
    outputField("OBJLBL", 7, 6, "Object . . . . . . . . . . . . :"),
    commandField("OBJ", 7, 29, 20, objectRef),
    outputField("TYPLBL", 8, 6, "Object type . . . . . . . . . :"),
    commandField("OBJTYPE", 8, 29, 10, objectType),
    outputField("AUDLBL", 9, 6, "Auditing value . . . . . . . . :"),
    commandField("AUD", 9, 29, 10, auditLevel),
    outputField("NOTE", 11, 6, "Clause 10: raise *ALL auditing on sensitive files after corrective action."),
    outputField("LAB", 13, 6, "Enter OBJ/AUD on the command line to apply — journal AF/CP entries follow."),
    ...subfileScreenFooter("F3=Exit   F4=Prompt   F12=Cancel"),
  ];

  return {
    id: "CHGOBJAUD",
    title: "Change Object Auditing",
    rows: 24,
    cols: 80,
    commandLine: true,
    fields,
    functionKeys: [
      { key: "F3", label: "Exit", action: "EXIT_MENU" },
      { key: "F4", label: "Prompt", action: "PROMPT" },
      { key: "F12", label: "Cancel", action: "CANCEL" },
    ],
  };
}
