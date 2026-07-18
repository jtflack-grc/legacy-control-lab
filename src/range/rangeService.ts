import type { IbmiSession } from "../ibmi-runtime/sessionService.js";
import { ensureScenarioPackLoaded } from "./scenarioLoadService.js";
import { reloadInMemoryCatalogs } from "./catalogReload.js";
import { getRangeSystem, loadRangeSystems } from "./loadRangeRegistry.js";

export { reloadInMemoryCatalogs } from "./catalogReload.js";

export function listActiveRangeSystems() {
  return loadRangeSystems().filter((entry) => entry.status === "active");
}

export function selectRangeSystem(session: IbmiSession, systemNameOrId: string): { ok: true } | { ok: false; message: string } {
  const system = getRangeSystem(systemNameOrId);
  if (!system) {
    return { ok: false, message: `CPF2204 - System ${systemNameOrId} not found in range registry.` };
  }

  const loaded = ensureScenarioPackLoaded(system.systemId);
  if (!loaded.ok) {
    return { ok: false, message: `CPF2204 - ${loaded.error}` };
  }

  session.systemName = loaded.systemName;
  session.scenarioId = system.systemId;
  session.missionAttemptId = undefined;
  reloadInMemoryCatalogs(system.systemId, loaded.systemName);
  return { ok: true };
}
