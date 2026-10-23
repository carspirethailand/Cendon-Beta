/* ══ กระดิ่งแจ้งเตือนของ Cendon (ทุกหน้า ตำแหน่งเดียวกันเป๊ะ) ══
   ไฟล์นี้วาดปุ่มให้ทุกหน้า รวมหน้าแรก — ไม่มีหน้าไหนวาดเอง ตำแหน่งจึงไม่กระโดดตอนเปลี่ยนหน้า
   · มือถือ: ไอคอนเปล่าบนสุดของหน้า มุมขวา จุดเดียวกับกระดิ่งเดิมของหน้าแรก — เลื่อนหน้าแล้วเลื่อนขึ้นไปด้วย
     ไม่ลอยตามจอ จึงไม่บังเนื้อหาและไม่ทับปุ่มอื่น · แผ่น/หน้าต่างที่เปิดทับจะบังกระดิ่งตามปกติ (ห้องแชต = ในแถบบนของห้อง)
   · คอม: ในแถบเมนูบน ข้างรูปโปรไฟล์ (ห้องแชตไม่มีแถบเมนู → วางลอยไว้ตรงจุดเดียวกันบนจอ)
   · ขึ้นทันทีที่เปิดหน้า ถ้าเครื่องนี้ล็อกอินค้างไว้ (ไม่รอระบบบัญชีโหลดเสร็จ) · แผงรายการใช้ตัวเดียวกันทุกหน้า
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
/* หน้าไหนไม่ได้บอกวิธีเรียกหลังบ้าน ใช้ที่อยู่ + โทเคนที่ทุกหน้าเปิดไว้ให้ (BACKEND_URL · spireAuth) */
async function call(path,body){
  const a=W.spireAuth||W.auth,u=a&&a.currentUser,base=W.BACKEND_URL;
  if(!u||!base)throw new Error("signed-out");
  const r=await fetch(base+path,{method:body?"POST":"GET",cache:"no-store",headers:Object.assign({Authorization:"Bearer "+await u.getIdToken()},body?{"Content-Type":"application/json"}:{}),body:body?JSON.stringify(body):undefined});
  if(!r.ok)throw Object.assign(new Error("http "+r.status),{status:r.status});
  return r.json();
}
const get=p=>io.get?io.get(p):call(p),post=(p,b)=>io.post?io.post(p,b):call(p,b);
const T=(th,en)=>(W.spireT?W.spireT(th,en):((W.lang||"th")==="en"?en:th));
const uid=()=>{try{const a=W.spireAuth||W.auth;const u=a&&a.currentUser;if(u)return u.uid;const c=JSON.parse(localStorage.getItem("spire_cachedUser")||"null");return c&&c.uid||""}catch(e){return ""}};
function load(){try{const d=JSON.parse(localStorage.getItem(KEY)||"null");return d&&d.uid===uid()?d.items||[]:[]}catch(e){return []}}
function save(items){try{localStorage.setItem(KEY,JSON.stringify({uid:uid(),items:items.slice(0,MAX)}))}catch(e){}subs.forEach(f=>{try{f()}catch(e){}})}
const supported=()=>"Notification" in W&&"serviceWorker" in navigator;
const perm=()=>supported()?Notification.permission:"unsupported";
/* แจ้งเตือนในเครื่อง "เปิด/ปิด" = ตัวเลือกของผู้ใช้ (เก็บในเครื่อง) แยกจาก "สมัคร Push กับเซิร์ฟเวอร์แล้ว"
   เดิมใช้ค่าเดียวกัน — หลังบ้านไม่มีกุญแจ Push ค่าไม่เคยถูกบันทึก ปุ่ม "เปิด" จึงค้างตลอดแม้เปิดแล้ว
   ยังไม่เคยเลือก + อนุญาตในเบราว์เซอร์แล้ว = ถือว่าเปิด (ผู้ใช้เดิม) */
const PREF="spire_notifOn",SUB="spire_pushSub";
const pref=()=>{try{const v=localStorage.getItem(PREF);return v==null?perm()==="granted":JSON.parse(v)===true}catch(e){return false}};
const pushOn=()=>perm()==="granted"&&pref();
const pushSub=()=>{try{return localStorage.getItem(SUB)==="true"}catch(e){return false}};

/* แสดงบนเครื่องผ่าน service worker (มือถือบางรุ่นใช้ new Notification ตรง ๆ ไม่ได้) */
async function sys(ev){
  if(!pushOn())return false;
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
  if(document.hidden&&(o.system||(o.fallback&&!pushSub())))sys(it);
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
/* ตัวช่วยเบื้องหลังของเบราว์เซอร์ (service worker) — บางเครื่อง/บางเบราว์เซอร์ไม่ตอบเลย (ยังไม่ติดตั้งแอป ปิดไว้ โหมดไม่ระบุตัวตน)
   เดิมรอ ready ตรง ๆ จนค้าง ปุ่มเปิด/ปิดเลยไม่เปลี่ยนตาม → รอไม่เกิน 4 วิ แล้วไปต่อ */
const swReady=()=>"serviceWorker" in navigator?Promise.race([navigator.serviceWorker.ready,new Promise(r=>setTimeout(()=>r(null),4000))]).catch(()=>null):Promise.resolve(null);
async function subscribeBg(){
  try{
    const reg=await swReady();if(!reg||!reg.pushManager||!pref())return;
    const kj=await get("/api/push/key").catch(()=>null);
    if(kj&&kj.enabled&&kj.key){
      let sub=await reg.pushManager.getSubscription();
      if(!sub)sub=await reg.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:u8(kj.key)});
      if(!pref())return;   // ผู้ใช้กดปิดระหว่างรอ
      await post("/api/push/subscribe",{sub:sub.toJSON(),cars:pushCars(),lang:W.lang||"th"});
      localStorage.setItem(SUB,"true");
    }
  }catch(e){}
}
/* เปิดแจ้งเตือนในเครื่อง: ขอสิทธิ์ (ต้องมาจากการกดของผู้ใช้) → ปุ่มเปลี่ยนเป็น "ปิด" ทันที · สมัคร Push กับหลังบ้านทำเบื้องหลัง */
async function enable(){
  if(!supported())return "unsupported";
  let p=Notification.permission;
  if(p==="default")p=await Notification.requestPermission();
  if(p!=="granted")return p;
  try{localStorage.setItem(PREF,"true")}catch(e){}
  subscribeBg();
  subs.forEach(f=>{try{f()}catch(e){}});
  return "granted";
}
/* ปิดแจ้งเตือนในเครื่อง: ยกเลิก Push ที่เซิร์ฟเวอร์และในเครื่อง · รายการในกระดิ่งยังขึ้นตามปกติ (แค่ไม่เด้งบนเครื่อง) */
async function disable(){
  try{localStorage.setItem(PREF,"false");localStorage.removeItem(SUB)}catch(e){}
  subs.forEach(f=>{try{f()}catch(e){}});
  try{const reg=await swReady();const sub=reg&&reg.pushManager&&await reg.pushManager.getSubscription();
    if(sub){await post("/api/push/unsubscribe",{endpoint:sub.endpoint}).catch(()=>{});await sub.unsubscribe().catch(()=>{})}}catch(e){}
  subs.forEach(f=>{try{f()}catch(e){}});
  return "off";
}
function on(f){subs.add(f);return ()=>subs.delete(f)}

/* ── ใบงานเปลี่ยน → รายการแจ้งเตือน ──
   เทียบกับครั้งก่อน (เก็บในเครื่อง ผูกบัญชี) · รอบแรกหลังเข้าแอปจำไว้เฉย ๆ ไม่แจ้งของเก่า
   รหัสรายการเหมือนกันทุกหน้า → หน้าไหนเห็นก่อนก็แจ้งครั้งเดียว ไม่ซ้ำ */
const money=n=>Number(n||0).toLocaleString("th-TH");
function jobEvents(jobs,me){
  const K="spire_jobsnap",cur={};let snap=null;
  try{snap=JSON.parse(localStorage.getItem(K)||"null")}catch(e){}
  (jobs||[]).forEach(j=>{cur[j.id]=[j.status,j.unread||0]});
  const put=()=>{try{localStorage.setItem(K,JSON.stringify({uid:me,j:cur}))}catch(e){}};
  if(!snap||snap.uid!==me){put();return []}
  const old=snap.j||{},evs=[];
  for(const j of jobs||[]){
    if(j.side==="admin")continue;
    const o=old[j.id],tech=j.side==="technician",shop=j.techName||T("ช่าง","The mechanic"),car=j.car||"",url="/jobs/"+encodeURIComponent(j.id),tag="cendon-job-"+j.id;
    const ev=(kind,title,body,u)=>evs.push({id:j.id+":"+kind+":"+(j.updatedAt||j.createdAt||0),kind,title,body:body??car,url:u||url,tag});
    if(!o){if(tech&&j.status==="requested")ev("request",T("คำขอใหม่: ","New request: ")+car,j.symptom);continue}
    if(o[0]!==j.status){
      if(!tech){
        if(j.status==="quoted")ev("quote",T(`${shop} เสนอราคา`,`${shop} sent a quote`)+(j.total?` ฿${money(j.total)}`:""));
        else if(j.status==="enroute")ev("enroute",T(`${shop} กำลังมาหาคุณ`,`${shop} is on the way`));
        else if(j.status==="working")ev("working",T(`${shop} เริ่มซ่อมแล้ว`,`${shop} started the repair`));
        else if(j.status==="done")ev("done",T(`${shop} ซ่อมเสร็จ — ตรวจแล้วยืนยันงาน`,`${shop} finished — check and confirm`));
        else if(j.status==="cancelled")ev("cancel",cancelTitle(j,car));
      }else{
        if(j.status==="accepted")ev("accept",T(`ลูกค้ายืนยันราคา: ${car}`,`Customer accepted: ${car}`));
        else if(j.status==="completed")ev("complete",T(`ลูกค้ายืนยันงานเสร็จ: ${car}`,`Customer confirmed: ${car}`));
        else if(j.status==="cancelled"&&!j.expired)ev("cancel",cancelTitle(j,car));
        else if(j.status==="disputed")ev("dispute",T(`มีการแจ้งปัญหา: ${car}`,`Problem reported: ${car}`));
      }
    }
    if((j.unread||0)>(o[1]||0))ev("msg",T("ข้อความใหม่ — ","New message — ")+(tech?car:shop),tech?"":car,url+"/chat");
  }
  put();return evs;
}

function cancelTitle(j,car){
  if(j.expired)return T('คำขอหมดอายุ','A request expired');
  const who={customer:T('ลูกค้ายกเลิก','Customer cancelled'),technician:T('ช่างยกเลิก','Mechanic cancelled'),admin:T('ทีมงานยกเลิก','Staff cancelled'),system:T('ระบบปิดคำขอ','Request closed by the system')}[j.cancelledBy];
  return (who||T('งานถูกยกเลิก','Job cancelled'))+(car?': '+car:'');
}
/* ── หน้าตา: ปุ่มกระดิ่ง + แผงรายการ (ใช้ตัวแปรสีชุดเดียวกับ lux.css ทุกหน้า) ── */
const CSS=`
.cb-bell{position:relative;width:36px;height:36px;border-radius:50%;display:grid;place-items:center;cursor:pointer;flex:none;padding:0;
  border:0;background:none;color:var(--ink,#09090B);font-size:20px;transition:background .2s}
.cb-bell:hover,.cb-bell[aria-expanded="true"]{background:var(--surface-2,rgba(127,127,127,.12))}
.cb-bell[hidden]{display:none!important}
/* กระดิ่งอยู่นิ่งที่เดิมทุกหน้า — ไม่เล่นแอนิเมชันเข้าฉากของหน้า (เดิมเลื่อนขึ้นทุกครั้งที่เปลี่ยนหน้า) */
.cb-bell.cb-m,.cb-bell.cb-d,.cb-bell.cb-fx{animation:none!important}
.cb-bell em{position:absolute;top:1px;right:0;min-width:16px;height:16px;padding:0 4px;border-radius:999px;display:grid;place-items:center;
  font:700 10px/1 Kanit,system-ui,sans-serif;font-style:normal;color:#fff;background:var(--co,#E9682A);border:2px solid var(--bg,#fff)}
.cb-bell em[hidden]{display:none}
.cb-bell.ding .ti{animation:cbRing .9s cubic-bezier(.36,.07,.19,.97)}
@keyframes cbRing{0%,100%{transform:rotate(0)}15%{transform:rotate(14deg)}30%{transform:rotate(-12deg)}45%{transform:rotate(9deg)}60%{transform:rotate(-6deg)}75%{transform:rotate(3deg)}}
/* มือถือ: จุดเดียวกับกระดิ่งเดิมของหน้าแรก (ศูนย์กลางห่างขอบขวา 34px ขอบบน 41px) · ติดอยู่กับหน้า ไม่ติดจอ */
.cb-m{position:absolute;top:calc(23px + env(safe-area-inset-top) + var(--cb-dy,0px));right:calc(16px + var(--cb-dx,0px));width:36px;height:36px;font-size:21px;z-index:30}
@media(min-width:761px){.cb-m{display:none!important}}
/* โหมดช่าง (Studio): กระดิ่งอยู่ในแถบบนของ Studio ข้างรูปร้าน — ตัวลอยมุมขวาจะทับรูปร้าน จึงซ่อน */
body[data-mode="tech"] .cb-bell.cb-m{display:none!important}
.cb-st{width:40px;height:40px;font-size:22px}
/* หน้าตั้งค่าเปิดทับทั้งจอ (เลื่อนในตัวเอง มีขอบ 1px) — วางในหน้านั้น ชดเชยขอบให้ตรงจุดเดิมพอดี */
#v-settings>.cb-sh{top:calc(22px + env(safe-area-inset-top));right:15px}
/* ห้องแชตบนมือถือ: ปุ่มขวาสุดของแถบบน (หลังปุ่ม ⋮) */
.pill .cb-bell{order:99;margin-left:auto}
/* ห้องแชตบนคอม: ไม่มีแถบเมนู — ลอยไว้จุดเดียวกับกระดิ่งในแถบเมนูของหน้าอื่น */
.cb-fx{position:fixed;top:25px;left:calc(50% + 276px);width:34px;height:34px;font-size:19px;z-index:60}
@media(max-width:899px){.cb-fx{display:none!important}}
.cb-d{width:34px;height:34px;font-size:19px}
@media(max-width:760px){.cb-d{display:none!important}}

.nb-pop{position:absolute;z-index:1400;width:min(380px,calc(100vw - 20px));max-height:min(72vh,560px);display:flex;flex-direction:column;border-radius:20px;background:var(--surface,#fff);color:var(--ink,#09090B);
  font-family:Kanit,system-ui,sans-serif;box-shadow:0 0 0 1px var(--line,rgba(0,0,0,.08)),0 30px 60px -24px rgba(0,0,0,.45);overflow:hidden;animation:nbIn .22s cubic-bezier(.32,.72,0,1);transform-origin:100% 0}
@keyframes nbIn{from{opacity:0;transform:scale(.96) translateY(-4px)}}
.nb-h{display:flex;align-items:center;gap:8px;padding:14px 16px 10px}
.nb-h b{flex:1;font:700 16px Kanit,system-ui,sans-serif}
.nb-h button{border:0;background:none;color:var(--muted,#71717A);font:500 13px Kanit,system-ui,sans-serif;cursor:pointer}
.nb-on{display:flex;gap:10px;align-items:flex-start;margin:0 12px 8px;padding:12px;border-radius:14px;background:var(--surface-2,#F4F4F5)}
.nb-on .ti{font-size:20px;color:var(--co,#E9682A);margin-top:2px}.nb-on span{flex:1;font-size:13px;line-height:1.5;color:var(--muted,#71717A)}.nb-on span b{display:block;color:var(--ink,#09090B);font-size:14px}
.nb-on.is-on .ti{color:#22a06b}.nb-on b em{font-style:normal;font-size:11.5px;font-weight:600;color:#22a06b;margin-left:4px}
.nb-cta.off{background:none;color:var(--ink,#09090B);border:1px solid var(--line,rgba(0,0,0,.14))}
.nb-cta{height:34px;padding:0 14px;border:0;border-radius:999px;flex:none;align-self:center;cursor:pointer;background:var(--ink,#09090B);color:var(--bg,#fff);font:600 13px Kanit,system-ui,sans-serif}
.nb-cta:disabled{opacity:.6}
.nb-list{overflow:auto;padding:2px 6px 6px}
.nb-it{display:flex;gap:12px;align-items:flex-start;width:100%;padding:11px 10px;border:0;border-radius:14px;background:none;color:var(--ink,#09090B);text-align:left;font:inherit;cursor:pointer}
.nb-it:hover,.nb-it:focus-visible{background:var(--surface-2,#F4F4F5)}
.nb-ic{flex:none;display:grid;place-items:center;width:36px;height:36px;border-radius:12px;font-size:18px;background:var(--surface-2,#F4F4F5);color:var(--ink,#09090B)}
.nb-ic.ai{color:#fff;background:conic-gradient(from 200deg,#E9682A,#ec4899,#7c5cff,#E9682A)}
.nb-it>span+span{flex:1;min-width:0}.nb-it b{display:block;font-size:14px;font-weight:600;line-height:1.35}.nb-it small{display:block;margin-top:2px;font-size:12.5px;line-height:1.45;color:var(--muted,#71717A)}
.nb-it time{flex:none;font-size:11.5px;color:var(--faint,#A1A1AA);margin-top:2px}
.nb-it.new b::after{content:"";display:inline-block;width:7px;height:7px;margin-left:6px;border-radius:50%;background:var(--co,#E9682A);vertical-align:2px}
.nb-empty{padding:26px 16px 30px;text-align:center;color:var(--muted,#71717A);font-size:13.5px}.nb-empty .ti{display:block;font-size:30px;color:var(--faint,#A1A1AA);margin-bottom:6px}
.nb-f{display:flex;border-top:1px solid var(--line,rgba(0,0,0,.08))}.nb-f button{flex:1;height:46px;border:0;background:none;color:var(--ink,#09090B);font:600 13.5px Kanit,system-ui,sans-serif;cursor:pointer}.nb-f button:hover{background:var(--surface-2,#F4F4F5)}
@media(prefers-reduced-motion:reduce){.cb-bell.ding .ti,.nb-pop{animation:none}}`;
function style(){if(document.getElementById("cbCss"))return;const st=document.createElement("style");st.id="cbCss";st.textContent=CSS;(document.head||document.documentElement).appendChild(st)}

const ICON={request:"ti-file-plus",quote:"ti-file-dollar",enroute:"ti-truck",working:"ti-tool",done:"ti-checklist",cancel:"ti-circle-x",accept:"ti-circle-check",complete:"ti-circle-check",dispute:"ti-flag",msg:"ti-message-circle",ai:"ti-sparkles"};
const escH=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const go=u=>{u=u||"/";if(u[0]==="/"&&W.Nav&&Nav.owns&&Nav.owns(u))Nav.go(u);else location.href=u};
/* เตือนจดเลขไมล์ 18:00 (เปิด/ปิดที่แผงนี้) — มี LINE = ถามใน LINE พิมพ์เลขตอบได้เลย · ไม่มี = เด้งบนเครื่อง แตะแล้วใส่เลข
   คันที่จดเลขแล้ววันนั้นไม่ถาม · จำสถานะล่าสุดไว้ในเครื่อง (ผูกบัญชี) ให้แผงขึ้นทันที แล้วค่อยถามหลังบ้านอีกที */
const KMK="spire_kmRemind";
const kmGet=()=>{try{const v=JSON.parse(localStorage.getItem(KMK)||"null");return v&&v.uid===uid()?v:null}catch(e){return null}};
const kmPut=v=>{try{localStorage.setItem(KMK,JSON.stringify({uid:uid(),on:!!(v&&v.on),line:!!(v&&v.line)}))}catch(e){}};
const hasCar=()=>{try{return (JSON.parse(localStorage.getItem("spire_garage")||"[]")||[]).length>0}catch(e){return false}};
function kmRow(){
  if(!uid()||!hasCar())return "";
  const k=kmGet(),on=!!(k&&k.on);
  return `<div class="nb-on${on?" is-on":""}"><i class="ti ti-gauge"></i><span><b>${T("เตือนจดเลขไมล์ 18:00","Mileage reminder at 6 pm")}${on?` <em>${T("เปิดอยู่","On")}</em>`:""}</b>${on
    ?(k.line?T("ถามทาง LINE และแจ้งเตือนในเครื่องที่เปิดไว้ทุกเย็น · พิมพ์เลขตอบใน LINE ได้ · คันที่จดแล้ววันนั้นไม่ถาม","Asked on LINE and on enabled devices each evening · reply on LINE · cars already logged that day are skipped")
      :T("เด้งบนเครื่องทุกเย็น แตะแล้วใส่เลขได้เลย · คันที่จดแล้ววันนั้นไม่ถาม","A notification every evening — tap it to enter the reading · cars already logged that day are skipped"))
    :T("ช่วยจำเลขไมล์ทุกเย็น ระบบจะเตือนเปลี่ยนน้ำมันเครื่องและอะไหล่ได้แม่นขึ้น","A daily nudge so oil-change and parts reminders stay accurate")}</span><button type="button" class="nb-cta${on?" off":""}" data-a="${on?"kmoff":"kmon"}">${on?T("ปิด","Turn off"):T("เปิด","Turn on")}</button></div>`;
}
/* แผงรายการ · o.onJobs = ปุ่ม "งานของฉันทั้งหมด" (หน้าแรกเปิดในหน้าเดิม หน้าอื่นไป /jobs) · o.toast = ข้อความเด้งของหน้านั้น */
function panel(btn,o){
  o=o||{};style();
  const old=document.querySelector(".nb-pop");if(old){old.remove();btn.setAttribute("aria-expanded","false");return}
  const p=document.createElement("div");p.className="nb-pop";p.setAttribute("role","dialog");p.setAttribute("aria-label",T("การแจ้งเตือน","Notifications"));
  const agoT=at=>{const m=Math.round((Date.now()-at)/60000);return m<1?T("เมื่อกี้","now"):m<60?T(`${m} นาที`,`${m}m`):m<1440?T(`${Math.round(m/60)} ชม.`,`${Math.round(m/60)}h`):T(`${Math.round(m/1440)} วัน`,`${Math.round(m/1440)}d`)};
  const draw=()=>{const L=list(),pm=perm();
    p.innerHTML=`<div class="nb-h"><b>${T("การแจ้งเตือน","Notifications")}</b>${L.some(x=>!x.read)?`<button type="button" data-a="read">${T("อ่านทั้งหมด","Mark all read")}</button>`:""}</div>
      ${pm==="default"||pm==="granted"?(on=>`<div class="nb-on${on?" is-on":""}"><i class="ti ti-bell-${on?"ringing":"off"}"></i><span><b>${T("แจ้งเตือนในเครื่อง","Device notifications")}${on?` <em>${T("เปิดอยู่","On")}</em>`:""}</b>${on?T("เด้งบนเครื่องเมื่อช่างเสนอราคา รับงาน หรือ AI ตอบ แม้ไม่ได้เปิดแอป","Pops up on this device when a mechanic quotes, takes the job or the AI replies"):T("รู้ทันทีเมื่อช่างเสนอราคา รับงาน หรือ AI ตอบ แม้ไม่ได้เปิดแอป","Know right away when a mechanic quotes, takes the job or the AI replies — even with the app closed")}</span><button type="button" class="nb-cta${on?" off":""}" data-a="${on?"off":"on"}">${on?T("ปิด","Turn off"):T("เปิด","Turn on")}</button></div>`)(pushOn())
        :pm==="denied"?`<div class="nb-on"><i class="ti ti-bell-off"></i><span><b>${T("ปิดแจ้งเตือนไว้ในเบราว์เซอร์","Notifications blocked")}</b>${T("เปิดได้ที่การตั้งค่าเว็บไซต์ของเบราว์เซอร์","Allow them in your browser's site settings")}</span></div>`:""}
      ${kmRow()}
      <div class="nb-list">${L.length?L.map(x=>`<button type="button" class="nb-it${x.read?"":" new"}" data-id="${escH(x.id)}" data-u="${escH(x.url)}"><span class="nb-ic${x.kind==="ai"?" ai":""}"><i class="ti ${ICON[x.kind]||"ti-bell"}"></i></span><span><b class="nt">${escH(x.title)}</b>${x.body?`<small class="nt">${escH(x.body)}</small>`:""}</span><time>${agoT(x.at)}</time></button>`).join("")
        :`<div class="nb-empty"><i class="ti ti-bell"></i>${T("ยังไม่มีการแจ้งเตือน — เมื่อช่างเสนอราคา รับงาน หรือส่งข้อความ จะขึ้นที่นี่","Nothing yet — quotes, accepted jobs and messages show up here")}</div>`}</div>
      <div class="nb-f"><button type="button" data-a="jobs">${T("งานของฉันทั้งหมด","All my jobs")}</button></div>`;
    p.querySelectorAll("[data-id]").forEach(x=>x.onclick=()=>{read(x.dataset.id);close();go(x.dataset.u)});
    const r=p.querySelector('[data-a="read"]');if(r)r.onclick=()=>{read();draw()};
    const on_=p.querySelector('[data-a="on"]');if(on_)on_.onclick=async()=>{on_.disabled=true;const st=await enable();
      if(st==="granted"&&o.toast)o.toast(T("เปิดแจ้งเตือนในเครื่องแล้ว","Device notifications are on"));draw()};
    const off_=p.querySelector('[data-a="off"]');if(off_)off_.onclick=()=>{off_.disabled=true;disable();
      if(o.toast)o.toast(T("ปิดแจ้งเตือนในเครื่องแล้ว — ยังดูรายการได้ที่กระดิ่งนี้","Device notifications off — still listed under this bell"));draw()};
    p.querySelector('[data-a="jobs"]').onclick=()=>{close();o.onJobs?o.onJobs():go("/jobs")};
    const km=p.querySelector('[data-a^="km"]');if(km)km.onclick=async()=>{km.disabled=true;const want=km.dataset.a==="kmon";
      try{
        /* ไม่มี LINE → ต้องเด้งบนเครื่องได้ ขอสิทธิ์ตอนกดนี้เลย (เบราว์เซอร์ให้ขอได้เฉพาะตอนผู้ใช้กด) */
        if(want){const s=await get("/api/km/remind").catch(()=>null);
          if(!(s&&s.line)&&!pushOn()&&await enable()!=="granted"){if(o.toast)o.toast(T("เปิดแจ้งเตือนในเครื่องหรือเชื่อม LINE ก่อน แล้วค่อยเปิดเตือนเลขไมล์","Allow device notifications or link LINE first"));draw();return}}
        const r=await post("/api/km/remind",{on:want});kmPut(r);
        if(o.toast)o.toast(want?(r.line?T("เปิดแล้ว — ทุก 18:00 จะถามเลขไมล์ทาง LINE","On — we'll ask on LINE at 6 pm"):T("เปิดแล้ว — ทุก 18:00 จะเด้งบนเครื่อง","On — a notification at 6 pm")):T("ปิดเตือนจดเลขไมล์แล้ว","Mileage reminder off"));
      }catch(e){if(o.toast)o.toast(T("ตั้งค่าไม่สำเร็จ ลองใหม่อีกครั้ง","Couldn't change that — try again"))}
      draw()};
  };
  draw();document.body.appendChild(p);btn.setAttribute("aria-expanded","true");
  /* สถานะจริงจากหลังบ้าน (อีกเครื่อง/LINE อาจเปิดปิดไว้) — ต่างจากที่จำไว้ค่อยวาดใหม่ */
  if(uid()&&hasCar())get("/api/km/remind").then(r=>{const k=kmGet();kmPut(r);if(p.isConnected&&(!k||k.on!==!!r.on||k.line!==!!r.line))draw()}).catch(()=>{});
  const rc=btn.getBoundingClientRect();p.style.top=(rc.bottom+8+scrollY)+"px";p.style.left=Math.max(10,Math.min(rc.right-p.offsetWidth+scrollX,innerWidth-p.offsetWidth-10))+"px";
  const close=()=>{p.remove();btn.setAttribute("aria-expanded","false");removeEventListener("pointerdown",off,true);document.removeEventListener("keydown",k)};
  const off=e=>{if(!p.contains(e.target)&&!btn.contains(e.target))close()};const k=e=>{if(e.key==="Escape"){close();btn.focus()}};
  setTimeout(()=>{addEventListener("pointerdown",off,true);document.addEventListener("keydown",k)},0);
  setTimeout(()=>{const n=p.querySelector(".nb-it");(n||p.querySelector("button")).focus()},40);
}

/* ── ปุ่มกระดิ่งของหน้าอื่น (หน้าแรกมีของตัวเอง) ── */
const BTNS=[];
function mkBtn(cls){
  const b=document.createElement("button");b.type="button";b.className="cb-bell "+cls;b.hidden=true;
  b.innerHTML='<i class="ti ti-bell"></i><em hidden></em>';return wire(b);
}
function wire(b){
  b.setAttribute("aria-haspopup","dialog");b.setAttribute("aria-expanded","false");b.setAttribute("aria-label",T("การแจ้งเตือน","Notifications"));
  b.onclick=()=>panel(b);BTNS.push(b);return b;
}
function paint(){
  let hint=false;try{hint=localStorage.getItem("cendon_signed")==="1"}catch(e){}
  const n=unread(),me=!!uid()||hint;
  for(let i=BTNS.length-1;i>=0;i--)if(!BTNS[i].isConnected)BTNS.splice(i,1);
  BTNS.forEach(b=>{const e=b.querySelector("em");b.hidden=!me;e.hidden=!n;e.textContent=n>9?"9+":n||"";
    b.setAttribute("aria-label",n?T(`การแจ้งเตือน ยังไม่อ่าน ${n}`,`Notifications, ${n} unread`):T("การแจ้งเตือน","Notifications"))});
}
function ding(){BTNS.forEach(b=>{b.classList.remove("ding");void b.offsetWidth;b.classList.add("ding")})}
function mount(){
  if(W.__cbMounted)return;W.__cbMounted=1;
  style();
  /* คอม: แถบเมนูบน ข้างรูปโปรไฟล์ · หน้าที่วางกระดิ่งไว้ในมาร์กอัปแล้ว (เห็นตั้งแต่เฟรมแรก) → รับช่วงปุ่มนั้น ไม่สร้างใหม่
     เดิมสร้างหลังโหลดสคริปต์ กระดิ่งจึงหายแวบแล้วโผล่ทุกครั้งที่เปลี่ยนหน้าบนคอม */
  const nr=document.querySelector(".navwrap .nav-right");
  if(nr){const own=nr.querySelector(":scope>.cb-bell");
    if(own)wire(own);else{const b=mkBtn("cb-d");const av=nr.querySelector("#avatarBtn");nr.insertBefore(b,av||null)}}
  const chat=!!document.querySelector("header.pill");
  /* มือถือ (ทุกหน้ายกเว้นห้องแชต): บนสุดของหน้า มุมขวา · หน้าที่เลื่อนในกล่องของตัวเอง (การาจ นิตยสาร ร้านค้า)
     ต้องอยู่ในกล่องนั้น ไม่งั้นเนื้อหาเลื่อนลอดใต้กระดิ่ง · ชดเชยขอบกล่องให้ตรงจุดเดียวกับหน้าแรกพอดี */
  /* หน้าที่วางกระดิ่งมือถือไว้ในมาร์กอัปแล้ว (การาจ นิตยสาร ร้านค้า) → รับช่วงปุ่มนั้น เห็นตั้งแต่เฟรมแรก */
  const pre=chat?null:document.querySelector(".cb-bell.cb-m.cb-pre");
  const page=chat?null:pre?wire(pre):mkBtn("cb-m");if(page&&!pre)document.body.appendChild(page);
  const home=()=>{if(!page)return;
    const sc=document.querySelector(".view.active>.scroll")||document.querySelector(".view.active .scroll");
    const host=sc||document.body;
    if(page.parentNode!==host)host.appendChild(page);
    /* ให้กล่องเลื่อนเป็นจุดอ้างอิงของกระดิ่ง กระดิ่งจะเลื่อนไปกับเนื้อหา (ในกล่องนี้ไม่มีอะไรอื่นอ้างอิงตำแหน่งกับกล่องอยู่แล้ว) */
    if(sc&&getComputedStyle(sc).position==="static")sc.style.position="relative";
    if(sc){const r=sc.getBoundingClientRect();page.style.setProperty("--cb-dy",(-r.top-sc.clientTop)+"px");page.style.setProperty("--cb-dx",(r.left+sc.clientLeft+sc.clientWidth-innerWidth)+"px")}
    else{page.style.removeProperty("--cb-dy");page.style.removeProperty("--cb-dx")}};
  home();addEventListener("resize",home);
  /* ห้องแชตบนคอม: จุดเดียวกับในแถบเมนูของหน้าอื่น */
  /* Desktop chat has no floating notification bell. Mobile retains the header control. */
  /* ห้องแชตบนมือถือ: ปุ่มขวาสุดของแถบบน (ปุ่ม ⋮ ที่ valet.js สร้างทีหลัง) · หน้าตั้งค่าเปิดทับทั้งจอ → ใส่ไว้ในหน้าตั้งค่าด้วย
     แถบพวกนี้ถูกวาดใหม่ได้ → คอยใส่กลับทุกครั้งที่หายไป (เช็กเบา ๆ เฟรมละครั้ง) */
  let q=0;
  const put=()=>{q=0;
    const at=(host,cls)=>{if(!host)return;const own=host.querySelector(":scope>.cb-bell");
      /* ปุ่มที่หน้าเว็บวางไว้แล้ว (เห็นตั้งแต่เฟรมแรก) → รับช่วง · ไม่มี → สร้างใหม่ */
      if(own){if(!BTNS.includes(own)){wire(own);paint()}}else{host.appendChild(mkBtn(cls));paint()}};
    /* ใส่ในแถบทันทีไม่ต้องรอปุ่ม ⋮ — order:99 ทำให้อยู่ขวาสุดเสมอ */
    if(chat)at(document.querySelector("header.pill"),"p-btn");
    else{at(document.getElementById("v-settings"),"cb-m cb-sh");home()}
    const st=document.querySelector(".stu-top");
    if(st&&!st.querySelector(":scope>.cb-bell")){st.insertBefore(mkBtn("cb-st"),st.querySelector(":scope>.stu-me"));paint()}};
  put();new MutationObserver(()=>{if(!q)q=requestAnimationFrame(put)}).observe(document.body,chat?{childList:true,subtree:true}:{childList:true,subtree:true,attributes:true,attributeFilter:["class"]});
  paint();on(paint);
  poll();
}
/* หน้าอื่นก็ต้องรู้ทันว่าช่างตอบ: ถามหลังบ้านเบา ๆ ทุก 25 วิ (ชีพจร) มีอะไรเปลี่ยนค่อยดึงรายการใบงาน */
let PV="",PT=0;
async function tick(){
  if(W.CendonBellOwnPoll){paint();return}
  const me=uid();
  if(me&&!document.hidden&&(W.spireAuth||W.auth)&&(W.spireAuth||W.auth).currentUser){
    try{const r=await get("/api/tech/pulse");
      if(r&&r.v&&r.v!==PV){PV=r.v;const d=await get("/api/tech/jobs");const evs=jobEvents(d&&d.jobs||[],me);
        if(evs.length){evs.forEach(e=>add(e,{fallback:true}));ding()}}}catch(e){}
  }
  paint();
}
function poll(){clearTimeout(PT);PT=setTimeout(async()=>{await tick();poll()},PV?25000:2500)}
document.addEventListener("visibilitychange",()=>{if(!document.hidden&&BTNS.length){PV="";tick()}});
/* แท็บอื่น (เช่น ห้องแชต) เพิ่มรายการ → กระดิ่งหน้านี้อัปเดตด้วย */
W.addEventListener("storage",e=>{if(e.key===KEY)subs.forEach(f=>{try{f()}catch(x){}})});

/* AI ตอบเสร็จตอนผู้ใช้ไม่ได้ดูห้องแชต → แจ้งบนเครื่อง + เก็บในกระดิ่ง */
function ai(text,valet){
  if(!document.hidden)return;
  const t=String(text||"").replace(/\[\[(ACT|ASK|NEXT)\]\][\s\S]*?(\[\[\/\1\]\]|$)/g,"").replace(/\[\[[\s\S]*?\]\]/g,"").replace(/[#*_`>]/g,"").replace(/\s+/g," ").trim();
  add({kind:"ai",title:valet?T("Cendon Valet เตรียมการ์ดให้แล้ว — รอคุณยืนยัน","Cendon Valet has a card ready — waiting for you"):T("Cendon AI ตอบแล้ว","Cendon AI replied"),
    body:t.slice(0,140),url:location.pathname+location.search,tag:"cendon-ai"},{system:true});
}
W.CendonBell={add,list,unread,read,clear,enable,disable,perm,pushOn,pushSub,on,setApi,ai,sys,jobEvents,panel,style,paint,ding,buttons:()=>BTNS.slice()};
/* Completion collection follows the user across every app page, not just Chat. */
if(!W.CendonChatJobs&&!document.querySelector('script[src*="chat-jobs.js"]')){const script=document.createElement('script');script.src='/chat-jobs.js?v=2';script.defer=true;document.head.append(script)}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",mount);else mount();
})(window);
