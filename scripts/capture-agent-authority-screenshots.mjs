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
  await page.locator("#aa-scenario-complete").scrollIntoViewIfNeeded();
  await shot(page,"11-agent-authority-scenario-complete.png");

  await choose(page,"AA-002");
  await page.locator("#aa-step-action").click();
  await wait(async()=>(await page.locator("#aa-proposal-id").textContent())!=="—");
  await shot(page,"07-agent-authority-aa002-overbroad.png");
  const broad=await (await fetch(`${base}/api/agent-authority/scenarios/AA-002`)).json();
  const broadDecision=runtime.approvals.approve(broad.proposals[0].id,operator,"presentation overprivilege lesson");
  if(broadDecision.status!=="succeeded")throw new Error(`AA-002 screenshot approval failed: ${broadDecision.status}`);

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
  await wait(async()=>await page.locator("#aa-evidence-list li").count()===3);
  await shot(page,"09-agent-authority-aa004-investigation.png");
  await page.locator("#aa-step-action").click();
  const investigated=await (await fetch(`${base}/api/agent-authority/scenarios/AA-004`)).json();
  const investigationDecision=runtime.approvals.approve(investigated.proposals[0].id,operator,"presentation proportional autonomy");
  if(investigationDecision.status!=="succeeded")throw new Error(`AA-004 screenshot approval failed: ${investigationDecision.status}`);

  await choose(page,"AA-005");
  await page.locator("#aa-step-action").click();
  await wait(async()=>(await page.locator("#aa-evidence-list").textContent())?.includes("Boundary denial receipt"));
  await shot(page,"10-agent-authority-aa005-boundary.png");
  await page.locator("#aa-back-to-scenarios").click();
  await wait(async()=>await page.locator("#aa-lab-complete").isVisible());
  await shot(page,"12-agent-authority-lab-complete.png");

  let deskCompleted=false;
  const deskProposal=()=>({id:"proposal_presentation",status:deskCompleted?"consumed":"pending",tool:{name:"grant_object_authority",version:"1"},canonicalAction:{arguments:{library:"PAYROLL",object:"PAYMST",user:"AUDIT",authority:"*USE"}},target:{system:"CLAIMS400"},riskClass:"privilege_change",policy:{id:"lcl-agent-authority",version:"1",decision:"require_approval",matchedRuleIds:["privilege-change-human-review"]},requester:{agentSessionId:"presentation-agent",clientName:"LCL scenario pack",clientVersion:"1"},actionHash:"sha256:5f401cf8a42327c43b380be9eb8c0fca559f9438cb7c8f68c33d86d2bfe84027",precondition:{currentAdvisory:{status:"matches"}},expiresAt:"2026-08-19T23:30:00.000Z",decision:{by:deskCompleted?"QSECOFR":null,reason:deskCompleted?"Least privilege":null},executionStatus:deskCompleted?"succeeded":null,provenance:[],receiptIds:deskCompleted?["receipt_approval","receipt_execution"]:["receipt_required"]});
  const desk=await browser.newPage({viewport:{width:1600,height:1000},deviceScaleFactor:1});
  await desk.route("**/api/lab/session?*",(route)=>route.fulfill({json:{connected:true,lane:"operator",sessionToken:"presentation-token",userName:"QSECOFR",systemName:"CLAIMS400"}}));
  await desk.route("**/api/agent-authority/**",(route)=>{const url=new URL(route.request().url());if(url.pathname.endsWith("/status"))return route.fulfill({json:{target:{system:"CLAIMS400"},pendingCount:deskCompleted?0:1}});if(url.pathname.endsWith("/verify"))return route.fulfill({json:{ok:true,checked:deskCompleted?5:2}});if(url.pathname.endsWith("/receipts"))return route.fulfill({json:{receipts:[{id:"receipt_required",sequence:1,receiptType:"approval_required",createdAt:"2026-08-19T22:13:43.000Z"}]}});if(url.pathname.endsWith("/proposals")){const pendingOnly=url.searchParams.get("status")==="pending";return route.fulfill({json:{proposals:pendingOnly?(deskCompleted?[]:[deskProposal()]):[deskProposal()]}});}return route.fulfill({status:404,json:{error:"Not used by screenshot"}});});
  await desk.goto(`${base}/lab/authority/`);await wait(async()=>await desk.locator("#proposals .proposal-card").count()===1);await shot(desk,"13-authority-desk-pending.png");deskCompleted=true;await desk.getByRole("button",{name:"Refresh"}).click();await wait(async()=>await desk.locator("#history .proposal-card").count()===1);await shot(desk,"14-authority-desk-completed.png");
  closeDatabase();
  await browser.close();
} finally {server.kill("SIGTERM");}
