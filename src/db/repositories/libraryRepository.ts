import { getDatabase } from "../sqlite.js";
import { getSystemIdByName } from "./systemRepository.js";

export function listLibraries(systemName: string): string[] {
  const systemId = getSystemIdByName(systemName);
  const rows = getDatabase()
    .prepare("SELECT name FROM libraries WHERE system_id = ? ORDER BY name")
    .all(systemId) as Array<{ name: string }>;
  return rows.map((row) => row.name);
}

export function libraryExists(systemName: string, libraryName: string): boolean {
  const systemId = getSystemIdByName(systemName);
  const row = getDatabase()
    .prepare("SELECT 1 FROM libraries WHERE system_id = ? AND name = ?")
    .get(systemId, libraryName.trim().toUpperCase());
  return row !== undefined;
}

export function insertLibrary(systemName: string, libraryName: string, _text = "Lab library"): void {
  const systemId = getSystemIdByName(systemName);
  getDatabase()
    .prepare("INSERT INTO libraries (id, system_id, name) VALUES (?, ?, ?)")
    .run(crypto.randomUUID(), systemId, libraryName.trim().toUpperCase());
}
