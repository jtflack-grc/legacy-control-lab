import { getDatabase } from "../sqlite.js";

import { getSystemIdByName } from "./systemRepository.js";



export type JobRow = {

  jobNumber: string;

  userName: string;

  jobName: string;

  jobType: string;

  subsystem: string;

  status: string;

  jobDescription: string | null;

  outputQueue: string | null;

};



export function listJobs(systemName: string, filter?: { status?: string; jobType?: string }): JobRow[] {

  const systemId = getSystemIdByName(systemName);

  const clauses: string[] = [];

  const params: string[] = [systemId];



  if (filter?.status) {

    clauses.push("AND status = ?");

    params.push(filter.status);

  }

  if (filter?.jobType) {

    clauses.push("AND job_type = ?");

    params.push(filter.jobType);

  }



  return getDatabase()

    .prepare(

      `SELECT job_number AS jobNumber, user_name AS userName, job_name AS jobName,

              job_type AS jobType, subsystem, status,

              job_description AS jobDescription, output_queue AS outputQueue

       FROM jobs

       WHERE system_id = ? ${clauses.join(" ")}

       ORDER BY job_number`,

    )

    .all(...params) as JobRow[];

}



export function findJob(systemName: string, jobNumber: string): JobRow | undefined {

  const systemId = getSystemIdByName(systemName);

  return getDatabase()

    .prepare(

      `SELECT job_number AS jobNumber, user_name AS userName, job_name AS jobName,

              job_type AS jobType, subsystem, status,

              job_description AS jobDescription, output_queue AS outputQueue

       FROM jobs

       WHERE system_id = ? AND job_number = ?`,

    )

    .get(systemId, jobNumber) as JobRow | undefined;

}



export function insertJob(
  systemName: string,
  job: {
    jobNumber: string;
    userName: string;
    jobName: string;
    jobType: string;
    subsystem: string;
    status: string;
    jobDescription?: string;
    outputQueue?: string;
  },
): void {
  const systemId = getSystemIdByName(systemName);
  getDatabase()
    .prepare(
      `INSERT INTO jobs (system_id, job_number, user_name, job_name, job_type, subsystem, status, job_description, output_queue)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      systemId,
      job.jobNumber,
      job.userName.toUpperCase(),
      job.jobName.toUpperCase(),
      job.jobType,
      job.subsystem.toUpperCase(),
      job.status,
      job.jobDescription ?? "QDFTJOBD",
      job.outputQueue ?? "QPRINT",
    );
}

export function nextJobNumber(systemName: string): string {
  const systemId = getSystemIdByName(systemName);
  const row = getDatabase()
    .prepare(`SELECT MAX(CAST(job_number AS INTEGER)) AS maxNum FROM jobs WHERE system_id = ?`)
    .get(systemId) as { maxNum: number | null };
  const next = (row.maxNum ?? 230000) + 1;
  return String(next).padStart(6, "0");
}

export function updateJobStatus(systemName: string, jobNumber: string, status: string): boolean {

  const systemId = getSystemIdByName(systemName);

  const result = getDatabase()

    .prepare(`UPDATE jobs SET status = ? WHERE system_id = ? AND job_number = ?`)

    .run(status, systemId, jobNumber);

  return result.changes > 0;

}


