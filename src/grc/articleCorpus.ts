import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { extractCommandName, loadArticlePacks } from "./articlePacks.js";
import { sanitizeCorpusExcerpt } from "./linkedInExtract.js";
import { SCREEN_ARTICLES, type GrcArticleLink } from "./iOnGrcArticles.js";

export type CorpusArticle = {
  id: string;
  title: string;
  url: string;
  published?: string;
  sourceType: string;
  sourceFile: string | null;
  commands: string[];
  screens: string[];
  frameworkRefs?: string[];
  category?: string;
  tags?: string[];
  indexed: boolean;
};

export type CorpusChunk = {
  articleId: string;
  text: string;
  kind: "excerpt" | "quote" | "command-block";
};

export type CorpusMatch = {
  article: CorpusArticle;
  score: number;
  reason: string;
  excerpts: string[];
  commands: string[];
  link: GrcArticleLink;
};

type CatalogFile = {
  version: string;
  articles: CorpusArticle[];
};

const CORPUS_ROOT = join(process.cwd(), "data", "grc-corpus");
const PACK_SOURCES = join(process.cwd(), "data", "grc-packs");

let cachedCatalog: CorpusArticle[] | undefined;

function readSource(relativePath: string | null): string {
  if (!relativePath) return "";
  for (const root of [CORPUS_ROOT, PACK_SOURCES]) {
    const path = join(root, relativePath.replace(/^sources\//, "sources/"));
    const alt = join(root, relativePath);
    if (existsSync(path)) return readFileSync(path, "utf8");
    if (existsSync(alt)) return readFileSync(alt, "utf8");
  }
  return "";
}

export function loadCorpusCatalog(): CorpusArticle[] {
  if (cachedCatalog) return cachedCatalog;
  const catalogPath = join(CORPUS_ROOT, "catalog.json");
  if (!existsSync(catalogPath)) {
    cachedCatalog = [];
    return cachedCatalog;
  }
  const raw = JSON.parse(readFileSync(catalogPath, "utf8")) as CatalogFile;
  cachedCatalog = raw.articles ?? [];
  return cachedCatalog;
}

export function resetCorpusCache(): void {
  cachedCatalog = undefined;
}

export function getCorpusArticle(articleId: string): CorpusArticle | undefined {
  return loadCorpusCatalog().find((row) => row.id === articleId);
}

function normalizeToken(value: string): string {
  return value.trim().toUpperCase();
}

function commandFromInput(input?: string): string | undefined {
  if (!input?.trim()) return undefined;
  const name = extractCommandName(input);
  return name || undefined;
}

function excerptChunks(article: CorpusArticle, limit = 3): string[] {
  const body = readSource(article.sourceFile);
  if (!body.trim()) return [];

  const chunks: string[] = [];
  const paragraphs = body
    .split(/\n\s*\n/)
    .map((row) => row.replace(/^#+\s*/gm, "").trim())
    .map((row) => sanitizeCorpusExcerpt(row))
    .filter((row) => row.length > 40);

  for (const paragraph of paragraphs) {
    if (chunks.length >= limit) break;
    chunks.push(paragraph.slice(0, 420));
  }

  if (chunks.length === 0 && body.trim()) {
    const fallback = sanitizeCorpusExcerpt(body.trim());
    if (fallback.length > 40) chunks.push(fallback.slice(0, 420));
  }
  return chunks;
}

function articleLink(article: CorpusArticle): GrcArticleLink {
  const pack = loadArticlePacks().find((row) => row.id === article.id);
  if (pack) return pack.article;
  return {
    title: article.title,
    url: article.url,
    hook: article.frameworkRefs?.[0] ?? "i on GRC article",
    frameworkRefs: article.frameworkRefs,
  };
}

function scoreArticle(
  article: CorpusArticle,
  screenId?: string,
  commandName?: string,
): { score: number; reason: string } {
  let score = 0;
  const reasons: string[] = [];
  const screen = normalizeToken(screenId ?? "");
  const command = normalizeToken(commandName ?? "");

  if (screen && article.screens.some((row) => screen.includes(normalizeToken(row)))) {
    score += 10;
    reasons.push(`screen ${screen}`);
  }
  if (command && article.commands.some((row) => normalizeToken(row) === command)) {
    score += 12;
    reasons.push(`command ${command}`);
  }

  const screenArticle = screen ? SCREEN_ARTICLES[screen] : undefined;
  if (screenArticle && screenArticle.url === article.url) {
    score += 8;
    reasons.push("screen article map");
  }

  const pack = loadArticlePacks().find((row) => row.id === article.id);
  if (pack && screen) {
    if (pack.steps.some((step) => step.screenHint && screen.includes(step.screenHint.toUpperCase()))) {
      score += 6;
      reasons.push("pack step screen");
    }
    if (command && pack.steps.some((step) => extractCommandName(step.command) === command)) {
      score += 6;
      reasons.push("pack step command");
    }
  }

  if (article.indexed) score += 1;

  return { score, reason: reasons.join(" · ") || "catalog" };
}

export function retrieveCorpusMatches(options: {
  screenId?: string;
  lastCommand?: string;
  limit?: number;
}): CorpusMatch[] {
  const screen = options.screenId?.trim().toUpperCase();
  const command = commandFromInput(options.lastCommand);
  const limit = options.limit ?? 5;

  const matches = loadCorpusCatalog()
    .map((article) => {
      const { score, reason } = scoreArticle(article, screen, command);
      return {
        article,
        score,
        reason,
        excerpts: excerptChunks(article, 2),
        commands: article.commands.slice(0, 6),
        link: articleLink(article),
      } satisfies CorpusMatch;
    })
    .filter((row) => row.score > 0 || row.article.indexed)
    .sort((a, b) => b.score - a.score || a.article.title.localeCompare(b.article.title));

  if (matches.some((row) => row.score > 0)) {
    return matches.filter((row) => row.score > 0).slice(0, limit);
  }
  return matches.filter((row) => row.article.indexed).slice(0, limit);
}

export function listCorpusArticles(): CorpusMatch[] {
  return loadCorpusCatalog()
    .map((article) => ({
      article,
      score: article.indexed ? 1 : 0,
      reason: "catalog",
      excerpts: excerptChunks(article, 1),
      commands: article.commands.slice(0, 4),
      link: articleLink(article),
    }))
    .sort((a, b) => a.article.title.localeCompare(b.article.title));
}

export function corpusStats(): { total: number; indexed: number; withExcerpt: number } {
  const articles = loadCorpusCatalog();
  return {
    total: articles.length,
    indexed: articles.filter((row) => row.indexed).length,
    withExcerpt: articles.filter((row) => readSource(row.sourceFile).trim().length > 0).length,
  };
}
