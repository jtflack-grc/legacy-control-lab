import {afterEach,beforeEach,describe,expect,it} from "vitest";
import {closeDatabase,initTestDatabase} from "../../src/db/sqlite.js";
import {createAgentAuthorityRuntime} from "../../src/agent-authority/runtime.js";
import {ScenarioPackService} from "../../src/agent-authority/scenarios/scenarioPackService.js";
import {AGENT_AUTHORITY_SCENARIOS} from "../../src/agent-authority/scenarios/scenarioCatalog.js";
import {authorityToolRegistry} from "../../src/agent-authority/toolRegistry.js";
import {createSession,hydrateSessionFromProfile} from "../../src/ibmi-runtime/sessionService.js";
import {grantObjectAuthority} from "../../src/ibmi-runtime/authorityService.js";
import {listObjectAuthorities} from "../../src/db/repositories/objectAuthorityRepository.js";
import {listProposals,listReceiptsBounded} from "../../src/db/repositories/agentAuthorityRepository.js";
import type {Clock,IdGenerator} from "../../src/agent-authority/types.js";

describe("Agent Authority Phase 6.6 scenario pack",()=>{
  let n=0;let runtime:ReturnType<typeof createAgentAuthorityRuntime>;let scenarios:ScenarioPackService;
  const clock:Clock={now:()=>new Date("2026-08-19T19:39:27.000Z")};
  beforeEach(()=>{initTestDatabase();n=0;const ids:IdGenerator={id:(prefix)=>`${prefix}_p66_${++n}`,nonce:()=>`nonce_p66_${++n}`};runtime=createAgentAuthorityRuntime({target:"lcl",clock,ids,principalId:"scenario-agent",guidedAa001:true});scenarios=new ScenarioPackService(runtime);});
  afterEach(()=>closeDatabase());

  it("publishes exactly five scenarios while preserving six tools and the single target boundary",()=>{
    expect(AGENT_AUTHORITY_SCENARIOS.map((s)=>s.id)).toEqual(["AA-001","AA-002","AA-003","AA-004","AA-005"]);
    expect(authorityToolRegistry.list().map((t)=>t.name).sort()).toEqual(["get_action_status","grant_object_authority","inspect_object_authority","inspect_user_profile","list_recent_audit_events","read_operational_messages"]);
    const denied=runtime.broker.request("grant_object_authority","1",{library:"CLAIMS400",object:"CLAIMMST",user:"AUDIT",authority:"*USE"},context("boundary-regression"));expect(denied).toMatchObject({status:"denied",reason:"TARGET_NOT_ALLOWED"});
  });

  it("AA-002 denies immutable *ALL then creates and executes a distinct *USE proposal",()=>{
    const first=scenarios.act("AA-002","create_initial_request");const all=first.proposals[0];expect(all.action.arguments.authority).toBe("*ALL");
    expect(runtime.approvals.deny(all.id,operator(),"Too broad").status).toBe("denied");
    const second=scenarios.act("AA-002","submit_narrower_request");const use=second.proposals.find((p:any)=>p.action.arguments.authority==="*USE")!;
    expect(use.id).not.toBe(all.id);expect(use.actionHash).not.toBe(all.actionHash);expect(second.proposals.find((p:any)=>p.id===all.id)?.status).toBe("denied");
    expect(runtime.approvals.approve(use.id,operator(),"Least privilege").status).toBe("succeeded");expect(authority("AUDIT")).toBe("*USE");
  });

  it("AA-002 truthfully reports an approved original *ALL request as a warning",()=>{
    const state=scenarios.act("AA-002","create_initial_request");expect(runtime.approvals.approve(state.proposals[0].id,operator(),"Human chose broad access").status).toBe("succeeded");
    expect(scenarios.project("AA-002")).toMatchObject({status:"complete_with_warning",currentAuthority:"*ALL"});
  });

  it("AA-003 invalidates when ordinary CLAIMS400 changes after proposal creation",()=>{
    const created=scenarios.act("AA-003","create_initial_request");const proposal=created.proposals[0];grantObjectAuthority("CLAIMS400","PAYROLL","PAYMST","OLDVENDOR","*EXCLUDE");
    const result=runtime.approvals.approve(proposal.id,operator(),"Approve captured request");expect(result.status).toBe("invalidated");expect(authority("OLDVENDOR")).toBe("*EXCLUDE");
    const projected=scenarios.project("AA-003");expect(projected.proposals[0]).toMatchObject({status:"invalidated",executionStatus:null,proof:{verified:true}});
  });

  it("AA-004 performs three autonomous reads before governing the narrowing mutation",()=>{
    const investigated=scenarios.act("AA-004","run_investigation");expect(investigated.observations).toHaveLength(3);expect(investigated.proposals).toHaveLength(0);expect(investigated.observations.every((o:any)=>o.approvalRequired===false)).toBe(true);
    expect(investigated.observations.map((o:any)=>o.tool).sort()).toEqual(["inspect_object_authority","inspect_user_profile","list_recent_audit_events"]);
    const proposed=scenarios.act("AA-004","create_mutation_request");expect(proposed.proposals[0]).toMatchObject({status:"pending",action:{arguments:{user:"BACKUPADM",authority:"*USE"}}});
    expect(runtime.approvals.approve(proposed.proposals[0].id,operator(),"Narrow stale access").status).toBe("succeeded");expect(authority("BACKUPADM")).toBe("*USE");expect(scenarios.project("AA-004").proposals[0].proof.verified).toBe(true);
  });

  it("AA-004 denial preserves the existing broad authority and produces proof",()=>{
    scenarios.act("AA-004","run_investigation");const proposed=scenarios.act("AA-004","create_mutation_request");
    expect(runtime.approvals.deny(proposed.proposals[0].id,operator(),"Investigation did not justify change").status).toBe("denied");
    expect(authority("BACKUPADM")).toBe("*ALL");expect(scenarios.project("AA-004").proposals[0]).toMatchObject({status:"denied",proof:{verified:true}});
  });

  it("AA-005 denies outside delegation without creating a proposal or mutation",()=>{
    const before=authorityOn("CLAIMS400","CLAIMMST","AUDIT");const result=scenarios.act("AA-005","attempt_out_of_scope_request");
    expect(result.denial?.payload.reason).toBe("TARGET_NOT_ALLOWED");expect(result.proposals).toHaveLength(0);expect(authorityOn("CLAIMS400","CLAIMMST","AUDIT")).toBe(before);
    expect(listProposals(runtime.db,{limit:100})).toHaveLength(0);expect(listReceiptsBounded(runtime.db,{limit:100,afterSequence:0})).toContainEqual(expect.objectContaining({receiptType:"request_denied"}));
  });

  it("runs AA-001 through AA-005 once in one clean CLAIMS400 volume",()=>{
    const aa1=scenarios.act("AA-001","create_initial_request");expect(runtime.approvals.approve(aa1.proposals[0].id,operator(),"AA-001 exact approval").status).toBe("succeeded");
    const aa2=scenarios.act("AA-002","create_initial_request");expect(runtime.approvals.deny(aa2.proposals[0].id,operator(),"AA-002 too broad").status).toBe("denied");const aa2n=scenarios.act("AA-002","submit_narrower_request");expect(runtime.approvals.approve(aa2n.proposals.find((p:any)=>p.action.arguments.authority==="*USE")!.id,operator(),"AA-002 least privilege").status).toBe("succeeded");
    const aa3=scenarios.act("AA-003","create_initial_request");grantObjectAuthority("CLAIMS400","PAYROLL","PAYMST","OLDVENDOR","*EXCLUDE");expect(runtime.approvals.approve(aa3.proposals[0].id,operator(),"AA-003 stale demonstration").status).toBe("invalidated");
    scenarios.act("AA-004","run_investigation");const aa4=scenarios.act("AA-004","create_mutation_request");expect(runtime.approvals.approve(aa4.proposals[0].id,operator(),"AA-004 narrow stale access").status).toBe("succeeded");
    expect(scenarios.act("AA-005","attempt_out_of_scope_request").denial?.payload.reason).toBe("TARGET_NOT_ALLOWED");
    expect(["AA-001","AA-002","AA-003","AA-004","AA-005"].map((id)=>scenarios.project(id as any).status)).toEqual(["complete","complete","complete","complete","complete"]);
    expect(authority("APCLERK")).toBe("*USE");expect(authority("AUDIT")).toBe("*USE");expect(authority("OLDVENDOR")).toBe("*EXCLUDE");expect(authority("BACKUPADM")).toBe("*USE");
  });

  function operator(){const s=createSession("CLAIMS400");s.signedOn=true;s.userName="QSECOFR";s.job.user="QSECOFR";hydrateSessionFromProfile(s,"QSECOFR","CLAIMS400");return s;}
  function authority(user:string){return authorityOn("PAYROLL","PAYMST",user);}
  function authorityOn(library:string,object:string,user:string){return listObjectAuthorities("CLAIMS400",library,object).find((r)=>r.userName===user)?.authority;}
  function context(clientName:string){return {requestId:`req-${++n}`,agentSessionId:"scenario-agent",actorType:"agent" as const,requestedAt:clock.now().toISOString(),clientName,clientVersion:"1"};}
});
