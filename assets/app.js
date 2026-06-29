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
async function jpost(u,b){
  try{
    const r=await fetch(u,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(b)});
    const txt=await r.text();
    let j={}; try{ j=txt?JSON.parse(txt):{}; }catch{ j={error:(txt||("HTTP "+r.status)).slice(0,200)}; }
    if(!r.ok && !j.error) j.error="HTTP "+r.status;
    return j;
  }catch(e){ return {error:"Netzwerkfehler: "+String(e).slice(0,140)}; }
}
function fileToB64(file){return new Promise((res,rej)=>{const r=new FileReader();r.onload=()=>res({filename:file.name,mediaType:file.type||"application/pdf",dataB64:String(r.result).split(",")[1]});r.onerror=rej;r.readAsDataURL(file);});}
let _pdfjs=null;
function loadScript(src){return new Promise((res,rej)=>{const s=document.createElement("script");s.src=src;s.onload=res;s.onerror=()=>rej(new Error("PDF-Bibliothek konnte nicht geladen werden."));document.head.appendChild(s);});}
async function ensurePdfjs(){
  if(_pdfjs) return _pdfjs;
  if(!window.pdfjsLib) await loadScript("https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js");
  window.pdfjsLib.GlobalWorkerOptions.workerSrc="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
  _pdfjs=window.pdfjsLib; return _pdfjs;
}
async function pdfToText(file){
  const pdfjs=await ensurePdfjs();
  const data=await file.arrayBuffer();
  const pdf=await pdfjs.getDocument({data}).promise;
  let out=""; const max=Math.min(pdf.numPages,40);
  for(let i=1;i<=max;i++){ const page=await pdf.getPage(i); const c=await page.getTextContent(); out+=c.items.map(it=>it.str).join(" ")+"\n"; }
  return out.trim();
}
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
function relBadge(r){ if(!r) return ""; const h=String(r).toLowerCase().startsWith("h"); return `<span class="relb ${h?"h":"m"}">${h?"Hoch":"Mittel"}</span>`; }
function newsHTML(n){
  const meta=[n.competitor,n.date].filter(Boolean).map(esc).join(" · ");
  return `<div class="news-item"><div class="t">${esc(n.title)}${relBadge(n.relevance)}</div>${n.summary?`<div class="s">${esc(n.summary)}</div>`:""}${n.impact?`<div class="impact">→ ${esc(n.impact)}</div>`:""}<div class="m">${meta}${meta?" · ":""}${srcLink(n.source)}</div></div>`;
}
function renderMarket(data){
  const grid=$("#market-grid"); grid.innerHTML="";
  const box=$("#cross-cluster"); box.innerHTML="";
  const reco=$("#market-reco"); if(reco) reco.innerHTML="";
  if(!data || data.status==="empty" || !data.clusters){ grid.innerHTML='<p class="empty">Noch keine Daten – starten Sie eine Analyse.</p>'; return; }
  if(data.status==="running"){ $("#market-last").textContent="Analyse läuft …"; return; }
  $("#market-last").textContent = data.generatedAt ? "Zuletzt: "+new Date(data.generatedAt).toLocaleDateString("de-CH") : "";

  if(reco && Array.isArray(data.recommendations) && data.recommendations.length){
    reco.innerHTML=`<div class="reco-box"><h3>Zusammenfassung / Handlungsempfehlungen</h3><ul>${data.recommendations.map(r=>`<li>${esc(r)}</li>`).join("")}</ul></div>`;
  }

  // surface errors / diagnostics
  const cc=data.crossCluster||{};
  const errs=[]; (data.clusters||[]).forEach(c=>{ if(c.error) errs.push(c.label+": "+c.error); }); if(cc.error) errs.push("Übergreifend: "+cc.error);
  const banner=$("#market-banner");
  if(data.note || errs.length){
    banner.className="banner show";
    banner.innerHTML=esc(data.note||"Einige Abfragen meldeten einen Fehler.")+(errs.length?`<div class="note" style="margin-top:6px">${errs.map(esc).join("<br>")}</div>`:"");
  } else banner.className="banner";

  // cross-cluster first, horizontal (News | Trends | PESTEL)
  const hasCross=(cc.news&&cc.news.length)||(cc.trends&&cc.trends.length)||(cc.pestel&&cc.pestel.length);
  if(hasCross){
    const newsCol=(cc.news||[]).map(newsHTML).join("")||'<p class="empty">–</p>';
    const trendCol=(cc.trends||[]).map(t=>`<div class="news-item"><div class="t">${esc(t.point)}${relBadge(t.relevance)}</div>${t.impact?`<div class="impact">→ ${esc(t.impact)}</div>`:""}<div class="m">${esc(t.date||"")}${t.date?" · ":""}${srcLink(t.source)}</div></div>`).join("")||'<p class="empty">–</p>';
    const pestelCol=(cc.pestel||[]).map(p=>`<div class="news-item"><div class="t"><span class="ptag">${esc(p.category||"")}</span>${esc(p.point)}${relBadge(p.relevance)}</div>${p.impact?`<div class="impact">→ ${esc(p.impact)}</div>`:""}<div class="m">${esc(p.date||"")}${p.date?" · ":""}${srcLink(p.source)}</div></div>`).join("")||'<p class="empty">–</p>';
    box.innerHTML=`<div class="card cross" style="margin-bottom:20px"><div class="clabel"><h3>Clusterübergreifend</h3></div>
      <div class="cross-grid">
        <div><div class="section-title">News</div>${newsCol}</div>
        <div><div class="section-title">Trends</div>${trendCol}</div>
        <div><div class="section-title">PESTEL</div>${pestelCol}</div>
      </div></div>`;
  }

  // per-cluster
  (data.clusters||[]).forEach(c=>{
    const news=c.news||[]; const card=document.createElement("div"); card.className="card cluster-card";
    const newsHtml = news.length ? news.map(newsHTML).join("") : '<p class="empty">Keine News der letzten 21 Tage gefunden.</p>';
    const pestel=c.pestel||{};
    const pestelHtml=PESTEL.map(k=>{const arr=pestel[k]||[];return arr.length?`<details><summary>${k}<span class="note">${arr.length}</span></summary><div class="pbody">${arr.map(p=>`<div>${esc(p.point)}${relBadge(p.relevance)}${p.impact?`<div class="impact">→ ${esc(p.impact)}</div>`:""} ${srcLink(p.source)}</div>`).join("")}</div></details>`:"";}).join("");
    card.innerHTML=`<div class="clabel"><h3>${esc(c.label)}</h3><span class="badge ${news.length?"badge--news":"badge--none"}">${news.length?news.length+" News":"keine News"}</span></div>
      <div class="section-title">Neuigkeiten</div>${newsHtml}
      <div class="section-title">PESTEL</div><div class="pestel">${pestelHtml||'<p class="empty">–</p>'}</div>${c.error?`<p class="form-msg err" style="margin-top:8px">Fehler: ${esc(c.error)}</p>`:""}`;
    grid.appendChild(card);
  });
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
    if(d.status==="ready"&&d.generatedAt!==before){ renderMarket(d); toast("Analyse fertig."); clearInterval(iv); resetMarket(); }
    else if(d.status==="error"){ toast("Analyse-Fehler."); clearInterval(iv); resetMarket(); }
    else if(n>=50){ toast("Dauert länger – bitte später neu laden."); clearInterval(iv); resetMarket(); }
  },6000);
}
function resetMarket(){ const b=$("#run-market"); b.textContent="Analyse jetzt starten"; marketPolling=false; setRunBtn(); }

function initSubClusters(){
  $("#sub-clusters").innerHTML=CLUSTERS.map(c=>`<label style="display:block;font-size:13px;margin:3px 0"><input type="checkbox" value="${c.id}" checked> ${esc(c.label)}</label>`).join("");
}
async function subAdd(){
  const msg=$("#sub-msg"); msg.className="form-msg";
  const email=$("#sub-email").value.trim();
  const clusters=$$('#sub-clusters input:checked').map(i=>i.value);
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)){ msg.className="form-msg err"; msg.textContent="Bitte gültige E-Mail."; return; }
  const r=await jpost("/api/subscriptions",{email,clusters});
  if(r.ok){ msg.className="form-msg ok"; msg.textContent="Suchabo aktiviert."; $("#sub-email").value=""; loadSubs(); }
  else { msg.className="form-msg err"; msg.textContent=r.error||"Fehlgeschlagen."; }
}

/* ================= SYLLABUS ================= */
let sylOurs=null, sylComp=[];
function initSyllabus(){
  dropZone($("#syl-ours-drop"),$("#syl-ours-file"),files=>{ sylOurs=files[0]; $("#syl-ours-name").textContent=sylOurs?sylOurs.name:""; $("#syl-ours-drop").classList.toggle("has",!!sylOurs); });
  dropZone($("#syl-comp-drop"),$("#syl-comp-file"),files=>{ sylComp=files; $("#syl-comp-name").textContent=files.map(f=>f.name).join(", "); $("#syl-comp-drop").classList.toggle("has",files.length>0); },true);
  $("#run-syllabus").addEventListener("click",runSyllabus);
}
async function runSyllabus(){
  const msg=$("#syl-msg"); msg.className="form-msg";
  if(!sylOurs){ msg.className="form-msg err"; msg.textContent="Bitte unseren Syllabus hochladen."; return; }
  const tooBig=[sylOurs,...sylComp].find(f=>f && f.size>20*1024*1024);
  if(tooBig){ msg.className="form-msg err"; msg.textContent=`Datei „${tooBig.name}" ist zu gross (max. 20 MB).`; return; }
  const btn=$("#run-syllabus"); btn.disabled=true; btn.innerHTML=spin+"Analyse läuft …";
  try{
    const id=uid();
    const ours={ name:sylOurs.name, text:await pdfToText(sylOurs) };
    if(!ours.text || ours.text.length<20) throw new Error("Aus unserem Syllabus liess sich kein Text lesen (evtl. Bild-PDF).");
    const competitors=[]; for(const f of sylComp){ competitors.push({ name:f.name, text:await pdfToText(f) }); }
    const resp=await jpost("/api/syllabus",{id,ours,competitors});
    if(resp.error) throw new Error(resp.error);
    pollJob(id,$("#syl-result"),renderSyllabus,()=>{ btn.disabled=false; btn.textContent="Analyse starten"; });
  }catch(e){ msg.className="form-msg err"; msg.textContent="Fehler: "+String(e.message||e); btn.disabled=false; btn.textContent="Analyse starten"; }
}
function renderSyllabus(r){
  const lis=(arr)=>(arr||[]).map(x=>`<div class="li"><b>${esc(x.point)}</b><span>${esc(x.detail)}</span></div>`).join("")||'<p class="empty">–</p>';
  return `<h3>Gesamtbild</h3><p>${esc(r.summary)}</p>
   <h3>Stärken</h3>${lis(r.strengths)}<h3>Schwächen</h3>${lis(r.weaknesses)}
   <h3>Gaps</h3>${lis(r.gaps)}<h3>Empfehlungen</h3>${(r.recommendations||[]).map(x=>`<div class="reco"><b>${esc(x.point)}</b> – ${esc(x.detail)}</div>`).join("")||'<p class="empty">–</p>'}`;
}

/* ================= SALES ================= */
let salesChat=[], recog=null, recognizing=false, salesSylFile=null;
function initSales(){
  fillCourseSelect($("#sales-course"),true);
  $("#run-sales").addEventListener("click",salesStartAll);
  $("#sales-start").addEventListener("click",salesStart);
  $("#sales-send").addEventListener("click",salesSend);
  $("#sales-course").addEventListener("change",salesGate);
  $("#sales-linkedin").addEventListener("input",salesGate);
  $("#sales-chat-input").addEventListener("keydown",e=>{ if(e.key==="Enter"&&!e.shiftKey){ e.preventDefault(); if(!$("#sales-send").disabled) salesSend(); }});
  dropZone($("#sales-syl-drop"),$("#sales-syl-file"),files=>{ salesSylFile=files[0]||null; $("#sales-syl-name").textContent=salesSylFile?salesSylFile.name:""; $("#sales-syl-drop").classList.toggle("has",!!salesSylFile); });
  initAudio(); salesGate();
}
function salesGate(){
  const course=$("#sales-course").value, li=$("#sales-linkedin").value.trim();
  const ready=!!course && !!li;
  ["#run-sales","#sales-start","#sales-chat-input","#sales-send"].forEach(s=>$(s).disabled=!ready);
  $("#sales-mic").disabled=!ready;
  $("#sales-course-label-a").textContent=course||"–";
  $("#sales-course-label-b").textContent=course||"–";
  $("#sales-gate-note").textContent= ready ? "✓ Bereit – wählen Sie rechts Vorbereitung oder Übungsgespräch." : "Bitte zuerst Kurs wählen und personenbezogene Informationen einfügen.";
}
function salesCtx(){ return { course:$("#sales-course").value, linkedin:$("#sales-linkedin").value.trim(), syllabusText:$("#sales-syllabus").value.trim() }; }
async function salesBody(extra){
  const body={...salesCtx(),...extra};
  if(salesSylFile){ try{ const t=await pdfToText(salesSylFile); if(t) body.syllabusText=((body.syllabusText||"")+"\n"+t).trim(); }catch{} }
  return body;
}

async function salesStartAll(){
  const btn=$("#run-sales"); if(btn.disabled) return;
  btn.disabled=true; btn.innerHTML=spin+"Wird vorbereitet …";
  await Promise.all([salesPrep(), salesStart()]);
  btn.innerHTML="Vorbereitung starten"; salesGate();
}
async function salesPrep(){
  $("#sales-prep").innerHTML='<p class="empty">'+spin+'Vorbereitung wird erstellt …</p>';
  try{
    const id=uid();
    const resp=await jpost("/api/sales", await salesBody({id,mode:"prep"}));
    if(resp.error) throw new Error(resp.error);
    const reply=await pollJobResult(id,{interval:3000,tries:50});
    $("#sales-prep").innerHTML=`<h3>Gesprächsvorbereitung · ${esc($("#sales-course").value)}</h3><div style="white-space:pre-wrap;font-size:14px">${esc(reply)}</div>`;
  }catch(e){ $("#sales-prep").innerHTML=`<p class="form-msg err">${esc(String(e.message||e))}</p>`; }
}
function pushMsg(role,text){ const log=$("#sales-log"); const d=document.createElement("div"); d.className="msg "+(role==="user"?"user":"bot"); d.textContent=text; log.appendChild(d); log.scrollTop=log.scrollHeight; return d; }
async function salesStart(){
  salesChat=[]; $("#sales-log").innerHTML="";
  const btn=$("#sales-start"); btn.disabled=true; btn.innerHTML=spin+"…";
  const typing=pushMsg("bot","…");
  try{
    const id=uid();
    const resp=await jpost("/api/sales", await salesBody({id,mode:"roleplay",messages:[]}));
    if(resp.error) throw new Error(resp.error);
    const reply=await pollJobResult(id,{interval:2500,tries:50});
    typing.remove(); salesChat.push({role:"assistant",content:reply}); pushMsg("bot",reply); speak(reply);
  }catch(e){ typing.remove(); toast(String(e.message||e)); }
  btn.textContent="Gespräch neu starten"; salesGate();
}
async function salesSend(){
  const inp=$("#sales-chat-input"); const t=inp.value.trim(); if(!t) return;
  inp.value=""; pushMsg("user",t); salesChat.push({role:"user",content:t});
  const typing=pushMsg("bot","…");
  try{
    const id=uid();
    const resp=await jpost("/api/sales", await salesBody({id,mode:"roleplay",messages:salesChat}));
    if(resp.error) throw new Error(resp.error);
    const reply=await pollJobResult(id,{interval:2500,tries:50});
    typing.remove(); salesChat.push({role:"assistant",content:reply}); pushMsg("bot",reply); speak(reply);
  }catch(e){ typing.remove(); toast(String(e.message||e)); }
}
/* audio: speech-to-text input + text-to-speech output (Web Speech API) */
function initAudio(){
  const SR=window.SpeechRecognition||window.webkitSpeechRecognition;
  if(!SR){ return; } // Mikrofon-Button bleibt versteckt, Vorlesen funktioniert trotzdem
  $("#sales-mic").hidden=false;
  recog=new SR(); recog.lang="de-DE"; recog.interimResults=false; recog.maxAlternatives=1;
  recog.onresult=e=>{ $("#sales-chat-input").value=e.results[0][0].transcript; salesSend(); };
  recog.onend=()=>{ recognizing=false; $("#sales-mic").textContent="🎤"; };
  recog.onerror=()=>{ recognizing=false; $("#sales-mic").textContent="🎤"; };
  $("#sales-mic").addEventListener("click",()=>{ if(recognizing){ recog.stop(); return; } try{ recog.start(); recognizing=true; $("#sales-mic").textContent="⏺"; }catch{} });
}
function speak(text){ if(!$("#sales-tts").checked || !window.speechSynthesis) return; const u=new SpeechSynthesisUtterance(text); u.lang="de-DE"; window.speechSynthesis.cancel(); window.speechSynthesis.speak(u); }

/* ================= BPM ================= */
let bpmFile=null;
function initBpm(){
  dropZone($("#bpm-drop"),$("#bpm-file"),files=>{ bpmFile=files[0]; $("#bpm-name").textContent=bpmFile?bpmFile.name:""; $("#bpm-drop").classList.toggle("has",!!bpmFile); });
  $("#run-bpm").addEventListener("click",runBpm);
}
async function runBpm(){
  const msg=$("#bpm-msg"); msg.className="form-msg";
  if(!bpmFile){ msg.className="form-msg err"; msg.textContent="Bitte das Veranstaltungs-PDF hochladen."; return; }
  if(bpmFile.size>20*1024*1024){ msg.className="form-msg err"; msg.textContent=`Datei „${bpmFile.name}" ist zu gross (max. 20 MB).`; return; }
  const btn=$("#run-bpm"); btn.disabled=true; btn.innerHTML=spin+"Suche läuft …";
  try{
    const id=uid();
    const text=await pdfToText(bpmFile);
    if(!text || text.length<20) throw new Error("Aus dem PDF liess sich kein Text lesen (evtl. gescanntes Bild-PDF).");
    const resp=await jpost("/api/bpm",{id,text,filename:bpmFile.name});
    if(resp.error) throw new Error(resp.error);
    pollJob(id,$("#bpm-result"),renderBpm,()=>{ btn.disabled=false; btn.textContent="Referent:innen suchen"; });
  }catch(e){ msg.className="form-msg err"; msg.textContent="Fehler: "+String(e.message||e); btn.disabled=false; btn.textContent="Referent:innen suchen"; }
}
function renderBpm(list){
  if(!Array.isArray(list)||!list.length) return '<p class="empty">Keine passenden Personen gefunden.</p>';
  return `<h3>Vorgeschlagene Referent:innen</h3>`+list.map(p=>`<div class="person"><div class="nm">${esc(p.name)}<span class="flag">${esc(p.country||"DACH")}</span></div>
    <div class="ro">${esc(p.role||"")}</div><div style="font-size:13px;margin:6px 0"><b>Warum passend:</b> ${esc(p.why||"")}</div>
    <div class="ev">${(p.evidence||[]).length?(p.evidence).map(e=>`<a class="evtag" href="${esc(e.url)}" target="_blank" rel="noopener">${esc(e.type||"Quelle")}: ${esc(e.title||"Link")} ↗</a>`).join(""):'<span class="note">Keine Quelle angegeben</span>'}</div></div>`).join("");
}

/* ================= SETTINGS ================= */
let settings=null;
const PRICES={ "claude-opus-4-8":{in:15,out:75}, "claude-sonnet-4-6":{in:3,out:15}, "claude-haiku-4-5-20251001":{in:1,out:5} };
const WS_PER_1000=10;
// Hinweis: Bei Web-Recherche fliessen die gefundenen Seiteninhalte als Input-Tokens
// in den Kontext – darum sind die Input-Tokens dort sehr hoch (kalibriert an realen Läufen).
const USECASES=[
  ["Market Research",{calls:5,in:110000,out:1500,searches:25}],
  ["Syllabus Comparison",{calls:1,in:20000,out:1500,searches:0}],
  ["Sales Assistant (pro Vorbereitung)",{calls:1,in:3000,out:1200,searches:0}],
  ["BPM Finder",{calls:1,in:50000,out:2000,searches:8}],
];
function costFor(model,u){ const p=PRICES[model]||{in:0,out:0}; const tok=u.calls*(u.in/1e6*p.in + u.out/1e6*p.out); const s=u.searches/1000*WS_PER_1000; return tok+s; }
function renderCostTable(){
  const model=$("#set-model").value;
  $("#cost-table").innerHTML=USECASES.map(([name,u])=>`<div class="kv"><span>${name}</span><b>≈ $${costFor(model,u).toFixed(2)}</b></div>`).join("");
}
async function loadSettings(){
  settings=await jget("/api/settings");
  if(!settings||!settings.model){ settings={model:"claude-sonnet-4-6",autoMarket:"off"}; }
  $("#set-model").innerHTML=MODELS.map(([v,l])=>`<option value="${v}" ${settings.model===v?"selected":""}>${l}</option>`).join("");
  $("#set-auto").value=settings.autoMarket||"off";
  renderCostTable(); updateAutoIndicator();
  $("#set-model").addEventListener("change",renderCostTable);
  loadSubs();
}
function updateAutoIndicator(){
  const v=(settings&&settings.autoMarket)||"off";
  const el=$("#market-auto"); if(el){
    el.textContent={off:"Auto: aus",weekly:"Auto: alle 7 Tage",monthly:"Auto: alle 30 Tage"}[v];
    el.className="badge "+(v==="off"?"badge--none":"badge--news");
  }
  setRunBtn();
}
function setRunBtn(){
  const b=$("#run-market"); if(!b) return;
  const autoOn=settings&&settings.autoMarket&&settings.autoMarket!=="off";
  b.disabled = !!autoOn || marketPolling;
  b.title = autoOn ? "Automatische Analyse aktiv – manueller Start deaktiviert" : "";
}
async function saveSettings(){
  const msg=$("#set-msg"); msg.className="form-msg";
  const r=await jpost("/api/settings",{model:$("#set-model").value,autoMarket:$("#set-auto").value});
  if(r.model){ settings=r; msg.className="form-msg ok"; msg.textContent="Gespeichert."; updateAutoIndicator(); }
  else { msg.className="form-msg err"; msg.textContent=r.error||"Fehler."; }
}
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
  target.innerHTML='<p class="empty">'+spin+'Wird analysiert … (1–5 Min.)</p>';
  let n=0; const iv=setInterval(async()=>{ n++;
    const d=await jget("/api/job?id="+id);
    if(d.status==="ready"){ target.innerHTML=render(d.result); clearInterval(iv); done&&done(); }
    else if(d.status==="error"){ target.innerHTML='<p class="form-msg err">Fehler: '+esc(d.error||"")+'</p>'; clearInterval(iv); done&&done(); }
    else if(n>=70){ target.innerHTML='<p class="empty">Zeitüberschreitung – bitte erneut versuchen.</p>'; clearInterval(iv); done&&done(); }
  },6000);
}
function pollJobResult(id,opts={}){
  const interval=opts.interval||3000, tries=opts.tries||80;
  return new Promise((resolve,reject)=>{
    let n=0; const iv=setInterval(async()=>{ n++;
      const d=await jget("/api/job?id="+id);
      if(d.status==="ready"){ clearInterval(iv); resolve(d.result); }
      else if(d.status==="error"){ clearInterval(iv); reject(new Error(d.error||"Fehler")); }
      else if(n>=tries){ clearInterval(iv); reject(new Error("Zeitüberschreitung – bitte erneut versuchen.")); }
    },interval);
  });
}

/* ---------- init ---------- */
function init(){
  initTabs(); initSubClusters(); initSyllabus(); initSales(); initBpm();
  $("#run-market").addEventListener("click",runMarket);
  $("#sub-add").addEventListener("click",subAdd);
  $("#set-save").addEventListener("click",saveSettings);
  loadMarket(); loadSettings();
}
document.addEventListener("DOMContentLoaded",init);
