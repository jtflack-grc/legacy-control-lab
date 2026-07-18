import { listAuditJournalEntries as listAuditJournalRows } from "../db/repositories/auditJournalRepository.js";

export type AuditJournalEntry = {
  entryTime: string;
  userName: string;
  entryType: string;
  objectRef: string;
  message?: string;
};

export type AuditJournalFilter = {
  entryType?: string;
  userName?: string;
  attemptId?: string;
};

export function listAuditJournalEntries(
  systemName = "CLAIMS400",
  filter: AuditJournalFilter = {},
): AuditJournalEntry[] {
  return listAuditJournalRows(systemName, filter);
}
