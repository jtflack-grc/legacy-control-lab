import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

export type GuidedPathStep = {
  id: string;
  label: string;
  command: string;
  coach: string;
};

export type GuidedPath = {
  id: string;
  articleId: string;
  label: string;
  intro: string;
  steps: GuidedPathStep[];
};

export type GuidedPathsFile = {
  version: string;
  paths: GuidedPath[];
};

const PATHS_FILE = join(process.cwd(), "data", "grc-corpus", "guided-paths.json");

let cached: GuidedPathsFile | undefined;

export function loadGuidedPaths(): GuidedPathsFile {
  if (cached) return cached;
  if (!existsSync(PATHS_FILE)) {
    cached = { version: "1.0.0", paths: [] };
    return cached;
  }
  cached = JSON.parse(readFileSync(PATHS_FILE, "utf8")) as GuidedPathsFile;
  return cached;
}

export function getGuidedPathForArticle(articleId: string): GuidedPath | undefined {
  return loadGuidedPaths().paths.find((row) => row.articleId === articleId);
}

export function resetGuidedPathsCache(): void {
  cached = undefined;
}
