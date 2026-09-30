import { readFileSync } from "node:fs";
import type { AuthorityPolicy, PolicyRule } from "./types.js";
import type { PolicyDecision, RiskClass } from "../types.js";

const risks = new Set<RiskClass>(["observe", "privilege_change", "configuration_change", "operational_change", "destructive"]);
const decisions = new Set<PolicyDecision>(["allow", "require_approval", "deny"]);

export function loadPolicy(path: string): AuthorityPolicy {
  let parsed: unknown;
  try { parsed = JSON.parse(readFileSync(path, "utf8")); }
  catch (error) { throw new Error(`POLICY_UNAVAILABLE: ${error instanceof Error ? error.message : String(error)}`); }
  return validatePolicy(parsed);
}

export function validatePolicy(input: unknown): AuthorityPolicy {
  if (!input || typeof input !== "object" || Array.isArray(input)) throw invalid("policy must be an object");
  const p = input as Record<string, unknown>;
  if (p.schemaVersion !== "1" || typeof p.policyId !== "string" || !p.policyId || typeof p.version !== "string" || !p.version) throw invalid("identity fields are invalid");
  if (p.defaultDecision !== "deny") throw invalid("defaultDecision must be deny");
  if (!Array.isArray(p.rules) || p.rules.length === 0) throw invalid("rules must be non-empty");
  const ids = new Set<string>();
  const rules = p.rules.map((entry, index) => validateRule(entry, index, ids));
  return { schemaVersion: "1", policyId: p.policyId, version: p.version, defaultDecision: "deny", rules };
}

function validateRule(input: unknown, index: number, ids: Set<string>): PolicyRule {
  if (!input || typeof input !== "object" || Array.isArray(input)) throw invalid(`rule ${index} must be an object`);
  const r = input as Record<string, unknown>;
  if (typeof r.id !== "string" || !r.id || ids.has(r.id)) throw invalid(`rule ${index} has invalid/duplicate id`);
  ids.add(r.id);
  if (!Number.isSafeInteger(r.priority)) throw invalid(`rule ${r.id} priority is invalid`);
  if (!decisions.has(r.decision as PolicyDecision)) throw invalid(`rule ${r.id} decision is invalid`);
  const when = r.when as Record<string, unknown> | undefined;
  if (!when || !Array.isArray(when.riskClass) || !when.riskClass.length || !when.riskClass.every((v) => risks.has(v as RiskClass))) throw invalid(`rule ${r.id} riskClass is invalid`);
  if (r.decision === "require_approval" && r.approvalRole !== "operator") throw invalid(`rule ${r.id} requires operator approvalRole`);
  return { id: r.id, priority: r.priority as number, when: { riskClass: [...when.riskClass] as RiskClass[] }, decision: r.decision as PolicyDecision,
    ...(r.approvalRole === "operator" ? { approvalRole: "operator" as const } : {}) };
}
function invalid(message: string): Error { return new Error(`POLICY_UNAVAILABLE: ${message}`); }
