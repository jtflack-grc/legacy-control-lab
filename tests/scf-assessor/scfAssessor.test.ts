import {afterEach,beforeEach,describe,expect,it} from "vitest";
import {closeDatabase,initTestDatabase} from "../../src/db/sqlite.js";
import {createAgentAuthorityRuntime} from "../../src/agent-authority/runtime.js";
import {ScenarioPackService} from "../../src/agent-authority/scenarios/scenarioPackService.js";
import {ScfAssessorService} from "../../src/scf-assessor/assessorService.js";
import {createSession,hydrateSessionFromProfile} from "../../src/ibmi-runtime/sessionService.js";
import {grantObjectAuthority} from "../../src/ibmi-runtime/authorityService.js";
import type {Clock,IdGenerator} from "../../src/agent-authority/types.js";
import path from "node:path";
import {createLabHttpServer} from "../../src/lab/httpServer.js";
import {createScfAssessorApi} from "../../src/scf-assessor/http/scfAssessorApi.js";

describe("SCF assessor guidepost",()=>{
  let n=0;let runtime:ReturnType<typeof createAgentAuthorityRuntime>;let scenarios:ScenarioPackService;let assessor:ScfAssessorService;
  const clock:Clock={now:()=>new Date("2026-09-30T12:00:00.000Z")};
  beforeEach(()=>{initTestDatabase();const ids:IdGenerator={id:(prefix)=>`${prefix}_scf_${++n}`,nonce:()=>`nonce_scf_${++n}`};runtime=createAgentAuthorityRuntime({target:"lcl",clock,ids,principalId:"scf-agent",guidedAa001:true});scenarios=new ScenarioPackService(runtime);assessor=new ScfAssessorService(runtime,"CLAIMS400");});
  afterEach(()=>closeDatabase());

  it("starts with no invented assurance conclusions",()=>{
    const result=assessor.assess();
    expect(result.rows).toHaveLength(12);expect(result.summary.pass).toBe(0);expect(result.profile).toMatchObject({scfRelease:"2026.3",kind:"assessor_guidepost"});
    expect(row(result,"CPL-30")).toMatchObject({fit:"like_for_like",status:"not_tested"});
    expect(row(result,"IAC-52")).toMatchObject({fit:"not_demonstrated",status:"no_evidence"});
    expect(result.profile.claim).toContain("not an SCF certification");
  });

  it("shows verified matches, bounded partials, and the MCPAGENT privilege failure",()=>{
    const aa1=scenarios.act("AA-001","create_initial_request");expect(runtime.approvals.approve(aa1.proposals[0].id,operator(),"exact approval").status).toBe("succeeded");
    const aa2=scenarios.act("AA-002","create_initial_request");expect(runtime.approvals.deny(aa2.proposals[0].id,operator(),"too broad").status).toBe("denied");const narrowed=scenarios.act("AA-002","submit_narrower_request");expect(runtime.approvals.approve(narrowed.proposals.find((p:any)=>p.action.arguments.authority==="*USE")!.id,operator(),"least privilege").status).toBe("succeeded");
    const aa3=scenarios.act("AA-003","create_initial_request");grantObjectAuthority("CLAIMS400","PAYROLL","PAYMST","OLDVENDOR","*EXCLUDE");expect(runtime.approvals.approve(aa3.proposals[0].id,operator(),"stale test").status).toBe("invalidated");
    scenarios.act("AA-004","run_investigation");const aa4=scenarios.act("AA-004","create_mutation_request");expect(runtime.approvals.approve(aa4.proposals[0].id,operator(),"narrow stale account").status).toBe("succeeded");
    scenarios.act("AA-005","attempt_out_of_scope_request");
    const result=assessor.assess();
    expect(row(result,"CPL-30").status).toBe("pass");expect(row(result,"CFG-24").status).toBe("pass");expect(row(result,"CFG-25").status).toBe("pass");expect(row(result,"IAO-15").status).toBe("pass");
    expect(row(result,"MON-37")).toMatchObject({status:"partial",fit:"partial"});expect(row(result,"IAC-51")).toMatchObject({status:"fail",fit:"not_demonstrated"});expect(row(result,"IAC-51").conclusion).toContain("*SECADM");
    expect(row(result,"IAC-52").status).toBe("no_evidence");expect(result.summary).toEqual({pass:4,fail:1,partial:6,not_tested:0,no_evidence:1});
  });

  it("treats human approval of *ALL as evidence of failure, not success",()=>{
    const broad=scenarios.act("AA-002","create_initial_request");expect(runtime.approvals.approve(broad.proposals[0].id,operator(),"approved anyway").status).toBe("succeeded");
    const result=assessor.assess();expect(row(result,"IAC-51")).toMatchObject({status:"fail",fit:"not_demonstrated"});expect(row(result,"IAC-51").conclusion).toContain("approved *ALL request");
  });

  it("serves the standalone assessor surface and its live read-only endpoint",async()=>{
    const server=createLabHttpServer({port:0,host:"127.0.0.1",ironTermPublicDir:path.resolve("public"),systemName:"CLAIMS400",websockifyPort:6080,scfAssessorHandler:createScfAssessorApi(runtime,"CLAIMS400"),scfAssessorPublicDir:path.resolve("public/scf-assessor")});
    await new Promise<void>((resolve)=>server.listen(0,"127.0.0.1",resolve));
    try{const port=(server.address() as {port:number}).port;const page=await fetch(`http://127.0.0.1:${port}/scf-assessor/`);expect(page.status).toBe(200);expect(await page.text()).toContain("SCF Assessor Guidepost");const api=await fetch(`http://127.0.0.1:${port}/api/scf-assessor/assessment`);expect(api.status).toBe(200);expect((await api.json() as any).rows).toHaveLength(12);}
    finally{await new Promise<void>((resolve)=>server.close(()=>resolve()));}
  });

  function operator(){const session=createSession("CLAIMS400");session.signedOn=true;session.userName="QSECOFR";session.job.user="QSECOFR";hydrateSessionFromProfile(session,"QSECOFR","CLAIMS400");return session;}
  function row(result:ReturnType<ScfAssessorService["assess"]>,controlId:string){return result.rows.find((entry)=>entry.controlId===controlId)!;}
});
