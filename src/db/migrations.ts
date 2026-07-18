import type { Database as SqliteDatabase } from "better-sqlite3";
import { ensureIongrcTrainingProfile } from "./trainingProfileEnsure.js";

function tableExists(database: SqliteDatabase, table: string): boolean {
  return !!database
    .prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = ?")
    .get(table);
}

function tableHasColumn(database: SqliteDatabase, table: string, column: string): boolean {
  if (!tableExists(database, table)) return false;
  const columns = database.prepare(`PRAGMA table_info(${table})`).all() as Array<{ name: string }>;
  return columns.some((entry) => entry.name === column);
}

function addColumnIfMissing(
  database: SqliteDatabase,
  table: string,
  column: string,
  definition: string,
): void {
  if (!tableHasColumn(database, table, column)) {
    database.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
    console.log(`[db] migrated ${table}.${column}`);
  }
}

/** Apply additive schema changes for databases created before newer columns/tables. */
export function applySchemaMigrations(database: SqliteDatabase): void {
  addColumnIfMissing(database, "missions", "persona", "TEXT");
  database.exec(`
    CREATE TABLE IF NOT EXISTS mission_evidence_tags (
      id TEXT PRIMARY KEY,
      attempt_id TEXT NOT NULL,
      tag TEXT NOT NULL,
      command_text TEXT,
      collected_at TEXT NOT NULL,
      UNIQUE (attempt_id, tag),
      FOREIGN KEY (attempt_id) REFERENCES mission_attempts(id)
    );

    CREATE TABLE IF NOT EXISTS runtime_command_history (
      id TEXT PRIMARY KEY,
      attempt_id TEXT NOT NULL,
      timestamp TEXT NOT NULL,
      user_name TEXT NOT NULL,
      command_text TEXT NOT NULL,
      command_name TEXT NOT NULL,
      result_code TEXT,
      result_message TEXT,
      screen_id TEXT,
      evidence_tags TEXT,
      mutation_ids TEXT,
      FOREIGN KEY (attempt_id) REFERENCES mission_attempts(id)
    );

    CREATE TABLE IF NOT EXISTS runtime_state_changes (
      id TEXT PRIMARY KEY,
      attempt_id TEXT NOT NULL,
      timestamp TEXT NOT NULL,
      command_text TEXT NOT NULL,
      actor TEXT NOT NULL,
      entity_type TEXT NOT NULL,
      entity_id TEXT NOT NULL,
      before_json TEXT NOT NULL,
      after_json TEXT NOT NULL,
      side_effects_json TEXT,
      FOREIGN KEY (attempt_id) REFERENCES mission_attempts(id)
    );

    CREATE TABLE IF NOT EXISTS runtime_attempt_baselines (
      attempt_id TEXT PRIMARY KEY,
      snapshot_json TEXT NOT NULL,
      FOREIGN KEY (attempt_id) REFERENCES mission_attempts(id)
    );

    CREATE TABLE IF NOT EXISTS runtime_generated_audit (
      id TEXT PRIMARY KEY,
      attempt_id TEXT NOT NULL,
      entry_time TEXT NOT NULL,
      user_name TEXT NOT NULL,
      entry_type TEXT NOT NULL,
      object_ref TEXT,
      message TEXT,
      source_command TEXT,
      FOREIGN KEY (attempt_id) REFERENCES mission_attempts(id)
    );

    CREATE TABLE IF NOT EXISTS runtime_job_log_entries (
      id TEXT PRIMARY KEY,
      attempt_id TEXT NOT NULL,
      timestamp TEXT NOT NULL,
      message_id TEXT,
      message_text TEXT NOT NULL,
      FOREIGN KEY (attempt_id) REFERENCES mission_attempts(id)
    );

    CREATE TABLE IF NOT EXISTS runtime_coach_events (
      id TEXT PRIMARY KEY,
      attempt_id TEXT NOT NULL,
      event_key TEXT NOT NULL,
      message TEXT NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY (attempt_id) REFERENCES mission_attempts(id)
    );

    CREATE TABLE IF NOT EXISTS scorebook_entries (
      id TEXT PRIMARY KEY,
      attempt_id TEXT,
      system_id TEXT NOT NULL,
      system_name TEXT NOT NULL,
      campaign_id TEXT,
      mission_id TEXT NOT NULL,
      variant_id TEXT,
      persona_id TEXT,
      guidance_mode TEXT,
      user_name TEXT NOT NULL,
      started_at TEXT NOT NULL,
      completed_at TEXT,
      status TEXT NOT NULL,
      total_score REAL,
      evidence_coverage REAL,
      findings_count INTEGER,
      remediation_count INTEGER,
      report_path TEXT,
      evidence_packet_path TEXT,
      FOREIGN KEY (attempt_id) REFERENCES mission_attempts(id)
    );
  `);

  if (tableExists(database, "user_profiles")) {
    addColumnIfMissing(database, "user_profiles", "activity_profile_exempt", "INTEGER NOT NULL DEFAULT 0");
    addColumnIfMissing(database, "user_profiles", "business_owner", "TEXT");
    addColumnIfMissing(database, "user_profiles", "limit_capabilities", "TEXT NOT NULL DEFAULT '*NO'");
    ensureIongrcTrainingProfile(database);
  }

  if (tableExists(database, "mission_attempts")) {
    addColumnIfMissing(database, "mission_attempts", "variant_id", "TEXT");
    addColumnIfMissing(database, "mission_attempts", "persona_id", "TEXT");
    addColumnIfMissing(database, "mission_attempts", "guidance_mode", "TEXT");
    addColumnIfMissing(database, "mission_attempts", "campaign_id", "TEXT");
  }

  if (tableExists(database, "findings")) {
    addColumnIfMissing(database, "findings", "decision_impact", "TEXT");
  }

  database.exec(`
    CREATE TABLE IF NOT EXISTS catalog_lab_entities (
      id TEXT PRIMARY KEY,
      system_id TEXT NOT NULL,
      entity_type TEXT NOT NULL,
      entity_id TEXT NOT NULL,
      state_json TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      UNIQUE (system_id, entity_type, entity_id),
      FOREIGN KEY (system_id) REFERENCES systems(id)
    );

    CREATE TABLE IF NOT EXISTS lab_outfile_rows (
      id TEXT PRIMARY KEY,
      system_id TEXT NOT NULL,
      library TEXT NOT NULL,
      file_name TEXT NOT NULL,
      member_name TEXT NOT NULL,
      source_command TEXT NOT NULL,
      row_index INTEGER NOT NULL,
      row_json TEXT NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY (system_id) REFERENCES systems(id)
    );

    CREATE INDEX IF NOT EXISTS idx_lab_outfile_lookup
      ON lab_outfile_rows (system_id, library, file_name, member_name);
  `);
}

