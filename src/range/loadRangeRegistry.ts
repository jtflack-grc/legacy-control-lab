import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

export type RangeManifest = {
  rangeId: string;
  title: string;
  description: string;
  version: string;
  defaultSystem: string;
  defaultCampaign: string;
  defaultMode: string;
  supportedModes: string[];
};

export type RangeSystemEntry = {
  systemId: string;
  systemName: string;
  title: string;
  industry: string;
  status: string;
  defaultMission: string;
  scenarioPath: string;
};

export type PersonaDefinition = {
  personaId: string;
  title: string;
  description: string;
  defaultCoachLevel: string;
  commandRestrictions?: string[];
  scoringWeights: {
    evidenceCoverage: number;
    issueIdentification: number;
    controlInterpretation: number;
    findingQuality: number;
  };
  expectedArtifact: string;
};

export type CampaignMissionEntry = {
  missionId: string;
  systemId: string;
  order: number;
  required: boolean;
  unlockRule: "always" | "previous_complete";
  personaHint?: string;
  laneHint?: string;
};

export type CampaignDefinition = {
  campaignId: string;
  title: string;
  description: string;
  systems: string[];
  personaModes?: string[];
  missions: CampaignMissionEntry[];
  completionCriteria?: {
    requiredMissionsComplete?: boolean;
    minimumAverageScore?: number;
    requiredArtifacts?: string[];
  };
};

function resolveRangeDir(): string {
  const fromEnv = process.env.RANGE_ROOT;
  if (fromEnv) return fromEnv;
  return join(process.cwd(), "data", "range");
}

function resolveCampaignsDir(): string {
  const fromEnv = process.env.CAMPAIGNS_ROOT;
  if (fromEnv) return fromEnv;
  return join(process.cwd(), "data", "campaigns");
}

export function loadRangeManifest(): RangeManifest {
  const path = join(resolveRangeDir(), "range.json");
  if (!existsSync(path)) {
    throw new Error(`Range manifest not found: ${path}`);
  }
  return JSON.parse(readFileSync(path, "utf8")) as RangeManifest;
}

export function loadRangeSystems(): RangeSystemEntry[] {
  const path = join(resolveRangeDir(), "systems.json");
  if (!existsSync(path)) return [];
  return JSON.parse(readFileSync(path, "utf8")) as RangeSystemEntry[];
}

export function loadPersonas(): PersonaDefinition[] {
  const path = join(resolveRangeDir(), "personas.json");
  if (!existsSync(path)) return [];
  return JSON.parse(readFileSync(path, "utf8")) as PersonaDefinition[];
}

export function getRangeSystem(systemNameOrId: string): RangeSystemEntry | undefined {
  const normalized = systemNameOrId.trim().toUpperCase();
  return loadRangeSystems().find(
    (entry) =>
      entry.systemName === normalized ||
      entry.systemId.toLowerCase() === systemNameOrId.trim().toLowerCase(),
  );
}

export function listCampaignIds(): string[] {
  const campaignsDir = resolveCampaignsDir();
  if (!existsSync(campaignsDir)) return [];

  return readdirSync(campaignsDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name);
}

export function loadCampaign(campaignKey: string): CampaignDefinition | undefined {
  const campaignsDir = resolveCampaignsDir();
  const folder = join(campaignsDir, campaignKey.toLowerCase());
  const campaignPath = join(folder, "campaign.json");
  if (existsSync(campaignPath)) {
    return JSON.parse(readFileSync(campaignPath, "utf8")) as CampaignDefinition;
  }

  const legacyPath = join(campaignsDir, `${campaignKey.toLowerCase()}.json`);
  if (existsSync(legacyPath)) {
    const legacy = JSON.parse(readFileSync(legacyPath, "utf8")) as {
      campaignId: string;
      title: string;
      description: string;
      missions: string[];
    };
    return {
      campaignId: legacy.campaignId,
      title: legacy.title,
      description: legacy.description,
      systems: ["claims400"],
      missions: legacy.missions.map((missionId, index) => ({
        missionId,
        systemId: "claims400",
        order: index + 1,
        required: true,
        unlockRule: index === 0 ? "always" : "previous_complete",
      })),
    };
  }

  return undefined;
}

export function loadAllCampaigns(): CampaignDefinition[] {
  const campaigns: CampaignDefinition[] = [];
  for (const id of listCampaignIds()) {
    const campaign = loadCampaign(id);
    if (campaign) campaigns.push(campaign);
  }
  return campaigns;
}
