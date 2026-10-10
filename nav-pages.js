/* ══════════════════════════════════════════════════════════════════
   nav-pages.js — ที่อยู่แบบลึกสำหรับหน้า การาจ · นิตยสาร · อะไหล่ · บัญชี
   (สี่หน้านี้ใช้ป๊อปอัปชุดเดียวกัน: หน้ารถ · หน้าตั้งค่า · แผ่นเครื่องมือ ฯลฯ)

   ทุกป๊อปอัปที่เปิด = หนึ่งขั้นในประวัติ ปุ่มย้อนของเครื่องปิดทีละชั้น ไม่เด้งออกจากหน้า
     /garage/add · /garage/<รถ> · /garage/<รถ>/<แท็บ> · /garage/<รถ>/info · /garage/<รถ>/color
     /news/<ข่าว> · /news/section/<หมวด> · /spares/apps
     /<หน้า>/settings/<แท็บ> · /profile/<แท็บ> (หน้าบัญชีคือหน้าตั้งค่าทั้งหน้า)
   ══════════════════════════════════════════════════════════════════ */
(function(){
"use strict";
if(!window.Nav)return;
const D=document,$=id=>D.getElementById(id);
const PAGE=window.__SPIRE_PAGE__||"";
const BASE={garage:"/garage",magazine:"/news",shop:"/spares",profile:"/profile"}[PAGE];
if(!BASE)return;
const enc=encodeURIComponent;
const wait=(ok,ms)=>new Promise(r=>{const t0=Date.now();(function w(){if(ok()||Date.now()-t0>(ms||6000))return r(ok());setTimeout(w,60)})()});
const cars=()=>{try{return (window.garage&&window.garage())||JSON.parse(localStorage.getItem("spire_garage")||"[]")}catch(e){return []}};
const hasCar=id=>cars().some(c=>String(c.id)===String(id));

/* ── หน้ารถ (รายละเอียดรถ + แท็บ) ── */
const carUrl=id=>PAGE==="garage"?"/garage/"+enc(id):BASE+"/car/"+enc(id);
let lastCar=null;
(function wrap(){
  const o=window.openCarDetail;
  if(typeof o!=="function"||o.__nav){if(typeof o!=="function")setTimeout(wrap,200);return}
  const f=function(id){lastCar=id;return o.apply(this,arguments)};f.__nav=true;window.openCarDetail=f;
})();
Nav.watch({sel:"#clModal",cls:"show",tag:"car",url:()=>carUrl(lastCar),close:el=>el.classList.remove("show")});
/* แท็บในหน้ารถ (สเปก อุปกรณ์ บำรุงรักษา …) — จำแท็บเดิมก่อนกด แล้วซ้อนขั้นใหม่หลังเปลี่ยน */
const clTab=()=>{const x=D.querySelector('#clTabs [aria-selected="true"]');return x&&x.dataset.tab};
const clClick=k=>{const x=D.querySelector('#clTabs [data-tab="'+k+'"]');if(x)x.click()};
D.addEventListener("click",e=>{
  const b=e.target.closest&&e.target.closest("#clTabs [data-tab]");if(!b||Nav.closing)return;
  const was=clTab();
  setTimeout(()=>{const now=clTab(),car=Nav.find("car");if(!car||!now||now===was)return;
    Nav.push({url:car.url+"/"+now,tag:"cltab",close:()=>clClick(was)})},0);
},true);

/* ── หน้าตั้งค่า (เปิดทับหน้าอื่น) + แท็บในหน้าตั้งค่า ── */
const setTab=()=>{const x=D.querySelector("#v-settings .set-l.on");return x&&x.dataset.tab};
const setClick=k=>{const x=D.querySelector('#v-settings .set-l[data-tab="'+k+'"]');if(x)x.click()};
if(PAGE!=="profile")Nav.watch({sel:"#v-settings",cls:"on",tag:"settings",url:()=>BASE+"/settings",close:el=>el.classList.remove("on")});
D.addEventListener("click",e=>{
  const b=e.target.closest&&e.target.closest("#v-settings .set-l[data-tab]");if(!b||Nav.closing)return;
  const was=setTab();
  setTimeout(()=>{const now=setTab();if(!now||now===was)return;
    const under=PAGE==="profile"?BASE:(Nav.find("settings")||{}).url;if(!under)return;
    Nav.push({url:under+"/"+now,tag:"settab",close:()=>setClick(was)})},0);
},true);

/* ── ป๊อปอัปอื่น ๆ: กดย้อนแล้วปิด (ไม่มีที่อยู่ของตัวเอง เปิดซ้ำจากลิงก์ไม่ได้) ── */
const clickIn=sel=>()=>{const x=D.querySelector(sel);if(x)x.click()};
Nav.watch({sel:".msheet",cls:"on",slug:()=>"tools",close:clickIn(".msheet-bg.on")});
Nav.watch({sel:"#pmOv",cls:"on",slug:()=>"park",close:clickIn("#pmX")});
Nav.watch({sel:"#pnOv",cls:"on",slug:()=>"park",close:clickIn("#pnX")});
Nav.watch({sel:"#magModal",cls:"show",slug:()=>"article",close:()=>{try{window.closeMagModal()}catch(e){}}});

/* ── หน้าการาจ: เพิ่มรถ · ข้อมูลเพิ่มเติม · เปลี่ยนสี ── */
if(PAGE==="garage"){
  /* ตัวแปรของหน้า (let ระดับบนสุด) อ่านผ่าน window ไม่ได้ — ถามผ่านฟังก์ชันแทน */
  const idOf=n=>{try{return Function("return typeof "+n+"!=='undefined'?"+n+":null")()}catch(e){return null}};
  Nav.watch({sel:".gx-pop",cls:"on",tag:"gx",url:el=>el.id==="gxPop"?"/garage/add":el.id==="gxInfo"?"/garage/"+enc(idOf("infoId")||"")+"/info"
    :"/garage/"+enc(idOf("gxPaintId")||"")+"/color",close:()=>{try{window.closeAddCar()}catch(e){}}});
  Nav.route({path:"add",open:()=>{try{window.openAddCar()}catch(e){}}});
  Nav.route({path:":car/info",test:p=>hasCar(p.car),open:p=>{try{openInfo(p.car)}catch(e){}}});
  Nav.route({path:":car/color",test:p=>hasCar(p.car),open:p=>{try{openPaint(p.car)}catch(e){}}});
  Nav.route({path:":car",name:"car",test:p=>hasCar(p.car)&&!["settings","add"].includes(p.car),open:p=>window.openCarDetail(p.car)});
}else{
  Nav.route({path:"car/:car",name:"car",test:p=>hasCar(p.car),open:p=>window.openCarDetail&&window.openCarDetail(p.car)});
}
const CLTABS=["odo","spec","equip","health","plan","parts","cost","trip"];
Nav.route({path:":tab",parent:"car",test:p=>CLTABS.includes(p.tab),open:p=>clClick(p.tab)});

/* ── ตั้งค่า ── */
const SETS=["general","acct","usage","fb","learn"];
if(PAGE==="profile"){
  Nav.route({path:":tab",test:p=>SETS.includes(p.tab),open:async p=>{await wait(()=>D.querySelector("#v-settings.on .set-l"));setClick(p.tab)}});
}else{
  Nav.route({path:"settings",name:"settings",open:()=>{try{window.spireOpenSettings("general")}catch(e){}}});
  Nav.route({path:":tab",parent:"settings",test:p=>SETS.includes(p.tab),open:p=>setClick(p.tab)});
}

/* ── นิตยสาร ── */
if(PAGE==="magazine"){
  const items=()=>{try{return Function("return magItems")()||[]}catch(e){return []}};
  const ready=()=>{try{return Function("return mzLoaded")()}catch(e){return Promise.resolve()}};
  Nav.route({path:"section/:c",open:async p=>{await Promise.race([ready(),wait(()=>items().length,8000)]);try{mzSetCat(p.c)}catch(e){}}});
  Nav.route({path:":id",test:p=>p.id!=="section",open:async p=>{
    await Promise.race([ready(),wait(()=>items().length,8000)]);
    const i=items().findIndex(m=>String(m.id)===p.id);if(i>=0)openMagModal(i)}});
}

/* ── อะไหล่: หน้าเลือกแอป (/spares/apps) ── */
if(PAGE==="shop"){
  Nav.route({path:"apps",open:async()=>{await wait(()=>{const x=$("spCfgBtn");return x&&x.style.display!=="none"},4000);const x=$("spCfgBtn");if(x&&x.style.display!=="none")x.click()}});
}

/* ลิงก์รูปแบบเก่า: /news?a=<ข่าว> · /garage?add=1 · /profile?tab=<แท็บ> */
function legacy(u){
  const q=u.searchParams;
  if(PAGE==="magazine"&&q.get("a"))return "/news/"+enc(q.get("a"));
  if(PAGE==="profile"&&q.get("tab")&&SETS.includes(q.get("tab"))&&q.get("tab")!=="acct")return "/profile/"+q.get("tab");
  return null;
}
const go=()=>setTimeout(()=>Nav.start({base:BASE,legacy}),0);
if(D.readyState==="loading")D.addEventListener("DOMContentLoaded",go);else go();
})();
