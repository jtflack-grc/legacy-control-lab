import fs from "node:fs";
import path from "node:path";

/** A = mission hand-built panels; B = catalog engine; C = message-only / deferred */
export type ScreenLayoutTier = "A" | "B" | "C";

export type ScreenVerificationStatus =
  | "verified"
  | "layout-audited"
  | "needs-golden"
  | "catalog-factory"
  | "deferred";

export type ScreenFieldRule = {
  id?: string;
  row?: number;
  col?: number;
  valueContains?: string;
  valueMatches?: string;
};

export type FunctionKeyEntry = { key: string; label: string };

/** Exact row-24 PF line string or structured PF list. */
export type FunctionKeyLayoutSpec = string | FunctionKeyEntry[];

export type OptionLineRule = {
  row: number;
  col?: number;
  valueContains?: string;
};

export type AttributeRule = {
  fieldId: string;
  row: number;
  col: number;
  attrByte: number;
};

export type CommandLineRule = {
  row: number;
  label?: string;
};

export type PromptVariant = "subfile" | "detail" | "cmdprompt" | "menu";

export type SubfileLayoutRule = {
  maxVisibleRows: number;
  firstDataRow: number;
  lastDataRow: number;
  commandLineRow: number;
  optionIdPattern?: string;
  pagingKeys?: string[];
};

export type ScreenLayoutSpec = {
  screenId: string;
  tier: ScreenLayoutTier;
  verificationStatus: ScreenVerificationStatus;
  /** How this spec was produced — e.g. ibm-i-7.4-partition, stakeholder-review */
  referenceSource?: string;
  requiredFields?: string[];
  bannedSubstrings?: string[];
  requiredText?: string[];
  forbiddenText?: string[];
  fieldRules?: ScreenFieldRule[];
  subfile?: SubfileLayoutRule;
  functionKeys?: FunctionKeyLayoutSpec;
  optionLine?: OptionLineRule;
  attributeRules?: AttributeRule[];
  commandLine?: CommandLineRule;
  promptVariant?: PromptVariant;
  /** Command routed through catalog runtime, or a named sample factory */
  render:
    | { type: "command"; command: string; user?: string }
    | { type: "sample"; sample: string };
  /** When false, golden reference is captured but CI layout audit skips until implementation catches up. */
  enforceInCi?: boolean;
  goldenFile?: string;
  notes?: string;
};

export type ScreenInventoryEntry = {
  screenId: string;
  command: string;
  menuPath?: string;
  tier: ScreenLayoutTier;
  verificationStatus: ScreenVerificationStatus;
  specFile?: string;
  goldenFile?: string;
  notes?: string;
  fidelityScore?: FidelityScorecard;
};

/** Per-dimension fidelity scorecard (0–5) — see docs/aaa-fidelity-roadmap.md Phase 1. */
export type FidelityScorecard = {
  layout: number;
  colors: number;
  pfKeys: number;
  options: number;
  sources: number;
};

export type ScreenInventory = {
  updatedAt: string;
  description: string;
  entries: ScreenInventoryEntry[];
};

const specsDir = path.join(process.cwd(), "data", "screen-specs");

export function loadScreenLayoutSpecs(): ScreenLayoutSpec[] {
  if (!fs.existsSync(specsDir)) return [];
  return fs
    .readdirSync(specsDir)
    .filter((name) => name.endsWith(".layout.json"))
    .map((name) => JSON.parse(fs.readFileSync(path.join(specsDir, name), "utf8")) as ScreenLayoutSpec)
    .sort((a, b) => a.screenId.localeCompare(b.screenId));
}

export function loadScreenInventory(): ScreenInventory {
  const file = path.join(specsDir, "inventory.json");
  return JSON.parse(fs.readFileSync(file, "utf8")) as ScreenInventory;
}
