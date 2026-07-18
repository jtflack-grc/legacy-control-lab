import { loadScreenLayoutSpecs } from "../ibm74/screenLayoutSpec.js";
import {
  auditRenderedScreenFidelity,
  type ScreenFidelityResult,
} from "./screenFidelityAudit.js";
import { auditScreenLayout, renderScreenForLayoutSpec } from "./ibmScreenLayoutAudit.js";

type LabCoverageLevel = "full" | "partial" | "stub" | "missing";

export type ScreenCoverageResult = {
  coverage: LabCoverageLevel;
  gapNotes?: string;
};

const coverageCache = new Map<string, ScreenCoverageResult>();

function cacheKey(screenHint: string, commandLine: string): string {
  return `${screenHint}::${commandLine}`;
}

export function resolveScreenCoverage(
  screenHint: string | undefined,
  commandLine: string,
): ScreenCoverageResult | undefined {
  if (!screenHint) return undefined;

  const key = cacheKey(screenHint, commandLine);
  const cached = coverageCache.get(key);
  if (cached) return cached;

  if (/\bOUTPUT\(\*OUTFILE\)/i.test(commandLine)) {
    const result: ScreenCoverageResult = {
      coverage: "partial",
      gapNotes: "OUTFILE export returns message confirmation, not an interactive screen",
    };
    coverageCache.set(key, result);
    return result;
  }

  const layoutSpec = loadScreenLayoutSpecs().find((spec) => spec.screenId === screenHint);
  if (!layoutSpec) {
    const result: ScreenCoverageResult = {
      coverage: "partial",
      gapNotes: `${screenHint} has no Tier A/B layout spec yet`,
    };
    coverageCache.set(key, result);
    return result;
  }

  if (layoutSpec.enforceInCi === false) {
    const result: ScreenCoverageResult = {
      coverage: "partial",
      gapNotes: `${screenHint} layout spec is not enforced in CI yet`,
    };
    coverageCache.set(key, result);
    return result;
  }

  try {
    const screen = renderScreenForLayoutSpec(layoutSpec);
    const layoutResult = auditScreenLayout(layoutSpec, screen);
    if (!layoutResult.pass) {
      const result: ScreenCoverageResult = {
        coverage: "partial",
        gapNotes: layoutResult.detail ?? `${screenHint} layout audit failed`,
      };
      coverageCache.set(key, result);
      return result;
    }

    const fidelityResult = auditRenderedScreenFidelity(screenHint, screen);
    const result = toCoverageResult(screenHint, fidelityResult);
    coverageCache.set(key, result);
    return result;
  } catch (err) {
    const result: ScreenCoverageResult = {
      coverage: "partial",
      gapNotes: err instanceof Error ? err.message : String(err),
    };
    coverageCache.set(key, result);
    return result;
  }
}

function toCoverageResult(screenHint: string, fidelityResult: ScreenFidelityResult): ScreenCoverageResult {
  if (!fidelityResult.pass) {
    return {
      coverage: "partial",
      gapNotes: fidelityResult.detail ?? `${screenHint} fidelity audit failed`,
    };
  }
  return { coverage: "full" };
}

export function resetScreenCoverageCache(): void {
  coverageCache.clear();
}
