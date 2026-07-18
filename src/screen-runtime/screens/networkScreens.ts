import type { ScreenDefinition } from "../screen.js";
import type { LinkServerEntry } from "../../ibmi-runtime/networkService.js";
import {
  commandField,
  createGoMenuScreen,
  ibmColumnHeader,
  ibmScreenHeader,
  outputField,
  subfileScreenFooter,
} from "./screenHelpers.js";

export function createWorkLinkServersScreen(
  systemName: string,
  servers: LinkServerEntry[],
): ScreenDefinition {
  const fields = [
    ibmScreenHeader("WRKLNKSVR", "Work with Link Servers", systemName),
    outputField("OPTS", 3, 6, "Type options, press Enter."),
    outputField("OPT_HINT", 4, 6, "  5=Display configuration"),
    ibmColumnHeader(6, 6, "Server        Status      Port  Description"),
  ];

  servers.forEach((server, index) => {
    const row = 7 + index;
    fields.push(commandField(`NOPT${index}`, row, 6, 2));
    fields.push(
      outputField(
        `NSRV${index}`,
        row,
        10,
        `${server.name.padEnd(14)} ${server.status.padEnd(12)} ${server.port.padEnd(5)} ${server.description.slice(0, 28)}`,
      ),
    );
  });

  fields.push(...subfileScreenFooter("F3=Exit   F12=Cancel"));

  return {
    id: "WRKLNKSVR",
    title: "Work with Link Servers",
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

export function createDisplayLinkServerScreen(systemName: string, server: LinkServerEntry): ScreenDefinition {
  const fields = [
    ibmScreenHeader("DSPLNKSVR", "Display Link Server", systemName),
    outputField("NAME", 4, 6, `Server . . . . . . . . . . . . : ${server.name}`),
    outputField("STAT", 5, 6, `Status . . . . . . . . . . . . : ${server.status}`),
    outputField("PORT", 6, 6, `Port . . . . . . . . . . . . . : ${server.port}`),
    outputField("DESC", 7, 6, `Description . . . . . . . . . : ${server.description}`),
    outputField("FKEYS", 24, 2, "F3=Exit   F12=Cancel"),
  ];
  return {
    id: "DSPLNKSVR",
    title: "Display Link Server",
    rows: 24,
    cols: 80,
    fields,
    functionKeys: [
      { key: "F3", label: "Exit", action: "EXIT_MENU" },
      { key: "F12", label: "Cancel", action: "CANCEL" },
    ],
  };
}

type PromptField = { label: string; value: string; id: string };

function createNetworkPromptScreen(
  screenId: string,
  title: string,
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

/** IBM stock CFGTCP — Configure TCP/IP menu (interfaces, routes, domain). */
export function createCfgTcpMenuScreen(systemName: string, commandValue = ""): ScreenDefinition {
  const screen = createGoMenuScreen(
    "CFGTCP",
    systemName,
    "Configure TCP/IP",
    [
      " 1. Work with TCP/IP interfaces",
      " 2. Work with TCP/IP routes",
      " 3. Change TCP/IP attributes",
      "10. Work with TCP/IP host table entries",
      "12. Change TCP/IP domain information",
      "13. Change remote name server",
      "20. Configure TCP/IP applications",
    ],
    commandValue,
  );
  screen.fields.unshift(ibmScreenHeader("CFGTCP", "Configure TCP/IP", systemName));
  return screen;
}

/** CHGNETA command prompt — network hardening baseline. */
export function createChangeNetworkAttributesScreen(systemName: string): ScreenDefinition {
  return createNetworkPromptScreen("CHGNETA", "Change Network Attributes", [
    { id: "P0", label: "Domain", value: "LAB.LOCAL" },
    { id: "P1", label: "Host name", value: "CLAIMS400" },
    { id: "P2", label: "Default router", value: "10.10.10.1" },
    { id: "P3", label: "Host server job name", value: "*NETSRV" },
  ], "Lab records network attribute changes for CLAIMS-007 boundary review.");
}
