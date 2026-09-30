import { readFileSync } from "node:fs";
import { verifyProofBundle } from "./proofVerifier.js";

const path=process.argv[2];
if(!path){console.error(JSON.stringify({ok:false,error:"usage: agent:proof:verify <proof.json>"}));process.exitCode=2;}else{
  try {const parsed=JSON.parse(readFileSync(path,"utf8")) as unknown;const result=verifyProofBundle(parsed);console.log(JSON.stringify(result));process.exitCode=result.ok?0:1;}catch(error){console.error(JSON.stringify({ok:false,error:error instanceof Error?error.message:String(error)}));process.exitCode=1;}
}
