import path from "node:path";
import {existsSync} from "node:fs";
import {afterEach,beforeEach,describe,expect,it} from "vitest";
import {chromium,type Request as PlaywrightRequest} from "playwright";
import {Client,StreamableHTTPClientTransport} from "@modelcontextprotocol/client";
import {closeDatabase,initTestDatabase} from "../../src/db/sqlite.js";
import {createAgentAuthorityRuntime} from "../../src/agent-authority/runtime.js";
import {createAgentAuthorityMcpRuntime} from "../../src/agent-authority/mcp/mcpRuntime.js";
import {createAuthorityDeskApi} from "../../src/agent-authority/http/authorityDeskApi.js";
import {createLabHttpServer} from "../../src/lab/httpServer.js";
import {createSession,hydrateSessionFromProfile} from "../../src/ibmi-runtime/sessionService.js";
import {registerLiveSession,unregisterLiveSession} from "../../src/lab/liveSessionRegistry.js";
import {removeLabSession,upsertLabSession} from "../../src/lab/sessionRegistry.js";
import {grantObjectAuthority,listObjectAuthorities} from "../../src/db/repositories/objectAuthorityRepository.js";
import {getApprovalForProposal,getProposal} from "../../src/db/repositories/agentAuthorityRepository.js";
import {listStateChanges} from "../../src/db/repositories/runtimeRepository.js";
import type {Clock,IdGenerator} from "../../src/agent-authority/types.js";
import {verifyProofBundle} from "../../src/agent-authority/proof/proofVerifier.js";

const EXPECTED=["get_action_status","grant_object_authority","inspect_object_authority","inspect_user_profile","list_recent_audit_events","read_operational_messages"];

describe("Agent Authority Phase 5 Authority Desk",()=>{
  const cleanup:Array<()=>Promise<void>|void>=[];let clock:Clock;let ids:IdGenerator;let n:number;
  beforeEach(()=>{initTestDatabase();n=0;clock={now:()=>new Date("2026-08-16T22:30:00.000Z")};ids={id:(p)=>`${p}_p5_${++n}`,nonce:()=>`nonce_p5_${++n}`};});
  afterEach(async()=>{while(cleanup.length)await cleanup.pop()!();closeDatabase();});

  it("gates the API and Desk static root when disabled",async()=>{
    const {url}=await mount();
    expect((await fetch(`${url}/api/agent-authority/status`)).status).toBe(404);
    expect((await fetch(`${url}/lab/authority/`)).status).toBe(404);
    expect((await fetch(`${url}/api/agent-authority/counterfactual`)).status).toBe(404);
  });

  it("requires the exact fresh live operator session",async()=>{
    const enabled=await mountEnabled();
    expect((await fetch(`${enabled.url}/api/agent-authority/status`)).status).toBe(401);
    expect((await authFetch(enabled.url,"/api/agent-authority/status","invalid")).status).toBe(403);
    const staleSession=createSession("CLAIMS400");staleSession.signedOn=true;staleSession.userName="QSECOFR";staleSession.job.user="QSECOFR";hydrateSessionFromProfile(staleSession,"QSECOFR","CLAIMS400");registerLiveSession(staleSession);const stale=upsertLabSession({sessionId:staleSession.id,systemName:"CLAIMS400",userName:"QSECOFR",screenId:"MAIN",lane:"operator",updatedAt:"2000-01-01T00:00:00.000Z"});cleanup.push(()=>{unregisterLiveSession(staleSession.id);removeLabSession(staleSession.id);});expect((await authFetch(enabled.url,"/api/agent-authority/status",stale.sessionToken!)).status).toBe(403);
    const auditor=liveSession("AUDIT");expect((await authFetch(enabled.url,"/api/agent-authority/status",auditor.token)).status).toBe(403);
    const first=liveSession("QSECOFR");unregisterLiveSession(first.session.id);
    const sameName=liveSession("QSECOFR");
    expect((await authFetch(enabled.url,"/api/agent-authority/status",first.token)).status).toBe(403);
    expect((await authFetch(enabled.url,"/api/agent-authority/status",sameName.token)).status).toBe(200);
  });

  it("rejects wrong displayed hashes and replay without mutation",async()=>{
    const enabled=await mountEnabled();const operator=liveSession("QSECOFR");const client=await connect(enabled.url);
    const proposal=structured(await client.callTool({name:"grant_object_authority",arguments:grantArgs("*USE")}));
    const injected=await authFetch(enabled.url,`/api/agent-authority/proposals/${proposal.proposal_id}/approve`,operator.token,{method:"POST",body:JSON.stringify({action_hash:proposal.action_hash,approvedBy:"QSECOFR"})});expect(injected.status).toBe(400);expect(getProposal(enabled.runtime.db,proposal.proposal_id as string)?.status).toBe("pending");expect(privateAuthority()).toBeUndefined();
    const wrong=await authFetch(enabled.url,`/api/agent-authority/proposals/${proposal.proposal_id}/approve`,operator.token,{method:"POST",body:JSON.stringify({action_hash:"sha256:wrong"})});
    expect(wrong.status).toBe(409);expect(privateAuthority()).toBeUndefined();expect(getProposal(enabled.runtime.db,proposal.proposal_id as string)?.status).toBe("pending");
    const approved=await decide(enabled.url,proposal,"approve",operator.token);expect(approved.status).toBe("succeeded");expect(privateAuthority()).toBe("*USE");
    const replay=await decideResponse(enabled.url,proposal,"approve",operator.token);expect(replay.status).toBe(409);expect(privateAuthority()).toBe("*USE");
    const expiring=structured(await client.callTool({name:"grant_object_authority",arguments:grantArgs("*ALL")}));enabled.runtime.db.prepare("UPDATE agent_authority_proposals SET expires_at=? WHERE id=?").run("2020-01-01T00:00:00.000Z",expiring.proposal_id);const expired=await decide(enabled.url,expiring,"approve",operator.token);expect(expired.status).toBe("expired");expect(privateAuthority()).toBe("*USE");
  });

  it("denies without mutation and exposes the persisted decision to MCP",async()=>{
    const enabled=await mountEnabled();const operator=liveSession("QSECOFR");const client=await connect(enabled.url);
    const proposal=structured(await client.callTool({name:"grant_object_authority",arguments:grantArgs("*ALL")}));
    const denied=await decide(enabled.url,proposal,"deny",operator.token);expect(denied.status).toBe("denied");expect(privateAuthority()).toBeUndefined();
    const status=structured(await client.callTool({name:"get_action_status",arguments:{proposal_id:proposal.proposal_id}}));expect(status).toMatchObject({proposal_status:"denied",execution_status:null});
  });

  it("invalidates a stale precondition without consuming approval",async()=>{
    const enabled=await mountEnabled();const operator=liveSession("QSECOFR");const client=await connect(enabled.url);
    const proposal=structured(await client.callTool({name:"grant_object_authority",arguments:grantArgs("*ALL")}));
    grantObjectAuthority("CLAIMS400","PAYROLL","PAYMST","APCLERK","*CHANGE");
    const result=await decide(enabled.url,proposal,"approve",operator.token);expect(result.status).toBe("invalidated");expect(result.reason).toBe("STALE_PRECONDITION");expect(privateAuthority()).toBe("*CHANGE");
    expect(getApprovalForProposal(enabled.runtime.db,proposal.proposal_id as string)).toBeUndefined();
  });

  it("bounds operator-only receipt history and verifies the existing chain",async()=>{
    const enabled=await mountEnabled();const operator=liveSession("QSECOFR");const client=await connect(enabled.url);
    await client.callTool({name:"inspect_user_profile",arguments:{user:"APCLERK"}});await client.callTool({name:"read_operational_messages",arguments:{limit:1}});
    const receipts=await json(await authFetch(enabled.url,"/api/agent-authority/receipts?limit=1",operator.token));expect(receipts.receipts).toHaveLength(1);expect(receipts.limit).toBe(1);const detail=await json(await authFetch(enabled.url,`/api/agent-authority/receipts/${receipts.receipts[0].id}`,operator.token));expect(detail.receipt.id).toBe(receipts.receipts[0].id);
    expect((await fetch(`${enabled.url}/api/agent-authority/receipts?limit=100`)).status).toBe(401);
    expect((await fetch(`${enabled.url}/api/agent-authority/receipts/${receipts.receipts[0].id}`)).status).toBe(401);
    expect((await fetch(`${enabled.url}/api/agent-authority/verify`)).status).toBe(401);
    const verified=await json(await authFetch(enabled.url,"/api/agent-authority/verify",operator.token));expect(verified).toMatchObject({ok:true,checked:2});
    for(const route of ["execute","force","bypass","counterfactual"])expect((await authFetch(enabled.url,`/api/agent-authority/${route}`,operator.token)).status).toBe(404);
  });

  it("reports the true pending count independently of the bounded list",async()=>{
    const enabled=await mountEnabled();const operator=liveSession("QSECOFR");
    for(let i=0;i<101;i++)enabled.runtime.broker.request("grant_object_authority","1",grantArgs("*USE"),{requestId:`count-${i}`,agentSessionId:"count-principal",actorType:"agent",requestedAt:clock.now().toISOString()});
    const status=await json(await authFetch(enabled.url,"/api/agent-authority/status",operator.token));const proposals=await json(await authFetch(enabled.url,"/api/agent-authority/proposals?status=pending&limit=100",operator.token));
    expect(status.pendingCount).toBe(101);expect(proposals.proposals).toHaveLength(100);
  });

  it("proves MCP request to human approval to MCP completion on shared state",async()=>{
    const enabled=await mountEnabled();const operator=liveSession("QSECOFR");const client=await connect(enabled.url);
    expect((await client.listTools()).tools.map((t)=>t.name).sort()).toEqual(EXPECTED);
    const requested=structured(await client.callTool({name:"grant_object_authority",arguments:grantArgs("*USE")}));expect(requested.status).toBe("approval_required");expect(privateAuthority()).toBeUndefined();
    const approved=await decide(enabled.url,requested,"approve",operator.token);expect(approved).toMatchObject({status:"succeeded",execution:{actor:"MCPAGENT"}});expect(privateAuthority()).toBe("*USE");
    expect((await fetch(`${enabled.url}/api/agent-authority/proposals/${requested.proposal_id}/proof`)).status).toBe(401);const proofResponse=await authFetch(enabled.url,`/api/agent-authority/proposals/${requested.proposal_id}/proof`,operator.token);expect(proofResponse.status).toBe(200);expect(proofResponse.headers.get("content-type")).toContain("application/json");expect(proofResponse.headers.get("content-disposition")).toMatch(/^attachment; filename="agent-authority-proof-/);expect(verifyProofBundle(await proofResponse.json()).ok).toBe(true);
    expect((await authFetch(enabled.url,"/api/agent-authority/proposals/missing-proof/proof",operator.token)).status).toBe(404);
    const polled=structured(await client.callTool({name:"get_action_status",arguments:{proposal_id:requested.proposal_id}}));expect(polled).toMatchObject({proposal_status:"consumed",execution_status:"succeeded"});
    const deniedRequest=structured(await client.callTool({name:"grant_object_authority",arguments:grantArgs("*ALL")}));const denied=await decide(enabled.url,deniedRequest,"deny",operator.token);expect(denied.status).toBe("denied");expect(privateAuthority()).toBe("*USE");
    const deniedPoll=structured(await client.callTool({name:"get_action_status",arguments:{proposal_id:deniedRequest.proposal_id}}));expect(deniedPoll.proposal_status).toBe("denied");
  });

  it("serves a framework-free Desk with exact operator discovery and safe DOM construction",async()=>{
    const enabled=await mountEnabled();const html=await (await fetch(`${enabled.url}/lab/authority/`)).text();const js=await (await fetch(`${enabled.url}/lab/authority/authority.js`)).text();const css=await (await fetch(`${enabled.url}/lab/authority/authority.css`)).text();
    expect(html).toContain("Authority Desk");expect(html).toContain("Recent decisions");expect(html).toContain("Back to Agent Authority Lab");expect(js).toContain("user=QSECOFR");expect(js).not.toContain("Sec-Fetch-Site");expect(js).toContain("textContent");expect(js).toContain("replaceChildren");expect(js).not.toMatch(/innerHTML|insertAdjacentHTML|\beval\s*\(/);expect(js).toContain("action_hash:proposal.actionHash");expect(js).toContain("await refresh()");expect(js).not.toMatch(/approvedBy|approverUser|counterfactual/);expect(css).toContain("--ink:#050a08");expect(css).toContain("IBM Plex Sans");expect(css).toContain("IBM Plex Mono");expect(css).toContain("rgba(127,255,178,.018)");
  });

  it("keeps locked and verified operator states legible in the portfolio-derived Desk",async()=>{
    const enabled=await mountEnabled();const executable=browserPath();const browser=await chromium.launch({headless:true,...(executable?{executablePath:executable}:{}),args:["--no-sandbox"]});cleanup.push(()=>browser.close());const page=await browser.newPage();await page.goto(`${enabled.url}/lab/authority/`);await expect.poll(()=>page.locator("#locked").isVisible()).toBe(true);expect(await page.locator("#locked").textContent()).toContain("Authority Desk locked");expect(await page.locator("#readiness").textContent()).toContain("Operator session required");liveSession("QSECOFR");await page.getByRole("button",{name:"Refresh"}).click();await expect.poll(()=>page.locator("#readiness").textContent()).toContain("Operator session verified");expect(await page.locator("#readiness").textContent()).toContain("QSECOFR");
  },30_000);

  it("renders hostile metadata inert and performs approval and denial through the real Desk",async()=>{
    const enabled=await mountEnabled();const operator=liveSession("QSECOFR");liveSession("AUDIT");
    const hostile='<img id="aa001-xss" src=x onerror="window.__AA001_XSS__=true">';const client=await connect(enabled.url,hostile);
    const requested=structured(await client.callTool({name:"grant_object_authority",arguments:grantArgs("*USE")}));
    const executable=browserPath();const browser=await chromium.launch({headless:true,...(executable?{executablePath:executable}:{}),args:["--no-sandbox"]});cleanup.push(()=>browser.close());const page=await browser.newPage();
    const decisionRequests:PlaywrightRequest[]=[];page.on("request",(request)=>{if(/\/proposals\/[^/]+\/(approve|deny)$/.test(new URL(request.url()).pathname))decisionRequests.push(request);});page.on("dialog",(dialog)=>dialog.accept(dialog.message().includes("approve")?"browser approved":"browser denied"));
    await page.goto(`${enabled.url}/lab/authority/`);const pending=page.locator(`#proposals [data-proposal-id="${requested.proposal_id}"]`);await expect.poll(()=>pending.count()).toBe(1);await expect.poll(()=>pending.textContent()).toContain(hostile);expect(await pending.locator("#aa001-xss,img,script").count()).toBe(0);expect(await page.evaluate(()=>Reflect.get(window,"__AA001_XSS__"))).toBeUndefined();
    expect(await page.locator("body").evaluate((node)=>getComputedStyle(node).fontFamily)).toContain("IBM Plex Sans");expect(await page.locator(".eyebrow").evaluate((node)=>getComputedStyle(node).fontFamily)).toContain("IBM Plex Mono");expect(await page.locator("body").evaluate((node)=>getComputedStyle(node).backgroundColor)).toBe("rgb(5, 10, 8)");expect(await page.locator("body").evaluate((node)=>getComputedStyle(node,"::before").backgroundImage)).toContain("linear-gradient");const approve=pending.getByRole("button",{name:"Approve"}),deny=pending.getByRole("button",{name:"Deny"});expect(await approve.isVisible()).toBe(true);expect(await deny.isVisible()).toBe(true);expect(await approve.evaluate((node)=>getComputedStyle(node).backgroundColor)).toBe("rgb(9, 17, 13)");expect(await deny.evaluate((node)=>getComputedStyle(node).backgroundColor)).toBe("rgb(9, 17, 13)");
    await pending.getByRole("button",{name:"Approve"}).click();const history=page.locator(`#history [data-proposal-id="${requested.proposal_id}"]`);await expect.poll(()=>history.textContent()).toContain("consumed");await expect.poll(()=>history.textContent()).toContain("succeeded");expect(await pending.count()).toBe(0);expect(privateAuthority()).toBe("*USE");expect(listStateChanges(enabled.runtime.adapter.getServiceAttemptId(),"object_authority")).toHaveLength(1);
    const downloadPromise=page.waitForEvent("download");await history.getByRole("button",{name:"Download proof"}).click();const download=await downloadPromise;expect(download.suggestedFilename()).toMatch(/^agent-authority-proof-.*\.json$/);
    const approvalRequest=decisionRequests.find((request)=>request.url().endsWith("/approve"))!;expect(approvalRequest.headers()["x-lab-session-token"]).toBe(operator.token);expect(approvalRequest.postDataJSON()).toEqual({action_hash:requested.action_hash,reason:"browser approved"});
    const execution=getProposal(enabled.runtime.db,requested.proposal_id as string)!;expect(execution).toMatchObject({status:"consumed",executionStatus:"succeeded"});
    const deniedRequest=structured(await client.callTool({name:"grant_object_authority",arguments:grantArgs("*ALL")}));await page.getByRole("button",{name:"Refresh"}).click();const pendingDenial=page.locator(`#proposals [data-proposal-id="${deniedRequest.proposal_id}"]`);await expect.poll(()=>pendingDenial.count()).toBe(1);await pendingDenial.getByRole("button",{name:"Deny"}).click();const deniedHistory=page.locator(`#history [data-proposal-id="${deniedRequest.proposal_id}"]`);await expect.poll(()=>deniedHistory.textContent()).toContain("denied");expect(privateAuthority()).toBe("*USE");expect(listStateChanges(enabled.runtime.adapter.getServiceAttemptId(),"object_authority")).toHaveLength(1);const denialRequest=decisionRequests.find((request)=>request.url().endsWith("/deny"))!;expect(denialRequest.postDataJSON()).toEqual({reason:"browser denied"});
  },30_000);

  async function mountEnabled(){const runtime=createAgentAuthorityRuntime({target:"lcl",clock,ids,principalId:"phase5-principal"});const mcp=createAgentAuthorityMcpRuntime({runtime,rateLimit:500});cleanup.push(()=>mcp.close());const authorityDeskHandler=createAuthorityDeskApi(runtime,"CLAIMS400");const mounted=await mount({mcpHandler:mcp.nodeHandler,authorityDeskHandler,authorityDeskPublicDir:path.resolve("public/authority-desk")});return {...mounted,runtime};}
  async function mount(extra:Partial<Parameters<typeof createLabHttpServer>[0]>={}){const server=createLabHttpServer({port:0,host:"127.0.0.1",ironTermPublicDir:path.resolve("public"),systemName:"CLAIMS400",websockifyPort:6080,...extra});await new Promise<void>((resolve)=>server.listen(0,"127.0.0.1",resolve));cleanup.push(()=>new Promise<void>((resolve)=>server.close(()=>resolve())));return {url:`http://127.0.0.1:${(server.address() as {port:number}).port}`};}
  function liveSession(user:string){const session=createSession("CLAIMS400");session.signedOn=true;session.userName=user;session.job.user=user;hydrateSessionFromProfile(session,user,"CLAIMS400");registerLiveSession(session);const snapshot=upsertLabSession({sessionId:session.id,systemName:session.systemName,userName:user,screenId:"MAIN",lane:session.lane,updatedAt:new Date().toISOString()});cleanup.push(()=>{unregisterLiveSession(session.id);removeLabSession(session.id);});return {session,token:snapshot.sessionToken!};}
  async function connect(url:string,name="phase5-client"){const client=new Client({name,version:"1"},{versionNegotiation:{mode:{pin:"2026-07-28"}}});await client.connect(new StreamableHTTPClientTransport(new URL(`${url}/mcp`)));cleanup.push(()=>client.close());return client;}
});

function grantArgs(authority:string){return {library:"PAYROLL",object:"PAYMST",user:"APCLERK",authority};}
function privateAuthority(){return listObjectAuthorities("CLAIMS400","PAYROLL","PAYMST").find((row)=>row.userName==="APCLERK")?.authority;}
function structured(result:{structuredContent?:unknown}){return result.structuredContent as Record<string,unknown>;}
function authFetch(url:string,pathName:string,token:string,init:RequestInit={}){return fetch(`${url}${pathName}`,{...init,headers:{...init.headers,"X-Lab-Session-Token":token,"Content-Type":"application/json"}});}
async function decideResponse(url:string,p:Record<string,unknown>,decision:"approve"|"deny",token:string){return authFetch(url,`/api/agent-authority/proposals/${p.proposal_id}/${decision}`,token,{method:"POST",body:JSON.stringify(decision==="approve"?{action_hash:p.action_hash,reason:"reviewed"}:{reason:"not approved"})});}
async function decide(url:string,p:Record<string,unknown>,decision:"approve"|"deny",token:string){return json(await decideResponse(url,p,decision,token));}
async function json(response:Response){return await response.json() as any;}
function browserPath():string|undefined {const configured=process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH;if(configured)return configured;const managed=chromium.executablePath();if(existsSync(managed))return undefined;if(existsSync("/tmp/chromium"))return "/tmp/chromium";throw new Error("A Playwright-compatible Chromium binary is required for the Authority Desk browser test");}
