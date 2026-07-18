import fs from "node:fs";
import path from "node:path";

export type GoldenReferenceSource = {
  title: string;
  url: string;
  type: string;
  tier?: "A" | "B" | "C";
};

export type GoldenScreenReference = {
  screenId: string;
  primarySource: string;
  sources: GoldenReferenceSource[];
  asciiPanel?: string;
  requiredText?: string[];
  columnHeaders?: string[];
  commandLineLabel?: string;
  functionKeys?: string;
  ddsRows?: Record<string, unknown>;
  notes?: string;
};

const goldenDir = path.join(process.cwd(), "data", "screen-specs", "golden");

export function loadGoldenReferences(): GoldenScreenReference[] {
  if (!fs.existsSync(goldenDir)) return [];
  return fs
    .readdirSync(goldenDir)
    .filter((name) => name.endsWith(".golden.json"))
    .map((name) => JSON.parse(fs.readFileSync(path.join(goldenDir, name), "utf8")) as GoldenScreenReference)
    .sort((a, b) => a.screenId.localeCompare(b.screenId));
}

export function loadGoldenReference(screenId: string): GoldenScreenReference | undefined {
  return loadGoldenReferences().find((ref) => ref.screenId === screenId);
}

export function formatGoldenReferenceReport(): string {
  const refs = loadGoldenReferences();
  const lines = [
    "IBM i golden screen references",
    `Captured: ${refs.length} screens`,
    "",
    "Screen        Primary source",
    "-".repeat(78),
  ];
  for (const ref of refs) {
    lines.push(`${ref.screenId.padEnd(13)} ${ref.primarySource}`);
  }
  lines.push("", "Full index: data/screen-specs/golden/README.md");
  return lines.join("\n");
}
