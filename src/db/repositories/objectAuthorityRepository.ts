import { getDatabase } from "../sqlite.js";
import { getSystemIdByName } from "./systemRepository.js";

export type ObjectAuthorityRow = {
  userName: string;
  authority: string;
};

export function listObjectAuthorities(
  systemName: string,
  library: string,
  objectName: string,
): ObjectAuthorityRow[] {
  const systemId = getSystemIdByName(systemName);
  return getDatabase()
    .prepare(
      `SELECT user_name AS userName, authority
       FROM object_authorities
       WHERE system_id = ? AND library = ? AND object_name = ?
       ORDER BY user_name`,
    )
    .all(systemId, library.trim().toUpperCase(), objectName.trim().toUpperCase()) as ObjectAuthorityRow[];
}

export function grantObjectAuthority(
  systemName: string,
  library: string,
  objectName: string,
  userName: string,
  authority: string,
): void {
  const systemId = getSystemIdByName(systemName);
  const lib = library.trim().toUpperCase();
  const obj = objectName.trim().toUpperCase();
  const user = userName.trim().toUpperCase();
  const id = `objaut-${lib.toLowerCase()}-${obj.toLowerCase()}-${user.toLowerCase()}`;

  getDatabase()
    .prepare(
      `INSERT INTO object_authorities (id, system_id, library, object_name, user_name, authority)
       VALUES (?, ?, ?, ?, ?, ?)
       ON CONFLICT(system_id, library, object_name, user_name)
       DO UPDATE SET authority = excluded.authority`,
    )
    .run(id, systemId, lib, obj, user, authority.trim().toUpperCase());
}

export function revokeObjectAuthority(
  systemName: string,
  library: string,
  objectName: string,
  userName: string,
): boolean {
  const systemId = getSystemIdByName(systemName);
  const result = getDatabase()
    .prepare(
      `DELETE FROM object_authorities
       WHERE system_id = ? AND library = ? AND object_name = ? AND user_name = ?`,
    )
    .run(
      systemId,
      library.trim().toUpperCase(),
      objectName.trim().toUpperCase(),
      userName.trim().toUpperCase(),
    );
  return result.changes > 0;
}

export function updateObjectPublicAuthority(
  systemName: string,
  library: string,
  objectName: string,
  authority: string,
): boolean {
  const systemId = getSystemIdByName(systemName);
  const result = getDatabase()
    .prepare(
      `UPDATE objects SET public_authority = ?
       WHERE system_id = ? AND library = ? AND name = ?`,
    )
    .run(
      authority.trim().toUpperCase(),
      systemId,
      library.trim().toUpperCase(),
      objectName.trim().toUpperCase(),
    );
  return result.changes > 0;
}
