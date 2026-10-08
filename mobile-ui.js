/* ══════════════════════════════════════════════════════════════════
   Cendon — ตัวประกอบหน้าจอมือถือ (เขียนใหม่ทั้งหมด)

   ไฟล์นี้ทำสามอย่าง แล้วหยุด:
     1. สร้างแถบล่าง 5 แท็บ (ไอคอน + ชื่อ) แทนแถบบนของเดสก์ท็อป
     2. จัดหน้าหลักเป็นสามจอที่เลื่อนแล้วล็อก
        จอ 1 ห้องนักบิน · จอ 2 สิ่งที่แชตบอตทำไม่ได้ · จอ 3 เครื่องมือ+วิดเจ็ต
     3. สร้างตารางเครื่องมือ 4 ช่องแบบ Grab พร้อมแผ่นเลื่อน "ทั้งหมด"

   กติกาเหล็กสองข้อ:
     • จอคอมต้องไม่ขยับ — ทุกอย่างทำงานเมื่อ matchMedia ตรงเท่านั้น
       และถอนคืนให้ครบเมื่อหน้าจอกว้างขึ้น (หมุนเครื่อง / เปิดบนแท็บเล็ต)
     • ไม่เขียนตัวนำทางเอง — เรียก window.switchView ที่มีอยู่แล้ว
       เพราะมันรู้เรื่องการข้ามไฟล์ (index/garage/news/…) ซึ่งถ้าเขียนใหม่
       จะพลาดเรื่องที่มองไม่เห็น เช่นการรอ auth ก่อนเปลี่ยนหน้า
   ══════════════════════════════════════════════════════════════════ */
(function(){
"use strict";
const D=document,$=id=>D.getElementById(id);
const T=(th,en)=>(window.spireT?window.spireT(th,en):"th"===(window.spireLang?window.spireLang():"th")?th:en);
const MQ=matchMedia("(max-width:760px)");

/* ─────────── 1. แถบล่าง 5 แท็บ ─────────── */
/* ร้านค้าไม่ได้เป็นแท็บแล้ว — มันย้ายไปเป็นไอคอนในตารางเครื่องมือ
   ห้าแท็บคือเพดานที่นิ้วยังกดแม่นบนจอ 360px ถ้ามีหกจะเริ่มกดพลาด */
const TABS=[
  {k:"home",     ic:"ti-home",      th:"หน้าหลัก", en:"Home"},
  {k:"garage",   ic:"ti-car",       th:"การาจ",    en:"Garage"},
  {k:"chat",     ic:"ti-message-2", th:"แชต",      en:"Chat"},
  {k:"magazine", ic:"ti-book-2",    th:"นิตยสาร",  en:"Magazine"},
  {k:"account",  ic:"ti-user",      th:"บัญชี",    en:"Account"}
];

function page(){
  try{ if(window.__SPIRE_PAGE__)return window.__SPIRE_PAGE__ }catch(e){}
  const f=(location.pathname.split("/").pop()||"/").toLowerCase();
  return ({"garage":"garage","news":"magazine","spares":"shop","profile":"profile","chat":"chat",
           "garage.html":"garage","news.html":"magazine","spares.html":"shop",
           "profile.html":"profile","chat.html":"chat"})[f]||"home";
}

/* เข้าสู่ระบบแล้วหรือยัง — อ่านจากปุ่มของเดิมที่ renderAuthUI คุมอยู่
   ไม่ไปแตะ currentUser เพราะมันเป็นตัวแปรระดับบนสุดใน <script> ธรรมดา
   ซึ่ง "ไม่" ผูกกับ window (ต่างจาก function declaration) จึงอ่านไม่ได้ */
function signedIn(){
  const a=$("avatarBtn");
  return !!(a&&getComputedStyle(a).display!=="none");
}

function navHTML(){
  const cur=page();
  return TABS.map(t=>{
    /* หน้าอะไหล่ไม่มีแท็บของตัวเองแล้ว (ย้ายไปอยู่ในตารางเครื่องมือ)
       แต่ต้องมีแท็บสว่างอยู่หนึ่งอันเสมอ ไม่งั้นผู้ใช้จะไม่รู้ว่าตัวเองอยู่ตรงไหน
       — ชี้กลับไปที่หน้าหลัก ซึ่งเป็นทางที่เขาเดินเข้ามาจริง */
    const on=(t.k===cur)||(t.k==="account"&&cur==="profile")
             ||(t.k==="home"&&cur==="shop");
    /* ลิงก์จริง (ไม่ใช่ปุ่ม) — เบราว์เซอร์เตรียมหน้าปลายทางตอนนิ้วแตะได้ (speculation rules) */
    return `<a class="mtab${on?" on":""}" href="${tabHref(t.k)}" data-mnav="${t.k}"
      aria-label="${T(t.th,t.en)}"${on?' aria-current="page"':""}>
      <span class="mt-i" data-mslot="${t.k}"><i class="ti ${t.ic}"></i></span>
      <b>${T(t.th,t.en)}</b></a>`;
  }).join("");
}

function mountNav(){
  /* หน้าแชตมีแถบเครื่องมือและช่องพิมพ์ของตัวเองที่ขอบล่างอยู่แล้ว
     ใส่แถบซ้อนลงไปจะทับกันพอดี — ดูจากว่าหน้านั้นมีแถบเดสก์ท็อปไหม */
  if(!D.querySelector(".navwrap"))return;
  let n=$("mnav");
  if(!n){
    n=D.createElement("nav"); n.className="mnav"; n.id="mnav";
    n.setAttribute("role","navigation");
    D.body.appendChild(n);
  }
  /* แถบอาจถูกวาดไว้แล้วตั้งแต่ต้นหน้า (mnav0) — ผูกปุ่มครั้งเดียวพอ */
  if(!n.dataset.wired){
    n.dataset.wired="1";
    n.addEventListener("click",e=>{
      const b=e.target.closest("[data-mnav]"); if(!b)return;
      if(e.metaKey||e.ctrlKey||e.shiftKey||e.button)return;
      e.preventDefault(); go(b.dataset.mnav);
    });
  }
  /* วาดใหม่เฉพาะตอนเนื้อหาเปลี่ยน — apply() ถูกเรียกทุกครั้งที่หน้าขยับ ถ้าวาดทุกรอบรูปโปรไฟล์จะกะพริบ */
  const h=navHTML();
  if(n.dataset.h!==h){ n.innerHTML=h; n.dataset.h=h; if(n.querySelector('[data-mslot="account"]'))delete n.querySelector('[data-mslot="account"]').dataset.av }
  paintAvatar();
}

const FILES={home:"/",garage:"/garage",magazine:"/news",shop:"/spares",profile:"/profile"};
function tabHref(k){
  if(k==="chat")return "/chat";
  if(k==="account")return signedIn()?"/profile":"/login?next=%2Fprofile";
  return FILES[k]||"/";
}
function go(k){
  if(k==="chat"){ location.href="/chat"; return }
  if(k==="account"){
    /* ยังไม่ได้เข้าระบบ → กดปุ่มเดิมของหน้า ซึ่งผูกกับ Firebase ไว้แล้ว */
    if(!signedIn()){ const b=$("signinBtn"); if(b){b.click();return} }
    k="profile";
  }
  /* แท็บของหน้าที่อยู่ตอนนี้ — ไม่โหลดหน้าซ้ำ แค่กลับไปบนสุด */
  if(k===page()){
    try{ if(typeof window.switchView==="function"){window.switchView(k);return} }catch(e){}
    try{ scrollTo({top:0,behavior:"smooth"}); D.querySelectorAll(".scroll").forEach(s=>s.scrollTo({top:0,behavior:"smooth"})) }catch(e){}
    return;
  }
  /* ผู้ใช้กดเองต้องไปทันที — switchView ของหน้าย่อยไม่รับคำสั่งย้ายหน้าจนโหลดเสร็จแล้ว 1.2 วิ
     (กันหน้าเด้งเองตอนบูต) ช่วงนั้นกดแท็บแล้วเงียบ ผู้ใช้เลยรู้สึกว่าแอปค้าง */
  const f=FILES[k];
  if(f){ location.href=f; return }
  try{ if(typeof window.switchView==="function")window.switchView(k) }catch(e){}
}

/* แท็บบัญชีโชว์รูปโปรไฟล์จริงเมื่อเข้าระบบแล้ว เหมือน Grab กับ Uber
   คนจำหน้าตัวเองได้เร็วกว่าจำไอคอนคนทั่วไป */
function paintAvatar(){
  const slot=D.querySelector('[data-mslot="account"]'); if(!slot)return;
  const a=$("avatarBtn");
  if(signedIn()&&a&&a.innerHTML.trim()){
    if(slot.dataset.av!==a.innerHTML){slot.dataset.av=a.innerHTML;slot.innerHTML=a.innerHTML}
  }else if(slot.dataset.av!==undefined||!slot.querySelector("i")){
    delete slot.dataset.av;
    slot.innerHTML='<i class="ti ti-user"></i>';
  }
}

/* ─────────── 2. สามจอที่เลื่อนแล้วล็อก ─────────── */
/* โครงเดิมของหน้าหลักคือ  .scroll > [#hstack, #hfree]  โดย #hhero อยู่ใน #hfree
   สิ่งที่ต้องทำมีอย่างเดียว: ยก #hhero ออกมาเป็นพี่น้อง แล้วติดคลาสให้ทั้งสาม
   ไม่ต้องย้ายอย่างอื่นเลย — ยิ่งย้ายน้อย ยิ่งพังยาก */
function arrange(){
  const view=$("v-home"); if(!view)return;
  const sc=view.querySelector(".scroll"); if(!sc)return;
  const stack=$("hstack"),hero=$("hhero"),free=$("hfree");
  if(!free)return;

  if(hero&&hero.parentElement!==sc)sc.insertBefore(hero,free);

  if(stack){stack.classList.add("msnap","msnap-1")}
  if(hero){hero.classList.add("msnap","msnap-2")}
  free.classList.add("msnap","msnap-3");

  /* ระดับพื้นฐานไม่มีห้องนักบิน (#hstack) จอแรกจึงเป็นจอฮีโร่แทน
     ไม่งั้นจะเหลือสองจอโดยจอแรกว่างเปล่า */
  if(!stack&&hero){hero.classList.remove("msnap-2");hero.classList.add("msnap-1")}

  hint(stack||hero);
  hint(stack?hero:null);
  tools();

  /* ครั้งแรกที่จัดเสร็จ ต้องอยู่ที่จอแรกพอดี
     การย้าย #hhero ทำให้ความสูงเหนือจุดเลื่อนเปลี่ยน เบราว์เซอร์บางตัว
     จึงชดเชยจนค้างกลางจอ — เห็นเป็นหน้าที่ "เปิดมาแล้วเลื่อนไปเองแล้ว" */
  /* เปิดหน้ามาต้องอยู่จอแรกเสมอ
     ระหว่างบูตมีทั้งการย้าย #hhero และ scroll-snap ที่เข้าที่เอง
     ทำให้บางจังหวะหน้าเด้งไปค้างที่จอ 2 ตั้งแต่ยังไม่มีใครแตะ */
  if(!arrange.done){
    arrange.done=true; at=0;
    if(sc.scrollTop)sc.scrollTop=0;
  }
  wireSnap(sc);
}

/* ─────────── ตัวบังคับล็อกจอ ───────────
   scroll-snap ของ CSS อาศัย "การปัดจบ" ของเบราว์เซอร์ ซึ่งแต่ละตัวตัดสินใจ
   ไม่เหมือนกัน — บางเครื่องปัดสั้น ๆ แล้วค้างกลางจอ เห็นสองจอครึ่ง ๆ พร้อมกัน
   ซึ่งเป็นภาพที่แย่กว่าไม่ล็อกเลย จึงมีตัวเก็บกวาดหลังเลื่อนหยุดอีกชั้น
   ทำงานเฉพาะสองจอแรกเท่านั้น จอ 3 สูงกว่าจอ ต้องเลื่อนอ่านได้อิสระ */
let settling=false,at=0;
/* เกณฑ์ 20% ของความสูงจอ — เท่ากับที่แอปอ่านนิยาย/สไลด์ใช้กัน
   ต่ำกว่านี้ปัดโดนโดยไม่ตั้งใจก็เปลี่ยนจอ สูงกว่านี้ต้องออกแรงปัดยาวจนเมื่อย */
const STEP=.20;
function settle(sc){
  if(!MQ.matches||settling)return;
  const h=sc.clientHeight; if(h<200)return;
  const t=sc.scrollTop;
  if(t>=h*2-6){at=2;return}                 /* เข้าจอ 3 แล้ว ปล่อยเลื่อนอิสระ */
  const d=t-at*h;
  let to=at;
  if(d>h*STEP)to=Math.min(at+1,2);
  else if(d<-h*STEP)to=Math.max(at-1,0);
  at=to;
  const target=to*h;
  if(Math.abs(t-target)<3)return;
  settling=true;
  sc.scrollTo({top:target,behavior:"smooth"});
  setTimeout(()=>{settling=false},520);
}
/* ยังไม่มีใครแตะจอ = ต้องอยู่จอแรก
   ระหว่างบูต เลเยอร์อื่นวาดของเพิ่มเรื่อย ๆ (ห้องนักบิน ข่าว วิดเจ็ต)
   ความสูงเปลี่ยนทีไรตำแหน่งเลื่อนขยับตาม จนหน้าเปิดมาค้างที่จอ 2 เอง
   ล็อกไว้จนกว่าจะมีการปัด/แตะ/กดปุ่มจริง แล้วค่อยปล่อยให้ผู้ใช้คุม */
let touched=false;
function wireSnap(sc){
  if(sc.__msnap)return; sc.__msnap=true;
  let e=null;
  /* ต้องรอให้ผู้ใช้แตะก่อนถึงจะเริ่มล็อกจอ
     ระหว่างบูตความสูงยังโตอยู่ (ห้องนักบิน · ข่าว · วิดเจ็ตทยอยมา)
     ทุกครั้งที่โตจะมี scroll event หลุดออกมาหนึ่งครั้ง ถ้าล็อกทันที
     ระบบจะคิดว่า "ผู้ใช้ปัดลงมาแล้ว" แล้วพาไปจอ 2 ตั้งแต่ยังไม่มีใครแตะ */
  const end=()=>{ if(MQ.matches&&touched)settle(sc) };
  if("onscrollend" in sc)sc.addEventListener("scrollend",end);
  else sc.addEventListener("scroll",()=>{clearTimeout(e);e=setTimeout(end,140)},{passive:true});

  const mark=()=>{touched=true};
  ["wheel","touchstart","keydown","pointerdown"].forEach(t=>
    addEventListener(t,mark,{passive:true,once:true}));
  sc.addEventListener("scroll",()=>{
    if(touched||settling||!MQ.matches)return;
    if(sc.scrollTop)sc.scrollTop=0;
  },{passive:true});
}

/* ลูกศรกระพริบใต้จอ บอกว่ายังมีจอถัดไป */
function hint(el){
  if(!el||el.querySelector(".mhint"))return;
  const h=D.createElement("div"); h.className="mhint"; h.setAttribute("aria-hidden","true");
  h.innerHTML='<i class="ti ti-chevron-down"></i>';
  el.appendChild(h);
}

/* ─────────── 3. ตารางเครื่องมือแบบ Grab ─────────── */
/* เจ็ดตัวที่ใช้บ่อยขึ้นหน้าแรก ที่เหลืออยู่ในแผ่น "ทั้งหมด"
   สองแถวคือเพดานก่อนที่ตารางจะเริ่มดูเป็นกำแพงไอคอน */
const FEATS=[
  {k:"text",  ic:"ti-message-2",    c:"#4F8FF7", th:"พิมพ์ถาม",       en:"Ask"},
  {k:"image", ic:"ti-camera",       c:"#A46BF5", th:"ถ่ายรูป",        en:"Photo"},
  {k:"video", ic:"ti-video",        c:"#E85DA6", th:"วิดีโอ",         en:"Video"},
  {k:"listen",ic:"ti-ear",          c:"#37C08A", th:"ฟังเสียง",       en:"Listen"},
  {k:"quote", ic:"ti-receipt-2",    c:"#E8A33D", th:"เช็กราคา",       en:"Quote"},
  {k:"shake", ic:"ti-activity",     c:"#3FC3D6", th:"วัดการสั่น",     en:"Shake"},
  {k:"park",  ic:"ti-map-pin",      c:"#F0655C", th:"จำที่จอด",       en:"Parking"},
  {k:"own",   ic:"ti-report-money", c:"#7B8CF0", th:"ต้นทุน",         en:"Costs"},
  {k:"spares",ic:"ti-package",      c:"#F08A3D", th:"อะไหล่",         en:"Spares"}
];
const HOME7=["text","image","listen","quote","shake","park","spares"];

const tile=f=>`<button class="mtool" data-mfeat="${f.k}">
  <span class="mt-ic" style="--c:${f.c}"><i class="ti ${f.ic}"></i></span>
  <b>${T(f.th,f.en)}</b></button>`;

function tools(){
  const free=$("hfree"); if(!free)return;
  let g=$("mtools");
  if(!g){
    g=D.createElement("section"); g.id="mtools";
    free.insertBefore(g,free.firstChild);
    g.addEventListener("click",e=>{
      const all=e.target.closest("[data-mall]"); if(all){sheet();return}
      const b=e.target.closest("[data-mfeat]"); if(b)run(b.dataset.mfeat);
    });
  }
  g.innerHTML=`<h2 class="mgrid-t">${T("เครื่องมือ","Tools")}</h2>
    <div class="mgrid">
      ${HOME7.map(k=>tile(FEATS.find(f=>f.k===k))).join("")}
      <button class="mtool" data-mall="1">
        <span class="mt-ic" style="--c:#6B7A90"><i class="ti ti-layout-grid"></i></span>
        <b>${T("ทั้งหมด","All")}</b></button>
    </div>`;
}

function run(k){
  close();
  const f=FEATS.find(x=>x.k===k); if(!f)return;
  if(k==="spares"){ try{window.switchView("shop")}catch(e){location.href="/spares"} return }
  if(k==="text"||k==="image"||k==="video"){
    try{ if(typeof window.openChat==="function"){window.openChat({attach:k});return} }catch(e){}
    location.href="/chat?attach="+encodeURIComponent(k); return;
  }
  try{ if(typeof window.openTool==="function"){window.openTool(k);return} }catch(e){}
  location.href="/chat?attach="+encodeURIComponent(k);
}

/* แผ่นเลื่อนขึ้น "เครื่องมือทั้งหมด" */
let bg=null,sh=null;
function sheet(){
  if(sh)return;
  bg=D.createElement("div"); bg.className="msheet-bg";
  sh=D.createElement("div"); sh.className="msheet";
  sh.setAttribute("role","dialog"); sh.setAttribute("aria-modal","true");
  sh.innerHTML=`<div class="msheet-h"></div>
    <h2 class="mgrid-t">${T("เครื่องมือทั้งหมด","All tools")}</h2>
    <div class="mgrid">${FEATS.map(tile).join("")}</div>`;
  D.body.appendChild(bg); D.body.appendChild(sh);
  requestAnimationFrame(()=>{bg.classList.add("on");sh.classList.add("on")});
  bg.addEventListener("click",close);
  sh.addEventListener("click",e=>{
    const b=e.target.closest("[data-mfeat]"); if(b)run(b.dataset.mfeat);
  });
  addEventListener("keydown",esc);
}
function esc(e){ if(e.key==="Escape")close() }
function close(){
  if(!sh)return;
  removeEventListener("keydown",esc);
  const a=bg,b=sh; bg=sh=null;
  a.classList.remove("on"); b.classList.remove("on");
  setTimeout(()=>{a.remove();b.remove()},320);
}

/* ─────────── ถอนคืนเมื่อกลับไปจอกว้าง ─────────── */
/* หมุนเครื่องเป็นแนวนอนหรือเปิดบนแท็บเล็ตแล้วต้องได้หน้าเดิมของเดสก์ท็อปกลับมา
   ครบทุกชิ้น ไม่ใช่ครึ่ง ๆ กลาง ๆ — จึงต้องเก็บทุกอย่างที่เราสร้าง */
function teardown(){
  close();
  const n=$("mnav"); if(n)n.remove();
  const g=$("mtools"); if(g)g.remove();
  D.querySelectorAll(".mhint").forEach(h=>h.remove());
  D.querySelectorAll(".msnap").forEach(el=>
    el.classList.remove("msnap","msnap-1","msnap-2","msnap-3"));
  /* #hhero ต้องกลับเข้า #hfree ตำแหน่งเดิม ไม่งั้นเดสก์ท็อปจะเห็นมันลอยผิดที่ */
  const hero=$("hhero"),free=$("hfree");
  if(hero&&free&&hero.parentElement!==free)free.insertBefore(hero,free.firstChild);
}

/* ─────────── วงจรชีวิต ─────────── */
/* แอปวาดใหม่ตลอด (เปลี่ยนรถ · เข้าระบบเสร็จ · โหลดข่าวเสร็จ · เปลี่ยนภาษา)
   ทุกครั้งที่วาดใหม่ #hhero จะถูกยัดกลับเข้า #hfree และแท็บจะหายรูปโปรไฟล์
   จึงต้องเฝ้า ไม่ใช่ทำครั้งเดียว — หน่วงไว้ไม่ให้วิ่งทุก mutation */
let t=null, mobileActive=false;
const kick=()=>{if(t!==null)return;t=setTimeout(()=>{t=null;apply()},32)};

function apply(){
  if(!MQ.matches){if(mobileActive){mobileActive=false;teardown()}return}
  mobileActive=true;mountNav();arrange();
}

function boot(){
  // Chat has its own composer/header: don't watch its streaming DOM or create a second bar.
  if(!D.querySelector(".navwrap")&&!$("v-home"))return;
  apply();
  const avatar=$("avatarBtn");
  if(avatar)new MutationObserver(kick).observe(avatar,{childList:true,subtree:true,attributes:true,attributeFilter:["style"]});
  const home=$("v-home");
  if(home)new MutationObserver(records=>{
    if(records.some(r=>!(r.target.closest&&r.target.closest("#mtools,.msheet,.mhint"))))kick();
  }).observe(home,{childList:true,subtree:true});
  // Canvas/style animations are deliberately not observed across the entire body.
  MQ.addEventListener?MQ.addEventListener("change",apply):MQ.addListener(apply);
  addEventListener("spire:lang",kick);
  try{window.spireOnLang&&window.spireOnLang(kick)}catch(e){}
}
if(D.readyState==="loading")D.addEventListener("DOMContentLoaded",boot);
else boot();
})();
