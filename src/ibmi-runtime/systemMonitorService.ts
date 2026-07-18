import { listAllJobs } from "./jobService.js";

export type DiskUnitStatus = {
  aspNumber: number;
  unitNumber: string;
  unitType: string;
  model: string;
  status: string;
  percentUsed: number;
  totalGb: number;
  availableGb: number;
};

export type SystemStatusSnapshot = {
  systemName: string;
  percentCpuUsed: number;
  percentDbCapability: number;
  percentSystemAspUsed: number;
  jobsInSystem: number;
  jobsActive: number;
  jobsWaiting: number;
  jobsHeld: number;
  interactiveJobs: number;
  batchJobs: number;
  systemAspGb: number;
  systemAspAvailableGb: number;
  temporaryStorageGb: number;
  elapsedTime: string;
};

export type SystemActivityMetric = {
  label: string;
  value: string;
};

const DISK_UNITS: DiskUnitStatus[] = [
  {
    aspNumber: 1,
    unitNumber: "DMP001",
    unitType: "*SSD",
    model: "2107",
    status: "ACTIVE",
    percentUsed: 62,
    totalGb: 512,
    availableGb: 195,
  },
  {
    aspNumber: 1,
    unitNumber: "DMP002",
    unitType: "*SSD",
    model: "2107",
    status: "ACTIVE",
    percentUsed: 58,
    totalGb: 512,
    availableGb: 215,
  },
  {
    aspNumber: 1,
    unitNumber: "DMP003",
    unitType: "*SSD",
    model: "2107",
    status: "ACTIVE",
    percentUsed: 71,
    totalGb: 1024,
    availableGb: 297,
  },
  {
    aspNumber: 33,
    unitNumber: "DMP033",
    unitType: "*HDD",
    model: "2105",
    status: "ACTIVE",
    percentUsed: 44,
    totalGb: 4096,
    availableGb: 2294,
  },
];

function formatMonitorElapsed(resetAt?: number): string {
  if (!resetAt) return "00:05:00";
  const totalSeconds = Math.max(0, Math.floor((Date.now() - resetAt) / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return [hours, minutes, seconds].map((part) => String(part).padStart(2, "0")).join(":");
}

export function getMonitorElapsedTime(resetAt?: number): string {
  return formatMonitorElapsed(resetAt);
}

export function listDiskUnits(_systemName = "CLAIMS400"): DiskUnitStatus[] {
  return DISK_UNITS.map((unit) => ({ ...unit }));
}

export function getDiskUnit(unitNumber: string): DiskUnitStatus | undefined {
  return DISK_UNITS.find((unit) => unit.unitNumber === unitNumber.toUpperCase());
}

export function getSystemStatus(systemName: string, monitorResetAt?: number): SystemStatusSnapshot {
  const jobs = listAllJobs(systemName);
  const active = jobs.filter((job) => job.status === "ACTIVE");
  const waiting = jobs.filter((job) => job.status === "WAIT");
  const held = jobs.filter((job) => job.status === "HELD");
  const interactive = jobs.filter((job) => job.jobType === "INTERACTIVE");
  const batch = jobs.filter((job) => job.jobType === "BATCH");

  const aspUsed =
    DISK_UNITS.filter((unit) => unit.aspNumber === 1).reduce((sum, unit) => sum + unit.totalGb * unit.percentUsed, 0) /
    DISK_UNITS.filter((unit) => unit.aspNumber === 1).reduce((sum, unit) => sum + unit.totalGb, 0);

  const systemAspGb = DISK_UNITS.filter((unit) => unit.aspNumber === 1).reduce((sum, unit) => sum + unit.totalGb, 0);
  const systemAspAvailableGb = DISK_UNITS.filter((unit) => unit.aspNumber === 1).reduce(
    (sum, unit) => sum + unit.availableGb,
    0,
  );

  return {
    systemName,
    percentCpuUsed: Math.min(94, 18 + active.length * 4 + batch.length * 2),
    percentDbCapability: 12,
    percentSystemAspUsed: Math.round(aspUsed),
    jobsInSystem: jobs.length,
    jobsActive: active.length,
    jobsWaiting: waiting.length,
    jobsHeld: held.length,
    interactiveJobs: interactive.length,
    batchJobs: batch.length,
    systemAspGb,
    systemAspAvailableGb,
    temporaryStorageGb: 2.4 + active.length * 0.3,
    elapsedTime: monitorResetAt ? formatMonitorElapsed(monitorResetAt) : "14:22:08",
  };
}

export function getSystemActivity(systemName: string): SystemActivityMetric[] {
  const status = getSystemStatus(systemName);
  return [
    { label: "System name", value: status.systemName },
    { label: "% CPU used", value: `${status.percentCpuUsed}` },
    { label: "% DB capability", value: `${status.percentDbCapability}` },
    { label: "Jobs in system", value: `${status.jobsInSystem}` },
    { label: "Jobs active", value: `${status.jobsActive}` },
    { label: "Jobs waiting", value: `${status.jobsWaiting}` },
    { label: "Jobs held", value: `${status.jobsHeld}` },
    { label: "Interactive jobs", value: `${status.interactiveJobs}` },
    { label: "Batch jobs", value: `${status.batchJobs}` },
    { label: "% system ASP used", value: `${status.percentSystemAspUsed}` },
    { label: "System ASP (GB)", value: `${status.systemAspGb}` },
    { label: "System ASP available (GB)", value: `${status.systemAspAvailableGb}` },
    { label: "Temporary storage (GB)", value: status.temporaryStorageGb.toFixed(1) },
    { label: "Elapsed time", value: status.elapsedTime },
    { label: "Pool faulting rate", value: "0.02" },
    { label: "Pool paging rate", value: "0.00" },
    { label: "Disk I/O rate", value: "142" },
    { label: "Interactive response", value: "0.4 sec" },
  ];
}
