import type { ScreenDefinition } from "../screen.js";
import type { IbmiSession } from "../../ibmi-runtime/sessionService.js";
import type { JobSummary } from "../../ibmi-runtime/jobService.js";
import { listJobsByUser } from "../../ibmi-runtime/jobService.js";
import { createDisplayJobAttributesScreen } from "./jobCommandScreens.js";
import { createWorkWithJobMenuScreen } from "./ibmJobScreens.js";

export function toJobSummary(session: IbmiSession): JobSummary {
  const job = session.job;
  return {
    jobNumber: job.jobNumber,
    userName: job.user,
    jobName: job.jobName,
    jobType: job.type === "BATCH" ? "BATCH" : "INT",
    subsystem: job.subsystem,
    status: job.status,
    jobDescription: job.jobDescription,
    outputQueue: job.outputQueue,
  };
}

export function createDisplayJobFromSummary(
  systemName: string,
  _userName: string,
  job: JobSummary,
): ScreenDefinition {
  return createWorkWithJobMenuScreen(systemName, job);
}

export function createDisplayJobScreen(systemName: string, userName: string, session?: IbmiSession): ScreenDefinition {
  const job = session?.workJobContext ?? (session ? toJobSummary(session) : {
    jobNumber: "123456",
    userName,
    jobName: "QPADEV0001",
    jobType: "INT",
    subsystem: "QINTER",
    status: "ACTIVE",
    jobDescription: "QDFTJOBD",
    outputQueue: "QPRINT",
  });
  return createWorkWithJobMenuScreen(systemName, job);
}

export function createWorkActiveJobsScreen(systemName: string, userName: string, session?: IbmiSession): ScreenDefinition {
  return createDisplayJobScreen(systemName, userName, session);
}

export function resolveJobForMenu(session: IbmiSession): JobSummary | undefined {
  if (session.workJobContext) return session.workJobContext;
  const jobs = listJobsByUser(session.systemName, session.userName ?? "AUDIT");
  return jobs[0] ?? toJobSummary(session);
}

export function createDisplayJobStatusScreen(systemName: string, job: JobSummary): ScreenDefinition {
  return createDisplayJobAttributesScreen(systemName, job);
}
