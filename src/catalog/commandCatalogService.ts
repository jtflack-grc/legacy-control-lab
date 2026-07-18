import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { loadCommandCatalogEntries } from "./loadCommandCatalog.js";
import { enrichCatalogCommand } from "./commandEnrichment.js";
import {
  isPromptableCommand,
  resolveImplementationLevel,
  type CatalogCommandDefinition,
  type CommandImplementationLevel,
} from "./commandTypes.js";

let cachedCatalog: CatalogCommandDefinition[] | undefined;

export function loadFullCommandCatalog(): CatalogCommandDefinition[] {
  if (cachedCatalog) return cachedCatalog;

  const entries = loadCommandCatalogEntries() as CatalogCommandDefinition[];
  cachedCatalog = entries.map((entry) => {
    const enriched = enrichCatalogCommand({
      ...entry,
      promptable: isPromptableCommand(entry),
    });
    return {
      ...enriched,
      implementationLevel: resolveImplementationLevel(enriched),
      promptable: enriched.promptable ?? isPromptableCommand(enriched),
    };
  });
  return cachedCatalog;
}

export function resetCommandCatalogCache(): void {
  cachedCatalog = undefined;
}

export function getCatalogCommand(name: string): CatalogCommandDefinition | undefined {
  const normalized = name.trim().toUpperCase();
  return loadFullCommandCatalog().find(
    (entry) => entry.name === normalized || entry.aliases?.some((alias) => alias.toUpperCase() === normalized),
  );
}

export function listCommandsByGroupMenu(groupMenu: string): CatalogCommandDefinition[] {
  const key = groupMenu.toUpperCase().replace(/^CMD/, "CMD");
  return loadFullCommandCatalog()
    .filter((entry) => (entry.groupMenu ?? inferGroupMenu(entry.category)).toUpperCase() === key)
    .sort((a, b) => a.displayName.localeCompare(b.displayName));
}

export function inferGroupMenu(category: string): string {
  const map: Record<string, string> = {
    security: "CMDSEC",
    user_profile: "CMDUSR",
    authority: "CMDAUT",
    system_value: "CMDSYS",
    journal_audit: "CMDJRN",
    library_object: "CMDOBJ",
    database_file: "CMDFILE",
    job_batch: "CMDJOB",
    spool_print: "CMDSPL",
    message_queue: "CMDMSG",
    ifs: "CMDIFS",
    pase: "CMDIFS",
    ptf_license: "CMDPTF",
    source_pdm: "CMDSRC",
    sql_services: "CMDSQL",
    network_tcpip: "CMDTCP",
    mission_lab: "CMDLAB",
    range: "CMDLAB",
    backup_restore: "CMDLAB",
  };
  return map[category] ?? "CMDLAB";
}

export type CommandCoverageReport = {
  total: number;
  byLevel: Record<CommandImplementationLevel, number>;
  byStatus: Record<string, number>;
  promptable: number;
  byCategory: Array<{
    category: string;
    cataloged: number;
    promptable: number;
    implemented: number;
    stateful: number;
  }>;
};

export function buildCommandCoverageReport(): CommandCoverageReport {
  const catalog = loadFullCommandCatalog();
  const byLevel: Record<CommandImplementationLevel, number> = {
    unknown: 0,
    cataloged: 0,
    promptable: 0,
    display_implemented: 0,
    stateful_implemented: 0,
    lab_native: 0,
  };
  const byStatus: Record<string, number> = {};
  let promptable = 0;

  const categoryMap = new Map<
    string,
    { cataloged: number; promptable: number; implemented: number; stateful: number }
  >();

  for (const entry of catalog) {
    const level = resolveImplementationLevel(entry);
    byLevel[level] = (byLevel[level] ?? 0) + 1;
    byStatus[entry.status] = (byStatus[entry.status] ?? 0) + 1;
    if (isPromptableCommand(entry)) promptable += 1;

    const bucket = categoryMap.get(entry.category) ?? {
      cataloged: 0,
      promptable: 0,
      implemented: 0,
      stateful: 0,
    };
    bucket.cataloged += 1;
    if (isPromptableCommand(entry)) bucket.promptable += 1;
    if (entry.status === "implemented") bucket.implemented += 1;
    if (level === "stateful_implemented" || level === "lab_native") bucket.stateful += 1;
    categoryMap.set(entry.category, bucket);
  }

  return {
    total: catalog.length,
    byLevel,
    byStatus,
    promptable,
    byCategory: [...categoryMap.entries()]
      .map(([category, counts]) => ({ category, ...counts }))
      .sort((a, b) => a.category.localeCompare(b.category)),
  };
}

export function loadCatalogIndex(): { version: string; commandCount: number } {
  const path = join(resolveCommandCatalogDir(), "index.json");
  if (!existsSync(path)) {
    return { version: "0.6.0", commandCount: loadFullCommandCatalog().length };
  }
  return JSON.parse(readFileSync(path, "utf8")) as { version: string; commandCount: number };
}

function resolveCommandCatalogDir(): string {
  const fromEnv = process.env.COMMAND_CATALOG_ROOT;
  if (fromEnv) return fromEnv;
  return join(process.cwd(), "data", "command-catalog");
}
