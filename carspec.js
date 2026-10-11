/* ══════════════════════════════════════════════════════════════════
   สเปกรถจริง (หน้าเว็บ) — อ่านจากคลังสเปกกลางของ Cendon (/api/car-spec)

   คนแรกที่เลือกรุ่นนั้น Cendon อ่านเอกสารจริง แล้ว Gemini สกัดสองรอบเทียบทีละช่อง เก็บไว้ในคลัง
   คนต่อไปได้ข้อมูลชุดเดียวกันทันที — ไม่มีตัวเลขเดาจากประเภทตัวถังอีกแล้ว

   ทุกค่าบอกที่มา: ✓ ผลสกัดตรงกัน (ไม่ใช่สองแหล่งอิสระ) · • ผลรอบเดียว · ⚠ ข้อมูลไม่ตรงกัน
   ค่าที่หาไม่เจอ = ไม่แสดง (ไม่เดา) · ผู้ใช้กด "แจ้งข้อมูลผิด" ได้ ทีมงานตรวจแล้วขึ้นป้าย "ทีมงานตรวจแล้ว"

   ใช้ในหน้ารายละเอียดรถ (แท็บสเปก/อุปกรณ์) ทุกหน้าที่เปิดรถได้
   ══════════════════════════════════════════════════════════════════ */
(function(){
"use strict";
const API=()=>(window.BACKEND_URL||"https://spireonebackend.carspirethailand.workers.dev");
const T=(th,en)=>(window.spireT?window.spireT(th,en):((window.lang||"th")==="en"?en:th));
const esc=s=>String(s==null?"":s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const num=n=>Number(n).toLocaleString("en-US",{maximumFractionDigits:1});
const keyOf=c=>[c.make,c.model,c.year,...(c.market&&c.market!=="TH"?[c.market]:[])].map(s=>String(s==null?"":s).normalize("NFC").trim().replace(/\s+/g," ").toLowerCase()).join("|");
const LS={get(k){try{return JSON.parse(localStorage.getItem("spire_"+k))}catch(e){return null}},set(k,v){try{localStorage.setItem("spire_"+k,JSON.stringify(v))}catch(e){}}};
const DONE=["ready","verified","notfound"];
const safeURL=raw=>{try{const u=new URL(raw);return ['https:','http:'].includes(u.protocol)&&!u.username&&!u.password}catch{return false}};

/* ชื่อยี่ห้อ/รุ่นของรถคันนี้ — รถเก่าบางคันมีแต่ชื่อรวม */
function q(c){
  let make=String(c.make||"").trim(),model=String(c.model||"").trim();
  if(!make&&c.name){make=String(c.name).split(" ")[0];model=String(c.name).slice(make.length).trim()}
  return {make,model:model||make,year:String(c.info?.model_year||c.year||"").trim(),...(c.info?.market&&c.info.market!=="TH"?{market:c.info.market}:{})};
}
/* ล็อกอินอยู่ต้องส่งตัวตนไปด้วย — ไม่งั้นหลังบ้านนับเป็นผู้ไม่ล็อกอิน (โควตาตาม IP วันละ 3 รุ่น) */
async function tok(){
  try{
    const a=window.spireAuth||window.auth||(window.firebase&&firebase.apps&&firebase.apps.length&&firebase.auth?firebase.auth():null);
    if(a&&a.currentUser)return await a.currentUser.getIdToken();
  }catch(e){}
  return "";
}
/* บันทึกฝั่งเครื่องนี้ทุกขั้น — แผงผู้ดูแลแบบลอยอ่านไปแสดงทุกหน้า (ผู้ใช้ทั่วไปไม่เห็น อยู่แค่ในเครื่อง) */
function clog(msg,o){
  try{const a=JSON.parse(localStorage.getItem("spire_adminLog")||"[]");
    a.unshift({at:Date.now(),src:"spec",page:location.pathname,msg,...(o||{})});
    localStorage.setItem("spire_adminLog",JSON.stringify(a.slice(0,80)));
    window.dispatchEvent(new Event("spire-adminlog"));}catch(e){}
}
async function call(method,path,body){
  const t0=Date.now(),ac=new AbortController();let timer,credential='';
  const expiry=new Promise((_,reject)=>{timer=setTimeout(()=>{ac.abort();reject(Object.assign(new Error('Spec request timed out'),{name:'AbortError'}))},method==="POST"&&path==="/api/car-spec"?65000:12000)});
  try{return await Promise.race([expiry,(async()=>{
    credential=await tok();if(ac.signal.aborted)throw Object.assign(new Error('timed out'),{name:'AbortError'});
    const r=await fetch(API()+path,{method,signal:ac.signal,headers:{"Content-Type":"application/json",...(credential?{Authorization:"Bearer "+credential}:{})},body:body?JSON.stringify(body):undefined});
    const j=await r.json().catch(()=>({}));if(ac.signal.aborted)throw Object.assign(new Error('timed out'),{name:'AbortError'});
    if(!r.ok)throw Object.assign(new Error(j.error||("HTTP "+r.status)),{status:r.status});
    j._ms=Date.now()-t0;j._auth=!!credential;return j;
  })()])}catch(e){clog(method+" "+path.split("?")[0]+" ไม่สำเร็จ",{st:e.status||0,err:String(e.message||e),ms:Date.now()-t0,auth:!!credential});throw e}finally{clearTimeout(timer)}
}

/* ขอข้อมูลรุ่นนี้ — ในเครื่องมีแล้วใช้เลย · ยังไม่มีให้หลังบ้านหา (ครั้งแรกของรุ่นนี้ทั้งระบบเท่านั้นที่เรียก AI) */
const inflight={},recentFailures=new Map();
async function ensure(c,opt){
  const Q=q(c),k=keyOf(Q),retry=!!(opt&&opt.retry),car=[Q.make,Q.model,Q.year].join(" ");
  if(!/^\d{4}$/.test(Q.year)||!Q.make){clog("ไม่ค้น: ข้อมูลรถไม่ครบ ("+(Q.make?"ไม่มีปี":"ไม่มียี่ห้อ")+")",{car});return {status:"invalid"}}
  const have=LS.get("spec_"+k);
  if(!retry&&have&&DONE.includes(have.status)&&(have.status==="notfound"||have.status==="verified"||have.data?.schema===2&&have.sources?.length)&&Date.now()-(have._at||0)<(have.status==="notfound"?86400000:7*86400000)){
    clog("ใช้ข้อมูลที่เก็บในเครื่อง ("+have.status+")",{car,ok:true});return have}
  const recent=recentFailures.get(k);
  if(!retry&&recent&&Date.now()-recent.at<120000)return recent.value;
  if(inflight[k])return inflight[k];
  inflight[k]=(async()=>{
    /* ครั้งแรกของรุ่นนี้ หลังบ้านอ่านเอกสารแล้วสกัดสองรอบ
       "ลองใหม่" = ขอให้ค้นใหม่จริง ไม่ใช่ดึงผลที่ไม่สำเร็จเดิม */
    const t0=Date.now();
    clog((retry?"กดลองใหม่ — ":"")+"ขอสเปกจากหลังบ้าน",{car});
    let r=await call("POST","/api/car-spec",retry?{...Q,retry:true}:Q);
    clog("หลังบ้านตอบ: "+r.status,{car,ok:r.status!=="failed"&&r.status!=="limited",ms:r._ms,auth:r._auth,err:r.error||"",trace:r.trace});
    /* อีกคนกำลังหาอยู่ — รอผลของเขา */
    let n=0;
  for(;n<20&&r.status==="pending";n++){await new Promise(z=>setTimeout(z,2000));r=await call("GET","/api/car-spec?"+new URLSearchParams(Q));}
    if(r.status==="pending")return {...r,status:"timeout",retryable:true};
    if(n)clog("รอผลค้น "+n+" รอบ → "+r.status,{car,ok:DONE.includes(r.status),ms:Date.now()-t0,err:r.error||(r.status==="pending"?"เกิน 2 นาทีแล้วยังค้นไม่เสร็จ":"")});
    if(r.key&&r.key!==k)return {status:'unconfirmed',code:'unconfirmed'};
    if(DONE.includes(r.status)){LS.set("spec_"+k,{...r,_at:Date.now()});recentFailures.delete(k)}
    else if(['failed','unconfirmed','timeout'].includes(r.status)){recentFailures.set(k,{at:Date.now(),value:r});if(recentFailures.size>32)recentFailures.delete(recentFailures.keys().next().value)}
    return r;
  })().finally(()=>{delete inflight[k]});
  return inflight[k];
}

/* ─────────── แสดงผล ─────────── */
const mark=f=>!f?"":f.ok===true?`<i class="ti ti-circle-check cs-ok" title="${T("ผลค้นสองรอบตรงกัน ไม่ใช่การรับรองจากผู้ผลิต","Two lookup results agree; not a manufacturer certification")}"></i>`
  :f.ok===false?`<i class="ti ti-alert-triangle cs-bad" title="${T("แหล่งข้อมูลไม่ตรงกัน","Sources disagree")}"></i>`
  :`<i class="ti ti-point cs-one" title="${T("ผลสกัดรอบเดียว","One extraction pass")}"></i>`;
function refs(ids,sources){return (sources||[]).map((s,i)=>({s,i})).filter(x=>(ids||[]).includes(x.s.docId)&&safeURL(x.s.url)).map(({s,i})=>`<a class="cs-ref" href="${esc(s.url)}" title="${esc(s.title||T('แหล่งข้อมูล','Source'))}" target="_blank" rel="noopener noreferrer nofollow">[${i+1}]</a>`).join('')}
function val(f,unit,fmt,sources){
  if(!f||f.v==null||f.v==="")return null;
  const show=v=>(fmt?fmt(v):typeof v==="number"?num(v):esc(v))+(unit?" "+unit:"");
  return show(f.v)+(f.ok===false&&f.alt!=null?` <span class="cs-alt">${T("หรือ","or")} ${show(f.alt)}</span>`:"")+mark(f)+refs(f.sourceIds,sources);
}
const row=(k,html)=>html?`<div class="cl-spec"><span class="k">${esc(k)}</span><span class="v">${html}</span></div>`:"";
const FUEL={petrol:["เบนซิน","Petrol"],diesel:["ดีเซล","Diesel"],hybrid:["ไฮบริด","Hybrid"],phev:["ปลั๊กอินไฮบริด","Plug-in hybrid"],ev:["ไฟฟ้า","Electric"],lpg:["แก๊ส","LPG"]};
const DRIVE={FWD:["ขับหน้า","FWD"],RWD:["ขับหลัง","RWD"],"4WD":["ขับสี่ (4WD)","4WD"],AWD:["ขับสี่ตลอดเวลา (AWD)","AWD"]};
const BODY={sedan:["ซีดาน","Sedan"],hatchback:["แฮทช์แบ็ก","Hatchback"],suv:["เอสยูวี","SUV"],pickup:["กระบะ","Pickup"],mpv:["เอ็มพีวี","MPV"],
  van:["รถตู้","Van"],coupe:["รถสปอร์ต / คูเป้","Sports car / Coupe"],ev:["รถไฟฟ้า","Electric"]};
const lab=(m,k)=>m[k]?T(m[k][0],m[k][1]):k;

/* Saved exact variant or exact unique trim; never silently select the first. */
function variantIdx(c,s){
  const vs=(s.data&&s.data.variants)||[];if(!vs.length)return -1;
  if(vs.length===1&&s.verified)return 0;
  const saved=LS.get("specv_"+c.id);if(saved?.key===s.key){const i=vs.findIndex(v=>variantKey(v)===saved.variant);if(i>=0)return i}
  const hint=String(c.info?.trim||'').trim().toLowerCase();
  const matches=hint?vs.map((v,i)=>String(v.name||'').trim().toLowerCase()===hint?i:-1).filter(i=>i>=0):[];
  return matches.length===1?matches[0]:-1; // Never silently choose the first engine/trim.
}
const variantKey=v=>JSON.stringify([v.name,v.engine?.v,v.cc?.v,v.fuel,v.gearbox?.v,v.drive?.v]);
function head(s){
  const sc=(s.data&&s.data.score)||{},n=(s.sources||[]).length,sites=s.data?.coverage?.siteCount||new Set((s.sources||[]).filter(x=>safeURL(x.url)).map(x=>new URL(x.url).hostname.replace(/^www\./,''))).size;
  return `<div class="cs-head">
    ${s.verified?`<span class="cs-badge ok"><i class="ti ti-rosette-discount-check"></i>${T("ทีมงานตรวจแล้ว","Verified by our team")}</span>`
      :`<span class="cs-badge"><i class="ti ti-world-search"></i>${T(`AI · ${sites} เว็บ · ${n} เอกสาร · ผลสกัดตรงกัน ${sc.confirmed||0}/${sc.cells||0} ช่อง`,`AI · ${sites} sites · ${n} documents · ${sc.confirmed||0}/${sc.cells||0} fields agree`)}</span>`}
    ${s.data&&s.data.generation?`<span class="cs-gen">${esc(s.data.generation)}${s.data.market?" · "+esc(s.data.market):""}</span>`:""}
  </div>${!s.verified?`<p class="cs-hint">${T(sites<5?"ยังได้เว็บอ้างอิงไม่ครบ 5 เว็บ — ผลสกัดสองรอบไม่ใช่สองแหล่งอิสระ ตรวจคู่มือและรุ่นย่อยก่อนนำไปใช้":"ผลค้นของ AI ยังไม่ใช่การรับรองสเปก ตรวจคู่มือและรุ่นย่อยก่อนนำไปใช้",sites<5?"Fewer than five sites found. Two extraction passes are not independent sources. Check the manual and variant before use.":"AI research is not a specification certification. Check the manual and variant before use.")}</p>`:""}`;
}
function specHTML(c,s){
  const d=s.data||{},f=d.facts||{},vs=d.variants||[],vi=variantIdx(c,s),v=vs[vi]||{};
  const show=(f,unit,fmt)=>val(f,unit,fmt,s.sources);
  const ev=v.fuel==="ev"||d.body==="ev";
  const l100=v.l_per_100km&&v.l_per_100km.v;
  return head(s)+
  (vs.length&&(!s.verified||vs.length>1)?`<div class="cs-vars" role="radiogroup" aria-label="${T("รุ่นย่อย","Variant")}">${vs.map((x,i)=>
    `<button type="button" class="cs-var${i===vi?" on":""}" data-cs-var="${i}" role="radio" aria-checked="${i===vi}">${esc(x.name||(x.engine&&x.engine.v)||T("รุ่นย่อย ","Variant ")+(i+1))}</button>`).join("")}</div>
    <p class="cs-hint">${T(vi<0?"เลือกรุ่นย่อยหรือเครื่องยนต์ที่ตรงกับรถก่อน — อาจยังมีรุ่นย่อยอื่นที่ค้นไม่พบ":"รุ่นย่อยที่คุณเลือก สเปกต่างกันตามเครื่องยนต์และระบบขับเคลื่อน",vi<0?"Choose your variant first. Other variants may not have been found yet.":"Your selected variant — specs differ by engine and drivetrain")}</p>`:"")+
  `<div class="cl-grp"><h4>${T("เครื่องยนต์และการขับเคลื่อน","Powertrain")}</h4>
    ${row(T("เครื่องยนต์","Engine"),show(v.engine))}
    ${row(T("เชื้อเพลิง","Fuel"),v.fuel?esc(lab(FUEL,v.fuel))+refs(v.fuelSourceIds,s.sources):null)}
    ${ev?"":row(T("ความจุกระบอกสูบ","Displacement"),show(v.cc,"cc"))}
    ${row(T("กำลังสูงสุด","Power"),show(v.hp,T("แรงม้า","hp")))}
    ${row(T("แรงบิดสูงสุด","Torque"),show(v.torque_nm,"Nm"))}
    ${row(T("ระบบเกียร์","Gearbox"),show(v.gearbox))}
    ${row(T("ระบบขับเคลื่อน","Drive"),v.drive&&v.drive.v?show({...v.drive,v:lab(DRIVE,v.drive.v),alt:v.drive.alt&&lab(DRIVE,v.drive.alt)}):null)}
    ${ev?row(T("แบตเตอรี่","Battery"),show(v.battery_kwh,"kWh"))+row(T("ระยะทางต่อการชาร์จ","Range"),show(v.range_km,T("กม.","km"))):""}
    ${ev?"":row(T("อัตราสิ้นเปลือง","Fuel economy"),show(v.l_per_100km,T("ลิตร/100 กม.","L/100km")))}
    ${!ev&&l100?row(T("เทียบเป็น","Equivalent"),num(100/l100)+" "+T("กม./ลิตร","km/L")):""}
  </div>
  <div class="cl-grp"><h4>${T("ตัวถังและขนาด","Body & dimensions")}</h4>
    ${row(T("ประเภทตัวถัง","Body type"),d.body?esc(lab(BODY,d.body))+(d.body_ok?mark({ok:true}):mark({ok:null}))+refs(d.bodySourceIds,s.sources):null)}
    ${row(T("จำนวนที่นั่ง","Seats"),show(f.seats,T("ที่นั่ง","seats")))}
    ${row(T("จำนวนประตู","Doors"),show(f.doors,T("ประตู","doors")))}
    ${row(T("ยาว","Length"),show(f.length_mm,"มม."))}
    ${row(T("กว้าง","Width"),show(f.width_mm,"มม."))}
    ${row(T("สูง","Height"),show(f.height_mm,"มม."))}
    ${row(T("ฐานล้อ","Wheelbase"),show(f.wheelbase_mm,"มม."))}
    ${row(T("น้ำหนักตัวรถ","Kerb weight"),show(f.kerb_kg,"กก."))}
    ${ev?"":row(T("ความจุถังน้ำมัน","Fuel tank"),show(f.tank_l,T("ลิตร","L")))}
    ${row(T("ขนาดยางเดิม","Tyre size"),show(f.tire))}
  </div>
  ${d.notes?`<div class="cl-grp"><h4>${T("ข้อควรรู้ของรุ่นนี้","Good to know")}</h4><p class="cs-note">${esc(d.notes)}</p></div>`:""}`+foot(s);
}
function foot(s){
  const src=(s.sources||[]).filter(x=>safeURL(x.url));
  return `${src.length?`<div class="cl-grp"><h4>${T("แหล่งข้อมูล","Sources")}</h4><div class="cs-src">${src.map(x=>
      `<a href="${esc(x.url)}" target="_blank" rel="noopener noreferrer nofollow">${esc(x.title||T("แหล่งข้อมูล","Source"))}<i class="ti ti-external-link"></i></a>`).join("")}</div></div>`:""}
  <div class="cs-legend"><span>${mark({ok:true})}${T("ผลค้นตรงกัน","Lookup results agree")}</span><span>${mark({ok:null})}${T("ผลค้นรอบเดียว","One lookup result")}</span><span>${mark({ok:false})}${T("ผลค้นไม่ตรงกัน","Lookup results differ")}</span></div>
  <div class="cs-report" data-cs-key="${esc(s.key)}">
    <button type="button" class="btn" data-cs-report><i class="ti ti-flag"></i> ${T("แจ้งข้อมูลผิด","Report wrong data")}</button>
    <form class="cs-form" hidden><textarea maxlength="500" rows="3" placeholder="${T("ช่องไหนผิด และค่าที่ถูกคืออะไร (ถ้ามีลิงก์ยืนยันใส่มาได้)","Which value is wrong and what is correct (a link helps)")}"></textarea>
      <div class="cs-fa"><button type="submit" class="btn primary">${T("ส่งให้ทีมงานตรวจ","Send to our team")}</button><button type="button" class="btn" data-cs-cancel>${T("ยกเลิก","Cancel")}</button></div></form>
  </div>`;
}
function equipHTML(c,s){
  const d=s.data||{},chips=a=>`<div class="cl-chips">${a.map(x=>`<span class="cl-chip yes"><i class="ti ti-check"></i>${esc(x)}</span>`).join("")}</div>`;
  if(!(d.safety||[]).length&&!(d.comfort||[]).length)return state("ti-info-circle",T("ยังไม่พบรายการอุปกรณ์ของรุ่นนี้จากแหล่งข้อมูล","No equipment list found for this model yet"));
  return head(s)+
    ((d.safety||[]).length?`<div class="cl-grp"><h4>${T("ความปลอดภัย","Safety")}</h4>${chips(d.safety)}</div>`:"")+
    ((d.comfort||[]).length?`<div class="cl-grp"><h4>${T("ความสะดวกสบาย","Comfort & tech")}</h4>${chips(d.comfort)}</div>`:"")+
    `<p class="cs-hint">${T("รวมจากทุกรุ่นย่อยของปีนั้น บางรายการมีเฉพาะรุ่นย่อยที่สูงกว่า","Across all variants of that year — some items are higher trims only")}</p>`+foot(s);
}
function partsHTML(c,s){
  const vi=variantIdx(c,s),v=s.data?.variants?.[vi]||{},f=s.data?.facts||{};
  return head(s)+`<div class="cl-grp"><h4>${T("ข้อมูลอะไหล่ที่พบจากแหล่งอ้างอิง","Sourced fitment information")}</h4>${row(T("ขนาดยางเดิม","Factory tyre size"),val(f.tire))}${row(T("เครื่องยนต์รุ่นย่อยที่เลือก","Selected variant engine"),val(v.engine))}
    <p class="cs-hint">${T("ยังไม่มีรหัสแบตเตอรี่ ขนาดใบปัดน้ำฝน หรือปริมาณน้ำมันเครื่องที่ยืนยันได้ของคันนี้ — ตรวจคู่มือหรือให้ศูนย์เช็ก VIN ก่อนซื้อ","No verified battery, wiper or engine-oil specification is available here. Check the manual or ask your dealer to verify your VIN before buying.")}</p></div>`+foot(s);
}
const state=(ic,msg,btn)=>`<div class="cs-state"><i class="ti ${ic}"></i><p>${msg}</p>${btn||""}</div>`;
function loadingHTML(c){
  const Q=q(c);
  return `<div class="cs-state cs-loading"><span class="cs-spin"></span>
    <p><b>${T("กำลังค้นสเปกจริงของ","Looking up real specs for")} ${esc(Q.make+" "+Q.model+" "+Q.year)}</b><br>
    ${T("หาจากหลายแหล่งแล้วเทียบกัน — รุ่นนี้ค้นครั้งแรก อาจใช้เวลาถึง 1 นาที คนต่อไปจะเห็นทันที","Checking several sources — the first lookup for this model can take up to a minute, then it’s instant for everyone")}</p></div>`;
}

/* ช่องในแท็บ: คืนตัววางที่ไว้ก่อน แล้วเติมเนื้อหาเมื่อได้ข้อมูล */
let seq=0;const PANES={};
function pane(c,kind,extra){
  const id="cs"+(++seq);
  PANES[id]={kind,extra:extra||""};
  setTimeout(()=>fill(id,c,kind,extra||""),0);
  return `<div class="cs-wrap" id="${id}">${loadingHTML(c)}</div>`;
}
async function fill(id,c,kind,extra,opt){
  const el=document.getElementById(id);if(!el)return;
  let s;
  try{s=await ensure(c,opt)}catch(e){s={status:e.name==="AbortError"?"timeout":e.status===400?"invalid":e.status===404||e.status===405?"unavailable":e.status?"error":"offline",error:e.message}}
  const el2=document.getElementById(id);if(!el2)return;
  const retry=`<button type="button" class="btn" data-cs-retry>${T("ลองใหม่","Try again")}</button>`;
  const code=s.code||(/source_unavailable|discovery_http/i.test(s.error||'')?'source_unavailable':/429|RESOURCE_EXHAUSTED|quota/i.test(s.error||'')?'provider_quota':/401|403|API.key|permission|คีย์/i.test(s.error||'')?'provider_auth':/404|NOT_FOUND/.test(s.error||'')?'provider_model':/แหล่ง|ground|ยืนยัน|ข้อมูลที่ใช้ได้/i.test(s.error||'')?'unconfirmed':/เกิน|timeout|AbortError/i.test(s.error||'')?'timeout':'');
  const Q=q(c),details=`<button type="button" class="btn" data-cs-details>${T('ตรวจปีรุ่นและตลาดรถ','Check model year & market')}</button>`;
  if(s.status==="ready"&&(!s.sources?.length||!s.data?.score?.cells))s={status:"unconfirmed"};
  if(!['ready','verified','invalid','notfound','limited','pending','offline','unavailable','failed','error','unconfirmed','timeout'].includes(s.status))s={status:'unconfirmed'};
  PANES[id]={kind,extra:extra||"",spec:s};
  el2.innerHTML=
    code==="provider_quota"?state("ti-clock-pause",T("ยังสรุปสเปกไม่ได้: Gemini ปฏิเสธคำขอด้วยข้อจำกัดโควตา ผู้ดูแลต้องตรวจโปรเจกต์และโมเดล — รีเฟรชหน้าไม่ช่วย และเราไม่ใส่ตัวเลขเดาแทน","Specs unavailable: Gemini project quota was rejected. The owner must check the project/model. Refreshing cannot fix this; no guessed specs are shown."))+extra
   :code==="source_unavailable"?state("ti-file-search",T("เปิดแหล่งเอกสารไม่ได้ในขณะนี้ — ข้อมูลรถยังอยู่ ลองใหม่ภายหลังโดยไม่ต้องรีเฟรชแอป","Public documents are unavailable right now. Your car data is unchanged. Try again later without refreshing the app."),retry)+extra
   :code==="provider_auth"||code==="provider_model"?state("ti-plug-off",T("ระบบค้นสเปกยังไม่พร้อม: ผู้ดูแลต้องตรวจคีย์หรือโมเดล AI ข้อมูลรถของคุณยังอยู่","Spec search is not configured correctly. The owner must check the AI key/model. Your car data is unchanged."))+extra
   :code==="unconfirmed"||s.status==="unconfirmed"?state("ti-file-search",`<b>${esc(Q.make+' '+Q.model+' '+Q.year)}</b><br>`+T("ยังไม่มีสเปกที่มีแหล่งอ้างอิงเพียงพอและตรงกับปี/ตลาดรถ — ตรวจปีรุ่น (ไม่ใช่ปีจดทะเบียน) และตลาดในข้อมูลรถ ไม่ต้องรีเฟรชแอป เราจะไม่แสดงตัวเลขเดาเป็นสเปกจริง","No sufficiently sourced specification matches the model year and vehicle market. Check the model year (not registration year) and market in your car details; refreshing the app is not needed. Estimates will not be shown as real specs."),details+retry)+extra
   :code==="timeout"||s.status==="timeout"?state("ti-hourglass",T("การค้นครั้งนี้ใช้เวลานานเกินกำหนด ยังไม่ได้ผลสเปก — ไม่จำเป็นต้องรีเฟรชทั้งแอป","This lookup timed out without a specification. You do not need to refresh the app."),retry)+extra
   :s.status==="invalid"?state("ti-calendar-question",T("ตรวจยี่ห้อ ชื่อรุ่น และปีรุ่นก่อนค้นสเปก","Check the make, model and model year before searching"))+extra
   :s.status==="notfound"?state("ti-search-off",T("ไม่พบข้อมูลของรุ่นนี้ในปีนี้ — ตรวจชื่อรุ่นและปีอีกครั้ง","No data for this model in this year — check the model and year"))+extra
   :s.status==="limited"?state("ti-clock-pause",T("วันนี้ค้นรุ่นใหม่ครบโควตาแล้ว ลองใหม่พรุ่งนี้ หรือเข้าสู่ระบบเพื่อค้นต่อ","Daily lookup limit reached — try tomorrow or sign in"))+extra
   :s.status==="pending"?state("ti-hourglass",T("ยังค้นข้อมูลรุ่นนี้อยู่ — กลับมาเปิดแท็บนี้อีกครั้งในอีกสักครู่","Still looking this model up — check back in a moment"),retry)+extra
   :s.status==="offline"?state("ti-wifi-off",T("เชื่อมต่ออินเทอร์เน็ตไม่ได้ ลองใหม่อีกครั้ง","No connection — please try again"),retry)+extra
   :s.status==="unavailable"?state("ti-tools",T("ระบบข้อมูลสเปกกำลังอัปเดต ลองใหม่อีกครั้งภายหลัง","Specs are being updated — please try again later"),retry)+extra
   :s.status==="failed"||s.status==="error"?state("ti-cloud-off",T("ค้นข้อมูลรุ่นนี้ไม่สำเร็จ ลองใหม่อีกสักครู่","Couldn’t look up this model — try again shortly"),retry)+extra
   :((kind==="equip"?equipHTML(c,s):kind==="parts"?partsHTML(c,s):specHTML(c,s))+extra);
  el2.dataset.car=c.id;
  /* ประเภทตัวถังที่สองแหล่งยืนยันตรงกัน → แจ้งหน้าเว็บให้ใช้ (ภาพรถในการาจ) */
  if(s.verified&&s.data&&s.data.body&&s.data.body_ok&&s.data.body!==c.type){
    try{document.dispatchEvent(new CustomEvent("carspec:body",{detail:{id:c.id,body:s.data.body}}))}catch(e){}
  }
}

document.addEventListener("click",async e=>{
  const w=e.target.closest(".cs-wrap");if(!w)return;
  const car=()=>{try{return (window.garage?window.garage():[]).find(x=>x.id===w.dataset.car)}catch(err){return null}};
  const vb=e.target.closest("[data-cs-var]");
  const P=PANES[w.id]||{kind:"spec",extra:""};
  if(e.target.closest('[data-cs-details]')){const c=car();if(c){if(typeof window.openInfo==='function')window.openInfo(c.id);else location.assign('/garage/'+encodeURIComponent(c.id)+'/info')}return}
  if(vb){const v=P.spec?.data?.variants?.[Number(vb.dataset.csVar)];if(!v)return;LS.set("specv_"+w.dataset.car,{key:P.spec.key,variant:variantKey(v)});const c=car();if(c)fill(w.id,c,P.kind,P.extra);return}
  if(e.target.closest("[data-cs-retry]")){const c=car();if(c){w.innerHTML=loadingHTML(c);fill(w.id,c,P.kind,P.extra,{retry:true})}return}
  const rp=e.target.closest(".cs-report");if(!rp)return;
  const form=rp.querySelector(".cs-form");
  if(e.target.closest("[data-cs-report]")){form.hidden=false;form.querySelector("textarea").focus();return}
  if(e.target.closest("[data-cs-cancel]")){form.hidden=true;return}
});
document.addEventListener("submit",async e=>{
  const form=e.target.closest(".cs-form");if(!form)return;
  e.preventDefault();
  const rp=form.closest(".cs-report"),ta=form.querySelector("textarea"),b=form.querySelector("button[type=submit]");
  if(!ta.value.trim()){ta.focus();return}
  b.disabled=true;
  try{await call("POST","/api/car-spec/report",{key:rp.dataset.csKey,note:ta.value.trim()});
    rp.innerHTML=`<p class="cs-thanks"><i class="ti ti-check"></i>${T("ส่งแล้ว ขอบคุณครับ — ทีมงานจะตรวจและแก้ให้ทุกคนที่ใช้รุ่นนี้","Sent, thank you — our team will check and fix it for everyone")}</p>`}
  catch(err){b.disabled=false;alert(err.message)}
});

/* หน้าตา (สีจากธีมของหน้า) */
const st=document.createElement("style");st.textContent=`
.cs-head{display:flex;flex-wrap:wrap;align-items:center;gap:8px 12px;margin:0 0 16px}
.cs-badge{display:inline-flex;align-items:center;gap:6px;padding:5px 11px;border-radius:999px;font-size:12px;font-weight:600;
  background:var(--surface-2);color:var(--muted);border:1px solid var(--line)}
.cs-badge.ok{background:color-mix(in srgb,#16a34a 12%,transparent);color:#16a34a;border-color:color-mix(in srgb,#16a34a 30%,transparent)}
.cs-badge i{font-size:15px}
.cs-gen{font-size:12px;color:var(--faint)}
.cs-ok{color:#16a34a;margin-left:5px;font-size:14px;vertical-align:-2px}
.cs-one{color:var(--faint);margin-left:3px;font-size:14px;vertical-align:-2px}
.cs-bad{color:#d97706;margin-left:5px;font-size:14px;vertical-align:-2px}
.cs-alt{color:#d97706;font-weight:500;font-size:.92em}
.cs-vars{display:flex;flex-wrap:wrap;gap:6px;margin:0 0 6px}
.cs-var{padding:7px 12px;border-radius:999px;border:1px solid var(--line);background:var(--surface);color:var(--ink);font:inherit;font-size:12.5px;cursor:pointer}
.cs-var.on{border-color:var(--co,var(--accent));background:var(--co-soft,var(--surface-2));color:var(--co,var(--accent));font-weight:600}
.cs-hint{font-size:12px;color:var(--faint);margin:0 0 16px;line-height:1.55}
.cs-note{font-size:13.5px;line-height:1.65;margin:0;color:var(--ink)}
.cs-src{display:flex;flex-wrap:wrap;gap:6px}
.cs-src a{display:inline-flex;align-items:center;gap:5px;padding:5px 10px;border-radius:999px;border:1px solid var(--line);font-size:12px;color:var(--muted);text-decoration:none}
.cs-src a:hover{border-color:var(--co,var(--accent));color:var(--co,var(--accent))}
.cs-src i{font-size:12px}
.cs-ref{font-size:10px;vertical-align:super;margin-left:4px;color:var(--co,var(--accent));text-decoration:none}
.cs-legend{display:flex;flex-wrap:wrap;gap:6px 14px;margin:6px 0 14px;font-size:11.5px;color:var(--faint)}
.cs-legend i{margin:0 3px 0 0!important}
.cs-report{margin:4px 0 6px}
.cs-form{margin-top:10px}
.cs-form textarea{width:100%;padding:10px 12px;border-radius:12px;border:1px solid var(--line);background:var(--surface);color:var(--ink);font:inherit;font-size:13.5px;resize:vertical}
.cs-fa{display:flex;gap:8px;margin-top:8px}
.cs-thanks{display:flex;align-items:center;gap:7px;font-size:13px;color:#16a34a;margin:6px 0}
.cs-state{display:flex;flex-direction:column;align-items:center;text-align:center;gap:8px;padding:28px 12px;color:var(--muted)}
.cs-state>i{font-size:28px;color:var(--faint)}
.cs-state p{margin:0;font-size:13.5px;line-height:1.6;max-width:420px}
.cs-state b{color:var(--ink)}
.cs-spin{width:26px;height:26px;border-radius:50%;border:3px solid var(--line);border-top-color:var(--co,var(--accent));animation:csSpin .8s linear infinite}
@keyframes csSpin{to{transform:rotate(360deg)}}
@media(prefers-reduced-motion:reduce){.cs-spin{animation-duration:2.4s}}`;
document.head.appendChild(st);

function economy(c){const s=LS.get('spec_'+keyOf(q(c)));if(!s||!['ready','verified'].includes(s.status)||!s.sources?.length||s.data?.schema!==2)return null;
  const vi=variantIdx(c,s),f=s.data?.variants?.[vi]?.l_per_100km;return f&&f.ok!==false&&Number(f.v)>0?Number(f.v):null}
window.CarSpec={ensure,pane,key:keyOf,economy};
})();
