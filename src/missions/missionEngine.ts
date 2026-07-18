import type { IbmiSession } from "../ibmi-runtime/sessionService.js";
import type { ParsedCommand } from "../ibmi-runtime/commandParser.js";
import {
  createMissionAttempt,
  getActiveMissionAttempt,
  getLatestActiveMissionAttempt,
  getLatestMissionAttempt,
  getMission,
  getMissionAttempt,
  listCollectedEvidence,
  listEvidenceRequirements,
  listExpectedFindings,
  recordCollectedEvidence,
  recordEvidenceTag,
  listEvidenceTags,
  saveAttemptScores,
  type CollectedEvidenceRow,
  type EvidenceRequirementRow,
  type MissionAttemptRow,
} from "../db/repositories/missionRepository.js";
import { listFindings } from "../db/repositories/findingRepository.js";
import { computeEvidenceCoverage, matchEvidenceRequirements } from "./evidenceCoverage.js";
import { resolveEvidenceTags } from "./evidenceTags.js";
import {
  hasDecisionReadyFinding,
  previewMissionScore,
  SCORE_WEIGHTS,
  scoreMissionAttempt,
  type MissionScoreBreakdown,
} from "./scoring.js";
import { ensureAttemptBaseline } from "../runtime/attemptBaseline.js";

export type MissionProgress = {
  missionId: string;
  attemptId: string;
  requirements: EvidenceRequirementRow[];
  collected: CollectedEvidenceRow[];
  evidenceTags: string[];
  evidenceCoverage: ReturnType<typeof computeEvidenceCoverage>;
};

export const OPERATOR_SESSION_MISSION_ID = "OPERATOR-SESSION";

export function defaultMissionIdForSession(session: IbmiSession): string {
  return session.lane === "operator" ? OPERATOR_SESSION_MISSION_ID : "CLAIMS-001";
}

export function startMissionAttempt(
  session: IbmiSession,
  missionId?: string,
): MissionAttemptRow | undefined {
  if (session.userName?.trim().toUpperCase() === "DEMO") return undefined;
  if (session.userName?.trim().toUpperCase() === "IONGRC") return undefined;
  const resolvedMissionId = missionId ?? defaultMissionIdForSession(session);
  if (!session.userName) return undefined;

  const mission = getMission(session.systemName, resolvedMissionId);
  if (!mission) return undefined;

  const existing = getActiveMissionAttempt(session.systemName, session.userName, resolvedMissionId);
  if (existing) {
    session.missionAttemptId = existing.id;
    ensureAttemptBaseline(existing.id, session.systemName, session);
    return existing;
  }

  const attempt = createMissionAttempt(session.systemName, resolvedMissionId, session.userName, session.id, {
    campaignId: session.campaignId,
    personaId: session.personaId ?? (session.lane === "operator" ? "security_officer" : "auditor"),
    guidanceMode: session.guidanceMode ?? (session.lane === "operator" ? "tutorial" : "coach"),
    variantId: session.variantId,
  });
  session.missionAttemptId = attempt.id;
  ensureAttemptBaseline(attempt.id, session.systemName, session);
  return attempt;
}

export function ensureMissionAttempt(session: IbmiSession): MissionAttemptRow | undefined {
  if (session.missionAttemptId) {
    const attempt = getMissionAttempt(session.missionAttemptId);
    if (attempt && !attempt.submittedAt) {
      return attempt;
    }
  }
  return startMissionAttempt(session, defaultMissionIdForSession(session));
}

export function recordMissionEvidence(
  session: IbmiSession,
  commandName: string,
  rawInput: string,
  parsed: ParsedCommand,
): EvidenceRequirementRow[] {
  const attempt = ensureMissionAttempt(session);
  if (!attempt) return [];

  const requirements = listEvidenceRequirements(attempt.missionId);
  const matches = matchEvidenceRequirements(requirements, commandName, parsed, rawInput);
  for (const match of matches) {
    recordCollectedEvidence(attempt.id, match.requirementKey, match.commandText);
  }
  for (const tag of resolveEvidenceTags(commandName, parsed)) {
    recordEvidenceTag(attempt.id, tag, rawInput);
  }

  return requirements.filter((req) => matches.some((match) => match.requirementKey === req.requirementKey));
}

export function getMissionProgressForUser(
  systemName: string,
  userName: string,
  missionId?: string,
): MissionProgress | undefined {
  const normalizedUser = userName.toUpperCase();
  const attempt = missionId
    ? getActiveMissionAttempt(systemName, normalizedUser, missionId)
    : getLatestActiveMissionAttempt(systemName, normalizedUser) ??
      getLatestMissionAttempt(systemName, normalizedUser);
  if (!attempt) return undefined;
  if (missionId && attempt.missionId !== missionId) return undefined;

  const requirements = listEvidenceRequirements(attempt.missionId);
  const collected = listCollectedEvidence(attempt.id);
  const evidenceCoverage = computeEvidenceCoverage(
    requirements,
    collected.map((item) => item.requirementKey),
  );

  return {
    missionId: attempt.missionId,
    attemptId: attempt.id,
    requirements,
    collected,
    evidenceTags: listEvidenceTags(attempt.id),
    evidenceCoverage,
  };
}

/** Coach rail: client pin, then any in-flight attempt, then skill-path entry mission. */
export function resolveCoachMissionProgress(
  systemName: string,
  userName: string,
  options?: { skillEntryMissionId?: string; clientMissionId?: string },
): MissionProgress | undefined {
  const clientMissionId = options?.clientMissionId?.trim().toUpperCase();
  if (clientMissionId) {
    const pinned = getMissionProgressForUser(systemName, userName, clientMissionId);
    if (pinned) return pinned;
  }

  const active = getLatestActiveMissionAttempt(systemName, userName);
  if (active) {
    return getMissionProgressForUser(systemName, userName, active.missionId);
  }

  if (options?.skillEntryMissionId) {
    const entry = getMissionProgressForUser(systemName, userName, options.skillEntryMissionId);
    if (entry) return entry;
  }

  return getMissionProgressForUser(systemName, userName);
}

export function getMissionProgress(session: IbmiSession): MissionProgress | undefined {
  const attempt = session.missionAttemptId ? getMissionAttempt(session.missionAttemptId) : undefined;
  if (!attempt) return undefined;

  const requirements = listEvidenceRequirements(attempt.missionId);
  const collected = listCollectedEvidence(attempt.id);
  const evidenceCoverage = computeEvidenceCoverage(
    requirements,
    collected.map((item) => item.requirementKey),
  );

  return {
    missionId: attempt.missionId,
    attemptId: attempt.id,
    requirements,
    collected,
    evidenceTags: listEvidenceTags(attempt.id),
    evidenceCoverage,
  };
}

export function submitMission(
  session: IbmiSession,
): { ok: true; breakdown: MissionScoreBreakdown } | { ok: false; message: string } {
  const attempt = session.missionAttemptId ? getMissionAttempt(session.missionAttemptId) : undefined;
  if (!attempt) {
    return { ok: false, message: "CPF0006 - No active mission attempt. Sign on as AUDIT and run DSPMISSION." };
  }
  if (attempt.submittedAt) {
    return { ok: false, message: "CPF0006 - Mission already submitted for this attempt." };
  }

  const findings = listFindings(attempt.id);
  if (findings.length === 0) {
    return { ok: false, message: "CPF0006 - Submit at least one audit finding before SUBMITMSN." };
  }
  if (!hasDecisionReadyFinding(findings)) {
    return {
      ok: false,
      message:
        "CPF0006 - Decision impact required. Use the coach panel finding composer — who must act and by when.",
    };
  }

  const requirements = listEvidenceRequirements(attempt.missionId);
  const collected = listCollectedEvidence(attempt.id);
  const collectedKeys = collected.map((item) => item.requirementKey);
  const evidenceCoverage = computeEvidenceCoverage(requirements, collectedKeys);
  if (evidenceCoverage.requiredTotal > 0 && evidenceCoverage.requiredCollected < evidenceCoverage.requiredTotal) {
    return {
      ok: false,
      message: `CPF0006 - Required evidence incomplete (${evidenceCoverage.requiredCollected}/${evidenceCoverage.requiredTotal}). See coach panel checklist.`,
    };
  }

  const expectedFindings = listExpectedFindings(attempt.missionId);
  const breakdown = scoreMissionAttempt(evidenceCoverage.score, expectedFindings, findings, collectedKeys);

  saveAttemptScores(attempt.id, {
    evidenceScore: breakdown.evidenceScore,
    issuesScore: breakdown.issuesScore,
    interpretationScore: breakdown.interpretationScore,
    findingQualityScore: breakdown.findingQualityScore,
    totalScore: breakdown.totalScore,
  });

  return { ok: true, breakdown };
}

export function formatScoreMessage(breakdown: MissionScoreBreakdown): string {
  const evidencePct = Math.round(SCORE_WEIGHTS.evidence * 100);
  const issuesPct = Math.round(SCORE_WEIGHTS.issues * 100);
  const interpretationPct = Math.round(SCORE_WEIGHTS.interpretation * 100);
  const qualityPct = Math.round(SCORE_WEIGHTS.findingQuality * 100);
  return [
    `Mission score: ${breakdown.totalScore}/100`,
    `Evidence coverage (${evidencePct}%): ${breakdown.evidenceScore}`,
    `Issue identification (${issuesPct}%): ${breakdown.issuesScore}`,
    `Control interpretation (${interpretationPct}%): ${breakdown.interpretationScore}`,
    `Finding quality (${qualityPct}%): ${breakdown.findingQualityScore}`,
    "See coach panel for full score debrief.",
  ].join(" | ");
}

export function previewMissionScoreForAttempt(attemptId: string): MissionScoreBreakdown | undefined {
  const attempt = getMissionAttempt(attemptId);
  if (!attempt) return undefined;
  const requirements = listEvidenceRequirements(attempt.missionId);
  const collected = listCollectedEvidence(attempt.id);
  const collectedKeys = collected.map((item) => item.requirementKey);
  const evidenceCoverage = computeEvidenceCoverage(requirements, collectedKeys);
  const findings = listFindings(attempt.id);
  const expectedFindings = listExpectedFindings(attempt.missionId);
  return previewMissionScore(evidenceCoverage.score, expectedFindings, findings, collectedKeys);
}
