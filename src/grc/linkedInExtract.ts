/** Extract readable article text from LinkedIn Pulse HTML (guest/unauthenticated fetch). */

function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ");
}

export function isLinkedInHtmlDump(text: string): boolean {
  const sample = text.slice(0, 800).toLowerCase();
  return sample.includes("<!doctype html") || sample.includes("<html");
}

export function isLinkedInPulsePage(html: string): boolean {
  return (
    html.includes("d_flagship2_pulse_read") ||
    html.includes("article-ssr-frontend") ||
    html.includes('data-test-id="article-content-blocks"')
  );
}

function metaContent(html: string, name: string): string | undefined {
  const pattern = new RegExp(
    `<meta\\s+(?:name|property)="${name}"\\s+content="([^"]*)"`,
    "i",
  );
  const match = html.match(pattern);
  return match?.[1] ? decodeHtmlEntities(match[1].trim()) : undefined;
}

function jsonLdArticle(html: string): { headline?: string; body?: string } {
  const scripts = html.matchAll(
    /<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi,
  );
  for (const script of scripts) {
    try {
      const parsed = JSON.parse(script[1] ?? "") as Record<string, unknown>;
      if (parsed["@type"] !== "Article") continue;
      const headline =
        typeof parsed.headline === "string"
          ? decodeHtmlEntities(parsed.headline.trim())
          : undefined;
      const body =
        typeof parsed.articleBody === "string"
          ? decodeHtmlEntities(parsed.articleBody.trim())
          : undefined;
      return { headline, body };
    } catch {
      /* try next script block */
    }
  }
  return {};
}

function publishingBlocks(html: string): string[] {
  const blocks: string[] = [];
  const pattern = /<div class="article-main__content"[\s\S]*?<\/div>/gi;
  for (const block of html.matchAll(pattern)) {
    const inner = block[0] ?? "";
    for (const span of inner.matchAll(/<span[^>]*>([\s\S]*?)<\/span>/gi)) {
      const text = decodeHtmlEntities(span[1].replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim());
      if (text.length > 2 && text !== "." && text !== ". ." && text !== "...") {
        blocks.push(text);
      }
    }
  }
  return blocks;
}

export function extractArticleTextFromLinkedInHtml(html: string, title?: string): string {
  if (!html.trim()) return "";

  const jsonLd = jsonLdArticle(html);
  const blocks = publishingBlocks(html);
  if (blocks.length > 0) {
    const sections: string[] = [];
    if (title?.trim()) sections.push(`# ${title.trim()}`);
    if (jsonLd.headline && !blocks[0]?.includes(jsonLd.headline.slice(0, 40))) {
      sections.push(jsonLd.headline);
    }
    sections.push(...blocks);
    return sections.join("\n\n").trim();
  }

  if (jsonLd.body && jsonLd.body.length > 120) {
    return [title ? `# ${title}` : "", jsonLd.headline ?? "", jsonLd.body].filter(Boolean).join("\n\n").trim();
  }

  const description =
    metaContent(html, "og:description") ??
    metaContent(html, "description") ??
    jsonLd.headline ??
    "";
  if (description.length > 40) {
    return [title ? `# ${title}` : "", description].filter(Boolean).join("\n\n").trim();
  }

  return "";
}

export function sanitizeCorpusExcerpt(text: string): string {
  if (!text.trim()) return "";
  if (isLinkedInHtmlDump(text)) {
    const extracted = extractArticleTextFromLinkedInHtml(text);
    if (extracted.length > 40) return extracted.slice(0, 420);
    return "";
  }
  return text
    .replace(/<[^>]+>/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 420);
}
