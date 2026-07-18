import {
  getDefaultMission,
  getMission,
  listEvidenceRequirements,
  listExpectedFindings,
  listMissions,
} from "../db/repositories/missionRepository.js";
import {
  CLAIMS_003_STEPS,
  CLAIMS_004_STEPS,
  CLAIMS_005_STEPS,
  CLAIMS_006_STEPS,
  CLAIMS_007_STEPS,
  DEFAULT_STEPS,
  type CoachTips,
  type MissionStep,
} from "./coachContent.js";
import { articleForMission, type GrcArticleLink } from "./iOnGrcArticles.js";
import { buildCoachTipsForLane, hydrateSignOnCopy } from "./signOnCredentials.js";
import { getMissionPackaging, type MissionPackaging } from "./missionPackaging.js";

export type MissionCoachPayload = {
  systemName: string;
  mission: {
    id: string;
    title: string;
    briefing: string;
    persona: string | null;
    article?: GrcArticleLink;
  };
  evidence: Array<{
    key: string;
    description: string;
    commandPattern: string;
    optional: boolean;
  }>;
  expectedFindings: Array<{
    key: string;
    description: string;
  }>;
  steps: MissionStep[];
  tips: CoachTips;
  packaging: MissionPackaging;
  evidenceSummary: { required: number; optional: number };
};

export function listMissionSummaries(systemName: string): Array<{ id: string; title: string }> {
  return listMissions(systemName).map((mission) => ({
    id: mission.id,
    title: mission.title,
  }));
}

export function buildMissionCoachPayload(
  systemName: string,
  missionId?: string,
): MissionCoachPayload | undefined {
  const mission = missionId
    ? getMission(systemName, missionId)
    : getDefaultMission(systemName);
  if (!mission) return undefined;

  const evidence = listEvidenceRequirements(mission.id).map((row) => ({
    key: row.requirementKey,
    description: row.description,
    commandPattern: row.commandPattern,
    optional: row.optional,
  }));

  const expectedFindings = listExpectedFindings(mission.id).map((row) => ({
    key: row.findingKey,
    description: row.description,
  }));

  const steps: MissionStep[] =
    mission.id === "CLAIMS-003"
      ? CLAIMS_003_STEPS
      : mission.id === "CLAIMS-004"
        ? CLAIMS_004_STEPS
        : mission.id === "CLAIMS-005"
          ? CLAIMS_005_STEPS
          : mission.id === "CLAIMS-006"
            ? CLAIMS_006_STEPS
            : mission.id === "CLAIMS-007"
              ? CLAIMS_007_STEPS
              : DEFAULT_STEPS;

  const required = evidence.filter((row) => !row.optional).length;
  const optional = evidence.filter((row) => row.optional).length;

  return {
    systemName,
    mission: {
      id: mission.id,
      title: mission.title,
      briefing: hydrateSignOnCopy(mission.briefing, systemName),
      persona: mission.persona,
      article: articleForMission(mission.id),
    },
    evidence,
    expectedFindings,
    steps,
    tips: buildCoachTipsForLane(systemName, "auditor"),
    packaging: getMissionPackaging(mission.id, { required, optional }),
    evidenceSummary: { required, optional },
  };
}
