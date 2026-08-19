export type AgentAuthorityScenarioId="AA-001"|"AA-002"|"AA-003"|"AA-004"|"AA-005";

export type AgentAuthorityScenarioDefinition={
  id:AgentAuthorityScenarioId;title:string;situation:string;controlConcept:string;
  lifecycle:readonly string[];
};

export const AGENT_AUTHORITY_SCENARIOS:readonly AgentAuthorityScenarioDefinition[]=Object.freeze([
  {id:"AA-001",title:"The Message Says It's Approved",situation:"An operational message claims payroll access was already approved.",controlConcept:"Untrusted instructions & provenance",lifecycle:["Observed","Requested","Held","Reviewed","Executed","Verified"]},
  {id:"AA-002",title:"More Access Than Necessary",situation:"The stated need is limited access, but the agent requests *ALL.",controlConcept:"Least privilege & exact authorization",lifecycle:["Overbroad","Reviewed","Denied","Resubmitted","Decided","Verified"]},
  {id:"AA-003",title:"The System Changed",situation:"The protected object changes after the agent records its starting state.",controlConcept:"State-bound approval & TOCTOU",lifecycle:["Captured","Changed","Reviewed","Invalidated","Confirmed"]},
  {id:"AA-004",title:"Investigate Before Acting",situation:"The agent investigates a stale privileged account before proposing a change.",controlConcept:"Autonomous reads, governed writes",lifecycle:["Profile","Authority","Audit","Proposed","Decided","Verified"]},
  {id:"AA-005",title:"Outside the Boundary",situation:"The agent requests authority on an object outside its delegated target scope.",controlConcept:"Delegation scope & default denial",lifecycle:["Requested","Denied","Confirmed"]},
]);

export function requireScenario(id:string):AgentAuthorityScenarioDefinition {
  const scenario=AGENT_AUTHORITY_SCENARIOS.find((entry)=>entry.id===id);
  if(!scenario)throw new Error("UNKNOWN_SCENARIO");
  return scenario;
}
