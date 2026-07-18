import { getDatabase } from "../sqlite.js";
import { getSystemIdByName } from "./systemRepository.js";

export type AuditJournalEntryRow = {
  entryTime: string;
  userName: string;
  entryType: string;
  objectRef: string;
  message?: string;
};

export function listGeneratedAuditForAttempt(attemptId: string): AuditJournalEntryRow[] {
  const rows = getDatabase()
    .prepare(
      `SELECT entry_time AS entryTime, user_name AS userName,
              entry_type AS entryType, object_ref AS objectRef, message
       FROM runtime_generated_audit
       WHERE attempt_id = ?
       ORDER BY entry_time`,
    )
    .all(attemptId) as Array<{
    entryTime: string;
    userName: string;
    entryType: string;
    objectRef: string | null;
    message: string | null;
  }>;

  return rows.map((row) => ({
    entryTime: row.entryTime,
    userName: row.userName,
    entryType: row.entryType,
    objectRef: row.objectRef ?? "",
    message: row.message ?? undefined,
  }));
}

export function listAuditJournalEntries(
  systemName: string,
  filter: { entryType?: string; userName?: string; attemptId?: string } = {},
): AuditJournalEntryRow[] {
  const systemId = getSystemIdByName(systemName);
  const clauses: string[] = [];
  const params: string[] = [systemId];

  if (filter.entryType && filter.entryType !== "*ALL") {
    clauses.push("AND entry_type = ?");
    params.push(filter.entryType.trim().toUpperCase());
  }
  if (filter.userName && filter.userName !== "*ALL") {
    clauses.push("AND user_name = ?");
    params.push(filter.userName.trim().toUpperCase());
  }

  const rows = getDatabase()
    .prepare(
      `SELECT entry_time AS entryTime, user_name AS userName,
              entry_type AS entryType, object_ref AS objectRef, message
       FROM audit_journal_entries
       WHERE system_id = ? ${clauses.join(" ")}
       ORDER BY entry_time`,
    )
    .all(...params) as Array<{
    entryTime: string;
    userName: string;
    entryType: string;
    objectRef: string | null;
    message: string | null;
  }>;

  const seedEntries = rows.map((row) => ({
    entryTime: row.entryTime,
    userName: row.userName,
    entryType: row.entryType,
    objectRef: row.objectRef ?? "",
    message: row.message ?? undefined,
  }));

  if (!filter.attemptId) {
    return seedEntries;
  }

  const generated = listGeneratedAuditForAttempt(filter.attemptId).filter((entry) => {
    if (filter.entryType && filter.entryType !== "*ALL" && entry.entryType !== filter.entryType.trim().toUpperCase()) {
      return false;
    }
    if (filter.userName && filter.userName !== "*ALL" && entry.userName !== filter.userName.trim().toUpperCase()) {
      return false;
    }
    return true;
  });

  return [...seedEntries, ...generated].sort((a, b) => a.entryTime.localeCompare(b.entryTime));
}
