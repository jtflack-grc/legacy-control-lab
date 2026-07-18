import type { ScreenDefinition } from "../screen.js";
import { loadArticlePacks } from "../../grc/articlePacks.js";
import { computePackCoverage, coverageBadgeLabel } from "../../grc/articlePacks.js";
import { createGoMenuScreen } from "./screenHelpers.js";

export const IONGRC_PACK_PREFIX = "__IONGRC_PACK__:";

export function iongrcMenuSelectionCommands(): Record<string, string> {
  const map: Record<string, string> = {};
  loadArticlePacks().forEach((pack, index) => {
    const coverage = computePackCoverage(pack);
    const suffix =
      pack.excerptPending || coverage.blockingGaps.length > 0
        ? ` (${coverage.fullStepCount < coverage.totalStepCount ? "partial" : "pending"})`
        : "";
    map[String(index + 1)] = `${IONGRC_PACK_PREFIX}${pack.id}`;
    void suffix;
  });
  return map;
}

export function iongrcMenuOptionLines(): string[] {
  return loadArticlePacks().map((pack, index) => {
    const coverage = computePackCoverage(pack);
    const badge =
      coverage.totalStepCount === 0 || pack.excerptPending
        ? "excerpt pending"
        : coverage.fullStepCount < coverage.totalStepCount
          ? "partial"
          : "";
    const suffix = badge ? ` (${badge})` : "";
    return `${String(index + 1).padStart(2, " ")}. ${pack.menuLabel}${suffix}`;
  });
}

/** @deprecated Legacy pack menu — IONGRC routes to stock IBMMAIN in production pattern. Screen retained for backward compat only. */
export function createIongrcMainMenuScreen(
  systemName: string,
  userName: string,
  commandValue = "",
  message = "",
): ScreenDefinition {
  const options = iongrcMenuOptionLines();
  if (options.length === 0) {
    options.push(" 1. i on GRC packs loading…");
  }
  return createGoMenuScreen(
    "IONGRCMAIN",
    systemName,
    "i on GRC Practice",
    options,
    commandValue,
    message,
  );
}

export function resolveIongrcPackFromSelection(selectionValue: string): string | undefined {
  if (!selectionValue.startsWith(IONGRC_PACK_PREFIX)) return undefined;
  return selectionValue.slice(IONGRC_PACK_PREFIX.length);
}

export function packMenuLabel(packId: string): string {
  return loadArticlePacks().find((pack) => pack.id === packId)?.menuLabel ?? packId;
}
