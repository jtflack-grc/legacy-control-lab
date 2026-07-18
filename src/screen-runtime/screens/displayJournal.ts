import type { ScreenDefinition } from "../screen.js";
import { listAuditJournalEntries, type AuditJournalEntry } from "../../ibmi-runtime/auditJournalService.js";
import {
  commandField,
  createInfoScreen,
  ibmColumnHeader,
  ibmOptionLegend,
  ibmOptionPrompt,
  ibmScreenHeader,
  outputField,
  SUBFILE_VISIBLE_ROWS,
  subfilePageIndicator,
  subfileScreenFooter,
} from "./screenHelpers.js";
import { journalEntryMessage, journalJobName, splitJournalEntryTime } from "./journalFormat.js";

export type JournalScreenOptions = {
  journal?: string;
  library?: string;
  entryTypes?: string;
  entries?: AuditJournalEntry[];
  page?: number;
};

export function createDisplayJournalScreen(
  systemName: string,
  _userName: string,
  options: JournalScreenOptions = {},
  screenId: ScreenDefinition["id"] = "DSPJRN",
  title = "Display Journal Entries",
): ScreenDefinition {
  const journal = options.journal ?? "QAUDJRN";
  const library = options.library ?? "QSYS";
  const entryTypes = options.entryTypes ?? "*ALL";
  const allEntries = options.entries ?? listAuditJournalEntries(systemName);
  const page = options.page ?? 0;
  const start = page * SUBFILE_VISIBLE_ROWS;
  const journalEntries = allEntries.slice(start, start + SUBFILE_VISIBLE_ROWS);

  const fields = [
    ibmScreenHeader(screenId, title, systemName),
    outputField("BLANK1", 2, 1, " ".repeat(80)),
    outputField("JRN", 3, 6, `Journal  . . . . . . . . . . . . . . . . . . . : ${journal}`),
    outputField("LIB", 4, 6, `Library  . . . . . . . . . . . . . . . . . . . : ${library}`),
    outputField("ENTTYP", 5, 6, `Entry type . . . . . . . . . . . . . . . . . . : ${entryTypes}`),
    ibmOptionPrompt("OPTS", 6, 6, "Type options, press Enter."),
    ibmOptionLegend("OPT_HINT", 7, 6, "  5=Display entry details"),
    ibmColumnHeader(9, 6, "Opt  Date      Time      Type  User        Job        Message", "COLHDR"),
  ];

  journalEntries.forEach((entry, index) => {
    const row = 10 + index;
    const { date, time } = splitJournalEntryTime(entry.entryTime);
    const job = journalJobName(entry.userName);
    const message = journalEntryMessage(entry);
    fields.push(commandField(`JOPT${index}`, row, 6, 2));
    const line = `${date.padEnd(9)} ${time.padEnd(9)} ${entry.entryType.padEnd(4)} ${entry.userName.padEnd(11)} ${job.padEnd(10)} ${message}`;
    fields.push(outputField(`ENT${index}`, row, 10, line.slice(0, 71)));
  });

  if (allEntries.length === 0) {
    fields.push(outputField("EMPTY", 10, 6, "No journal entries match selection."));
  }

  const pageStatus = subfilePageIndicator(page, allEntries.length);
  if (pageStatus) {
    fields.push(outputField("PAGE", 20, 71, pageStatus.padStart(9)));
  }

  fields.push(
    ...subfileScreenFooter(
      "F3=Exit   F5=Refresh   F7=Page up   F8=Page down   F11=Job IP   F12=Cancel",
      "",
      false,
    ),
  );

  return {
    id: screenId,
    title,
    rows: 24,
    cols: 80,
    commandLine: true,
    fields,
    functionKeys: [
      { key: "F3", label: "Exit", action: "EXIT_MENU" },
      { key: "F5", label: "Refresh", action: "REFRESH" },
      { key: "F7", label: "Page up", action: "PAGE_UP" },
      { key: "F8", label: "Page down", action: "PAGE_DOWN" },
      { key: "F11", label: "Display job/source IP", action: "DISPLAY_JOB" },
      { key: "F12", label: "Cancel", action: "CANCEL" },
    ],
  };
}

export function createJournalEntryDetailScreen(
  systemName: string,
  userName: string,
  entry: AuditJournalEntry,
): ScreenDefinition {
  const { date, time } = splitJournalEntryTime(entry.entryTime);
  return createInfoScreen("DSPJRN", "Display Journal Entry", systemName, userName, [
    `Date . . . . . . . . . . . . . : ${date}`,
    `Time . . . . . . . . . . . . . : ${time}`,
    `Type . . . . . . . . . . . . . : ${entry.entryType}`,
    `User . . . . . . . . . . . . . : ${entry.userName}`,
    `Job  . . . . . . . . . . . . . : ${journalJobName(entry.userName)}`,
    `Object . . . . . . . . . . . . : ${entry.objectRef}`,
    `Message  . . . . . . . . . . . : ${entry.message ?? ""}`,
  ]);
}

export function getJournalEntriesForScreen(
  systemName: string,
  filter?: { entryType?: string; userName?: string },
): AuditJournalEntry[] {
  return listAuditJournalEntries(systemName, filter);
}
