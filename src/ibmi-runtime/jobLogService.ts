import { listRuntimeJobLog } from "../db/repositories/runtimeRepository.js";
import { probeHostJobLog } from "./hostJobProbe.js";

export type JobLogEntry = {
  jobNumber: string;
  userName: string;
  jobName: string;
  lines: string[];
};

const catalogs = new Map<string, JobLogEntry[]>();

export function reloadJobLogCatalog(systemName: string, entries: JobLogEntry[]): void {
  catalogs.set(systemName, entries.map((entry) => ({ ...entry, lines: [...entry.lines] })));
}

export function getJobLog(
  systemName: string,
  jobNumber?: string,
  userName?: string,
  attemptId?: string,
): string[] {
  const hostLines = probeHostJobLog(jobNumber);
  if (hostLines) return hostLines;

  const entries = catalogs.get(systemName) ?? [];
  const match =
    entries.find((entry) => jobNumber && entry.jobNumber === jobNumber) ??
    entries.find((entry) => userName && entry.userName.toUpperCase() === userName.toUpperCase()) ??
    entries[0];
  const baseLines = match?.lines ?? [
    "CPF1122 - Job started on subsystem QINTER.",
    "CPF9898 - User profile AUDIT used for sign-on.",
    "CPI1126 - Library list retrieved.",
  ];

  if (!attemptId) {
    return baseLines;
  }

  const runtimeLines = listRuntimeJobLog(attemptId).map((row) => row.messageText);
  return [...baseLines, ...runtimeLines];
}
