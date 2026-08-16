import { randomUUID } from "node:crypto";
import type http from "node:http";
import { CLIENT_INFO_META_KEY, createMcpHandler, McpServer, type ServerContext } from "@modelcontextprotocol/server";
import { localhostHostValidation, localhostOriginValidation, toNodeHandler } from "@modelcontextprotocol/node";
import { z } from "zod/v4";
import { getDatabase } from "../../db/sqlite.js";
import { LclTargetAdapter } from "../adapters/lclTargetAdapter.js";
import { AuthorityBroker, type BrokerResult, type ObservedProvenanceReference } from "../broker/authorityBroker.js";
import { loadPolicy } from "../policy/policyLoader.js";
import { authorityToolRegistry } from "../toolRegistry.js";
import type { ActionContext, Clock, IdGenerator } from "../types.js";

const TOOL_NAMES=["inspect_user_profile","inspect_object_authority","list_recent_audit_events","read_operational_messages","grant_object_authority","get_action_status"] as const;
const source=z.object({source_id:z.string().min(1),content_hash:z.string().min(1).optional()}).strict();
const schemas={
  inspect_user_profile:z.object({user:z.string()}).strict(),
  inspect_object_authority:z.object({library:z.string(),object:z.string(),user:z.string()}).strict(),
  list_recent_audit_events:z.object({user:z.string(),limit:z.number().int().min(1).max(100)}).strict(),
  read_operational_messages:z.object({limit:z.number().int().min(1).max(50)}).strict(),
  grant_object_authority:z.object({library:z.string(),object:z.string(),user:z.string(),authority:z.enum(["*USE","*CHANGE","*ALL","*EXCLUDE"]),used_sources:z.array(source).max(50).optional()}).strict(),
  get_action_status:z.object({proposal_id:z.string().min(1)}).strict(),
} as const;

export type McpRuntimeOptions={target:string;clock?:Clock;ids?:IdGenerator;principalId?:string;rateLimit?:number;rateWindowMs?:number};
export function createAgentAuthorityMcpRuntime(options:McpRuntimeOptions) {
  if(options.target!=="lcl") throw new Error(`Unsupported LCL_AGENT_TARGET: ${options.target}`);
  const clock=options.clock??{now:()=>new Date()};
  const ids=options.ids??{id:(prefix:string)=>`${prefix}_${randomUUID()}`,nonce:()=>randomUUID()};
  const principalId=options.principalId??`mcp-principal-${randomUUID()}`;
  const adapter=new LclTargetAdapter();
  const broker=new AuthorityBroker({db:getDatabase(),adapter,policy:loadPolicy("data/agent-authority/policy.v1.json"),clock,ids});
  const mcp=createMcpHandler(()=>buildServer(broker,clock,ids,principalId));
  const node=toNodeHandler(mcp);
  const validateHost=localhostHostValidation();const validateOrigin=localhostOriginValidation();
  const guard=new RequestRateGuard(options.rateLimit??120,options.rateWindowMs??60_000,clock);
  const nodeHandler=async(req:http.IncomingMessage,res:http.ServerResponse)=>{
    if(!validateHost(req,res)||!validateOrigin(req,res)) return;
    if(!guard.take()) {res.writeHead(429,{"Content-Type":"application/json","Retry-After":"60"});res.end('{"error":"MCP rate limit exceeded"}');return;}
    await node(req,res);
  };
  return {nodeHandler,toolNames:[...TOOL_NAMES],principalId,close:()=>mcp.close()};
}

function buildServer(broker:AuthorityBroker,clock:Clock,ids:IdGenerator,principalId:string):McpServer {
  const server=new McpServer({name:"legacy-control-lab-agent-authority",version:"1.0.0"},{capabilities:{tools:{}}});
  for(const name of TOOL_NAMES) {
    const definition=authorityToolRegistry.require(name,"1");
    server.registerTool(name,{title:definition.title,description:definition.description,inputSchema:schemas[name],annotations:definition.mcpAnnotations},
      async(input:unknown,ctx:ServerContext)=>toolResult(broker,name,input as Record<string,unknown>,contextFor(ctx,clock,ids,principalId)));
  }
  return server;
}

function toolResult(broker:AuthorityBroker,name:typeof TOOL_NAMES[number],input:Record<string,unknown>,context:ActionContext) {
  const raw={...input};const used=(raw.used_sources as {source_id:string;content_hash?:string}[]|undefined)??[];delete raw.used_sources;
  const refs:ObservedProvenanceReference[]=used.map((item)=>({sourceId:item.source_id,...(item.content_hash?{contentHash:item.content_hash}:{})}));
  const result=broker.request(name,"1",raw,context,refs);const structured=boundedResult(result);
  const text=result.status==="approval_required"?"Human approval is required before this action can execute.":`Agent Authority result: ${result.status}`;
  return {content:[{type:"text" as const,text}],structuredContent:structured};
}

function boundedResult(result:BrokerResult):Record<string,unknown> {
  if(result.status==="allowed") return {status:result.status,data:result.data,provenance:result.provenance,receipt_id:result.receiptId};
  if(result.status==="approval_required") return {status:result.status,proposal_id:result.proposalId,action_hash:result.actionHash,expires_at:result.expiresAt,receipt_id:result.receiptId};
  if(result.status==="found") return {status:result.status,found:Boolean(result.proposal),proposal_id:result.proposal?.id??null,
    proposal_status:result.proposal?.status??null,execution_status:result.proposal?.executionStatus??null,receipt_id:result.receiptId};
  return {status:result.status,reason:result.reason,receipt_id:result.receiptId};
}
function contextFor(ctx:ServerContext,clock:Clock,ids:IdGenerator,principalId:string):ActionContext {
  const envelope=ctx.mcpReq.envelope as Record<string,unknown>|undefined;
  const info=envelope?.[CLIENT_INFO_META_KEY] as {name?:unknown;version?:unknown}|undefined;
  return {requestId:ids.id("mcp_req"),agentSessionId:principalId,actorType:"agent",requestedAt:clock.now().toISOString(),
    ...(typeof info?.name==="string"?{clientName:info.name}:{}),...(typeof info?.version==="string"?{clientVersion:info.version}:{})};
}

export class RequestRateGuard {
  private windowStart=0;private count=0;
  constructor(private readonly limit:number,private readonly windowMs:number,private readonly clock:Clock) {if(limit<1) throw new Error("rate limit must be positive");}
  take():boolean {const now=this.clock.now().getTime();if(now-this.windowStart>=this.windowMs){this.windowStart=now;this.count=0;}return ++this.count<=this.limit;}
}
