import {spawn} from "node:child_process";
import {rmSync} from "node:fs";
import {chromium} from "playwright";

const root=new URL("..",import.meta.url).pathname;
const database="/tmp/lcl-agent-authority-screenshots.db";
const base="http://127.0.0.1:8080";
rmSync(database,{force:true});
const server=spawn(process.execPath,["dist/server.js"],{cwd:root,env:{...process.env,DATABASE_PATH:database,LCL_AGENT_AUTHORITY_ENABLED:"true",HTTP_PORT:"8080",WEBSOCKIFY_PORT:"6080",TN5250_PORT:"8023"},stdio:"inherit"});
const wait=async(test,timeout=20_000)=>{const end=Date.now()+timeout;while(Date.now()<end){try{if(await test())return;}catch{}await new Promise((resolve)=>setTimeout(resolve,250));}throw new Error("Timed out waiting for screenshot state");};
const shot=(page,name)=>page.screenshot({path:`${root}/public/assets/screenshots/${name}`,fullPage:true});
const choose=async(page,id)=>{await page.locator("#aa-back-to-scenarios").click();await wait(async()=>await page.locator("#aa-scenario-chooser").isVisible());await page.locator(`[data-scenario-id="${id}"]`).click();await wait(async()=>await page.locator("#aa-scenario-experience").isVisible());};

try{
  await wait(async()=>(await fetch(`${base}/api/health`)).ok);
  const browser=await chromium.launch({headless:true,...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH?{executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH}:{}),args:["--no-sandbox"]});
  const page=await browser.newPage({viewport:{width:1600,height:1000},deviceScaleFactor:1});
  await page.addInitScript(()=>localStorage.setItem("lab.launcher.introduced","1"));
  await page.goto(`${base}/lab/`);
  await page.locator("#pick-agent-authority").click();
  await wait(async()=>await page.locator("#aa-scenario-chooser").isVisible());
  await shot(page,"06-agent-authority-scenario-chooser.png");

  await page.locator('[data-scenario-id="AA-001"]').click();
  await wait(async()=>await page.locator("#aa-scenario-experience").isVisible());
  await page.waitForTimeout(500);
  await shot(page,"03-agent-authority-overview.png");
  await page.locator("#aa-step-action").click();
  await wait(async()=>(await page.locator("#aa-status").textContent())?.includes("Awaiting decision"));
  await shot(page,"04-agent-authority-pending.png");

  const guided=await (await fetch(`${base}/api/agent-authority/walkthrough`)).json();
  const [{initDatabase,closeDatabase},{createAgentAuthorityRuntime},{createSession,hydrateSessionFromProfile},{grantObjectAuthority}]=await Promise.all([import("../dist/db/sqlite.js"),import("../dist/agent-authority/runtime.js"),import("../dist/ibmi-runtime/sessionService.js"),import("../dist/ibmi-runtime/authorityService.js")]);
  initDatabase({path:database});
  const runtime=createAgentAuthorityRuntime({target:"lcl",principalId:"screenshot-agent"});
  const operator=createSession("CLAIMS400");operator.signedOn=true;operator.userName="QSECOFR";operator.job.user="QSECOFR";hydrateSessionFromProfile(operator,"QSECOFR","CLAIMS400");
  const decision=runtime.approvals.approve(guided.proposal.id,operator,"presentation walkthrough");
  if(decision.status!=="succeeded")throw new Error(`Screenshot approval failed: ${decision.status}`);
  await page.goto(`${base}/lab/?path=agentauthority`);
  await wait(async()=>(await page.locator("#aa-status").textContent())?.includes("proof verified"));
  await page.locator("#aa-step-action").click();
  await wait(async()=>(await page.locator("#aa-step-count").textContent())==="Step 6 of 6");
  await page.locator("#aa-evidence-card").scrollIntoViewIfNeeded();
  await shot(page,"05-agent-authority-complete.png");

  await choose(page,"AA-002");
  await page.locator("#aa-step-action").click();
  await wait(async()=>(await page.locator("#aa-proposal-id").textContent())!=="—");
  await shot(page,"07-agent-authority-aa002-overbroad.png");

  await choose(page,"AA-003");
  await page.locator("#aa-step-action").click();
  await wait(async()=>!await page.locator("#aa-step-command").getAttribute("hidden"));
  const stale=await (await fetch(`${base}/api/agent-authority/scenarios/AA-003`)).json();
  grantObjectAuthority("CLAIMS400","PAYROLL","PAYMST","OLDVENDOR","*EXCLUDE");
  const staleDecision=runtime.approvals.approve(stale.proposals[0].id,operator,"demonstrate stale state");
  if(staleDecision.status!=="invalidated")throw new Error(`Stale screenshot failed: ${staleDecision.status}`);
  await page.reload();
  await wait(async()=>(await page.locator("#aa-decision").textContent())==="invalidated");
  await shot(page,"08-agent-authority-aa003-stale.png");

  await choose(page,"AA-004");
  await page.locator("#aa-step-action").click();
  await wait(async()=>await page.locator("#aa-observation-list li").count()===3);
  await shot(page,"09-agent-authority-aa004-investigation.png");

  await choose(page,"AA-005");
  await page.locator("#aa-step-action").click();
  await wait(async()=>(await page.locator("#aa-evidence-list").textContent())?.includes("Boundary denial receipt"));
  await shot(page,"10-agent-authority-aa005-boundary.png");
  closeDatabase();
  await browser.close();
} finally {server.kill("SIGTERM");}
