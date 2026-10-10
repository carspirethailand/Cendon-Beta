/* ══════════════════════════════════════════════════════════════════
   สเปกรถจริง (หน้าเว็บ) — อ่านจากคลังสเปกกลางของ Cendon (/api/car-spec)

   คนแรกที่เลือกรุ่นนั้น หลังบ้านให้ Gemini ค้นเว็บสองรอบแยกกันแล้วเทียบทีละช่อง เก็บไว้ในคลัง
   คนต่อไปได้ข้อมูลชุดเดียวกันทันที — ไม่มีตัวเลขเดาจากประเภทตัวถังอีกแล้ว

   ทุกค่าบอกที่มา: ✓ ยืนยันจาก 2 แหล่ง · • แหล่งเดียว · ⚠ แหล่งข้อมูลไม่ตรงกัน (โชว์ทั้งสองค่า)
   ค่าที่หาไม่เจอ = ไม่แสดง (ไม่เดา) · ผู้ใช้กด "แจ้งข้อมูลผิด" ได้ ทีมงานตรวจแล้วขึ้นป้าย "ทีมงานตรวจแล้ว"

   ใช้ในหน้ารายละเอียดรถ (แท็บสเปก/อุปกรณ์) ทุกหน้าที่เปิดรถได้
   ══════════════════════════════════════════════════════════════════ */
(function(){
"use strict";
const API=()=>(window.BACKEND_URL||"https://spireonebackend.carspirethailand.workers.dev");
const T=(th,en)=>(window.spireT?window.spireT(th,en):((window.lang||"th")==="en"?en:th));
const esc=s=>String(s==null?"":s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const num=n=>Number(n).toLocaleString("en-US",{maximumFractionDigits:1});
const keyOf=c=>[c.make,c.model,c.year].map(s=>String(s==null?"":s).normalize("NFC").trim().replace(/\s+/g," ").toLowerCase()).join("|");
const LS={get(k){try{return JSON.parse(localStorage.getItem("spire_"+k))}catch(e){return null}},set(k,v){try{localStorage.setItem("spire_"+k,JSON.stringify(v))}catch(e){}}};
const DONE=["ready","verified","notfound"];

/* ชื่อยี่ห้อ/รุ่นของรถคันนี้ — รถเก่าบางคันมีแต่ชื่อรวม */
function q(c){
  let make=String(c.make||"").trim(),model=String(c.model||"").trim();
  if(!make&&c.name){make=String(c.name).split(" ")[0];model=String(c.name).slice(make.length).trim()}
  return {make,model:model||make,year:String(c.year||"").trim()};
}
async function tok(){
  try{const a=window.spireAuth||window.auth;if(a&&a.currentUser)return await a.currentUser.getIdToken()}catch(e){}
  return "";
}
async function call(method,path,body){
  const t=await tok();
  const r=await fetch(API()+path,{method,headers:{"Content-Type":"application/json",...(t?{Authorization:"Bearer "+t}:{})},body:body?JSON.stringify(body):undefined});
  const j=await r.json().catch(()=>({}));
  if(!r.ok)throw Object.assign(new Error(j.error||("HTTP "+r.status)),{status:r.status});
  return j;
}

/* ขอข้อมูลรุ่นนี้ — ในเครื่องมีแล้วใช้เลย · ยังไม่มีให้หลังบ้านหา (ครั้งแรกของรุ่นนี้ทั้งระบบเท่านั้นที่เรียก AI) */
const inflight={};
async function ensure(c,opt){
  const Q=q(c),k=keyOf(Q),retry=!!(opt&&opt.retry);
  if(!/^\d{4}$/.test(Q.year)||!Q.make)return {status:"invalid"};
  const have=LS.get("spec_"+k);
  if(!retry&&have&&DONE.includes(have.status)&&Date.now()-(have._at||0)<7*86400000)return have;
  if(inflight[k])return inflight[k];
  inflight[k]=(async()=>{
    /* ครั้งแรกของรุ่นนี้ หลังบ้านค้นเว็บสองรอบแล้วเทียบกัน — รอได้ถึงราว 1 นาทีครึ่ง
       "ลองใหม่" = ขอให้ค้นใหม่จริง ไม่ใช่ดึงผลที่ไม่สำเร็จเดิม */
    let r=await call("POST","/api/car-spec",retry?{...Q,retry:true}:Q);
    /* อีกคนกำลังหาอยู่ — รอผลของเขา */
    for(let i=0;i<40&&r.status==="pending";i++){await new Promise(z=>setTimeout(z,3000));r=await call("GET","/api/car-spec?"+new URLSearchParams(Q));}
    if(DONE.includes(r.status))LS.set("spec_"+k,{...r,_at:Date.now()});
    return r;
  })().finally(()=>{delete inflight[k]});
  return inflight[k];
}

/* ─────────── แสดงผล ─────────── */
const mark=f=>!f?"":f.ok===true?`<i class="ti ti-circle-check cs-ok" title="${T("ยืนยันจาก 2 แหล่ง","Confirmed by 2 sources")}"></i>`
  :f.ok===false?`<i class="ti ti-alert-triangle cs-bad" title="${T("แหล่งข้อมูลไม่ตรงกัน","Sources disagree")}"></i>`
  :`<i class="ti ti-point cs-one" title="${T("พบในแหล่งเดียว","Single source")}"></i>`;
function val(f,unit,fmt){
  if(!f||f.v==null||f.v==="")return null;
  const show=v=>(fmt?fmt(v):typeof v==="number"?num(v):esc(v))+(unit?" "+unit:"");
  return show(f.v)+(f.ok===false&&f.alt!=null?` <span class="cs-alt">${T("หรือ","or")} ${show(f.alt)}</span>`:"")+mark(f);
}
const row=(k,html)=>html?`<div class="cl-spec"><span class="k">${esc(k)}</span><span class="v">${html}</span></div>`:"";
const FUEL={petrol:["เบนซิน","Petrol"],diesel:["ดีเซล","Diesel"],hybrid:["ไฮบริด","Hybrid"],phev:["ปลั๊กอินไฮบริด","Plug-in hybrid"],ev:["ไฟฟ้า","Electric"],lpg:["แก๊ส","LPG"]};
const DRIVE={FWD:["ขับหน้า","FWD"],RWD:["ขับหลัง","RWD"],"4WD":["ขับสี่ (4WD)","4WD"],AWD:["ขับสี่ตลอดเวลา (AWD)","AWD"]};
const BODY={sedan:["ซีดาน","Sedan"],hatchback:["แฮทช์แบ็ก","Hatchback"],suv:["เอสยูวี","SUV"],pickup:["กระบะ","Pickup"],mpv:["เอ็มพีวี","MPV"],
  van:["รถตู้","Van"],coupe:["รถสปอร์ต / คูเป้","Sports car / Coupe"],ev:["รถไฟฟ้า","Electric"]};
const lab=(m,k)=>m[k]?T(m[k][0],m[k][1]):k;

/* รุ่นย่อยของคันนี้: ที่ผู้ใช้เลือกไว้ → เดาจากข้อมูลที่กรอก (เครื่อง/รุ่นย่อย) → ตัวแรก */
function variantIdx(c,s){
  const vs=(s.data&&s.data.variants)||[];if(!vs.length)return -1;
  const saved=LS.get("specv_"+c.id);if(saved!=null&&vs[saved])return saved;
  const hint=[c.info&&c.info.trim,c.info&&c.info.engine].filter(Boolean).join(" ").toLowerCase();
  if(hint){const i=vs.findIndex(v=>[v.name,v.engine&&v.engine.v].filter(Boolean).some(x=>{const a=String(x).toLowerCase();return a.includes(hint)||hint.includes(a)}));if(i>=0)return i}
  return 0;
}
function head(s){
  const sc=(s.data&&s.data.score)||{},n=(s.sources||[]).length;
  return `<div class="cs-head">
    ${s.verified?`<span class="cs-badge ok"><i class="ti ti-rosette-discount-check"></i>${T("ทีมงานตรวจแล้ว","Verified by our team")}</span>`
      :`<span class="cs-badge"><i class="ti ti-world-search"></i>${T(`ค้นจาก ${n} แหล่ง · ยืนยันซ้ำ ${sc.confirmed||0}/${sc.cells||0} ช่อง`,`${n} sources · ${sc.confirmed||0}/${sc.cells||0} fields cross-checked`)}</span>`}
    ${s.data&&s.data.generation?`<span class="cs-gen">${esc(s.data.generation)}${s.data.market?" · "+esc(s.data.market):""}</span>`:""}
  </div>`;
}
function specHTML(c,s){
  const d=s.data||{},f=d.facts||{},vs=d.variants||[],vi=variantIdx(c,s),v=vs[vi]||{};
  const ev=v.fuel==="ev"||d.body==="ev";
  const l100=v.l_per_100km&&v.l_per_100km.v;
  return head(s)+
  (vs.length>1?`<div class="cs-vars" role="radiogroup" aria-label="${T("รุ่นย่อย","Variant")}">${vs.map((x,i)=>
    `<button type="button" class="cs-var${i===vi?" on":""}" data-cs-var="${i}" role="radio" aria-checked="${i===vi}">${esc(x.name||(x.engine&&x.engine.v)||T("รุ่นย่อย ","Variant ")+(i+1))}</button>`).join("")}</div>
    <p class="cs-hint">${T("เลือกรุ่นย่อยให้ตรงกับรถของคุณ — สเปกต่างกันตามเครื่องยนต์และระบบขับเคลื่อน","Pick your variant — specs differ by engine and drivetrain")}</p>`:"")+
  `<div class="cl-grp"><h4>${T("เครื่องยนต์และการขับเคลื่อน","Powertrain")}</h4>
    ${row(T("เครื่องยนต์","Engine"),val(v.engine))}
    ${row(T("เชื้อเพลิง","Fuel"),v.fuel?esc(lab(FUEL,v.fuel)):null)}
    ${ev?"":row(T("ความจุกระบอกสูบ","Displacement"),val(v.cc,"cc"))}
    ${row(T("กำลังสูงสุด","Power"),val(v.hp,T("แรงม้า","hp")))}
    ${row(T("แรงบิดสูงสุด","Torque"),val(v.torque_nm,"Nm"))}
    ${row(T("ระบบเกียร์","Gearbox"),val(v.gearbox))}
    ${row(T("ระบบขับเคลื่อน","Drive"),v.drive&&v.drive.v?val({...v.drive,v:lab(DRIVE,v.drive.v),alt:v.drive.alt&&lab(DRIVE,v.drive.alt)}):null)}
    ${ev?row(T("แบตเตอรี่","Battery"),val(v.battery_kwh,"kWh"))+row(T("ระยะทางต่อการชาร์จ","Range"),val(v.range_km,T("กม.","km"))):""}
    ${ev?"":row(T("อัตราสิ้นเปลือง","Fuel economy"),val(v.l_per_100km,T("ลิตร/100 กม.","L/100km")))}
    ${!ev&&l100?row(T("เทียบเป็น","Equivalent"),num(100/l100)+" "+T("กม./ลิตร","km/L")):""}
  </div>
  <div class="cl-grp"><h4>${T("ตัวถังและขนาด","Body & dimensions")}</h4>
    ${row(T("ประเภทตัวถัง","Body type"),d.body?esc(lab(BODY,d.body))+(d.body_ok?mark({ok:true}):mark({ok:null})):null)}
    ${row(T("จำนวนที่นั่ง","Seats"),val(f.seats,T("ที่นั่ง","seats")))}
    ${row(T("จำนวนประตู","Doors"),val(f.doors,T("ประตู","doors")))}
    ${row(T("ยาว","Length"),val(f.length_mm,"มม."))}
    ${row(T("กว้าง","Width"),val(f.width_mm,"มม."))}
    ${row(T("สูง","Height"),val(f.height_mm,"มม."))}
    ${row(T("ฐานล้อ","Wheelbase"),val(f.wheelbase_mm,"มม."))}
    ${row(T("น้ำหนักตัวรถ","Kerb weight"),val(f.kerb_kg,"กก."))}
    ${ev?"":row(T("ความจุถังน้ำมัน","Fuel tank"),val(f.tank_l,T("ลิตร","L")))}
    ${row(T("ขนาดยางเดิม","Tyre size"),val(f.tire))}
  </div>
  ${d.notes?`<div class="cl-grp"><h4>${T("ข้อควรรู้ของรุ่นนี้","Good to know")}</h4><p class="cs-note">${esc(d.notes)}</p></div>`:""}`+foot(s);
}
function foot(s){
  const src=s.sources||[];
  return `${src.length?`<div class="cl-grp"><h4>${T("แหล่งข้อมูล","Sources")}</h4><div class="cs-src">${src.map(x=>
      `<a href="${esc(x.url)}" target="_blank" rel="noopener nofollow">${esc(x.title||T("แหล่งข้อมูล","Source"))}<i class="ti ti-external-link"></i></a>`).join("")}</div></div>`:""}
  <div class="cs-legend"><span>${mark({ok:true})}${T("ยืนยันจาก 2 แหล่ง","2 sources agree")}</span><span>${mark({ok:null})}${T("แหล่งเดียว","1 source")}</span><span>${mark({ok:false})}${T("แหล่งไม่ตรงกัน","Sources disagree")}</span></div>
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
  try{s=await ensure(c,opt)}catch(e){s={status:e.status===404||e.status===405?"unavailable":e.status?"error":"offline",error:e.message}}
  const el2=document.getElementById(id);if(!el2)return;
  const retry=`<button type="button" class="btn" data-cs-retry>${T("ลองใหม่","Try again")}</button>`;
  el2.innerHTML=
    s.status==="invalid"?state("ti-calendar-question",T("ระบุปีรถก่อน แล้วระบบจะหาสเปกของรุ่นนั้นให้","Add the model year to look up specs"))+extra
   :s.status==="notfound"?state("ti-search-off",T("ไม่พบข้อมูลของรุ่นนี้ในปีนี้ — ตรวจชื่อรุ่นและปีอีกครั้ง","No data for this model in this year — check the model and year"))+extra
   :s.status==="limited"?state("ti-clock-pause",T("วันนี้ค้นรุ่นใหม่ครบโควตาแล้ว ลองใหม่พรุ่งนี้ หรือเข้าสู่ระบบเพื่อค้นต่อ","Daily lookup limit reached — try tomorrow or sign in"))+extra
   :s.status==="pending"?state("ti-hourglass",T("ยังค้นข้อมูลรุ่นนี้อยู่ — กลับมาเปิดแท็บนี้อีกครั้งในอีกสักครู่","Still looking this model up — check back in a moment"),retry)+extra
   :s.status==="offline"?state("ti-wifi-off",T("เชื่อมต่ออินเทอร์เน็ตไม่ได้ ลองใหม่อีกครั้ง","No connection — please try again"),retry)+extra
   :s.status==="unavailable"?state("ti-tools",T("ระบบข้อมูลสเปกกำลังอัปเดต ลองใหม่อีกครั้งภายหลัง","Specs are being updated — please try again later"),retry)+extra
   :s.status==="failed"||s.status==="error"?state("ti-cloud-off",T("ค้นข้อมูลรุ่นนี้ไม่สำเร็จ ลองใหม่อีกสักครู่","Couldn’t look up this model — try again shortly"),retry)+extra
   :(kind==="equip"?equipHTML(c,s):specHTML(c,s)+extra);
  el2.dataset.car=c.id;
  /* ประเภทตัวถังที่สองแหล่งยืนยันตรงกัน → แจ้งหน้าเว็บให้ใช้ (ภาพรถในการาจ) */
  if(s.data&&s.data.body&&s.data.body_ok&&s.data.body!==c.type){
    try{document.dispatchEvent(new CustomEvent("carspec:body",{detail:{id:c.id,body:s.data.body}}))}catch(e){}
  }
}

document.addEventListener("click",async e=>{
  const w=e.target.closest(".cs-wrap");if(!w)return;
  const car=()=>{try{return (window.garage?window.garage():[]).find(x=>x.id===w.dataset.car)}catch(err){return null}};
  const vb=e.target.closest("[data-cs-var]");
  const P=PANES[w.id]||{kind:"spec",extra:""};
  if(vb){LS.set("specv_"+w.dataset.car,Number(vb.dataset.csVar));const c=car();if(c)fill(w.id,c,P.kind,P.extra);return}
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

window.CarSpec={ensure,pane,key:keyOf};
})();
