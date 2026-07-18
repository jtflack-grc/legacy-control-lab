import { getDatabase } from "../sqlite.js";
import { getSystemIdByName } from "./systemRepository.js";

export type SystemValueRow = {
  name: string;
  value: string;
  category: string;
  description: string;
};

export function listSystemValues(systemName: string): SystemValueRow[] {
  const systemId = getSystemIdByName(systemName);
  return getDatabase()
    .prepare(
      `SELECT name, value, category, description
       FROM system_values
       WHERE system_id = ?
       ORDER BY name`,
    )
    .all(systemId) as SystemValueRow[];
}

export function getSystemValue(systemName: string, name: string): SystemValueRow | undefined {
  const systemId = getSystemIdByName(systemName);
  return getDatabase()
    .prepare(
      `SELECT name, value, category, description
       FROM system_values
       WHERE system_id = ? AND name = ?`,
    )
    .get(systemId, name.trim().toUpperCase()) as SystemValueRow | undefined;
}

export function updateSystemValue(
  systemName: string,
  name: string,
  value: string,
): SystemValueRow | undefined {
  const systemId = getSystemIdByName(systemName);
  const normalized = name.trim().toUpperCase();
  const result = getDatabase()
    .prepare("UPDATE system_values SET value = ? WHERE system_id = ? AND name = ?")
    .run(value, systemId, normalized);
  if (result.changes === 0) return undefined;
  return getSystemValue(systemName, normalized);
}
