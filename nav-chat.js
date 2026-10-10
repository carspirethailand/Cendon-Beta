/* ══════════════════════════════════════════════════════════════════
   nav-chat.js — ที่อยู่แบบลึกของห้องแชต (nav.js)

   แต่ละขั้นของแชตมีที่อยู่ของตัวเอง ปุ่มย้อนของเครื่องถอยทีละขั้น ไม่เด้งออกจากห้องแชต
     /chat                     หน้าเริ่มแชต
     /chat/start               เลือกวิธีเริ่ม
     /chat/symptoms[/<หมวด>]    เลือกอาการ
     /chat/<แชต>               ห้องสนทนา (เปิดแชตเก่าจากประวัติก็ได้ที่อยู่ของแชตนั้น)
     /chat/settings · /chat/work
   ══════════════════════════════════════════════════════════════════ */
(function(){
"use strict";
if(!window.Nav)return;
const D=document,body=D.body;
const val=n=>{try{return Function("return typeof "+n+"!=='undefined'?"+n+":null")()}catch(e){return null}};
const sid=()=>{try{return currentSessionId()}catch(e){return null}};
const hasMsgs=()=>{try{const id=currentSessionId(),s=getSessions().find(x=>x.id===id);return !!(s&&s.msgs&&s.msgs.length)}catch(e){return false}};
const threadUrl=()=>{const s=sid();return s&&hasMsgs()?"/chat/"+encodeURIComponent(s):"/chat/new"};
const URLS={choices:()=>"/chat/start",symcats:()=>"/chat/symptoms",symlist:()=>"/chat/symptoms/"+encodeURIComponent(val("activeSymCat")||""),
  thread:threadUrl,settings:()=>"/chat/settings",work:()=>"/chat/work"};
let quiet=0;
const top=()=>Nav.top();
const phaseLayers=()=>Nav.stack.filter(l=>l.tag==="phase");

/* ── เปลี่ยนขั้นของแชต = หนึ่งขั้นในประวัติ ──
   ปุ่ม "กลับ" ในหน้า (เช่น ออกจากตั้งค่ากลับห้องสนทนา) = ถอยประวัติ ไม่ใช่ซ้อนขั้นใหม่ */
function hookPhase(){
  const o=window.setPhase;if(typeof o!=="function"||o.__nav)return;
  const f=function(p){
    if(quiet||Nav.closing)return o.apply(this,arguments);
    const prev=body.dataset.phase,t=top();
    if(t&&t.tag==="phase"&&t.from===p&&!Nav.opening){Nav.back(t);return}
    const r=o.apply(this,arguments);
    if(p==="login"||p==="gate")return r;
    if(p==="welcome"){const first=phaseLayers()[0];if(first)Nav.drop(first);return r}
    if(prev===p&&!Nav.opening)return r;
    const u=URLS[p];if(!u)return r;
    const l=Nav.push({url:u(),tag:"phase",close:()=>{quiet++;try{window.setPhase(prev||"welcome")}finally{quiet--}}});
    if(l){l.from=prev;l.to=p}
    return r;
  };
  f.__nav=true;window.setPhase=f;
}
/* ตัวอื่นที่ครอบ setPhase ทีหลัง (หน้า Chat Flow) จะเรียกผ่านตัวนี้ต่ออีกที — ทำงานครั้งเดียวต่อการเปลี่ยนขั้น */
hookPhase();

/* เปิดแชตเก่าจากประวัติ = หนึ่งขั้น กดย้อนกลับไปแชตเดิม */
(function(){
  const o=window.switchSession;if(typeof o!=="function")return;
  window.switchSession=function(id){
    const prevId=sid(),prev=body.dataset.phase;
    quiet++;try{o.apply(this,arguments)}finally{quiet--}
    if(Nav.closing||(prevId===id&&prev==="thread"&&!Nav.opening))return;
    const l=Nav.push({url:"/chat/"+encodeURIComponent(id),tag:"phase",close:()=>{quiet++;try{
      if(prev==="thread"&&prevId)o(prevId);else{window.setPhase(prev||"welcome")}}finally{quiet--}}});
    if(l){l.from=prev;l.to="thread"}
  };
})();
/* แชตใหม่ได้เลขประจำตัวตอนส่งข้อความแรก — เปลี่ยนที่อยู่ /chat/new เป็นที่อยู่จริงของแชตนั้น */
(function(){
  const o=window.saveSession;if(typeof o!=="function")return;
  window.saveSession=function(){
    const r=o.apply(this,arguments);
    try{const t=top();if(t&&t.tag==="phase"&&t.to==="thread"&&/\/chat\/new$/.test(t.url)&&hasMsgs())Nav.replace(threadUrl())}catch(e){}
    return r;
  };
})();

/* ล็อกอินเสร็จ/โหลดรถเสร็จ หน้าแชตเลือกหน้าเริ่มใหม่ (decideStart) — ไม่ใช่การกดเปลี่ยนขั้นของผู้ใช้
   ถ้าเปิดลึกอยู่แล้ว (เช่น ลิงก์ /chat/settings) ไม่ต้องรีเซ็ตกลับหน้าเริ่ม */
(function(){
  const o=window.decideStart;if(typeof o!=="function")return;
  window.decideStart=function(){
    const ok=!(val("useFb")&&!val("currentUser"))&&window.selCar&&selCar();
    if(ok&&phaseLayers().length)return;
    quiet++;try{return o.apply(this,arguments)}finally{quiet--}
  };
})();

/* แผ่นประวัติแชต / เมนู: ปุ่มย้อนของเครื่องปิดแผ่น */
const closeSheets=()=>{try{window.closeSheets()}catch(e){}};
Nav.watch({sel:"#sheetHist",cls:"show",slug:()=>"history",close:closeSheets});
Nav.watch({sel:"#sheetSet",cls:"show",slug:()=>"menu",close:closeSheets});

/* ── เส้นทาง (รีเฟรช / แชร์ลิงก์ / กดไปข้างหน้า) ── */
const ready=()=>!!(val("entered")&&window.selCar&&selCar());
Nav.route({path:"start",open:()=>{if(ready())showChoices()}});
Nav.route({path:"symptoms",name:"symcats",open:()=>{if(ready())showSymCats()}});
Nav.route({path:":cat",parent:"symcats",test:p=>{const db=val("SYMPTOMS_DATABASE");return !!(db&&db[p.cat])},open:p=>showSymList(p.cat)});
Nav.route({path:"settings",open:()=>{try{openSettings()}catch(e){}}});
Nav.route({path:"work",open:()=>{try{window.openChatFlow&&window.openChatFlow()}catch(e){}}});
Nav.route({path:"new",open:()=>{if(ready())window.setPhase("thread")}});
Nav.route({path:":sid",test:p=>/^s\d+$/.test(p.sid),open:p=>{if(ready()&&getSessions().some(s=>s.id===p.sid))window.switchSession(p.sid)}});

/* เริ่มหลังรู้ว่าใครเข้ามาและเลือกรถแล้ว (runEntry) — ก่อนหน้านั้นยังเปิดห้องสนทนาไม่ได้ */
function begin(){if(!Nav.started)Nav.start({base:"/chat",legacy:u=>{const s=u.searchParams.get("session");return s?"/chat/"+encodeURIComponent(s):null}})}
if(val("entered"))setTimeout(begin,0);
else{
  const o=window.runEntry;
  if(typeof o==="function")window.runEntry=function(){const r=o.apply(this,arguments);setTimeout(begin,0);return r};
  /* ไม่ได้ล็อกอิน / ไม่มีรถ — หน้านี้ยังกดย้อนได้ตามปกติ */
  setTimeout(()=>{if(!Nav.started&&!val("entered"))begin()},12000);
}
})();
