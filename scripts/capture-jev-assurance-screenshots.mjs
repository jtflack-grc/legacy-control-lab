import {spawn,spawnSync} from "node:child_process";
import {createServer} from "node:http";
import {copyFileSync,existsSync,mkdirSync,readFileSync,statSync} from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";
import {chromium} from "playwright";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
const output=path.join(root,"artifacts/jev-assurance/jev-assurance-package.json");
const fixture=process.argv.includes("--fixture");
const args=["dist/jev-assurance/cli.js","--out",output,...(fixture?["--fixture"]:[])];
const run=spawnSync(process.execPath,args,{cwd:root,env:process.env,encoding:"utf8"});
if(run.status!==0)throw new Error(run.stderr||run.stdout||"Jev experiment failed");
if(!existsSync(output))throw new Error("Jev evidence package was not created");
copyFileSync(output,path.join(root,"public/jev-assurance/evidence.json"));
mkdirSync(path.join(root,"public/assets/screenshots"),{recursive:true});

const publicRoot=path.join(root,"public");
const mime={".html":"text/html",".css":"text/css",".js":"text/javascript",".json":"application/json",".png":"image/png"};
const server=createServer((request,response)=>{
  const url=new URL(request.url??"/","http://127.0.0.1");
  const relative=url.pathname==="/"?"jev-assurance/index.html":url.pathname.replace(/^\//,"");
  const target=path.resolve(publicRoot,relative);
  if(!target.startsWith(publicRoot)||!existsSync(target)||!statSync(target).isFile()){response.writeHead(404);response.end("not found");return;}
  response.writeHead(200,{"Content-Type":mime[path.extname(target)]??"application/octet-stream"});response.end(readFileSync(target));
});
await new Promise(resolve=>server.listen(8099,"127.0.0.1",resolve));
try{
  const browser=await chromium.launch({headless:true,...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH?{executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH}:{}),args:["--no-sandbox"]});
  const page=await browser.newPage({viewport:{width:1600,height:1100},deviceScaleFactor:1});
  await page.goto("http://127.0.0.1:8099/jev-assurance/index.html",{waitUntil:"networkidle"});
  await page.locator("#states .state").first().waitFor();
  await page.screenshot({path:path.join(root,"public/assets/screenshots/17-jev-assurance-boundary-comparison.png"),fullPage:true});
  await page.locator("#states").screenshot({path:path.join(root,"public/assets/screenshots/18-jev-assurance-three-states.png")});
  await browser.close();
}finally{await new Promise(resolve=>server.close(resolve));}
console.log(run.stdout);
