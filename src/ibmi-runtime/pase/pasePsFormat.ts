import type { IbmiSession } from "../sessionService.js";
import { aliasForComm } from "./paseCommAliases.js";
import { runQshShellCommand } from "./qshellShell.js";

export type PasePsRow = {
  pid: string;
  user: string;
  comm: string;
  etime?: string;
  pcpu?: string;
  args?: string;
};

function probePsRows(): PasePsRow[] {
  const result = runQshShellCommand("ps -eo pid=,user:12,comm=,etime=,pcpu=,args= 2>/dev/null || ps -e", {
    cwd: process.cwd(),
    env: process.env,
    timeout: 3000,
    maxBuffer: 512 * 1024,
  });
  if (result.status !== 0 && !result.stdout) return [];

  const rows: PasePsRow[] = [];
  for (const line of String(result.stdout).split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    const match = trimmed.match(/^(\d+)\s+(\S+)\s+(\S+)\s+(\S+)\s+([\d.]+)\s+(.*)$/);
    if (!match) continue;
    const [, pid, user, comm, etime, pcpu, args] = match;
    const base = (comm ?? "").toLowerCase();
    if (base === "ps" || base === "sh" || base === "bash") continue;
    rows.push({ pid: pid!, user: user!, comm: comm!, etime, pcpu, args });
  }
  return rows.slice(0, 20);
}

/** IBM i–styled process list for QSH ps (maps host PID → job name per redbook getjobid pattern). */
export function formatPasePsOutput(session: IbmiSession): string[] {
  const rows = probePsRows();
  const job = session.job;
  const sessionLine = `${job.jobNumber}/${(session.userName ?? "QUSER").toUpperCase()}/${job.jobName} ${process.pid}`;

  if (rows.length === 0) {
    return [
      "  PID     USER        JOB         SUBSYSTEM  COMMAND",
      `  ${String(process.pid).padEnd(8)}${(session.userName ?? "AUDIT").toUpperCase().padEnd(12)}${job.jobName.padEnd(12)}${job.subsystem.padEnd(11)}qsh`,
      "",
      `Current shell job: ${sessionLine}`,
      "Tip: getjobid $$  or  system WRKACTJOB",
    ];
  }

  const lines = [
    "  PID     USER        IBM i JOB   SUBSYSTEM  ELAPSED  COMMAND",
    ...rows.map((row) => {
      const alias = aliasForComm(row.comm);
      return [
        row.pid.padEnd(8),
        row.user.padEnd(12),
        alias.jobName.padEnd(12),
        alias.subsystem.padEnd(11),
        (row.etime ?? "").padEnd(9),
        (row.args ?? row.comm).slice(0, 28),
      ].join("");
    }),
    "",
    `Current shell job: ${sessionLine}`,
    "Tip: getjobid $$  or  system WRKACTJOB",
  ];
  return lines;
}
