import { APP_NAME } from "../branding.js";
import { getCommandHandler } from "../ibmi-runtime/commandHandlers.js";
import { executeCatalogCommand } from "../ibmi-runtime/commandRuntime.js";
import { createSession } from "../ibmi-runtime/sessionService.js";
import { startMissionAttempt } from "../missions/missionEngine.js";
import { initTestDatabase, resetDatabaseConnection, getDatabase } from "../db/sqlite.js";
import { seedClaims400 } from "../db/seedData.js";
import {
  enrichCatalogCommand,
  isThinHelpText,
  COMMAND_ENRICHMENT,
} from "../catalog/commandEnrichment.js";
import { loadFullCommandCatalog } from "../catalog/commandCatalogService.js";
import type { CatalogCommandDefinition } from "../catalog/commandTypes.js";
import { commandSamples } from "./commandSamples.js";
import { buildTrainerProbes, commandsCoveredByProbes } from "./probes.js";
import { analyzeCatalogCoverage } from "./catalogCoverage.js";
import { listImplementedCommands } from "../ibmi-runtime/commandCatalog.js";

export type CommandFamily = "ibm_i" | "lab_native";

export type CommandMetadataFinding = {
  command: string;
  family: CommandFamily;
  severity: "error" | "warn";
  code: string;
  detail: string;
};

export type CommandMetadataReport = {
  ranAt: string;
  totals: {
    cataloged: number;
    implemented: number;
    ibm_i: number;
    lab_native: number;
  };
  findings: CommandMetadataFinding[];
  summary: {
    errors: number;
    warnings: number;
  };
};

const LAB_CATEGORIES = new Set(["mission_lab", "range", "backup_restore"]);

export function classifyCommandFamily(command: CatalogCommandDefinition): CommandFamily {
  return LAB_CATEGORIES.has(command.category) ? "lab_native" : "ibm_i";
}

const IBM_I_MUTATING = new Set([
  "CHGUSRPRF",
  "CRTUSRPRF",
  "DLTUSRPRF",
  "CHGSYSVAL",
  "GRTOBJAUT",
  "RVKOBJAUT",
  "ADDLIBLE",
  "RMVLIBLE",
  "CHGAUT",
  "HLDSPLE",
  "RLSSPLF",
  "DLTSPLF",
  "SAVLIB",
  "RSTLIB",
]);

function auditCommandMetadata(command: CatalogCommandDefinition): CommandMetadataFinding[] {
  const enriched = enrichCatalogCommand(command);
  const family = classifyCommandFamily(command);
  const findings: CommandMetadataFinding[] = [];

  if (command.status === "implemented") {
    if (!command.handler || !getCommandHandler(command.handler)) {
      findings.push({
        command: command.name,
        family,
        severity: "error",
        code: "missing_handler",
        detail: `Handler '${command.handler ?? "none"}' is not registered.`,
      });
    }

    if (isThinHelpText(enriched.helpText)) {
      findings.push({
        command: command.name,
        family,
        severity: family === "lab_native" ? "error" : "warn",
        code: "thin_help",
        detail: "Missing or generic helpText — add entry to commandEnrichment.ts.",
      });
    }

    if (family === "ibm_i") {
      if (enriched.displayName === command.name && command.name.length > 6) {
        findings.push({
          command: command.name,
          family,
          severity: "warn",
          code: "display_name",
          detail: "displayName should be a human-readable title, not the command name.",
        });
      }

      const requiredParams = (command.parameters ?? []).filter((p) => p.required);
      if (requiredParams.length > 0 && !commandSamples[command.name]) {
        findings.push({
          command: command.name,
          family,
          severity: "warn",
          code: "missing_sample",
          detail: "Required parameters but no trainer commandSamples entry.",
        });
      }

      if (IBM_I_MUTATING.has(command.name) && !(enriched.examples?.length ?? 0)) {
        findings.push({
          command: command.name,
          family,
          severity: "warn",
          code: "missing_examples",
          detail: "Stateful IBM i command should include examples in enrichment.",
        });
      }
    }

    if (family === "lab_native") {
      if ((enriched.helpText?.length ?? 0) < 40) {
        findings.push({
          command: command.name,
          family,
          severity: "error",
          code: "lab_help",
          detail: "Lab-native command needs dense helpText describing purpose and navigation.",
        });
      }
    }
  } else if (command.status === "cataloged" || command.status === "stubbed") {
    if (family === "ibm_i" && isThinHelpText(command.helpText) && !COMMAND_ENRICHMENT[command.name]) {
      findings.push({
        command: command.name,
        family,
        severity: "warn",
        code: "catalog_help",
        detail: "Cataloged IBM i command should have purpose-oriented helpText.",
      });
    }
  }

  return findings;
}

export function auditCommandCatalogMetadata(): CommandMetadataReport {
  const catalog = loadFullCommandCatalog().map(enrichCatalogCommand);
  const findings = catalog.flatMap(auditCommandMetadata);

  const implemented = catalog.filter((c) => c.status === "implemented");
  const ibm_i = catalog.filter((c) => classifyCommandFamily(c) === "ibm_i");
  const lab_native = catalog.filter((c) => classifyCommandFamily(c) === "lab_native");

  return {
    ranAt: new Date().toISOString(),
    totals: {
      cataloged: catalog.length,
      implemented: implemented.length,
      ibm_i: ibm_i.length,
      lab_native: lab_native.length,
    },
    findings,
    summary: {
      errors: findings.filter((f) => f.severity === "error").length,
      warnings: findings.filter((f) => f.severity === "warn").length,
    },
  };
}

export type CommandRuntimeProbeResult = {
  command: string;
  family: CommandFamily;
  input: string;
  outcome: "pass" | "fail" | "skip";
  detail?: string;
  screenId?: string;
};

export function probeImplementedCommandsRuntime(): CommandRuntimeProbeResult[] {
  resetDatabaseConnection();
  initTestDatabase();
  seedClaims400(getDatabase());

  const session = createSession("CLAIMS400");
  session.signedOn = true;
  session.userName = "AUDIT";
  session.currentMenu = "AUDIT";
  startMissionAttempt(session);

  const probes = buildTrainerProbes();
  const covered = commandsCoveredByProbes(probes);
  const results: CommandRuntimeProbeResult[] = [];

  for (const command of listImplementedCommands()) {
    const enriched = enrichCatalogCommand(
      loadFullCommandCatalog().find((c) => c.name === command.name) ?? {
        ...command,
        category: command.category,
        status: command.status,
      },
    );
    const family = classifyCommandFamily(enriched);
    const sample = commandSamples[command.name];

    if (!sample && command.parameters.some((p) => p.required)) {
      results.push({
        command: command.name,
        family,
        input: command.name,
        outcome: "skip",
        detail: "No sample string for required-parameter command.",
      });
      continue;
    }

    if (!covered.has(command.name) && family === "lab_native") {
      results.push({
        command: command.name,
        family,
        input: sample ?? command.name,
        outcome: "fail",
        detail: "Lab-native implemented command has no trainer probe.",
      });
      continue;
    }

    const input = sample ?? command.name;
    const route = executeCatalogCommand(session, command.name, input);

    if (route.kind === "message" && route.message.includes("CPF0001")) {
      results.push({
        command: command.name,
        family,
        input,
        outcome: "fail",
        detail: route.message,
      });
      continue;
    }

    if (
      route.kind === "message" &&
      (route.message.includes("not implemented") || route.message.includes("LCL0901")) &&
      family === "lab_native"
    ) {
      results.push({
        command: command.name,
        family,
        input,
        outcome: "fail",
        detail: route.message,
      });
      continue;
    }

    results.push({
      command: command.name,
      family,
      input,
      outcome: "pass",
      screenId: route.kind === "screen" ? route.screen.id : undefined,
      detail: route.kind === "message" ? route.message.slice(0, 80) : undefined,
    });
  }

  return results;
}

export function runCommandMetadataAudit(options?: { includeRuntime?: boolean }): {
  metadata: CommandMetadataReport;
  runtime?: CommandRuntimeProbeResult[];
  coverage: ReturnType<typeof analyzeCatalogCoverage>;
} {
  resetDatabaseConnection();
  initTestDatabase();
  seedClaims400(getDatabase());

  const metadata = auditCommandCatalogMetadata();
  const probes = buildTrainerProbes();
  const coverage = analyzeCatalogCoverage(probes);
  const runtime = options?.includeRuntime !== false ? probeImplementedCommandsRuntime() : undefined;
  return { metadata, runtime, coverage };
}

export function formatCommandMetadataReport(
  metadata: CommandMetadataReport,
  runtime?: CommandRuntimeProbeResult[],
  coverage?: ReturnType<typeof analyzeCatalogCoverage>,
): string {
  const lines = [
    `${APP_NAME} — Command Metadata Audit`,
    metadata.ranAt,
    `Cataloged: ${metadata.totals.cataloged} · Implemented: ${metadata.totals.implemented} · IBM i: ${metadata.totals.ibm_i} · Lab: ${metadata.totals.lab_native}`,
    `Metadata errors: ${metadata.summary.errors} · warnings: ${metadata.summary.warnings}`,
    "",
  ];

  if (coverage) {
    lines.push(
      `Trainer coverage: ${coverage.coveredTotal}/${coverage.implementedTotal} implemented commands probed`,
    );
    if (coverage.unprobedCommands.length) {
      lines.push(`Unprobed: ${coverage.unprobedCommands.join(", ")}`);
    }
    if (coverage.coveredTotal < coverage.implementedTotal) {
      lines.push("");
      lines.push("Coverage gap: add trainer probes or commandSamples for unprobed commands.");
    }
    lines.push("");
  }

  const errors = metadata.findings.filter((f) => f.severity === "error");
  if (errors.length) {
    lines.push("## Metadata errors");
    for (const f of errors.slice(0, 40)) {
      lines.push(`- ${f.command} [${f.code}] ${f.detail}`);
    }
    if (errors.length > 40) lines.push(`  ... and ${errors.length - 40} more`);
    lines.push("");
  }

  const warnings = metadata.findings.filter((f) => f.severity === "warn");
  if (warnings.length) {
    lines.push("## Metadata warnings");
    for (const f of warnings.slice(0, 30)) {
      lines.push(`- ${f.command} [${f.code}] ${f.detail}`);
    }
    if (warnings.length > 30) lines.push(`  ... and ${warnings.length - 30} more`);
    lines.push("");
  }

  if (runtime) {
    const fails = runtime.filter((r) => r.outcome === "fail");
    lines.push(`## Runtime probes: ${runtime.filter((r) => r.outcome === "pass").length} pass, ${fails.length} fail`);
    for (const f of fails.slice(0, 20)) {
      lines.push(`- FAIL ${f.command}: ${f.detail}`);
    }
    lines.push("");
  }

  if (errors.length === 0 && (!runtime || runtime.every((r) => r.outcome !== "fail"))) {
    lines.push("Command metadata audit passed.");
  }

  return lines.join("\n").trimEnd();
}
