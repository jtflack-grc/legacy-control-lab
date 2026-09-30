let assessment=null;let selectedControl=null;let statusFilter=null;
const byId=(id)=>document.getElementById(id);
const label={pass:"Pass",fail:"Fail",partial:"Partial",not_tested:"Not tested",no_evidence:"No evidence",like_for_like:"Like for like",not_demonstrated:"Not demonstrated"};

function node(tag,text,className){const element=document.createElement(tag);if(text!==undefined)element.textContent=text;if(className)element.className=className;return element;}
function replaceList(id,items){const target=byId(id);target.replaceChildren(...items.map((item)=>node("li",item)));}
function statusPill(value){return node("span",label[value]??value,`pill status-${value}`);}
function fitPill(value){return node("span",label[value]??value,`pill fit-${value}`);}
function formatTime(value){try{return new Intl.DateTimeFormat(undefined,{dateStyle:"medium",timeStyle:"medium"}).format(new Date(value));}catch{return value;}}

async function load(){
  const loadingRow=node("tr");const loadingCell=node("td","Loading live assessment…","loading");loadingCell.colSpan=4;loadingRow.append(loadingCell);byId("control-rows").replaceChildren(loadingRow);
  try{const response=await fetch("/api/scf-assessor/assessment",{headers:{Accept:"application/json"}});if(!response.ok)throw new Error(`Assessment API returned ${response.status}`);assessment=await response.json();render();}
  catch(error){const row=node("tr");const cell=node("td",error instanceof Error?error.message:String(error),"loading");cell.colSpan=4;row.append(cell);byId("control-rows").replaceChildren(row);}
}

function render(){
  byId("claim-title").textContent=assessment.profile.title;byId("claim-text").textContent=assessment.profile.claim;
  byId("boundary-system").textContent=assessment.boundary.system;byId("boundary-target").textContent=assessment.boundary.target;byId("boundary-interval").textContent=assessment.boundary.interval;byId("generated-at").textContent=formatTime(assessment.generatedAt);
  for(const key of ["pass","fail","partial","not_tested","no_evidence"])byId(`count-${key.replaceAll("_","-")}`).textContent=assessment.summary[key];
  byId("contract-population").textContent=assessment.evidenceContract.population;byId("contract-integrity").textContent=assessment.evidenceContract.integrity;replaceList("contract-sources",assessment.evidenceContract.sources);replaceList("contract-exclusions",assessment.evidenceContract.knownExclusions);
  renderRows();
  const current=assessment.rows.find((row)=>row.controlId===selectedControl)??assessment.rows[0];if(current){selectedControl=current.controlId;renderDossier(current);}
}

function filteredRows(){const query=byId("search").value.trim().toLowerCase();return assessment.rows.filter((row)=>{if(statusFilter&&row.status!==statusFilter)return false;if(!query)return true;return [row.controlId,row.controlTitle,row.scfIntent,row.assessorQuestion,row.lclImplementation,row.conclusion,row.gap??"",...row.scenarios,...row.evidence.map((e)=>e.label)].join(" ").toLowerCase().includes(query);});}
function renderRows(){
  const rows=filteredRows().map((row)=>{const tr=node("tr");tr.tabIndex=0;tr.dataset.controlId=row.controlId;if(row.controlId===selectedControl)tr.classList.add("selected");const control=node("td");control.append(node("span",row.controlId,"control-id"),node("span",row.controlTitle,"control-title"));const fit=node("td");fit.append(fitPill(row.fit));const result=node("td");result.append(statusPill(row.status));const evidence=node("td",`${row.evidence.length} reference${row.evidence.length===1?"":"s"}`,"evidence-count");tr.append(control,fit,result,evidence);const select=()=>{selectedControl=row.controlId;renderRows();renderDossier(row);};tr.addEventListener("click",select);tr.addEventListener("keydown",(event)=>{if(event.key==="Enter"||event.key===" "){event.preventDefault();select();}});return tr;});
  if(!rows.length){const tr=node("tr");const td=node("td","No controls match this view.","loading");td.colSpan=4;tr.append(td);rows.push(tr);}byId("control-rows").replaceChildren(...rows);
}
function addDefinition(dl,term,content,className){const wrap=node("div");const dt=node("dt",term);const dd=node("dd");if(content instanceof Node)dd.append(content);else dd.textContent=content;if(className)dd.className=className;wrap.append(dt,dd);dl.append(wrap);}
function renderDossier(row){
  const panel=byId("dossier");const labelNode=node("p","Assessor dossier","section-label");const title=node("h2",`${row.controlId} · ${row.controlTitle}`);const result=node("div",undefined,"result-line");result.append(fitPill(row.fit),statusPill(row.status));const dl=node("dl");addDefinition(dl,"SCF intent",row.scfIntent);addDefinition(dl,"Assessor question",row.assessorQuestion);addDefinition(dl,"LCL implementation",row.lclImplementation);addDefinition(dl,"Conclusion",row.conclusion);if(row.gap)addDefinition(dl,"Unclosed gap",row.gap,"gap");const evidence=node("ul",undefined,"evidence-list");for(const ref of row.evidence){const li=node("li");li.append(node("span",ref.type.replaceAll("_"," "),"evidence-type"));if(ref.href){const link=node("a",ref.label);link.href=ref.href;if(ref.type==="proof_bundle"){link.download="";}else{link.target="_blank";link.rel="noopener";}li.append(link);}else li.append(node("span",ref.label));evidence.append(li);}addDefinition(dl,"Evidence references",evidence);panel.replaceChildren(labelNode,title,result,dl);
}

byId("refresh").addEventListener("click",load);byId("search").addEventListener("input",renderRows);byId("clear-filter").addEventListener("click",()=>{statusFilter=null;byId("search").value="";document.querySelectorAll(".status-card").forEach((card)=>card.classList.remove("active"));renderRows();});document.querySelectorAll(".status-card").forEach((card)=>card.addEventListener("click",()=>{const next=card.dataset.filter;statusFilter=statusFilter===next?null:next;document.querySelectorAll(".status-card").forEach((entry)=>entry.classList.toggle("active",entry.dataset.filter===statusFilter));renderRows();}));load();
