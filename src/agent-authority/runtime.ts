import { randomUUID } from "node:crypto";
import type { Database as SqliteDatabase } from "better-sqlite3";
import { getDatabase } from "../db/sqlite.js";
import { LclTargetAdapter } from "./adapters/lclTargetAdapter.js";
import { AuthorityBroker } from "./broker/authorityBroker.js";
import { OperatorApprovalService } from "./broker/operatorApprovalService.js";
import { loadPolicy } from "./policy/policyLoader.js";
import type { Clock, IdGenerator } from "./types.js";

export type AgentAuthorityRuntimeOptions={target:string;clock?:Clock;ids?:IdGenerator;principalId?:string};

/** One process-owned domain runtime shared by every enabled transport. */
export type AgentAuthorityRuntime={db:SqliteDatabase;adapter:LclTargetAdapter;broker:AuthorityBroker;approvals:OperatorApprovalService;clock:Clock;ids:IdGenerator;principalId:string;target:"lcl"};

export function createAgentAuthorityRuntime(options:AgentAuthorityRuntimeOptions):AgentAuthorityRuntime {
  if(options.target!=="lcl") throw new Error(`Unsupported LCL_AGENT_TARGET: ${options.target}`);
  const clock=options.clock??{now:()=>new Date()};
  const ids=options.ids??{id:(prefix:string)=>`${prefix}_${randomUUID()}`,nonce:()=>randomUUID()};
  const principalId=options.principalId??`mcp-principal-${randomUUID()}`;
  const db=getDatabase();
  const adapter=new LclTargetAdapter();
  const broker=new AuthorityBroker({db,adapter,policy:loadPolicy("data/agent-authority/policy.v1.json"),clock,ids});
  const approvals=new OperatorApprovalService({db,adapter,clock,ids});
  return {db,adapter,broker,approvals,clock,ids,principalId,target:"lcl" as const};
}
