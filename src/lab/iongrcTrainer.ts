import { corpusStats, listCorpusArticles, retrieveCorpusMatches, type CorpusMatch } from "../grc/articleCorpus.js";
import {
  buildPracticeHint,
  formatCommandContextLine,
  lookupCommandReference,
  lookupCommandReferences,
  type IbmCommandReference,
} from "../grc/commandReference.js";
import {
  computePackCoverage,
  coverageBadgeLabel,
  getArticlePack,
  loadArticlePacks,
  packIdForMission,
} from "../grc/articlePacks.js";
import {
  labStatusLabel,
  missionBridgeForArticle,
  resolveArticleLabStatus,
  type ArticleLabStatus,
  type ArticleMissionBridge,
} from "../grc/articleLabStatus.js";
import { getGuidedPathForArticle, type GuidedPath } from "../grc/guidedPaths.js";
import { loadTrainingPaths } from "../grc/trainingPaths.js";
import { hydrateSignOnCopy } from "./signOnCredentials.js";

export type IongrcCommandContext = {
  command: string;
  contextLine?: string;
  ibmReference?: IbmCommandReference;
};

export type IongrcArticleMatch = {
  id: string;
  title: string;
  url: string;
  hook: string;
  frameworkRefs?: string[];
  score: number;
  reason: string;
  excerpts: string[];
  commands: string[];
  indexed: boolean;
  hasExcerpt: boolean;
  coverageBadge: string;
  labStatus: ArticleLabStatus;
  labStatusLabel: string;
  missionBridge?: ArticleMissionBridge;
  guidedPath?: GuidedPath;
  ibmReference?: IbmCommandReference;
  commandContexts: IongrcCommandContext[];
  practiceHint?: string;
};

export const IONGRC_COMPLETE_MESSAGE = "CPF0006 - i on GRC practice complete.";

export function isIongrcSubmitComplete(lastCommand?: string): boolean {
  return Boolean(lastCommand?.trim().match(/^SUBMITMSN\b/i));
}

/** @deprecated Linear pack steps removed — IONGRC is screen-driven. */
export function normalizeIongrcPackId(packParam?: string | null): string {
  if (packParam?.trim() && getArticlePack(packParam.trim())) return packParam.trim();
  return retrieveCorpusMatches({ limit: 1 })[0]?.article.id ?? "offboarding";
}

export type IongrcScreenGuide = {
  headline: string;
  bullets: string[];
  matched: boolean;
};

export function resolveIongrcScreenGuide(
  screenId?: string,
  lastCommand?: string,
): IongrcScreenGuide {
  const screen = (screenId ?? "").trim().toUpperCase();
  if (!screen || screen === "DISCONNECTED" || screen.includes("SIGNON")) {
    return {
      headline: "Getting started — pick an article or training path",
      bullets: [
        "Featured: Offboarding → WRKUSRPRF, DSPUSRPRF, ANZPRFACT on the green screen.",
        "ISO 27701 paths group Clauses 5–10; Detect & respond covers Blue/Red team and SOC 2.",
        "Sign on IONGRC / IONGRC — stock Main Menu. Match what you read to what you run on the green screen.",
      ],
      matched: false,
    };
  }

  const matches = retrieveCorpusMatches({ screenId: screen, lastCommand, limit: 1 });
  const primary = matches[0];
  if (!primary) {
    const ibmRef = lookupCommandReference(screen);
    return {
      headline: `On ${screen}`,
      bullets: [
        ibmRef ? `IBM i: ${ibmRef.summary}` : "Explore menus and commands — article matches appear here as you work.",
      ],
      matched: true,
    };
  }

  const formatted = formatMatch(primary, screen, lastCommand);
  const commandLines = formatted.commandContexts
    .slice(0, 3)
    .map((row) => row.contextLine)
    .filter((line): line is string => Boolean(line));

  return {
    headline: `${screen} — ${primary.link.title}`,
    bullets: [
      ...primary.excerpts.slice(0, 1).map((excerpt) => `In the article: ${excerpt}`),
      ...commandLines,
      formatted.practiceHint ?? "",
    ].filter(Boolean),
    matched: true,
  };
}

export function buildIongrcTrainerPayload(
  _packIdOrScreen: string | undefined,
  _stepIndex = 0,
  systemName = "CLAIMS400",
  screenId?: string,
  lastCommand?: string,
  focusArticleId?: string,
) {
  const stats = corpusStats();
  const trainingPaths = loadTrainingPaths();
  const contextMatches = retrieveCorpusMatches({ screenId, lastCommand, limit: 5 });
  const allArticles = listCorpusArticles();
  const disconnected = !screenId || screenId === "DISCONNECTED" || screenId.includes("SIGNON");
  const featuredIds = trainingPaths.featured.length
    ? trainingPaths.featured
    : ["offboarding", "blue-team", "clause-8"];
  const defaultArticleId = featuredIds[0] ?? "offboarding";

  const focused =
    (focusArticleId ? allArticles.find((row) => row.article.id === focusArticleId) : undefined) ??
    (!disconnected ? contextMatches[0] : undefined) ??
    (disconnected
      ? allArticles.find((row) => row.article.id === defaultArticleId) ??
        allArticles.find((row) => row.article.indexed)
      : allArticles.find((row) => row.article.indexed));

  const primary = focused ?? contextMatches[0];
  const pack = primary ? getArticlePack(primary.article.id) : undefined;
  const coverage = pack ? computePackCoverage(pack) : undefined;
  const articleById = new Map(allArticles.map((row) => [row.article.id, row]));

  const trainingGroups = trainingPaths.paths.map((path) => {
    const articles = path.articleIds
      .map((id) => articleById.get(id))
      .filter((row): row is CorpusMatch => Boolean(row))
      .map((row) => formatMatch(row, screenId, lastCommand));
    const leadCommands = articles.flatMap((row) => row.commands).slice(0, 3);
    const leadRefs = lookupCommandReferences(leadCommands);
    const pathIntro =
      leadRefs.length > 0
        ? `${path.description} Commands: ${leadRefs.map((ref) => `${ref.command} (${ref.summary.split(".")[0]})`).join(" · ")}.`
        : path.description;
    return {
      id: path.id,
      label: path.label,
      description: path.description,
      pathIntro,
      articles,
    };
  });

  const featuredArticles = featuredIds
    .map((id) => articleById.get(id))
    .filter((row): row is CorpusMatch => Boolean(row))
    .map((row) => formatMatch(row, screenId, lastCommand));

  const primaryFormatted = primary ? formatMatch(primary, screenId, lastCommand) : undefined;
  const guidedPath = primaryFormatted?.guidedPath;
  const missionBridge = primaryFormatted?.missionBridge;
  const featuredLead = featuredArticles[0];
  const disconnectedIntro = featuredLead
    ? `Start with ${featuredLead.title} — ${featuredLead.practiceHint ?? featuredLead.hook}. Sign on IONGRC / IONGRC and run commands on the stock Main Menu.`
    : "Start with Offboarding or pick a training path below — then sign on IONGRC / IONGRC and run commands on the stock Main Menu.";
  const connectedIntro = primaryFormatted?.practiceHint
    ? `${primaryFormatted.practiceHint} Sign on IONGRC / IONGRC — stock IBM i Main Menu.`
    : "Sign on IONGRC / IONGRC — stock IBM i Main Menu. Run commands from the articles — no mission scoring.";

  return {
    mode: "corpus" as const,
    corpusStats: stats,
    contextMatches: contextMatches.map((row) => formatMatch(row, screenId, lastCommand)),
    articles: allArticles.map((row) => formatMatch(row, screenId, lastCommand)),
    featuredArticles,
    trainingGroups,
    gettingStarted: disconnected,
    primaryArticle: primaryFormatted,
    packId: primary?.article.id,
    packTitle: primary?.link.title ?? "i on GRC articles",
    article: primary?.link ?? { title: "", url: "", hook: "" },
    quotes: pack?.quotes ?? primary?.excerpts ?? [],
    coverageBadge: coverage
      ? coverageBadgeLabel(coverage)
      : `${stats.indexed} indexed · ${stats.total} articles · ${trainingPaths.paths.length} paths`,
    screenGuide: resolveIongrcScreenGuide(screenId, lastCommand),
    suggestedCommands: primaryFormatted?.commandContexts ?? [],
    pathIntro: disconnected ? disconnectedIntro : connectedIntro,
    missionBridge,
    guidedPath,
    lastCommand: lastCommand?.trim() ? hydrateSignOnCopy(lastCommand.trim(), systemName) : undefined,
    screenId: screenId ?? "DISCONNECTED",
  };
}

function formatMatch(
  match: CorpusMatch,
  screenId?: string,
  lastCommand?: string,
): IongrcArticleMatch {
  const pack = getArticlePack(match.article.id);
  const coverage = pack ? computePackCoverage(pack) : undefined;
  const commandNames = dedupeCommands(match.commands, screenId, lastCommand);
  const commandContexts: IongrcCommandContext[] = commandNames.map((command) => {
    const ibmReference = lookupCommandReference(command);
    return {
      command,
      ibmReference,
      contextLine: formatCommandContextLine(command, ibmReference),
    };
  });
  const ibmReference =
    commandContexts.find((row) => row.ibmReference)?.ibmReference ??
    (screenId ? lookupCommandReference(screenId.trim().toUpperCase()) : undefined);
  const practiceHint = buildPracticeHint({
    screenId,
    articleId: match.article.id,
    articleTitle: match.link.title,
    frameworkRefs: match.link.frameworkRefs ?? match.article.frameworkRefs,
    commands: commandNames,
    ibmReference,
  });

  const labStatus = resolveArticleLabStatus(match.article);
  return {
    id: match.article.id,
    title: match.link.title,
    url: match.link.url,
    hook: match.link.hook,
    frameworkRefs: match.link.frameworkRefs ?? match.article.frameworkRefs,
    score: match.score,
    reason: match.reason,
    excerpts: match.excerpts,
    commands: commandNames,
    indexed: match.article.indexed,
    hasExcerpt: match.excerpts.length > 0,
    coverageBadge: coverage ? coverageBadgeLabel(coverage) : labStatusLabel(labStatus),
    labStatus,
    labStatusLabel: labStatusLabel(labStatus),
    missionBridge: missionBridgeForArticle(match.article.id),
    guidedPath: getGuidedPathForArticle(match.article.id),
    ibmReference,
    commandContexts,
    practiceHint,
  };
}

function dedupeCommands(commands: string[], screenId?: string, lastCommand?: string): string[] {
  const fromInput = lastCommand?.trim().match(/^([A-Z][A-Z0-9]{2,9})\b/i)?.[1]?.toUpperCase();
  const screen = screenId?.trim().toUpperCase();
  const ordered = [...(fromInput ? [fromInput] : []), ...(screen ? [screen] : []), ...commands];
  const seen = new Set<string>();
  const result: string[] = [];
  for (const name of ordered) {
    const normalized = name.trim().toUpperCase();
    if (!normalized || seen.has(normalized)) continue;
    seen.add(normalized);
    result.push(normalized);
  }
  return result.slice(0, 6);
}

/** Pack linear advance removed — returns null so coach poll does not force step progression. */
export function detectIongrcStepAdvance(
  _packId: string,
  _stepIndex: number,
  _lastCommand?: string,
  _screenId?: string,
  _signedOnUser?: string,
): number | null {
  return null;
}

export function packIdForIongrcMission(missionId: string): string | undefined {
  return packIdForMission(missionId);
}

export function listIongrcPackSummaries() {
  return loadArticlePacks().map((pack) => ({
    id: pack.id,
    menuLabel: pack.menuLabel,
    coverage: computePackCoverage(pack),
  }));
}
