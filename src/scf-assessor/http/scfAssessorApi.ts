import type http from "node:http";
import {sendJson} from "../../lab/httpServer.js";
import type {AgentAuthorityRuntime} from "../../agent-authority/runtime.js";
import {ScfAssessorService} from "../assessorService.js";

export function createScfAssessorApi(runtime:AgentAuthorityRuntime,systemName:string){
  const service=new ScfAssessorService(runtime,systemName);
  return async(req:http.IncomingMessage,res:http.ServerResponse,url:URL):Promise<{handled:boolean}>=>{
    if(url.pathname==="/api/scf-assessor/assessment"&&req.method==="GET"){
      sendJson(res,200,service.assess());return {handled:true};
    }
    sendJson(res,404,{error:"Not found"});return {handled:true};
  };
}
