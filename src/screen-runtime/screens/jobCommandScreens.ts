import type { ScreenDefinition } from "../screen.js";
import type { JobSummary } from "../../ibmi-runtime/jobService.js";
import type { SubsystemEntry } from "../../ibmi-runtime/subsystemService.js";
import type { SystemStatusSnapshot } from "../../ibmi-runtime/systemMonitorService.js";
import {
  commandField,
  createInfoScreen,
  ibmScreenHeader,
  outputField,
  standardFunctionKeys,
  subfileScreenFooter,
} from "./screenHelpers.js";

function createJobSubfileScreen(
  screenId: ScreenDefinition["id"],
  title: string,
  systemName: string,
  jobs: JobSummary[],
  hint = "  5=Display job",
  options?: { contextLine?: string; contextId?: string },
): ScreenDefinition {
  const jobStartRow = options?.contextLine ? 8 : 7;
  const maxJobs = options?.contextLine ? 10 : 12;
  const fields = [
    ibmScreenHeader(screenId, title, systemName),
    ...(options?.contextLine
      ? [outputField(options.contextId ?? "CTX", 2, 6, options.contextLine)]
      : [outputField("BLANK1", 2, 1, " ".repeat(80))]),
    outputField("OPTS", options?.contextLine ? 4 : 3, 6, "Type options, press Enter."),
    outputField("OPT_HINT", options?.contextLine ? 5 : 4, 6, hint),
    outputField(
      "COLHDR",
      options?.contextLine ? 7 : 6,
      6,
      "Opt  Job        User        Type         Subsystem  Status",
    ),
  ];

  jobs.slice(0, maxJobs).forEach((job, index) => {
    const row = jobStartRow + index;
    fields.push(commandField(`JOPT${index}`, row, 6, 2));
    const line = `${job.jobName.padEnd(11)} ${job.userName.padEnd(11)} ${job.jobType.padEnd(12)} ${job.subsystem.padEnd(10)} ${job.status}`;
    fields.push(outputField(`JOB${index}`, row, 10, line.slice(0, 71)));
  });

  if (jobs.length === 0) {
    fields.push(outputField("EMPTY", jobStartRow, 10, "No jobs found."));
  }

  fields.push(...subfileScreenFooter("F3=Exit   F5=Refresh   F12=Cancel"));

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
      { key: "F12", label: "Cancel", action: "CANCEL" },
    ],
  };
}

export function createWorkJobScreen(systemName: string, jobs: JobSummary[]): ScreenDefinition {
  return createJobSubfileScreen("WRKJOB", "Work with Job", systemName, jobs);
}

export function createWorkSubsystemJobsScreen(
  systemName: string,
  subsystem: string,
  jobs: JobSummary[],
): ScreenDefinition {
  return createJobSubfileScreen("WRKSBSJOB", "Work with Subsystem Jobs", systemName, jobs, "  5=Display job", {
    contextLine: `Subsystem . . . . . . . . . . : ${subsystem}`,
    contextId: "SBS",
  });
}

export function createWorkUserJobsScreen(systemName: string, userName: string, jobs: JobSummary[]): ScreenDefinition {
  return createJobSubfileScreen("WRKUSRJOB", "Work with User Jobs", systemName, jobs, "  5=Display job", {
    contextLine: `User  . . . . . . . . . . . . : ${userName}`,
    contextId: "USR",
  });
}

function jobFunctionLabel(job: JobSummary): string {
  if (job.functionName) return job.functionName;
  if (job.jobType === "BATCH") return job.jobName;
  return "QCMD";
}

export function createDisplayJobAttributesScreen(systemName: string, job: JobSummary): ScreenDefinition {
  const lines = [
    `Job name . . . . . . . . . . . : ${job.jobName}/${job.userName}/${job.jobNumber}`,
    `Job description . . . . . . . : ${job.jobDescription}`,
    `Subsystem . . . . . . . . . . : ${job.subsystem}`,
    `Status . . . . . . . . . . . . : ${job.status}`,
    `Type . . . . . . . . . . . . . : ${job.jobType}`,
    `Output queue . . . . . . . . . : ${job.outputQueue}`,
    `Country ID . . . . . . . . . . : US`,
    `Language ID  . . . . . . . . . : ENU`,
    `Coded character set ID . . . . : 37`,
    `Function . . . . . . . . . . . : ${jobFunctionLabel(job)}`,
  ];

  if (job.cpuPercent !== undefined) {
    lines.push(`% CPU used  . . . . . . . . . . : ${job.cpuPercent.toFixed(1)}`);
  }
  if (job.hostProbe) {
    lines.push(`Host mapping  . . . . . . . . . : LIVE_HOST_JOBS (ps -ef)`);
  }

  const fields: ScreenDefinition["fields"] = [
    ibmScreenHeader("DSPJOBATTR", "Display Job Attributes", systemName),
    outputField("BLANK1", 2, 1, " ".repeat(80)),
  ];

  lines.forEach((line, index) => {
    fields.push(outputField(`LINE${index + 1}`, 4 + index, 6, line.padEnd(74).slice(0, 74)));
  });

  fields.push(standardFunctionKeys());

  return {
    id: "DSPJOBATTR",
    title: "Display Job Attributes",
    rows: 24,
    cols: 80,
    fields,
    functionKeys: [
      { key: "F1", label: "Help", action: "HELP" },
      { key: "F3", label: "Exit", action: "EXIT_MENU" },
      { key: "F12", label: "Cancel", action: "CANCEL" },
    ],
  };
}

export function createDisplaySubsystemScreen(
  systemName: string,
  subsystem: SubsystemEntry,
): ScreenDefinition {
  return createInfoScreen("DSPSBSD", "Display Subsystem Description", systemName, "", [
    `Subsystem . . . . . . . . . . : ${subsystem.name}`,
    `Status  . . . . . . . . . . . : ${subsystem.status}`,
    `Description . . . . . . . . . : ${subsystem.description}`,
    `Library . . . . . . . . . . . : QSYS`,
    `Pool ID . . . . . . . . . . . : *BASE`,
    `Maximum active jobs . . . . . : *NOMAX`,
  ]);
}

export function createDisplaySystemStatusDetailScreen(
  systemName: string,
  status: SystemStatusSnapshot,
): ScreenDefinition {
  return createInfoScreen("DSPSYSSTS", "Display System Status", systemName, "", [
    `System name . . . . . . . . . . : ${status.systemName}`,
    `% CPU used  . . . . . . . . . . : ${status.percentCpuUsed}`,
    `% DB capability . . . . . . . . : ${status.percentDbCapability}`,
    `% system ASP used . . . . . . . : ${status.percentSystemAspUsed}`,
    `Jobs in system  . . . . . . . . : ${status.jobsInSystem}`,
    `Jobs active . . . . . . . . . . : ${status.jobsActive}`,
    `Jobs held . . . . . . . . . . . : ${status.jobsHeld}`,
    `System ASP (GB)  . . . . . . . : ${status.systemAspGb}`,
    `System ASP available (GB)  . . : ${status.systemAspAvailableGb}`,
    `Elapsed time . . . . . . . . . : ${status.elapsedTime}`,
  ]);
}
