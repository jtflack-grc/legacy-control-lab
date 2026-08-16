import type { RiskClass } from "../types.js";
import type { AuthorityPolicy, PolicyEvaluation, PolicyRule } from "./types.js";

const precedence = { deny: 3, require_approval: 2, allow: 1 } as const;
export function evaluatePolicy(policy: AuthorityPolicy, riskClass: RiskClass): PolicyEvaluation {
  const matches = policy.rules.filter((rule) => rule.when.riskClass.includes(riskClass));
  const winner = [...matches].sort(compare)[0];
  return {
    policyId: policy.policyId, policyVersion: policy.version,
    decision: winner?.decision ?? policy.defaultDecision,
    matchedRuleIds: matches.sort((a, b) => b.priority - a.priority || a.id.localeCompare(b.id)).map((r) => r.id),
    ...(winner?.approvalRole ? { approvalRole: winner.approvalRole } : {}),
  };
}
function compare(a: PolicyRule, b: PolicyRule): number {
  return precedence[b.decision] - precedence[a.decision] || b.priority - a.priority || a.id.localeCompare(b.id);
}
