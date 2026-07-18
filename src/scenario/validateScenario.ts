import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { resolveScenarioPackDir } from "./loadScenarioPack.js";

export type ScenarioValidationResult = {
  ok: boolean;
  scenarioId: string;
  errors: string[];
  warnings: string[];
};

function readJson<T>(filePath: string): T | undefined {
  if (!existsSync(filePath)) return undefined;
  return JSON.parse(readFileSync(filePath, "utf8")) as T;
}

export function validateScenarioPack(scenarioId: string): ScenarioValidationResult {
  const packDir = resolveScenarioPackDir(scenarioId);
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!existsSync(join(packDir, "scenario.json"))) {
    return { ok: false, scenarioId, errors: [`Missing scenario.json in ${packDir}`], warnings };
  }

  const manifest = readJson<Record<string, unknown>>(join(packDir, "scenario.json")) ?? {};
  if (!manifest.systemName && !manifest.name) {
    errors.push("scenario.json must include systemName or name.");
  }

  const usersPath = existsSync(join(packDir, "system", "users.json"))
    ? join(packDir, "system", "users.json")
    : join(packDir, "users.json");
  if (!existsSync(usersPath)) {
    errors.push("Missing users.json (flat or system/users.json).");
  }

  const missionsJson = readJson<{ missions?: Array<{ id: string }> }>(join(packDir, "missions.json"));
  const missionDirs = ["CLAIMS-001", "CLAIMS-002", "CLAIMS-003"].filter((missionId) =>
    existsSync(join(packDir, "missions", missionId, "mission.json")),
  );

  if (!missionsJson?.missions?.length && missionDirs.length === 0) {
    errors.push("No missions found in missions.json or missions/<id>/mission.json.");
  }

  for (const missionId of missionDirs) {
    const mission = readJson<{ missionId?: string; title?: string }>(
      join(packDir, "missions", missionId, "mission.json"),
    );
    if (!mission?.title) {
      warnings.push(`Mission ${missionId} is missing title in mission.json.`);
    }
    if (mission?.missionId && mission.missionId !== missionId) {
      errors.push(`Mission folder ${missionId} has mismatched missionId ${mission.missionId}.`);
    }
  }

  if (!existsSync(join(process.cwd(), "data", "control-mapping", "controls.json"))) {
    warnings.push("Control mapping file not found at data/control-mapping/controls.json.");
  }

  return { ok: errors.length === 0, scenarioId, errors, warnings };
}
