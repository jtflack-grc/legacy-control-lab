import type { ScreenDefinition } from "../screen.js";
import { commandField, ibmScreenHeader, outputField } from "./screenHelpers.js";

type PromptField = { label: string; value: string; id: string };

function createCommandPromptStyleScreen(
  screenId: string,
  title: string,
  systemName: string,
  fields: PromptField[],
  note?: string,
): ScreenDefinition {
  const screenFields = [
    outputField("HDR", 1, 6, `              ${title} (${screenId})`.padEnd(74).slice(0, 74), {
      color: "white",
    }),
    outputField("HINT", 3, 6, "Type choices, press Enter.", { color: "blue" }),
    outputField("BLANK", 4, 1, " ".repeat(80)),
  ];

  fields.forEach((field, index) => {
    const row = 5 + index;
    const label = field.label.padEnd(38, ".");
    screenFields.push(outputField(`LBL${index}`, row, 6, `${label} . . . . .`));
    screenFields.push(commandField(field.id, row, 47, 33, field.value));
  });

  if (note) {
    screenFields.push(outputField("NOTE", 5 + fields.length + 1, 6, note.slice(0, 74)));
  }

  screenFields.push(outputField("MORE", 20, 6, "Bottom"));
  screenFields.push(
    outputField(
      "FKEYS",
      24,
      1,
      "F3=Exit   F4=Prompt   F5=Refresh   F9=All parameters   F12=Cancel   F24=More keys".padEnd(80),
    ),
  );

  return {
    id: screenId,
    title,
    rows: 24,
    cols: 80,
    commandLine: false,
    fields: screenFields,
    functionKeys: [
      { key: "F3", label: "Exit", action: "EXIT_MENU" },
      { key: "F4", label: "Prompt", action: "PROMPT" },
      { key: "F12", label: "Cancel", action: "CANCEL" },
    ],
  };
}

export function createChangeObjectOwnerScreen(
  systemName: string,
  obj = "PAYROLL/PAYMST",
  objType = "*FILE",
  newOwn = "PAYADMIN",
): ScreenDefinition {
  return createCommandPromptStyleScreen(
    "CHGOBJOWN",
    "Change Object Owner",
    systemName,
    [
      { id: "P0", label: "Object", value: obj },
      { id: "P1", label: "Object type", value: objType },
      { id: "P2", label: "New owner", value: newOwn },
    ],
    "Requires *OBJEXIST + ownership. Lab records AF journal on remediation.",
  );
}

export function createCreateAutlScreen(
  systemName: string,
  autl = "NEWAUTL",
  text = "Audit remediation list",
): ScreenDefinition {
  return createCommandPromptStyleScreen("CRTAUTL", "Create Authorization List", systemName, [
    { id: "P0", label: "Authorization list", value: autl },
    { id: "P1", label: "Text description", value: text },
    { id: "P2", label: "Authority", value: "*EXCLUDE" },
  ]);
}

export function createChangeAutlScreen(
  systemName: string,
  autl = "PAYROLL",
  text = "Payroll object authority list",
): ScreenDefinition {
  return createCommandPromptStyleScreen("CHGAUTL", "Change Authorization List", systemName, [
    { id: "P0", label: "Authorization list", value: autl },
    { id: "P1", label: "Text description", value: text },
    { id: "P2", label: "Authority", value: "*EXCLUDE" },
  ]);
}

export function createAddAutleScreen(
  systemName: string,
  autl = "PAYROLL",
  user = "APCLERK",
  authority = "*USE",
): ScreenDefinition {
  return createCommandPromptStyleScreen("ADDAUTLE", "Add Authorization List Entry", systemName, [
    { id: "P0", label: "Authorization list", value: autl },
    { id: "P1", label: "User profile", value: user },
    { id: "P2", label: "Authority", value: authority },
  ]);
}

export function createRemoveAutleScreen(
  systemName: string,
  autl = "PAYROLL",
  user = "OLDVENDOR",
): ScreenDefinition {
  return createCommandPromptStyleScreen("RMVAUTLE", "Remove Authorization List Entry", systemName, [
    { id: "P0", label: "Authorization list", value: autl },
    { id: "P1", label: "User profile", value: user },
  ]);
}

export function createCreateUserProfileScreen(
  systemName: string,
  user = "TRAINER01",
  password = "",
): ScreenDefinition {
  return createCommandPromptStyleScreen("CRTUSRPRF", "Create User Profile", systemName, [
    { id: "P0", label: "User profile", value: user },
    { id: "P1", label: "Password", value: password },
    { id: "P2", label: "User class", value: "*USER" },
    { id: "P3", label: "Status", value: "*ENABLED" },
  ], "Creates profile in lab SQLite — QAUDJRN UA entry on success.");
}

export function createDeleteUserProfileScreen(systemName: string, user = "TRAINER01"): ScreenDefinition {
  return createCommandPromptStyleScreen("DLTUSRPRF", "Delete User Profile", systemName, [
    { id: "P0", label: "User profile", value: user },
  ], "Deletes lab-created profiles — blocked for seeded mission IDs.");
}

export function createDisplayProgramAdoptAuthorityScreen(
  systemName: string,
  program = "PAYROLL/PAYAUTHR",
): ScreenDefinition {
  const fields = [
    ibmScreenHeader("DSPPGMADTA", "Display Program Adopted Authority", systemName),
    outputField("BLANK1", 2, 1, " ".repeat(80)),
    outputField("PGM", 4, 6, `Program . . . . . . . . . . . . . . . . . : ${program}`),
    outputField("ADP", 5, 6, "Adopt authority . . . . . . . . . . . . : *USER"),
    outputField("USE", 6, 6, "Use adopted authority . . . . . . . . . : *YES"),
    outputField("OWNER", 7, 6, "Owner . . . . . . . . . . . . . . . . . : PAYADMIN"),
    outputField(
      "NOTE",
      9,
      6,
      "Lab stub — stock DSPPGMADTA shows adopt profile and authority chain.",
    ),
    outputField("FKEYS", 23, 1, "F3=Exit   F12=Cancel".padEnd(80)),
  ];
  return {
    id: "DSPPGMADTA",
    title: "Display Program Adopted Authority",
    rows: 24,
    cols: 80,
    fields,
    functionKeys: [
      { key: "F3", label: "Exit", action: "EXIT_MENU" },
      { key: "F12", label: "Cancel", action: "CANCEL" },
    ],
  };
}

export function createWorkProgramAdoptStubScreen(systemName: string): ScreenDefinition {
  const fields = [
    ibmScreenHeader("WRKPGMADP", "Work with Program Adopted Authority", systemName),
    outputField("NOTE1", 6, 6, "Not implemented on stock 5250 in all releases — lab informational stub."),
    outputField(
      "NOTE2",
      8,
      6,
      "Use DSPPGMADTA PGM(PAYROLL/PAYAUTHR) for adopt authority evidence.",
    ),
    outputField(
      "NOTE3",
      10,
      6,
      "Pair with DSPPGMREF for file references and adopted program paths.",
    ),
    outputField("FKEYS", 23, 1, "F3=Exit   F12=Cancel".padEnd(80)),
  ];
  return {
    id: "WRKPGMADP",
    title: "Work with Program Adopted Authority",
    rows: 24,
    cols: 80,
    fields,
    functionKeys: [
      { key: "F3", label: "Exit", action: "EXIT_MENU" },
      { key: "F12", label: "Cancel", action: "CANCEL" },
    ],
  };
}
