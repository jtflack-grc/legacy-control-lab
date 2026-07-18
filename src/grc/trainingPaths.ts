import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

export type TrainingPath = {
  id: string;
  label: string;
  description: string;
  articleIds: string[];
};

export type TrainingPathsFile = {
  version: string;
  featured: string[];
  paths: TrainingPath[];
};

const PATHS_FILE = join(process.cwd(), "data", "grc-corpus", "training-paths.json");

let cached: TrainingPathsFile | undefined;

export function loadTrainingPaths(): TrainingPathsFile {
  if (cached) return cached;
  if (!existsSync(PATHS_FILE)) {
    cached = { version: "1.0.0", featured: [], paths: [] };
    return cached;
  }
  cached = JSON.parse(readFileSync(PATHS_FILE, "utf8")) as TrainingPathsFile;
  return cached;
}

export function resetTrainingPathsCache(): void {
  cached = undefined;
}
