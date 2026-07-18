import type { Database as SqliteDatabase } from "better-sqlite3";

export function ensureSchemaMetaTable(db: SqliteDatabase): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS schema_meta (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    )
  `);
}

export function getSchemaMeta(db: SqliteDatabase, key: string): string | undefined {
  ensureSchemaMetaTable(db);
  const row = db.prepare("SELECT value FROM schema_meta WHERE key = ?").get(key) as
    | { value: string }
    | undefined;
  return row?.value;
}

export function setSchemaMeta(db: SqliteDatabase, key: string, value: string): void {
  ensureSchemaMetaTable(db);
  db.prepare("INSERT OR REPLACE INTO schema_meta (key, value) VALUES (?, ?)").run(key, value);
}
