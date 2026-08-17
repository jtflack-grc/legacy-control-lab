import "dotenv/config";
import { writeFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { initDatabase,closeDatabase } from "../../db/sqlite.js";
import { canonicalize } from "../canonicalize.js";
import { buildProposalProofBundle } from "./proofBuilder.js";

const args=process.argv.slice(2);const proposal=value(args,"--proposal");const out=value(args,"--out");
if(!proposal||!out){console.error(JSON.stringify({ok:false,error:"usage: --proposal <id> --out <path>"}));process.exitCode=2;}else{
  try {const db=initDatabase();const bundle=buildProposalProofBundle(db,proposal,{clock:{now:()=>new Date()},ids:{id:(prefix)=>`${prefix}_${randomUUID()}`,nonce:()=>randomUUID()}});writeFileSync(out,`${canonicalize(bundle)}\n`,{encoding:"utf8",flag:"wx"});writeFileSync(`${out}.sha256`,`${bundle.bundleHash}\n`,{encoding:"utf8",flag:"wx"});console.log(JSON.stringify({ok:true,path:out,bundleId:bundle.bundleId,bundleHash:bundle.bundleHash,proposalId:proposal}));}catch(error){console.error(JSON.stringify({ok:false,error:error instanceof Error?error.message:String(error)}));process.exitCode=1;}finally{closeDatabase();}
}
function value(args:string[],name:string):string|undefined {const index=args.indexOf(name);return index>=0?args[index+1]:undefined;}
