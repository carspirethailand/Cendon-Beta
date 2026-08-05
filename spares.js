<script id="sparesjs">
/* ══════════════════════════════════════════════════════════════════
   SPARES — อะไหล่ที่ตรงกับรถของคุณ
   1. ผู้ใช้เลือกแอปที่จะไปหาซื้อ (เลือกได้หลายแอป) — เก็บไว้ในเครื่อง
   2. หน้าเว็บส่งรถคันที่เลือกอยู่ + รายการที่ใกล้ถึงกำหนดไปให้ AI
   3. AI คืนของที่ใส่กับรถรุ่นนั้นได้ พร้อมคำค้นที่ใช้จริง
   4. การ์ดแต่ละใบมีปุ่มเปิดหน้าค้นหาของแต่ละแอปที่เลือกไว้
   ราคาเป็นการประมาณจาก AI ไม่ใช่ราคาจริงจากร้าน — บอกไว้ชัดบนหน้า
   ══════════════════════════════════════════════════════════════════ */
(function(){
"use strict";
const D=document,$=id=>D.getElementById(id);
const EN=()=>(window.lang||"th")==="en";
const T=(th,en)=>EN()?en:th;
const esc=s=>String(s==null?"":s).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const num=n=>(n==null||isNaN(n))?"—":Math.round(n).toLocaleString("en-US");

/* ─────────── แอปที่เลือกไปหาซื้อได้ ─────────── */
const APPS=[
  {k:"shopee",   n:"Shopee",      c:"#EE4D2D", th:"ส่งเร็ว ราคาถูก",       en:"Fast, cheap",
   url:q=>`https://shopee.co.th/search?keyword=${encodeURIComponent(q)}`, local:true},
  {k:"lazada",   n:"Lazada",      c:"#0F146D", th:"ของแท้เยอะ",           en:"More genuine stock",
   url:q=>`https://www.lazada.co.th/catalog/?q=${encodeURIComponent(q)}`, local:true},
  {k:"tiktok",   n:"TikTok Shop", c:"#111111", th:"ดีลสด ราคาดี",          en:"Live deals",
   url:q=>`https://www.tiktok.com/search?q=${encodeURIComponent(q)}`, local:true},
  {k:"amazon",   n:"Amazon",      c:"#FF9900", th:"ของนอก ตัวเลือกเยอะ",   en:"Global catalogue",
   url:q=>`https://www.amazon.com/s?k=${encodeURIComponent(q)}`},
  {k:"aliexpress",n:"AliExpress", c:"#E62E04", th:"ถูกที่สุด รอนาน",       en:"Cheapest, slow",
   url:q=>`https://www.aliexpress.com/w/wholesale-${encodeURIComponent(q)}.html`},
  {k:"ebay",     n:"eBay",        c:"#0064D2", th:"ของหายาก มือสอง",       en:"Rare & used",
   url:q=>`https://www.ebay.com/sch/i.html?_nkw=${encodeURIComponent(q)}`},
  {k:"jd",       n:"JD Central",  c:"#D0021B", th:"ของแท้ ส่งในไทย",       en:"Genuine, ships in TH",
   url:q=>`https://www.jd.co.th/search?keyword=${encodeURIComponent(q)}`, local:true},
  {k:"local",    n:T("ร้านอะไหล่ไทย","Thai parts shops"), c:"#3E9E6E",
   th:"ค้น Google หาร้านใกล้ตัว", en:"Find a nearby shop",
   url:q=>`https://www.google.com/search?q=${encodeURIComponent(q+" ราคา อะไหล่")}`, local:true},
];
const appOf=k=>APPS.find(a=>a.k===k);

/* ─────────── กราฟิกหัวการ์ดตามหมวดหมู่ (ไม่มีไฟล์รูป) ─────────── */
const ART={
  "เบรก":            ["linear-gradient(150deg,#C2410C,#F97316)","ti-disc"],
  "ช่วงล่าง":         ["linear-gradient(150deg,#3730A3,#6366F1)","ti-arrows-vertical"],
  "เครื่องยนต์":       ["linear-gradient(150deg,#7C2D12,#EA580C)","ti-engine"],
  "ไฟฟ้า":           ["linear-gradient(150deg,#1E3A8A,#3B82F6)","ti-bolt"],
  "แอร์":            ["linear-gradient(150deg,#0E7490,#22D3EE)","ti-wind"],
  "ยางและล้อ":        ["linear-gradient(150deg,#1F2937,#4B5563)","ti-steering-wheel"],
  "ของตกแต่ง":        ["linear-gradient(150deg,#6D28D9,#A78BFA)","ti-sparkles"],
  "ดูแลรักษา":        ["linear-gradient(150deg,#047857,#34D399)","ti-droplet"],
  "อุปกรณ์ความปลอดภัย":["linear-gradient(150deg,#9F1239,#FB7185)","ti-shield"],
  "อะไหล่สิ้นเปลือง":  ["linear-gradient(150deg,#155E75,#38BDF8)","ti-settings"],
};
const artOf=c=>ART[c]||["linear-gradient(150deg,#334155,#64748B)","ti-package"];

/* ─────────── สถานะ ─────────── */
const LSg=(k,d)=>{try{const v=localStorage.getItem("spire_"+k);return v?JSON.parse(v):d}catch(e){return d}};
const LSs=(k,v)=>{try{localStorage.setItem("spire_"+k,JSON.stringify(v))}catch(e){}};
let picked=LSg("sparesApps",null);      /* null = ยังไม่เคยตั้งค่า */
let items=null,loading=false,lastErr="",cachedAt=0,forCar="",stale=false,offline=false;

function car(){ try{const c=window.selCar&&window.selCar(); return c||(window.garage()||[])[0]||null}
  catch(e){ return null } }
function carParts(c){
  if(!c)return {make:"",model:"",year:"",mileage:""};
  const p=String(c.name||"").trim().split(/\s+/);
  return {make:p[0]||"",model:p.slice(1).join(" ")||"",
    year:String(c.year||""),mileage:String(c.mileage||"")};
}
/* รายการที่ใกล้ถึงกำหนด — ส่งไปให้ AI จัดลำดับความสำคัญ */
function needs(c){
  try{
    const h=window.SpireCarLab&&window.SpireCarLab.health(c);
    if(!h||!h.items)return [];
    return h.items.slice().sort((a,b)=>a.d.left-b.d.left).slice(0,6)
      .filter(x=>x.d.left<20000).map(x=>x.p.th);
  }catch(e){ return [] }
}

/* ─────────── ประกอบหน้า ─────────── */
function mount(){
  const sc=D.querySelector("#v-shop .scroll"); if(!sc||$("spWrap"))return;
  sc.innerHTML=`<div id="spWrap">
    <div class="sp-head">
      <div class="tx"><div class="sp-eye">CENDON</div>
        <div class="sp-h1">Spares</div>
        <p class="section-sub" id="spSub"></p></div>
      <button class="btn" id="spCfgBtn" style="display:none"><i class="ti ti-adjustments"></i>
        <span></span></button>
    </div>
    <div id="spMain"></div>
  </div>`;
  $("spCfgBtn").onclick=()=>{picked=null;render()};
  render();
}

function render(){
  const wrap=$("spMain"); if(!wrap)return;
  const c=car(),cp=carParts(c);
  $("spSub").textContent=T("อะไหล่และของแต่งที่ใส่กับรถของคุณได้จริง — เลือกแอปที่จะไปซื้อได้เอง",
    "Parts that actually fit your car — from whichever marketplaces you choose");
  const cfgOn=!!(picked&&picked.length);
  $("spCfgBtn").style.display=cfgOn?"":"none";
  if(cfgOn)$("spCfgBtn").querySelector("span").textContent=T("เปลี่ยนแอป","Change apps");

  if(!cfgOn){ wrap.innerHTML=cfgView(c,cp); wireCfg(); return }
  wrap.innerHTML=resultView(c,cp);
  wireResults();
  if(!items&&!loading&&!lastErr)fetchItems(false);
}

/* ── หน้าตั้งค่า ── */
function cfgView(c,cp){
  const sel=new Set(picked||[]);
  return `<div class="sp-cfg">
    <h4>${T("ตั้งค่าก่อนเริ่ม","Set this up first")}</h4>
    <p>${T("เลือกได้หลายแอป — Cendon จะหาของที่ใส่กับรถของคุณได้ แล้วพาไปที่หน้าค้นหาของแอปที่คุณเลือก",
          "Pick as many as you like — Cendon finds parts that fit your car and sends you to each store's search")}</p>

    <div class="sp-lbl">${T("รถที่จะหาอะไหล่ให้","Which car")}</div>
    ${c?`<div class="sp-car">
        <span class="ic"><i class="ti ti-car"></i></span>
        <span class="tx"><b>${esc(c.name)}</b>
          <small>${[cp.year,cp.mileage?num(cp.mileage)+" "+T("กม.","km"):""].filter(Boolean).join(" · ")||"—"}</small></span>
        <span class="sp-chip on"><i class="ti ti-check"></i>${T("ใช้คันนี้","Using this")}</span>
      </div>`
     :`<div class="sp-car"><span class="ic"><i class="ti ti-plus"></i></span>
        <span class="tx"><b>${T("ยังไม่มีรถในการาจ","No car in your garage")}</b>
          <small>${T("เพิ่มรถก่อน แล้วเราจะหาอะไหล่ให้ตรงรุ่น","Add a car and we can match parts to it")}</small></span>
        <button class="btn primary" data-view="garage" style="padding:8px 14px">${T("เพิ่มรถ","Add a car")}</button>
      </div>`}

    <div class="sp-lbl">${T("ไปหาซื้อจากแอปไหน","Where to shop")}</div>
    <div class="sp-apps" id="spApps">
      ${APPS.map(a=>`<button class="sp-app" data-app="${a.k}" aria-pressed="${sel.has(a.k)}">
        <span class="ic" style="background:${a.c}">${esc(a.n[0])}</span>
        <span class="tx"><b>${esc(a.n)}</b><small>${T(a.th,a.en)}</small></span>
        <span class="tick"><i class="ti ti-check"></i></span>
      </button>`).join("")}
    </div>

    <div class="sp-acts">
      <button class="btn primary" id="spGo" ${c?"":"disabled"}>
        <i class="ti ti-sparkles"></i> ${T("หาอะไหล่ให้รถคันนี้","Find parts for this car")}</button>
      <span class="sp-chip" id="spCount"></span>
    </div>
    <p class="sp-note">${T(
      "Cendon ไม่ได้เชื่อมต่อ API ของร้านค้าโดยตรง จึงยังดึงราคาสดกับสต็อกจริงไม่ได้ — สิ่งที่ทำได้คือเลือกของที่ตรงรุ่นให้ ประมาณช่วงราคาจากราคาตลาด แล้วพาไปที่หน้าค้นหาของร้านที่คุณเลือก",
      "Cendon is not wired into the stores' APIs, so it cannot read live prices or stock. What it does is pick parts that fit your model, estimate a market price range, and hand you a ready-made search on each store you picked.")}</p>
  </div>`;
}
function wireCfg(){
  const box=$("spApps"); if(!box)return;
  const sel=new Set(picked||[]);
  const count=()=>{ const el=$("spCount");
    if(el)el.textContent=sel.size?T(`เลือกไว้ ${sel.size} แอป`,`${sel.size} selected`)
      :T("ยังไม่ได้เลือกแอป","No app selected yet");
    const go=$("spGo"); if(go)go.disabled=!sel.size||!car() };
  count();
  box.onclick=e=>{
    const b=e.target.closest("[data-app]"); if(!b)return;
    const k=b.dataset.app;
    if(sel.has(k))sel.delete(k); else sel.add(k);
    b.setAttribute("aria-pressed",sel.has(k)); count();
  };
  const go=$("spGo");
  if(go)go.onclick=()=>{
    if(!sel.size||!car())return;
    picked=[...sel]; LSs("sparesApps",picked);
    items=null; lastErr=""; render();
  };
}

/* ── หน้าผลลัพธ์ ── */
function resultView(c,cp){
  const chips=(picked||[]).map(k=>{const a=appOf(k); return a?
    `<span class="sp-chip on"><span class="dot" style="width:8px;height:8px;border-radius:2px;background:${a.c}"></span>${esc(a.n)}</span>`:""}).join("");
  const bar=`<div class="sp-bar">
    <span class="sp-chip"><i class="ti ti-car"></i>${esc(c?c.name:"—")}</span>
    ${chips}<span class="grow"></span>
    ${cachedAt?`<span class="sp-chip${stale?" warn":""}">${
      stale?`<i class="ti ti-clock-exclamation"></i>${T("ข้อมูลเก่า","Cached")} `:T("อัปเดต","Updated")+" "}${
      new Date(cachedAt).toLocaleString(EN()?"en-GB":"th-TH",{day:"numeric",month:"short",hour:"2-digit",minute:"2-digit"})}</span>`:""}
    <button class="btn" id="spRefresh" style="padding:8px 14px"><i class="ti ti-refresh"></i>
      ${T("หาใหม่","Refresh")}</button>
  </div>`;

  /* แถบบอกว่าตอนนี้เป็นรายการที่ระบบจัดเอง ไม่ได้ผ่าน AI — พูดตรง ๆ
     ดีกว่าปล่อยให้เข้าใจว่าราคาที่เห็นคือราคาที่ AI ไปสำรวจมาจริง */
  const off=offline?`<div class="sp-offline"><i class="ti ti-list-check"></i>
    <div><b>${T("รายการมาตรฐานตามระยะของรถคุณ","Standard list for your car's mileage")}</b>
    ${T("ตอนนี้ผู้ช่วย AI ไม่ว่าง ระบบจึงจัดรายการจากรอบบำรุงรักษาของรถคันนี้ให้ก่อน — ลิงก์ร้านใช้ได้ปกติ ราคาเป็นช่วงอ้างอิงตลาด กด \u201cหาใหม่\u201d เพื่อให้ AI ลองอีกครั้ง",
       "The AI assistant is busy, so this list is built from your car's own service schedule. Store links work normally; prices are market ranges. Hit Refresh to let the AI try again.")}</div></div>`:"";

  if(loading)return bar+`<div class="sp-grid">${
    Array.from({length:6},()=>`<div class="sp-skel"></div>`).join("")}</div>`;
  if(lastErr)return bar+`<div class="sp-empty"><i class="ti ti-alert-triangle"></i>
    <b style="display:block;color:var(--ink);font-size:14.5px;margin-bottom:6px">${
      T("หาอะไหล่ไม่สำเร็จ","Could not fetch parts")}</b>${esc(lastErr)}</div>`;
  if(!items||!items.length)return bar+`<div class="sp-empty"><i class="ti ti-package-off"></i>
    ${T("ยังไม่มีรายการ — กดหาใหม่เพื่อให้ Cendon ลองอีกครั้ง",
        "Nothing yet — hit Refresh to let Cendon try again")}</div>`;

  return bar+off+`<div class="sp-grid">${items.map((x,i)=>{
    const [g,ic]=artOf(x.category);
    const price=(x.priceLow||x.priceHigh)
      ? (x.priceLow&&x.priceHigh&&x.priceLow!==x.priceHigh
          ? `฿${num(x.priceLow)} – ${num(x.priceHigh)}` : `฿${num(x.priceHigh||x.priceLow)}`)
      : T("ไม่ทราบราคา","Price unknown");
    return `<article class="sp-card">
      <div class="sp-art" style="--a1:${g}">
        <span class="tag">${esc(x.category||"")}</span>
        ${x.oem?`<span class="badge">${T("ของแท้","OEM")}</span>`
               :x.diy?`<span class="badge">${T("เปลี่ยนเองได้","DIY")}</span>`:""}
        <i class="ti ${ic}"></i>
      </div>
      <div class="sp-body">
        <div class="sp-title">${esc(x.title)}</div>
        ${x.fit?`<div class="sp-fit"><i class="ti ti-circle-check"></i>${esc(x.fit)}</div>`:""}
        <div class="sp-why">${esc(x.why||"")}</div>
        <div class="sp-price">${price}<small>${offline?T("ช่วงราคาตลาด","market range"):T("ประมาณการ","estimated")}</small></div>
        <div class="sp-links">${(picked||[]).map(k=>{const a=appOf(k); if(!a)return"";
          /* ถ้าหลังบ้านส่ง "ลิงก์สินค้าจริง" มาให้ ก็เด้งไปหน้าสินค้าตรง ๆ
             ถ้าไม่มี ก็ยังเป็นลิงก์ค้นหา แต่ต้องบอกผู้ใช้ให้รู้ตัว
             ไม่ใช่ทำให้ดูเหมือนกันแล้วปล่อยให้กดไปเจอหน้าค้นหา */
          const hit=deepLink(x,k);
          if(hit)return `<a class="sp-link is-item" href="${esc(hit.url)}" target="_blank" rel="noopener noreferrer"
              title="${esc(hit.title||"")}">
            <span class="dot" style="background:${a.c}"></span>${esc(a.n)}${
              hit.price?`<b>${esc(hit.price)}</b>`:""}</a>`;
          const q=a.local?(x.query||x.title):(x.queryEn||x.query||x.title);
          return `<a class="sp-link is-search" href="${esc(a.url(q))}" target="_blank" rel="noopener noreferrer">
            <span class="dot" style="background:${a.c}"></span>${esc(a.n)}
            <i class="ti ti-search" aria-hidden="true"></i>
            <span class="vh">${T("ลิงก์ค้นหา","search link")}</span></a>`}).join("")}</div>
      </div>
    </article>`}).join("")}</div>
  <p class="sp-note" style="margin-top:16px">${T(
    "ราคาเป็นการประมาณจากราคาตลาด ไม่ใช่ราคาจริงจากร้าน ณ ตอนนี้ — กดปุ่มร้านเพื่อดูราคาและสต็อกจริง และตรวจว่าตรงรุ่นก่อนสั่งซื้อทุกครั้ง",
    "Prices are market estimates, not live listings. Tap a store to see the real price and stock, and always confirm fitment before buying.")}</p>`;
}
function wireResults(){
  const r=$("spRefresh");
  if(r)r.onclick=()=>fetchItems(true);
}

/* ── เรียกข้อมูลจากหลังบ้าน ── */
async function fetchItems(refresh){
  const c=car(); if(!c||!picked||!picked.length)return;
  loading=true; lastErr=""; offline=false; render();
  try{
    const cp=carParts(c);
    const body={car:cp,apps:picked,needs:needs(c),lang:window.lang||"th",refresh:!!refresh};
    const d=await api("/api/spares",body);
    items=d.items||[]; cachedAt=d.cachedAt||Date.now(); stale=!!d.stale; forCar=c.id; offline=false;
  }catch(e){
    /* AI ล่มหรือโควตาหมด ก็ยังต้องมีอะไหล่ให้กดซื้อ — สลับไปใช้แคตตาล็อก
       ที่คำนวณเองจากรอบบำรุงรักษาของรถคันนี้ ไม่ต้องรอ AI กลับมา */
    const why=String(e&&e.message||e);
    if(/เข้าสู่ระบบ|sign in/i.test(why)){ lastErr=why.slice(0,200); items=null }
    else { items=offlineItems(c); offline=true; lastErr=""; cachedAt=Date.now(); stale=false; forCar=c.id }
  }
  loading=false; render();
}
async function api(path,body){
  const auth=window.spireAuth;
  /* Firebase คืนสถานะล็อกอินแบบ async — หน้าที่ยิง API ทันทีที่เปิดจะเห็น
     currentUser เป็น null ทั้งที่ผู้ใช้ล็อกอินอยู่ ต้องรอรอบแรกให้จบก่อน
     ไม่งั้นขึ้น "กรุณาเข้าสู่ระบบก่อน" ทั้งที่รูปโปรไฟล์แสดงอยู่บนแถบเมนู */
  let u=auth&&auth.currentUser;
  if(!u&&window.spireAwaitUser)u=await window.spireAwaitUser();
  if(!u)throw new Error(T("กรุณาเข้าสู่ระบบก่อน","Please sign in first"));
  const tok=await u.getIdToken();
  const r=await fetch(window.BACKEND_URL+path,{method:"POST",
    headers:{"Content-Type":"application/json","Authorization":"Bearer "+tok},
    body:JSON.stringify(body)});
  let d=null; try{ d=await r.json() }catch(e){}
  if(!r.ok){
    const err=(d&&d.error)||"";
    if(r.status===429||err==="quota")throw new Error(T("ใช้โควตา AI ของวันนี้ครบแล้ว ลองใหม่พรุ่งนี้","Daily AI quota reached"));
    if(r.status===401)throw new Error(T("กรุณาเข้าสู่ระบบใหม่","Please sign in again"));
    if(r.status===404)throw new Error(T("เซิร์ฟเวอร์ยังไม่มีระบบนี้ — ต้อง deploy Worker เวอร์ชันใหม่ก่อน","Server is on an older build — deploy the Worker first"));
    /* โควตาของคีย์ AI หมด ไม่ใช่โควตารายวันของผู้ใช้ */
    if(err.indexOf("AI quota exhausted")>=0)throw new Error(T(
      "โควตา AI ของระบบหมดชั่วคราว — ยังหาอะไหล่ใหม่ไม่ได้ตอนนี้ ลองอีกครั้งในภายหลัง",
      "The system's AI quota is used up — parts search is unavailable right now, please try later"));
    if(err.indexOf("spares_ai")===0)throw new Error(T(
      "AI ตอบกลับมาไม่ครบ ลองกดหาใหม่อีกครั้ง — ถ้ายังไม่ได้แปลว่าโมเดลกำลังแน่น",
      "The model came back incomplete — try Refresh; if it keeps failing the model is busy")+
      "\n"+err.replace("spares_ai: ",""));
    if(err.indexOf("AI upstream error")===0)throw new Error(T(
      "เซิร์ฟเวอร์ AI ปฏิเสธคำขอ","The AI server rejected the request")+" — "+err.slice(0,140));
    throw new Error(err||("Error "+r.status));
  }
  return d;
}

/* ── รถเปลี่ยน → ล้างผลเดิม ── */
function watchCar(){
  const c=car();
  if(c&&forCar&&c.id!==forCar){ items=null; lastErr=""; cachedAt=0; stale=false;
    if(D.getElementById("v-shop")&&D.getElementById("v-shop").classList.contains("active"))render() }
}

/* ── วิดเจ็ต Spares บนหน้าแรก ── */
/* ══════════════════════════════════════════════════════════════════
   ฉากวิดเจ็ต Spares — โถงห้างหรู + เทอร์โบหมุน
   แยกสองชั้น: โถงยืดเต็มความกว้าง เทอร์โบขนาดคงที่ จึงไม่บวมตามการ์ด
   ══════════════════════════════════════════════════════════════════ */
function spwScene(){
  /* ซุ้มโค้งซ้อนกันเป็นระยะลึก + เส้นพื้นสะท้อนแสง ให้เหมือนโถงห้าง */
  let hall="";
  for(let i=0;i<5;i++){
    const w=60+i*46, x=270-w/2, h=42+i*15, o=(0.30-i*0.05).toFixed(2);
    hall+=`<path d="M${x} 120V${120-h} a${w/2} ${w/2} 0 0 1 ${w} 0V120"
      fill="none" stroke="#fff" stroke-width="1.5" opacity="${o}"/>`;
  }
  hall+=`<g opacity=".18">${Array.from({length:11},(_,i)=>
    `<line x1="270" y1="120" x2="${-60+i*66}" y2="74" stroke="#fff" stroke-width="1"/>`).join("")}</g>`;
  const hallL=`<svg class="spw-hall" viewBox="0 0 540 120" preserveAspectRatio="xMidYMax slice"
    aria-hidden="true">${hall}</svg>`;

  /* เทอร์โบ ใบพัดหมุนจริง */
  const blades=Array.from({length:11},(_,i)=>
    `<path d="M0 -4 C10 -13 26 -15 33 -6 C24 -4 12 0 0 4Z" fill="#fff" transform="rotate(${i*32.7})"/>`).join("");
  const turboL=`<svg class="spw-turbo" viewBox="-60 -60 120 120" aria-hidden="true">
    <circle r="46" fill="none" stroke="#fff" stroke-width="2.2" opacity=".45"/>
    <circle r="55" fill="none" stroke="#fff" stroke-width="1.1" opacity=".2"/>
    <path d="M-55 0 a55 55 0 0 1 38 -52 l9 17 a37 37 0 0 0 -25 35Z" fill="#fff" opacity=".16"/>
    <g class="spw-fan" opacity=".6">${blades}</g>
    <circle r="8" fill="#fff" opacity=".9"/><circle r="3.4" fill="#22375E"/></svg>`;

  return `<span class="spw-scene">${hallL}${turboL}</span>`;
}

function widget(force){
  const host=D.getElementById("w-shop"); if(!host||(host.dataset.spares&&!force))return;
  host.dataset.spares="1"; host.classList.add("wspares");
  const c=car();

  /* หัวข้อของที่จะไปหาให้ — ดึงจากรายการที่ใกล้ถึงกำหนดจริง ไม่ใช่ข้อความลอยๆ */
  const nd=c?needs(c):[];
  const shown=(picked&&picked.length)?picked:["shopee","lazada","amazon"];
  const dots=shown.slice(0,5).map(k=>{const a=appOf(k); return a?
    `<span class="spw-dot" style="background:${a.c}" title="${esc(a.n)}">${esc(a.n[0])}</span>`:""}).join("");
  /* เติมให้ครบสามแถวเสมอ ไม่งั้นรถที่ยังไม่มีประวัติจะเห็นการ์ดโล่ง
     แถวที่มาจากกำหนดจริงติดป้ายไว้ ส่วนที่เติมเป็นหมวดยอดนิยม */
  const FILL=[T("ผ้าเบรกและจานเบรก","Brake pads & discs"),
              T("ไส้กรองและน้ำมันเครื่อง","Filters & engine oil"),
              T("ยางและใบปัดน้ำฝน","Tyres & wiper blades")];
  const list=nd.slice(0,3).map(x=>({t:x,due:true}));
  FILL.forEach(x=>{ if(list.length<3&&!list.some(r=>r.t===x))list.push({t:x,due:false}) });
  const rows=list.slice(0,3).map((r,i)=>
    `<div class="spw-row"><i class="ti ${["ti-disc","ti-droplet","ti-settings"][i]||"ti-package"}"></i>
      <span>${esc(r.t)}</span>${r.due?`<em>${T("ใกล้ถึงกำหนด","due soon")}</em>`:""}</div>`).join("");

  host.innerHTML=`<button class="spw" id="spwCard">
      ${spwScene()}
      <div class="spw-eye"><i class="ti ti-package"></i>SPARES</div>
      <div class="spw-t">${T("อะไหล่ที่ใส่กับรถคุณได้จริง","Parts that fit your car")}</div>
      <div class="spw-s">${c?T(`คัดจากรุ่น ${c.name} แล้วพาไปที่ร้านที่คุณเลือกเอง`,
          `Matched to your ${c.name}, then straight to the store you picked`)
        :T("เพิ่มรถในการาจ แล้ว Cendon จะคัดของให้ตรงรุ่น","Add a car and Cendon matches parts to it")}</div>
      <div class="spw-list">${rows}</div>
      <div class="spw-foot"><span class="spw-dots">${dots}</span>
        <span class="spw-go">${T("เปิด Spares","Open Spares")} <i class="ti ti-arrow-right"></i></span></div>
    </button>
    <div class="spw-ctl">
      <span class="widget-drag-handle"><i class="ti ti-hand-grab"></i></span>
      <button class="widget-nav-btn" onclick="moveWidget('w-shop',-1);event.stopPropagation();"><i class="ti ti-arrow-narrow-up"></i></button>
      <button class="widget-nav-btn" onclick="moveWidget('w-shop',1);event.stopPropagation();"><i class="ti ti-arrow-narrow-down"></i></button>
    </div>`;
  const btn=D.getElementById("spwCard");
  if(btn)btn.onclick=()=>{try{window.switchView("shop")}catch(e){}};
}

/* ── ผูกกับ switchView ── */
const origSwitch=window.switchView;
if(typeof origSwitch==="function"){
  window.switchView=function(v){
    const r=origSwitch.apply(this,arguments);
    if(v==="shop"){ mount(); watchCar(); render() }
    return r;
  };
}
/* ปิด loadShop เดิมที่ยิงไปยัง /api/shop (ตารางว่างจึงไม่เคยมีสินค้าขึ้น) */
window.loadShop=function(){ mount(); render() };
window.sparesWidgetRefresh=()=>{try{widget(true)}catch(e){}};

function boot(){ widget(); if(D.getElementById("v-shop")&&D.getElementById("v-shop").classList.contains("active"))mount() }
if(D.readyState==="loading")D.addEventListener("DOMContentLoaded",boot); else boot();
setTimeout(boot,600);
/* วิดเจ็ตต้องตามรถและแอปที่เลือกไว้ — วาดใหม่เมื่อค่าใดค่าหนึ่งเปลี่ยน */
let wsig="";
setInterval(()=>{
  widget(); watchCar();
  const c=car(), sig=(c?c.id+"|"+c.mileage:"-")+"|"+(picked||[]).join(",");
  if(sig!==wsig){ wsig=sig; widget(true) }
},2500);

  /* ── แคตตาล็อกสำรอง ต้องอยู่ในขอบเขตเดียวกับ carParts/needs/T ── */
  /* ══════════════════════════════════════════════════════════════════
     โหมดไม่ง้อ AI — แคตตาล็อกอะไหล่ที่คำนวณจากตัวรถเอง
     ══════════════════════════════════════════════════════════════════
     ทำไมต้องมี: /api/spares เรียก Gemini ทุกครั้ง ถ้าโควตาโมเดลหมด
     หลังบ้านจะคืนแคชเก่าให้ — แต่รถที่ยังไม่เคยค้นสำเร็จเลยจะไม่มีแคช
     ผู้ใช้เลยเจอหน้าจอ error ทุกครั้ง รอเป็นวัน ๆ ก็ยังไม่ได้อะไร
     ชั้นนี้ไม่เรียก AI เลย ประกอบรายการจาก "รอบบำรุงรักษาที่ใกล้ถึง"
     ซึ่งเรารู้อยู่แล้วจากเลขไมล์ แล้วสร้างลิงก์ค้นหาของแต่ละร้านตรง ๆ
     ราคาเป็นช่วงอ้างอิงตลาดไทย ติดป้ายชัดเจนว่าไม่ใช่ราคาที่ AI ประเมิน
     ผลคือหน้า Spares ใช้งานได้เสมอ AI กลายเป็นของแถมไม่ใช่เงื่อนไข        */
  /* ช่วงราคาอะไหล่รถยนต์นั่ง/กระบะทั่วไปในไทย (บาท) — อัปเดตด้วยมือได้ */
  const SP_CAT = [
    {key:"engineoil", th:"น้ำมันเครื่อง", en:"Engine oil", cat:"ของเหลว",
     q:"น้ำมันเครื่อง", qe:"engine oil", lo:800, hi:2500, diy:true,
     why:["เปลี่ยนตามรอบเพื่อรักษาอายุเครื่องยนต์","Regular changes protect the engine"]},
    {key:"oilfilter", th:"กรองน้ำมันเครื่อง", en:"Oil filter", cat:"กรอง",
     q:"กรองน้ำมันเครื่อง", qe:"oil filter", lo:150, hi:600, diy:true, oem:true,
     why:["เปลี่ยนพร้อมน้ำมันเครื่องทุกครั้ง","Replace with every oil change"]},
    {key:"airfilter", th:"กรองอากาศ", en:"Air filter", cat:"กรอง",
     q:"กรองอากาศ", qe:"air filter", lo:250, hi:900, diy:true,
     why:["กรองตันทำให้กินน้ำมันและเร่งไม่ขึ้น","A clogged filter costs fuel and power"]},
    {key:"cabinfilter", th:"กรองแอร์ในห้องโดยสาร", en:"Cabin filter", cat:"กรอง",
     q:"กรองแอร์", qe:"cabin air filter", lo:200, hi:800, diy:true,
     why:["แอร์ไม่เย็นและมีกลิ่นมักมาจากกรองตัวนี้","Weak, smelly A/C usually starts here"]},
    {key:"brakepad", th:"ผ้าเบรกหน้า", en:"Front brake pads", cat:"เบรก",
     q:"ผ้าเบรกหน้า", qe:"front brake pads", lo:900, hi:3500, oem:true,
     why:["ชิ้นส่วนความปลอดภัย อย่ารอจนมีเสียงดัง","Safety part — don't wait for the squeal"]},
    {key:"brakedisc", th:"จานเบรกหน้า", en:"Front brake discs", cat:"เบรก",
     q:"จานเบรกหน้า", qe:"front brake disc rotor", lo:2200, hi:7000, oem:true,
     why:["เปลี่ยนคู่กับผ้าเบรกถ้าจานเป็นร่องลึก","Change with the pads if scored"]},
    {key:"battery", th:"แบตเตอรี่", en:"Battery", cat:"ไฟฟ้า",
     q:"แบตเตอรี่รถยนต์", qe:"car battery", lo:2200, hi:6500,
     why:["อายุใช้งานทั่วไป 2–3 ปี สตาร์ตอืดคือสัญญาณ","2–3 years typical; slow cranking is the sign"]},
    {key:"sparkplug", th:"หัวเทียน", en:"Spark plugs", cat:"เครื่องยนต์",
     q:"หัวเทียน", qe:"spark plugs", lo:400, hi:2400, diy:true,
     why:["เดินเบาสั่นหรือกินน้ำมันขึ้น ลองดูตัวนี้ก่อน","Rough idle or thirst — check these first"]},
    {key:"wiper", th:"ใบปัดน้ำฝน", en:"Wiper blades", cat:"ภายนอก",
     q:"ใบปัดน้ำฝน", qe:"wiper blades", lo:250, hi:1200, diy:true,
     why:["ยางแข็งจะครูดกระจกเป็นรอยถาวร","Hardened rubber scratches the glass"]},
    {key:"coolant", th:"น้ำยาหล่อเย็น", en:"Coolant", cat:"ของเหลว",
     q:"น้ำยาหล่อเย็น", qe:"engine coolant", lo:250, hi:1200, diy:true,
     why:["ป้องกันสนิมในระบบระบายความร้อน","Stops corrosion in the cooling system"]},
    {key:"brakefluid", th:"น้ำมันเบรก DOT4", en:"Brake fluid DOT4", cat:"ของเหลว",
     q:"น้ำมันเบรก DOT4", qe:"DOT4 brake fluid", lo:180, hi:700, diy:true,
     why:["ดูดความชื้นตามเวลา ทำให้เบรกหยุ่น","Absorbs moisture and softens the pedal"]},
    {key:"tyre", th:"ยางรถยนต์", en:"Tyres", cat:"ยาง",
     q:"ยางรถยนต์", qe:"tyres", lo:1800, hi:9000,
     why:["ดอกยางตื้นหรือยางเกิน 5 ปีควรเปลี่ยน","Shallow tread or over 5 years old"]},
  ];
  /* จับคู่ชื่อรอบบำรุงรักษาของ CarLab เข้ากับรายการในแคตตาล็อก */
  const SP_MATCH = [
    [/น้ำมันเครื่อง|engine oil/i, "engineoil"], [/กรองน้ำมัน|oil filter/i, "oilfilter"],
    [/กรองอากาศ|air filter/i, "airfilter"],     [/กรองแอร์|cabin/i, "cabinfilter"],
    [/ผ้าเบรก|brake pad/i, "brakepad"],          [/จานเบรก|disc|rotor/i, "brakedisc"],
    [/แบตเตอ|battery/i, "battery"],              [/หัวเทียน|spark/i, "sparkplug"],
    [/ปัดน้ำฝน|wiper/i, "wiper"],                [/หล่อเย็น|coolant/i, "coolant"],
    [/น้ำมันเบรก|brake fluid/i, "brakefluid"],   [/ยาง|tyre|tire/i, "tyre"],
  ];
  /* ── ลิงก์สินค้าจริงจากหลังบ้าน ────────────────────────────────────
   Worker จะแนบ x.links = [{app:"ebay", url, title, price, image}, ...]
   ให้แต่ละชิ้น โดยดึงจาก API ของร้านนั้นจริง ๆ (eBay Browse API,
   Shopee/Lazada Open Platform, Amazon PA-API)

   ที่นี่แค่หยิบมาใช้ ไม่มีการเดา URL เอง — ลิงก์ที่โมเดลแต่งขึ้นเอง
   กดแล้ว 404 ซึ่งแย่กว่าการพาไปหน้าค้นหาเสียอีก                      */
function deepLink(x, appKey){
  const L = x && x.links;
  if(!Array.isArray(L)) return null;
  const hit = L.find(l => l && l.app === appKey && typeof l.url === "string"
                          && /^https:\/\//.test(l.url));
  return hit || null;
}

function offlineItems(c){
    const p = carParts(c);
    const tag = [p.make, p.model].filter(Boolean).join(" ").trim();
    const yr  = p.year ? " " + p.year : "";
    const due = needs(c);                      // รายการที่ใกล้ถึงกำหนดจริง ๆ
    const hot = new Set();
    due.forEach(n => { const m = SP_MATCH.find(([re]) => re.test(n)); if (m) hot.add(m[1]) });
    // เรียงของที่ถึงกำหนดขึ้นก่อน ที่เหลือตามลำดับแคตตาล็อก
    const order = SP_CAT.slice().sort((a, b) => (hot.has(b.key) ? 1 : 0) - (hot.has(a.key) ? 1 : 0));
    return order.map(x => ({
      title: T(x.th, x.en) + (tag ? " — " + tag : ""),
      category: x.cat,
      why: T(x.why[0], x.why[1]) + (hot.has(x.key)
        ? T(" · ใกล้ถึงกำหนดของรถคันนี้", " · due soon on this car") : ""),
      fit: tag ? T("ค้นด้วยรุ่น ", "Searched for ") + tag + yr : "",
      oem: !!x.oem, diy: !!x.diy,
      priceLow: x.lo, priceHigh: x.hi,
      query:   (tag + yr + " " + x.q).trim(),
      queryEn: (tag + yr + " " + x.qe).trim(),
    }));
  }
})();
</script>
