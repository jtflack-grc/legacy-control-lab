import { upsertScorebookEntry } from "../db/repositories/scorebookRepository.js";
import { listFindings } from "../db/repositories/findingRepository.js";
import { listStateChanges } from "../db/repositories/runtimeRepository.js";
import type { MissionScoreBreakdown } from "../missions/scoring.js";

export function recordScorebookOnSubmit(params: {
  attemptId: string;
  systemName: string;
  missionId: string;
  userName: string;
  startedAt: string;
  campaignId?: string;
  personaId?: string;
  guidanceMode?: string;
  variantId?: string;
  breakdown: MissionScoreBreakdown;
  evidenceCoveragePercent: number;
  reportPath?: string;
  evidencePacketPath?: string;
}): void {
  upsertScorebookEntry({
    attemptId: params.attemptId,
    systemName: params.systemName,
    campaignId: params.campaignId,
    missionId: params.missionId,
    variantId: params.variantId,
    personaId: params.personaId,
    guidanceMode: params.guidanceMode,
    userName: params.userName,
    startedAt: params.startedAt,
    completedAt: new Date().toISOString(),
    status: "complete",
    totalScore: params.breakdown.totalScore,
    evidenceCoverage: params.evidenceCoveragePercent,
    findingsCount: listFindings(params.attemptId).length,
    remediationCount: listStateChanges(params.attemptId).length,
    reportPath: params.reportPath,
    evidencePacketPath: params.evidencePacketPath,
  });
}
