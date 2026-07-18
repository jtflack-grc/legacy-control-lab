import type { ExpectedFindingRow } from "../db/repositories/missionRepository.js";
import type { FindingRow } from "../db/repositories/findingRepository.js";
import type { MissionProgress } from "./missionEngine.js";
import { hasDecisionReadyFinding } from "./scoring.js";
import { listFindings } from "../db/repositories/findingRepository.js";
import { listExpectedFindings } from "../db/repositories/missionRepository.js";
import {
  findCampaignsForMission,
  getCampaignMissionStatuses,
  listCampaignSummaries,
  resolveCampaign,
  resolvePrimaryCampaignForMission,
} from "../range/campaignService.js";
import { getCompletedMissionScore } from "../db/repositories/scorebookRepository.js";
import { getMission } from "../db/repositories/missionRepository.js";

export type MissionPhase = "collect" | "document" | "submit" | "complete";

export type InvestigationLeadStatus = "open" | "partial" | "addressed";

export type InvestigationLead = {
  key: string;
  description: string;
  status: InvestigationLeadStatus;
};

export type MissionReadiness = {
  requiredEvidencePercent: number;
  requiredCollected: number;
  requiredTotal: number;
  optionalCollected: number;
  findingCount: number;
  decisionReady: boolean;
  requiredEvidenceComplete: boolean;
};

export type SignalEntry = {
  id: string;
  message: string;
  kind: "evidence" | "tag" | "event";
};

export type CampaignProgressSummary = {
  campaignId: string;
  title: string;
  completed: number;
  total: number;
};

export type PlaybookPath = "auditor" | "blueteam" | "redteam";

export type CampaignMissionProgress = {
  missionId: string;
  title: string;
  status: "locked" | "open" | "in_progress" | "complete";
  score: number | null;
  order: number;
  laneHint?: string;
  personaHint?: string;
};

export type CampaignTrackDetail = {
  campaignId: string;
  title: string;
  description: string;
  completed: number;
  total: number;
  campaignComplete: boolean;
  missions: CampaignMissionProgress[];
};

export type ProgressionStep = {
  label: string;
  command: string;
};

export type MissionNextStep = {
  kind: "next_mission" | "switch_profile" | "campaign_complete" | "open_campaign";
  missionId?: string;
  missionTitle?: string;
  campaignId: string;
  campaignTitle: string;
  profile?: string;
  steps: ProgressionStep[];
  summary: string;
};

export type PlaybookGuide = {
  path: PlaybookPath;
  title: string;
  subtitle: string;
  phases: string[];
  startSteps: ProgressionStep[];
};

export type MissionProgression = {
  playbookPath: PlaybookPath;
  completedMissionId: string;
  completedMissionTitle: string;
  totalScore: number;
  reportPath?: string;
  primaryCampaign?: CampaignTrackDetail;
  nextStep?: MissionNextStep;
};

export type CampaignQuest = {
  campaignId: string;
  campaignTitle: string;
  completedCount: number;
  totalCount: number;
  nextMissionId: string;
  nextMissionTitle: string;
  profileRequired?: string;
  ctaLabel: string;
  campaignComplete: boolean;
};

const BLUE_TEAM_MISSIONS = new Set(["CLAIMS-005"]);
const RED_TEAM_MISSIONS = new Set(["CLAIMS-007"]);

const PLAYBOOK_GUIDES: Record<PlaybookPath, Omit<PlaybookGuide, "path">> = {
  auditor: {
    title: "Auditor playbook",
    subtitle: "Prove control claims with evidence, findings, and SUBMITMSN.",
    phases: ["Collect", "Document", "Submit", "Debrief"],
    startSteps: [
      { label: "Open audit menu", command: "GO AUDIT" },
      { label: "Start default mission (if needed)", command: "STRMSN MISSION(CLAIMS-001)" },
      { label: "Open governance campaign", command: "WRKCMPMSN CAMPAIGN(IBM-I-ACCESS-GOVERNANCE)" },
    ],
  },
  blueteam: {
    title: "Blue Team playbook",
    subtitle: "Detect with jobs, journals, and logs — then score CLAIMS-005.",
    phases: ["Detect", "Correlate", "Document", "Submit"],
    startSteps: [
      { label: "Sign on as AUDIT", command: "AUDIT / TRAIN" },
      { label: "Open red/blue campaign", command: "WRKCMPMSN CAMPAIGN(RED-BLUE-DETECT-RESPOND)" },
      { label: "Start Blue Team mission", command: "Option 1 beside CLAIMS-005 on WRKCMPMSN" },
    ],
  },
  redteam: {
    title: "Red Team playbook",
    subtitle: "Boundary test as APCLERK — document denials, then score CLAIMS-007.",
    phases: ["Recon", "Escalate", "Document", "Submit"],
    startSteps: [
      { label: "Sign on as APCLERK", command: "APCLERK / TRAIN" },
      { label: "Open red/blue campaign", command: "WRKCMPMSN CAMPAIGN(RED-BLUE-DETECT-RESPOND)" },
      { label: "Start Red Team mission", command: "Option 1 beside CLAIMS-007 (after CLAIMS-005 complete)" },
    ],
  },
};

export type SubmitDebrief = {
  totalScore: number;
  evidenceScore: number;
  issuesScore: number;
  interpretationScore: number;
  findingQualityScore: number;
  matchedFindingKeys: string[];
  partialFindingKeys: string[];
  missedFindingKeys: string[];
  investigationLeads: InvestigationLead[];
  caseStrengthPercent: number;
  caseStrengthLabel: string;
};

function findingsCorpus(findings: FindingRow[]): string {
  return findings
    .map(
      (finding) =>
        `${finding.title} ${finding.evidenceRefs ?? ""} ${finding.controlMapping ?? ""} ${finding.findingText ?? ""} ${finding.decisionImpact ?? ""} ${finding.recommendation ?? ""}`,
    )
    .join(" ")
    .toLowerCase();
}

function patternHits(corpus: string, patterns: string[]): number {
  return patterns.filter((pattern) => corpus.includes(pattern.toLowerCase())).length;
}

function evidenceRefsMentionKey(refs: string | null | undefined, key: string): boolean {
  if (!refs) return false;
  const normalized = refs.toLowerCase();
  return normalized.includes(key.toLowerCase()) || normalized.includes(key.replace(/_/g, " "));
}

export function computeInvestigationLeads(
  expectedFindings: ExpectedFindingRow[],
  findings: FindingRow[],
  collectedKeys: string[],
  evidenceTags: string[],
): InvestigationLead[] {
  const corpus = findingsCorpus(findings);
  return expectedFindings.map((expected) => {
    const hits = patternHits(corpus, expected.matchPatterns);
    const linkedEvidence = collectedKeys.some((key) => evidenceRefsMentionKey(corpus, key));
    const tagOverlap = evidenceTags.length > 0 && hits > 0;

    let status: InvestigationLeadStatus = "open";
    if (hits >= 2) {
      status = "addressed";
    } else if (hits >= 1 || linkedEvidence || tagOverlap) {
      status = "partial";
    }
    return {
      key: expected.findingKey,
      description: expected.description,
      status,
    };
  });
}

export function computeMissionReadiness(
  progress: MissionProgress,
  findings: FindingRow[],
): MissionReadiness {
  const required = progress.requirements.filter((req) => !req.optional);
  const optional = progress.requirements.filter((req) => req.optional);
  const collectedKeys = progress.collected.map((row) => row.requirementKey);
  const requiredCollected = required.filter((req) => collectedKeys.includes(req.requirementKey)).length;
  const optionalCollected = optional.filter((req) => collectedKeys.includes(req.requirementKey)).length;
  const requiredTotal = required.length;
  const requiredEvidencePercent =
    requiredTotal === 0 ? 100 : Math.round((requiredCollected / requiredTotal) * 100);

  return {
    requiredEvidencePercent,
    requiredCollected,
    requiredTotal,
    optionalCollected,
    findingCount: findings.length,
    decisionReady: hasDecisionReadyFinding(findings),
    requiredEvidenceComplete: requiredTotal === 0 || requiredCollected >= requiredTotal,
  };
}

export function computeMissionPhase(readiness: MissionReadiness, submitted: boolean): MissionPhase {
  if (submitted) return "complete";
  if (readiness.decisionReady && readiness.requiredEvidenceComplete) return "submit";
  if (readiness.requiredEvidenceComplete) return "document";
  return "collect";
}

export function buildSignalsFeed(
  progress: MissionProgress,
  coachEvents: Array<{ eventKey: string; message: string }> | undefined,
  previousCollectedKeys: string[],
): SignalEntry[] {
  const signals: SignalEntry[] = [];
  const collectedSet = new Set(progress.collected.map((row) => row.requirementKey));

  for (const key of collectedSet) {
    if (!previousCollectedKeys.includes(key)) {
      const req = progress.requirements.find((row) => row.requirementKey === key);
      signals.push({
        id: `evidence-${key}`,
        kind: "evidence",
        message: `Evidence captured: ${req?.description ?? key}`,
      });
    }
  }

  for (const tag of progress.evidenceTags.slice(-5)) {
    signals.push({
      id: `tag-${tag}`,
      kind: "tag",
      message: `Signal tag: ${tag.replace(/_/g, " ")}`,
    });
  }

  for (const event of coachEvents ?? []) {
    signals.push({
      id: `event-${event.eventKey}`,
      kind: "event",
      message: event.message,
    });
  }

  return signals.slice(-12);
}

export function buildSubmitDebrief(
  attemptId: string,
  missionId: string,
  collectedKeys: string[],
  evidenceTags: string[],
  breakdown: {
    totalScore: number;
    evidenceScore: number;
    issuesScore: number;
    interpretationScore: number;
    findingQualityScore: number;
    matchedFindingKeys: string[];
    partialFindingKeys: string[];
    missedFindingKeys: string[];
  },
): SubmitDebrief {
  const findings = listFindings(attemptId);
  const expected = listExpectedFindings(missionId);
  const investigationLeads = computeInvestigationLeads(
    expected,
    findings,
    collectedKeys,
    evidenceTags,
  );
  let caseScore = 0;
  for (const lead of investigationLeads) {
    if (lead.status === "addressed") caseScore += 1;
    else if (lead.status === "partial") caseScore += 0.5;
  }
  const caseStrengthPercent = investigationLeads.length
    ? Math.round((caseScore / investigationLeads.length) * 100)
    : 0;
  const caseStrengthLabel =
    caseStrengthPercent >= 85
      ? "Decision-ready case strength"
      : caseStrengthPercent >= 60
        ? "Solid case — close the gaps"
        : caseStrengthPercent >= 35
          ? "Partial case — more themes needed"
          : "Weak case — revisit evidence and findings";

  return {
    totalScore: breakdown.totalScore,
    evidenceScore: breakdown.evidenceScore,
    issuesScore: breakdown.issuesScore,
    interpretationScore: breakdown.interpretationScore,
    findingQualityScore: breakdown.findingQualityScore,
    matchedFindingKeys: breakdown.matchedFindingKeys,
    partialFindingKeys: breakdown.partialFindingKeys,
    missedFindingKeys: breakdown.missedFindingKeys,
    investigationLeads,
    caseStrengthPercent,
    caseStrengthLabel,
  };
}

export function buildCampaignProgress(userName: string): CampaignProgressSummary[] {
  return listCampaignSummaries(userName);
}

export function resolvePlaybookPath(missionId?: string, playbookHint?: PlaybookPath): PlaybookPath {
  if (playbookHint === "blueteam" || playbookHint === "redteam") return playbookHint;
  if (missionId && BLUE_TEAM_MISSIONS.has(missionId.toUpperCase())) return "blueteam";
  if (missionId && RED_TEAM_MISSIONS.has(missionId.toUpperCase())) return "redteam";
  return "auditor";
}

export function buildPlaybookGuide(missionId?: string, playbookHint?: PlaybookPath): PlaybookGuide {
  const path = resolvePlaybookPath(missionId, playbookHint);
  return { path, ...PLAYBOOK_GUIDES[path] };
}

function mapCampaignTrack(campaignId: string, userName: string): CampaignTrackDetail | undefined {
  const campaign = resolveCampaign(campaignId);
  if (!campaign) return undefined;

  const missions = getCampaignMissionStatuses(campaignId, userName).map((mission) => ({
    missionId: mission.entry.missionId,
    title: mission.title,
    status: mission.status,
    score: mission.score,
    order: mission.entry.order,
    laneHint: mission.entry.laneHint,
    personaHint: mission.entry.personaHint,
  }));

  const completed = missions.filter((mission) => mission.status === "complete").length;

  return {
    campaignId: campaign.campaignId,
    title: campaign.title,
    description: campaign.description,
    completed,
    total: missions.length,
    campaignComplete: missions.length > 0 && missions.every((mission) => mission.status === "complete"),
    missions,
  };
}

export function buildCampaignTracks(
  userName: string,
  missionId?: string,
  preferredCampaignId?: string,
): CampaignTrackDetail[] {
  const tracks: CampaignTrackDetail[] = [];
  const seen = new Set<string>();

  const primary = missionId
    ? resolvePrimaryCampaignForMission(missionId, preferredCampaignId)
    : undefined;
  if (primary) {
    const track = mapCampaignTrack(primary.campaignId, userName);
    if (track) {
      tracks.push(track);
      seen.add(track.campaignId);
    }
  }

  const path = resolvePlaybookPath(missionId);
  const redBlueId = "RED-BLUE-DETECT-RESPOND";
  if ((path === "blueteam" || path === "redteam") && !seen.has(redBlueId)) {
    const track = mapCampaignTrack(redBlueId, userName);
    if (track) {
      tracks.push(track);
      seen.add(redBlueId);
    }
  }

  for (const campaign of findCampaignsForMission(missionId ?? "CLAIMS-001")) {
    if (seen.has(campaign.campaignId)) continue;
    const track = mapCampaignTrack(campaign.campaignId, userName);
    if (track) tracks.push(track);
  }

  if (tracks.length === 0) {
    for (const summary of listCampaignSummaries(userName)) {
      const track = mapCampaignTrack(summary.campaignId, userName);
      if (track) tracks.push(track);
    }
  }

  return tracks;
}

function buildNextStep(
  campaign: CampaignTrackDetail,
  completedMissionId: string,
): MissionNextStep | undefined {
  const sorted = [...campaign.missions].sort((a, b) => a.order - b.order);
  const completedIndex = sorted.findIndex((mission) => mission.missionId === completedMissionId);
  const nextMission = sorted.slice(completedIndex + 1).find((mission) => mission.status !== "locked");

  if (!nextMission) {
    if (campaign.campaignComplete) {
      return {
        kind: "campaign_complete",
        campaignId: campaign.campaignId,
        campaignTitle: campaign.title,
        steps: [
          { label: "Review scorebook", command: "WRKSCORE" },
          { label: "Export campaign report", command: "EXPRCMPGN" },
        ],
        summary: `${campaign.title} is complete. Review the scorebook or start another campaign with WRKCMPGN.`,
      };
    }
    return {
      kind: "open_campaign",
      campaignId: campaign.campaignId,
      campaignTitle: campaign.title,
      steps: [
        { label: "Open campaign missions", command: `WRKCMPMSN CAMPAIGN(${campaign.campaignId})` },
        { label: "Pick the next open mission", command: "Type option 1 beside the next open row" },
      ],
      summary: "Finish any remaining missions in this campaign from WRKCMPMSN.",
    };
  }

  const steps: ProgressionStep[] = [
    {
      label: "Open campaign",
      command: `WRKCMPMSN CAMPAIGN(${campaign.campaignId})`,
    },
    {
      label: `Start ${nextMission.missionId}`,
      command: `Option 1 beside ${nextMission.missionId} on WRKCMPMSN`,
    },
  ];

  if (nextMission.laneHint === "APCLERK" || nextMission.personaHint === "red_team_adversarial") {
    steps.unshift({ label: "Sign on as APCLERK", command: "APCLERK / TRAIN" });
    return {
      kind: "switch_profile",
      missionId: nextMission.missionId,
      missionTitle: nextMission.title,
      campaignId: campaign.campaignId,
      campaignTitle: campaign.title,
      profile: "APCLERK",
      steps,
      summary: `Blue Team complete. Sign on as APCLERK, open the campaign, and start ${nextMission.missionId}.`,
    };
  }

  return {
    kind: "next_mission",
    missionId: nextMission.missionId,
    missionTitle: nextMission.title,
    campaignId: campaign.campaignId,
    campaignTitle: campaign.title,
    steps,
    summary: `Continue ${campaign.title} with ${nextMission.missionId} — ${nextMission.title}.`,
  };
}

export function buildCampaignQuest(
  userName: string,
  options?: { missionId?: string; missionPhase?: MissionPhase; submitted?: boolean },
): CampaignQuest | undefined {
  const tracks = buildCampaignTracks(userName, options?.missionId);
  const track = tracks[0];
  if (!track) return undefined;

  if (track.campaignComplete) {
    return {
      campaignId: track.campaignId,
      campaignTitle: track.title,
      completedCount: track.completed,
      totalCount: track.total,
      nextMissionId: "",
      nextMissionTitle: "",
      ctaLabel: "Campaign complete",
      campaignComplete: true,
    };
  }

  const nextOpen = track.missions.find((mission) => mission.status === "open");
  if (!nextOpen) return undefined;

  const completedCount = track.missions.filter((mission) => mission.status === "complete").length;
  const currentComplete =
    options?.missionId &&
    track.missions.find((mission) => mission.missionId === options.missionId)?.status === "complete";
  const onCurrentOpenMission =
    options?.missionId?.toUpperCase() === nextOpen.missionId &&
    options?.missionPhase !== "complete" &&
    options?.submitted !== true;
  if (onCurrentOpenMission) return undefined;

  const showQuest =
    options?.missionPhase === "complete" ||
    options?.submitted === true ||
    currentComplete === true;

  if (!showQuest) return undefined;

  const profileRequired =
    nextOpen.laneHint === "APCLERK" || nextOpen.personaHint === "red_team_adversarial"
      ? "APCLERK"
      : undefined;

  return {
    campaignId: track.campaignId,
    campaignTitle: track.title,
    completedCount,
    totalCount: track.total,
    nextMissionId: nextOpen.missionId,
    nextMissionTitle: nextOpen.title,
    profileRequired,
    ctaLabel: profileRequired
      ? `Continue as ${profileRequired} → ${nextOpen.missionId}`
      : `Start next mission → ${nextOpen.missionId}`,
    campaignComplete: false,
  };
}

export function buildMissionProgression(
  userName: string,
  systemName: string,
  missionId: string,
  totalScore: number,
  options?: { campaignId?: string; playbookPath?: PlaybookPath; attemptId?: string },
): MissionProgression {
  const playbookPath = resolvePlaybookPath(missionId, options?.playbookPath);
  const mission = getMission(systemName, missionId);
  const scorebook = getCompletedMissionScore(userName, missionId);
  const primaryCampaign = resolvePrimaryCampaignForMission(missionId, options?.campaignId);
  const primaryTrack = primaryCampaign
    ? mapCampaignTrack(primaryCampaign.campaignId, userName)
    : undefined;

  return {
    playbookPath,
    completedMissionId: missionId,
    completedMissionTitle: mission?.title ?? missionId,
    totalScore,
    reportPath: scorebook?.reportPath ?? undefined,
    primaryCampaign: primaryTrack,
    nextStep: primaryTrack ? buildNextStep(primaryTrack, missionId) : undefined,
  };
}
