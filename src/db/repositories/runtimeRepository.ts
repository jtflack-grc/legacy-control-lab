import { getDatabase } from "../sqlite.js";
import type { CommandHistoryEntry, RuntimeEntityType, StateChange } from "../../runtime/types.js";

export type GeneratedAuditRow = {
  id: string;
  attemptId: string;
  entryTime: string;
  userName: string;
  entryType: string;
  objectRef: string;
  message?: string;
  sourceCommand?: string;
};

export type RuntimeJobLogRow = {
  id: string;
  attemptId: string;
  timestamp: string;
  messageId?: string;
  messageText: string;
};

export function insertCommandHistory(entry: Omit<CommandHistoryEntry, "id"> & { id?: string }): string {
  const id = entry.id ?? crypto.randomUUID();
  getDatabase()
    .prepare(
      `INSERT INTO runtime_command_history (
        id, attempt_id, timestamp, user_name, command_text, command_name,
        result_code, result_message, screen_id, evidence_tags, mutation_ids
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      id,
      entry.attemptId,
      entry.timestamp,
      entry.userName,
      entry.commandText,
      entry.commandName,
      entry.resultCode,
      entry.resultMessage,
      entry.screenId ?? null,
      entry.evidenceTags ? JSON.stringify(entry.evidenceTags) : null,
      entry.mutationIds ? JSON.stringify(entry.mutationIds) : null,
    );
  return id;
}

export function listCommandHistory(attemptId: string): CommandHistoryEntry[] {
  const rows = getDatabase()
    .prepare(
      `SELECT id, attempt_id AS attemptId, timestamp, user_name AS userName,
              command_text AS commandText, command_name AS commandName,
              result_code AS resultCode, result_message AS resultMessage,
              screen_id AS screenId, evidence_tags AS evidenceTags,
              mutation_ids AS mutationIds
       FROM runtime_command_history
       WHERE attempt_id = ?
       ORDER BY timestamp`,
    )
    .all(attemptId) as Array<{
    id: string;
    attemptId: string;
    timestamp: string;
    userName: string;
    commandText: string;
    commandName: string;
    resultCode: string;
    resultMessage: string;
    screenId: string | null;
    evidenceTags: string | null;
    mutationIds: string | null;
  }>;

  return rows.map((row) => ({
    ...row,
    screenId: row.screenId ?? undefined,
    evidenceTags: row.evidenceTags ? (JSON.parse(row.evidenceTags) as string[]) : undefined,
    mutationIds: row.mutationIds ? (JSON.parse(row.mutationIds) as string[]) : undefined,
  }));
}

export function insertStateChange(change: {
  id?: string;
  attemptId: string;
  timestamp: string;
  commandText: string;
  actor: string;
  entityType: RuntimeEntityType;
  entityId: string;
  before: Record<string, unknown>;
  after: Record<string, unknown>;
  sideEffects: Array<{ type: string; id: string }>;
}): string {
  const id = change.id ?? crypto.randomUUID();
  getDatabase()
    .prepare(
      `INSERT INTO runtime_state_changes (
        id, attempt_id, timestamp, command_text, actor, entity_type, entity_id,
        before_json, after_json, side_effects_json
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      id,
      change.attemptId,
      change.timestamp,
      change.commandText,
      change.actor,
      change.entityType,
      change.entityId,
      JSON.stringify(change.before),
      JSON.stringify(change.after),
      JSON.stringify(change.sideEffects),
    );
  return id;
}

export function listStateChanges(
  attemptId: string,
  entityType?: RuntimeEntityType,
): StateChange[] {
  const clauses = entityType ? "AND entity_type = ?" : "";
  const params = entityType ? [attemptId, entityType] : [attemptId];
  const rows = getDatabase()
    .prepare(
      `SELECT id, attempt_id AS attemptId, timestamp, command_text AS commandText,
              actor, entity_type AS entityType, entity_id AS entityId,
              before_json AS beforeJson, after_json AS afterJson,
              side_effects_json AS sideEffectsJson
       FROM runtime_state_changes
       WHERE attempt_id = ? ${clauses}
       ORDER BY timestamp`,
    )
    .all(...params) as Array<{
    id: string;
    attemptId: string;
    timestamp: string;
    commandText: string;
    actor: string;
    entityType: RuntimeEntityType;
    entityId: string;
    beforeJson: string;
    afterJson: string;
    sideEffectsJson: string;
  }>;

  return rows.map((row) => ({
    id: row.id,
    attemptId: row.attemptId,
    timestamp: row.timestamp,
    commandText: row.commandText,
    actor: row.actor,
    entityType: row.entityType,
    entityId: row.entityId,
    before: JSON.parse(row.beforeJson) as Record<string, unknown>,
    after: JSON.parse(row.afterJson) as Record<string, unknown>,
    sideEffects: JSON.parse(row.sideEffectsJson) as StateChange["sideEffects"],
  }));
}

export function saveAttemptBaseline(attemptId: string, snapshotJson: string): void {
  getDatabase()
    .prepare(
      `INSERT INTO runtime_attempt_baselines (attempt_id, snapshot_json)
       VALUES (?, ?)
       ON CONFLICT(attempt_id) DO UPDATE SET snapshot_json = excluded.snapshot_json`,
    )
    .run(attemptId, snapshotJson);
}

export function getAttemptBaseline(attemptId: string): string | undefined {
  const row = getDatabase()
    .prepare(`SELECT snapshot_json AS snapshotJson FROM runtime_attempt_baselines WHERE attempt_id = ?`)
    .get(attemptId) as { snapshotJson: string } | undefined;
  return row?.snapshotJson;
}

export function insertGeneratedAudit(entry: Omit<GeneratedAuditRow, "id"> & { id?: string }): string {
  const id = entry.id ?? crypto.randomUUID();
  getDatabase()
    .prepare(
      `INSERT INTO runtime_generated_audit (
        id, attempt_id, entry_time, user_name, entry_type, object_ref, message, source_command
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      id,
      entry.attemptId,
      entry.entryTime,
      entry.userName,
      entry.entryType,
      entry.objectRef,
      entry.message ?? null,
      entry.sourceCommand ?? null,
    );
  return id;
}

export function listGeneratedAudit(attemptId: string): GeneratedAuditRow[] {
  return getDatabase()
    .prepare(
      `SELECT id, attempt_id AS attemptId, entry_time AS entryTime, user_name AS userName,
              entry_type AS entryType, object_ref AS objectRef, message, source_command AS sourceCommand
       FROM runtime_generated_audit
       WHERE attempt_id = ?
       ORDER BY entry_time`,
    )
    .all(attemptId) as GeneratedAuditRow[];
}

export function insertRuntimeJobLog(entry: Omit<RuntimeJobLogRow, "id"> & { id?: string }): string {
  const id = entry.id ?? crypto.randomUUID();
  getDatabase()
    .prepare(
      `INSERT INTO runtime_job_log_entries (id, attempt_id, timestamp, message_id, message_text)
       VALUES (?, ?, ?, ?, ?)`,
    )
    .run(id, entry.attemptId, entry.timestamp, entry.messageId ?? null, entry.messageText);
  return id;
}

export function listRuntimeJobLog(attemptId: string): RuntimeJobLogRow[] {
  return getDatabase()
    .prepare(
      `SELECT id, attempt_id AS attemptId, timestamp, message_id AS messageId, message_text AS messageText
       FROM runtime_job_log_entries
       WHERE attempt_id = ?
       ORDER BY timestamp`,
    )
    .all(attemptId) as RuntimeJobLogRow[];
}

export function insertCoachEvent(attemptId: string, eventKey: string, message: string): string {
  const id = crypto.randomUUID();
  getDatabase()
    .prepare(
      `INSERT INTO runtime_coach_events (id, attempt_id, event_key, message, created_at)
       VALUES (?, ?, ?, ?, ?)`,
    )
    .run(id, attemptId, eventKey, message, new Date().toISOString());
  return id;
}

export function listCoachEvents(attemptId: string, since?: string): Array<{ eventKey: string; message: string; createdAt: string }> {
  const rows = since
    ? (getDatabase()
        .prepare(
          `SELECT event_key AS eventKey, message, created_at AS createdAt
           FROM runtime_coach_events
           WHERE attempt_id = ? AND created_at > ?
           ORDER BY created_at`,
        )
        .all(attemptId, since) as Array<{ eventKey: string; message: string; createdAt: string }>)
    : (getDatabase()
        .prepare(
          `SELECT event_key AS eventKey, message, created_at AS createdAt
           FROM runtime_coach_events
           WHERE attempt_id = ?
           ORDER BY created_at`,
        )
        .all(attemptId) as Array<{ eventKey: string; message: string; createdAt: string }>);
  return rows;
}

export function clearAttemptRuntime(attemptId: string): void {
  const db = getDatabase();
  db.prepare("DELETE FROM runtime_command_history WHERE attempt_id = ?").run(attemptId);
  db.prepare("DELETE FROM runtime_state_changes WHERE attempt_id = ?").run(attemptId);
  db.prepare("DELETE FROM runtime_generated_audit WHERE attempt_id = ?").run(attemptId);
  db.prepare("DELETE FROM runtime_job_log_entries WHERE attempt_id = ?").run(attemptId);
  db.prepare("DELETE FROM runtime_coach_events WHERE attempt_id = ?").run(attemptId);
  db.prepare("DELETE FROM mission_evidence_tags WHERE attempt_id = ?").run(attemptId);
  db.prepare("DELETE FROM mission_evidence_collected WHERE attempt_id = ?").run(attemptId);
}
