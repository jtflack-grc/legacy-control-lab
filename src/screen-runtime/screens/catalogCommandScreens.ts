import type { CatalogCommandDefinition } from "../../catalog/commandTypes.js";
import type { IbmiSession } from "../../ibmi-runtime/sessionService.js";
import type { ParsedCommand } from "../../ibmi-runtime/commandParser.js";
import { getParameter } from "../../ibmi-runtime/commandParser.js";
import {
  detailLinesForCatalogCommand,
  listRowsForCatalogCommand,
} from "../../ibmi-runtime/catalogDataProviders.js";
import { workOptionHintFromMatrix } from "../../ibm74/referenceScreenService.js";
import type { ScreenDefinition, ScreenField } from "../screen.js";
import {
  commandField,
  ibmColumnHeader,
  ibmScreenHeader,
  outputField,
  subfileScreenFooter,
} from "./screenHelpers.js";

export type CatalogVerbFamily =
  | "work"
  | "display"
  | "change"
  | "create"
  | "delete"
  | "action"
  | "control"
  | "backup"
  | "network"
  | "prompt";

export function catalogVerbFamily(commandName: string): CatalogVerbFamily {
  const upper = commandName.toUpperCase();
  if (upper.startsWith("WRK")) return "work";
  if (upper.startsWith("DSP")) return "display";
  if (upper.startsWith("CHG")) return "change";
  if (upper.startsWith("CRT")) return "create";
  if (upper.startsWith("DLT")) return "delete";
  if (upper.startsWith("STR") || upper.startsWith("END")) return "control";
  if (upper.startsWith("SAV") || upper.startsWith("RST")) return "backup";
  if (
    upper.startsWith("CFG") ||
    upper.startsWith("NET") ||
    upper.includes("TCP") ||
    upper.includes("FTP") ||
    upper.includes("LPD")
  ) {
    return "network";
  }
  if (
    upper.startsWith("ADD") ||
    upper.startsWith("RMV") ||
    upper.startsWith("SND") ||
    upper.startsWith("RCV") ||
    upper.startsWith("CLR") ||
    upper.startsWith("HLD") ||
    upper.startsWith("RLS") ||
    upper.startsWith("SBM") ||
    upper.startsWith("CPY") ||
    upper.startsWith("MOV") ||
    upper.startsWith("MKD") ||
    upper.startsWith("RNM") ||
    upper.startsWith("MON") ||
    upper.startsWith("OPN") ||
    upper.startsWith("OVR") ||
    upper.startsWith("EDT") ||
    upper.startsWith("RUN") ||
    upper.startsWith("RGZ") ||
    upper.startsWith("PWR")
  ) {
    return "action";
  }
  return "prompt";
}

function workColumnHeader(category: string, commandName: string): string {
  if (commandName.includes("LIB")) return "Library     Type        Text";
  if (category === "job_batch") return "Job     User       Job name     Status";
  if (category === "spool_print") return "File       User       Status   Spool";
  if (category === "message_queue") return "ID      Sev      Message";
  if (category === "network_tcpip") return "Service     Status      Description";
  return "Object / entry";
}

function extractParameters(parsed: ParsedCommand | undefined): Record<string, string> {
  if (!parsed) return {};
  const params: Record<string, string> = { ...parsed.parameters };
  for (const [index, positional] of parsed.positionals.entries()) {
    params[`POS${index + 1}`] = positional;
  }
  return params;
}

function createWorkWithCatalogScreen(
  definition: CatalogCommandDefinition,
  session: IbmiSession,
  parsed?: ParsedCommand,
): ScreenDefinition {
  const rows = listRowsForCatalogCommand(definition, session);
  const columnHeader = workColumnHeader(definition.category, definition.name);
  const fields: ScreenField[] = [
    ibmScreenHeader(definition.name, definition.displayName, session.systemName),
    outputField("OPT", 3, 6, "Type options, press Enter."),
    outputField("OPTS", 4, 6, workOptionHintFromMatrix(definition.name, definition.category)),
    outputField("LIST", 6, 6, columnHeader),
    ibmColumnHeader(6, 6, columnHeader),
  ];

  const objParam = parsed ? getParameter(parsed, "OBJ") : undefined;
  if (objParam) {
    fields.push(outputField("FILTER", 2, 6, `Object  . . . . . . . . . . . : ${objParam}`));
  }

  rows.slice(0, 10).forEach((row, index) => {
    const lineRow = 7 + index;
    fields.push(commandField(`WOPT${index}`, lineRow, 6, 2));
    fields.push(outputField(`WROW${index}`, lineRow, 10, row.line.slice(0, 70)));
  });

  if (rows.length === 0) {
    fields.push(outputField("EMPTY", 7, 10, "No entries found."));
  }

  fields.push(...subfileScreenFooter("F3=Exit   F5=Refresh   F12=Cancel"));

  return {
    id: definition.name as ScreenDefinition["id"],
    title: definition.displayName,
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

function createDisplayCatalogScreen(
  definition: CatalogCommandDefinition,
  session: IbmiSession,
  parsed?: ParsedCommand,
): ScreenDefinition {
  const params = extractParameters(parsed);
  const lines = detailLinesForCatalogCommand(definition, session, params);
  const fields: ScreenField[] = [
    ibmScreenHeader(definition.name, definition.displayName, session.systemName),
    outputField("TITLE", 3, 2, definition.displayName.slice(0, 76)),
  ];

  lines.slice(0, 16).forEach((line, index) => {
    const fieldId = index === 0 ? "BODY" : `L${index}`;
    fields.push(outputField(fieldId, 4 + index, 2, line.slice(0, 76)));
  });

  fields.push(outputField("FKEYS", 24, 2, "F3=Exit   F1=Help   F12=Cancel"));

  return {
    id: definition.name as ScreenDefinition["id"],
    title: definition.displayName,
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

function createParameterEntryScreen(
  definition: CatalogCommandDefinition,
  session: IbmiSession,
  parsed: ParsedCommand | undefined,
  mode: "change" | "create" | "delete" | "action" | "control" | "backup" | "network" | "prompt",
): ScreenDefinition {
  const verb =
    mode === "change"
      ? "Change"
      : mode === "create"
        ? "Create"
        : mode === "delete"
          ? "Delete"
          : mode === "backup"
            ? "Save/Restore"
            : "Command";
  const fields: ScreenField[] = [
    ibmScreenHeader(definition.name, definition.displayName, session.systemName),
    outputField("TITLE", 3, 6, `${verb} — ${definition.displayName}`),
    outputField("BODY", 4, 6, definition.helpText?.slice(0, 74) ?? "Enter parameters and press Enter."),
    outputField("BLANK", 5, 1, " ".repeat(80)),
  ];

  const parameters = definition.parameters ?? [];
  if (parameters.length === 0) {
    fields.push(outputField("HINT", 7, 6, "Press Enter to run, F3 to cancel."));
  } else {
    parameters.slice(0, 8).forEach((param, index) => {
      const row = 7 + index;
      const label = (param.label ?? param.name).padEnd(28);
      const current = parsed ? (getParameter(parsed, param.name) ?? "") : "";
      fields.push(outputField(`LBL${index}`, row, 6, `${label} . . . :`));
      fields.push(commandField(`P${param.name}`, row, 37, 40, current));
    });
  }

  fields.push(outputField("MSG", 20, 6, " ".repeat(74)));
  fields.push(outputField("SEL", 21, 1, "Parameters or command"));
  fields.push(outputField("CMDPFX", 22, 1, "===>"));
  fields.push(commandField("COMMAND", 22, 6, 74, definition.name));
  fields.push(outputField("FKEYS", 24, 2, "F3=Exit   F4=Prompt   F12=Cancel"));

  return {
    id: definition.name as ScreenDefinition["id"],
    title: definition.displayName,
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

export function createCatalogCommandScreen(
  definition: CatalogCommandDefinition,
  session: IbmiSession,
  parsed?: ParsedCommand,
): ScreenDefinition {
  const family = catalogVerbFamily(definition.name);
  switch (family) {
    case "work":
      return createWorkWithCatalogScreen(definition, session, parsed);
    case "display":
      return createDisplayCatalogScreen(definition, session, parsed);
    case "change":
    case "create":
    case "delete":
    case "action":
    case "control":
    case "backup":
    case "network":
    case "prompt":
      return createParameterEntryScreen(definition, session, parsed, family);
  }
}
