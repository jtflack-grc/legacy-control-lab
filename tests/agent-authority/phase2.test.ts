import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { closeDatabase, getDatabase, initTestDatabase } from "../../src/db/sqlite.js";
import { loadPolicy } from "../../src/agent-authority/policy/policyLoader.js";
import { LclTargetAdapter } from "../../src/agent-authority/adapters/lclTargetAdapter.js";
import type { TargetAdapter, TargetMutationResult } from "../../src/agent-authority/adapters/targetAdapter.js";
import { AuthorityBroker } from "../../src/agent-authority/broker/authorityBroker.js";
import { OperatorApprovalService } from "../../src/agent-authority/broker/operatorApprovalService.js";
import type { ActionContext, CanonicalAction, Clock, IdGenerator } from "../../src/agent-authority/types.js";
import type { AuthorityPolicy } from "../../src/agent-authority/policy/types.js";
import { createSession, hydrateSessionFromProfile, type IbmiSession } from "../../src/ibmi-runtime/sessionService.js";
import { getObjectAuthorityDisplay, grantObjectAuthority } from "../../src/ibmi-runtime/authorityService.js";
import { getUserProfile } from "../../src/db/repositories/userProfileRepository.js";
import { listObjectAuthorities } from "../../src/db/repositories/objectAuthorityRepository.js";
import { listGeneratedAudit, listRuntimeJobLog, listStateChanges } from "../../src/db/repositories/runtimeRepository.js";
import { getApprovalForProposal, getProposal, listReceipts } from "../../src/db/repositories/agentAuthorityRepository.js";
import { getMissionAttempt } from "../../src/db/repositories/missionRepository.js";

describe("Agent Authority Phase 2 shared-state integration", () => {
  let now:Date; let clock:Clock; let ids:IdGenerator; let adapter:LclTargetAdapter;
  let broker:AuthorityBroker; let approvals:OperatorApprovalService; let idCounter:number;

  beforeEach(() => {
    initTestDatabase(); now=new Date("2026-08-16T12:00:00.000Z"); clock={now:()=>new Date(now)}; idCounter=0;
    ids={id:(prefix)=>`${prefix}_p2_${++idCounter}`,nonce:()=>`nonce_p2_${++idCounter}`};
    adapter=new LclTargetAdapter();
    const deps={db:getDatabase(),adapter,clock,ids};
    broker=new AuthorityBroker({...deps,policy:loadPolicy("data/agent-authority/policy.v1.json")});
    approvals=new OperatorApprovalService(deps);
  });
  afterEach(() => closeDatabase());

  const context = (overrides:Record<string,unknown>={}):ActionContext => ({
    requestId:`req_${idCounter}`,agentSessionId:"agent_session_1",actorType:"agent",
    requestedAt:now.toISOString(),clientName:"phase2-test",clientVersion:"1",...overrides,
  } as ActionContext);
  const grantArgs=(overrides:Record<string,unknown>={})=>({library:"PAYROLL",object:"PAYMST",user:"APCLERK",authority:"*USE",...overrides});
  const operator=()=>signedOn("QSECOFR");
  const auditor=()=>signedOn("AUDIT");
  const requestGrant=(overrides:Record<string,unknown>={})=>broker.request("grant_object_authority","1",grantArgs(overrides),context());

  it("allows bounded observation without approval and records a receipt", () => {
    const result=broker.request("inspect_user_profile","1",{user:"APCLERK"},context());
    expect(result.status).toBe("allowed");
    expect(listReceipts(getDatabase()).at(-1)?.receiptType).toBe("read_allowed");
    const messages=broker.request("read_operational_messages","1",{limit:2},context());
    expect(messages.status).toBe("allowed");
    if (messages.status==="allowed") expect(messages.provenance.every((p)=>p.trustClass==="untrusted_operational_data")).toBe(true);
  });

  it("governs get_action_status through canonical action hashing and evaluated policy", () => {
    const requested=requestGrant(); if(requested.status!=="approval_required") throw new Error("proposal expected");
    const allowed=broker.request("get_action_status","1",{proposal_id:requested.proposalId},context());
    expect(allowed.status).toBe("found");
    const payload=JSON.parse(listReceipts(getDatabase()).at(-1)!.payloadJson) as Record<string,unknown>;
    expect(payload).toMatchObject({
      action:{tool_name:"get_action_status",tool_version:"1",arguments:{proposal_id:requested.proposalId}},
      action_hash:expect.any(String),policy:{decision:"allow",risk_class:"observe",policyId:"lcl-agent-authority-default"},
    });

    const denyObserve:AuthorityPolicy={schemaVersion:"1",policyId:"deny-observe",version:"1",defaultDecision:"deny",rules:[]};
    const deniedBroker=new AuthorityBroker({db:getDatabase(),adapter,clock,ids,policy:denyObserve});
    expect(deniedBroker.request("get_action_status","1",{proposal_id:requested.proposalId},context()))
      .toMatchObject({status:"denied",reason:"POLICY_DENIED"});
  });

  it("creates a pending privilege proposal without changing CLAIMS400", () => {
    const before=privateAuthority("APCLERK"); const result=requestGrant();
    expect(result.status).toBe("approval_required");
    expect(privateAuthority("APCLERK")).toBe(before);
    expect(listStateChanges(adapter.getServiceAttemptId())).toHaveLength(0);
  });

  it("requires a signed-on operator and human denial leaves state unchanged", () => {
    const requested=requestGrant(); if (requested.status!=="approval_required") throw new Error("proposal expected");
    expect(approvals.approve(requested.proposalId,auditor()).reason).toBe("APPROVER_NOT_AUTHORIZED");
    const unsigned=operator(); unsigned.signedOn=false;
    expect(approvals.approve(requested.proposalId,unsigned).reason).toBe("APPROVER_NOT_AUTHORIZED");
    expect(approvals.deny(requested.proposalId,operator(),"not justified").status).toBe("denied");
    expect(privateAuthority("APCLERK")).toBeUndefined();
  });

  it("exact approval changes shared authority state and emits normal LCL evidence as MCPAGENT", () => {
    const requested=requestGrant(); if (requested.status!=="approval_required") throw new Error("proposal expected");
    const result=approvals.approve(requested.proposalId,operator(),"approved for proof");
    expect(result.status).toBe("succeeded");
    expect(privateAuthority("APCLERK")).toBe("*USE");
    expect(getObjectAuthorityDisplay("CLAIMS400","PAYROLL","PAYMST","APCLERK")?.privateAuthorities)
      .toContainEqual({userName:"APCLERK",authority:"*USE"});
    const attemptId=adapter.getServiceAttemptId();
    const attempt=getMissionAttempt(attemptId);
    expect(attempt).toMatchObject({missionId:"AA-001",userName:"MCPAGENT"});
    const changes=listStateChanges(attemptId,"object_authority");
    expect(changes).toHaveLength(1); expect(changes[0]).toMatchObject({actor:"MCPAGENT",entityId:"PAYROLL/PAYMST APCLERK"});
    expect(listGeneratedAudit(attemptId)).toContainEqual(expect.objectContaining({entryType:"CA",userName:"MCPAGENT",objectRef:"PAYROLL/PAYMST"}));
    expect(listRuntimeJobLog(attemptId)).toContainEqual(expect.objectContaining({messageText:expect.stringContaining("MCPAGENT")}));
    expect(result.execution?.evidence.map((e)=>e.type)).toEqual(expect.arrayContaining(["runtime_state_change","runtime_generated_audit","runtime_job_log_entry","evidence_tag"]));
    const executionReceipt=listReceipts(getDatabase()).find((r)=>r.id===result.receiptId)!;
    expect(executionReceipt.payloadJson).toContain('"user":"QSECOFR"');
    expect(executionReceipt.payloadJson).toContain('"user":"MCPAGENT"');
  });

  it("does not transfer one approval to changed authority, subject, or object", () => {
    const first=requestGrant(); if(first.status!=="approval_required") throw new Error("proposal expected");
    expect(approvals.approve(first.proposalId,operator()).status).toBe("succeeded");
    const stronger=requestGrant({authority:"*ALL"}); expect(stronger.status).toBe("approval_required");
    expect(privateAuthority("APCLERK")).toBe("*USE");
    const otherUser=requestGrant({user:"OLDVENDOR"}); expect(otherUser.status).toBe("approval_required");
    expect(privateAuthority("OLDVENDOR")).toBeUndefined();
    const otherObject=requestGrant({library:"CLAIMS400",object:"CLAIMMST"}); expect(otherObject).toMatchObject({status:"denied",reason:"TARGET_NOT_ALLOWED"});
    expect(getObjectAuthorityDisplay("CLAIMS400","CLAIMS400","CLAIMMST","APCLERK")).toBeDefined();
  });

  it("prevents replay/double execution", () => {
    const requested=requestGrant(); if(requested.status!=="approval_required") throw new Error("proposal expected");
    expect(approvals.approve(requested.proposalId,operator()).status).toBe("succeeded");
    expect(approvals.approve(requested.proposalId,operator())).toMatchObject({status:"rejected",reason:"PROPOSAL_ALREADY_DECIDED"});
    expect(listStateChanges(adapter.getServiceAttemptId(),"object_authority")).toHaveLength(1);
  });

  it("expires proposals without mutation", () => {
    const requested=requestGrant(); if(requested.status!=="approval_required") throw new Error("proposal expected");
    now=new Date("2026-08-16T12:05:00.000Z");
    expect(approvals.approve(requested.proposalId,operator()).status).toBe("expired");
    expect(privateAuthority("APCLERK")).toBeUndefined();
  });

  it("invalidates stale preconditions without broker mutation", () => {
    const requested=requestGrant(); if(requested.status!=="approval_required") throw new Error("proposal expected");
    grantObjectAuthority("CLAIMS400","PAYROLL","PAYMST","APCLERK","*CHANGE");
    expect(approvals.approve(requested.proposalId,operator())).toMatchObject({status:"invalidated",reason:"STALE_PRECONDITION"});
    expect(privateAuthority("APCLERK")).toBe("*CHANGE");
    expect(listStateChanges(adapter.getServiceAttemptId(),"object_authority")).toHaveLength(0);
  });

  it("rechecks the final precondition before creating or consuming approval", () => {
    let snapshots=0;
    const intervening:TargetAdapter={
      kind:adapter.kind,system:adapter.system,read:(...args)=>adapter.read(...args),
      snapshot:(action)=>{
        snapshots+=1;
        if(snapshots===2) grantObjectAuthority("CLAIMS400","PAYROLL","PAYMST","APCLERK","*CHANGE");
        return adapter.snapshot(action);
      },
      executeMutation:(action)=>adapter.executeMutation(action),collectEvidence:(...args)=>adapter.collectEvidence(...args),
    };
    const localBroker=new AuthorityBroker({db:getDatabase(),adapter:intervening,clock,ids,policy:loadPolicy("data/agent-authority/policy.v1.json")});
    const localApprovals=new OperatorApprovalService({db:getDatabase(),adapter:intervening,clock,ids});
    const requested=localBroker.request("grant_object_authority","1",grantArgs(),context());
    if(requested.status!=="approval_required") throw new Error("proposal expected");
    expect(localApprovals.approve(requested.proposalId,operator())).toMatchObject({status:"invalidated",reason:"STALE_PRECONDITION"});
    expect(privateAuthority("APCLERK")).toBe("*CHANGE");
    expect(getApprovalForProposal(getDatabase(),requested.proposalId)).toBeUndefined();
    expect(listStateChanges(adapter.getServiceAttemptId(),"object_authority")).toHaveLength(0);
  });

  it("turns final snapshot disappearance into structured invalidation and a receipt", () => {
    let snapshots=0;
    const disappearing:TargetAdapter={
      kind:adapter.kind,system:adapter.system,read:(...args)=>adapter.read(...args),
      snapshot:(action)=>{ if(++snapshots===2) throw new Error("OBJECT_NOT_FOUND"); return adapter.snapshot(action); },
      executeMutation:(action)=>adapter.executeMutation(action),collectEvidence:(...args)=>adapter.collectEvidence(...args),
    };
    const localBroker=new AuthorityBroker({db:getDatabase(),adapter:disappearing,clock,ids,policy:loadPolicy("data/agent-authority/policy.v1.json")});
    const localApprovals=new OperatorApprovalService({db:getDatabase(),adapter:disappearing,clock,ids});
    const requested=localBroker.request("grant_object_authority","1",grantArgs(),context());
    if(requested.status!=="approval_required") throw new Error("proposal expected");
    const result=localApprovals.approve(requested.proposalId,operator());
    expect(result).toMatchObject({status:"invalidated",reason:"TARGET_PRECONDITION_UNAVAILABLE",receiptId:expect.any(String)});
    expect(getProposal(getDatabase(),requested.proposalId)?.status).toBe("invalidated");
    expect(getApprovalForProposal(getDatabase(),requested.proposalId)).toBeUndefined();
    expect(listReceipts(getDatabase()).at(-1)?.receiptType).toBe("target_precondition_failure");
    expect(privateAuthority("APCLERK")).toBeUndefined();
  });

  it("does not reinterpret a consumed proposal as expired on late denial", () => {
    const requested=requestGrant(); if(requested.status!=="approval_required") throw new Error("proposal expected");
    expect(approvals.approve(requested.proposalId,operator()).status).toBe("succeeded");
    now=new Date("2026-08-16T12:10:00.000Z");
    expect(approvals.deny(requested.proposalId,operator())).toMatchObject({status:"rejected",reason:"PROPOSAL_ALREADY_DECIDED"});
    expect(getProposal(getDatabase(),requested.proposalId)?.status).toBe("consumed");
  });

  it("keeps target kinds and indeterminate outcomes target-neutral while LCL stays deterministic", () => {
    const remoteShape:TargetAdapter={
      kind:"ibmi-mcp",system:"FUTURE",read:()=>({data:null,provenance:[]}),snapshot:()=>({}),
      executeMutation:():TargetMutationResult=>({status:"indeterminate",actor:"future",attemptId:"future",before:{},after:{},evidence:[]}),
      collectEvidence:()=>[],
    };
    expect(remoteShape.executeMutation({} as CanonicalAction).status).toBe("indeterminate");
    const requested=requestGrant(); if(requested.status!=="approval_required") throw new Error("proposal expected");
    const result=approvals.approve(requested.proposalId,operator());
    expect(["succeeded","failed"]).toContain(result.status);
  });

  it("denies unknown tools and ignores caller attempts to override risk", () => {
    expect(broker.request("execute_sql","1",{},context())).toMatchObject({status:"denied",reason:"UNKNOWN_TOOL"});
    const result=broker.request("grant_object_authority","1",grantArgs(),context({riskClass:"observe"}));
    expect(result.status).toBe("approval_required");
  });

  it("uses a disabled *USER/*SECADM service profile with no *ALLOBJ or shadow authority state", () => {
    expect(getUserProfile("CLAIMS400","MCPAGENT")).toMatchObject({status:"*DISABLED",userClass:"*USER",specialAuthorities:"*SECADM",password:null});
    expect(getUserProfile("CLAIMS400","MCPAGENT")?.specialAuthorities).not.toContain("*ALLOBJ");
    const shadow=(getDatabase().prepare("SELECT name FROM sqlite_master WHERE type='table' AND name LIKE 'agent_authority%authority%' AND name <> 'agent_authority_approvals'").all() as {name:string}[]);
    expect(shadow).toEqual([]);
  });

  function privateAuthority(user:string):string|undefined {
    return listObjectAuthorities("CLAIMS400","PAYROLL","PAYMST").find((entry)=>entry.userName===user)?.authority;
  }
});

function signedOn(userName:string):IbmiSession {
  const session=createSession("CLAIMS400"); session.signedOn=true; session.userName=userName; session.job.user=userName;
  hydrateSessionFromProfile(session,userName,"CLAIMS400"); return session;
}
