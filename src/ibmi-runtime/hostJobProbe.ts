import { execSync } from "node:child_process";
import type { JobSummary } from "./jobService.js";
import { aliasForComm } from "./pase/paseCommAliases.js";

function parsePsLine(line: string): JobSummary | undefined {
  const trimmed = line.trim();
  if (!trimmed) return undefined;

  const match = trimmed.match(/^(\d+)\s+(\S+)\s+(\S+)\s+([\d.]+)\s+(\S+)/);
  if (!match) return undefined;

  const [, pid, user, comm, pcpu] = match;
  const alias = aliasForComm(comm ?? "");
  const cpu = Number.parseFloat(pcpu ?? "0");

  return {
    jobNumber: String(pid).padStart(6, "0").slice(-6),
    userName: alias.user.slice(0, 10),
    jobName: alias.jobName.slice(0, 10),
    jobType: "BATCH",
    subsystem: alias.subsystem,
    status: "ACTIVE",
    jobDescription: alias.functionName,
    outputQueue: "QPRINT",
    cpuPercent: Number.isFinite(cpu) ? cpu : 0,
    functionName: alias.functionName,
    hostProbe: true,
  };
}

/** Build a job log from the live Linux process when LIVE_HOST_JOBS maps ps rows. */
export function probeHostJobLog(jobNumber?: string): string[] | undefined {
  if (process.env.LIVE_HOST_JOBS !== "true" || !jobNumber) return undefined;

  const pid = Number.parseInt(jobNumber, 10);
  if (!Number.isFinite(pid) || pid <= 0) return undefined;

  try {
    const output = execSync(`ps -p ${pid} -o user=,pid=,comm=,pcpu=,etime=,args= --no-headers`, {
      encoding: "utf8",
      timeout: 2000,
      stdio: ["ignore", "pipe", "ignore"],
    });
    const line = output.trim();
    if (!line) return undefined;

    const match = line.match(/^(\S+)\s+(\d+)\s+(\S+)\s+([\d.]+)\s+(\S+)\s+(.*)$/);
    if (!match) return undefined;

    const [, user, , comm, pcpu, etime, args] = match;
    const alias = aliasForComm(comm ?? "");

    return [
      `CPI1126 - Job ${jobNumber} active on subsystem ${alias.subsystem}.`,
      `     Job name . . . . . . . . . . : ${alias.jobName}`,
      `     User . . . . . . . . . . . . : ${alias.user}`,
      `     Function . . . . . . . . . . : ${alias.functionName}`,
      `     Host user  . . . . . . . . . : ${user}`,
      `     Host command . . . . . . . . : ${comm}`,
      `     CPU percent  . . . . . . . . : ${pcpu}`,
      `     Elapsed time . . . . . . . . : ${etime}`,
      `     Command line . . . . . . . . : ${(args ?? "").slice(0, 58)}`,
    ];
  } catch {
    return undefined;
  }
}

/** When LIVE_HOST_JOBS=true, sample container processes via ps and map to IBM i job rows. */
export function probeHostActiveJobs(): JobSummary[] {
  if (process.env.LIVE_HOST_JOBS !== "true") return [];

  try {
    const output = execSync("ps -eo pid=,user:20,comm=,pcpu=,stat= --no-headers", {
      encoding: "utf8",
      timeout: 2000,
      stdio: ["ignore", "pipe", "ignore"],
    });

    const jobs: JobSummary[] = [];
    for (const line of output.split(/\r?\n/)) {
      const job = parsePsLine(line);
      if (!job) continue;
      if (job.jobName === "PS" || job.jobName === "SH") continue;
      jobs.push(job);
    }

    return jobs
      .sort((a, b) => (b.cpuPercent ?? 0) - (a.cpuPercent ?? 0))
      .slice(0, 12);
  } catch {
    return [];
  }
}
