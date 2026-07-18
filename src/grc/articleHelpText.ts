import type { GrcArticleLink } from "./iOnGrcArticles.js";

const LINE_WIDTH = 74;

function wrapLine(prefix: string, text: string): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let current = prefix;

  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (next.length <= LINE_WIDTH) {
      current = next;
      continue;
    }
    if (current) lines.push(current);
    current = `${prefix.trimEnd()} ${word}`.trimStart();
    while (current.length > LINE_WIDTH) {
      lines.push(current.slice(0, LINE_WIDTH));
      current = current.slice(LINE_WIDTH).trimStart();
    }
  }
  if (current) lines.push(current);
  return lines;
}

function truncateUrl(url: string): string[] {
  if (url.length <= LINE_WIDTH - 2) return [`  ${url}`];
  const head = url.slice(0, LINE_WIDTH - 5);
  return [`  ${head}...`];
}

/** 5250 help lines for an i on GRC article reference block. */
export function articleHelpLines(article: GrcArticleLink): string[] {
  const lines = ["", "i on GRC article:", `  ${article.title.slice(0, LINE_WIDTH - 2)}`];
  lines.push(...wrapLine("  ", article.hook));
  if (article.frameworkRefs?.length) {
    lines.push(`  Framework: ${article.frameworkRefs.slice(0, 3).join(", ").slice(0, LINE_WIDTH - 13)}`);
  }
  lines.push("  Full article (click in coach panel):");
  lines.push(...truncateUrl(article.url));
  return lines.map((line) => line.slice(0, LINE_WIDTH));
}

export function appendArticleHelpLines(lines: string[], article: GrcArticleLink | undefined, maxLines = 20): string[] {
  if (!article) return lines.slice(0, maxLines);
  return [...lines, ...articleHelpLines(article)].slice(0, maxLines);
}
