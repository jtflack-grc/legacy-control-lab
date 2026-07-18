import type { ParsedCommand } from "../ibmi-runtime/commandParser.js";
import { getParameter } from "../ibmi-runtime/commandParser.js";
import type { EvidenceRequirementRow } from "../db/repositories/missionRepository.js";

export type EvidenceMatch = {
  requirementKey: string;
  commandText: string;
};

function normalizeCommandToken(commandName: string, parsed: ParsedCommand): string {
  const name = commandName.toUpperCase();
  const sysval = getParameter(parsed, "SYSVAL");
  if (name === "DSPSYSVAL" && sysval) {
    return `DSPSYSVAL:${sysval.toUpperCase()}`;
  }

  const usrprf = getParameter(parsed, "USRPRF");
  if (usrprf && (name === "DSPUSRPRF" || name === "CHGUSRPRF")) {
    return `${name}:${usrprf.toUpperCase()}`;
  }

  const obj = getParameter(parsed, "OBJ");
  if (obj && (name === "DSPOBJAUT" || name === "DSPOBJD")) {
    return `${name}:${obj.toUpperCase()}`;
  }

  const file = getParameter(parsed, "FILE");
  if (file && (name === "DSPFD" || name === "DSPFFD")) {
    return `${name}:${file.toUpperCase()}`;
  }

  return name;
}

function patternMatches(token: string, pattern: string): boolean {
  const normalizedToken = token.toUpperCase();
  return pattern
    .split("|")
    .map((part) => part.trim().toUpperCase())
    .some((part) => {
      if (part.includes(":")) {
        return normalizedToken === part || normalizedToken.startsWith(`${part.split(":")[0]}:`);
      }
      if (part.includes("/")) {
        return normalizedToken.includes(part);
      }
      return normalizedToken === part || normalizedToken.startsWith(`${part}:`);
    });
}

export function matchEvidenceRequirements(
  requirements: EvidenceRequirementRow[],
  commandName: string,
  parsed: ParsedCommand,
  rawInput: string,
): EvidenceMatch[] {
  const token = normalizeCommandToken(commandName, parsed);
  const matches: EvidenceMatch[] = [];

  for (const requirement of requirements) {
    if (patternMatches(token, requirement.commandPattern)) {
      matches.push({ requirementKey: requirement.requirementKey, commandText: rawInput.trim() });
    }
  }

  return matches;
}

export function computeEvidenceCoverage(
  requirements: EvidenceRequirementRow[],
  collectedKeys: string[],
): { score: number; requiredTotal: number; requiredCollected: number; optionalCollected: number } {
  const required = requirements.filter((req) => !req.optional);
  const optional = requirements.filter((req) => req.optional);
  const requiredCollected = required.filter((req) => collectedKeys.includes(req.requirementKey)).length;
  const optionalCollected = optional.filter((req) => collectedKeys.includes(req.requirementKey)).length;
  const score = required.length === 0 ? 0 : (requiredCollected / required.length) * 100;

  return {
    score,
    requiredTotal: required.length,
    requiredCollected,
    optionalCollected,
  };
}
