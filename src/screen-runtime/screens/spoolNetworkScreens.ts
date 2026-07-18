import type { ScreenDefinition } from "../screen.js";
import type { CatalogListRow } from "../../ibmi-runtime/catalogDataProviders.js";
import {
  commandField,
  createInfoScreen,
  ibmColumnHeader,
  ibmOptionLegend,
  ibmOptionPrompt,
  ibmScreenHeader,
  menuCommandFooter,
  MENU_LAYOUT,
  outputField,
  SUBFILE_PAGE_FKEYS,
  subfileScreenFooter,
} from "./screenHelpers.js";
import { ibmDetailFields } from "./ibmDetailLayout.js";

export function createDisplayOutputQueueScreen(systemName: string, queueName: string): ScreenDefinition {
  return createInfoScreen("DSPOUTQ", "Display Output Queue", systemName, "", [
    `Output queue . . . . . . . . . : ${queueName}`,
    `Library  . . . . . . . . . . . : QGPL`,
    `Status . . . . . . . . . . . . : RELEASED`,
    `Writer . . . . . . . . . . . . : QPJMWTR`,
    `Maximum spooled files  . . . . : *NOMAX`,
    `Spooled files  . . . . . . . . : 4`,
    `Text description . . . . . . . : System output queue`,
  ]);
}

export type AuthListEntry = {
  name: string;
  library: string;
  description: string;
};

const AUTH_LISTS: AuthListEntry[] = [
  { name: "PAYROLL", library: "PAYROLL", description: "Payroll object authority list" },
  { name: "SECDATA", library: "QSYS", description: "Security administration objects" },
  { name: "BACKUP", library: "QSYS", description: "Backup and restore authority list" },
];

export type AuthListMember = {
  user: string;
  authority: string;
};

export const PAYROLL_AUTL_MEMBERS: AuthListMember[] = [
  { user: "PAYADMIN", authority: "*ALL" },
  { user: "APCLERK", authority: "*USE" },
  { user: "BACKUPADM", authority: "*USE" },
  { user: "*PUBLIC", authority: "*EXCLUDE" },
];

export function listAuthorizationLists(): AuthListEntry[] {
  return AUTH_LISTS.map((entry) => ({ ...entry }));
}

export function authorizationListRows(): CatalogListRow[] {
  return listAuthorizationLists().map((entry) => ({
    line: `${entry.name.padEnd(12)} ${entry.library.padEnd(10)} ${entry.description.slice(0, 34)}`,
    drillDown: { command: "DSPAUTL", input: `DSPAUTL AUTL(${entry.name})` },
  }));
}

export function createWorkAuthorizationListsScreen(systemName: string): ScreenDefinition {
  const lists = listAuthorizationLists();
  const fields = [
    ibmScreenHeader("WRKAUTL", "Work with Authorization Lists", systemName),
    outputField("BLANK1", 2, 1, " ".repeat(80)),
    ibmOptionPrompt("OPTS", 3, 6, "Type options, press Enter."),
    ibmOptionLegend("OPT_HINT", 4, 6, "  2=Change   4=Delete   5=Display"),
    ibmColumnHeader(6, 6, "Opt  Authorization list     Text", "COLHDR"),
  ];

  lists.forEach((entry, index) => {
    const row = 7 + index;
    fields.push(commandField(`WOPT${index}`, row, 6, 2));
    const line = `${entry.name.padEnd(23)} ${entry.description.slice(0, 45)}`;
    fields.push(outputField(`AUTL${index}`, row, 10, line.slice(0, 68)));
  });

  fields.push(...subfileScreenFooter(SUBFILE_PAGE_FKEYS));

  return {
    id: "WRKAUTL",
    title: "Work with Authorization Lists",
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

export function createDisplayAuthorizationListScreen(
  systemName: string,
  listName: string,
): ScreenDefinition {
  const entry = AUTH_LISTS.find((row) => row.name === listName.toUpperCase()) ?? AUTH_LISTS[0]!;
  const members = entry.name === "PAYROLL" ? PAYROLL_AUTL_MEMBERS : PAYROLL_AUTL_MEMBERS.slice(0, 2);

  const fields = [
    ibmScreenHeader("DSPAUTL", "Display Authorization List", systemName),
    outputField("BLANK1", 2, 1, " ".repeat(80)),
    ...ibmDetailFields(4, "AUTL", "Authorization list", entry.name),
    ...ibmDetailFields(5, "LIB", "Library", entry.library),
    ...ibmDetailFields(6, "TEXT", "Description", entry.description.slice(0, 33)),
    ...ibmDetailFields(7, "PUBAUT", "Public authority", entry.name === "PAYROLL" ? "*EXCLUDE" : "*USE"),
    ...ibmDetailFields(8, "OBJS", "Objects secured", entry.name === "PAYROLL" ? "8" : "12"),
    outputField("MBR_HDR", 10, 6, "Users authorized:"),
    outputField("MBR_COL", 11, 6, "User profile      Authority"),
  ];

  members.forEach((member, index) => {
    const row = 12 + index;
    const line = `${member.user.padEnd(18)} ${member.authority}`;
    fields.push(outputField(`USR${index}`, row, 6, line.padEnd(74).slice(0, 74)));
  });

  if (entry.name === "PAYROLL") {
    fields.push(
      outputField(
        "NOTE",
        12 + members.length + 1,
        6,
        "Clause 6/8: PAYROLL autl should align with PAYMST object authority.",
      ),
    );
  }

  fields.push(outputField("FKEYS", 23, 1, "F3=Exit   F12=Cancel".padEnd(80)));

  return {
    id: "DSPAUTL",
    title: "Display Authorization List",
    rows: 24,
    cols: 80,
    fields,
    functionKeys: [
      { key: "F3", label: "Exit", action: "EXIT_MENU" },
      { key: "F12", label: "Cancel", action: "CANCEL" },
    ],
  };
}

/** NETSTAT OPTION(*SELECT) — Work with TCP/IP Network Status menu. */
export function createNetStatMenuScreen(systemName: string, commandValue = ""): ScreenDefinition {
  const options = [
    " 1. Work with TCP/IP interface status",
    " 2. Display TCP/IP route information",
    " 3. Work with TCP/IP connection status",
  ];
  const fields = [
    ibmScreenHeader("NETSTAT", "Work with TCP/IP Network Status", systemName),
    outputField("BLANK1", 2, 1, " ".repeat(80)),
    outputField("PROMPT", 3, 6, "Select one of the following:"),
    outputField("BLANK2", 4, 1, " ".repeat(80)),
  ];
  options.forEach((option, index) => {
    fields.push(outputField(`OPT${index + 1}`, MENU_LAYOUT.optionStartRow + index, 6, option));
  });
  fields.push(...menuCommandFooter(commandValue));
  return {
    id: "NETSTAT",
    title: "Work with TCP/IP Network Status",
    rows: 24,
    cols: 80,
    commandLine: true,
    fields,
    functionKeys: [
      { key: "F3", label: "Exit", action: "EXIT_MENU" },
      { key: "F4", label: "Prompt", action: "PROMPT" },
      { key: "F9", label: "Retrieve", action: "RETRIEVE" },
      { key: "F12", label: "Cancel", action: "CANCEL" },
    ],
  };
}

const NETSTAT_INTERFACES = [
  { line: "LINETH       *ETH      10.10.10.40   ACTIVE", opt: false },
  { line: "LOOPBACK     *LOOPBACK 127.0.0.1     ACTIVE", opt: false },
];

export function createNetStatInterfaceScreen(systemName: string): ScreenDefinition {
  const fields = [
    ibmScreenHeader("NETSTAT", "Work with TCP/IP Interface Status", systemName),
    outputField("HDR", 4, 6, "Line         Type      Internet address  Status"),
  ];
  NETSTAT_INTERFACES.forEach((iface, index) => {
    fields.push(outputField(`IF${index}`, 5 + index, 6, iface.line));
  });
  fields.push(...subfileScreenFooter("F3=Exit   F12=Cancel"));
  return {
    id: "NETSTAT",
    title: "Work with TCP/IP Interface Status",
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

const NETSTAT_ROUTES = [
  { line: "*DFTROUTE    10.10.10.1    *IFC      LINETH" },
  { line: "10.10.10.0    255.255.255.0 *IFC      LINETH" },
];

export function createNetStatRouteScreen(systemName: string): ScreenDefinition {
  const fields = [
    ibmScreenHeader("NETSTAT", "Display TCP/IP Route Information", systemName),
    outputField("HDR", 4, 6, "Route         Subnet mask   Type      Interface"),
  ];
  NETSTAT_ROUTES.forEach((route, index) => {
    fields.push(outputField(`RT${index}`, 5 + index, 6, route.line));
  });
  fields.push(...subfileScreenFooter("F3=Exit   F12=Cancel"));
  return {
    id: "NETSTAT",
    title: "Display TCP/IP Route Information",
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

const NETSTAT_CONNECTIONS = [
  {
    remote: "10.10.10.55",
    local: "10.10.10.40",
    state: "*ESTABLISHED",
    port: "5250",
  },
  {
    remote: "10.10.10.12",
    local: "10.10.10.40",
    state: "*LISTEN",
    port: "80",
  },
];

/** Legacy NETSTAT entry — routes to the option menu. */
export function createNetStatScreen(systemName: string): ScreenDefinition {
  return createNetStatMenuScreen(systemName);
}

export function createNetStatConnectionScreen(systemName: string): ScreenDefinition {
  const fields = [
    ibmScreenHeader("NETSTATCNN", "Work with TCP/IP Connection Status", systemName),
    outputField("OPTS", 3, 6, "Type options, press Enter."),
    outputField(
      "OPT_HINT",
      4,
      6,
      "  3=Enable debug   4=End   5=Display details   8=Display jobs",
    ),
    ibmColumnHeader(6, 6, "Opt   Remote address    Local address     State"),
    outputField("COL_REM", 6, 18, "Remote"),
    outputField("COL_LOC", 6, 36, "Local"),
    outputField("COL_STA", 6, 54, "State"),
  ];

  NETSTAT_CONNECTIONS.forEach((conn, index) => {
    const row = 7 + index;
    fields.push(commandField(`NCNN${index}`, row, 6, 2));
    const line = `${conn.remote.padEnd(18)} ${conn.local.padEnd(18)} ${conn.state}`;
    fields.push(outputField(`CNN${index}`, row, 10, line.slice(0, 68)));
  });

  fields.push(...subfileScreenFooter("F3=Exit   F5=Refresh   F12=Cancel"));

  return {
    id: "NETSTATCNN",
    title: "Work with TCP/IP Connection Status",
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
