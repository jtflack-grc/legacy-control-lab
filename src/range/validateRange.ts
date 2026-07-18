import { existsSync } from "node:fs";
import { join } from "node:path";
import { loadRangeManifest, loadRangeSystems, loadPersonas, loadAllCampaigns } from "./loadRangeRegistry.js";
import { validateScenarioPack } from "../scenario/validateScenario.js";
import { loadControlMappings } from "../runtime/controlMapping.js";

export type RangeValidationResult = {
  ok: boolean;
  errors: string[];
  warnings: string[];
  systems: number;
  campaigns: number;
  missions: number;
  controls: number;
};

export function validateRange(): RangeValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  try {
    loadRangeManifest();
  } catch (error) {
    errors.push(String(error));
    return { ok: false, errors, warnings, systems: 0, campaigns: 0, missions: 0, controls: 0 };
  }

  const systems = loadRangeSystems();
  const personas = loadPersonas();
  const campaigns = loadAllCampaigns();
  let missionCount = 0;

  for (const system of systems) {
    const scenarioResult = validateScenarioPack(system.systemId);
    if (!scenarioResult.ok) {
      errors.push(...scenarioResult.errors.map((e) => `${system.systemId}: ${e}`));
    }
    warnings.push(...scenarioResult.warnings.map((w) => `${system.systemId}: ${w}`));
    if (!existsSync(join(process.cwd(), system.scenarioPath, "scenario.json"))) {
      errors.push(`Scenario path missing for ${system.systemId}: ${system.scenarioPath}`);
    }
  }

  for (const campaign of campaigns) {
    missionCount += campaign.missions.length;
    for (const mission of campaign.missions) {
      const system = systems.find((s) => s.systemId === mission.systemId);
      if (!system) {
        errors.push(`Campaign ${campaign.campaignId} references unknown system ${mission.systemId}`);
      }
    }
  }

  const manifest = loadRangeManifest();
  for (const mode of manifest.supportedModes) {
    if (!["coach", "assessment", "expert", "workshop"].includes(mode)) {
      warnings.push(`Unknown guidance mode in range.json: ${mode}`);
    }
  }

  if (personas.length === 0) {
    warnings.push("No personas defined in data/range/personas.json");
  }

  const controls = loadControlMappings().length;

  return {
    ok: errors.length === 0,
    errors,
    warnings,
    systems: systems.length,
    campaigns: campaigns.length,
    missions: missionCount,
    controls,
  };
}
