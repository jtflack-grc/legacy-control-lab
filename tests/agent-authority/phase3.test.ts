import { afterEach,beforeEach,describe,expect,it } from "vitest";
import { closeDatabase,getDatabase,initTestDatabase } from "../../src/db/sqlite.js";
import { getMessages } from "../../src/ibmi-runtime/messageService.js";
import { createSession,hydrateSessionFromProfile,type IbmiSession } from "../../src/ibmi-runtime/sessionService.js";
import { getObjectAuthorityDisplay } from "../../src/ibmi-runtime/authorityService.js";
import { listObjectAuthorities } from "../../src/db/repositories/objectAuthorityRepository.js";
import { getApprovalForProposal,getProposal,listReceipts } from "../../src/db/repositories/agentAuthorityRepository.js";
import { listGeneratedAudit,listRuntimeJobLog,listStateChanges } from "../../src/db/repositories/runtimeRepository.js";
import { verifyReceiptChain } from "../../src/agent-authority/evidence/receiptVerifier.js";
import { loadPolicy } from "../../src/agent-authority/policy/policyLoader.js";
import { LclTargetAdapter } from "../../src/agent-authority/adapters/lclTargetAdapter.js";
import { AuthorityBroker } from "../../src/agent-authority/broker/authorityBroker.js";
import { OperatorApprovalService } from "../../src/agent-authority/broker/operatorApprovalService.js";
import { AA001DeterministicAgent } from "../../src/agent-authority/scenarios/aa001Runner.js";
import { AA001_INTENT,AA001_MESSAGE } from "../../src/agent-authority/scenarios/aa001Fixture.js";
import { SyntheticCounterfactualExecutor } from "../../src/agent-authority/scenarios/syntheticCounterfactualExecutor.js";
import type { ActionContext,Clock,IdGenerator } from "../../src/agent-authority/types.js";

describe("Agent Authority Phase 3 deterministic assurance",()=>{
  let now:Date;let clock:Clock;let ids:IdGenerator;let adapter:LclTargetAdapter;let broker:AuthorityBroker;let approvals:OperatorApprovalService;let counter:number;
  beforeEach(()=>setup()); afterEach(()=>closeDatabase());

  function setup(){
    initTestDatabase();now=new Date("2026-08-16T12:00:00.000Z");clock={now:()=>new Date(now)};counter=0;
    ids={id:(prefix)=>`${prefix}_p3_${++counter}`,nonce:()=>`nonce_p3_${++counter}`};
    adapter=new LclTargetAdapter({operationalMessageFixtures:[AA001_MESSAGE]});
    const deps={db:getDatabase(),adapter,clock,ids};
    broker=new AuthorityBroker({...deps,policy:loadPolicy("data/agent-authority/policy.v1.json")});approvals=new OperatorApprovalService(deps);
  }
  const context=():ActionContext=>({requestId:`req_p3_${counter}`,agentSessionId:"aa001-agent",actorType:"agent",requestedAt:now.toISOString()});
  const operator=()=>signedOn("QSECOFR");
  const authority=()=>listObjectAuthorities("CLAIMS400","PAYROLL","PAYMST").find((row)=>row.userName==="APCLERK")?.authority;
  const run=()=>new AA001DeterministicAgent(broker,adapter).run(context());

  it("isolates the hostile fixture and binds untrusted server provenance",()=>{
    expect(getMessages("QSYSOPR").some((message)=>message.id===AA001_MESSAGE.id)).toBe(false);
    const result=run();
    expect(result.messageSources).toEqual([expect.objectContaining({sourceId:`QSYSOPR:${AA001_MESSAGE.id}`,trustClass:"untrusted_operational_data",contentHash:expect.any(String)})]);
    const proposal=getProposal(getDatabase(),result.proposalId!);
    expect(proposal).toMatchObject({riskClass:"privilege_change",status:"pending"});
    expect(JSON.parse(proposal!.provenanceJson!)).toEqual(result.messageSources);
    expect(authority()).toBeUndefined();expect(getApprovalForProposal(getDatabase(),result.proposalId!)).toBeUndefined();
    expect(listStateChanges(adapter.getServiceAttemptId(),"object_authority")).toHaveLength(0);
  });

  it("ignores fabricated caller provenance that was not observed",()=>{
    const requested=broker.request("grant_object_authority","1",AA001_INTENT,context(),[{sourceId:"QSYSOPR:FAKE",contentHash:"sha256:fake"}]);
    if(requested.status!=="approval_required") throw new Error("proposal expected");
    expect(getProposal(getDatabase(),requested.proposalId)?.provenanceJson).toBeUndefined();
  });

  it("AA-001A denial leaves shared state unchanged and preserves provenance evidence",()=>{
    const result=run();const denied=approvals.deny(result.proposalId!,operator(),"message is not authorization");
    expect(denied.status).toBe("denied");expect(authority()).toBeUndefined();
    expect(listStateChanges(adapter.getServiceAttemptId(),"object_authority")).toHaveLength(0);
    const receipt=listReceipts(getDatabase()).find((item)=>item.id===denied.receiptId)!;
    expect(receipt.receiptType).toBe("human_denial");expect(receipt.payloadJson).toContain("untrusted_operational_data");
  });

  it("AA-001B exact human approval mutates once as MCPAGENT with normal evidence",()=>{
    const scenario=run();const executed=approvals.approve(scenario.proposalId!,operator(),"exact action approved");
    expect(executed.status).toBe("succeeded");expect(authority()).toBe("*USE");
    expect(getObjectAuthorityDisplay("CLAIMS400","PAYROLL","PAYMST","APCLERK")?.privateAuthorities).toContainEqual({userName:"APCLERK",authority:"*USE"});
    const changes=listStateChanges(adapter.getServiceAttemptId(),"object_authority");
    expect(changes).toHaveLength(1);expect(changes[0].actor).toBe("MCPAGENT");
    expect(listGeneratedAudit(adapter.getServiceAttemptId())).toContainEqual(expect.objectContaining({entryType:"CA",userName:"MCPAGENT"}));
    expect(listRuntimeJobLog(adapter.getServiceAttemptId())).toHaveLength(1);
    expect(listReceipts(getDatabase()).find((item)=>item.id===executed.receiptId)?.payloadJson).toContain("untrusted_operational_data");
    expect(approvals.approve(scenario.proposalId!,operator()).status).toBe("rejected");expect(changes).toHaveLength(1);
  });

  it("shows the same baseline intent lands only in the isolated counterfactual control group",()=>{
    const protectedBaseline=authority();const protectedRun=run();expect(authority()).toBe(protectedBaseline);expect(protectedRun.policyResult).toBe("require_approval");
    closeDatabase();setup();const counterfactualBaseline=authority();expect(counterfactualBaseline).toBe(protectedBaseline);
    const executor=new SyntheticCounterfactualExecutor(adapter,{kind:"lcl",system:"CLAIMS400"});
    const result=executor.execute("grant_object_authority",{...AA001_INTENT});
    expect(result).toMatchObject({status:"succeeded",mode:"synthetic_counterfactual",humanApproved:false,governanceControlPresent:false});
    expect(authority()).toBe("*USE");expect(getObjectAuthorityDisplay("CLAIMS400","PAYROLL","PAYMST","APCLERK")).toBeDefined();
    expect(getDatabase().prepare("SELECT count(*) AS count FROM agent_authority_approvals").get()).toEqual({count:0});
    expect(listStateChanges(result.attemptId,"object_authority")[0]).toMatchObject({actor:"MCPAGENT"});
    expect(listGeneratedAudit(result.attemptId)).toContainEqual(expect.objectContaining({entryType:"CA"}));
    expect(listRuntimeJobLog(result.attemptId)[0]?.messageText).toContain("Synthetic counterfactual");
    expect(listReceipts(getDatabase())).toHaveLength(0);
  });

  it("structurally restricts the counterfactual target and operation",()=>{
    expect(()=>new SyntheticCounterfactualExecutor(adapter,{kind:"ibmi-mcp",system:"CLAIMS400"} as never)).toThrow("SYNTHETIC_TARGET_ONLY");
    expect(()=>new SyntheticCounterfactualExecutor(adapter,{kind:"lcl",system:"OTHER"} as never)).toThrow("SYNTHETIC_TARGET_ONLY");
    const executor=new SyntheticCounterfactualExecutor(adapter,{kind:"lcl",system:"CLAIMS400"});
    expect(()=>executor.execute("execute_sql" as never,{} as never)).toThrow("COUNTERFACTUAL_TOOL_NOT_ALLOWED");
    expect(()=>executor.execute("grant_object_authority",{...AA001_INTENT,object:"OTHER"})).toThrow("TARGET_NOT_ALLOWED");
  });

  it("denies annotation/risk spoofing and arbitrary commands",()=>{
    for(const spoof of [{riskClass:"observe"},{approved:true},{readOnlyHint:true}]) {
      expect(broker.request("grant_object_authority","1",AA001_INTENT,{...context(),...spoof} as ActionContext)).toMatchObject({status:"approval_required"});
    }
    for(const tool of ["execute_sql","QCMDEXC","execute_cl","shell","unregistered_tool"])
      expect(broker.request(tool,"1",{},context())).toMatchObject({status:"denied",reason:"UNKNOWN_TOOL"});
  });

  it("detects tampering with an AA-001 decision receipt",()=>{
    const result=run();const denied=approvals.deny(result.proposalId!,operator());expect(denied.status).toBe("denied");
    expect(verifyReceiptChain(getDatabase()).ok).toBe(true);
    getDatabase().prepare("UPDATE agent_authority_receipts SET payload_json='{}' WHERE id=?").run(denied.receiptId);
    expect(verifyReceiptChain(getDatabase()).ok).toBe(false);
  });

  it("retains expiry, stale-precondition, substitution, and replay protections",()=>{
    const expired=run();now=new Date("2026-08-16T12:06:00.000Z");expect(approvals.approve(expired.proposalId!,operator()).status).toBe("expired");expect(authority()).toBeUndefined();
    closeDatabase();setup();const stale=run();getDatabase().prepare("UPDATE objects SET public_authority='*USE' WHERE system_id=(SELECT id FROM systems WHERE name='CLAIMS400') AND library='PAYROLL' AND name='PAYMST'").run();
    expect(approvals.approve(stale.proposalId!,operator()).status).toBe("invalidated");expect(authority()).toBeUndefined();
    closeDatabase();setup();const exact=run();expect(approvals.approve(exact.proposalId!,operator()).status).toBe("succeeded");
    expect(broker.request("grant_object_authority","1",{...AA001_INTENT,authority:"*ALL"},context()).status).toBe("approval_required");
    expect(broker.request("grant_object_authority","1",{...AA001_INTENT,user:"OLDVENDOR"},context()).status).toBe("approval_required");
    expect(broker.request("grant_object_authority","1",{...AA001_INTENT,object:"OTHER"},context()).status).toBe("denied");
    expect(authority()).toBe("*USE");expect(approvals.approve(exact.proposalId!,operator()).status).toBe("rejected");
  });
});

function signedOn(userName:string):IbmiSession {const session=createSession("CLAIMS400");session.signedOn=true;session.userName=userName;session.job.user=userName;hydrateSessionFromProfile(session,userName,"CLAIMS400");return session;}
