import { afterEach, describe, expect, it } from "vitest";
import { canonicalize } from "../../src/agent-authority/canonicalize.js";
import { buildCanonicalAction, fingerprint } from "../../src/agent-authority/fingerprint.js";
import { authorityToolRegistry } from "../../src/agent-authority/toolRegistry.js";
import { evaluatePolicy } from "../../src/agent-authority/policy/policyEngine.js";
import { loadPolicy, validatePolicy } from "../../src/agent-authority/policy/policyLoader.js";
import { closeDatabase, initTestDatabase } from "../../src/db/sqlite.js";
import { createReceipt } from "../../src/agent-authority/evidence/receiptIntegrity.js";
import { verifyReceiptChain } from "../../src/agent-authority/evidence/receiptVerifier.js";
import {
  consumeApproval, getProposal, insertApproval, insertProposal, transitionProposal,
} from "../../src/db/repositories/agentAuthorityRepository.js";
import type { Clock, IdGenerator } from "../../src/agent-authority/types.js";

afterEach(() => closeDatabase());

describe("RFC 8785 canonicalization and action identity", () => {
  it("matches the RFC primitive serialization example", () => {
    const input = { numbers: [333333333.33333329, 1e30, 4.5, 0.002, 1e-27], literals: [null, true, false] };
    expect(canonicalize(input)).toBe('{"literals":[null,true,false],"numbers":[333333333.3333333,1e+30,4.5,0.002,1e-27]}');
  });
  it("sorts object properties recursively and rejects non-JSON values", () => {
    expect(canonicalize({ z: 1, a: { y: 2, x: 3 } })).toBe('{"a":{"x":3,"y":2},"z":1}');
    expect(() => canonicalize({ unsafe: Number.NaN })).toThrow(/non-finite/);
    expect(() => canonicalize({ missing: undefined })).toThrow(/valid JSON/);
  });
  it("produces the same hash for semantically identical normalized actions", () => {
    const tool = authorityToolRegistry.require("grant_object_authority");
    const first = tool.normalizeArguments({ user:" apclerk ", object:"paymst", authority:"*use", library:" payroll" });
    const second = tool.normalizeArguments({ library:"PAYROLL", object:"PAYMST", user:"APCLERK", authority:"*USE" });
    const make = (args: Record<string, unknown>) => fingerprint(buildCanonicalAction({ targetKind:"lcl", targetSystem:"claims400", toolName:tool.name, toolVersion:tool.version, arguments:args }));
    expect(make(first)).toEqual(make(second));
  });
  it("rejects unknown tools and fields instead of widening capability", () => {
    expect(() => authorityToolRegistry.require("execute_sql")).toThrow("UNKNOWN_TOOL");
    expect(() => authorityToolRegistry.require("grant_object_authority").normalizeArguments({library:"PAYROLL",object:"PAYMST",user:"APCLERK",authority:"*USE",command:"QCMDEXC"})).toThrow(/unknown argument/);
  });
});

describe("deterministic policy", () => {
  it("loads the checked-in policy and applies expected first behavior", () => {
    const policy = loadPolicy("data/agent-authority/policy.v1.json");
    expect(evaluatePolicy(policy, "observe").decision).toBe("allow");
    expect(evaluatePolicy(policy, "privilege_change")).toMatchObject({ decision:"require_approval", approvalRole:"operator" });
    expect(evaluatePolicy(policy, "configuration_change").decision).toBe("deny");
  });
  it("gives deny precedence and records every matched rule", () => {
    const policy = validatePolicy({ schemaVersion:"1",policyId:"p",version:"1",defaultDecision:"deny",rules:[
      {id:"ALLOW",priority:999,when:{riskClass:["observe"]},decision:"allow"},
      {id:"DENY",priority:1,when:{riskClass:["observe"]},decision:"deny"},
    ]});
    expect(evaluatePolicy(policy,"observe")).toMatchObject({decision:"deny",matchedRuleIds:["ALLOW","DENY"]});
  });
  it("fails closed on malformed policy", () => {
    expect(() => validatePolicy({schemaVersion:"1",policyId:"p",version:"1",defaultDecision:"allow",rules:[]})).toThrow("POLICY_UNAVAILABLE");
    expect(() => loadPolicy("does-not-exist.json")).toThrow("POLICY_UNAVAILABLE");
  });
});

describe("proposal, approval, and receipt persistence", () => {
  const proposal = () => ({
    id:"prop_1",createdAt:"2026-08-16T12:00:00.000Z",expiresAt:"2026-08-16T12:05:00.000Z",status:"pending" as const,
    targetKind:"lcl" as const,targetSystem:"CLAIMS400",toolName:"grant_object_authority",toolVersion:"1",riskClass:"privilege_change" as const,
    argumentsJson:'{"authority":"*USE"}',canonicalActionJson:'{"schema_version":"1"}',actionHash:"sha256:action",
    policyId:"policy",policyVersion:"1",policyDecisionJson:'{"decision":"require_approval"}',
    preconditionJson:'{"authority":"*CHANGE"}',preconditionHash:"sha256:state",requestContextJson:'{"actorType":"agent"}',
  });
  it("uses compare-and-swap transitions", () => {
    const db=initTestDatabase(); insertProposal(db,proposal());
    expect(transitionProposal(db,{id:"prop_1",from:"pending",to:"approved",now:"2026-08-16T12:01:00.000Z",decidedBy:"QSECOFR"})).toBe(true);
    expect(transitionProposal(db,{id:"prop_1",from:"pending",to:"denied",now:"2026-08-16T12:02:00.000Z"})).toBe(false);
    expect(getProposal(db,"prop_1")?.status).toBe("approved");
  });
  it("binds one approval to one hash and consumes it once before expiry", () => {
    const db=initTestDatabase(); insertProposal(db,proposal());
    insertApproval(db,{id:"apr_1",proposalId:"prop_1",actionHash:"sha256:action",approverUser:"QSECOFR",issuedAt:"2026-08-16T12:01:00.000Z",expiresAt:"2026-08-16T12:05:00.000Z",nonce:"unique",status:"active"});
    expect(consumeApproval(db,"prop_1","sha256:other","2026-08-16T12:02:00.000Z")).toBe(false);
    expect(consumeApproval(db,"prop_1","sha256:action","2026-08-16T12:02:00.000Z")).toBe(true);
    expect(consumeApproval(db,"prop_1","sha256:action","2026-08-16T12:03:00.000Z")).toBe(false);
  });
  it("detects receipt payload tampering and chain-head inconsistency", () => {
    const db=initTestDatabase(); const clock:Clock={now:()=>new Date("2026-08-16T12:00:00.000Z")};
    let n=0; const ids:IdGenerator={id:(p)=>`${p}_${++n}`,nonce:()=>`nonce_${n}`};
    createReceipt(db,{clock,ids},{type:"one",payload:{event:"requested"}});
    createReceipt(db,{clock,ids},{type:"two",payload:{event:"approved"}});
    createReceipt(db,{clock,ids},{type:"three",payload:{event:"executed"}});
    expect(verifyReceiptChain(db)).toMatchObject({ok:true,checked:3});
    db.prepare("UPDATE agent_authority_receipts SET payload_json=? WHERE sequence=2").run('{"event":"tampered"}');
    expect(verifyReceiptChain(db)).toMatchObject({ok:false,checked:3});
    expect(verifyReceiptChain(db).errors.join(" ")).toContain("sequence 2: payload hash mismatch");
  });
});
