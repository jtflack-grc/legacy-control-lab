import { randomUUID } from "node:crypto";
import { getDatabase } from "../sqlite.js";
import { getSystemIdByName } from "./systemRepository.js";

export type CatalogLabEntityRow = {
  entityType: string;
  entityId: string;
  state: Record<string, unknown>;
};

function parseState(raw: string): Record<string, unknown> {
  try {
    return JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return { value: raw };
  }
}

export function getCatalogLabEntity(
  systemName: string,
  entityType: string,
  entityId: string,
): CatalogLabEntityRow | undefined {
  const systemId = getSystemIdByName(systemName);
  const row = getDatabase()
    .prepare(
      `SELECT entity_type AS entityType, entity_id AS entityId, state_json AS stateJson
       FROM catalog_lab_entities
       WHERE system_id = ? AND entity_type = ? AND entity_id = ?`,
    )
    .get(systemId, entityType, entityId.trim().toUpperCase()) as
    | { entityType: string; entityId: string; stateJson: string }
    | undefined;
  if (!row) return undefined;
  return { entityType: row.entityType, entityId: row.entityId, state: parseState(row.stateJson) };
}

export function listCatalogLabEntities(systemName: string, entityType?: string): CatalogLabEntityRow[] {
  const systemId = getSystemIdByName(systemName);
  const rows = entityType
    ? (getDatabase()
        .prepare(
          `SELECT entity_type AS entityType, entity_id AS entityId, state_json AS stateJson
           FROM catalog_lab_entities
           WHERE system_id = ? AND entity_type = ?
           ORDER BY entity_id`,
        )
        .all(systemId, entityType) as Array<{ entityType: string; entityId: string; stateJson: string }>)
    : (getDatabase()
        .prepare(
          `SELECT entity_type AS entityType, entity_id AS entityId, state_json AS stateJson
           FROM catalog_lab_entities
           WHERE system_id = ?
           ORDER BY entity_type, entity_id`,
        )
        .all(systemId) as Array<{ entityType: string; entityId: string; stateJson: string }>);
  return rows.map((row) => ({
    entityType: row.entityType,
    entityId: row.entityId,
    state: parseState(row.stateJson),
  }));
}

export function upsertCatalogLabEntity(
  systemName: string,
  entityType: string,
  entityId: string,
  state: Record<string, unknown>,
): void {
  const systemId = getSystemIdByName(systemName);
  const id = entityId.trim().toUpperCase();
  const stateJson = JSON.stringify(state);
  const existing = getDatabase()
    .prepare(
      "SELECT id FROM catalog_lab_entities WHERE system_id = ? AND entity_type = ? AND entity_id = ?",
    )
    .get(systemId, entityType, id) as { id: string } | undefined;
  if (existing) {
    getDatabase()
      .prepare("UPDATE catalog_lab_entities SET state_json = ?, updated_at = ? WHERE id = ?")
      .run(stateJson, new Date().toISOString(), existing.id);
    return;
  }
  getDatabase()
    .prepare(
      `INSERT INTO catalog_lab_entities (id, system_id, entity_type, entity_id, state_json, updated_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
    )
    .run(randomUUID(), systemId, entityType, id, stateJson, new Date().toISOString());
}

export function deleteCatalogLabEntity(
  systemName: string,
  entityType: string,
  entityId: string,
): boolean {
  const systemId = getSystemIdByName(systemName);
  const result = getDatabase()
    .prepare(
      "DELETE FROM catalog_lab_entities WHERE system_id = ? AND entity_type = ? AND entity_id = ?",
    )
    .run(systemId, entityType, entityId.trim().toUpperCase());
  return result.changes > 0;
}
