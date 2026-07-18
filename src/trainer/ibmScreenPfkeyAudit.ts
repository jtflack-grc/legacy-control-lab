import type { FunctionKeyLayoutSpec, ScreenLayoutSpec, ScreenLayoutTier } from "../ibm74/screenLayoutSpec.js";
import { loadScreenLayoutSpecs } from "../ibm74/screenLayoutSpec.js";
import { loadGoldenReference } from "../ibm74/goldenReferenceService.js";
import { renderScreenForLayoutSpec } from "./ibmScreenLayoutAudit.js";
import type { ScreenFidelityResult } from "./screenFidelityAudit.js";

const PF_KEY_PATTERN = /F\d{1,2}=[^F\n]*(?=F\d{1,2}=|$)/g;

function pfKeyMatches(rendered: string, token: string): boolean {
  const normalized = token.trim().replace(/\s+/g, " ");
  if (rendered.includes(normalized)) return true;
  const keyPrefix = normalized.match(/^(F\d{1,2}=)/)?.[1];
  return keyPrefix ? rendered.includes(keyPrefix) : false;
}

/** Extract PF key tokens like "F3=Exit" from text lines. */
export function extractPfKeySubstrings(texts: string[]): string[] {
  const keys = new Set<string>();
  for (const text of texts) {
    const matches = text.match(PF_KEY_PATTERN);
    if (matches) {
      for (const match of matches) {
        keys.add(match.trim().replace(/\s+/g, " "));
      }
    }
  }
  return [...keys].sort();
}

export function expectedPfKeysFromLayout(functionKeys: FunctionKeyLayoutSpec): string[] {
  if (typeof functionKeys === "string") {
    return extractPfKeySubstrings([functionKeys]);
  }
  return functionKeys.map(({ key, label }) => `${key}=${label}`.trim());
}

export function expectedPfKeysForSpec(spec: ScreenLayoutSpec): string[] {
  if (spec.functionKeys) {
    return expectedPfKeysFromLayout(spec.functionKeys);
  }
  const golden = loadGoldenReference(spec.screenId);
  const fromGolden = extractPfKeySubstrings([
    ...(golden?.requiredText ?? []),
    golden?.asciiPanel ?? "",
  ]);
  return fromGolden;
}

export function auditScreenPfKeys(
  spec: ScreenLayoutSpec,
  screen: { fields: Array<{ id: string; row: number; value?: string }> },
): ScreenFidelityResult {
  const id = spec.screenId.toLowerCase();
  const title = `${spec.screenId} PF keys`;

  try {
    const expected = expectedPfKeysForSpec(spec);
    if (expected.length === 0) {
      return { id, title, pass: true, detail: "no PF key expectations (skipped)" };
    }

    const fkeys = screen.fields.find((field) => field.id === "FKEYS");
    if (!fkeys?.value) {
      throw new Error("Missing FKEYS field on rendered screen");
    }

    const rendered = fkeys.value.replace(/\s+/g, " ");
    const missing = expected.filter((token) => !pfKeyMatches(rendered, token));
    if (missing.length > 0) {
      throw new Error(`PF line missing: ${missing.join(", ")}`);
    }

    return { id, title, pass: true };
  } catch (err) {
    return {
      id,
      title,
      pass: false,
      detail: err instanceof Error ? err.message : String(err),
    };
  }
}

export function runIbmScreenPfkeyAudit(tiers: ScreenLayoutTier[] = ["A"]): ScreenFidelityResult[] {
  const allowed = new Set(tiers);
  const results: ScreenFidelityResult[] = [];

  for (const spec of loadScreenLayoutSpecs()) {
    if (!allowed.has(spec.tier)) continue;
    if (spec.enforceInCi === false) continue;

    try {
      const screen = renderScreenForLayoutSpec(spec);
      results.push(auditScreenPfKeys(spec, screen));
    } catch (err) {
      results.push({
        id: spec.screenId.toLowerCase(),
        title: `${spec.screenId} PF keys`,
        pass: false,
        detail: err instanceof Error ? err.message : String(err),
      });
    }
  }

  return results;
}

export function formatIbmScreenPfkeyReport(results: ScreenFidelityResult[]): string {
  const audited = results.filter((result) => result.detail !== "no PF key expectations (skipped)");
  const pass = audited.filter((result) => result.pass).length;
  const fail = audited.length - pass;
  const skipped = results.length - audited.length;
  const lines = [
    "IBM i Screen PF Key Audit",
    new Date().toISOString(),
    `PASS ${pass} · FAIL ${fail} · SKIPPED ${skipped} · TOTAL ${results.length}`,
    "",
  ];
  for (const result of results) {
    if (result.detail === "no PF key expectations (skipped)") continue;
    lines.push(`${result.pass ? "PASS" : "FAIL"}  [${result.id}] ${result.title}`);
    if (result.detail && result.detail !== "no PF key expectations (skipped)") {
      lines.push(`       ${result.detail}`);
    }
  }
  return lines.join("\n");
}
