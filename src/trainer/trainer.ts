import { APP_NAME } from "../branding.js";
import type { IbmiSession } from "../ibmi-runtime/sessionService.js";
import { routeAuditMenuInput } from "../ibmi-runtime/commandRuntime.js";
import { createSession } from "../ibmi-runtime/sessionService.js";
import { startMissionAttempt } from "../missions/missionEngine.js";
import { getDatabase, initTestDatabase, resetDatabaseConnection } from "../db/sqlite.js";
import { clearTrainerProbeState, syncRangeIfNeeded } from "../db/seedData.js";
import { buildTrainerProbes, mutationCommands } from "./probes.js";
import { hydrateSessionFromProfile } from "../ibmi-runtime/sessionService.js";
import { getCommand } from "../ibmi-runtime/commandCatalog.js";
import { sessionHasSpecialAuthority } from "../ibmi-runtime/authorityCheck.js";
import { analyzeCatalogCoverage } from "./catalogCoverage.js";
import type {
  MenuRouteResult,
  ProbeOutcome,
  TrainerProbe,
  TrainerProbeContext,
  TrainerProbeResult,
  TrainerReport,
} from "./types.js";

function evaluateProbe(probe: TrainerProbe, result: MenuRouteResult | undefined): TrainerProbeResult {
  if (!result) {
    return {
      probe,
      outcome: "fail",
      detail: "Probe returned no result.",
    };
  }

  const base: TrainerProbeResult = {
    probe,
    outcome: "pass",
    actualKind: result.kind,
    screenId: result.kind === "screen" ? result.screen.id : undefined,
    message: result.kind === "message" ? result.message : undefined,
  };

  const { expect } = probe;

  if (expect.kind !== "any" && result.kind !== expect.kind) {
    return {
      ...base,
      outcome: "fail",
      detail: `Expected ${expect.kind}, got ${result.kind}.`,
    };
  }

  if (expect.screenId && result.kind === "screen" && result.screen.id !== expect.screenId) {
    return {
      ...base,
      outcome: "fail",
      detail: `Expected screen ${expect.screenId}, got ${result.screen.id}.`,
    };
  }

  if (result.kind === "screen" && (result.screen.id === "GENWRK" || result.screen.id === "GENDSP")) {
    return {
      ...base,
      outcome: "fail",
      detail: `Catalog stub screen ${result.screen.id} — command needs a real handler.`,
    };
  }

  if (result.kind === "message") {
    if (expect.messageIncludes && expect.messageIncludes.length > 0 && !result.message.includes(expect.messageIncludes)) {
      return {
        ...base,
        outcome: "fail",
        detail: `Message missing "${expect.messageIncludes}".`,
      };
    }
    for (const excluded of expect.messageExcludes ?? []) {
      if (result.message.includes(excluded)) {
        return {
          ...base,
          outcome: "fail",
          detail: `Message should not include "${excluded}".`,
        };
      }
    }
    if (
      result.message.includes("not implemented") ||
      result.message.includes("CPF0001") ||
      result.message.includes("not found.")
    ) {
      return { ...base, outcome: "fail", detail: "Command failed at runtime." };
    }
  }

  return base;
}

function runProbe(probe: TrainerProbe, ctx: TrainerProbeContext): TrainerProbeResult {
  try {
    const session = ctx.session;
    session.currentMenu = probe.menu ?? "AUDIT";

    let result: MenuRouteResult | undefined;
    if (probe.run) {
      result = probe.run(ctx);
    } else if (probe.input) {
      result = ctx.route(session, probe.input);
    } else {
      return { probe, outcome: "error", detail: "Probe has no input or run function." };
    }

    return evaluateProbe(probe, result);
  } catch (err) {
    return {
      probe,
      outcome: "error",
      detail: err instanceof Error ? err.message : String(err),
    };
  }
}

function probeNeedsPrivileged(probe: TrainerProbe, systemName: string): boolean {
  if (probe.covers?.some((command) => mutationCommands.has(command))) {
    return true;
  }
  const auditSession = createSession(systemName);
  auditSession.signedOn = true;
  auditSession.userName = "AUDIT";
  const commandNames = new Set<string>();
  for (const covered of probe.covers ?? []) {
    commandNames.add(covered.toUpperCase());
  }
  if (probe.input) {
    const token = probe.input.match(/^(\d+)$/) ? probe.covers?.[0] : probe.input.split(/\s+/)[0];
    if (token) commandNames.add(token.toUpperCase());
  }
  for (const commandName of commandNames) {
    const definition = getCommand(commandName);
    if (
      definition?.requiresAuthority?.length &&
      !sessionHasSpecialAuthority(auditSession, definition.requiresAuthority)
    ) {
      return true;
    }
  }
  return false;
}

export type RunTrainerOptions = {
  systemName?: string;
  probes?: TrainerProbe[];
  useTestDatabase?: boolean;
  groups?: string[];
};

export function runTrainer(options: RunTrainerOptions = {}): TrainerReport {
  if (options.useTestDatabase !== false) {
    resetDatabaseConnection();
    initTestDatabase();
  }

  const systemName = options.systemName ?? "CLAIMS400";
  const probes = (options.probes ?? buildTrainerProbes()).filter(
    (probe) => !options.groups?.length || options.groups.includes(probe.group),
  );
  const coverage = analyzeCatalogCoverage(probes);

  const results: TrainerProbeResult[] = [];

  for (const probe of probes) {
    const db = getDatabase();
    clearTrainerProbeState(db);
    syncRangeIfNeeded(db, true);
    const session = createSession(systemName);
    session.signedOn = true;
    const needsPrivileged = probeNeedsPrivileged(probe, systemName);
    const userName = probe.sessionUser ?? (needsPrivileged ? "QSECOFR" : "AUDIT");
    session.userName = userName;
    hydrateSessionFromProfile(session, userName, systemName);
    session.currentMenu = probe.menu ?? (needsPrivileged ? "SECURITY" : "AUDIT");
    startMissionAttempt(session);

    const ctx: TrainerProbeContext = {
      session,
      route: routeAuditMenuInput,
    };

    results.push(runProbe(probe, ctx));
  }

  const summary = {
    total: results.length,
    pass: results.filter((r) => r.outcome === "pass").length,
    fail: results.filter((r) => r.outcome === "fail").length,
    error: results.filter((r) => r.outcome === "error").length,
  };

  return {
    ranAt: new Date().toISOString(),
    systemName,
    summary,
    coverage,
    results,
    failures: results.filter((r) => r.outcome !== "pass"),
  };
}

export function formatTrainerReport(report: TrainerReport, verbose = false): string {
  const lines = [
    `${APP_NAME} Trainer`,
    `System: ${report.systemName} · ${report.ranAt}`,
    `PASS ${report.summary.pass} · FAIL ${report.summary.fail} · ERROR ${report.summary.error} · TOTAL ${report.summary.total}`,
    `COVERAGE ${report.coverage.coveredTotal}/${report.coverage.implementedTotal} implemented commands probed`,
    "",
  ];

  if (report.coverage.unprobedCommands.length > 0) {
    lines.push("Catalog gaps (add a probe or commandSamples entry):");
    for (const name of report.coverage.unprobedCommands) {
      lines.push(`  - ${name}`);
    }
    lines.push("");
  }

  const show = verbose ? report.results : report.failures;
  if (show.length === 0) {
    lines.push("All probes passed.");
  } else {
    for (const result of show) {
      const status = result.outcome.toUpperCase().padEnd(5);
      const label = `${result.probe.group}/${result.probe.id.split("/").slice(1).join("/") || result.probe.id}`;
      lines.push(`${status} ${label}`);
      lines.push(`       ${result.probe.description}`);
      if (result.detail) lines.push(`       → ${result.detail}`);
      if (result.message) lines.push(`       → ${result.message}`);
      if (result.screenId) lines.push(`       → screen ${result.screenId}`);
      lines.push("");
    }
  }

  return lines.join("\n").trimEnd();
}
