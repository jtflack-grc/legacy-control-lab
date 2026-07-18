import type { AuditJournalEntry } from "../../ibmi-runtime/auditJournalService.js";

const JOB_BY_USER: Record<string, string> = {
  BACKUPADM: "QPADEV0021",
  OLDVENDOR: "QPADEV0014",
  APCLERK: "QPADEV0007",
  AUDIT: "QPADEV0001",
  PAYADMIN: "QPADEV0005",
  BATCHOPS: "QPADEV0003",
};

export function splitJournalEntryTime(entryTime: string): { date: string; time: string } {
  const [datePart, timePart = ""] = entryTime.trim().split(/\s+/);
  const segments = datePart.split("-");
  if (segments.length === 3) {
    const [, month, day] = segments;
    return { date: `${month}/${day}/26`, time: timePart.slice(0, 8) };
  }
  return { date: entryTime.slice(0, 8), time: timePart.slice(0, 8) };
}

export function journalJobName(userName: string): string {
  return JOB_BY_USER[userName.toUpperCase()] ?? "QPADEV0001";
}

export function journalEntryMessage(entry: AuditJournalEntry): string {
  if (entry.message) {
    return entry.message.length > 28 ? entry.message.slice(0, 28) : entry.message;
  }
  return entry.objectRef.slice(0, 28);
}
