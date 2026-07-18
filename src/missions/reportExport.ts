import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import {
  getMission,
  getMissionAttempt,
  listCollectedEvidence,
  listEvidenceRequirements,
  listExpectedFindings,
} from "../db/repositories/missionRepository.js";
import { listFindings } from "../db/repositories/findingRepository.js";
import { getDatabasePath } from "../db/sqlite.js";
import type { MissionScoreBreakdown } from "./scoring.js";
import { exportEvidencePacket } from "../runtime/evidencePacketExport.js";

export type MissionReportPaths = {
  jsonPath: string;
  markdownPath: string;
};

export type MissionReport = {
  missionId: string;
  missionTitle: string;
  persona?: string | null;
  systemName: string;
  attemptId: string;
  userName: string;
  submittedAt: string;
  scores: MissionScoreBreakdown;
  evidence: Array<{ key: string; description: string; commandText?: string; collected: boolean }>;
  findings: Array<{
    title: string;
    severity: string;
    evidenceRefs?: string | null;
    controlMapping?: string | null;
    findingText?: string | null;
    decisionImpact?: string | null;
    recommendation?: string | null;
  }>;
  expectedFindings: Array<{ key: string; description: string }>;
};

function reportsDirectory(): string {
  const base = getDatabasePath() === ":memory:" ? process.cwd() : join(process.cwd(), "data");
  const dir = join(base, "reports");
  mkdirSync(dir, { recursive: true });
  return dir;
}

export function buildMissionReport(attemptId: string, breakdown: MissionScoreBreakdown): MissionReport {
  const attempt = getMissionAttempt(attemptId);
  if (!attempt) {
    throw new Error(`Mission attempt ${attemptId} not found.`);
  }

  const mission = getMission("CLAIMS400", attempt.missionId);
  const requirements = listEvidenceRequirements(attempt.missionId);
  const collected = listCollectedEvidence(attemptId);
  const collectedByKey = new Map(collected.map((item) => [item.requirementKey, item.commandText]));

  return {
    missionId: attempt.missionId,
    missionTitle: mission?.title ?? attempt.missionId,
    persona: mission?.persona,
    systemName: "CLAIMS400",
    attemptId,
    userName: attempt.userName,
    submittedAt: attempt.submittedAt ?? new Date().toISOString(),
    scores: breakdown,
    evidence: requirements.map((req) => ({
      key: req.requirementKey,
      description: req.description,
      commandText: collectedByKey.get(req.requirementKey),
      collected: collectedByKey.has(req.requirementKey),
    })),
    findings: listFindings(attemptId).map((finding) => ({
      title: finding.title,
      severity: finding.severity,
      evidenceRefs: finding.evidenceRefs,
      controlMapping: finding.controlMapping,
      findingText: finding.findingText,
      decisionImpact: finding.decisionImpact,
      recommendation: finding.recommendation,
    })),
    expectedFindings: listExpectedFindings(attempt.missionId).map((finding) => ({
      key: finding.findingKey,
      description: finding.description,
    })),
  };
}

function renderMarkdown(report: MissionReport): string {
  const lines = [
    `# ${report.missionTitle}`,
    "",
    `- Mission ID: ${report.missionId}`,
    `- Attempt ID: ${report.attemptId}`,
    `- Auditor: ${report.userName}`,
    `- Submitted: ${report.submittedAt}`,
    "",
    "## Score",
    "",
    "| Area | Score |",
    "| --- | ---: |",
    `| Total | ${report.scores.totalScore}/100 |`,
    `| Evidence coverage (40%) | ${report.scores.evidenceScore} |`,
    `| Issue identification (35%) | ${report.scores.issuesScore} |`,
    `| Control interpretation (15%) | ${report.scores.interpretationScore} |`,
    `| Finding quality (20%) | ${report.scores.findingQualityScore} |`,
    "",
    "## Evidence collected",
    "",
  ];

  for (const item of report.evidence) {
    const mark = item.collected ? "x" : " ";
    lines.push(`- [${mark}] ${item.description}${item.commandText ? ` — \`${item.commandText}\`` : ""}`);
  }

  lines.push("", "## Findings", "");
  if (report.findings.length === 0) {
    lines.push("_No findings recorded._");
  } else {
    for (const finding of report.findings) {
      lines.push(`### ${finding.title} (${finding.severity})`);
      if (finding.controlMapping) lines.push(`- Control: ${finding.controlMapping}`);
      if (finding.evidenceRefs) lines.push(`- Evidence: ${finding.evidenceRefs}`);
      if (finding.findingText) lines.push(`- Finding: ${finding.findingText}`);
      if (finding.decisionImpact) lines.push(`- Decision impact: ${finding.decisionImpact}`);
      if (finding.recommendation) lines.push(`- Recommendation: ${finding.recommendation}`);
      lines.push("");
    }
  }

  lines.push("## Expected issue themes", "");
  for (const expected of report.expectedFindings) {
    lines.push(`- ${expected.description}`);
  }

  return `${lines.join("\n")}\n`;
}

export function exportMissionReport(attemptId: string, breakdown: MissionScoreBreakdown): MissionReportPaths {
  const report = buildMissionReport(attemptId, breakdown);
  const dir = reportsDirectory();
  const stamp = report.submittedAt.replace(/[:.]/g, "-");
  const baseName = `${report.missionId}-${report.userName}-${stamp}`;
  const jsonPath = join(dir, `${baseName}.json`);
  const markdownPath = join(dir, `${baseName}.md`);

  writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  writeFileSync(markdownPath, renderMarkdown(report), "utf8");
  exportEvidencePacket(attemptId, report);

  return { jsonPath, markdownPath };
}
