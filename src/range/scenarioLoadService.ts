import { getDatabase } from "../db/sqlite.js";
import { seedScenarioPack } from "../db/seedData.js";
import { getRangeSystem, loadRangeSystems } from "./loadRangeRegistry.js";
import { reloadInMemoryCatalogs } from "./catalogReload.js";
import { getCampaignMissionStatuses } from "./campaignService.js";

function countMissionsForSystem(systemName: string): number {
  const row = getDatabase()
    .prepare(
      `SELECT COUNT(*) AS count
       FROM missions m
       JOIN systems s ON s.id = m.system_id
       WHERE s.name = ?`,
    )
    .get(systemName.trim().toUpperCase()) as { count: number };
  return row.count;
}

/** Ensure a range scenario is seeded in SQLite and in-memory catalogs are warm. */
export function ensureScenarioPackLoaded(systemNameOrId: string): { ok: true; systemName: string } | { ok: false; error: string } {
  const rangeSystem = getRangeSystem(systemNameOrId);
  if (!rangeSystem) {
    return { ok: false, error: `Range system ${systemNameOrId} not found.` };
  }

  if (countMissionsForSystem(rangeSystem.systemName) === 0) {
    seedScenarioPack(getDatabase(), rangeSystem.systemId);
  } else {
    reloadInMemoryCatalogs(rangeSystem.systemId, rangeSystem.systemName);
  }

  return { ok: true, systemName: rangeSystem.systemName };
}

/** Preload scenario packs for upcoming open missions in a campaign (non-blocking safe). */
export function preloadUpcomingCampaignScenarios(campaignId: string, userName: string): string[] {
  const loaded: string[] = [];
  const statuses = getCampaignMissionStatuses(campaignId, userName);
  const targets = statuses.filter((mission) => mission.status === "open" || mission.status === "locked");

  for (const mission of targets) {
    const result = ensureScenarioPackLoaded(mission.entry.systemId);
    if (result.ok) {
      loaded.push(result.systemName);
    }
  }

  return [...new Set(loaded)];
}

/** Preload every active range system — used at server start for multi-scenario campaigns. */
export function preloadAllActiveRangeScenarios(): string[] {
  const loaded: string[] = [];
  for (const system of loadRangeSystems().filter((entry) => entry.status === "active")) {
    const result = ensureScenarioPackLoaded(system.systemId);
    if (result.ok) loaded.push(result.systemName);
  }
  return loaded;
}
