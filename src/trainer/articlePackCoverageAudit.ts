import { writeFileSync } from "node:fs";
import { join } from "node:path";
import {
  assertExcerptIntegrity,
  buildCoverageReport,
  loadArticlePacks,
  type PackLabCoverage,
} from "../grc/articlePacks.js";
import type { PhaseAuditFinding, PhaseAuditSeverity } from "./phaseAudit.js";

function check(
  phase: string,
  id: string,
  title: string,
  passed: boolean,
  detail: string,
  severity: PhaseAuditSeverity = "error",
): PhaseAuditFinding {
  return { phase, id, title, severity, passed, detail };
}

export function runArticlePackCoverageAudit(): PhaseAuditFinding[] {
  const findings: PhaseAuditFinding[] = [];
  const packs = loadArticlePacks();
  const report = buildCoverageReport();

  findings.push(
    check(
      "iongrc",
      "iongrc-packs-loaded",
      "Article packs load",
      packs.length > 0,
      `${packs.length} pack(s) under data/grc-packs/packs`,
    ),
  );

  for (const pack of packs) {
    const excerptFailures = assertExcerptIntegrity(pack);
    findings.push(
      check(
        "iongrc",
        `iongrc-excerpt-${pack.id}`,
        `Excerpt integrity: ${pack.id}`,
        excerptFailures.length === 0 || pack.excerptPending === true,
        excerptFailures.length ? excerptFailures.join("; ") : pack.sourceFile,
        excerptFailures.length ? "warn" : "error",
      ),
    );
  }

  for (const coverage of report.packs) {
    findings.push(
      check(
        "iongrc",
        `iongrc-coverage-${coverage.packId}`,
        `Pack coverage: ${coverage.packId}`,
        coverage.blockingGaps.length === 0,
        coverage.blockingGaps.length
          ? `Missing commands on steps: ${coverage.blockingGaps.join(", ")}`
          : `${coverage.fullStepCount}/${coverage.totalStepCount} steps full`,
        coverage.blockingGaps.length ? "warn" : "info",
      ),
    );
  }

  return findings;
}

export function writeCoverageReportFile(): PackLabCoverage[] {
  const { packs } = buildCoverageReport();
  const target = join(process.cwd(), "data", "grc-packs", "coverage-report.json");
  writeFileSync(
    target,
    `${JSON.stringify({ generatedAt: new Date().toISOString(), packs }, null, 2)}\n`,
    "utf8",
  );
  return packs;
}
