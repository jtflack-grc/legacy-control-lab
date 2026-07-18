import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import {
  listCommandHistory,
  listGeneratedAudit,
  listRuntimeJobLog,
  listStateChanges,
} from "../db/repositories/runtimeRepository.js";
import {
  getMissionAttempt,
  listCollectedEvidence,
  listEvidenceRequirements,
  listEvidenceTags,
  listExpectedFindings,
} from "../db/repositories/missionRepository.js";
import { listFindings } from "../db/repositories/findingRepository.js";
import { getMission } from "../db/repositories/missionRepository.js";
import type { MissionReport } from "../missions/reportExport.js";
import { loadControlMappings } from "./controlMapping.js";

export type EvidencePacketPaths = {
  directory: string;
  reportMd: string;
  reportJson: string;
  commandTranscript: string;
  evidenceCoverage: string;
  findings: string;
  stateDiff: string;
  auditEvents: string;
  jobLogExtract: string;
};

function evidencePacketsRoot(): string {
  const fromEnv = process.env.EVIDENCE_PACKET_ROOT;
  if (fromEnv) return fromEnv;
  return join(process.cwd(), "data", "evidence-packets");
}

function renderPacketMarkdown(report: MissionReport, controls: string[]): string {
  const lines = [
    `# ${report.missionTitle}`,
    "",
    `- Persona: ${report.persona ?? "IT auditor"}`,
    `- System: ${report.systemName}`,
    `- Attempt: ${report.attemptId}`,
    `- Submitted: ${report.submittedAt}`,
    "",
    "## Score",
    "",
    `Total: ${report.scores.totalScore}/100`,
    "",
    "## Evidence reviewed",
    "",
  ];

  for (const item of report.evidence) {
    lines.push(`- [${item.collected ? "x" : " "}] ${item.description}`);
  }

  lines.push("", "## Findings", "");
  for (const finding of report.findings) {
    lines.push(`### ${finding.title}`);
    if (finding.controlMapping) lines.push(`- Control: ${finding.controlMapping}`);
    if (finding.findingText) lines.push(`- ${finding.findingText}`);
  }

  lines.push("", "## Control mapping reference", "");
  for (const control of controls.slice(0, 8)) {
    lines.push(`- ${control}`);
  }

  lines.push(
    "",
    "## Limitations",
    "",
    "Synthetic IBM i training runtime. Audit journal and job log side effects are lab-generated, not production QAUDJRN records.",
    "",
  );

  return `${lines.join("\n")}\n`;
}

export function exportEvidencePacket(attemptId: string, report: MissionReport): EvidencePacketPaths {
  const attempt = getMissionAttempt(attemptId);
  const mission = attempt ? getMission("CLAIMS400", attempt.missionId) : undefined;
  const stamp = report.submittedAt.replace(/[:.]/g, "-");
  const dirName = `${report.missionId}-${report.userName}-${stamp}`;
  const directory = join(evidencePacketsRoot(), dirName);
  mkdirSync(directory, { recursive: true });

  const commandHistory = listCommandHistory(attemptId);
  const stateChanges = listStateChanges(attemptId);
  const generatedAudit = listGeneratedAudit(attemptId);
  const jobLog = listRuntimeJobLog(attemptId);
  const requirements = listEvidenceRequirements(report.missionId);
  const collected = listCollectedEvidence(attemptId);
  const findings = listFindings(attemptId);
  const controls = loadControlMappings();

  const paths: EvidencePacketPaths = {
    directory,
    reportMd: join(directory, "report.md"),
    reportJson: join(directory, "report.json"),
    commandTranscript: join(directory, "command_transcript.txt"),
    evidenceCoverage: join(directory, "evidence_coverage.json"),
    findings: join(directory, "findings.json"),
    stateDiff: join(directory, "state_diff.json"),
    auditEvents: join(directory, "audit_events_generated.jsonl"),
    jobLogExtract: join(directory, "job_log_extract.txt"),
  };

  writeFileSync(paths.reportMd, renderPacketMarkdown(report, controls.map((c) => `${c.id} ${c.title}`)), "utf8");
  writeFileSync(
    paths.reportJson,
    `${JSON.stringify({ report, missionId: report.missionId, attemptId, controls }, null, 2)}\n`,
    "utf8",
  );
  writeFileSync(
    paths.commandTranscript,
    `${commandHistory.map((row) => `${row.timestamp} ${row.userName} ${row.commandText} -> ${row.resultMessage}`).join("\n")}\n`,
    "utf8",
  );
  writeFileSync(
    paths.evidenceCoverage,
    `${JSON.stringify(
      {
        requirements: requirements.map((req) => ({
          key: req.requirementKey,
          description: req.description,
          collected: collected.some((row) => row.requirementKey === req.requirementKey),
        })),
        evidenceTags: listEvidenceTags(attemptId),
        expectedFindings: listExpectedFindings(report.missionId),
      },
      null,
      2,
    )}\n`,
    "utf8",
  );
  writeFileSync(paths.findings, `${JSON.stringify(findings, null, 2)}\n`, "utf8");
  writeFileSync(paths.stateDiff, `${JSON.stringify(stateChanges, null, 2)}\n`, "utf8");
  writeFileSync(
    paths.auditEvents,
    `${generatedAudit.map((row) => JSON.stringify({ ...row, labGenerated: true })).join("\n")}\n`,
    "utf8",
  );
  writeFileSync(
    paths.jobLogExtract,
    `${jobLog.map((row) => `${row.timestamp} ${row.messageText}`).join("\n")}\n`,
    "utf8",
  );

  if (mission && !existsSync(join(directory, "briefing.md"))) {
    writeFileSync(join(directory, "briefing.md"), `${mission.briefing ?? ""}\n`, "utf8");
  }

  return paths;
}
