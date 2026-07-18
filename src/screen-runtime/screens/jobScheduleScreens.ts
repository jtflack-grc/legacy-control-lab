import type { ScreenDefinition } from "../screen.js";
import type { CatalogListRow } from "../../ibmi-runtime/catalogDataProviders.js";
import {
  commandField,
  ibmColumnHeader,
  ibmOptionLegend,
  ibmOptionPrompt,
  ibmScreenHeader,
  outputField,
  SUBFILE_PAGE_FKEYS,
  subfileScreenFooter,
} from "./screenHelpers.js";
import { ibmDetailFields } from "./ibmDetailLayout.js";

export type PayrollJobScheduleEntry = {
  name: string;
  user: string;
  status: string;
  command: string;
  frequency: string;
  scheduledTime: string;
  description: string;
};

export const PAYROLL_JOB_SCHEDULE_ENTRIES: PayrollJobScheduleEntry[] = [
  {
    name: "PAYROLLNGT",
    user: "PAYADMIN",
    status: "*ENABLED",
    command: "CALL PGM(PAYROLL/PAYCLOSE)",
    frequency: "*DAILY",
    scheduledTime: "23:30:00",
    description: "Nightly payroll close — reads PAYMST",
  },
  {
    name: "PAYEXTRCT",
    user: "PAYADMIN",
    status: "*ENABLED",
    command: "SBMJOB CMD(CALL PGM(PAYROLL/PAYAUTHR))",
    frequency: "*WEEKLY",
    scheduledTime: "02:00:00",
    description: "Weekly payroll authority report",
  },
  {
    name: "PAYIFSEXP",
    user: "PAYADMIN",
    status: "*ENABLED",
    command: "CPYTOIMPF FROMFILE(PAYROLL/PAYMST) TOSTMF('/payroll/export/payroll.csv')",
    frequency: "*WEEKLY",
    scheduledTime: "02:15:00",
    description: "IFS export of payroll master — PII path",
  },
];

export function payrollJobScheduleRows(): CatalogListRow[] {
  return PAYROLL_JOB_SCHEDULE_ENTRIES.map((entry) => ({
    line: `${entry.name.padEnd(12)} ${entry.user.padEnd(10)} ${entry.status}`,
    drillDown: { command: "DSPJOBSCDE", input: `DSPJOBSCDE JOBSCDE(${entry.name})` },
  }));
}

export function createWorkJobScheduleEntriesScreen(
  systemName: string,
  rows: CatalogListRow[],
): ScreenDefinition {
  const fields = [
    ibmScreenHeader("WRKJOBSCDE", "Work with Job Schedule Entries", systemName),
    outputField("BLANK1", 2, 1, " ".repeat(80)),
    ibmOptionPrompt("OPTS", 3, 6, "Type options, press Enter."),
    ibmOptionLegend("OPT_HINT", 4, 6, "  2=Change   5=Display   6=Display job log"),
    ibmColumnHeader(6, 6, "Opt   Job          User       Status", "COLHDR"),
  ];

  rows.slice(0, 10).forEach((row, index) => {
    const lineRow = 7 + index;
    fields.push(commandField(`WOPT${index}`, lineRow, 6, 2));
    fields.push(outputField(`WROW${index}`, lineRow, 10, row.line.slice(0, 68)));
  });

  if (rows.length === 0) {
    fields.push(outputField("EMPTY", 7, 10, "No job schedule entries found."));
  }

  fields.push(...subfileScreenFooter(SUBFILE_PAGE_FKEYS));

  return {
    id: "WRKJOBSCDE",
    title: "Work with Job Schedule Entries",
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

export function createDisplayJobScheduleEntryScreen(
  systemName: string,
  entryId: string,
): ScreenDefinition {
  const entry =
    PAYROLL_JOB_SCHEDULE_ENTRIES.find((row) => row.name === entryId.toUpperCase()) ??
    PAYROLL_JOB_SCHEDULE_ENTRIES[0]!;

  const fields = [
    ibmScreenHeader("DSPJOBSCDE", "Display Job Schedule Entry", systemName),
    outputField("BLANK1", 2, 1, " ".repeat(80)),
    ...ibmDetailFields(4, "JOB", "Job schedule entry", entry.name),
    ...ibmDetailFields(5, "USER", "User profile", entry.user),
    ...ibmDetailFields(6, "STAT", "Status", entry.status),
    ...ibmDetailFields(7, "CMD", "Command", entry.command.slice(0, 33)),
    ...ibmDetailFields(8, "FREQ", "Frequency", entry.frequency),
    ...ibmDetailFields(9, "TIME", "Scheduled time", entry.scheduledTime),
    ...ibmDetailFields(10, "TEXT", "Text description", entry.description.slice(0, 33)),
  ];

  if (entry.name === "PAYIFSEXP") {
    fields.push(
      outputField(
        "PII",
        12,
        6,
        "Privacy: exports PAYMST (SSN) to IFS — verify encryption & approval.",
      ),
    );
  }

  fields.push(outputField("FKEYS", 23, 1, "F3=Exit   F12=Cancel".padEnd(80)));

  return {
    id: "DSPJOBSCDE",
    title: "Display Job Schedule Entry",
    rows: 24,
    cols: 80,
    fields,
    functionKeys: [
      { key: "F3", label: "Exit", action: "EXIT_MENU" },
      { key: "F12", label: "Cancel", action: "CANCEL" },
    ],
  };
}
