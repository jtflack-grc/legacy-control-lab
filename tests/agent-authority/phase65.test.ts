import path from "node:path";
import {existsSync} from "node:fs";
import {afterEach,beforeEach,describe,expect,it} from "vitest";
import {chromium} from "playwright";
import {closeDatabase,initTestDatabase} from "../../src/db/sqlite.js";
import {createAgentAuthorityRuntime,type AgentAuthorityRuntime} from "../../src/agent-authority/runtime.js";
import {createAuthorityDeskApi} from "../../src/agent-authority/http/authorityDeskApi.js";
import {createLabHttpServer} from "../../src/lab/httpServer.js";
import {createSession,hydrateSessionFromProfile} from "../../src/ibmi-runtime/sessionService.js";
import {registerLiveSession,unregisterLiveSession} from "../../src/lab/liveSessionRegistry.js";
import {removeLabSession,upsertLabSession} from "../../src/lab/sessionRegistry.js";
import {listObjectAuthorities} from "../../src/db/repositories/objectAuthorityRepository.js";
import {listStateChanges} from "../../src/db/repositories/runtimeRepository.js";
import type {Clock,IdGenerator} from "../../src/agent-authority/types.js";

describe("Agent Authority Phase 6.5 guided LCL experience",()=>{
  const cleanup:Array<()=>Promise<void>|void>=[];let runtime:AgentAuthorityRuntime;let n=0;let clock:Clock;let ids:IdGenerator;
  beforeEach(()=>{initTestDatabase();n=0;clock={now:()=>new Date("2026-08-17T01:18:00.000Z")};ids={id:(prefix)=>`${prefix}_p65_${++n}`,nonce:()=>`nonce_p65_${++n}`};});
  afterEach(async()=>{while(cleanup.length)await cleanup.pop()!();closeDatabase();});

  it("keeps Agent Authority undiscoverable when the feature is disabled",async()=>{
    const {url}=await mount();const browser=await launch();const page=await browser.newPage();await introduced(page);await page.goto(`${url}/lab/`);
    await expect.poll(()=>page.locator("#agent-authority-entry").isHidden()).toBe(true);
    expect((await fetch(`${url}/api/agent-authority/walkthrough`)).status).toBe(404);
  },30_000);

  it("guides AA-001 from untrusted message to exact approval, shared state, evidence and proof",async()=>{
    const {url}=await mountEnabled();const browser=await launch();const page=await browser.newPage({viewport:{width:1600,height:1000}});await introduced(page);
    await page.goto(`${url}/lab/`);await expect.poll(()=>page.getByText("See agent governance").count()).toBe(1);await page.locator("#pick-agent-authority").click();await expect.poll(()=>page.locator("#aa-scenario-cards article").count()).toBe(5);await page.locator('[data-scenario-id="AA-001"]').click();
    await expect.poll(()=>page.getByText("Legacy Control Lab is the synthetic enterprise system.").count()).toBe(1);
    expect(await page.locator("#terminal-frame").count()).toBe(1);expect(await page.getByText("The message is data. It is not permission.").count()).toBeGreaterThan(0);expect(await page.locator("#aa-step-count").textContent()).toBe("Step 1 of 6");expect(await page.locator("#aa-step-instruction").textContent()).toContain("create the agent's governed request");
    const railBox=await page.locator("#coach-rail").boundingBox();const terminalBox=await page.locator(".terminal-panel").boundingBox();expect(railBox!.width).toBeGreaterThanOrEqual(540);expect(terminalBox!.width).toBeGreaterThan(700);
    await page.setViewportSize({width:1100,height:1000});const stackedRail=await page.locator("#coach-rail").boundingBox();const stackedTerminal=await page.locator(".terminal-panel").boundingBox();expect(stackedRail!.y).toBeGreaterThanOrEqual(stackedTerminal!.y+stackedTerminal!.height-1);await page.setViewportSize({width:1600,height:1000});
    await page.getByRole("button",{name:"Create governed request"}).click();await expect.poll(()=>page.locator("#aa-status").textContent()).toContain("Awaiting decision");
    expect(privateAuthority()).toBeUndefined();expect(await page.locator("#aa-current-authority").textContent()).toContain("No private authority");expect(await page.locator("#aa-step-count").textContent()).toBe("Step 2 of 6");expect(await page.locator("#aa-step-instruction").textContent()).toContain("DSPOBJAUT OBJ(PAYROLL/PAYMST)");expect(await page.locator("#aa-step-expected").textContent()).toContain("should NOT have *USE");
    await page.getByRole("button",{name:"Done — I confirmed it"}).click();await expect.poll(()=>page.locator("#aa-step-count").textContent()).toBe("Step 3 of 6");expect(await page.locator("#aa-step-instruction").textContent()).toContain("User: QSECOFR");expect(await page.locator("#aa-step-instruction").textContent()).toContain("Password: TRAIN");expect(await page.locator("#aa-step-readiness").textContent()).toContain("not ready yet");
    const operator=liveOperator();await expect.poll(()=>page.locator("#aa-step-count").textContent(),{timeout:5_000}).toBe("Step 4 of 6");expect(await page.getByRole("button",{name:"Review request in Authority Desk"}).isVisible()).toBe(true);
    const [desk]=await Promise.all([page.waitForEvent("popup"),page.getByRole("button",{name:"Review request in Authority Desk"}).click()]);await desk.waitForLoadState();await expect.poll(()=>desk.locator("#proposals article").count()).toBe(1);desk.on("dialog",(dialog)=>dialog.accept("guided approval"));await desk.getByRole("button",{name:"Approve"}).click();
    await expect.poll(()=>page.locator("#aa-status").textContent(),{timeout:10_000}).toContain("proof verified");expect(privateAuthority()).toBe("*USE");expect(await page.locator("#aa-current-authority").textContent()).toBe("*USE");expect(await page.locator("#aa-executor").textContent()).toBe("MCPAGENT");expect(await page.locator("#aa-step-count").textContent()).toBe("Step 5 of 6");expect(await page.locator("#aa-step-expected").textContent()).toContain("APCLERK now has *USE");expect(await page.locator("#aa-step-expected").textContent()).toContain("MCPAGENT");
    await page.getByRole("button",{name:"Done — I confirmed the outcome"}).click();await expect.poll(()=>page.locator("#aa-step-count").textContent()).toBe("Step 6 of 6");expect(await page.locator("#aa-step-instruction").textContent()).toContain("inspect what the system recorded");expect(await page.getByRole("button",{name:"Download verified proof"}).count()).toBeGreaterThan(0);
    expect(await page.locator("#aa-evidence-list").textContent()).toContain("CA-style generated audit entry");expect(await page.locator("#aa-evidence-list").textContent()).toContain("MCPAGENT runtime job log");expect(await page.locator("#aa-proof-state").textContent()).toContain("Proof verified");expect(listStateChanges(runtime.adapter.getServiceAttemptId(),"object_authority")).toHaveLength(1);
    expect(await desk.getByRole("link",{name:/Back to Agent Authority walkthrough/}).getAttribute("href")).toBe("/lab/?path=agentauthority");expect(operator.token).toBeTruthy();
  },60_000);

  it("renders hostile walkthrough content as inert text and shows denial without mutation",async()=>{
    const {url}=await mountEnabled();const operator=liveOperator();const browser=await launch();const page=await browser.newPage();await introduced(page);const hostile='<img id="aa-guide-xss" src=x onerror="window.__AA_GUIDE_XSS__=true">';
    await page.route("**/api/agent-authority/walkthrough",async(route)=>{const response=await route.fetch();const body=await response.json();body.message.text=hostile;await route.fulfill({response,json:body});});
    await page.goto(`${url}/lab/?path=agentauthority`);await expect.poll(()=>page.locator("#aa-scenario-cards article").count()).toBe(5);await page.locator('[data-scenario-id="AA-001"]').click();await expect.poll(()=>page.locator("#aa-message-text").textContent()).toBe(hostile);expect(await page.locator("#aa-guide-xss,#agent-authority-panel img,#agent-authority-panel script").count()).toBe(0);expect(await page.evaluate(()=>Reflect.get(window,"__AA_GUIDE_XSS__"))).toBeUndefined();
    await page.getByRole("button",{name:"Create governed request"}).click();const status=await (await fetch(`${url}/api/agent-authority/walkthrough`)).json() as any;const denied=await fetch(`${url}/api/agent-authority/proposals/${status.proposal.id}/deny`,{method:"POST",headers:{"X-Lab-Session-Token":operator.token,"Content-Type":"application/json"},body:JSON.stringify({reason:"Message is not authorization"})});expect(denied.status).toBe(200);
    await expect.poll(()=>page.locator("#aa-status").textContent(),{timeout:10_000}).toContain("Denied");expect(privateAuthority()).toBeUndefined();expect(await page.locator("#aa-current-authority").textContent()).toContain("No private authority");expect(await page.locator("#aa-step-count").textContent()).toBe("Step 5 of 6");expect(await page.locator("#aa-step-expected").textContent()).toContain("still have no *USE");await page.getByRole("button",{name:"Done — I confirmed the outcome"}).click();await expect.poll(()=>page.locator("#aa-step-count").textContent()).toBe("Step 6 of 6");expect(await page.locator("#aa-proof-state").textContent()).toContain("Proof verified");
  },30_000);

  it("renders the five-scenario chooser, safe-read curriculum, boundary denial, and green terminal commands",async()=>{
    const {url}=await mountEnabled();const browser=await launch();const page=await browser.newPage({viewport:{width:1600,height:1000}});await introduced(page);await page.goto(`${url}/lab/?path=agentauthority`);
    await expect.poll(()=>page.locator("#aa-scenario-cards article").count()).toBe(5);expect(await page.locator("#agent-authority-entry").count()).toBe(1);expect(await page.getByText("More Access Than Necessary").count()).toBe(1);expect(await page.getByText("Outside the Boundary").count()).toBe(1);
    await page.locator('[data-scenario-id="AA-005"]').click();await page.getByRole("button",{name:"Attempt request"}).click();await expect.poll(()=>page.locator("#aa-step-command").textContent()).toBe("DSPOBJAUT OBJ(CLAIMS400/CLAIMMST)");expect(await page.locator("#aa-step-command").evaluate((node)=>getComputedStyle(node).fontFamily)).toMatch(/mono|Cascadia|Consolas/i);expect(await page.locator("#aa-step-command").evaluate((node)=>getComputedStyle(node).color)).toBe("rgb(87, 242, 161)");expect(await page.locator("#aa-evidence-list").textContent()).toContain("Boundary denial receipt");
    await page.locator("#aa-back-to-scenarios").click();await page.locator('[data-scenario-id="AA-004"]').click();await page.getByRole("button",{name:"Run safe investigation"}).click();await expect.poll(()=>page.locator("#aa-evidence-list li").count()).toBe(3);expect(await page.locator("#aa-evidence-list").textContent()).toContain("No human approval required");expect(await page.getByRole("button",{name:"Propose *ALL → *USE"}).isVisible()).toBe(true);
  },30_000);

  async function mountEnabled(){runtime=createAgentAuthorityRuntime({target:"lcl",clock,ids,principalId:"guided-agent",guidedAa001:true});return mount({authorityDeskHandler:createAuthorityDeskApi(runtime,"CLAIMS400"),authorityDeskPublicDir:path.resolve("public/authority-desk")});}
  async function mount(extra:Partial<Parameters<typeof createLabHttpServer>[0]>={}){const server=createLabHttpServer({port:0,host:"127.0.0.1",ironTermPublicDir:path.resolve("public"),systemName:"CLAIMS400",websockifyPort:6080,...extra});await new Promise<void>((resolve)=>server.listen(0,"127.0.0.1",resolve));cleanup.push(()=>new Promise<void>((resolve)=>server.close(()=>resolve())));return {url:`http://127.0.0.1:${(server.address() as {port:number}).port}`};}
  async function launch(){const executable=browserPath();const browser=await chromium.launch({headless:true,...(executable?{executablePath:executable}:{}),args:["--no-sandbox"]});cleanup.push(()=>browser.close());return browser;}
  async function introduced(page:import("playwright").Page){await page.addInitScript(()=>localStorage.setItem("lab.launcher.introduced","1"));}
  function liveOperator(){const session=createSession("CLAIMS400");session.signedOn=true;session.userName="QSECOFR";session.job.user="QSECOFR";hydrateSessionFromProfile(session,"QSECOFR","CLAIMS400");registerLiveSession(session);const snapshot=upsertLabSession({sessionId:session.id,systemName:"CLAIMS400",userName:"QSECOFR",screenId:"MAIN",lane:"operator",updatedAt:new Date().toISOString()});cleanup.push(()=>{unregisterLiveSession(session.id);removeLabSession(session.id);});return {session,token:snapshot.sessionToken!};}
  function privateAuthority(){return listObjectAuthorities("CLAIMS400","PAYROLL","PAYMST").find((row)=>row.userName==="APCLERK")?.authority;}
});

function browserPath():string|undefined {const configured=process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH;if(configured)return configured;const managed=chromium.executablePath();if(existsSync(managed))return undefined;if(existsSync("/tmp/chromium"))return "/tmp/chromium";throw new Error("A Playwright-compatible Chromium binary is required");}
