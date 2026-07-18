import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import type { Database as SqliteDatabase } from "better-sqlite3";
import type { CommandStatus } from "../ibmi-runtime/commandCatalog.js";
import { loadCommandCatalogEntries } from "../catalog/loadCommandCatalog.js";
import { COMMAND_CATALOG_VERSION } from "../ibmi-runtime/commandCatalog.js";
import { loadCommandCatalogOverrides } from "../scenario/loadScenarioPack.js";
import { getSchemaMeta, setSchemaMeta } from "./schemaMeta.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const CATALOG_VERSION_KEY = "command_catalog_version";

export type CommandSeedParameter = {
  name: string;
  type: string;
  default?: string;
  required?: boolean;
  supportsSpecialValues?: string[];
};

export type CommandSeedEntry = {
  name: string;
  displayName: string;
  category: string;
  status: CommandStatus;
  allowLimitedUser?: boolean;
  requiresAuthority?: string[];
  handler?: string;
  parameters?: CommandSeedParameter[];
};

export function loadCommandCatalogSeed(): CommandSeedEntry[] {
  const fromPack = loadCommandCatalogEntries();
  if (fromPack.length > 0) {
    return fromPack;
  }
  const path = join(__dirname, "..", "data", "commandCatalog.seed.json");
  return JSON.parse(readFileSync(path, "utf8")) as CommandSeedEntry[];
}

export function loadCommandCatalogSeedWithOverrides(): CommandSeedEntry[] {
  const base = loadCommandCatalogSeed();
  const overrides = loadCommandCatalogOverrides() as Partial<CommandSeedEntry>[];
  if (overrides.length === 0) {
    return base;
  }

  const byName = new Map(base.map((entry) => [entry.name.toUpperCase(), entry]));
  for (const override of overrides) {
    if (!override.name) continue;
    const name = override.name.toUpperCase();
    const existing = byName.get(name);
    if (existing) {
      byName.set(name, { ...existing, ...override, name });
      continue;
    }
    byName.set(name, {
      name,
      displayName: override.displayName ?? name,
      category: override.category ?? "Other",
      status: override.status ?? "cataloged",
      ...override,
    });
  }

  return [...byName.values()];
}

export function isCommandCatalogSeeded(db: SqliteDatabase): boolean {
  const row = db.prepare("SELECT COUNT(*) AS count FROM commands").get() as { count: number };
  return row.count > 0;
}

export function seedCommandCatalog(
  db: SqliteDatabase,
  entries: CommandSeedEntry[] = loadCommandCatalogSeedWithOverrides(),
): void {
  const seedAll = db.transaction(() => {
    db.exec("DELETE FROM command_parameters; DELETE FROM commands;");

    const insertCommand = db.prepare(`
      INSERT INTO commands (
        id, name, display_name, category, status, handler,
        allow_limited_user, requires_authority
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const insertParameter = db.prepare(`
      INSERT INTO command_parameters (
        id, command_id, name, param_type, default_value, required, supports_special_values
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    for (const entry of entries) {
      const commandId = `cmd-${entry.name.toLowerCase()}`;
      insertCommand.run(
        commandId,
        entry.name.toUpperCase(),
        entry.displayName,
        entry.category,
        entry.status,
        entry.handler ?? null,
        entry.allowLimitedUser === false ? 0 : 1,
        JSON.stringify(entry.requiresAuthority ?? []),
      );

      for (const param of entry.parameters ?? []) {
        insertParameter.run(
          `param-${entry.name.toLowerCase()}-${param.name.toLowerCase()}`,
          commandId,
          param.name.toUpperCase(),
          param.type,
          param.default ?? null,
          param.required ? 1 : 0,
          JSON.stringify(param.supportsSpecialValues ?? []),
        );
      }
    }
  });

  seedAll();
}

function getStoredCatalogVersion(db: SqliteDatabase): string | undefined {
  return getSchemaMeta(db, CATALOG_VERSION_KEY);
}

/** Re-seed command catalog when the version changes or legacy rows are out of date. */
export function syncCommandCatalogIfNeeded(db: SqliteDatabase, force = false): void {
  const storedVersion = getStoredCatalogVersion(db);
  if (!force && storedVersion === COMMAND_CATALOG_VERSION && isCommandCatalogSeeded(db)) {
    return;
  }

  seedCommandCatalog(db);
  setSchemaMeta(db, CATALOG_VERSION_KEY, COMMAND_CATALOG_VERSION);
  console.log(`[db] synced command catalog to ${COMMAND_CATALOG_VERSION}`);
}
