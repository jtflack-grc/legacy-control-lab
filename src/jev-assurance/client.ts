import type {JevRequest,JevResponse} from "./types.js";

export async function evaluateWithJev(request:JevRequest,apiKey:string):Promise<{response:JevResponse;elapsedMs:number}>{
  const started=performance.now();
  const response=await fetch("https://api.typesafe.ai/v1/systemone",{method:"POST",headers:{Authorization:`Bearer ${apiKey}`,"Content-Type":"application/json"},body:JSON.stringify(request),signal:AbortSignal.timeout(30_000)});
  const body=await response.text();
  if(!response.ok)throw new Error(`TypeSafe API ${response.status}: ${body.slice(0,500)}`);
  return {response:JSON.parse(body) as JevResponse,elapsedMs:Number((performance.now()-started).toFixed(1))};
}
