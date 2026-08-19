import {spawn} from "node:child_process";
import {rmSync} from "node:fs";
import {chromium} from "playwright";

const root=new URL("..",import.meta.url).pathname;const database="/tmp/lcl-agent-authority-screenshots.db";rmSync(database,{force:true});
const server=spawn(process.execPath,["dist/server.js"],{cwd:root,env:{...process.env,DATABASE_PATH:database,LCL_AGENT_AUTHORITY_ENABLED:"true",HTTP_PORT:"8080",WEBSOCKIFY_PORT:"6080",TN5250_PORT:"8023"},stdio:"inherit"});
const wait=async(test,timeout=20_000)=>{const end=Date.now()+timeout;while(Date.now()<end){try{if(await test())return;}catch{}await new Promise((resolve)=>setTimeout(resolve,250));}throw new Error("Timed out waiting for screenshot state");};
try{
  await wait(async()=>(await fetch("http://127.0.0.1:8080/api/health")).ok);
  const browser=await chromium.launch({headless:true,...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH?{executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH}:{}),args:["--no-sandbox"]});
  const page=await browser.newPage({viewport:{width:1600,height:1000},deviceScaleFactor:1});await page.addInitScript(()=>localStorage.setItem("lab.launcher.introduced","1"));await page.goto("http://127.0.0.1:8080/lab/");await page.locator("#pick-agent-authority").click();await wait(async()=>await page.locator("#agent-authority-panel").isVisible());
  await page.waitForTimeout(2000);await page.screenshot({path:`${root}/public/assets/screenshots/03-agent-authority-overview.png`,fullPage:true});
  await page.locator("#aa-step-action").click();await wait(async()=>(await page.locator("#aa-status").textContent())?.includes("Awaiting decision"));await page.waitForTimeout(1000);await page.screenshot({path:`${root}/public/assets/screenshots/04-agent-authority-pending.png`,fullPage:true});
  const guided=await (await fetch("http://127.0.0.1:8080/api/agent-authority/walkthrough")).json();
  const [{initDatabase,closeDatabase},{createAgentAuthorityRuntime},{createSession,hydrateSessionFromProfile}]=await Promise.all([import("../dist/db/sqlite.js"),import("../dist/agent-authority/runtime.js"),import("../dist/ibmi-runtime/sessionService.js")]);
  initDatabase({path:database});const runtime=createAgentAuthorityRuntime({target:"lcl",principalId:"screenshot-agent"});const operator=createSession("CLAIMS400");operator.signedOn=true;operator.userName="QSECOFR";operator.job.user="QSECOFR";hydrateSessionFromProfile(operator,"QSECOFR","CLAIMS400");const decision=runtime.approvals.approve(guided.proposal.id,operator,"presentation walkthrough");if(decision.status!=="succeeded")throw new Error(`Screenshot approval failed: ${decision.status}`);
  await page.goto("http://127.0.0.1:8080/lab/?path=agentauthority");await wait(async()=>(await page.locator("#aa-status").textContent())?.includes("proof verified"));await page.locator("#aa-step-action").click();await page.locator("#aa-evidence-card").scrollIntoViewIfNeeded();await page.waitForTimeout(1000);await page.screenshot({path:`${root}/public/assets/screenshots/05-agent-authority-complete.png`,fullPage:true});closeDatabase();
  await browser.close();
} finally {server.kill("SIGTERM");}
