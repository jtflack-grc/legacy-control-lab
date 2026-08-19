import type http from "node:http";
import { sessionLane } from "../../ibmi-runtime/sessionLane.js";
import { getLiveSession } from "../../lab/liveSessionRegistry.js";
import { verifyLabSessionTokenForSystem } from "../../lab/sessionRegistry.js";
import {
  countProposals,getApprovalForProposal,getProposal,getReceipt,listProposals,listReceiptIdsForProposal,listReceiptsBounded,type ProposalRecord,type ReceiptRecord,
} from "../../db/repositories/agentAuthorityRepository.js";
import { listObjectAuthorities } from "../../db/repositories/objectAuthorityRepository.js";
import { verifyReceiptChain } from "../evidence/receiptVerifier.js";
import { fingerprint } from "../fingerprint.js";
import type { AgentAuthorityRuntime } from "../runtime.js";
import type { ProposalStatus } from "../types.js";
import { buildProposalProofBundle } from "../proof/proofBuilder.js";
import { verifyProofBundle } from "../proof/proofVerifier.js";
import { AA001DeterministicAgent } from "../scenarios/aa001Runner.js";
import { AA001_INTENT,AA001_MESSAGE,AA001_SCENARIO_ID } from "../scenarios/aa001Fixture.js";
import {ScenarioPackService} from "../scenarios/scenarioPackService.js";
import {requireScenario,type AgentAuthorityScenarioId} from "../scenarios/scenarioCatalog.js";

const STATUSES=new Set<ProposalStatus>(["pending","approved","denied","expired","invalidated","consumed"]);
type HandlerResult={handled:boolean};

export function createAuthorityDeskApi(runtime:AgentAuthorityRuntime,systemName:string) {
  const scenarios=new ScenarioPackService(runtime);
  return async(req:http.IncomingMessage,res:http.ServerResponse,url:URL):Promise<HandlerResult>=>{
    if(!url.pathname.startsWith("/api/agent-authority/")) return {handled:false};
    if(url.pathname==="/api/agent-authority/scenarios"&&req.method==="GET") {
      sendJson(res,200,scenarios.catalog());return {handled:true};
    }
    const scenarioMatch=url.pathname.match(/^\/api\/agent-authority\/scenarios\/(AA-\d{3})$/);
    if(scenarioMatch) {
      try {
        const id=scenarioMatch[1] as AgentAuthorityScenarioId;requireScenario(id);
        if(req.method==="GET")sendJson(res,200,scenarios.project(id));
        else if(req.method==="POST"){
          const body=await readBody(req);rejectExtra(body,new Set(["action"]));
          if(typeof body.action!=="string")throw new Error("INVALID_REQUEST: action required");
          sendJson(res,200,scenarios.act(id,body.action as Parameters<ScenarioPackService["act"]>[1]));
        } else sendJson(res,405,{error:"Method not allowed"});
      } catch(error){const message=error instanceof Error?error.message:"Scenario request failed";sendJson(res,message.startsWith("INVALID_REQUEST")?400:409,{error:message});}
      return {handled:true};
    }
    if(url.pathname==="/api/agent-authority/walkthrough") {
      try {
        if(req.method==="POST") {
          const existing=guidedProposal(runtime);
          if(!existing) {
            const agent=new AA001DeterministicAgent(runtime.broker,runtime.approvals);
            agent.run({requestId:runtime.ids.id("walkthrough"),agentSessionId:runtime.principalId,actorType:"agent",requestedAt:runtime.clock.now().toISOString(),clientName:"lcl-guided-walkthrough",clientVersion:"1"});
          }
        } else if(req.method!=="GET") {sendJson(res,405,{error:"Method not allowed"});return {handled:true};}
        sendJson(res,200,projectWalkthrough(runtime));
      } catch {sendJson(res,409,{error:"Guided walkthrough could not be started"});}
      return {handled:true};
    }
    const auth=authenticate(req,systemName);
    if(!auth.ok){sendJson(res,auth.status,{error:auth.error});return {handled:true};}
    const proposalMatch=url.pathname.match(/^\/api\/agent-authority\/proposals\/([^/]+)$/);
    const receiptMatch=url.pathname.match(/^\/api\/agent-authority\/receipts\/([^/]+)$/);
    const decisionMatch=url.pathname.match(/^\/api\/agent-authority\/proposals\/([^/]+)\/(approve|deny)$/);
    const proofMatch=url.pathname.match(/^\/api\/agent-authority\/proposals\/([^/]+)\/proof$/);
    try {
      if(req.method==="GET"&&url.pathname==="/api/agent-authority/status") {
        sendJson(res,200,{enabled:true,target:{kind:"lcl",system:runtime.adapter.system},pendingCount:countProposals(runtime.db,{status:"pending"}),principal:{type:"synthetic_agent",id:runtime.principalId},operator:{user:auth.session.userName,sessionId:auth.session.id}});
      } else if(req.method==="GET"&&url.pathname==="/api/agent-authority/proposals") {
        const statusValue=url.searchParams.get("status")??undefined;
        if(statusValue&&!STATUSES.has(statusValue as ProposalStatus)){sendJson(res,400,{error:"Invalid proposal status"});return {handled:true};}
        const limit=boundedInt(url.searchParams.get("limit"),50);
        sendJson(res,200,{proposals:listProposals(runtime.db,{status:statusValue as ProposalStatus|undefined,limit}).map((p)=>projectProposal(runtime,p)),limit});
      } else if(req.method==="GET"&&proposalMatch) {
        const proposal=getProposal(runtime.db,decodeURIComponent(proposalMatch[1]!));
        if(!proposal) sendJson(res,404,{error:"Proposal not found"}); else sendJson(res,200,{proposal:projectProposal(runtime,proposal)});
      } else if(req.method==="GET"&&proofMatch) {
        const id=decodeURIComponent(proofMatch[1]!);if(!getProposal(runtime.db,id)){sendJson(res,404,{error:"Proposal not found"});return {handled:true};}const bundle=buildProposalProofBundle(runtime.db,id,runtime);
        sendProofJson(res,bundle,`agent-authority-proof-${safeFilePart(id)}.json`);
      } else if(req.method==="POST"&&decisionMatch) {
        const id=decodeURIComponent(decisionMatch[1]!);const operation=decisionMatch[2]!;
        const proposal=getProposal(runtime.db,id);
        if(!proposal){sendJson(res,404,{error:"Proposal not found"});return {handled:true};}
        const body=await readBody(req);
        if(operation==="approve") {
          if(typeof body.action_hash!=="string"||body.action_hash!==proposal.actionHash){sendJson(res,409,{status:"rejected",proposalId:id,reason:"ACTION_HASH_MISMATCH"});return {handled:true};}
          rejectExtra(body,new Set(["action_hash","reason"]));
          const result=runtime.approvals.approve(id,auth.session,optionalReason(body.reason));
          sendJson(res,result.status==="rejected"?409:200,{...result,proposal:projectProposal(runtime,getProposal(runtime.db,id)!)});
        } else {
          rejectExtra(body,new Set(["reason"]));
          const result=runtime.approvals.deny(id,auth.session,optionalReason(body.reason));
          sendJson(res,result.status==="rejected"?409:200,{...result,proposal:projectProposal(runtime,getProposal(runtime.db,id)!)});
        }
      } else if(req.method==="GET"&&url.pathname==="/api/agent-authority/receipts") {
        const limit=boundedInt(url.searchParams.get("limit"),50);const afterSequence=boundedInt(url.searchParams.get("after_sequence"),0,0);
        sendJson(res,200,{receipts:listReceiptsBounded(runtime.db,{limit,afterSequence}).map(projectReceipt),limit,afterSequence});
      } else if(req.method==="GET"&&receiptMatch) {
        const receipt=getReceipt(runtime.db,decodeURIComponent(receiptMatch[1]!));
        if(!receipt) sendJson(res,404,{error:"Receipt not found"}); else sendJson(res,200,{receipt:projectReceipt(receipt)});
      } else if(req.method==="GET"&&url.pathname==="/api/agent-authority/verify") {
        sendJson(res,200,verifyReceiptChain(runtime.db));
      } else sendJson(res,404,{error:"Not found"});
    } catch(error) {
      const message=error instanceof Error?error.message:String(error);
      sendJson(res,message.startsWith("INVALID_REQUEST")?400:500,{error:message.startsWith("INVALID_REQUEST")?message:"Authority Desk request failed"});
    }
    return {handled:true};
  };
}

function guidedProposal(runtime:AgentAuthorityRuntime):ProposalRecord|undefined {
  return listProposals(runtime.db,{limit:100}).find((proposal)=>{try{return (JSON.parse(proposal.requestContextJson) as Record<string,unknown>).clientName==="lcl-guided-walkthrough";}catch{return false;}});
}

function projectWalkthrough(runtime:AgentAuthorityRuntime):Record<string,unknown> {
  const proposal=guidedProposal(runtime);const current=listObjectAuthorities("CLAIMS400","PAYROLL","PAYMST").find((row)=>row.userName==="APCLERK")?.authority??null;
  if(!proposal)return {scenarioId:AA001_SCENARIO_ID,stage:"OBSERVED",message:AA001_MESSAGE,requestedAction:AA001_INTENT,proposal:null,currentAuthority:current,proof:{available:false,verified:false}};
  const projected=projectProposal(runtime,proposal);const approval=getApprovalForProposal(runtime.db,proposal.id);let evidence:unknown[]=[];
  if(proposal.executionReceiptId){const receipt=getReceipt(runtime.db,proposal.executionReceiptId);try{const payload=JSON.parse(receipt?.payloadJson??"{}");evidence=Array.isArray(payload.system_evidence)?payload.system_evidence:[];}catch{evidence=[];}}
  let proofVerified=false;if(["denied","expired","invalidated","consumed"].includes(proposal.status)){try{proofVerified=verifyProofBundle(buildProposalProofBundle(runtime.db,proposal.id,runtime)).ok;}catch{proofVerified=false;}}
  const stage=proposal.status==="pending"?"HELD":proposal.status==="consumed"&&proposal.executionStatus==="succeeded"?"VERIFIED":"REVIEWED";
  return {scenarioId:AA001_SCENARIO_ID,stage,message:AA001_MESSAGE,requestedAction:AA001_INTENT,proposal:projected,currentAuthority:current,
    humanDecision:proposal.status==="denied"?"denied":proposal.status==="consumed"||proposal.status==="approved"?"approved":"none",
    approver:approval?.approverUser??proposal.decidedBy??null,executor:proposal.executionStatus?"MCPAGENT":null,evidence,proof:{available:["denied","expired","invalidated","consumed"].includes(proposal.status),verified:proofVerified}};
}

function authenticate(req:http.IncomingMessage,systemName:string):{ok:true;session:NonNullable<ReturnType<typeof getLiveSession>>}|{ok:false;status:number;error:string} {
  const raw=req.headers["x-lab-session-token"];const token=Array.isArray(raw)?raw[0]:raw;
  if(!token?.trim()) return {ok:false,status:401,error:"X-Lab-Session-Token required"};
  const snapshot=verifyLabSessionTokenForSystem(systemName,token);
  if(!snapshot) return {ok:false,status:403,error:"Invalid or expired lab session token"};
  const live=getLiveSession(snapshot.sessionId);
  if(!live||!live.signedOn||!live.userName) return {ok:false,status:403,error:"Linked live operator session unavailable"};
  if(live.id!==snapshot.sessionId||live.systemName.toUpperCase()!==snapshot.systemName.toUpperCase()||live.userName.toUpperCase()!==snapshot.userName.toUpperCase())
    return {ok:false,status:403,error:"Session identity mismatch"};
  if(sessionLane(live)!=="operator") return {ok:false,status:403,error:"Operator session required"};
  return {ok:true,session:live};
}

function projectProposal(runtime:AgentAuthorityRuntime,p:ProposalRecord):Record<string,unknown> {
  let advisory:Record<string,unknown>={status:"unavailable"};
  if(p.status==="pending") try {const current=runtime.adapter.snapshot(JSON.parse(p.canonicalActionJson));const identity=fingerprint(current);advisory={status:identity.hash===p.preconditionHash?"matches":"stale",currentHash:identity.hash};} catch {advisory={status:"unavailable"};}
  const request=JSON.parse(p.requestContextJson) as Record<string,unknown>;
  return {id:p.id,status:p.status,createdAt:p.createdAt,expiresAt:p.expiresAt,target:{kind:p.targetKind,system:p.targetSystem},tool:{name:p.toolName,version:p.toolVersion},
    canonicalAction:JSON.parse(p.canonicalActionJson),actionHash:p.actionHash,riskClass:p.riskClass,
    policy:{id:p.policyId,version:p.policyVersion,...JSON.parse(p.policyDecisionJson)},provenance:p.provenanceJson?JSON.parse(p.provenanceJson):[],
    precondition:{hash:p.preconditionHash,summary:JSON.parse(p.preconditionJson),currentAdvisory:advisory},
    requester:{agentSessionId:request.agentSessionId??null,clientName:request.clientName??null,clientVersion:request.clientVersion??null,requestId:request.requestId??null,actorType:request.actorType??null},
    decision:{at:p.decidedAt??null,by:p.decidedBy??null,reason:p.decisionReason??null},executionStatus:p.executionStatus??null,
    receiptIds:listReceiptIdsForProposal(runtime.db,p.id)};
}

function projectReceipt(r:ReceiptRecord):Record<string,unknown> {return {id:r.id,sequence:r.sequence,createdAt:r.createdAt,proposalId:r.proposalId??null,receiptType:r.receiptType,payload:JSON.parse(r.payloadJson),payloadHash:r.payloadHash,previousHash:r.previousHash??null};}
function sendJson(res:http.ServerResponse,status:number,body:unknown):void {res.writeHead(status,{"Content-Type":"application/json; charset=utf-8","Cache-Control":"no-store","X-Content-Type-Options":"nosniff"});res.end(JSON.stringify(body));}
function sendProofJson(res:http.ServerResponse,body:unknown,fileName:string):void {res.writeHead(200,{"Content-Type":"application/json; charset=utf-8","Content-Disposition":`attachment; filename="${fileName}"`,"Cache-Control":"no-store","X-Content-Type-Options":"nosniff"});res.end(JSON.stringify(body));}
function safeFilePart(value:string):string{return value.replace(/[^A-Za-z0-9._-]/g,"_").slice(0,100)||"proposal";}
function boundedInt(value:string|null,fallback:number,min=1):number {if(value===null)return fallback;const n=Number(value);if(!Number.isInteger(n)||n<min)return fallback;return Math.min(100,n);}
async function readBody(req:http.IncomingMessage):Promise<Record<string,unknown>> {const chunks:Buffer[]=[];let size=0;for await(const chunk of req){const b=Buffer.from(chunk);size+=b.length;if(size>16_384)throw new Error("INVALID_REQUEST: body too large");chunks.push(b);}if(!chunks.length)return {};try{const value=JSON.parse(Buffer.concat(chunks).toString("utf8"));if(!value||typeof value!=="object"||Array.isArray(value))throw new Error();return value;}catch{throw new Error("INVALID_REQUEST: JSON object required");}}
function rejectExtra(body:Record<string,unknown>,allowed:Set<string>):void {if(Object.keys(body).some((key)=>!allowed.has(key)))throw new Error("INVALID_REQUEST: unsupported decision field");}
function optionalReason(value:unknown):string|undefined {if(value===undefined)return undefined;if(typeof value!=="string"||value.length>500)throw new Error("INVALID_REQUEST: reason must be a string of at most 500 characters");return value;}
