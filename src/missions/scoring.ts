import type { ExpectedFindingRow } from "../db/repositories/missionRepository.js";
import type { FindingRow } from "../db/repositories/findingRepository.js";

export const SCORE_WEIGHTS = {
  evidence: 0.35,
  issues: 0.3,
  interpretation: 0.15,
  findingQuality: 0.2,
} as const;

export type MissionScoreBreakdown = {
  evidenceScore: number;
  issuesScore: number;
  interpretationScore: number;
  findingQualityScore: number;
  totalScore: number;
  matchedFindingKeys: string[];
  partialFindingKeys: string[];
  missedFindingKeys: string[];
  evidenceLinkedThemes: string[];
};

const INTERPRETATION_KEYWORDS = [
  "control",
  "defensible",
  "quarterly",
  "review",
  "recertification",
  "privileged access",
  "governance",
  "claim",
  "decision",
  "so what",
  "impact",
  "executive",
  "risk acceptance",
];

export const DECISION_IMPACT_MIN_LENGTH = 15;

export function hasDecisionReadyFinding(findings: FindingRow[]): boolean {
  return findings.some(
    (finding) => (finding.decisionImpact?.trim().length ?? 0) >= DECISION_IMPACT_MIN_LENGTH,
  );
}

function findingsCorpus(findings: FindingRow[]): string {
  return findings
    .map(
      (finding) =>
        `${finding.title} ${finding.evidenceRefs ?? ""} ${finding.controlMapping ?? ""} ${finding.findingText ?? ""} ${finding.decisionImpact ?? ""} ${finding.recommendation ?? ""}`,
    )
    .join(" ")
    .toLowerCase();
}

function evidenceRefsLinkTheme(
  findings: FindingRow[],
  collectedKeys: string[],
  findingKey: string,
): boolean {
  const corpus = findingsCorpus(findings);
  if (corpus.includes(findingKey.toLowerCase())) return true;
  return collectedKeys.some((key) => corpus.includes(key.toLowerCase()));
}

export function scoreFindingQuality(findings: FindingRow[]): number {
  if (findings.length === 0) return 0;

  const completeness = findings.map((finding) => {
    const fields = [
      finding.title,
      finding.severity,
      finding.evidenceRefs,
      finding.controlMapping,
      finding.findingText,
      finding.decisionImpact,
      finding.recommendation,
    ];
    const filled = fields.filter((value) => value && value.trim().length > 0).length;
    let score = filled / fields.length;
    const impactLen = finding.decisionImpact?.trim().length ?? 0;
    if (impactLen > 0 && impactLen < DECISION_IMPACT_MIN_LENGTH) {
      score *= 0.5;
    }
    return score;
  });

  let average = completeness.reduce((sum, value) => sum + value, 0) / completeness.length;
  if (!hasDecisionReadyFinding(findings)) {
    average = Math.min(average, 0.5);
  }
  return Math.round(average * 100);
}

export function scoreIssueIdentification(
  expectedFindings: ExpectedFindingRow[],
  findings: FindingRow[],
  collectedKeys: string[] = [],
): {
  score: number;
  matchedFindingKeys: string[];
  partialFindingKeys: string[];
  missedFindingKeys: string[];
  evidenceLinkedThemes: string[];
} {
  if (expectedFindings.length === 0) {
    return {
      score: 0,
      matchedFindingKeys: [],
      partialFindingKeys: [],
      missedFindingKeys: [],
      evidenceLinkedThemes: [],
    };
  }

  const corpus = findingsCorpus(findings);
  const matchedFindingKeys: string[] = [];
  const partialFindingKeys: string[] = [];
  const missedFindingKeys: string[] = [];
  const evidenceLinkedThemes: string[] = [];

  let weightedEarned = 0;
  let weightedTotal = 0;

  for (const expected of expectedFindings) {
    const weight = expected.weight > 0 ? expected.weight : 1;
    weightedTotal += weight;
    const hits = expected.matchPatterns.filter((pattern) => corpus.includes(pattern.toLowerCase())).length;
    const evidenceLinked = evidenceRefsLinkTheme(findings, collectedKeys, expected.findingKey);

    if (hits >= 2) {
      matchedFindingKeys.push(expected.findingKey);
      weightedEarned += weight;
      if (evidenceLinked) evidenceLinkedThemes.push(expected.findingKey);
    } else if (hits >= 1 || evidenceLinked) {
      partialFindingKeys.push(expected.findingKey);
      weightedEarned += weight * 0.5;
      if (evidenceLinked) evidenceLinkedThemes.push(expected.findingKey);
    } else {
      missedFindingKeys.push(expected.findingKey);
    }
  }

  const score = weightedTotal === 0 ? 0 : Math.round((weightedEarned / weightedTotal) * 100);
  return { score, matchedFindingKeys, partialFindingKeys, missedFindingKeys, evidenceLinkedThemes };
}

export function scoreControlInterpretation(findings: FindingRow[], evidenceScore: number): number {
  const corpus = findingsCorpus(findings);

  const hits = INTERPRETATION_KEYWORDS.filter((keyword) => corpus.includes(keyword)).length;
  if (hits >= 3) return 100;
  if (hits >= 2) return 75;
  if (hits >= 1) return 50;
  return evidenceScore >= 60 ? 25 : 0;
}

export function computeTotalScore(
  breakdown: Omit<
    MissionScoreBreakdown,
    "totalScore" | "matchedFindingKeys" | "partialFindingKeys" | "missedFindingKeys" | "evidenceLinkedThemes"
  >,
): number {
  return Math.round(
    breakdown.evidenceScore * SCORE_WEIGHTS.evidence +
      breakdown.issuesScore * SCORE_WEIGHTS.issues +
      breakdown.interpretationScore * SCORE_WEIGHTS.interpretation +
      breakdown.findingQualityScore * SCORE_WEIGHTS.findingQuality,
  );
}

export function scoreMissionAttempt(
  evidenceScore: number,
  expectedFindings: ExpectedFindingRow[],
  findings: FindingRow[],
  collectedKeys: string[] = [],
): MissionScoreBreakdown {
  const issueResult = scoreIssueIdentification(expectedFindings, findings, collectedKeys);
  const interpretationScore = scoreControlInterpretation(findings, evidenceScore);
  const findingQualityScore = scoreFindingQuality(findings);
  const partial = {
    evidenceScore,
    issuesScore: issueResult.score,
    interpretationScore,
    findingQualityScore,
  };

  return {
    ...partial,
    totalScore: computeTotalScore(partial),
    matchedFindingKeys: issueResult.matchedFindingKeys,
    partialFindingKeys: issueResult.partialFindingKeys,
    missedFindingKeys: issueResult.missedFindingKeys,
    evidenceLinkedThemes: issueResult.evidenceLinkedThemes,
  };
}

export function previewMissionScore(
  evidenceScore: number,
  expectedFindings: ExpectedFindingRow[],
  findings: FindingRow[],
  collectedKeys: string[] = [],
): MissionScoreBreakdown {
  return scoreMissionAttempt(evidenceScore, expectedFindings, findings, collectedKeys);
}
