import type { CommandDefinition } from "../ibmi-runtime/commandCatalog.js";
import { listImplementedCommands } from "../ibmi-runtime/commandCatalog.js";
import type { TrainerProbe } from "./types.js";

export type CatalogCoverageReport = {
  implementedTotal: number;
  coveredTotal: number;
  unprobedCommands: string[];
  missingSamples: string[];
};

function commandFromInput(input: string): string {
  return input.trim().split(/\s+/)[0]?.toUpperCase() ?? "";
}

export function commandsCoveredByProbes(probes: TrainerProbe[]): Set<string> {
  const covered = new Set<string>();
  for (const probe of probes) {
    for (const name of probe.covers ?? []) {
      covered.add(name.toUpperCase());
    }
    if (probe.input) {
      covered.add(commandFromInput(probe.input));
    }
  }
  return covered;
}

export function analyzeCatalogCoverage(
  probes: TrainerProbe[],
  commands: CommandDefinition[] = listImplementedCommands(),
): CatalogCoverageReport {
  const covered = commandsCoveredByProbes(probes);
  const unprobedCommands: string[] = [];
  const missingSamples: string[] = [];

  for (const command of commands) {
    if (!covered.has(command.name)) {
      unprobedCommands.push(command.name);
    }
    const requiresSample = command.parameters.some((param) => param.required);
    if (requiresSample && !covered.has(command.name)) {
      missingSamples.push(command.name);
    }
  }

  return {
    implementedTotal: commands.length,
    coveredTotal: commands.filter((cmd) => covered.has(cmd.name)).length,
    unprobedCommands: unprobedCommands.sort(),
    missingSamples: missingSamples.sort(),
  };
}
