import {mkdirSync,writeFileSync} from "node:fs";
import path from "node:path";
import {canonicalize,sha256} from "./canonical.js";
import {evaluateWithJev} from "./client.js";
import {fixtureResponses,runExperiment} from "./experiment.js";

const args=new Set(process.argv.slice(2));
const fixture=args.has("--fixture");
const apiKey=process.env.TYPESAFE_API_KEY;
if(!fixture&&!apiKey)throw new Error("TYPESAFE_API_KEY is required for a live run. Use --fixture only for tests and UI development.");
const model=process.env.JEV_MODEL??"jev-latest";
const outputIndex=process.argv.indexOf("--out");
const output=path.resolve(outputIndex>=0&&process.argv[outputIndex+1]?process.argv[outputIndex+1]!:"artifacts/jev-assurance/jev-assurance-package.json");
const evidence=await runExperiment({mode:fixture?"fixture":"live",model,evaluator:fixture?async(_request,stateId)=>({response:structuredClone(fixtureResponses[stateId]!),elapsedMs:0}):async(request)=>evaluateWithJev(request,apiKey!)});
mkdirSync(path.dirname(output),{recursive:true});
const contents=`${canonicalize(evidence)}\n`;
writeFileSync(output,contents);
writeFileSync(`${output}.sha256`,`${sha256(contents)}\n`);
console.log(JSON.stringify({ok:true,mode:evidence.mode,output,packageHash:evidence.integrity.packageHash,runs:evidence.runs.map((run)=>({stateId:run.stateId,model:run.response.model,elapsedMs:run.elapsedMs,answers:run.response.answers}))},null,2));
