/* ══ กระดิ่งแจ้งเตือนของ Cendon (หน้าแรก + ห้องแชต) ══
   กล่องข้อความแจ้งเตือนเก็บในเครื่องนี้ ผูกกับบัญชี (เปลี่ยนบัญชี = เริ่มใหม่) · ล่าสุด 40 รายการ
   แจ้งเตือนในเครื่องจริง:
   · แอปปิดอยู่ → หลังบ้านส่ง Web Push เอง (ช่างเสนอราคา รับงาน กำลังมา ซ่อมเสร็จ ข้อความใหม่)
   · แอปเปิดค้างไว้แต่ไม่ได้ดู และยังไม่ได้สมัคร Push → หน้าเว็บแสดงเอง (ใช้ tag เดียวกับหลังบ้าน)
   · AI ตอบเสร็จตอนผู้ใช้สลับไปแอปอื่น → แจ้งจากห้องแชต
   ไม่มีชื่อ เบอร์ หรือที่อยู่ลูกค้าในข้อความแจ้งเตือน */
(function(W){
'use strict';
const KEY="spire_inbox",MAX=40,subs=new Set();
let io={get:null,post:null};
const T=(th,en)=>(W.spireT?W.spireT(th,en):((W.lang||"th")==="en"?en:th));
const uid=()=>{try{const a=W.spireAuth||W.auth;const u=a&&a.currentUser;if(u)return u.uid;const c=JSON.parse(localStorage.getItem("spire_cachedUser")||"null");return c&&c.uid||""}catch(e){return ""}};
function load(){try{const d=JSON.parse(localStorage.getItem(KEY)||"null");return d&&d.uid===uid()?d.items||[]:[]}catch(e){return []}}
function save(items){try{localStorage.setItem(KEY,JSON.stringify({uid:uid(),items:items.slice(0,MAX)}))}catch(e){}subs.forEach(f=>{try{f()}catch(e){}})}
const supported=()=>"Notification" in W&&"serviceWorker" in navigator;
const perm=()=>supported()?Notification.permission:"unsupported";
const pushOn=()=>{try{return JSON.parse(localStorage.getItem("spire_notifOn")||"false")===true}catch(e){return false}};

/* แสดงบนเครื่องผ่าน service worker (มือถือบางรุ่นใช้ new Notification ตรง ๆ ไม่ได้) */
async function sys(ev){
  if(perm()!=="granted")return false;
  try{const reg=await navigator.serviceWorker.ready;
    await reg.showNotification(ev.title,{body:ev.body||"",icon:"/icon192.png",badge:"/icon192.png",tag:ev.tag||"cendon",data:{url:ev.url||"/"}});return true}
  catch(e){return false}
}
/* เพิ่มรายการ · system = จะเด้งบนเครื่องด้วยไหม (เฉพาะตอนไม่ได้ดูหน้านี้อยู่) */
function add(ev,opt){
  if(!ev||!ev.title)return null;
  const items=load(),id=ev.id||(ev.tag||"n")+":"+Date.now();
  if(items.some(x=>x.id===id))return null;
  const it={id,kind:ev.kind||"info",title:String(ev.title).slice(0,120),body:String(ev.body||"").slice(0,200),url:ev.url||"/",tag:ev.tag||"cendon",at:Date.now(),read:false};
  items.unshift(it);save(items);
  const o=opt||{};
  if(document.hidden&&(o.system||(o.fallback&&!pushOn())))sys(it);
  return it;
}
const list=()=>load();
const unread=()=>load().filter(x=>!x.read).length;
function read(id){const items=load();items.forEach(x=>{if(!id||x.id===id)x.read=true});save(items)}
function clear(){save([])}
/* ให้แต่ละหน้าบอกวิธีเรียกหลังบ้าน (ใช้โทเคนของหน้านั้น) */
function setApi(o){io=Object.assign(io,o||{})}
/* รถที่มีวันครบกำหนด (ภาษี/พ.ร.บ./ประกัน/ตรวจสภาพ) — ส่งไปพร้อมการสมัครแจ้งเตือน ให้การเตือนเดิมไม่หาย */
function pushCars(){
  try{return (JSON.parse(localStorage.getItem("spire_garage")||"[]")||[]).slice(0,6).map(c=>{
    let r={};try{r=JSON.parse(localStorage.getItem("spire_reg_"+c.id)||"{}")||{}}catch(e){}
    return {id:c.id,name:c.name||"",tax:r.tax||"",act:r.act||"",ins:r.ins||"",chk:r.chk||""}}).filter(x=>x.tax||x.act||x.ins||x.chk)}catch(e){return []}
}
const u8=b=>{const p="=".repeat((4-b.length%4)%4),s=atob((b+p).replace(/-/g,"+").replace(/_/g,"/"));return Uint8Array.from(s,c=>c.charCodeAt(0))};
/* เปิดแจ้งเตือนในเครื่อง: ขอสิทธิ์ (ต้องมาจากการกดของผู้ใช้) → สมัคร Push ถ้าหลังบ้านพร้อม */
async function enable(){
  if(!supported())return "unsupported";
  let p=Notification.permission;
  if(p==="default")p=await Notification.requestPermission();
  if(p!=="granted")return p;
  try{
    const reg=await navigator.serviceWorker.ready;
    const kj=io.get?await io.get("/api/push/key"):null;
    if(kj&&kj.enabled&&kj.key&&reg.pushManager&&io.post){
      let sub=await reg.pushManager.getSubscription();
      if(!sub)sub=await reg.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:u8(kj.key)});
      await io.post("/api/push/subscribe",{sub:sub.toJSON(),cars:pushCars(),lang:W.lang||"th"});
      localStorage.setItem("spire_notifOn","true");
    }
  }catch(e){}
  return "granted";
}
function on(f){subs.add(f);return ()=>subs.delete(f)}
/* แท็บอื่น (เช่น ห้องแชต) เพิ่มรายการ → กระดิ่งหน้านี้อัปเดตด้วย */
W.addEventListener("storage",e=>{if(e.key===KEY)subs.forEach(f=>{try{f()}catch(x){}})});

/* AI ตอบเสร็จตอนผู้ใช้ไม่ได้ดูห้องแชต → แจ้งบนเครื่อง + เก็บในกระดิ่ง */
function ai(text,valet){
  if(!document.hidden)return;
  const t=String(text||"").replace(/\[\[(ACT|ASK|NEXT)\]\][\s\S]*?(\[\[\/\1\]\]|$)/g,"").replace(/\[\[[\s\S]*?\]\]/g,"").replace(/[#*_`>]/g,"").replace(/\s+/g," ").trim();
  add({kind:"ai",title:valet?T("Cendon Valet เตรียมการ์ดให้แล้ว — รอคุณยืนยัน","Cendon Valet has a card ready — waiting for you"):T("Cendon AI ตอบแล้ว","Cendon AI replied"),
    body:t.slice(0,140),url:location.pathname+location.search,tag:"cendon-ai"},{system:true});
}
W.CendonBell={add,list,unread,read,clear,enable,perm,pushOn,on,setApi,ai,sys};
})(window);
