const pct=value=>`${Math.round(value*100)}%`;
const escapeHtml=value=>String(value).replace(/[&<>"']/g,char=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[char]));
const answerValue=answer=>answer.type==="noul"?pct(answer.noul):answer.type==="score"?answer.score.toFixed(2):answer.choice.replaceAll("_"," ");
const answerBar=answer=>answer.type==="noul"?answer.noul:answer.type==="score"?answer.score/4:answer.confidence;
const factLines=run=>{
  const state=run.request.state;
  if(run.stateId==="direct_only")return ["PRIVATE AUTHORITY: NONE","GROUP PATHS: NOT REPRESENTED","ACTIVITY: NOT REPRESENTED"];
  const lines=["PRIVATE AUTHORITY: NONE","GROUP → AUTL: *CHANGE","ADOPTED PROGRAM: PAYENTRY"];
  if(state.observedActivity)lines.push("QAUDJRN: OUTSIDE WINDOW");
  return lines;
};
async function render(){
  const evidence=await fetch("./evidence.json",{cache:"no-store"}).then(response=>{if(!response.ok)throw new Error(`evidence ${response.status}`);return response.json()});
  document.querySelector("#model").textContent=evidence.runs[0].response.model;
  document.querySelector("#mode").textContent=evidence.mode.toUpperCase();
  document.querySelector("#mode").className=evidence.mode;
  document.querySelector("#invariant").textContent=evidence.invariant;
  document.querySelector("#package-hash").textContent=evidence.integrity.packageHash;
  document.querySelector("#states").innerHTML=evidence.runs.map((run,index)=>`<article class="state"><small>STATE 0${index+1}</small><h2>${escapeHtml(run.stateTitle)}</h2><p class="boundary">${escapeHtml(run.boundary)}</p><div class="facts">${factLines(run).map(line=>`<div><b>&gt;</b> ${escapeHtml(line)}</div>`).join("")}</div><div class="answers">${Object.entries(run.response.answers).map(([name,answer])=>`<div class="answer"><span>${escapeHtml(name.replaceAll("_"," "))}</span><strong>${escapeHtml(answerValue(answer))}</strong><div class="bar"><i style="width:${Math.max(2,answerBar(answer)*100)}%"></i></div></div>`).join("")}</div><div class="hash">REQUEST ${escapeHtml(run.requestHash)}</div><div class="hash">RESPONSE ${escapeHtml(run.responseHash)}</div></article>`).join("");
  document.querySelector("#comparison").innerHTML=evidence.comparison.map(item=>`<div class="delta"><span>${escapeHtml(item.fromState)} → ${escapeHtml(item.toState)}</span>${Object.entries(item.metrics).map(([name,metric])=>`<span>${escapeHtml(name)}: <strong>${metric.delta===undefined?`${escapeHtml(metric.from)} → ${escapeHtml(metric.to)}`:`${metric.delta>0?"+":""}${metric.delta}`}</strong></span>`).join("")}</div>`).join("");
}
render().catch(error=>{document.body.innerHTML=`<pre>Unable to load evidence: ${escapeHtml(error.message)}</pre>`});
