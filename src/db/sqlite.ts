import { readFileSync, mkdirSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import Database from "better-sqlite3";
import type { Database as SqliteDatabase } from "better-sqlite3";
import { syncScenarioIfNeeded, isScenarioComplete } from "./seedData.js";
import { syncCommandCatalogIfNeeded } from "./commandCatalogSeed.js";
import { applySchemaMigrations } from "./migrations.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

let db: SqliteDatabase | null = null;

export function getDatabasePath(): string {
  return process.env.DATABASE_PATH ?? join(process.cwd(), "data", "claims400.db");
}

export function getSchemaSql(): string {
  return readFileSync(join(__dirname, "schema.sql"), "utf8");
}

export function isDatabaseInitialized(database: SqliteDatabase = getDatabase()): boolean {
  return isScenarioComplete(database);
}

export function initDatabase(options?: { path?: string; forceSeed?: boolean }): SqliteDatabase {
  if (db) {
    return db;
  }

  const path = options?.path ?? getDatabasePath();
  if (path !== ":memory:") {
    mkdirSync(dirname(path), { recursive: true });
  }

  db = new Database(path);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  db.exec(getSchemaSql());
  applySchemaMigrations(db);

  syncScenarioIfNeeded(db, options?.forceSeed === true);
  syncCommandCatalogIfNeeded(db, options?.forceSeed === true);
  return db;
}

export function getDatabase(): SqliteDatabase {
  if (!db) {
    return initDatabase();
  }
  return db;
}

export function closeDatabase(): void {
  if (db) {
    db.close();
    db = null;
  }
}

/** Reset singleton — used by tests. */
export function resetDatabaseConnection(): void {
  closeDatabase();
}

/** In-memory database with fresh seed for tests. */
export function initTestDatabase(): SqliteDatabase {
  resetDatabaseConnection();
  return initDatabase({ path: ":memory:", forceSeed: true });
}

export type { SqliteDatabase };
