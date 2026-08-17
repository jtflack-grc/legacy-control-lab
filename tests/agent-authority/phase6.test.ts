import {mkdtempSync,readFileSync,rmSync,existsSync,writeFileSync} from "node:fs";
import {tmpdir} from "node:os";
import path from "node:path";
import {spawnSync} from "node:child_process";
import {afterEach,beforeEach,describe,expect,it} from "vitest";
import {closeDatabase,initDatabase,initTestDatabase} from "../../src/db/sqlite.js";
import {createAgentAuthorityRuntime,type AgentAuthorityRuntime} from "../../src/agent-authority/runtime.js";
import {buildProposalProofBundle} from "../../src/agent-authority/proof/proofBuilder.js";
import {calculateProofBundleHash,verifyProofBundle} from "../../src/agent-authority/proof/proofVerifier.js";
import {fingerprint} from "../../src/agent-authority/fingerprint.js";
import type {AgentAuthorityProofBundleV1} from "../../src/agent-authority/proof/proofBundle.js";
import {createSession,hydrateSessionFromProfile,type IbmiSession} from "../../src/ibmi-runtime/sessionService.js";
import {grantObjectAuthority} from "../../src/db/repositories/objectAuthorityRepository.js";
import type {Clock,IdGenerator} from "../../src/agent-authority/types.js";

describe("Agent Authority Phase 6 portable proof",()=>{
  let runtime:AgentAuthorityRuntime;let clock:Clock;let ids:IdGenerator;let n:number;let instant:string;const dirs:string[]=[];
  beforeEach(()=>{initTestDatabase();n=0;instant="2026-08-17T00:30:00.000Z";clock={now:()=>new Date(instant)};ids={id:(prefix)=>`${prefix}_p6_${++n}`,nonce:()=>`nonce_p6_${++n}`};runtime=createAgentAuthorityRuntime({target:"lcl",clock,ids,principalId:"proof-principal"});});
  afterEach(()=>{closeDatabase();while(dirs.length)rmSync(dirs.pop()!,{recursive:true,force:true});});

  it("exports and independently verifies approved execution with ordinary LCL evidence",()=>{
    const id=request("*USE");expect(runtime.approvals.approve(id,operator(),"proof approved").status).toBe("succeeded");const bundle=build(id);
    expect(verifyProofBundle(bundle)).toMatchObject({ok:true,checkedReceipts:2,reconstructedHeadHash:bundle.chainHead.hash});
    expect(bundle.proposal).toMatchObject({id,status:"consumed",approval:{status:"consumed",actionHash:bundle.proposal.actionHash},execution:{status:"succeeded",actor:"MCPAGENT"}});
    expect(JSON.stringify(bundle)).not.toMatch(/sessionToken|password|credential|authorization/i);
    expect(bundle.evidence.missionAttempt).toMatchObject({missionId:"AA-001",userName:"MCPAGENT"});expect(bundle.evidence.stateChanges).toHaveLength(1);expect(bundle.evidence.generatedAudit).toContainEqual(expect.objectContaining({entryType:"CA",userName:"MCPAGENT"}));expect(bundle.evidence.jobLog).toHaveLength(1);
    for(const ref of bundle.proposal.execution!.evidenceRefs){const ids=ref.type==="runtime_state_change"?bundle.evidence.stateChanges.map((x)=>x.id):ref.type==="runtime_generated_audit"?bundle.evidence.generatedAudit.map((x)=>x.id):ref.type==="runtime_job_log_entry"?bundle.evidence.jobLog.map((x)=>x.id):bundle.evidence.evidenceTags;expect(ids).toContain(ref.id);}
  });

  it("round-trips denied, pending, and stale-invalidated proposals",()=>{
    const denied=request("*USE");expect(runtime.approvals.deny(denied,operator(),"not justified").status).toBe("denied");expect(verifyProofBundle(build(denied)).ok).toBe(true);
    const pending=request("*USE");expect(build(pending).proposal).toMatchObject({status:"pending",approval:null,execution:null});expect(verifyProofBundle(build(pending)).ok).toBe(true);
    const invalidated=request("*ALL");grantObjectAuthority("CLAIMS400","PAYROLL","PAYMST","APCLERK","*CHANGE");expect(runtime.approvals.approve(invalidated,operator()).status).toBe("invalidated");const stale=build(invalidated);expect(stale.proposal).toMatchObject({status:"invalidated",execution:null});expect(verifyProofBundle(stale).ok).toBe(true);
    const expired=request("*ALL");instant="2026-08-17T00:40:01.000Z";expect(runtime.approvals.deny(expired,operator()).status).toBe("expired");expect(verifyProofBundle(build(expired)).ok).toBe(true);
  });

  it("detects every required in-memory tamper even when the outer hash is recomputed",()=>{
    const id=request("*USE");runtime.approvals.approve(id,operator());const valid=build(id);expect(verifyProofBundle(valid).ok).toBe(true);
    const cases:Array<[string,(b:AgentAuthorityProofBundleV1)=>void]>=[
      ["canonical action argument",b=>{b.proposal.canonicalAction.arguments.authority="*ALL";}],
      ["action hash",b=>{b.proposal.actionHash="sha256:changed";}],
      ["precondition",b=>{b.proposal.precondition.material.owner="ATTACKER";}],
      ["precondition material and recomputed digest",b=>{b.proposal.precondition.material.owner="ATTACKER";b.proposal.precondition.hash=fingerprint(b.proposal.precondition.material).hash;}],
      ["precondition hash",b=>{b.proposal.precondition.hash="sha256:changed";}],
      ["policy decision",b=>{b.proposal.policy.decision="deny";}],
      ["risk class",b=>{b.proposal.riskClass="observe";}],
      ["provenance",b=>{b.proposal.provenance=[{sourceId:"forged",sourceType:"operational_message",trustClass:"untrusted_operational_data",contentHash:"sha256:forged"}];}],
      ["requester client metadata",b=>{b.proposal.requester.clientName="forged-client";}],
      ["proposal expiry",b=>{b.proposal.expiresAt="2099-01-01T00:00:00.000Z";}],
      ["human decision type",b=>{b.proposal.humanDecision.decision="denied";}],
      ["human decision user",b=>{b.proposal.humanDecision.by="ATTACKER";}],
      ["approval action hash",b=>{b.proposal.approval!.actionHash="sha256:changed";}],
      ["approval ID",b=>{b.proposal.approval!.id="approval_forged";}],
      ["approval approver user",b=>{b.proposal.approval!.approverUser="ATTACKER";}],
      ["approval approver session",b=>{b.proposal.approval!.approverSessionId="session_forged";}],
      ["approval consumed time",b=>{b.proposal.approval!.consumedAt="2099-01-01T00:00:00.000Z";}],
      ["execution before",b=>{b.proposal.execution!.before.owner="ATTACKER";}],
      ["execution after",b=>{b.proposal.execution!.after.owner="ATTACKER";}],
      ["receipt payload",b=>{(b.receipts.at(-1)!.payload as any).action_hash="sha256:changed";}],
      ["receipt ID",b=>{b.receipts[0]!.id="changed";}],
      ["receipt removed",b=>{b.receipts.splice(0,1);}],
      ["receipt reordered",b=>{b.receipts.reverse();}],
      ["receipt sequence",b=>{b.receipts[0]!.sequence=99;}],
      ["previous hash",b=>{b.receipts.at(-1)!.previousHash="sha256:changed";}],
      ["chain head",b=>{b.chainHead.hash="sha256:changed";}],
      ["execution evidence reference",b=>{b.proposal.execution!.evidenceRefs.splice(0,1);}],
      ["evidence record",b=>{b.evidence.stateChanges.splice(0,1);}],
      ["execution actor",b=>{b.proposal.execution!.actor="QSECOFR";}],
      ["proposal status",b=>{b.proposal.status="denied";}],
    ];
    for(const [name,mutate] of cases){const tampered=clone(valid);mutate(tampered);tampered.bundleHash=calculateProofBundleHash(tampered);expect(verifyProofBundle(tampered).ok,name).toBe(false);}
    const deniedId=request("*ALL");runtime.approvals.deny(deniedId,operator(),"not justified");const denied=build(deniedId);
    for(const [name,mutate] of [
      ["denial decision type",(b:AgentAuthorityProofBundleV1)=>{b.proposal.humanDecision.decision="approved";}],
      ["denial decision user",(b:AgentAuthorityProofBundleV1)=>{b.proposal.humanDecision.by="ATTACKER";}],
      ["denial decision reason",(b:AgentAuthorityProofBundleV1)=>{b.proposal.humanDecision.reason="forged reason";}],
    ] as Array<[string,(b:AgentAuthorityProofBundleV1)=>void]>){const tampered=clone(denied);mutate(tampered);tampered.bundleHash=calculateProofBundleHash(tampered);expect(verifyProofBundle(tampered).ok,name).toBe(false);}
    const hash=clone(valid);hash.bundleHash="sha256:changed";expect(verifyProofBundle(hash).errors).toContain("bundle hash mismatch");
  });

  it("fails cleanly on malformed receipt-bound projections",()=>{
    const id=request("*USE");runtime.approvals.approve(id,operator());const valid=build(id);
    for(const mutate of [(b:any)=>{b.receipts[0].payload.policy=[];},(b:any)=>{b.proposal.provenance={bad:true};},(b:any)=>{b.proposal.approval="bad";},(b:any)=>{b.proposal.humanDecision=null;},(b:any)=>{b.proposal.execution.before=()=>undefined;}]){
      const malformed=clone(valid) as any;mutate(malformed);expect(()=>verifyProofBundle(malformed)).not.toThrow();expect(verifyProofBundle(malformed).ok).toBe(false);
    }
  });

  it("writes through the exporter CLI and verifies offline without creating a database",()=>{
    const dir=mkdtempSync(path.join(tmpdir(),"aa-proof-"));dirs.push(dir);const database=path.join(dir,"lcl.db");closeDatabase();initDatabase({path:database,forceSeed:true});runtime=createAgentAuthorityRuntime({target:"lcl",clock,ids,principalId:"proof-principal"});const proposalId=request("*USE");const proof=path.join(dir,"proof.json");
    const exported=spawn("src/agent-authority/proof/proofExportCli.ts",["--proposal",proposalId,"--out",proof],{DATABASE_PATH:database});expect(exported.status,exported.stderr).toBe(0);expect(existsSync(proof)).toBe(true);expect(existsSync(`${proof}.sha256`)).toBe(true);
    const absentDb=path.join(dir,"must-not-exist.db");const verified=spawn("src/agent-authority/proof/proofVerifyCli.ts",[proof],{DATABASE_PATH:absentDb});expect(verified.status,verified.stderr).toBe(0);expect(JSON.parse(verified.stdout)).toMatchObject({ok:true,bundleId:expect.any(String)});expect(existsSync(absentDb)).toBe(false);
    const parsed=JSON.parse(readFileSync(proof,"utf8"));parsed.proposal.actionHash="sha256:tampered";const tampered=path.join(dir,"tampered.json");writeFileSync(tampered,JSON.stringify(parsed));const rejected=spawn("src/agent-authority/proof/proofVerifyCli.ts",[tampered],{DATABASE_PATH:absentDb});expect(rejected.status).not.toBe(0);expect(JSON.parse(rejected.stdout)).toMatchObject({ok:false});
  });

  function request(authority:string):string {const result=runtime.broker.request("grant_object_authority","1",{library:"PAYROLL",object:"PAYMST",user:"APCLERK",authority},{requestId:`req-${++n}`,agentSessionId:"proof-principal",actorType:"agent",requestedAt:clock.now().toISOString(),clientName:"proof-test",clientVersion:"1"});if(result.status!=="approval_required")throw new Error("proposal required");return result.proposalId;}
  function build(id:string){return buildProposalProofBundle(runtime.db,id,{clock,ids});}
});

function operator():IbmiSession{const session=createSession("CLAIMS400");session.signedOn=true;session.userName="QSECOFR";session.job.user="QSECOFR";hydrateSessionFromProfile(session,"QSECOFR","CLAIMS400");return session;}
function clone<T>(value:T):T{return JSON.parse(JSON.stringify(value)) as T;}
function spawn(file:string,args:string[],env:Record<string,string>){return spawnSync(process.execPath,["--import","tsx",file,...args],{cwd:process.cwd(),encoding:"utf8",env:{...process.env,...env}});}
