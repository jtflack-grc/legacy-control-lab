import {describe,expect,it} from "vitest";
import {fixtureResponses,questions,runExperiment,statePackages} from "../../src/jev-assurance/experiment.js";
import {sha256} from "../../src/jev-assurance/canonical.js";

describe("Jev assurance experiment",()=>{
  it("holds the subject and questions fixed while expanding the evidence boundary",async()=>{
    const evidence=await runExperiment({mode:"fixture",model:"jev-latest",now:()=>new Date("2026-10-09T12:00:00.000Z"),evaluator:async(_request,stateId)=>({response:structuredClone(fixtureResponses[stateId]!),elapsedMs:0})});
    expect(Object.keys(questions)).toEqual(["excessive_access","activity_classification","evidence_strength"]);
    expect(statePackages.map((item)=>item.id)).toEqual(["direct_only","authority_path","authority_plus_activity"]);
    expect(evidence.runs.map((run)=>run.request.questions)).toEqual([questions,questions,questions]);
    expect(evidence.runs.map((run)=>run.request.state)).toEqual(statePackages.map((item)=>item.state));
    expect(evidence.comparison[0]!.metrics.excessive_access.delta).toBe(0.59);
    expect(evidence.comparison[1]!.metrics.excessive_access.delta).toBe(0.17);
    expect(evidence.integrity.packageHash).toMatch(/^sha256:[a-f0-9]{64}$/);
  });

  it("hashes semantically identical objects identically",()=>{
    expect(sha256({b:2,a:1})).toBe(sha256({a:1,b:2}));
  });
});
