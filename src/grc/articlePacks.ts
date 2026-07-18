import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { getCatalogCommand, loadFullCommandCatalog } from "../catalog/commandCatalogService.js";
import { listImplementedCommands } from "../ibmi-runtime/commandCatalog.js";
import { resolveScreenCoverage } from "../trainer/screenCoverageResolver.js";
import { MISSION_ARTICLES, type GrcArticleLink } from "./iOnGrcArticles.js";

export type LabCoverageLevel = "full" | "partial" | "stub" | "missing";

export type IongrcPackStep = {
  id: string;
  title: string;
  command: string;
  commandMatch?: RegExp;
  screenHint?: string;
  excerptRefs: string[];
  watchFor: string[];
  exitHint?: string;
};

export type ArticlePackArticleRef = {
  kind: "command" | "screen" | "menu";
  ref: string;
};

export type ArticlePack = {
  id: string;
  sourceFile: string;
  article: GrcArticleLink;
  menuLabel: string;
  quotes: string[];
  steps: IongrcPackStep[];
  articleRefs: ArticlePackArticleRef[];
  excerptPending?: boolean;
};

export type PackStepCoverage = {
  stepId: string;
  command: string;
  screenHint?: string;
  commandCoverage: LabCoverageLevel;
  screenCoverage?: LabCoverageLevel;
  gapNotes?: string;
};

export type PackLabCoverage = {
  packId: string;
  auditedAt: string;
  steps: PackStepCoverage[];
  articleOnlyRefs: Array<{ kind: ArticlePackArticleRef["kind"]; ref: string; coverage: LabCoverageLevel }>;
  blockingGaps: string[];
  fullStepCount: number;
  totalStepCount: number;
};

type RawPackStep = {
  id: string;
  title: string;
  command: string;
  commandMatch?: string;
  screenHint?: string;
  excerptRefs: string[];
  watchFor: string[];
  exitHint?: string;
};

type RawArticlePack = {
  id: string;
  sourceFile: string;
  articleKey?: string;
  menuLabel: string;
  quotes: string[];
  steps: RawPackStep[];
  articleRefs?: ArticlePackArticleRef[];
  excerptPending?: boolean;
};

const GRC_PACKS_ROOT = join(process.cwd(), "data", "grc-packs");

export const MISSION_TO_PACK: Record<string, string> = {
  "CLAIMS-001": "offboarding",
  "CLAIMS-002": "offboarding",
  "CLAIMS-003": "clause-8",
  "CLAIMS-004": "clause-6",
  "CLAIMS-005": "blue-team",
  "CLAIMS-006": "offboarding",
  "CLAIMS-007": "red-team",
  "CLAIMS-008": "soc2",
  "HOSPITAL-002": "clause-8",
};

export function packIdForMission(missionId: string): string | undefined {
  return MISSION_TO_PACK[missionId.trim().toUpperCase()];
}

function readExcerpt(relativePath: string): string {
  const path = join(GRC_PACKS_ROOT, relativePath);
  if (!existsSync(path)) return "";
  return readFileSync(path, "utf8");
}

function parsePack(raw: RawArticlePack): ArticlePack {
  const article =
    (raw.articleKey ? MISSION_ARTICLES[raw.articleKey] : undefined) ??
    Object.values(MISSION_ARTICLES).find((entry) => entry.title === raw.menuLabel);
  if (!article) {
    throw new Error(`Article pack ${raw.id} missing articleKey or article mapping`);
  }
  return {
    id: raw.id,
    sourceFile: raw.sourceFile,
    article,
    menuLabel: raw.menuLabel,
    quotes: raw.quotes ?? [],
    articleRefs: raw.articleRefs ?? [],
    excerptPending: raw.excerptPending ?? false,
    steps: (raw.steps ?? []).map((step) => ({
      ...step,
      commandMatch: step.commandMatch ? new RegExp(step.commandMatch, "i") : undefined,
    })),
  };
}

let cachedPacks: ArticlePack[] | undefined;

export function loadArticlePacks(): ArticlePack[] {
  if (cachedPacks) return cachedPacks;
  const packsDir = join(GRC_PACKS_ROOT, "packs");
  if (!existsSync(packsDir)) {
    cachedPacks = [];
    return cachedPacks;
  }
  cachedPacks = readdirSync(packsDir)
    .filter((name) => name.endsWith(".pack.json"))
    .map((name) => parsePack(JSON.parse(readFileSync(join(packsDir, name), "utf8")) as RawArticlePack))
    .sort((a, b) => a.menuLabel.localeCompare(b.menuLabel));
  return cachedPacks;
}

export function resetArticlePackCache(): void {
  cachedPacks = undefined;
}

export function getArticlePack(packId: string): ArticlePack | undefined {
  return loadArticlePacks().find((pack) => pack.id === packId);
}

export function assertExcerptIntegrity(pack: ArticlePack): string[] {
  const excerpt = readExcerpt(pack.sourceFile);
  if (!excerpt.trim() && !pack.excerptPending) {
    return [`Missing excerpt file: ${pack.sourceFile}`];
  }
  const failures: string[] = [];
  for (const quote of pack.quotes) {
    if (quote.trim() && !excerpt.includes(quote)) {
      failures.push(`Quote not found in excerpt: ${quote.slice(0, 60)}…`);
    }
  }
  for (const step of pack.steps) {
    for (const ref of step.excerptRefs) {
      if (ref.trim() && !excerpt.includes(ref)) {
        failures.push(`Step ${step.id} excerptRef not in source: ${ref.slice(0, 60)}…`);
      }
    }
  }
  return failures;
}

export function extractCommandName(commandLine: string): string {
  const token = commandLine.trim().split(/\s+/)[0] ?? "";
  return token.replace(/[^A-Z0-9*]/gi, "").toUpperCase();
}

export function resolveCommandCoverage(commandLine: string): LabCoverageLevel {
  const name = extractCommandName(commandLine);
  if (!name) return "missing";
  const catalog = getCatalogCommand(name);
  if (!catalog) return "missing";
  if (catalog.status === "implemented") {
    const implemented = listImplementedCommands().some((row) => row.name === name);
    return implemented ? "full" : "partial";
  }
  if (catalog.status === "stubbed" || catalog.status === "cataloged") return "stub";
  if (catalog.status === "not_supported" || catalog.status === "out_of_scope") return "missing";
  return "stub";
}

export function resolveRefCoverage(ref: string, kind: ArticlePackArticleRef["kind"]): LabCoverageLevel {
  if (kind === "command") {
    return resolveCommandCoverage(ref);
  }
  return "partial";
}

export function computePackCoverage(pack: ArticlePack): PackLabCoverage {
  const steps: PackStepCoverage[] = pack.steps.map((step) => {
    const commandCoverage = resolveCommandCoverage(step.command);
    const screenResult = resolveScreenCoverage(step.screenHint, step.command);
    const screenCoverage = screenResult?.coverage;
    const commandGap =
      commandCoverage === "stub"
        ? `${extractCommandName(step.command)} is cataloged/stubbed in this partition`
        : commandCoverage === "missing"
          ? `${extractCommandName(step.command)} is not yet in the lab catalog`
          : commandCoverage !== "full"
            ? `${extractCommandName(step.command)} handler may be incomplete`
            : undefined;
    const gapNotes = commandGap ?? screenResult?.gapNotes;
    return {
      stepId: step.id,
      command: step.command,
      screenHint: step.screenHint,
      commandCoverage,
      screenCoverage,
      gapNotes,
    };
  });
  const articleOnlyRefs = pack.articleRefs.map((row) => ({
    kind: row.kind,
    ref: row.ref,
    coverage: resolveRefCoverage(row.ref, row.kind),
  }));
  const blockingGaps = steps
    .filter((row) => row.commandCoverage === "missing")
    .map((row) => row.stepId);
  const fullStepCount = steps.filter((row) => row.commandCoverage === "full").length;
  return {
    packId: pack.id,
    auditedAt: new Date().toISOString(),
    steps,
    articleOnlyRefs,
    blockingGaps,
    fullStepCount,
    totalStepCount: steps.length,
  };
}

export function buildCoverageReport(): { packs: PackLabCoverage[]; catalogCommandCount: number } {
  loadFullCommandCatalog();
  const packs = loadArticlePacks().map((pack) => computePackCoverage(pack));
  return { packs, catalogCommandCount: loadFullCommandCatalog().length };
}

export function renderStepExcerpts(pack: ArticlePack, step: IongrcPackStep): string[] {
  const excerpt = readExcerpt(pack.sourceFile);
  return step.excerptRefs.filter((ref) => ref.trim().length > 0);
}

export function coverageBadgeLabel(coverage: PackLabCoverage): string {
  if (coverage.totalStepCount === 0) return "excerpt pending";
  return `${coverage.fullStepCount} of ${coverage.totalStepCount} steps fully simulated`;
}
