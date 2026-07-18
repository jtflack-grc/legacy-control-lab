import { IBM_5250_ATTR, resolve5250Attribute } from "../screen-runtime/ibm5250Attributes.js";
import type { ScreenLayoutSpec, ScreenLayoutTier } from "../ibm74/screenLayoutSpec.js";
import { loadScreenLayoutSpecs } from "../ibm74/screenLayoutSpec.js";
import { renderScreenForLayoutSpec } from "./ibmScreenLayoutAudit.js";
import type { ScreenFidelityResult } from "./screenFidelityAudit.js";

export { IBM_5250_ATTR };

export function auditScreenAttributes(
  spec: ScreenLayoutSpec,
  screen: { fields: Array<{ id: string; row: number; col: number; [key: string]: unknown }> },
): ScreenFidelityResult {
  const id = spec.screenId.toLowerCase();
  const title = `${spec.screenId} 5250 attributes`;
  const rules = spec.attributeRules ?? [];

  if (rules.length === 0) {
    return { id, title, pass: true, detail: "no attributeRules (skipped)" };
  }

  try {
    const fieldById = new Map(screen.fields.map((field) => [field.id, field]));

    for (const rule of rules) {
      const field = fieldById.get(rule.fieldId);
      if (!field) {
        throw new Error(`Missing field for attribute rule: ${rule.fieldId}`);
      }
      if (rule.row !== undefined && field.row !== rule.row) {
        throw new Error(`Field ${rule.fieldId} row ${field.row} !== ${rule.row}`);
      }
      if (rule.col !== undefined && field.col !== rule.col) {
        throw new Error(`Field ${rule.fieldId} col ${field.col} !== ${rule.col}`);
      }
      const actual = resolve5250Attribute(field as Parameters<typeof resolve5250Attribute>[0]);
      if (actual !== rule.attrByte) {
        throw new Error(
          `Field ${rule.fieldId} attr 0x${actual.toString(16)} !== expected 0x${rule.attrByte.toString(16)}`,
        );
      }
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

export function runIbmScreenAttributeAudit(
  tiers: ScreenLayoutTier[] = ["A"],
): ScreenFidelityResult[] {
  const allowed = new Set(tiers);
  const results: ScreenFidelityResult[] = [];

  for (const spec of loadScreenLayoutSpecs()) {
    if (!allowed.has(spec.tier)) continue;
    if (spec.enforceInCi === false) continue;
    if (!spec.attributeRules?.length) continue;

    try {
      const screen = renderScreenForLayoutSpec(spec);
      results.push(auditScreenAttributes(spec, screen));
    } catch (err) {
      results.push({
        id: spec.screenId.toLowerCase(),
        title: `${spec.screenId} 5250 attributes`,
        pass: false,
        detail: err instanceof Error ? err.message : String(err),
      });
    }
  }

  return results;
}

export function formatIbmScreenAttributeReport(results: ScreenFidelityResult[]): string {
  const pass = results.filter((result) => result.pass).length;
  const fail = results.length - pass;
  const lines = [
    "IBM i Screen Attribute Audit",
    new Date().toISOString(),
    `PASS ${pass} · FAIL ${fail} · TOTAL ${results.length}`,
    "",
  ];
  for (const result of results) {
    lines.push(`${result.pass ? "PASS" : "FAIL"}  [${result.id}] ${result.title}`);
    if (result.detail) lines.push(`       ${result.detail}`);
  }
  return lines.join("\n");
}
