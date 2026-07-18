import type { ScreenDefinition } from "../screen.js";
import type { JobSummary } from "../../ibmi-runtime/jobService.js";
import { getJobLog } from "../../ibmi-runtime/jobLogService.js";
import { getSystemStatus } from "../../ibmi-runtime/systemMonitorService.js";
import {
  WRKACTJOB_COLUMNS,
  WRKACTJOB_WIDTHS,
  wrkActJobCell,
  wrkActJobColumnHeaderLine,
  wrkActJobCpuCell,
} from "./ibmDetailLayout.js";
import {
  commandField,
  ibmBannerField,
  ibmColumnHeader,
  ibmHiOutput,
  ibmOptionLegend,
  ibmOptionPrompt,
  ibmScreenHeader,
  MENU_LAYOUT,
  menuCommandFooter,
  outputField,
  sliceSubfilePage,
  SUBFILE_LAYOUT,
  SUBFILE_PAGE_FKEYS,
  subfilePageIndicator,
  subfilePagedFunctionKeys,
  subfileScreenFooter,
} from "./screenHelpers.js";

const ACTJOB_DATA_ROWS = 7;
const ACTJOB_FIRST_ROW = 9;
const ACTJOB_COLHDR_ROW = 8;

export type ActiveJobTreeRow =
  | { kind: "subsystem"; name: string; user: string; status: string }
  | { kind: "job"; job: JobSummary };

export function buildActiveJobTreeRows(jobs: JobSummary[]): ActiveJobTreeRow[] {
  const bySubsystem = new Map<string, JobSummary[]>();
  for (const job of jobs) {
    const key = job.subsystem.toUpperCase();
    if (!bySubsystem.has(key)) bySubsystem.set(key, []);
    bySubsystem.get(key)!.push(job);
  }

  const rows: ActiveJobTreeRow[] = [];
  for (const [subsystem, sbsJobs] of [...bySubsystem.entries()].sort(([a], [b]) => a.localeCompare(b))) {
    rows.push({
      kind: "subsystem",
      name: subsystem,
      user: sbsJobs[0]?.userName === "QSYS" ? "QSYS" : sbsJobs[0]?.userName ?? "QSYS",
      status: "DEQW",
    });
    for (const job of sbsJobs) {
      rows.push({ kind: "job", job });
    }
  }
  return rows;
}

export function countActiveJobTreeRows(jobs: JobSummary[]): number {
  return buildActiveJobTreeRows(jobs).length;
}

function actJobTypeCode(jobType: string): string {
  switch (jobType.toUpperCase()) {
    case "INTERACTIVE":
      return "PJ";
    case "BATCH":
      return "BCH";
    default:
      return jobType.slice(0, WRKACTJOB_WIDTHS.type).toUpperCase();
  }
}

function actJobStatusCode(status: string): string {
  switch (status.toUpperCase()) {
    case "ACTIVE":
      return "RUN";
    case "HELD":
      return "HLD";
    case "WAIT":
      return "TIMW";
    default:
      return status.slice(0, WRKACTJOB_WIDTHS.status).toUpperCase();
  }
}

function actJobCpuValue(job: JobSummary): number {
  if (job.cpuPercent !== undefined) return job.cpuPercent;
  return job.status === "ACTIVE" && job.jobType === "INTERACTIVE" ? 0.1 : 0;
}

function actJobFunction(job: JobSummary): string {
  if (job.functionName) return job.functionName;
  if (job.jobType === "BATCH") return job.jobName;
  if (job.jobName.startsWith("QPADE")) return "QCMD";
  return job.jobDescription || "QCMD";
}

function appendActJobSubsystemRow(
  fields: ScreenDefinition["fields"],
  row: number,
  index: number,
  subsystem: string,
  user: string,
  status: string,
): void {
  const c = WRKACTJOB_COLUMNS;
  const w = WRKACTJOB_WIDTHS;
  fields.push(outputField(`SNM${index}`, row, c.name, wrkActJobCell(subsystem, w.name)));
  fields.push(outputField(`SUSR${index}`, row, c.user, wrkActJobCell(user, w.user)));
  fields.push(outputField(`STYP${index}`, row, c.type, wrkActJobCell("SBS", w.type)));
  fields.push(outputField(`SCPU${index}`, row, c.cpu, wrkActJobCpuCell(0)));
  fields.push(outputField(`SFNC${index}`, row, c.function, wrkActJobCell("", w.function)));
  fields.push(outputField(`SSTS${index}`, row, c.status, wrkActJobCell(status, w.status)));
}

function appendActJobJobRow(
  fields: ScreenDefinition["fields"],
  row: number,
  index: number,
  jobIndex: number,
  job: JobSummary,
): void {
  const c = WRKACTJOB_COLUMNS;
  const w = WRKACTJOB_WIDTHS;
  fields.push(commandField(`JOPT${jobIndex}`, row, c.opt, w.opt));
  fields.push(outputField(`JNM${index}`, row, c.jobName, wrkActJobCell(job.jobName, w.name)));
  fields.push(outputField(`JUSR${index}`, row, c.user, wrkActJobCell(job.userName, w.user)));
  fields.push(outputField(`JTYP${index}`, row, c.type, wrkActJobCell(actJobTypeCode(job.jobType), w.type)));
  fields.push(outputField(`JCPU${index}`, row, c.cpu, wrkActJobCpuCell(actJobCpuValue(job))));
  fields.push(
    outputField(`JFNC${index}`, row, c.function, wrkActJobCell(actJobFunction(job), w.function)),
  );
  fields.push(
    outputField(`JSTS${index}`, row, c.status, wrkActJobCell(actJobStatusCode(job.status), w.status)),
  );
}

export function createWorkActiveJobsScreen(
  systemName: string,
  jobs: JobSummary[],
  page = 0,
): ScreenDefinition {
  const status = getSystemStatus(systemName);
  const tree = buildActiveJobTreeRows(jobs);
  const visible = sliceSubfilePage(tree, page, ACTJOB_DATA_ROWS);

  const fields: ScreenDefinition["fields"] = [
    ibmScreenHeader("WRKACTJOB", "Work with Active Jobs", systemName),
    outputField(
      "DATE",
      2,
      50,
      new Date()
        .toLocaleString("en-US", {
          month: "2-digit",
          day: "2-digit",
          year: "2-digit",
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          hour12: false,
        })
        .replace(",", ""),
    ),
    ibmBannerField(
      "BANNER",
      3,
      6,
      `CPU %: ${status.percentCpuUsed.toFixed(1).padStart(5)}   Elapsed time: ${status.elapsedTime.padStart(10)}  Active jobs: ${jobs.length}`,
    ),
    outputField("BLANK1", 4, 1, " ".repeat(80)),
    ibmOptionPrompt("OPTS", 5, 6),
    ibmOptionLegend(
      "OPT_HINT1",
      6,
      6,
      "  2=Change   3=Hold   4=End   5=Work with   6=Release   7=Display message",
    ),
    ibmOptionLegend("OPT_HINT2", 7, 6, "  8=Work with spooled files   13=Disconnect"),
    ibmColumnHeader(ACTJOB_COLHDR_ROW, WRKACTJOB_COLUMNS.opt, wrkActJobColumnHeaderLine()),
  ];

  let jobIndex = 0;
  visible.forEach((row, index) => {
    const screenRow = ACTJOB_FIRST_ROW + index;
    if (row.kind === "subsystem") {
      appendActJobSubsystemRow(fields, screenRow, index, row.name, row.user, row.status);
      return;
    }
    appendActJobJobRow(fields, screenRow, index, jobIndex, row.job);
    jobIndex += 1;
  });

  const pageStatus = subfilePageIndicator(page, tree.length, ACTJOB_DATA_ROWS);
  if (pageStatus) {
    fields.push(outputField("PAGE", SUBFILE_LAYOUT.pageHintRow, SUBFILE_LAYOUT.pageHintCol, pageStatus.padStart(9)));
  }

  fields.push(...subfileScreenFooter(SUBFILE_PAGE_FKEYS, "", false));

  return {
    id: "WRKACTJOB",
    title: "Work with Active Jobs",
    rows: 24,
    cols: 80,
    commandLine: true,
    fields,
    functionKeys: subfilePagedFunctionKeys(),
  };
}

const WORK_WITH_JOB_OPTIONS = [
  "     1. Display job status attributes",
  "     2. Display job definition attributes",
  "     3. Display job run attributes, if active",
  "     4. Work with spooled files",
  "    10. Display job log, if active, on job queue, or pending",
  "    11. Display call stack, if active",
  "    12. Work with locks, if active",
  "    13. Display library list, if active",
  "    14. Display open files, if active",
  "    15. Display file overrides, if active",
  "    16. Display commitment control status, if active",
  "    17. Display communications status, if active",
  "    18. Display activation groups, if active",
  "    19. Work with mutexes, if active",
  "    20. Work with threads, if active",
  "    21. Work with media library attributes, if active",
  "    22. Display environment variables, if active",
  "    30. All of the above",
  "    40. Change job",
  "    41. End job",
  "    42. Hold job",
  "    43. Release job",
  "    45. Work with Java Virtual Machine, if active",
];

export function createWorkWithJobMenuScreen(
  systemName: string,
  job: JobSummary,
  commandValue = "",
): ScreenDefinition {
  const fields = [
    ibmScreenHeader("DSPJOB", "Work with Job", systemName),
    outputField("BLANK1", 2, 1, " ".repeat(80)),
    outputField(
      "JOBHDR",
      3,
      6,
      `Job:   ${job.jobName.padEnd(10)} User:   ${job.userName.padEnd(10)} Number:   ${job.jobNumber}`,
    ),
    outputField("BLANK2", 4, 1, " ".repeat(80)),
    outputField("PROMPT", 5, 6, "Select one of the following:"),
    outputField("BLANK3", 6, 1, " ".repeat(80)),
  ];

  const leftCount = Math.ceil(WORK_WITH_JOB_OPTIONS.length / 2);
  WORK_WITH_JOB_OPTIONS.forEach((option, index) => {
    const column = index < leftCount ? 6 : 42;
    const row = MENU_LAYOUT.optionStartRow + (index % leftCount);
    fields.push(outputField(`OPT${index + 1}`, row, column, option));
  });

  fields.push(...menuCommandFooter(commandValue));

  return {
    id: "DSPJOB",
    title: "Work with Job",
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

export function createDisplayJobLogPanelScreen(
  systemName: string,
  userName: string,
  job: JobSummary,
  attemptId?: string,
  showAll = false,
): ScreenDefinition {
  const logLines = getJobLog(systemName, job.jobNumber, job.userName, attemptId);
  const displayLines = showAll ? logLines : logLines.slice(-ACTJOB_DATA_ROWS);

  const fields = [
    ibmHiOutput("TITLE", 1, 30, "Display Job Log".padEnd(50)),
    outputField("SYS", 1, 60, `System: ${systemName}`.slice(0, 20)),
    outputField(
      "JOBHDR",
      2,
      6,
      `Job . . :   ${job.jobName.padEnd(10)}    User . . :   ${job.userName.padEnd(10)}     Number . . . : ${job.jobNumber}`,
    ),
    outputField("BLANK1", 3, 1, " ".repeat(80)),
  ];

  displayLines.forEach((line, index) => {
    const prefix = index === displayLines.length - 1 && !showAll ? ">>" : "  ";
    fields.push(outputField(`LOG${index}`, 4 + index, 6, `${prefix} ${line}`.slice(0, 74)));
  });

  fields.push(
    outputField(
      "FKEYS",
      24,
      1,
      "F3=Exit   F10=Display all messages   F12=Cancel   F17=Top   F18=Bottom".padEnd(80),
    ),
  );

  return {
    id: "DSPJOBLOG",
    title: "Display Job Log",
    rows: 24,
    cols: 80,
    fields,
    functionKeys: [
      { key: "F3", label: "Exit", action: "EXIT_MENU" },
      { key: "F10", label: "Display all messages", action: "DSPJOBLOG_ALL" },
      { key: "F12", label: "Cancel", action: "CANCEL" },
      { key: "F17", label: "Top", action: "PAGE_TOP" },
      { key: "F18", label: "Bottom", action: "PAGE_BOTTOM" },
    ],
  };
}
