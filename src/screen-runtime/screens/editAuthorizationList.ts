import type { ScreenDefinition } from "../screen.js";
import type { IbmiSession } from "../../ibmi-runtime/sessionService.js";
import {
  listAuthorizationLists,
  type AuthListEntry,
  type AuthListMember,
  PAYROLL_AUTL_MEMBERS,
} from "./spoolNetworkScreens.js";
import {
  commandField,
  ibmOptionLegend,
  ibmOptionPrompt,
  ibmScreenHeader,
  outputField,
  subfileScreenFooter,
} from "./screenHelpers.js";
import { ibmDetailFields } from "./ibmDetailLayout.js";

export type AutlEditContext = {
  listName: string;
  members: AuthListMember[];
};

function resolveListEntry(listName: string): AuthListEntry {
  return (
    listAuthorizationLists().find((row) => row.name === listName.toUpperCase()) ??
    listAuthorizationLists()[0]!
  );
}

export function defaultAutlMembers(listName: string): AuthListMember[] {
  const entry = resolveListEntry(listName);
  if (entry.name === "PAYROLL") {
    return PAYROLL_AUTL_MEMBERS.map((member) => ({ ...member }));
  }
  return PAYROLL_AUTL_MEMBERS.slice(0, 2).map((member) => ({ ...member }));
}

export function ensureAutlEditContext(session: IbmiSession, listName: string): AutlEditContext {
  const normalized = listName.toUpperCase();
  if (session.autlEditContext?.listName === normalized) {
    return session.autlEditContext;
  }
  session.autlEditContext = {
    listName: normalized,
    members: defaultAutlMembers(normalized),
  };
  return session.autlEditContext;
}

export function createEditAuthorizationListScreen(
  systemName: string,
  listName: string,
  members: AuthListMember[],
): ScreenDefinition {
  const entry = resolveListEntry(listName);
  const visible = members.slice(0, 12);

  const fields = [
    ibmScreenHeader("EDTAUTL", "Edit Authorization List", systemName),
    outputField("BLANK1", 2, 1, " ".repeat(80)),
    ...ibmDetailFields(4, "AUTL", "Authorization list", entry.name),
    ...ibmDetailFields(5, "LIB", "Library", entry.library),
    ...ibmDetailFields(6, "TEXT", "Description", entry.description.slice(0, 33)),
    ...ibmDetailFields(
      7,
      "PUBAUT",
      "Public authority",
      entry.name === "PAYROLL" ? "*EXCLUDE" : "*USE",
    ),
    ibmOptionPrompt("OPTS", 9, 6),
    ibmOptionLegend("OPT_HINT", 10, 6, "  4=Remove"),
    outputField("MBR_HDR", 11, 6, "User profile      Authority"),
  ];

  visible.forEach((member, index) => {
    const row = 12 + index;
    fields.push(commandField(`UOPT${index}`, row, 6, 2));
    const line = `${member.user.padEnd(18)} ${member.authority}`;
    fields.push(outputField(`USR${index}`, row, 10, line.padEnd(74).slice(0, 74)));
  });

  if (entry.name === "PAYROLL") {
    fields.push(
      outputField(
        "NOTE",
        12 + visible.length + 1,
        6,
        "Clause 10: tighten PAYROLL autl — align with PAYMST remediation.",
      ),
    );
  }

  fields.push(
    ...subfileScreenFooter("F3=Exit   F4=Prompt   F5=Refresh   F6=Add   F12=Cancel", "", false),
  );

  return {
    id: "EDTAUTL",
    title: "Edit Authorization List",
    rows: 24,
    cols: 80,
    commandLine: true,
    fields,
    functionKeys: [
      { key: "F3", label: "Exit", action: "EXIT_MENU" },
      { key: "F4", label: "Prompt", action: "PROMPT" },
      { key: "F5", label: "Refresh", action: "REFRESH" },
      { key: "F6", label: "Add", action: "ADD_ROW" },
      { key: "F12", label: "Cancel", action: "CANCEL" },
    ],
  };
}
