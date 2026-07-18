import { randomUUID } from "node:crypto";
import { getDatabase } from "../db/sqlite.js";
import { getSystemIdByName } from "../db/repositories/systemRepository.js";
import type { AuditJournalEntry } from "./auditJournalService.js";
import type { UserProfileSummary } from "./userProfileService.js";

export type OutfileLocation = {
  library: string;
  fileName: string;
  memberName: string;
};

export type OutfileRow = Record<string, string>;

function parseQualifiedOutfile(raw: string, defaultMember: string): OutfileLocation {
  const trimmed = raw.trim().toUpperCase();
  const slash = trimmed.indexOf("/");
  if (slash >= 0) {
    return {
      library: trimmed.slice(0, slash),
      fileName: trimmed.slice(slash + 1),
      memberName: defaultMember,
    };
  }
  return { library: "QGPL", fileName: trimmed, memberName: defaultMember };
}

export function resolveOutfileLocation(rawOutfile: string, member?: string, defaultMember = "DATA"): OutfileLocation {
  const location = parseQualifiedOutfile(rawOutfile, member?.trim().toUpperCase() || defaultMember);
  if (member?.trim()) {
    location.memberName = member.trim().toUpperCase();
  }
  return location;
}

function clearOutfileMember(systemName: string, location: OutfileLocation): void {
  const systemId = getSystemIdByName(systemName);
  getDatabase()
    .prepare(
      `DELETE FROM lab_outfile_rows
       WHERE system_id = ? AND library = ? AND file_name = ? AND member_name = ?`,
    )
    .run(systemId, location.library, location.fileName, location.memberName);
}

function insertOutfileRows(
  systemName: string,
  location: OutfileLocation,
  sourceCommand: string,
  rows: OutfileRow[],
): void {
  clearOutfileMember(systemName, location);
  const systemId = getSystemIdByName(systemName);
  const createdAt = new Date().toISOString();
  const insert = getDatabase().prepare(
    `INSERT INTO lab_outfile_rows (
      id, system_id, library, file_name, member_name, source_command, row_index, row_json, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  );
  rows.forEach((row, index) => {
    insert.run(
      randomUUID(),
      systemId,
      location.library,
      location.fileName,
      location.memberName,
      sourceCommand,
      index + 1,
      JSON.stringify(row),
      createdAt,
    );
  });
}

export function buildUserProfileOutfileRows(profiles: UserProfileSummary[]): OutfileRow[] {
  return profiles.map((profile) => ({
    USER_NAME: profile.userName,
    STATUS: profile.status,
    USER_CLASS: profile.userClass,
    GROUP_PROFILE: profile.groupProfile,
    SPECIAL_AUTHORITIES: profile.specialAuthorities,
    LAST_SIGNON: profile.lastSignon,
    LIMIT_CAPABILITIES: profile.limitCapabilities ?? "*NO",
    TEXT_DESCRIPTION: profile.text,
  }));
}

export function buildAuditJournalOutfileRows(entries: AuditJournalEntry[]): OutfileRow[] {
  return entries.map((entry) => ({
    ENTRY_TIME: entry.entryTime,
    USER_NAME: entry.userName,
    ENTRY_TYPE: entry.entryType,
    OBJECT_REF: entry.objectRef,
    MESSAGE: entry.message ?? "",
  }));
}

export function writeUserProfileOutfile(
  systemName: string,
  rawOutfile: string,
  member: string | undefined,
  sourceCommand: string,
  profiles: UserProfileSummary[],
): OutfileLocation {
  const location = resolveOutfileLocation(rawOutfile, member, "USERS");
  insertOutfileRows(systemName, location, sourceCommand, buildUserProfileOutfileRows(profiles));
  return location;
}

export function writeAuditJournalOutfile(
  systemName: string,
  rawOutfile: string,
  member: string | undefined,
  sourceCommand: string,
  entries: AuditJournalEntry[],
): OutfileLocation {
  const location = resolveOutfileLocation(rawOutfile, member, "AUDJRN");
  insertOutfileRows(systemName, location, sourceCommand, buildAuditJournalOutfileRows(entries));
  return location;
}

export function listOutfileRows(
  systemName: string,
  location: OutfileLocation,
): Array<{ rowIndex: number; columns: OutfileRow }> {
  const systemId = getSystemIdByName(systemName);
  const rows = getDatabase()
    .prepare(
      `SELECT row_index AS rowIndex, row_json AS rowJson
       FROM lab_outfile_rows
       WHERE system_id = ? AND library = ? AND file_name = ? AND member_name = ?
       ORDER BY row_index`,
    )
    .all(systemId, location.library, location.fileName, location.memberName) as Array<{
    rowIndex: number;
    rowJson: string;
  }>;
  return rows.map((row) => ({
    rowIndex: row.rowIndex,
    columns: JSON.parse(row.rowJson) as OutfileRow,
  }));
}

export function listOutfileRowsForFile(
  systemName: string,
  library: string,
  fileName: string,
): Array<{ memberName: string; rowIndex: number; columns: OutfileRow }> {
  const systemId = getSystemIdByName(systemName);
  const rows = getDatabase()
    .prepare(
      `SELECT member_name AS memberName, row_index AS rowIndex, row_json AS rowJson
       FROM lab_outfile_rows
       WHERE system_id = ? AND library = ? AND file_name = ?
       ORDER BY member_name, row_index`,
    )
    .all(systemId, library.toUpperCase(), fileName.toUpperCase()) as Array<{
    memberName: string;
    rowIndex: number;
    rowJson: string;
  }>;
  return rows.map((row) => ({
    memberName: row.memberName,
    rowIndex: row.rowIndex,
    columns: JSON.parse(row.rowJson) as OutfileRow,
  }));
}

export function resolveOutfileQuery(
  systemName: string,
  rawOutfile: string,
  memberName?: string,
): { location: OutfileLocation; rows: Array<{ rowIndex: number; columns: OutfileRow }> } {
  const location = resolveOutfileLocation(rawOutfile, memberName);
  let rows = listOutfileRows(systemName, location);
  if (rows.length === 0) {
    const library = location.library;
    const fileName = location.fileName;
    const allRows = listOutfileRowsForFile(systemName, library, fileName);
    if (allRows.length > 0) {
      location.memberName = allRows[0]!.memberName;
      rows = allRows.map((row) => ({ rowIndex: row.rowIndex, columns: row.columns }));
    }
  }
  return { location, rows };
}

export function formatOutfilePreview(
  systemName: string,
  location: OutfileLocation,
  limit = 2,
): string {
  const rows = listOutfileRows(systemName, location).slice(0, limit);
  if (rows.length === 0) return "";
  const keys = Object.keys(rows[0]!.columns);
  const header = keys.join(" | ");
  const body = rows
    .map((row) => keys.map((key) => row.columns[key] ?? "").join(" | "))
    .join("; ");
  return `Preview: ${header} — ${body}`;
}
