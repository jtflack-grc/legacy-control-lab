/** Host process name → IBM i job alias (shared by ps and LIVE_HOST_JOBS). */
export const COMM_ALIASES: Record<
  string,
  { jobName: string; subsystem: string; user: string; functionName: string }
> = {
  node: { jobName: "QZDASOINIT", subsystem: "QSERVER", user: "QUSER", functionName: "QZDAINIT" },
  nginx: { jobName: "QHTTPSVR", subsystem: "QHTTPSVR", user: "QTMHHTTP", functionName: "HTTP" },
  postgres: { jobName: "QSQSRVR", subsystem: "QSYSWRK", user: "QSYS", functionName: "QSQSRVR" },
  redis: { jobName: "QSYSWRK", subsystem: "QSYSWRK", user: "QSYS", functionName: "REDIS" },
  python: { jobName: "QPYPRC", subsystem: "QUSRWRK", user: "QUSER", functionName: "PYTHON" },
  java: { jobName: "QJVACLNT", subsystem: "QUSRWRK", user: "QUSER", functionName: "JVM" },
};

export function aliasForComm(comm: string): (typeof COMM_ALIASES)[string] {
  const base = comm.replace(/[^a-z0-9]/gi, "").toLowerCase();
  for (const [key, alias] of Object.entries(COMM_ALIASES)) {
    if (base.includes(key)) return alias;
  }
  return {
    jobName: base.slice(0, 10).toUpperCase() || "QUSRJOB",
    subsystem: "QUSRWRK",
    user: "QUSER",
    functionName: base.slice(0, 16).toUpperCase(),
  };
}
