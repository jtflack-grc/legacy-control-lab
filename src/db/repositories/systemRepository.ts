import { getDatabase } from "../sqlite.js";

export function getSystemIdByName(systemName: string): string {
  const row = getDatabase()
    .prepare("SELECT id FROM systems WHERE name = ?")
    .get(systemName.trim().toUpperCase()) as { id: string } | undefined;

  if (!row) {
    throw new Error(`System ${systemName} not found in scenario database.`);
  }

  return row.id;
}

export function getSystemNameById(systemId: string): string {
  const row = getDatabase()
    .prepare("SELECT name FROM systems WHERE id = ?")
    .get(systemId) as { name: string } | undefined;

  if (!row) {
    throw new Error(`System id ${systemId} not found.`);
  }

  return row.name;
}
