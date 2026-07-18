import type { ScreenDefinition } from "../screen.js";
import type { JobSummary } from "../../ibmi-runtime/jobService.js";
import { createDisplayJobLogPanelScreen } from "./ibmJobScreens.js";
import { resolveJobForMenu, toJobSummary } from "./displayJob.js";
import type { IbmiSession } from "../../ibmi-runtime/sessionService.js";

export function createDisplayJobLogScreen(
  systemName: string,
  userName: string,
  attemptId?: string,
  session?: IbmiSession,
  showAll = false,
): ScreenDefinition {
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
  return createDisplayJobLogPanelScreen(systemName, userName, job, attemptId, showAll);
}

export function createDisplayJobLogForSession(session: IbmiSession): ScreenDefinition {
  const job = resolveJobForMenu(session);
  if (!job) {
    return createDisplayJobLogPanelScreen(
      session.systemName,
      session.userName ?? "",
      toJobSummary(session),
      session.missionAttemptId,
      session.jobLogShowAll,
    );
  }
  return createDisplayJobLogPanelScreen(
    session.systemName,
    session.userName ?? "",
    job,
    session.missionAttemptId,
    session.jobLogShowAll,
  );
}
