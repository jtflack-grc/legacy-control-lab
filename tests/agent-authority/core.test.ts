import { afterEach, describe, expect, it } from "vitest";
import Database from "better-sqlite3";
import { canonicalize } from "../../src/agent-authority/canonicalize.js";
import { buildCanonicalAction, fingerprint } from "../../src/agent-authority/fingerprint.js";
import { authorityToolRegistry } from "../../src/agent-authority/toolRegistry.js";
import { evaluatePolicy } from "../../src/agent-authority/policy/policyEngine.js";
import { loadPolicy, validatePolicy } from "../../src/agent-authority/policy/policyLoader.js";
import { closeDatabase, getSchemaSql, initTestDatabase } from "../../src/db/sqlite.js";
import { createReceipt } from "../../src/agent-authority/evidence/receiptIntegrity.js";
import { verifyReceiptChain } from "../../src/agent-authority/evidence/receiptVerifier.js";
import {
  approveProposal, consumeBoundApproval, denyProposal, expireProposal, getProposal,
  insertApproval, insertProposal, invalidateProposal,
} from "../../src/db/repositories/agentAuthorityRepository.js";
import type { Clock, IdGenerator } from "../../src/agent-authority/types.js";
import { applySchemaMigrations } from "../../src/db/migrations.js";

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
    expect(() => canonicalize(-0)).toThrow(/negative zero/);
    expect(() => canonicalize(new Date())).toThrow(/plain JSON objects/);
    expect(() => canonicalize(new Map())).toThrow(/plain JSON objects/);
    expect(() => canonicalize(new Number(1))).toThrow(/plain JSON objects/);
  });
  it("matches the RFC 8785 Unicode property sorting vector", () => {
    const input = { "\u20ac":"Euro Sign", "\r":"Carriage Return", "\ufb33":"Hebrew Letter Dalet With Dagesh",
      "1":"One", "\ud83d\ude00":"Emoji: Grinning Face", "\u0080":"Control", "\u00f6":"Latin Small Letter O With Diaeresis" };
    expect(canonicalize(input)).toBe('{"\\r":"Carriage Return","1":"One","":"Control","ö":"Latin Small Letter O With Diaeresis","€":"Euro Sign","😀":"Emoji: Grinning Face","דּ":"Hebrew Letter Dalet With Dagesh"}');
  });
  it("rejects lone surrogates in values and property names", () => {
    expect(() => canonicalize("\ud800")).toThrow(/lone surrogate/);
    expect(() => canonicalize("\udc00")).toThrow(/lone surrogate/);
    expect(() => canonicalize({ ["bad\ud800"]: true })).toThrow(/lone surrogate/);
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
  const proposal = (overrides: Record<string, unknown> = {}) => ({
    id:"prop_1",createdAt:"2026-08-16T12:00:00.000Z",expiresAt:"2026-08-16T12:05:00.000Z",status:"pending" as const,
    targetKind:"lcl" as const,targetSystem:"CLAIMS400",toolName:"grant_object_authority",toolVersion:"1",riskClass:"privilege_change" as const,
    argumentsJson:'{"authority":"*USE"}',canonicalActionJson:'{"schema_version":"1"}',actionHash:"sha256:action",
    policyId:"policy",policyVersion:"1",policyDecisionJson:'{"decision":"require_approval"}',
    preconditionJson:'{"authority":"*CHANGE"}',preconditionHash:"sha256:state",requestContextJson:'{"actorType":"agent"}', ...overrides,
  });
  const approval = (overrides: Record<string, unknown> = {}) => ({
    id:"apr_1",proposalId:"prop_1",actionHash:"sha256:action",approverUser:"QSECOFR",
    issuedAt:"2026-08-16T12:01:00.000Z",expiresAt:"2026-08-16T12:05:00.000Z",nonce:"unique",status:"active" as const, ...overrides,
  });
  it("allows only legal pending decisions and compare-and-swap approval", () => {
    const db=initTestDatabase(); insertProposal(db,proposal());
    expect(approveProposal(db,"prop_1","2026-08-16T12:01:00.000Z","QSECOFR")).toBe(true);
    expect(denyProposal(db,"prop_1","2026-08-16T12:02:00.000Z","QSECOFR")).toBe(false);
    expect(getProposal(db,"prop_1")?.status).toBe("approved");
  });
  it.each(["denied","expired","invalidated"] as const)("rejects %s to approved", (terminal) => {
    const db=initTestDatabase(); insertProposal(db,proposal());
    const decide = terminal === "denied" ? () => denyProposal(db,"prop_1","2026-08-16T12:01:00.000Z","QSECOFR")
      : terminal === "expired" ? () => expireProposal(db,"prop_1","2026-08-16T12:06:00.000Z")
      : () => invalidateProposal(db,"prop_1","2026-08-16T12:01:00.000Z");
    expect(decide()).toBe(true);
    expect(approveProposal(db,"prop_1","2026-08-16T12:02:00.000Z","QSECOFR")).toBe(false);
    expect(getProposal(db,"prop_1")?.status).toBe(terminal);
  });
  it("rejects approval after proposal expiry", () => {
    const db=initTestDatabase(); insertProposal(db,proposal());
    expect(approveProposal(db,"prop_1","2026-08-16T12:05:00.000Z","QSECOFR")).toBe(false);
  });
  it("rejects consumption while pending and leaves both records unchanged", () => {
    const db=initTestDatabase(); insertProposal(db,proposal()); insertApproval(db,approval());
    expect(consumeBoundApproval(db,"prop_1","sha256:action","2026-08-16T12:02:00.000Z")).toBe(false);
    expect(getProposal(db,"prop_1")?.status).toBe("pending");
    expect((db.prepare("SELECT status FROM agent_authority_approvals WHERE id='apr_1'").get() as {status:string}).status).toBe("active");
  });
  it("atomically binds and consumes proposal and approval exactly once", () => {
    const db=initTestDatabase(); insertProposal(db,proposal());
    expect(approveProposal(db,"prop_1","2026-08-16T12:01:00.000Z","QSECOFR")).toBe(true);
    insertApproval(db,approval());
    expect(consumeBoundApproval(db,"prop_1","sha256:other","2026-08-16T12:02:00.000Z")).toBe(false);
    expect(consumeBoundApproval(db,"prop_1","sha256:action","2026-08-16T12:02:00.000Z")).toBe(true);
    expect(consumeBoundApproval(db,"prop_1","sha256:action","2026-08-16T12:03:00.000Z")).toBe(false);
    expect(getProposal(db,"prop_1")?.status).toBe("consumed");
    expect(approveProposal(db,"prop_1","2026-08-16T12:03:00.000Z","QSECOFR")).toBe(false);
    expect(expireProposal(db,"prop_1","2026-08-16T12:03:00.000Z")).toBe(false);
  });
  it("rejects expired approval consumption", () => {
    const db=initTestDatabase(); insertProposal(db,proposal()); approveProposal(db,"prop_1","2026-08-16T12:01:00.000Z","QSECOFR");
    insertApproval(db,approval({expiresAt:"2026-08-16T12:02:00.000Z"}));
    expect(consumeBoundApproval(db,"prop_1","sha256:action","2026-08-16T12:02:00.000Z")).toBe(false);
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

describe("receipt integrity metadata and structure", () => {
  const setup = () => {
    const db=initTestDatabase(); const clock:Clock={now:()=>new Date("2026-08-16T12:00:00.000Z")};
    let n=0; const ids:IdGenerator={id:(p)=>`${p}_${++n}`,nonce:()=>`nonce_${n}`};
    insertProposal(db, {
      id:"prop_1",createdAt:"2026-08-16T11:59:00.000Z",expiresAt:"2026-08-16T12:05:00.000Z",status:"pending",
      targetKind:"lcl",targetSystem:"CLAIMS400",toolName:"grant_object_authority",toolVersion:"1",riskClass:"privilege_change",
      argumentsJson:"{}",canonicalActionJson:"{}",actionHash:"sha256:action",policyId:"p",policyVersion:"1",
      policyDecisionJson:"{}",preconditionJson:"{}",preconditionHash:"sha256:state",requestContextJson:"{}",
    });
    createReceipt(db,{clock,ids},{type:"one",payload:{event:"requested"},proposalId:"prop_1"});
    createReceipt(db,{clock,ids},{type:"two",payload:{event:"approved"},proposalId:"prop_1"});
    createReceipt(db,{clock,ids},{type:"three",payload:{event:"executed"},proposalId:"prop_1"});
    expect(verifyReceiptChain(db).ok).toBe(true); return db;
  };
  it.each([
    ["receipt ID", "UPDATE agent_authority_receipts SET id='changed-id' WHERE sequence=2"],
    ["receipt type", "UPDATE agent_authority_receipts SET receipt_type='changed' WHERE sequence=2"],
    ["proposal ID", "UPDATE agent_authority_receipts SET proposal_id=NULL WHERE sequence=2"],
    ["created timestamp", "UPDATE agent_authority_receipts SET created_at='2026-08-16T12:00:01.000Z' WHERE sequence=2"],
    ["payload", "UPDATE agent_authority_receipts SET payload_json='{\"event\":\"tampered\"}' WHERE sequence=2"],
  ])("detects direct %s tampering", (_label, sql) => {
    const db=setup(); db.exec(sql); expect(verifyReceiptChain(db).ok).toBe(false);
  });
  it("detects receipt deletion", () => {
    const db=setup(); db.exec("DELETE FROM agent_authority_receipts WHERE sequence=2"); expect(verifyReceiptChain(db).ok).toBe(false);
  });
  it("detects insertion and sequence/order tampering", () => {
    const db=setup();
    db.exec(`INSERT INTO agent_authority_receipts(id,sequence,created_at,receipt_type,payload_json,payload_hash)
      VALUES ('inserted',4,'2026-08-16T12:00:00.000Z','inserted','{}','sha256:fake')`);
    expect(verifyReceiptChain(db).ok).toBe(false);
    db.exec("UPDATE agent_authority_receipts SET sequence=10 WHERE id='inserted'");
    expect(verifyReceiptChain(db).ok).toBe(false);
  });
  it("detects reordering of existing receipts", () => {
    const db=setup();
    db.exec("UPDATE agent_authority_receipts SET sequence=-1 WHERE sequence=1; UPDATE agent_authority_receipts SET sequence=1 WHERE sequence=2; UPDATE agent_authority_receipts SET sequence=2 WHERE sequence=-1");
    expect(verifyReceiptChain(db).ok).toBe(false);
  });
  it("fails when chain state is missing or inconsistent", () => {
    const db=setup(); db.exec("DELETE FROM agent_authority_chain_state WHERE chain_id='default'");
    expect(verifyReceiptChain(db).errors).toContain("chain state is missing while receipts exist");
    db.exec("INSERT INTO agent_authority_chain_state VALUES ('default',99,'sha256:wrong','2026-08-16T12:00:00.000Z')");
    expect(verifyReceiptChain(db).errors).toContain("chain state does not match reconstructed head");
  });
});

describe("Agent Authority additive migrations", () => {
  it("creates required tables on an existing database shape and is idempotent", () => {
    const db = new Database(":memory:"); db.pragma("foreign_keys = ON");
    db.exec(getSchemaSql());
    db.exec(`DROP TABLE agent_authority_approvals; DROP TABLE agent_authority_receipts;
      DROP TABLE agent_authority_chain_state; DROP TABLE agent_authority_proposals;`);
    applySchemaMigrations(db); applySchemaMigrations(db);
    const names = (db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name LIKE 'agent_authority_%' ORDER BY name").all() as {name:string}[]).map((r)=>r.name);
    expect(names).toEqual(["agent_authority_approvals","agent_authority_chain_state","agent_authority_proposals","agent_authority_receipts"]);
    db.close();
  });
});
