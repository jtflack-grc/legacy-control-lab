import type {JevAnswer,JevAssurancePackage,JevQuestion,JevRequest,JevResponse,JevRun,StatePackage} from "./types.js";
import {canonicalize,sha256} from "./canonical.js";

export const questions:Record<string,JevQuestion>={
  excessive_access:{
    type:"noul",
    instructions:"Does JSMITH's combined effective access to PAYLIB/PAYMST appear broader than the approved payroll-clerk function requires?",
    criteria:{true:"The represented paths permit materially broader access than the approved function requires.",false:"The represented paths are limited to the approved function, or the supplied state does not establish broader access."}
  },
  activity_classification:{
    type:"choice",
    instructions:"Classify the represented PAYMST access activity using only the supplied state.",
    criteria:{
      routine_activity:"Activity consistent with the approved payroll-clerk function and operating window.",
      approved_change:"A separately approved change to authority or protected state.",
      emergency_intervention:"Time-critical privileged activity supported by an emergency authorization.",
      unexplained_privileged_use:"Privileged or exceptional activity not explained by the supplied approvals and operating context."
    }
  },
  evidence_strength:{
    type:"score",
    instructions:"How strongly does the supplied state support a conclusion about JSMITH's effective access to PAYLIB/PAYMST?",
    criteria:[
      "Insufficient: identity or target is unclear.",
      "Fragmentary: one authority fact is present but material paths are absent.",
      "Partial: several paths are represented, with material exclusions or time gaps.",
      "Strong: the relevant authority and activity paths are represented with provenance, but completeness is not independently proven.",
      "Complete: all material paths, interval coverage, provenance, and independent completeness checks are demonstrated."
    ]
  }
};

const provenance={system:"CLAIMS400",partition:"LCL-DEMO",collectedAt:"2026-10-09T11:30:00.000Z",interval:{from:"2026-10-01T00:00:00.000Z",to:"2026-10-09T11:30:00.000Z"},collector:"LCLJEV",queryVersion:"jev-state/v1",transformationVersion:"jev-transform/v1"};
const subject={user:"JSMITH",role:"Payroll clerk",approvedFunction:"Update payroll through PAYENTRY from 08:00 to 18:00 ET",target:{system:"CLAIMS400",library:"PAYLIB",object:"PAYMST",type:"*FILE"}};

export const statePackages:StatePackage[]=[
  {
    id:"direct_only",title:"Direct authority only",boundary:"One private-authority observation",knownExclusions:["Primary and supplemental groups","Authorization-list membership and grants","Object ownership and *PUBLIC authority","Adopted-authority program paths","Special authorities","QAUDJRN activity and interval coverage"],
    state:{claim:"Evaluate JSMITH access to PAYLIB/PAYMST.",subject,observation:{source:"QSYS2.OBJECT_PRIVILEGES",privateAuthority:null,statement:"JSMITH has no private authority to PAYLIB/PAYMST."},provenance:{...provenance,sourceServices:["QSYS2.OBJECT_PRIVILEGES"]}}
  },
  {
    id:"authority_path",title:"Effective authority path",boundary:"Identity, object and execution paths",knownExclusions:["QAUDJRN activity","Independent proof that every access path is represented"],
    state:{claim:"Evaluate JSMITH access to PAYLIB/PAYMST.",subject,identity:{status:"*ENABLED",specialAuthorities:[],primaryGroup:"PAYCLERK",supplementalGroups:["PAYROLLGRP"],limitedCapability:"*YES"},object:{owner:"PAYOWNER",publicAuthority:"*EXCLUDE",authorizationList:"PAYDATA",privateAuthority:null},authorizationPath:{authorizationList:"PAYDATA",group:"PAYROLLGRP",authority:"*CHANGE",dataAuthorities:["*READ","*ADD","*UPD","*DLT"]},applicationPath:{program:"PAYLIB/PAYENTRY",adoptsAuthority:true,owner:"PAYOWNER",exposedFunction:"Update payroll record"},provenance:{...provenance,sourceServices:["QSYS2.USER_INFO","QSYS2.GROUP_PROFILE_ENTRIES","QSYS2.OBJECT_PRIVILEGES","QSYS2.AUTHORIZATION_LIST_USER_INFO","QSYS2.PROGRAM_INFO"]}}
  },
  {
    id:"authority_plus_activity",title:"Authority path plus activity",boundary:"Identity, object, execution and observed activity paths",knownExclusions:["Independent proof that every access path and journal receiver is represented"],
    state:{claim:"Evaluate JSMITH access to PAYLIB/PAYMST.",subject,identity:{status:"*ENABLED",specialAuthorities:[],primaryGroup:"PAYCLERK",supplementalGroups:["PAYROLLGRP"],limitedCapability:"*YES"},object:{owner:"PAYOWNER",publicAuthority:"*EXCLUDE",authorizationList:"PAYDATA",privateAuthority:null},authorizationPath:{authorizationList:"PAYDATA",group:"PAYROLLGRP",authority:"*CHANGE",dataAuthorities:["*READ","*ADD","*UPD","*DLT"]},applicationPath:{program:"PAYLIB/PAYENTRY",adoptsAuthority:true,owner:"PAYOWNER",exposedFunction:"Update payroll record"},observedActivity:{source:"QAUDJRN",entryType:"ZC",timestamp:"2026-10-08T23:42:11-04:00",job:"947311/JSMITH/QPADEV0007",operation:"UPDDTA against PAYLIB/PAYMST",approvedChange:null,emergencyAuthorization:null,insideApprovedWindow:false},provenance:{...provenance,sourceServices:["QSYS2.USER_INFO","QSYS2.GROUP_PROFILE_ENTRIES","QSYS2.OBJECT_PRIVILEGES","QSYS2.AUTHORIZATION_LIST_USER_INFO","QSYS2.PROGRAM_INFO","QSYS2.DISPLAY_JOURNAL"],journalReceivers:["QAUDJRN/RCV00042"],receiverContinuity:"represented, not independently attested"}}
  }
];

export const fixtureResponses:Record<string,JevResponse>={
  direct_only:{model:"fixture-not-jev",answers:{excessive_access:{type:"noul",noul:0.18},activity_classification:{type:"choice",choice:"routine_activity",confidence:0.41,probabilities:{routine_activity:0.41,approved_change:0.12,emergency_intervention:0.08,unexplained_privileged_use:0.39}},evidence_strength:{type:"score",score:1.12,confidence:0.86,legend:{"0":"Insufficient","1":"Fragmentary","2":"Partial","3":"Strong","4":"Complete"},probabilities:{"0":0.08,"1":0.74,"2":0.16,"3":0.02,"4":0}}},usage:{input_tokens:0,output_tokens:0}},
  authority_path:{model:"fixture-not-jev",answers:{excessive_access:{type:"noul",noul:0.77},activity_classification:{type:"choice",choice:"unexplained_privileged_use",confidence:0.46,probabilities:{routine_activity:0.34,approved_change:0.08,emergency_intervention:0.12,unexplained_privileged_use:0.46}},evidence_strength:{type:"score",score:2.56,confidence:0.78,legend:{"0":"Insufficient","1":"Fragmentary","2":"Partial","3":"Strong","4":"Complete"},probabilities:{"0":0.01,"1":0.05,"2":0.36,"3":0.53,"4":0.05}}},usage:{input_tokens:0,output_tokens:0}},
  authority_plus_activity:{model:"fixture-not-jev",answers:{excessive_access:{type:"noul",noul:0.94},activity_classification:{type:"choice",choice:"unexplained_privileged_use",confidence:0.91,probabilities:{routine_activity:0.03,approved_change:0.02,emergency_intervention:0.04,unexplained_privileged_use:0.91}},evidence_strength:{type:"score",score:3.01,confidence:0.82,legend:{"0":"Insufficient","1":"Fragmentary","2":"Partial","3":"Strong","4":"Complete"},probabilities:{"0":0,"1":0.01,"2":0.12,"3":0.73,"4":0.14}}},usage:{input_tokens:0,output_tokens:0}}
};

type Evaluator=(request:JevRequest,stateId:string)=>Promise<{response:JevResponse;elapsedMs:number}>;

function metric(answer:JevAnswer):string|number{
  if(answer.type==="noul")return answer.noul;
  if(answer.type==="choice")return answer.choice;
  return answer.score;
}

export async function runExperiment(params:{mode:"live"|"fixture";model:string;evaluator:Evaluator;now?:()=>Date}):Promise<JevAssurancePackage>{
  const runs:JevRun[]=[];
  for(const statePackage of statePackages){
    const request:JevRequest={model:params.model,state:statePackage.state,questions};
    const {response,elapsedMs}=await params.evaluator(request,statePackage.id);
    runs.push({stateId:statePackage.id,stateTitle:statePackage.title,boundary:statePackage.boundary,knownExclusions:statePackage.knownExclusions,request,response,requestHash:sha256(request),responseHash:sha256(response),elapsedMs});
  }
  const comparison=runs.slice(1).map((run,index)=>{
    const prior=runs[index]!;
    const metrics:Record<string,{from:string|number;to:string|number;delta?:number}>={};
    for(const name of Object.keys(questions)){
      const from=metric(prior.response.answers[name]!);const to=metric(run.response.answers[name]!);
      metrics[name]={from,to,...(typeof from==="number"&&typeof to==="number"?{delta:Number((to-from).toFixed(4))}:{})};
    }
    return {fromState:prior.stateId,toState:run.stateId,metrics};
  });
  const unsigned={schema:"lcl-jev-assurance-package/v1" as const,generatedAt:(params.now??(()=>new Date()))().toISOString(),mode:params.mode,provider:"TypeSafe AI",modelRequested:params.model,source:{repository:process.env.GITHUB_REPOSITORY??"jtflack-grc/legacy-control-lab",commit:process.env.GITHUB_SHA??"local",workflowRunId:process.env.GITHUB_RUN_ID??"local"},subject:{system:"CLAIMS400",user:"JSMITH",object:"PAYLIB/PAYMST",businessRole:"Payroll clerk"},invariant:"The subject, target and question set remain fixed; only the represented evidence boundary changes.",questions,runs,comparison,limitations:["Synthetic IBM i learning environment, not a production partition","A Jev probability is a model judgment, not an IBM i authority calculation or permission decision","State completeness is asserted by the package and is not independently proven","Fixture mode is a UI and test replay and must never be represented as a live Jev result"]};
  return {...unsigned,integrity:{packageHash:sha256(canonicalize(unsigned))}};
}
