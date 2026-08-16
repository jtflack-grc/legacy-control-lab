import type { PolicyDecision, RiskClass } from "../types.js";

export type PolicyRule = {
  id: string; priority: number; when: { riskClass: RiskClass[] };
  decision: PolicyDecision; approvalRole?: "operator";
};
export type AuthorityPolicy = {
  schemaVersion: "1"; policyId: string; version: string;
  defaultDecision: "deny"; rules: PolicyRule[];
};
export type PolicyEvaluation = {
  policyId: string; policyVersion: string; decision: PolicyDecision;
  matchedRuleIds: string[]; approvalRole?: "operator";
};
