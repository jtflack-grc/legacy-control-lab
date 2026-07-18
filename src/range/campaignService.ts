import {
  getRangeSystem,
  loadAllCampaigns,
  loadCampaign,
  type CampaignDefinition,
  type CampaignMissionEntry,
} from "./loadRangeRegistry.js";
import { getSubmittedMissionScore } from "../db/repositories/missionRepository.js";
import { getCompletedMissionScore } from "../db/repositories/scorebookRepository.js";
import { getDatabase } from "../db/sqlite.js";

function lookupMissionTitle(systemName: string, missionId: string): string | undefined {
  const row = getDatabase()
    .prepare(
      `SELECT m.title FROM missions m
       JOIN systems s ON s.id = m.system_id
       WHERE s.name = ? AND m.id = ?`,
    )
    .get(systemName.trim().toUpperCase(), missionId) as { title: string } | undefined;
  return row?.title;
}

export type CampaignMissionStatus = {
  entry: CampaignMissionEntry;
  systemName: string;
  title: string;
  status: "locked" | "open" | "in_progress" | "complete";
  score: number | null;
};

export function resolveCampaign(campaignKey?: string): CampaignDefinition | undefined {
  if (!campaignKey) return loadCampaign("ibm-i-access-governance");
  return loadCampaign(campaignKey) ?? loadAllCampaigns().find((c) => c.campaignId === campaignKey.toUpperCase());
}

export function listCampaignSummaries(userName: string): Array<{
  campaignId: string;
  title: string;
  completed: number;
  total: number;
}> {
  return loadAllCampaigns().map((campaign) => {
    const missions = getCampaignMissionStatuses(campaign.campaignId, userName);
    const completed = missions.filter((m) => m.status === "complete").length;
    return {
      campaignId: campaign.campaignId,
      title: campaign.title,
      completed,
      total: missions.length,
    };
  });
}

export function findCampaignsForMission(missionId: string): CampaignDefinition[] {
  const normalized = missionId.toUpperCase();
  return loadAllCampaigns().filter((campaign) =>
    campaign.missions.some((entry) => entry.missionId === normalized),
  );
}

export function resolvePrimaryCampaignForMission(
  missionId: string,
  preferredCampaignId?: string,
): CampaignDefinition | undefined {
  if (preferredCampaignId) {
    const preferred = resolveCampaign(preferredCampaignId);
    if (preferred?.missions.some((entry) => entry.missionId === missionId.toUpperCase())) {
      return preferred;
    }
  }

  const matches = findCampaignsForMission(missionId);
  const priority = [
    "IBM-I-ACCESS-GOVERNANCE",
    "RED-BLUE-DETECT-RESPOND",
    "RED-TEAM-STANDALONE",
    "IBM-I-AUDIT-EVIDENCE",
  ];
  for (const campaignId of priority) {
    const match = matches.find((campaign) => campaign.campaignId === campaignId);
    if (match) return match;
  }
  return matches[0];
}

export function getCampaignMissionStatuses(
  campaignId: string,
  userName: string,
): CampaignMissionStatus[] {
  const campaign = resolveCampaign(campaignId);
  if (!campaign) return [];

  const statuses: CampaignMissionStatus[] = [];
  let previousComplete = true;

  for (const entry of [...campaign.missions].sort((a, b) => a.order - b.order)) {
    const rangeSystem = getRangeSystem(entry.systemId);
    const resolvedSystem = rangeSystem?.systemName ?? entry.systemId.toUpperCase();
    const scorebook = getCompletedMissionScore(userName, entry.missionId);
    const submitted =
      scorebook ?? getSubmittedMissionScore(resolvedSystem, userName, entry.missionId);
    const completed = scorebook ?? submitted;
    let status: CampaignMissionStatus["status"] = "open";
    if (entry.unlockRule === "previous_complete" && !previousComplete) {
      status = "locked";
    } else if (completed) {
      status = "complete";
      previousComplete = true;
    } else {
      status = "open";
      previousComplete = false;
    }

    statuses.push({
      entry,
      systemName: resolvedSystem,
      title: lookupMissionTitle(resolvedSystem, entry.missionId) ?? entry.missionId,
      status,
      score: completed?.totalScore ?? null,
    });
  }

  return statuses;
}
