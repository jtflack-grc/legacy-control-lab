import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type { CommandSeedEntry } from "../db/commandCatalogSeed.js";

const CATEGORY_FILES = [
  "security.commands.json",
  "system-values.commands.json",
  "user-profile.commands.json",
  "authority.commands.json",
  "object-library.commands.json",
  "job-subsystem.commands.json",
  "spool-print.commands.json",
  "message.commands.json",
  "journal-audit.commands.json",
  "database-file.commands.json",
  "ifs.commands.json",
  "pase.commands.json",
  "tcpip-network.commands.json",
  "ptf-license.commands.json",
  "source-pdm.commands.json",
  "sql-services.commands.json",
  "lab-native.commands.json",
] as const;

export function resolveCommandCatalogDir(): string {
  const fromEnv = process.env.COMMAND_CATALOG_ROOT;
  if (fromEnv) return fromEnv;
  return join(process.cwd(), "data", "command-catalog");
}

export function loadCommandCatalogEntries(): CommandSeedEntry[] {
  const catalogDir = resolveCommandCatalogDir();
  if (!existsSync(catalogDir)) {
    return [];
  }

  const byName = new Map<string, CommandSeedEntry>();
  for (const fileName of CATEGORY_FILES) {
    const filePath = join(catalogDir, fileName);
    if (!existsSync(filePath)) continue;
    const entries = JSON.parse(readFileSync(filePath, "utf8")) as CommandSeedEntry[];
    for (const entry of entries) {
      byName.set(entry.name.toUpperCase(), entry);
    }
  }

  const extraFiles = readdirSync(catalogDir).filter(
    (name) => name.endsWith(".commands.json") && !CATEGORY_FILES.includes(name as (typeof CATEGORY_FILES)[number]),
  );
  for (const fileName of extraFiles) {
    const entries = JSON.parse(readFileSync(join(catalogDir, fileName), "utf8")) as CommandSeedEntry[];
    for (const entry of entries) {
      byName.set(entry.name.toUpperCase(), entry);
    }
  }

  return [...byName.values()].sort((a, b) => a.name.localeCompare(b.name));
}
