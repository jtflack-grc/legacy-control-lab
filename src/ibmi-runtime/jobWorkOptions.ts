import type { JobSummary } from "./jobService.js";
import type { IbmiSession } from "./sessionService.js";
import type { MenuRouteResult } from "./commandHandlers.js";
import { executeCatalogCommand } from "./commandRuntime.js";
import { wrkOptionsFor } from "../ibm74/referenceService.js";
import { createDisplayJobStatusScreen } from "../screen-runtime/screens/displayJob.js";
import { createDisplayJobLogForSession } from "../screen-runtime/screens/displayJobLog.js";

function jobQualifiedName(job: JobSummary): string {
  return `${job.jobNumber}/${job.userName}/${job.jobName}`;
}

/** Route WRKACTJOB / WRKJOB / WRKSBSJOB option digits using navigation graph + stock fallbacks. */
export function routeJobWorkOption(
  session: IbmiSession,
  job: JobSummary,
  option: string,
  screenId = "WRKACTJOB",
): MenuRouteResult | undefined {
  session.workJobContext = job;

  const graphTarget = wrkOptionsFor(screenId)[option];
  if (graphTarget) {
    if (graphTarget === "DSPJOB") {
      return {
        kind: "screen",
        screen: createDisplayJobStatusScreen(session.systemName, job),
      };
    }
    if (graphTarget === "DSPJOBLOG") {
      session.jobLogShowAll = false;
      return { kind: "screen", screen: createDisplayJobLogForSession(session) };
    }
    if (graphTarget === "WRKSPLF") {
      return executeCatalogCommand(
        session,
        "WRKSPLF",
        `WRKSPLF JOB(${jobQualifiedName(job)})`,
      );
    }
    const routed = executeCatalogCommand(
      session,
      graphTarget,
      `${graphTarget} JOB(${jobQualifiedName(job)})`,
    );
    if (routed.kind !== "message" || !routed.message?.includes("not supported")) {
      return routed;
    }
  }

  switch (option) {
    case "5":
      return {
        kind: "screen",
        screen: createDisplayJobStatusScreen(session.systemName, job),
      };
    case "6":
      session.jobLogShowAll = false;
      return { kind: "screen", screen: createDisplayJobLogForSession(session) };
    case "7":
      session.jobLogShowAll = false;
      return { kind: "screen", screen: createDisplayJobLogForSession(session) };
    case "8":
      return executeCatalogCommand(
        session,
        "WRKSPLF",
        `WRKSPLF JOB(${jobQualifiedName(job)})`,
      );
    case "2":
    case "3":
    case "4":
      return {
        kind: "message",
        message: `CPF9801 - Option ${option} not supported in the lab partition.`,
      };
    case "13":
      return { kind: "message", message: "CPI8965 - User not authorized to disconnect job." };
    default:
      return { kind: "message", message: `CPF0006 - Option ${option} not valid for this entry.` };
  }
}

/** DSPJOB menu selection — option 1 shows run/status attributes for the job in context. */
export function routeWorkWithJobMenuOption(
  session: IbmiSession,
  job: JobSummary,
  selection: string,
): MenuRouteResult | undefined {
  if (selection === "1" || selection === "3") {
    return { kind: "screen", screen: createDisplayJobStatusScreen(session.systemName, job) };
  }
  if (selection === "10") {
    session.jobLogShowAll = false;
    return { kind: "screen", screen: createDisplayJobLogForSession(session) };
  }
  if (selection === "4") {
    return executeCatalogCommand(session, "WRKSPLF", "WRKSPLF");
  }
  if (selection) {
    return { kind: "message", message: `CPF0006 - Option ${selection} not supported on this panel.` };
  }
  return undefined;
}
