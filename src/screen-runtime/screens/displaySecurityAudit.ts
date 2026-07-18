import type { ScreenDefinition } from "../screen.js";
import type { AuditJournalEntry } from "../../ibmi-runtime/auditJournalService.js";
import { getSystemValue } from "../../ibmi-runtime/systemValueService.js";
import {
  commandField,
  ibmColumnHeader,
  ibmOptionLegend,
  ibmOptionPrompt,
  ibmScreenHeader,
  outputField,
  SUBFILE_VISIBLE_ROWS,
  subfilePageIndicator,
  subfileScreenFooter,
} from "./screenHelpers.js";
import { ibmDetailFields } from "./ibmDetailLayout.js";
import { journalEntryMessage, journalJobName, splitJournalEntryTime } from "./journalFormat.js";

export function createDisplaySecurityAuditScreen(
  systemName: string,
  entries: AuditJournalEntry[],
  page = 0,
): ScreenDefinition {
  const qaudctl = getSystemValue("QAUDCTL", systemName)?.value ?? "*OBJAUD";
  const qaudlvl = getSystemValue("QAUDLVL", systemName)?.value ?? "*AUDLVL1";
  const start = page * SUBFILE_VISIBLE_ROWS;
  const visible = entries.slice(start, start + SUBFILE_VISIBLE_ROWS);

  const fields = [
    ibmScreenHeader("DSPSECAUD", "Display Security Audit", systemName),
    outputField("BLANK1", 2, 1, " ".repeat(80)),
    ...ibmDetailFields(4, "JRN", "Security audit journal", "QAUDJRN"),
    ...ibmDetailFields(5, "JLIB", "Journal library", "QSYS"),
    ...ibmDetailFields(6, "AUDCTL", "Auditing control", qaudctl),
    ...ibmDetailFields(7, "AUDLVL", "Auditing level", qaudlvl),
    outputField("NOTE", 8, 6, "Authority failures (AF) below — map to privacy monitoring objectives."),
    ibmOptionPrompt("OPTS", 9, 6, "Type options, press Enter."),
    ibmOptionLegend("OPT_HINT", 10, 6, "  5=Display entry details"),
    ibmColumnHeader(12, 6, "Opt  Date      Time      Type  User        Job        Message"),
  ];

  if (visible.length === 0) {
    fields.push(outputField("EMPTY", 13, 6, "No security audit entries match selection."));
  } else {
    visible.forEach((entry, index) => {
      const row = 13 + index;
      const { date, time } = splitJournalEntryTime(entry.entryTime);
      const job = journalJobName(entry.userName);
      const message = journalEntryMessage(entry);
      fields.push(commandField(`JOPT${index}`, row, 6, 2));
      const line = `${date.padEnd(9)} ${time.padEnd(9)} ${entry.entryType.padEnd(4)} ${entry.userName.padEnd(11)} ${job.padEnd(10)} ${message}`;
      fields.push(outputField(`ENT${index}`, row, 10, line.slice(0, 71)));
    });
  }

  const pageStatus = subfilePageIndicator(page, entries.length);
  if (pageStatus) {
    fields.push(outputField("PAGE", 20, 71, pageStatus.padStart(9)));
  }

  fields.push(
    ...subfileScreenFooter(
      "F3=Exit   F5=Refresh   F7=Page up   F8=Page down   F12=Cancel",
      "",
      false,
    ),
  );

  return {
    id: "DSPSECAUD",
    title: "Display Security Audit",
    rows: 24,
    cols: 80,
    commandLine: true,
    fields,
    functionKeys: [
      { key: "F3", label: "Exit", action: "EXIT_MENU" },
      { key: "F5", label: "Refresh", action: "REFRESH" },
      { key: "F7", label: "Page up", action: "PAGE_UP" },
      { key: "F8", label: "Page down", action: "PAGE_DOWN" },
      { key: "F12", label: "Cancel", action: "CANCEL" },
    ],
  };
}
