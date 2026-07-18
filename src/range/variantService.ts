import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { resolveScenarioPackDir } from "../scenario/loadScenarioPack.js";

export type MissionVariant = {
  variantId: string;
  missionId: string;
  title: string;
  seed?: number;
  riskPattern?: string;
  stateOverrides?: Record<string, unknown>;
};

export function loadMissionVariants(scenarioId: string, missionId: string): MissionVariant[] {
  const path = join(resolveScenarioPackDir(scenarioId), "missions", missionId, "variants.json");
  if (!existsSync(path)) return [];
  return JSON.parse(readFileSync(path, "utf8")) as MissionVariant[];
}

export function getMissionVariant(
  scenarioId: string,
  variantId: string,
): MissionVariant | undefined {
  const missionId = variantId.replace(/-[AB]$/, "");
  return loadMissionVariants(scenarioId, missionId).find((v) => v.variantId === variantId);
}
