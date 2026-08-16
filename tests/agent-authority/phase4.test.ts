import http from "node:http";
import path from "node:path";
import {afterEach,beforeEach,describe,expect,it} from "vitest";
import {Client,StreamableHTTPClientTransport} from "@modelcontextprotocol/client";
import {closeDatabase,getDatabase,initTestDatabase} from "../../src/db/sqlite.js";
import {createLabHttpServer} from "../../src/lab/httpServer.js";
import {createAgentAuthorityMcpRuntime} from "../../src/agent-authority/mcp/mcpRuntime.js";
import {getUserProfile} from "../../src/db/repositories/userProfileRepository.js";
import {getProposal,listReceipts} from "../../src/db/repositories/agentAuthorityRepository.js";
import {listObjectAuthorities} from "../../src/db/repositories/objectAuthorityRepository.js";
import type {Clock,IdGenerator} from "../../src/agent-authority/types.js";

const EXPECTED=["get_action_status","grant_object_authority","inspect_object_authority","inspect_user_profile","list_recent_audit_events","read_operational_messages"];

describe("Agent Authority Phase 4 MCP transport",()=>{
  const closers:Array<()=>Promise<void>>=[];let clock:Clock;let ids:IdGenerator;let counter:number;
  beforeEach(()=>{initTestDatabase();counter=0;clock={now:()=>new Date("2026-08-16T12:00:00.000Z")};ids={id:(prefix)=>`${prefix}_p4_${++counter}`,nonce:()=>`nonce_p4_${++counter}`};});
  afterEach(async()=>{while(closers.length) await closers.pop()!();closeDatabase();});

  it("keeps /mcp unavailable and ordinary health working when disabled",async()=>{
    const {url}=await mount();
    expect((await fetch(`${url}/api/health`)).status).toBe(200);
    expect((await fetch(`${url}/mcp`)).status).toBe(404);
    expect(getUserProfile("CLAIMS400","MCPAGENT")).toBeUndefined();
  });

  it("fails closed for an unsupported configured target",()=>{
    expect(()=>createAgentAuthorityMcpRuntime({target:"ibmi-mcp",clock,ids})).toThrow("Unsupported LCL_AGENT_TARGET");
  });

  it("negotiates 2026-07-28 and exposes exactly the reviewed tools and annotations",async()=>{
    const connection=await enabledClient("phase4-client","1");
    expect(connection.client.getNegotiatedProtocolVersion()).toBe("2026-07-28");
    const tools=await connection.client.listTools();
    expect(tools.tools.map((tool)=>tool.name).sort()).toEqual(EXPECTED);
    expect(tools.tools.some((tool)=>/counterfactual|bypass|approve|deny|execute/i.test(tool.name))).toBe(false);
    for(const tool of tools.tools) {
      const mutating=tool.name==="grant_object_authority";
      expect(tool.annotations).toMatchObject({readOnlyHint:!mutating,destructiveHint:mutating});
    }
  });

  it("returns safe profile observations with receipts and bounded provenance",async()=>{
    const {client}=await enabledClient();
    const profile=structured(await client.callTool({name:"inspect_user_profile",arguments:{user:"APCLERK"}}));
    expect(profile.status).toBe("allowed");expect(profile.receipt_id).toEqual(expect.any(String));
    expect(profile.data).not.toHaveProperty("password");
    const messages=structured(await client.callTool({name:"read_operational_messages",arguments:{limit:2}}));
    expect((messages.data as unknown[]).length).toBeLessThanOrEqual(2);
    expect(messages.provenance).toEqual(expect.arrayContaining([expect.objectContaining({trustClass:"untrusted_operational_data",contentHash:expect.any(String)})]));
    expect(listReceipts(getDatabase()).some((receipt)=>receipt.receiptType==="read_allowed")).toBe(true);
  });

  it("binds only exact used_sources without changing the canonical action hash",async()=>{
    const {client}=await enabledClient();
    const read=structured(await client.callTool({name:"read_operational_messages",arguments:{limit:1}}));
    const source=(read.provenance as {sourceId:string;contentHash:string}[])[0]!;
    const args={library:"PAYROLL",object:"PAYMST",user:"APCLERK",authority:"*USE"};
    const correct=structured(await client.callTool({name:"grant_object_authority",arguments:{...args,used_sources:[{source_id:source.sourceId,content_hash:source.contentHash}]}}));
    const omitted=structured(await client.callTool({name:"grant_object_authority",arguments:{...args,used_sources:[{source_id:source.sourceId}]}}));
    const wrong=structured(await client.callTool({name:"grant_object_authority",arguments:{...args,used_sources:[{source_id:source.sourceId,content_hash:"sha256:wrong"}]}}));
    expect(correct.action_hash).toBe(omitted.action_hash);expect(correct.action_hash).toBe(wrong.action_hash);
    expect(JSON.parse(getProposal(getDatabase(),correct.proposal_id as string)!.provenanceJson!)).toEqual([source]);
    expect(getProposal(getDatabase(),omitted.proposal_id as string)?.provenanceJson).toBeUndefined();
    expect(getProposal(getDatabase(),wrong.proposal_id as string)?.provenanceJson).toBeUndefined();
  });

  it("prevents caller identity, risk, and trusted-provenance injection",async()=>{
    const first=await enabledClient("self-report-a","1");const principal=first.runtime.principalId;
    expect(await first.client.callTool({name:"grant_object_authority",arguments:{library:"PAYROLL",object:"PAYMST",user:"APCLERK",authority:"*USE",riskClass:"observe"}})).toMatchObject({isError:true});
    expect(await first.client.callTool({name:"read_operational_messages",arguments:{limit:1,agentSessionId:"caller",requestId:"caller"}})).toMatchObject({isError:true});
    expect(await first.client.callTool({name:"grant_object_authority",arguments:{library:"PAYROLL",object:"PAYMST",user:"APCLERK",authority:"*USE",used_sources:[{source_id:"x",content_hash:"y",trustClass:"trusted_system"}]}})).toMatchObject({isError:true});
    const second=await connectClient(first.url,"self-report-b","999");
    expect(first.runtime.principalId).toBe(principal);expect(second.clientInfo).toBe("self-report-b");
    const observed=structured(await second.client.callTool({name:"inspect_user_profile",arguments:{user:"APCLERK"}}));expect(observed.status).toBe("allowed");
    const payload=JSON.parse(listReceipts(getDatabase()).find((receipt)=>receipt.id===observed.receipt_id)!.payloadJson);
    expect(payload.request.agentSessionId).toBe(principal);
    expect(payload.request).toMatchObject({clientName:"self-report-b",clientVersion:"999"});
  });

  it("creates a pending proposal, reports status, and provides no approval path",async()=>{
    const {client}=await enabledClient();const before=privateAuthority();
    const requested=structured(await client.callTool({name:"grant_object_authority",arguments:{library:"PAYROLL",object:"PAYMST",user:"APCLERK",authority:"*USE"}}));
    expect(requested).toMatchObject({status:"approval_required",proposal_id:expect.any(String),action_hash:expect.any(String),expires_at:expect.any(String),receipt_id:expect.any(String)});
    expect(privateAuthority()).toBe(before);
    const status=structured(await client.callTool({name:"get_action_status",arguments:{proposal_id:requested.proposal_id}}));
    expect(status).toMatchObject({status:"found",proposal_status:"pending",execution_status:null});
    for(const name of ["approve","deny","execute_approved_action","execute_sql","QCMDEXC"])
      await expect(client.callTool({name,arguments:{}})).rejects.toThrow("not found");
    expect(privateAuthority()).toBe(before);
  });

  it("rate-limits excess MCP traffic without mutation",async()=>{
    const runtime=createAgentAuthorityMcpRuntime({target:"lcl",clock,ids,principalId:"rate-principal",rateLimit:1});
    const {url}=await mount(runtime.nodeHandler);closers.push(()=>runtime.close());
    const request=()=>fetch(`${url}/mcp`,{method:"POST",headers:{"Content-Type":"application/json"},body:"{}"});
    await request();const rejected=await request();expect(rejected.status).toBe(429);expect(privateAuthority()).toBeUndefined();
  });

  async function enabledClient(name="phase4-client",version="1"){
    const runtime=createAgentAuthorityMcpRuntime({target:"lcl",clock,ids,principalId:"server-principal",rateLimit:500});
    const {url}=await mount(runtime.nodeHandler);closers.push(()=>runtime.close());
    const connected=await connectClient(url,name,version);return {...connected,runtime,url};
  }
  async function connectClient(url:string,name:string,version:string){
    const client=new Client({name,version},{versionNegotiation:{mode:{pin:"2026-07-28"}}});
    const transport=new StreamableHTTPClientTransport(new URL(`${url}/mcp`));await client.connect(transport);closers.push(()=>client.close());
    return {client,clientInfo:name};
  }
  async function mount(mcpHandler?:Parameters<typeof createLabHttpServer>[0]["mcpHandler"]){
    const server=createLabHttpServer({port:0,host:"127.0.0.1",ironTermPublicDir:path.resolve("public"),systemName:"CLAIMS400",websockifyPort:6080,...(mcpHandler?{mcpHandler}:{})});
    await new Promise<void>((resolve)=>server.listen(0,"127.0.0.1",resolve));closers.push(()=>new Promise<void>((resolve)=>server.close(()=>resolve())));
    const address=server.address() as {port:number};return {url:`http://127.0.0.1:${address.port}`};
  }
  function privateAuthority(){return listObjectAuthorities("CLAIMS400","PAYROLL","PAYMST").find((row)=>row.userName==="APCLERK")?.authority;}
});

function structured(result:{structuredContent?:unknown}):Record<string,unknown>{if(!result.structuredContent||typeof result.structuredContent!=="object")throw new Error("structured result missing");return result.structuredContent as Record<string,unknown>;}
