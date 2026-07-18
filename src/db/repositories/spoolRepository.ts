import { getDatabase } from "../sqlite.js";
import { getSystemIdByName } from "./systemRepository.js";

export type SpooledFileRow = {
  fileName: string;
  userName: string;
  spoolNumber: string;
  status: string;
};

export function updateSpooledFileStatus(
  systemName: string,
  fileName: string,
  userName: string,
  status: string,
): { ok: true; before: SpooledFileRow } | { ok: false; message: string } {
  const systemId = getSystemIdByName(systemName);
  const row = getDatabase()
    .prepare(
      `SELECT file_name AS fileName, user_name AS userName,
              spool_number AS spoolNumber, status
       FROM spooled_files
       WHERE system_id = ? AND file_name = ? AND user_name = ?`,
    )
    .get(systemId, fileName.trim().toUpperCase(), userName.trim().toUpperCase()) as SpooledFileRow | undefined;

  if (!row) {
    return { ok: false, message: `CPF2204 - Spooled file ${fileName} not found.` };
  }

  getDatabase()
    .prepare(
      `UPDATE spooled_files SET status = ?
       WHERE system_id = ? AND file_name = ? AND user_name = ?`,
    )
    .run(status, systemId, fileName.trim().toUpperCase(), userName.trim().toUpperCase());

  return { ok: true, before: row };
}

export function deleteSpooledFile(
  systemName: string,
  fileName: string,
  userName: string,
): { ok: true; before: SpooledFileRow } | { ok: false; message: string } {
  const systemId = getSystemIdByName(systemName);
  const row = getDatabase()
    .prepare(
      `SELECT file_name AS fileName, user_name AS userName,
              spool_number AS spoolNumber, status
       FROM spooled_files
       WHERE system_id = ? AND file_name = ? AND user_name = ?`,
    )
    .get(systemId, fileName.trim().toUpperCase(), userName.trim().toUpperCase()) as SpooledFileRow | undefined;

  if (!row) {
    return { ok: false, message: `CPF2204 - Spooled file ${fileName} not found.` };
  }

  getDatabase()
    .prepare(`DELETE FROM spooled_files WHERE system_id = ? AND file_name = ? AND user_name = ?`)
    .run(systemId, fileName.trim().toUpperCase(), userName.trim().toUpperCase());

  return { ok: true, before: row };
}

export function listSpooledFiles(systemName: string): SpooledFileRow[] {
  const systemId = getSystemIdByName(systemName);
  return getDatabase()
    .prepare(
      `SELECT file_name AS fileName, user_name AS userName,
              spool_number AS spoolNumber, status
       FROM spooled_files
       WHERE system_id = ?
       ORDER BY file_name`,
    )
    .all(systemId) as SpooledFileRow[];
}
