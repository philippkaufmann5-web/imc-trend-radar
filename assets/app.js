/* IMC Research Hub – frontend. Spricht die Netlify-Functions an;
   der Claude-Key bleibt serverseitig. */

const CLUSTERS = [
  { id:"marketing", label:"Marketing & Digital" },
  { id:"sales", label:"Sales & Vertrieb" },
  { id:"kommunikation", label:"Kommunikation & Brand" },
  { id:"einkauf", label:"Einkauf & Supply Management" },
];
const COURSES = [
  ["DAS Marketing Executive","marketing"],["CAS Marketing Management","marketing"],
  ["AI-Driven Marketing: KI in Marketing und Sales","marketing"],["Customer Experience Masterclass","marketing"],
  ["Marketing Bootcamp","marketing"],["Intensivseminar Marketing Controlling","marketing"],
  ["Digital Marketing Academy","marketing"],["Luxury Summer School","marketing"],
  ["DAS Sales Executive","sales"],["CAS Sales Management","sales"],
  ["Intensivseminar Excellence in Key Account Management","sales"],["Intensivseminar Aktives Verkaufen","sales"],
  ["Intensivseminar B2B Marketing und Sales","sales"],["Intensivseminar Sales Process Optimization","sales"],
  ["CAS Kommunikation und Management","kommunikation"],
  ["CAS Strategisches Einkaufsmanagement","einkauf"],["Intensivseminar Beschaffung in einer VUCA-Welt","einkauf"],
  ["Intensivseminar Einkauf strategisch ausrichten","einkauf"],
];
const PESTEL = ["Politisch","Ökonomisch","Sozial","Technologisch","Ökologisch","Rechtlich"];
const MODELS = [
  ["claude-opus-4-8","Opus 4.8 (stark, teurer)"],
  ["claude-sonnet-4-6","Sonnet 4.6 (empfohlen)"],
  ["claude-haiku-4-5-20251001","Haiku 4.5 (schnell, günstig)"],
];

const $=(s,r=document)=>r.querySelector(s);
const $$=(s,r=document)=>[...r.querySelectorAll(s)];
const esc=s=>String(s==null?"":s).replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[m]));
const uid=()=>Math.random().toString(36).slice(2,10)+Date.now().toString(36);
let toastT; function toast(t){const e=$("#toast");e.textContent=t;e.classList.add("show");clearTimeout(toastT);toastT=setTimeout(()=>e.classList.remove("show"),4000);}
const spin='<span class="spin"></span> ';

async function jget(u){try{const r=await fetch(u);return await r.json();}catch{return {};}}
async function jpost(u,b){const r=await fetch(u,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(b)});return r.json().catch(()=>({}));}
function fileToB64(file){return new Promise((res,rej)=>{const r=new FileReader();r.onload=()=>res({filename:file.name,mediaType:file.type||"application/pdf",dataB64:String(r.result).split(",")[1]});r.onerror=rej;r.readAsDataURL(file);});}
function srcLink(s){return s&&s.url?`<a class="src" href="${esc(s.url)}" target="_blank" rel="noopener">${esc(s.title||s.url)} ↗</a>`:"";}

/* ---------- tabs ---------- */
function initTabs(){
  $$("#tabs .tab").forEach(t=>t.addEventListener("click",()=>{
    $$("#tabs .tab").forEach(x=>x.setAttribute("aria-selected","false"));
    t.setAttribute("aria-selected","true");
    $$(".panel").forEach(p=>p.classList.remove("active"));
    $("#panel-"+t.dataset.tab).classList.add("active");
  }));
}

/* ================= MARKET RESEARCH ================= */
function renderMarket(data){
  const grid=$("#market-grid"); grid.innerHTML="";
  if(!data || data.status==="empty" || !data.clusters){ grid.innerHTML='<p class="empty">Noch keine Daten – starten Sie eine Analyse.</p>'; return; }
  if(data.status==="running"){ $("#market-last").textContent="Analyse läuft …"; return; }
  $("#market-last").textContent = data.generatedAt ? "Zuletzt: "+new Date(data.generatedAt).toLocaleString("de-CH") : "";
  (data.clusters||[]).forEach(c=>{
    const news=c.news||[]; const card=document.createElement("div"); card.className="card cluster-card";
    const newsHtml = news.length ? news.map(n=>`<div class="news-item"><div class="t">${esc(n.title)}</div><div class="s">${esc(n.summary)}</div><div class="m">${esc(n.competitor||"")} · ${esc(n.date||"")} · ${srcLink(n.source)}</div></div>`).join("")
      : '<p class="empty">Keine News der letzten 21 Tage gefunden.</p>';
    const pestel=c.pestel||{};
    const pestelHtml=PESTEL.map(k=>{const arr=pestel[k]||[];return arr.length?`<details><summary>${k}<span class="note">${arr.length}</span></summary><div class="pbody">${arr.map(p=>`<div>${esc(p.point)} ${srcLink(p.source)}</div>`).join("")}</div></details>`:"";}).join("");
    card.innerHTML=`<div class="clabel"><h3>${esc(c.label)}</h3><span class="badge ${news.length?"badge--news":"badge--none"}">${news.length?news.length+" News":"keine News"}</span></div>
      <div class="section-title">Neuigkeiten</div>${newsHtml}
      <div class="section-title">PESTEL</div><div class="pestel">${pestelHtml||'<p class="empty">–</p>'}</div>`;
    grid.appendChild(card);
  });
  const cc=data.crossCluster||{}; const box=$("#cross-cluster");
  if((cc.news&&cc.news.length)||(cc.trends&&cc.trends.length)){
    box.innerHTML=`<div class="card" style="margin-top:18px"><div class="clabel"><h3>Clusterübergreifend</h3><span class="badge badge--news">betrifft alle</span></div>
      <div class="section-title">News</div>${(cc.news||[]).map(n=>`<div class="news-item"><div class="t">${esc(n.title)}</div><div class="s">${esc(n.summary)}</div><div class="m">${esc(n.date||"")} · ${srcLink(n.source)}</div></div>`).join("")||'<p class="empty">–</p>'}
      <div class="section-title">Trends</div>${(cc.trends||[]).map(t=>`<div class="news-item"><div class="t">${esc(t.point)}</div><div class="m">${srcLink(t.source)}</div></div>`).join("")||'<p class="empty">–</p>'}</div>`;
  } else box.innerHTML="";
}
async function loadMarket(){ renderMarket(await jget("/api/market")); }
let marketPolling=false;
async function runMarket(){
  if(marketPolling) return;
  const btn=$("#run-market"); const before=(await jget("/api/market")).generatedAt;
  btn.disabled=true; btn.innerHTML=spin+"Analyse läuft …"; marketPolling=true;
  $("#market-banner").className="banner show"; $("#market-banner").textContent="Recherche gestartet – das kann 2–4 Minuten dauern. Sie können die Seite offen lassen.";
  try{ await fetch("/api/analyze-market",{method:"POST"}); }catch{ toast("Start fehlgeschlagen."); resetMarket(); return; }
  let n=0; const iv=setInterval(async()=>{ n++;
    const d=await jget("/api/market");
    if(d.status==="ready"&&d.generatedAt!==before){ renderMarket(d); $("#market-banner").className="banner"; toast("Analyse fertig."); clearInterval(iv); resetMarket(); }
    else if(d.status==="error"){ toast("Analyse-Fehler."); clearInterval(iv); resetMarket(); }
    else if(n>=50){ toast("Dauert länger – bitte später neu laden."); clearInterval(iv); resetMarket(); }
  },6000);
}
function resetMarket(){ const b=$("#run-market"); b.disabled=false; b.textContent="Analyse jetzt starten"; marketPolling=false; }

function initSubClusters(){
  $("#sub-clusters").innerHTML=CLUSTERS.map(c=>`<label style="display:block;font-size:13px;margin:3px 0"><input type="checkbox" value="${c.id}"> ${esc(c.label)}</label>`).join("");
}
async function subAdd(){
  const msg=$("#sub-msg"); msg.className="form-msg";
  const email=$("#sub-email").value.trim();
  const clusters=$$('#sub-clusters input:checked').map(i=>i.value);
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)){ msg.className="form-msg err"; msg.textContent="Bitte gültige E-Mail."; return; }
  const r=await jpost("/api/subscriptions",{email,clusters});
  if(r.ok){ msg.className="form-msg ok"; msg.textContent="Suchabo aktiviert."; $("#sub-email").value=""; loadSubs(); }
  else { msg.className="form-msg err"; msg.textContent=r.error||"Fehlgeschlagen (erst nach Deployment)."; }
}

/* ================= SYLLABUS ================= */
let sylOurs=null, sylComp=[];
function initSyllabus(){
  fillCourseSelect($("#syl-course"), true);
  dropZone($("#syl-ours-drop"),$("#syl-ours-file"),files=>{ sylOurs=files[0]; $("#syl-ours-name").textContent=sylOurs?sylOurs.name:""; $("#syl-ours-drop").classList.toggle("has",!!sylOurs); });
  dropZone($("#syl-comp-drop"),$("#syl-comp-file"),files=>{ sylComp=files; $("#syl-comp-name").textContent=files.map(f=>f.name).join(", "); $("#syl-comp-drop").classList.toggle("has",files.length>0); },true);
  $("#run-syllabus").addEventListener("click",runSyllabus);
}
async function runSyllabus(){
  const msg=$("#syl-msg"); msg.className="form-msg";
  if(!sylOurs){ msg.className="form-msg err"; msg.textContent="Bitte unseren Syllabus hochladen."; return; }
  const btn=$("#run-syllabus"); btn.disabled=true; btn.innerHTML=spin+"Analyse läuft …";
  try{
    const id=uid();
    const ours=await fileToB64(sylOurs);
    const competitors=[]; for(const f of sylComp){ const b=await fileToB64(f); competitors.push({name:f.name,...b}); }
    await jpost("/api/syllabus",{id,course:$("#syl-course").value,ours,competitors});
    pollJob(id,$("#syl-result"),renderSyllabus,()=>{ btn.disabled=false; btn.textContent="Analyse starten"; });
  }catch(e){ msg.className="form-msg err"; msg.textContent="Fehler beim Upload."; btn.disabled=false; btn.textContent="Analyse starten"; }
}
function renderSyllabus(r){
  const lis=(arr)=>(arr||[]).map(x=>`<div class="li"><b>${esc(x.point)}</b><span>${esc(x.detail)}</span></div>`).join("")||'<p class="empty">–</p>';
  return `<h3>Gesamtbild</h3><p>${esc(r.summary)}</p>
   <h3>Stärken</h3>${lis(r.strengths)}<h3>Schwächen</h3>${lis(r.weaknesses)}
   <h3>Gaps</h3>${lis(r.gaps)}<h3>Empfehlungen</h3>${(r.recommendations||[]).map(x=>`<div class="reco"><b>${esc(x.point)}</b> – ${esc(x.detail)}</div>`).join("")||'<p class="empty">–</p>'}`;
}

/* ================= SALES ================= */
let salesChat=[];
function initSales(){
  fillCourseSelect($("#sales-course"),false);
  $("#run-sales").addEventListener("click",salesPrep);
  $("#sales-start").addEventListener("click",salesStart);
  $("#sales-send").addEventListener("click",salesSend);
}
function salesCtx(){ return { course:$("#sales-course").value, linkedin:$("#sales-linkedin").value.trim(), syllabusText:$("#sales-syllabus").value.trim() }; }
async function salesPrep(){
  const msg=$("#sales-msg"); msg.className="form-msg";
  if(!$("#sales-linkedin").value.trim()){ msg.className="form-msg err"; msg.textContent="Bitte LinkedIn-Infos einfügen."; return; }
  const btn=$("#run-sales"); btn.disabled=true; btn.innerHTML=spin+"Erstelle …";
  const r=await jpost("/api/sales",{mode:"prep",...salesCtx()});
  btn.disabled=false; btn.textContent="Gesprächsvorbereitung erstellen";
  let box=$("#sales-prep"); if(!box){ box=document.createElement("div"); box.id="sales-prep"; box.className="result"; msg.after(box); }
  box.innerHTML = r.reply ? `<h3>Gesprächsvorbereitung</h3><div style="white-space:pre-wrap;font-size:14px">${esc(r.reply)}</div>` : `<p class="form-msg err">${esc(r.error||"Fehler (erst nach Deployment).")}</p>`;
}
function pushMsg(role,text){ const log=$("#sales-log"); const d=document.createElement("div"); d.className="msg "+(role==="user"?"user":"bot"); d.textContent=text; log.appendChild(d); log.scrollTop=log.scrollHeight; }
async function salesStart(){
  salesChat=[]; $("#sales-log").innerHTML="";
  if(!$("#sales-linkedin").value.trim()&&!$("#sales-course").value){ toast("Tipp: Kurs/LinkedIn ausfüllen für ein realistischeres Gespräch."); }
  const r=await jpost("/api/sales",{mode:"roleplay",...salesCtx(),messages:[]});
  if(r.reply){ salesChat.push({role:"assistant",content:r.reply}); pushMsg("bot",r.reply); }
  else toast(r.error||"Fehler (erst nach Deployment).");
}
async function salesSend(){
  const inp=$("#sales-chat-input"); const t=inp.value.trim(); if(!t) return;
  inp.value=""; pushMsg("user",t); salesChat.push({role:"user",content:t});
  const r=await jpost("/api/sales",{mode:"roleplay",...salesCtx(),messages:salesChat});
  if(r.reply){ salesChat.push({role:"assistant",content:r.reply}); pushMsg("bot",r.reply); }
  else toast(r.error||"Fehler.");
}

/* ================= BPM ================= */
let bpmFile=null;
function initBpm(){
  dropZone($("#bpm-drop"),$("#bpm-file"),files=>{ bpmFile=files[0]; $("#bpm-name").textContent=bpmFile?bpmFile.name:""; $("#bpm-drop").classList.toggle("has",!!bpmFile); });
  $("#run-bpm").addEventListener("click",runBpm);
}
async function runBpm(){
  const msg=$("#bpm-msg"); msg.className="form-msg";
  if(!bpmFile){ msg.className="form-msg err"; msg.textContent="Bitte das Veranstaltungs-PDF hochladen."; return; }
  const btn=$("#run-bpm"); btn.disabled=true; btn.innerHTML=spin+"Suche läuft …";
  try{
    const id=uid(); const file=await fileToB64(bpmFile);
    await jpost("/api/bpm",{id,file});
    pollJob(id,$("#bpm-result"),renderBpm,()=>{ btn.disabled=false; btn.textContent="Referent:innen suchen"; });
  }catch(e){ msg.className="form-msg err"; msg.textContent="Fehler beim Upload."; btn.disabled=false; btn.textContent="Referent:innen suchen"; }
}
function renderBpm(list){
  if(!Array.isArray(list)||!list.length) return '<p class="empty">Keine passenden Personen gefunden.</p>';
  return `<h3>Vorgeschlagene Referent:innen</h3>`+list.map(p=>`<div class="person"><div class="nm">${esc(p.name)}<span class="flag">${esc(p.country||"DACH")}</span></div>
    <div class="ro">${esc(p.role||"")}</div><div style="font-size:13px;margin:6px 0">${esc(p.why||"")}</div>
    <div class="ev">${(p.evidence||[]).map(e=>`<a class="evtag" href="${esc(e.url)}" target="_blank" rel="noopener">${esc(e.type||"Quelle")}: ${esc(e.title||"Link")} ↗</a>`).join("")}</div></div>`).join("");
}

/* ================= SETTINGS ================= */
let settings=null;
async function loadSettings(){
  settings=await jget("/api/settings");
  if(!settings||!settings.model){ settings={model:"claude-sonnet-4-6",webSearchPer1000:10,prices:{"claude-opus-4-8":{in:15,out:75},"claude-sonnet-4-6":{in:3,out:15},"claude-haiku-4-5-20251001":{in:1,out:5}}}; }
  $("#set-model").innerHTML=MODELS.map(([v,l])=>`<option value="${v}" ${settings.model===v?"selected":""}>${l}</option>`).join("");
  $("#set-websearch").value=settings.webSearchPer1000;
  renderPrices(); updateModelIndicator(); estimateCost();
  $("#set-model").addEventListener("change",estimateCost);
  loadSubs();
}
function renderPrices(){
  const p=settings.prices||{}; 
  $("#price-table").innerHTML=`<div class="price-row note"><span>Modell</span><span>Input</span><span>Output</span></div>`+
    MODELS.map(([v])=>`<div class="price-row"><span style="font-size:13px">${v.replace("claude-","")}</span>
      <input type="text" data-m="${v}" data-k="in" value="${(p[v]||{}).in??""}"/>
      <input type="text" data-m="${v}" data-k="out" value="${(p[v]||{}).out??""}"/></div>`).join("");
  $$("#price-table input").forEach(i=>i.addEventListener("input",estimateCost));
}
function readPrices(){
  const prices={}; $$("#price-table input").forEach(i=>{ const m=i.dataset.m; prices[m]=prices[m]||{}; prices[m][i.dataset.k]=parseFloat(i.value)||0; }); return prices;
}
function estimateCost(){
  const model=$("#set-model").value; const prices=readPrices(); const ws=parseFloat($("#set-websearch").value)||0;
  const pr=prices[model]||{in:0,out:0};
  const calls=5, inTok=4000, outTok=1500, searches=30;
  const tokenCost=calls*(inTok/1e6*pr.in + outTok/1e6*pr.out);
  const searchCost=searches/1000*ws;
  const total=tokenCost+searchCost;
  $("#cost-estimate").textContent="≈ $"+total.toFixed(3);
  $("#cost-detail").textContent=`Modell ${model.replace("claude-","")} · Token ~$${tokenCost.toFixed(3)} + Websuche ~$${searchCost.toFixed(3)}. Richtwerte, keine Garantie.`;
}
async function saveSettings(){
  const msg=$("#set-msg"); msg.className="form-msg";
  const r=await jpost("/api/settings",{model:$("#set-model").value,prices:readPrices(),webSearchPer1000:parseFloat($("#set-websearch").value)||0});
  if(r.model){ settings=r; msg.className="form-msg ok"; msg.textContent="Gespeichert."; updateModelIndicator(); }
  else { msg.className="form-msg err"; msg.textContent=r.error||"Fehler (erst nach Deployment)."; }
}
function updateModelIndicator(){ $("#model-indicator").textContent="Modell: "+(settings?.model||"–").replace("claude-",""); }
async function loadSubs(){
  const list=await jget("/api/subscriptions").catch(()=>[]);
  const box=$("#sub-list");
  if(!Array.isArray(list)||!list.length){ box.innerHTML='<p class="empty">Keine Suchabos.</p>'; return; }
  box.innerHTML=list.map(s=>`<div class="sub-row"><span>${esc(s.email)}<span class="note"> · ${s.clusters.length?s.clusters.join(", "):"alle"}</span></span><button class="btn btn--sm" data-del="${s.id}">Löschen</button></div>`).join("");
  $$("#sub-list [data-del]").forEach(b=>b.addEventListener("click",async()=>{ await jpost("/api/subscriptions",{action:"delete",id:b.dataset.del}); toast("Gelöscht."); loadSubs(); }));
}

/* ---------- shared helpers ---------- */
function fillCourseSelect(sel,withEmpty){
  sel.innerHTML=(withEmpty?'<option value="">– keine Auswahl –</option>':"")+COURSES.map(([n])=>`<option>${esc(n)}</option>`).join("");
}
function dropZone(zone,input,cb,multi){
  zone.addEventListener("click",()=>input.click());
  input.addEventListener("change",()=>cb([...input.files]));
  ["dragover","dragenter"].forEach(e=>zone.addEventListener(e,ev=>{ev.preventDefault();zone.classList.add("has");}));
  ["dragleave","drop"].forEach(e=>zone.addEventListener(e,ev=>{ev.preventDefault();}));
  zone.addEventListener("drop",ev=>{ const f=[...ev.dataTransfer.files].filter(x=>x.type==="application/pdf"); cb(multi?f:f.slice(0,1)); });
}
function pollJob(id,target,render,done){
  target.innerHTML='<p class="empty">'+spin+'Wird analysiert … (1–3 Min.)</p>';
  let n=0; const iv=setInterval(async()=>{ n++;
    const d=await jget("/api/job?id="+id);
    if(d.status==="ready"){ target.innerHTML=render(d.result); clearInterval(iv); done&&done(); }
    else if(d.status==="error"){ target.innerHTML='<p class="form-msg err">Fehler: '+esc(d.error||"")+'</p>'; clearInterval(iv); done&&done(); }
    else if(n>=40){ target.innerHTML='<p class="empty">Zeitüberschreitung – bitte erneut versuchen.</p>'; clearInterval(iv); done&&done(); }
  },5000);
}

/* ---------- init ---------- */
function init(){
  initTabs(); initSubClusters(); initSyllabus(); initSales(); initBpm();
  $("#run-market").addEventListener("click",runMarket);
  $("#sub-add").addEventListener("click",subAdd);
  $("#set-save").addEventListener("click",saveSettings);
  $("#set-websearch").addEventListener("input",estimateCost);
  loadMarket(); loadSettings();
}
document.addEventListener("DOMContentLoaded",init);
