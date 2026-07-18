import type { ScreenDefinition } from "../screen.js";
import type { JobSummary } from "../../ibmi-runtime/jobService.js";
import {
  commandField,
  ibmColumnHeader,
  ibmScreenHeader,
  outputField,
  subfileScreenFooter,
} from "./screenHelpers.js";
import { createWorkActiveJobsScreen as createActJobScreen } from "./ibmJobScreens.js";

export function createWorkJobsScreen(
  systemName: string,
  title: string,
  screenId: ScreenDefinition["id"],
  jobs: JobSummary[],
  page = 0,
): ScreenDefinition {
  if (screenId === "WRKACTJOB") {
    return createActJobScreen(systemName, jobs, page);
  }

  const commandName = screenId;
  const fields = [
    ibmScreenHeader(commandName, title, systemName),
    outputField("BLANK1", 2, 1, " ".repeat(80)),
    outputField("OPTS", 3, 6, "Type options, press Enter."),
    outputField("OPT_HINT", 4, 6, "  5=Work with"),
    ibmColumnHeader(6, 6, "Opt  Job        User        Type         Subsystem  Status"),
  ];

  jobs.slice(0, 12).forEach((job, index) => {
    const row = 7 + index;
    fields.push(commandField(`JOPT${index}`, row, 6, 2));
    const line = `${job.jobName.padEnd(11)} ${job.userName.padEnd(11)} ${job.jobType.padEnd(12)} ${job.subsystem.padEnd(10)} ${job.status}`;
    fields.push(outputField(`JOB${index}`, row, 10, line.slice(0, 71)));
  });

  if (jobs.length === 0) {
    fields.push(outputField("EMPTY", 7, 10, "No jobs found."));
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

export { createActJobScreen as createWorkActiveJobsScreen };
