import { randomUUID } from "node:crypto";
import { getDatabase } from "../sqlite.js";
import { getSystemIdByName } from "./systemRepository.js";

export type CatalogObjectRow = {
  library: string;
  object: string;
  type: string;
  publicAuth: string;
  owner: string | null;
  text: string | null;
};

type ObjectRow = {
  library: string;
  object: string;
  type: string;
  publicAuth: string | null;
  owner: string | null;
  text: string | null;
};

const OBJECT_SELECT = `SELECT library, name AS object, object_type AS type,
              public_authority AS publicAuth, owner, text_description AS text
       FROM objects
       WHERE system_id = ?`;

function mapObjectRow(row: ObjectRow): CatalogObjectRow {
  return {
    library: row.library,
    object: row.object,
    type: row.type,
    publicAuth: row.publicAuth ?? "*EXCLUDE",
    owner: row.owner,
    text: row.text,
  };
}

export type ObjectFilter = {
  library?: string;
  object?: string;
  type?: string;
  owner?: string;
};

export function listObjects(systemName: string): CatalogObjectRow[] {
  return findObjects(systemName, {});
}

export function getObject(
  systemName: string,
  library: string,
  object: string,
): CatalogObjectRow | undefined {
  const systemId = getSystemIdByName(systemName);
  const row = getDatabase()
    .prepare(`${OBJECT_SELECT} AND library = ? AND name = ?`)
    .get(systemId, library.trim().toUpperCase(), object.trim().toUpperCase()) as ObjectRow | undefined;
  return row ? mapObjectRow(row) : undefined;
}

export function findObjects(systemName: string, filter: ObjectFilter): CatalogObjectRow[] {
  const systemId = getSystemIdByName(systemName);
  const clauses: string[] = [];
  const params: string[] = [systemId];

  if (filter.library && filter.library !== "*ALL") {
    clauses.push("AND library = ?");
    params.push(filter.library);
  }

  if (filter.object && filter.object !== "*ALL") {
    clauses.push("AND name = ?");
    params.push(filter.object);
  }

  if (filter.type && filter.type !== "*ALL") {
    clauses.push("AND object_type = ?");
    params.push(filter.type);
  }

  if (filter.owner) {
    clauses.push("AND owner = ?");
    params.push(filter.owner);
  }

  const rows = getDatabase()
    .prepare(`${OBJECT_SELECT} ${clauses.join(" ")} ORDER BY library, name`)
    .all(...params) as ObjectRow[];

  return rows.map(mapObjectRow);
}

export function insertObject(
  systemName: string,
  library: string,
  object: string,
  objectType: string,
  options: { owner?: string; text?: string; publicAuth?: string } = {},
): void {
  const systemId = getSystemIdByName(systemName);
  getDatabase()
    .prepare(
      `INSERT INTO objects (id, system_id, library, name, object_type, owner, text_description, public_authority)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      randomUUID(),
      systemId,
      library.trim().toUpperCase(),
      object.trim().toUpperCase(),
      objectType.trim().toUpperCase(),
      options.owner ?? null,
      options.text ?? null,
      options.publicAuth ?? "*EXCLUDE",
    );
}

export function updateObject(
  systemName: string,
  library: string,
  object: string,
  patch: Partial<Pick<CatalogObjectRow, "type" | "publicAuth" | "owner" | "text">>,
): boolean {
  const systemId = getSystemIdByName(systemName);
  const sets: string[] = [];
  const params: (string | null)[] = [];
  if (patch.type) {
    sets.push("object_type = ?");
    params.push(patch.type.trim().toUpperCase());
  }
  if (patch.publicAuth) {
    sets.push("public_authority = ?");
    params.push(patch.publicAuth);
  }
  if (patch.owner !== undefined) {
    sets.push("owner = ?");
    params.push(patch.owner);
  }
  if (patch.text !== undefined) {
    sets.push("text_description = ?");
    params.push(patch.text);
  }
  if (!sets.length) return false;
  params.push(systemId, library.trim().toUpperCase(), object.trim().toUpperCase());
  const result = getDatabase()
    .prepare(`UPDATE objects SET ${sets.join(", ")} WHERE system_id = ? AND library = ? AND name = ?`)
    .run(...params);
  return result.changes > 0;
}

export function deleteObject(systemName: string, library: string, object: string): boolean {
  const systemId = getSystemIdByName(systemName);
  const result = getDatabase()
    .prepare("DELETE FROM objects WHERE system_id = ? AND library = ? AND name = ?")
    .run(systemId, library.trim().toUpperCase(), object.trim().toUpperCase());
  return result.changes > 0;
}
