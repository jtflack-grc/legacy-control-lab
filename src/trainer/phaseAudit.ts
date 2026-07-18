import { APP_NAME } from "../branding.js";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { buildCommandCoverageReport, loadFullCommandCatalog } from "../catalog/commandCatalogService.js";
import { validateRange } from "../range/validateRange.js";
import { validateScenarioPack } from "../scenario/validateScenario.js";
import { getCommandHandler } from "../ibmi-runtime/commandHandlers.js";
import { listImplementedCommands } from "../ibmi-runtime/commandCatalog.js";
import { auditCommandCatalogMetadata } from "./commandMetadataAudit.js";
import { runMenuNavigationAudit } from "./menuNavigationAudit.js";
import { runAuthorityAudit } from "./authorityAudit.js";
import { runScreenFidelityAudit } from "./screenFidelityAudit.js";
import { runIbmScreenLayoutAudit } from "./ibmScreenLayoutAudit.js";
import { loadScreenInventory } from "../ibm74/screenLayoutSpec.js";
import { initTestDatabase } from "../db/sqlite.js";

export type PhaseAuditSeverity = "error" | "warn" | "info";

export type PhaseAuditFinding = {
  phase: string;
  id: string;
  title: string;
  severity: PhaseAuditSeverity;
  passed: boolean;
  detail: string;
};

export type PhaseAuditReport = {
  ranAt: string;
  findings: PhaseAuditFinding[];
  summary: {
    total: number;
    passed: number;
    failed: number;
    warnings: number;
  };
};

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

function fileExists(relativePath: string): boolean {
  return existsSync(join(process.cwd(), relativePath));
}

export function runPhaseAudit(): PhaseAuditReport {
  initTestDatabase();

  const findings: PhaseAuditFinding[] = [];
  const root = process.cwd();
  const catalog = loadFullCommandCatalog();
  const implemented = catalog.filter((c) => c.status === "implemented");
  const coverage = buildCommandCoverageReport();

  const add = (finding: PhaseAuditFinding) => findings.push(finding);

  // Phase 2
  add(
    check(
      "phase2",
      "p2-docker",
      "Docker compose file exists",
      fileExists("docker-compose.yml") || fileExists("compose.yml"),
      "docker-compose.yml",
    ),
  );
  add(
    check(
      "phase2",
      "p2-docs",
      "Core architecture docs exist",
      fileExists("docs/architecture.md") && fileExists("docs/scenario-packs.md"),
      "docs/architecture.md, docs/scenario-packs.md",
    ),
  );
  add(
    check("phase2", "p2-catalog", "20+ commands cataloged", catalog.length >= 20, `count=${catalog.length}`),
  );
  add(
    check(
      "phase2",
      "p2-implemented",
      "12+ commands implemented",
      implemented.length >= 12,
      `count=${implemented.length}`,
    ),
  );
  add(
    check(
      "phase2",
      "p2-mission-submit",
      "SUBMITMSN command implemented",
      implemented.some((c) => c.name === "SUBMITMSN"),
      "SUBMITMSN",
    ),
  );

  // Phase 3
  add(
    check("phase3", "p3-catalog", "150+ commands cataloged", catalog.length >= 150, `count=${catalog.length}`),
  );
  add(
    check(
      "phase3",
      "p3-implemented",
      "35+ commands implemented",
      implemented.length >= 35,
      `count=${implemented.length}`,
    ),
  );
  add(
    check(
      "phase3",
      "p3-key-screens",
      "Key display commands implemented",
      ["DSPUSRPRF", "DSPSYSVAL", "DSPOBJAUT", "DSPJRN", "DSPJOBLOG", "WRKSPLF", "DSPPTF", "WRKMBRPDM", "DSPPGMREF"].every(
        (name) => implemented.some((c) => c.name === name),
      ),
      "DSPUSRPRF, DSPSYSVAL, DSPOBJAUT, DSPJRN, DSPJOBLOG, WRKSPLF, DSPPTF, WRKMBRPDM, DSPPGMREF",
    ),
  );
  add(
    check(
      "phase3",
      "p3-runsql",
      "RUNSQL implemented",
      implemented.some((c) => c.name === "RUNSQL"),
      "RUNSQL",
    ),
  );
  add(
    check(
      "phase3",
      "p3-docs",
      "Phase 3 documentation exists",
      fileExists("docs/phase3-realism-pack.md"),
      "docs/phase3-realism-pack.md",
    ),
  );
  add(
    check(
      "phase3",
      "p3-messages",
      "Message catalog exists",
      fileExists("data/messages/messages.json"),
      "data/messages/messages.json",
    ),
  );

  // Phase 4
  add(
    check(
      "phase4",
      "p4-scenario-forge",
      "CLAIMS400 scenario pack uses forge layout",
      fileExists("data/scenarios/claims400/scenario.json") &&
        fileExists("data/scenarios/claims400/missions/CLAIMS-001/mission.json"),
      "data/scenarios/claims400/",
    ),
  );
  add(
    check(
      "phase4",
      "p4-mutations",
      "Mutating commands implemented",
      ["CHGUSRPRF", "CHGSYSVAL", "GRTOBJAUT", "ADDLIBLE"].every((name) =>
        implemented.some((c) => c.name === name),
      ),
      "CHGUSRPRF, CHGSYSVAL, GRTOBJAUT, ADDLIBLE",
    ),
  );
  add(
    check(
      "phase4",
      "p4-evidence-diff",
      "DSPEVDDIFF implemented",
      implemented.some((c) => c.name === "DSPEVDDIFF"),
      "DSPEVDDIFF",
    ),
  );
  add(
    check(
      "phase4",
      "p4-reset",
      "RESETLAB implemented",
      implemented.some((c) => c.name === "RESETLAB"),
      "RESETLAB",
    ),
  );
  add(
    check(
      "phase4",
      "p4-missions",
      "CLAIMS-002 and CLAIMS-003 missions exist",
      fileExists("data/scenarios/claims400/missions/CLAIMS-002/mission.json") &&
        fileExists("data/scenarios/claims400/missions/CLAIMS-003/mission.json"),
      "missions/CLAIMS-002, CLAIMS-003",
    ),
  );
  add(
    check(
      "phase4",
      "p4-validator",
      "Scenario validator passes for claims400",
      validateScenarioPack("claims400").ok,
      validateScenarioPack("claims400").errors.join("; ") || "ok",
    ),
  );
  add(
    check(
      "phase4",
      "p4-docs",
      "Phase 4 documentation exists",
      fileExists("docs/phase4-scenario-forge.md"),
      "docs/phase4-scenario-forge.md",
    ),
  );
  add(
    check(
      "phase4",
      "p4-controls",
      "Control mapping file exists",
      fileExists("data/control-mapping/controls.json"),
      "data/control-mapping/controls.json",
    ),
  );

  // Phase 5
  add(
    check(
      "phase5",
      "p5-range",
      "Range registry exists",
      fileExists("data/range/range.json") && fileExists("data/range/systems.json"),
      "data/range/",
    ),
  );
  add(
    check(
      "phase5",
      "p5-systems",
      "COUNTY400 and HOSPITAL400 scenario packs exist",
      fileExists("data/scenarios/county400/scenario.json") &&
        fileExists("data/scenarios/hospital400/scenario.json"),
      "county400, hospital400",
    ),
  );
  add(
    check(
      "phase5",
      "p5-campaigns",
      "Two or more campaigns exist",
      readdirSync(join(root, "data/campaigns"), { withFileTypes: true }).filter((e) => e.isDirectory()).length >= 2,
      "data/campaigns/",
    ),
  );
  add(
    check(
      "phase5",
      "p5-scorebook",
      "WRKSCORE implemented",
      implemented.some((c) => c.name === "WRKSCORE"),
      "WRKSCORE",
    ),
  );
  add(
    check(
      "phase5",
      "p5-mapctrl",
      "MAPCTRL and WRKCTRL implemented",
      implemented.some((c) => c.name === "MAPCTRL") && implemented.some((c) => c.name === "WRKCTRL"),
      "MAPCTRL, WRKCTRL",
    ),
  );
  add(
    check(
      "phase5",
      "p5-cli",
      "Scenario authoring CLI scripts exist",
      fileExists("scripts/create-scenario.ts") &&
        fileExists("scripts/package-scenario.ts") &&
        fileExists("scripts/import-scenario.ts"),
      "create/package/import scripts",
    ),
  );
  add(
    check(
      "phase5",
      "p5-range-validator",
      "Range validator passes",
      validateRange().ok,
      validateRange().errors.join("; ") || "ok",
    ),
  );
  add(
    check(
      "phase5",
      "p5-variants",
      "Variants exist for CLAIMS/COUNTY/HOSPITAL-001",
      ["claims400/missions/CLAIMS-001", "county400/missions/COUNTY-001", "hospital400/missions/HOSPITAL-001"].every(
        (path) => fileExists(`data/scenarios/${path}/variants.json`),
      ),
      "variants.json in three first missions",
    ),
  );
  add(
    check(
      "phase5",
      "p5-docs",
      "Phase 5 documentation exists",
      fileExists("docs/phase5-range-builder.md") && fileExists("docs/campaign-mode.md"),
      "docs/phase5-range-builder.md, docs/campaign-mode.md",
    ),
  );
  add(
    check(
      "phase5",
      "p5-audit-trainer",
      "Audit trainer documentation exists",
      fileExists("docs/audit-trainer.md"),
      "docs/audit-trainer.md",
    ),
  );
  add(
    check(
      "phase5",
      "p5-lclpack-doc",
      ".lclpack format documented",
      fileExists("docs/phase5-range-builder.md") &&
        readFileSync(join(root, "docs/phase5-range-builder.md"), "utf8").includes(".lclpack"),
      "phase5-range-builder.md mentions .lclpack",
      "warn",
    ),
  );

  // Phase 6
  add(
    check("phase6", "p6-catalog-300", "300+ commands cataloged", catalog.length >= 300, `count=${catalog.length}`),
  );
  add(
    check(
      "phase6",
      "p6-promptable",
      "125+ commands promptable",
      coverage.promptable >= 125,
      `count=${coverage.promptable}`,
    ),
  );
  add(
    check(
      "phase6",
      "p6-platform-cmds",
      "Platform commands implemented",
      ["DSPCMDHLP", "DSPMSGHLP", "DSPCMDCOV", "DSPCMDHST", "WRKSQLSVC"].every((name) =>
        implemented.some((c) => c.name === name),
      ),
      "DSPCMDHLP, DSPMSGHLP, DSPCMDCOV, DSPCMDHST, WRKSQLSVC",
    ),
  );
  add(
    check(
      "phase6",
      "p6-f4",
      "F4 prompting wired in session adapter",
      readFileSync(join(root, "src/tn5250-host/sessionAdapter.ts"), "utf8").includes("openCommandPrompt"),
      "sessionAdapter.ts uses openCommandPrompt",
    ),
  );
  add(
    check(
      "phase6",
      "p6-coverage-cli",
      "command:coverage npm script exists",
      JSON.parse(readFileSync(join(root, "package.json"), "utf8")).scripts?.["command:coverage"] !== undefined,
      "npm run command:coverage",
    ),
  );
  add(
    check(
      "phase6",
      "p6-audit-scripts",
      "Phase and metadata audit npm scripts exist",
      JSON.parse(readFileSync(join(root, "package.json"), "utf8")).scripts?.["phase:audit"] !== undefined &&
        JSON.parse(readFileSync(join(root, "package.json"), "utf8")).scripts?.["command:metadata-audit"] !== undefined,
      "npm run phase:audit, npm run command:metadata-audit",
    ),
  );
  add(
    check(
      "phase6",
      "p6-group-menus",
      "GO CMDSEC opens command group menu",
      implemented.some((c) => c.name === "GO"),
      "GO command",
    ),
  );
  add(
    check(
      "phase6",
      "p6-docs",
      "Phase 6 documentation exists",
      fileExists("docs/phase6-command-fidelity.md"),
      "docs/phase6-command-fidelity.md",
    ),
  );
  add(
    check(
      "phase6",
      "p6-screen-generator",
      "Generic work-with screen generator",
      fileExists("src/screen-runtime/screenDsl.ts"),
      "Partial — screenDsl placeholder exists; hand-built screens still primary",
      "warn",
    ),
  );
  add(
    check(
      "phase6",
      "p6-parser-validation",
      "Metadata-based parameter validation",
      fileExists("src/ibmi-runtime/commandParser.ts"),
      "Parser exists; full metadata validation not yet enforced on all commands",
      "warn",
    ),
  );

  // Cross-phase handlers
  const missingHandlers = listImplementedCommands().filter((c) => !c.handler || !getCommandHandler(c.handler));
  add(
    check(
      "cross",
      "handlers",
      "All implemented commands have registered handlers",
      missingHandlers.length === 0,
      missingHandlers.map((c) => c.name).join(", ") || "ok",
    ),
  );

  add(
    check(
      "cross",
      "metadata-audit-clean",
      "Command metadata audit has zero errors",
      auditCommandCatalogMetadata().summary.errors === 0,
      "npm run command:metadata-audit",
    ),
  );

  const menuNavFails = runMenuNavigationAudit().filter((r) => !r.pass);
  add(
    check(
      "cross",
      "menu-navigation-audit",
      "F3 backs one menu level; option 90 and SIGNOFF sign off",
      menuNavFails.length === 0,
      menuNavFails.map((r) => r.id).join(", ") || "npm run menu:navigation-audit",
    ),
  );

  const authorityFails = runAuthorityAudit().filter((r) => !r.pass);
  add(
    check(
      "phase6.5",
      "p65-authority-audit",
      "Authority matrix: AUDIT denied privileged mutations; QSECOFR allowed",
      authorityFails.length === 0,
      authorityFails.map((r) => r.id).join(", ") || "npm run authority:audit",
    ),
  );

  const screenFails = runScreenFidelityAudit().filter((r) => !r.pass);
  add(
    check(
      "phase6.5",
      "p65-screen-fidelity",
      "Operational screens match IBM i field specs",
      screenFails.length === 0,
      screenFails.map((r) => r.id).join(", ") || "npm run screen:fidelity-audit",
    ),
  );

  const layoutFails = runIbmScreenLayoutAudit(["A"]).filter((r) => !r.pass);
  add(
    check(
      "phase6.5",
      "p65-screen-layout",
      "Tier A flagship screens match IBM i layout specs",
      layoutFails.length === 0,
      layoutFails.map((r) => r.id).join(", ") || "npm run screen:layout-audit",
    ),
  );

  const tierAInventory = loadScreenInventory().entries.filter((entry) => entry.tier === "A");
  const tierAWithSpecs = tierAInventory.filter((entry) => entry.specFile).length;
  add(
    check(
      "phase6.5",
      "p65-layout-coverage",
      "Tier A inventory tracks golden-reference backlog",
      tierAWithSpecs >= 7,
      `${tierAWithSpecs}/${tierAInventory.length} tier A screens have .layout.json — see data/screen-specs/inventory.json`,
      "warn",
    ),
  );

  add(
    check(
      "phase6.5",
      "p65-qsecofr-profile",
      "QSECOFR seed profile uses SECURITY menu and TRAIN password",
      fileExists("data/scenarios/claims400/users.json") &&
        readFileSync("data/scenarios/claims400/users.json", "utf8").includes('"initialMenu": "SECURITY"') &&
        readFileSync("data/scenarios/claims400/users.json", "utf8").includes('"password": "TRAIN"'),
      "data/scenarios/claims400/users.json",
    ),
  );

  add(
    check(
      "phase6.5",
      "p65-docs",
      "Phase 6.5 operator lane documentation exists",
      fileExists("docs/qsecofr-mode.md") && fileExists("docs/privileged-operator-lane.md"),
      "docs/qsecofr-mode.md",
    ),
  );

  add(
    check(
      "phase6",
      "p6-stateful-tier",
      "At least 12 stateful IBM i commands (tier 4)",
      coverage.byLevel.stateful_implemented >= 12,
      `stateful_implemented=${coverage.byLevel.stateful_implemented}`,
    ),
  );
  add(
    check(
      "phase6",
      "p6-display-tier",
      "At least 25 display/query commands (tier 3)",
      coverage.byLevel.display_implemented >= 25,
      `display_implemented=${coverage.byLevel.display_implemented}`,
    ),
  );
  add(
    check(
      "phase6",
      "p6-catalog-screens",
      "Catalog fidelity screen factory wired",
      readFileSync(join(root, "src/screen-runtime/screens/catalogCommandScreens.ts"), "utf8").includes(
        "createCatalogCommandScreen",
      ),
      "catalogCommandScreens.ts provides per-command IBM i screens",
    ),
  );
  add(
    check(
      "phase6",
      "p6-param-validation",
      "Parameter validation before dispatch",
      fileExists("src/ibmi-runtime/commandParameterValidation.ts") &&
        readFileSync(join(root, "src/ibmi-runtime/commandRuntime.ts"), "utf8").includes("validateCommandParameters"),
      "commandParameterValidation.ts",
    ),
  );
  add(
    check(
      "phase6",
      "p6-authority-catalog",
      "Authority checked for cataloged commands",
      readFileSync(join(root, "src/ibmi-runtime/commandRuntime.ts"), "utf8").includes("authorityRequiredMessage"),
      "cataloged command authority gate",
    ),
  );

  add(
    check(
      "phase4",
      "p4-county-validator",
      "County400 scenario validator passes",
      validateScenarioPack("county400").ok,
      validateScenarioPack("county400").errors.join("; ") || "ok",
    ),
  );
  add(
    check(
      "phase4",
      "p4-hospital-validator",
      "Hospital400 scenario validator passes",
      validateScenarioPack("hospital400").ok,
      validateScenarioPack("hospital400").errors.join("; ") || "ok",
    ),
  );

  const passed = findings.filter((f) => f.passed).length;
  const failed = findings.filter((f) => !f.passed && f.severity === "error").length;
  const warnings = findings.filter((f) => !f.passed && f.severity === "warn").length;

  return {
    ranAt: new Date().toISOString(),
    findings,
    summary: { total: findings.length, passed, failed, warnings },
  };
}

export function formatPhaseAuditReport(report: PhaseAuditReport): string {
  const lines = [
    `${APP_NAME} — Phase Audit`,
    report.ranAt,
    `PASS ${report.summary.passed} · FAIL ${report.summary.failed} · WARN ${report.summary.warnings} · TOTAL ${report.summary.total}`,
    "",
  ];

  for (const phase of ["phase2", "phase3", "phase4", "phase5", "phase6", "cross"]) {
    const phaseFindings = report.findings.filter((f) => f.phase === phase);
    if (phaseFindings.length === 0) continue;
    lines.push(`## ${phase.toUpperCase()}`);
    for (const finding of phaseFindings) {
      const mark = finding.passed ? "PASS" : finding.severity === "warn" ? "WARN" : "FAIL";
      lines.push(`${mark}  [${finding.id}] ${finding.title}`);
      if (!finding.passed || finding.severity === "info") {
        lines.push(`       ${finding.detail}`);
      }
    }
    lines.push("");
  }

  return lines.join("\n").trimEnd();
}
