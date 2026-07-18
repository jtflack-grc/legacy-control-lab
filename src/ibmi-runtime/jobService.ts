import {
  findJob,
  insertJob as insertJobRow,
  listJobs as listJobRows,
  nextJobNumber,
  updateJobStatus,
} from "../db/repositories/jobRepository.js";
import { probeHostActiveJobs } from "./hostJobProbe.js";



export type JobSummary = {
  jobNumber: string;
  userName: string;
  jobName: string;
  jobType: string;
  subsystem: string;
  status: string;
  jobDescription: string;
  outputQueue: string;
  /** Live host probe CPU % (WRKACTJOB column). */
  cpuPercent?: number;
  /** WRKACTJOB Function column override. */
  functionName?: string;
  /** Row sourced from Linux ps probe, not scenario DB. */
  hostProbe?: boolean;
};



export function listActiveJobs(systemName = "CLAIMS400"): JobSummary[] {
  const dbJobs = listJobRows(systemName, { status: "ACTIVE" }).map(toSummary);
  const hostJobs = probeHostActiveJobs();
  if (hostJobs.length === 0) return dbJobs;

  const seen = new Set(dbJobs.map((job) => `${job.subsystem}:${job.jobName}`));
  const merged = [...dbJobs];
  for (const job of hostJobs) {
    const key = `${job.subsystem}:${job.jobName}`;
    if (seen.has(key)) continue;
    seen.add(key);
    merged.push(job);
  }
  return merged;
}



export function listSubmittedJobs(systemName = "CLAIMS400"): JobSummary[] {

  return listJobRows(systemName, { jobType: "BATCH" }).map(toSummary);

}



export function listJobQueueEntries(systemName = "CLAIMS400"): JobSummary[] {

  return listJobRows(systemName)

    .filter((job) => job.subsystem === "QINTER" || job.status === "HELD")

    .map(toSummary);

}



export function listAllJobs(systemName = "CLAIMS400"): JobSummary[] {

  return listJobRows(systemName).map(toSummary);

}



export function listJobsBySubsystem(systemName: string, subsystem: string): JobSummary[] {

  const target = subsystem.trim().toUpperCase();

  return listJobRows(systemName)

    .filter((job) => job.status !== "ENDED" && job.subsystem.toUpperCase() === target)

    .map(toSummary);

}



export function listJobsByUser(systemName: string, userName: string): JobSummary[] {

  const target = userName.trim().toUpperCase();

  return listJobRows(systemName)

    .filter((job) => job.status !== "ENDED" && job.userName.toUpperCase() === target)

    .map(toSummary);

}



export function getJobByNumber(systemName: string, jobNumber: string): JobSummary | undefined {

  const job = findJob(systemName, jobNumber);

  return job ? toSummary(job) : undefined;

}



export function holdJob(systemName: string, jobNumber: string): { ok: boolean; message: string } {

  const job = findJob(systemName, jobNumber);

  if (!job) return { ok: false, message: `CPF1336 - Job ${jobNumber} not found.` };

  if (job.status === "HELD") return { ok: false, message: `CPF1337 - Job already held.` };

  if (job.status === "ENDED") return { ok: false, message: `CPF1336 - Job ${jobNumber} not found.` };

  updateJobStatus(systemName, jobNumber, "HELD");

  return { ok: true, message: `Job ${job.jobName}/${job.userName}/${jobNumber} held.` };

}



export function releaseJob(systemName: string, jobNumber: string): { ok: boolean; message: string } {

  const job = findJob(systemName, jobNumber);

  if (!job) return { ok: false, message: `CPF1336 - Job ${jobNumber} not found.` };

  if (job.status !== "HELD") return { ok: false, message: `CPF1338 - Job not held.` };

  updateJobStatus(systemName, jobNumber, "ACTIVE");

  return { ok: true, message: `Job ${job.jobName}/${job.userName}/${jobNumber} released.` };

}



export function submitBatchJob(
  session: import("./sessionService.js").IbmiSession,
  options: {
    cmd: string;
    jobName?: string;
    jobd?: string;
    jobq?: string;
    user?: string;
  },
): { ok: true; jobNumber: string; message: string } | { ok: false; message: string } {
  const cmd = options.cmd?.trim();
  if (!cmd) return { ok: false, message: "CPF0006 - CMD parameter required." };

  const jobNumber = nextJobNumber(session.systemName);
  const userName = (options.user ?? session.userName ?? "QSECOFR").toUpperCase();
  const jobName = (options.jobName ?? cmd.split(/\s+/)[0] ?? "SBMJOB").toUpperCase().slice(0, 10);

  insertJobRow(session.systemName, {
    jobNumber,
    userName,
    jobName,
    jobType: "BATCH",
    subsystem: "QBATCH",
    status: "ACTIVE",
    jobDescription: options.jobd ?? "QDFTJOBD",
    outputQueue: options.jobq ?? "QPRINT",
  });

  return {
    ok: true,
    jobNumber,
    message: `Job ${jobNumber}/${userName}/${jobName} submitted.`,
  };
}

export function endJob(systemName: string, jobNumber: string): { ok: boolean; message: string } {

  const job = findJob(systemName, jobNumber);

  if (!job) return { ok: false, message: `CPF1336 - Job ${jobNumber} not found.` };

  if (job.status === "ENDED") return { ok: false, message: `CPF1336 - Job ${jobNumber} not found.` };

  updateJobStatus(systemName, jobNumber, "ENDED");

  return { ok: true, message: `Job ${job.jobName}/${job.userName}/${jobNumber} ended.` };

}



function toSummary(job: {

  jobNumber: string;

  userName: string;

  jobName: string;

  jobType: string;

  subsystem: string;

  status: string;

  jobDescription: string | null;

  outputQueue: string | null;

}): JobSummary {

  return {

    jobNumber: job.jobNumber,

    userName: job.userName,

    jobName: job.jobName,

    jobType: job.jobType,

    subsystem: job.subsystem,

    status: job.status,

    jobDescription: job.jobDescription ?? "QDFTJOBD",

    outputQueue: job.outputQueue ?? "QPRINT",

  };

}


