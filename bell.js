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
const KEY="spire_inbox",MAX=40,MAX_CLEARED=250,CLEARED_TTL=30*86400000,subs=new Set();
let io={get:null,post:null},opened=null;
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
function inbox(){
  try{const d=JSON.parse(localStorage.getItem(KEY)||"null");if(d?.uid===uid())return {
    items:Array.isArray(d.items)?d.items.filter(x=>x&&typeof x==='object').slice(0,MAX):[],
    cleared:Array.isArray(d.cleared)?d.cleared.filter(x=>typeof x?.id==='string'&&x.id.length<=240&&Number.isFinite(x.at)&&x.at>Date.now()-CLEARED_TTL).slice(0,MAX_CLEARED):[]
  }}catch(e){}
  return {items:[],cleared:[]};
}
const load=()=>inbox().items;
function save(items,cleared=inbox().cleared){try{localStorage.setItem(KEY,JSON.stringify({uid:uid(),items:items.slice(0,MAX),cleared:cleared.slice(0,MAX_CLEARED)}))}catch(e){}subs.forEach(f=>{try{f()}catch(e){}})}
const supported=()=>"Notification" in W&&"serviceWorker" in navigator;
const perm=()=>supported()?Notification.permission:"unsupported";
/* แจ้งเตือนในเครื่อง "เปิด/ปิด" = ตัวเลือกของผู้ใช้ (เก็บในเครื่อง) แยกจาก "สมัคร Push กับเซิร์ฟเวอร์แล้ว"
   เดิมใช้ค่าเดียวกัน — หลังบ้านไม่มีกุญแจ Push ค่าไม่เคยถูกบันทึก ปุ่ม "เปิด" จึงค้างตลอดแม้เปิดแล้ว
   ยังไม่เคยเลือก + อนุญาตในเบราว์เซอร์แล้ว = ถือว่าเปิด (ผู้ใช้เดิม) */
const PREF="spire_notifOn",SUB="spire_pushSub",PUSH_OWNER="spire_pushOwner";
const pref=()=>{try{const v=localStorage.getItem(PREF);return v==null?perm()==="granted":JSON.parse(v)===true}catch(e){return false}};
const pushOwner=()=>{try{return localStorage.getItem(PUSH_OWNER)===uid()}catch{return false}};
const pushOn=()=>perm()==="granted"&&pref()&&pushOwner();
const pushSub=()=>{try{return pushOwner()&&localStorage.getItem(SUB)==="true"}catch(e){return false}};

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
  const state=inbox(),items=state.items,id=ev.id||(ev.tag||"n")+":"+Date.now();
  if(items.some(x=>x.id===id)||state.cleared.some(x=>x.id===id))return null;
  const it={id,kind:ev.kind||"info",title:String(ev.title).slice(0,120),body:String(ev.body||"").slice(0,200),url:ev.url||"/",tag:ev.tag||"cendon",at:Date.now(),read:false};
  items.unshift(it);save(items);
  const o=opt||{};
  if(document.hidden&&(o.system||(o.fallback&&!pushSub())))sys(it);
  return it;
}
const list=()=>load();
const unread=()=>load().filter(x=>!x.read).length;
function read(id){const items=load();let changed=false;items.forEach(x=>{if((!id||x.id===id)&&!x.read){x.read=true;changed=true}});if(changed)save(items)}
function clear(){
  const {items,cleared}=inbox();if(!items.length)return;
  const at=Date.now(),ids=new Set(items.map(x=>x.id));
  const receipts=items.filter(x=>typeof x.id==='string'&&x.id.length<=240).map(x=>({id:x.id,at}));
  save([],[...receipts,...cleared.filter(x=>!ids.has(x.id))]);
}
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
  const owner=(W.spireAuth||W.auth)?.currentUser?.uid;if(!owner||!pushOwner())return;
  const current=()=>owner===(W.spireAuth||W.auth)?.currentUser?.uid&&pushOn();
  try{
    const reg=await swReady();if(!reg||!reg.pushManager||!current())return;
    const kj=await get("/api/push/key").catch(()=>null);
    if(kj&&kj.enabled&&kj.key&&current()){
      let sub=await reg.pushManager.getSubscription();
      if(!sub)sub=await reg.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:u8(kj.key)});
      if(!current())return;   // Disabled or account changed while waiting
      const saved=await post("/api/push/subscribe",{sub:sub.toJSON(),cars:pushCars(),lang:W.lang||"th"});
      if(!saved?.ok||saved.warnings?.length)throw Error("Push subscription not acknowledged");
      if(current())localStorage.setItem(SUB,"true");
    }
  }catch(e){}
}
/* เปิดแจ้งเตือนในเครื่อง: ขอสิทธิ์ (ต้องมาจากการกดของผู้ใช้) → ปุ่มเปลี่ยนเป็น "ปิด" ทันที · สมัคร Push กับหลังบ้านทำเบื้องหลัง */
async function enable(){
  if(!supported())return "unsupported";
  let p=Notification.permission;
  if(p==="default")p=await Notification.requestPermission();
  if(p!=="granted")return p;
  try{localStorage.setItem(PUSH_OWNER,uid());localStorage.setItem(PREF,"true")}catch(e){}
  subscribeBg();
  subs.forEach(f=>{try{f()}catch(e){}});
  return "granted";
}
/* ปิดแจ้งเตือนในเครื่อง: ยกเลิก Push ที่เซิร์ฟเวอร์และในเครื่อง · รายการในกระดิ่งยังขึ้นตามปกติ (แค่ไม่เด้งบนเครื่อง) */
async function disable(){
  try{localStorage.setItem(PREF,"false");localStorage.removeItem(SUB);localStorage.removeItem(PUSH_OWNER)}catch(e){}
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
  (jobs||[]).forEach(j=>{cur[j.id]=[j.status,j.unread||0,j.quoteAt||0,j.total??null]});
  const put=()=>{try{localStorage.setItem(K,JSON.stringify({uid:me,j:cur}))}catch(e){}};
  const old=snap?.uid===me?snap.j||{}:{},evs=[];
  for(const j of jobs||[]){
    if(j.side==="admin")continue;
    const o=old[j.id],tech=j.side==="technician",shop=j.techName||T("ช่าง","The mechanic"),car=j.car||"",url="/jobs/"+encodeURIComponent(j.id),tag="cendon-job-"+j.id;
    const ev=(kind,title,body,u)=>evs.push({id:j.id+":"+kind+":"+(j.updatedAt||j.createdAt||0),kind,title,body:body??car,url:u||url,tag});
    if(!o){
      if(!tech&&j.status==="quoted")ev("quote",T(`${shop} เสนอราคา`,`${shop} sent a quote`)+(j.total?` ฿${money(j.total)}`:""));
      else if(tech&&j.status==="requested"&&snap?.uid===me)ev("request",T("คำขอใหม่: ","New request: ")+car,j.symptom);
      continue;
    }
    if(!tech&&j.status==="quoted"&&o[0]==="quoted"&&o.length>=4&&(o[2]!==cur[j.id][2]||o[3]!==cur[j.id][3]))ev("quote",T(`${shop} ปรับราคาเสนอ`,`${shop} updated the quote`)+(j.total?` ฿${money(j.total)}`:""));
    if(o[0]!==j.status){
      if(!tech){
        if(j.status==="quoted")ev("quote",T(`${shop} เสนอราคา`,`${shop} sent a quote`)+(j.total?` ฿${money(j.total)}`:""));
        else if(j.status==="enroute")ev("enroute",T(`${shop} กำลังมาหาคุณ`,`${shop} is on the way`));
        else if(j.status==="working")ev("working",T(`${shop} เริ่มซ่อมแล้ว`,`${shop} started the repair`));
        else if(j.status==="done")ev("done",T(`${shop} ซ่อมเสร็จ — ตรวจแล้วยืนยันงาน`,`${shop} finished — check and confirm`));
        /* ไม่แจ้งเรื่องที่ตัวเองเพิ่งกด (ลูกค้ายกเลิกเอง) */
        else if(j.status==="cancelled"&&j.cancelledBy!=="customer")ev("cancel",cancelTitle(j,car));
      }else{
        if(j.status==="accepted")ev("accept",T(`ลูกค้ายืนยันราคา: ${car}`,`Customer accepted: ${car}`));
        else if(j.status==="completed")ev("complete",T(`ลูกค้ายืนยันงานเสร็จ: ${car}`,`Customer confirmed: ${car}`));
        /* ช่างกดยกเลิกเอง ไม่ต้องเด้งแจ้งเตือนกลับมาหาตัวเอง (เดิมเด้ง และรุ่นก่อน 23 ต.ค. ยังเขียนว่า "ลูกค้ายกเลิก") */
        else if(j.status==="cancelled"&&!j.expired&&j.cancelledBy!=="technician")ev("cancel",cancelTitle(j,car));
        else if(j.status==="disputed")ev("dispute",T(`มีการแจ้งปัญหา: ${car}`,`Problem reported: ${car}`));
      }
    }
    if((j.unread||0)>(o[1]||0))ev("msg",T("ข้อความใหม่ — ","New message — ")+(tech?car:shop),tech?"":car,url+"/chat");
  }
  put();return evs;
}

/* ── งานของฉันอยู่ในกระดิ่ง ──
   แผงเดียวรวม: งานที่ต้องทำตอนนี้ (เรื่องราคามาก่อน: ได้ราคา · เทียบราคาหลายร้าน · ข้อเสนอในประกาศ · คำขอราคาใหม่ของร้าน)
   → งานที่กำลังดำเนินอยู่ → การแจ้งเตือนล่าสุด · งานที่จบแล้วดูที่ "งานทั้งหมด"
   จำรายการล่าสุดในเครื่อง (ผูกบัญชี · เปลี่ยนบัญชีล้างเอง) ให้แผงขึ้นทันที แล้วค่อยถามหลังบ้านใหม่
   เก็บแค่ที่จอนี้ใช้: สถานะ รถ ชื่อร้าน ยอด — ไม่มีที่อยู่ เบอร์ หรืออาการ */
const JK="spire_bell_jobs";
let JOBS_MEM=null,JOBS_REQ=null;
const slimJob=j=>({id:String(j.id),side:j.side,status:j.status,needsMe:!!j.needsMe,unread:j.unread||0,car:String(j.car||"").slice(0,60),
  techName:String(j.techName||"").slice(0,60),total:j.total||0,group:j.group||null,urgent:!!j.urgent,expired:!!j.expired,at:j.updatedAt||j.createdAt||0});
const slimPost=p=>({id:String(p.id),status:p.status,car:String(p.car||"").slice(0,60),offers:p.offers||0,lowest:p.lowest||null,urgent:!!p.urgent,at:p.createdAt||0});
function jobsGet(){
  const me=uid();if(!me)return null;
  if(JOBS_MEM&&JOBS_MEM.uid===me)return JOBS_MEM;
  try{const d=JSON.parse(localStorage.getItem(JK)||"null");if(d&&d.uid===me&&Array.isArray(d.jobs))return JOBS_MEM=d}catch(e){}
  return null;
}
/* หน้าแรกส่งรายการที่ดึงมาแล้วให้ · หน้าอื่นกระดิ่งดึงเอง — null = ไม่เปลี่ยนส่วนนั้น */
function setJobs(jobs,posts){
  const me=uid();if(!me)return;const prev=jobsGet();
  const d={uid:me,at:Date.now(),jobs:Array.isArray(jobs)?jobs.filter(j=>j&&j.id).map(slimJob):prev?prev.jobs:[],posts:Array.isArray(posts)?posts.filter(x=>x&&x.id).map(slimPost):prev?prev.posts:[]};
  JOBS_MEM=d;try{localStorage.setItem(JK,JSON.stringify(d))}catch(e){}
  subs.forEach(f=>{try{f()}catch(e){}});
}
function fetchJobs(){
  const me=uid();if(!me)return Promise.resolve();
  if(JOBS_REQ&&JOBS_REQ.uid===me)return JOBS_REQ.p;
  const p=Promise.allSettled([get("/api/tech/jobs"),get("/api/tech/posts")]).then(([j,q])=>{if(uid()!==me)return;
    setJobs(j.status==="fulfilled"&&Array.isArray(j.value?.jobs)?j.value.jobs:null,q.status==="fulfilled"&&Array.isArray(q.value?.posts)?q.value.posts:null)}).finally(()=>{if(JOBS_REQ&&JOBS_REQ.p===p)JOBS_REQ=null});
  JOBS_REQ={uid:me,p};return p;
}
/* จัดกลุ่ม: act = ต้องทำ (r 0 เรื่องราคา · 1 งานที่รอเรา · 2 ข้อความใหม่) · live = กำลังดำเนินอยู่ */
function hub(d){
  const act=[],live=[],L=(d&&d.jobs||[]).filter(j=>j.side!=="admin"&&!j.expired&&!["completed","cancelled"].includes(j.status)),url=j=>"/jobs/"+encodeURIComponent(j.id);
  const shop=j=>j.techName||T("ช่าง","Mechanic"),baht=n=>"฿"+money(n);
  /* ขอราคาหลายร้านพร้อมกัน → แถวเดียว "เทียบราคา" จนกว่าจะเลือกร้าน */
  const G={};L.forEach(j=>{if(j.group&&j.side==="customer"&&["requested","quoted"].includes(j.status))(G[j.group]=G[j.group]||[]).push(j)});
  const grouped=new Set();
  for(const [g,list] of Object.entries(G)){if(list.length<2)continue;list.forEach(j=>grouped.add(j.id));
    const q=list.filter(j=>j.status==="quoted"),lo=q.length?Math.min(...q.map(j=>j.total||Infinity)):0,at=Math.max(...list.map(j=>j.at||0));
    const row={id:"g:"+g,ic:"ti-scale",url:"/compare/"+encodeURIComponent(g),at,car:list[0].car,
      title:q.length?T(`ได้ราคาแล้ว ${q.length} จาก ${list.length} ร้าน`,`${q.length} of ${list.length} quotes in`):T(`ขอราคา ${list.length} ร้าน`,`Quotes from ${list.length} shops`),
      sub:[list[0].car,q.length&&lo<Infinity?T(`ต่ำสุด ${baht(lo)}`,`lowest ${baht(lo)}`):T("รอร้านส่งราคา","waiting for quotes")].filter(Boolean).join(" · ")};
    if(q.length)act.push({...row,r:0,cta:T("เทียบราคา","Compare")});else live.push({...row,chip:T("รอราคา","Waiting")});
  }
  for(const j of L){
    if(grouped.has(j.id))continue;
    const cust=j.side==="customer"||j.side==="both",tech=j.side==="technician"||j.side==="both",s=j.status;
    const base={id:j.id,url:url(j),at:j.at,unread:j.unread,car:j.car};
    if(cust&&s==="quoted"){act.push({...base,r:0,ic:"ti-file-dollar",title:T(`${shop(j)} เสนอราคา`,`${shop(j)} sent a quote`)+(j.total?" "+baht(j.total):""),sub:j.car,cta:T("ดูราคา","Review")});continue}
    if(tech&&s==="requested"){act.push({...base,r:0,ic:j.urgent?"ti-urgent":"ti-file-plus",hot:j.urgent,title:j.urgent?T("งานด่วน: ลูกค้ารถเสียตอนนี้","Urgent: a customer is broken down"):T("คำขอราคาใหม่","New quote request"),sub:j.car,cta:T("เสนอราคา","Quote")});continue}
    if(cust&&s==="done"){act.push({...base,r:1,ic:"ti-checklist",title:T(`${shop(j)} ซ่อมเสร็จแล้ว`,`${shop(j)} finished`),sub:T(`${j.car} · ตรวจแล้วยืนยันงาน`,`${j.car} · check and confirm`),cta:T("ตรวจงาน","Check")});continue}
    if(tech&&s==="accepted"){act.push({...base,r:1,ic:"ti-calendar-check",title:T("ลูกค้ายืนยันราคาแล้ว","Customer accepted"),sub:j.car,cta:T("เปิดงาน","Open")});continue}
    const LIVE={requested:[T("รอราคา","Waiting"),"ti-hourglass",T(`ขอราคาจาก ${shop(j)}`,`Asked ${shop(j)} for a quote`)],
      quoted:[T("รอลูกค้า","Awaiting customer"),"ti-file-dollar",T("เสนอราคาแล้ว","Quote sent")+(j.total?" "+baht(j.total):"")],
      accepted:[T("นัดแล้ว","Booked"),"ti-calendar-check",cust?shop(j):T("นัดกับลูกค้าแล้ว","Booked with the customer")],
      enroute:[T("กำลังมา","On the way"),"ti-truck",cust?T(`${shop(j)} กำลังมาหาคุณ`,`${shop(j)} is on the way`):T("กำลังไปหาลูกค้า","Driving to the customer")],
      working:[T("กำลังซ่อม","Repairing"),"ti-tool",cust?T(`${shop(j)} กำลังซ่อม`,`${shop(j)} is repairing`):T("กำลังซ่อม","Repair in progress")],
      done:[T("รอตรวจ","Awaiting check"),"ti-checklist",T("ส่งงานแล้ว รอลูกค้าตรวจ","Handed over — awaiting the customer")],
      disputed:[T("แจ้งปัญหา","Reported"),"ti-flag",T("ทีมงานกำลังดูเรื่องนี้","Our team is looking into it")]}[s];
    if(!LIVE)continue;
    const row={...base,ic:LIVE[1],title:LIVE[2],sub:j.car,chip:LIVE[0],live:s==="enroute"};
    if((j.unread||0)>0)act.push({...row,r:2,ic:"ti-message-circle",title:T("ข้อความใหม่ — ","New message — ")+(cust?shop(j):j.car),sub:j.car,cta:T("อ่าน","Read"),url:url(j)+"/chat"});
    else if(tech&&["enroute","working"].includes(s))act.push({...row,r:1,cta:T("เปิดงาน","Open")});
    else live.push(row);
  }
  /* ประกาศหาช่าง: มีข้อเสนอแล้ว = เรื่องราคา (บนสุด) · ยังไม่มี = รออยู่ */
  for(const x of (d&&d.posts||[]).filter(x=>x.status==="open")){
    const row={id:"p:"+x.id,ic:"ti-speakerphone",url:"/post/"+encodeURIComponent(x.id),at:x.at,car:x.car};
    if(x.offers>0)act.push({...row,r:0,title:T(`ประกาศหาช่าง: ได้ข้อเสนอ ${x.offers} ร้าน`,`Job post offers: ${x.offers}`),sub:[x.car,x.lowest?T(`ต่ำสุด ${baht(x.lowest)}`,`lowest ${baht(x.lowest)}`):""].filter(Boolean).join(" · "),cta:T("ดูข้อเสนอ","View")});
    else live.push({...row,title:x.urgent?T("ประกาศงานด่วนแล้ว","Urgent post is live"):T("ประกาศหาช่างแล้ว","Job post is live"),sub:x.car,chip:T("รอข้อเสนอ","Waiting")});
  }
  act.sort((a,b)=>a.r-b.r||(b.at||0)-(a.at||0));live.sort((a,b)=>(b.live-a.live)||(b.at||0)-(a.at||0));
  return {act,live};
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

.nb-pop{position:absolute;z-index:1400;width:min(400px,calc(100vw - 20px));max-height:min(80vh,640px);display:flex;flex-direction:column;border-radius:20px;background:var(--surface,#fff);color:var(--ink,#09090B);
  font-family:Kanit,system-ui,sans-serif;box-shadow:0 0 0 1px var(--line,rgba(0,0,0,.08)),0 30px 60px -24px rgba(0,0,0,.45);overflow:hidden;animation:nbIn .22s cubic-bezier(.32,.72,0,1);transform-origin:100% 0}
@keyframes nbIn{from{opacity:0;transform:scale(.96) translateY(-4px)}}
.nb-h{display:flex;align-items:center;gap:8px;padding:14px 16px 10px}
.nb-h b{flex:1;font:700 16px Kanit,system-ui,sans-serif}
.nb-h button{border:0;background:none;color:var(--muted,#71717A);font:500 13px Kanit,system-ui,sans-serif;cursor:pointer}
.nb-h button{min-height:40px;padding:6px 8px}.nb-h button:disabled{opacity:.4;cursor:default}.nb-h button:focus-visible{outline:2px solid var(--co,#E9682A);outline-offset:1px;border-radius:8px}
.nb-on{display:flex;gap:10px;align-items:flex-start;margin:0 12px 8px;padding:12px;border-radius:14px;background:var(--surface-2,#F4F4F5)}
.nb-on .ti{font-size:20px;color:var(--co,#E9682A);margin-top:2px}.nb-on span{flex:1;font-size:13px;line-height:1.5;color:var(--muted,#71717A)}.nb-on span b{display:block;color:var(--ink,#09090B);font-size:14px}
.nb-on.is-on .ti{color:#22a06b}.nb-on b em{font-style:normal;font-size:11.5px;font-weight:600;color:#22a06b;margin-left:4px}
.nb-cta.off{background:none;color:var(--ink,#09090B);border:1px solid var(--line,rgba(0,0,0,.14))}
.nb-cta{height:34px;padding:0 14px;border:0;border-radius:999px;flex:none;align-self:center;cursor:pointer;background:var(--ink,#09090B);color:var(--bg,#fff);font:600 13px Kanit,system-ui,sans-serif}
.nb-cta:disabled{opacity:.6}
.nb-body{overflow:auto;overscroll-behavior:contain;padding:0 6px 8px}
.nb-list{padding:0}
.nb-h .nb-gear{width:40px;height:40px;padding:0;border-radius:50%;display:grid;place-items:center;font-size:19px;color:var(--muted,#71717A)}
.nb-h .nb-gear:hover{background:var(--surface-2,#F4F4F5);color:var(--ink,#09090B)}
.nb-sec{display:flex;align-items:center;gap:8px;margin:12px 10px 6px;font:600 12px Kanit,system-ui,sans-serif;letter-spacing:.02em;color:var(--muted,#71717A)}
.nb-sec em{font-style:normal;min-width:20px;height:20px;padding:0 6px;border-radius:999px;display:grid;place-items:center;background:var(--co,#E9682A);color:#fff;font-size:11px}
.nb-sec button{margin-left:auto;border:0;background:none;color:var(--muted,#71717A);font:500 12.5px Kanit,system-ui,sans-serif;cursor:pointer;min-height:32px;padding:4px 6px;border-radius:8px}
.nb-sec button:disabled{opacity:.4;cursor:default}
.nb-job{position:relative;display:flex;gap:11px;align-items:center;width:100%;padding:10px;border:0;border-radius:16px;background:none;color:var(--ink,#09090B);text-align:left;font:inherit;cursor:pointer}
.nb-job+.nb-job{margin-top:2px}
.nb-job:hover,.nb-job:focus-visible{background:var(--surface-2,#F4F4F5)}
.nb-job.r0{background:color-mix(in srgb,var(--co,#E9682A) 9%,transparent)}
.nb-job.r0:hover,.nb-job.r0:focus-visible{background:color-mix(in srgb,var(--co,#E9682A) 15%,transparent)}
.nb-job.hot{background:color-mix(in srgb,#DC2626 10%,transparent)}
.nb-job .nb-ic{position:relative}
.nb-job.r0 .nb-ic{background:var(--co,#E9682A);color:#fff}
.nb-job.hot .nb-ic{background:#DC2626;color:#fff}
.nb-job .nb-ic i.lv{position:absolute;right:-2px;top:-2px;width:10px;height:10px;border-radius:50%;background:#22C55E;border:2px solid var(--surface,#fff)}
.nb-jt{flex:1;min-width:0}.nb-jt b{display:block;font-size:14px;font-weight:600;line-height:1.35;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.nb-jt small{display:block;margin-top:1px;font-size:12.5px;color:var(--muted,#71717A);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.nb-go{flex:none;height:30px;padding:0 12px;border-radius:999px;display:grid;place-items:center;background:var(--ink,#09090B);color:var(--bg,#fff);font:600 12.5px Kanit,system-ui,sans-serif}
.nb-chip{flex:none;padding:3px 9px;border-radius:999px;background:var(--surface-2,#F4F4F5);color:var(--muted,#71717A);font-size:11.5px;font-weight:500;white-space:nowrap}
.nb-un{position:absolute;left:34px;top:6px;min-width:17px;height:17px;padding:0 4px;border-radius:999px;display:grid;place-items:center;background:#DC2626;color:#fff;font:700 10px/1 Kanit,system-ui,sans-serif;border:2px solid var(--surface,#fff)}
.nb-tip{position:relative;display:flex;gap:10px;align-items:center;margin:0 6px 6px;padding:12px 12px 12px 14px;border-radius:16px;background:var(--surface-2,#F4F4F5)}
.nb-tip>.ti{flex:none;font-size:20px;color:var(--co,#E9682A)}
.nb-tip span{flex:1;min-width:0;font-size:12.5px;line-height:1.45;color:var(--muted,#71717A)}.nb-tip span b{display:block;color:var(--ink,#09090B);font-size:13.5px;font-weight:600}
.nb-tip .nb-x{flex:none;width:30px;height:30px;border:0;border-radius:50%;background:none;color:var(--faint,#A1A1AA);display:grid;place-items:center;cursor:pointer;font-size:15px}
.nb-tip .nb-x:hover{background:color-mix(in srgb,var(--ink,#09090B) 8%,transparent);color:var(--ink,#09090B)}
.nb-it{display:flex;gap:12px;align-items:flex-start;width:100%;padding:11px 10px;border:0;border-radius:14px;background:none;color:var(--ink,#09090B);text-align:left;font:inherit;cursor:pointer}
.nb-it:hover,.nb-it:focus-visible{background:var(--surface-2,#F4F4F5)}
.nb-ic{flex:none;display:grid;place-items:center;width:36px;height:36px;border-radius:12px;font-size:18px;background:var(--surface-2,#F4F4F5);color:var(--ink,#09090B)}
.nb-ic.ai{color:#fff;background:conic-gradient(from 200deg,#E9682A,#ec4899,#7c5cff,#E9682A)}
.nb-it>span+span{flex:1;min-width:0}.nb-it b{display:block;font-size:14px;font-weight:600;line-height:1.35}.nb-it small{display:block;margin-top:2px;font-size:12.5px;line-height:1.45;color:var(--muted,#71717A)}
.nb-it time{flex:none;font-size:11.5px;color:var(--faint,#A1A1AA);margin-top:2px}
.nb-it.new b::after{content:"";display:inline-block;width:7px;height:7px;margin-left:6px;border-radius:50%;background:var(--co,#E9682A);vertical-align:2px}
.nb-quiet{padding:4px 10px 6px;font-size:12.5px;color:var(--faint,#A1A1AA)}
.nb-empty{padding:26px 16px 30px;text-align:center;color:var(--muted,#71717A);font-size:13.5px}.nb-empty .ti{display:block;font-size:30px;color:var(--faint,#A1A1AA);margin-bottom:6px}
.nb-f{display:flex;flex:none;border-top:1px solid var(--line,rgba(0,0,0,.08))}.nb-f button{flex:1;height:46px;border:0;background:none;color:var(--ink,#09090B);font:600 13.5px Kanit,system-ui,sans-serif;cursor:pointer}.nb-f button:hover{background:var(--surface-2,#F4F4F5)}
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
/* เปิด/ปิดเตือนเลขไมล์ — ใช้ทั้งการ์ดแนะนำในกระดิ่งและหน้าตั้งค่า · ไม่มี LINE = ต้องเด้งบนเครื่องได้ ขอสิทธิ์ตอนกดนี้เลย */
async function kmSet(want){
  try{
    if(want){const st=await get("/api/km/remind").catch(()=>null);
      if(!(st&&st.line)&&!pushOn()&&await enable()!=="granted")return {ok:false,msg:T("เปิดแจ้งเตือนในเครื่องหรือเชื่อม LINE ก่อน แล้วค่อยเปิดเตือนเลขไมล์","Allow device notifications or link LINE first")}}
    const r=await post("/api/km/remind",{on:want});kmPut(r);subs.forEach(f=>{try{f()}catch(e){}});
    return {ok:true,r,msg:want?(r.line?T("เปิดแล้ว — ทุก 18:00 จะถามเลขไมล์ทาง LINE","On — we'll ask on LINE at 6 pm"):T("เปิดแล้ว — ทุก 18:00 จะเด้งบนเครื่อง","On — a notification at 6 pm")):T("ปิดเตือนจดเลขไมล์แล้ว","Mileage reminder off")};
  }catch(e){return {ok:false,msg:T("ตั้งค่าไม่สำเร็จ ลองใหม่อีกครั้ง","Couldn't change that — try again")}}
}
/* การ์ดแนะนำในกระดิ่ง: ขึ้นเฉพาะฟีเจอร์ที่ยังไม่ได้เปิด · เปิดแล้วหายไป (ปิด/เปลี่ยนที่หน้าตั้งค่า) · กด × = ไม่ถามอีก 14 วัน */
const SNZ="spire_bell_snooze";
const snoozed=k=>{try{const v=JSON.parse(localStorage.getItem(SNZ)||"{}");return v.uid===uid()&&(v[k]||0)>Date.now()}catch(e){return false}};
function snooze(k){try{let v=JSON.parse(localStorage.getItem(SNZ)||"{}");if(v.uid!==uid())v={uid:uid()};v[k]=Date.now()+14*86400000;localStorage.setItem(SNZ,JSON.stringify(v))}catch(e){}}
function tips(){
  const out=[],pm=perm();
  if((pm==="default"||(pm==="granted"&&!pushOn()))&&!snoozed("dev"))out.push(`<div class="nb-tip"><i class="ti ti-bell-ringing"></i><span><b>${T("เปิดแจ้งเตือนในเครื่อง","Turn on device notifications")}</b>${T("รู้ทันทีเมื่อช่างเสนอราคา รับงาน หรือ AI ตอบ แม้ไม่ได้เปิดแอป","Know right away when a mechanic quotes, takes the job or the AI replies — even with the app closed")}</span><button type="button" class="nb-cta" data-a="on">${T("เปิด","Turn on")}</button><button type="button" class="nb-x" data-x="dev" aria-label="${T("ไม่ใช่ตอนนี้","Not now")}"><i class="ti ti-x"></i></button></div>`);
  const k=kmGet();
  if(uid()&&hasCar()&&k&&!k.on&&!snoozed("km"))out.push(`<div class="nb-tip"><i class="ti ti-gauge"></i><span><b>${T("เตือนจดเลขไมล์ 18:00","Mileage reminder at 6 pm")}</b>${T("ช่วยให้เตือนเปลี่ยนน้ำมันเครื่องและอะไหล่ได้แม่นขึ้น","Keeps oil-change and parts reminders accurate")}</span><button type="button" class="nb-cta" data-a="kmon">${T("เปิด","Turn on")}</button><button type="button" class="nb-x" data-x="km" aria-label="${T("ไม่ใช่ตอนนี้","Not now")}"><i class="ti ti-x"></i></button></div>`);
  return out.join("");
}
/* หน้าตั้งค่า → ส่วนการแจ้งเตือน · หน้าที่มีหน้าตั้งค่าในตัวเปิดเลย · หน้าแรกพาไปหน้าโปรไฟล์ */
function openSettings(){
  if(W.spireOpenSettings){W.spireOpenSettings("notif");return}
  if(W.openSettings&&/^\/chat/.test(location.pathname)){W.openSettings("notif");return}
  location.href="/profile?tab=notif";
}
/* แผงรายการ · o.onJobs = ปุ่ม "งานของฉันทั้งหมด" (หน้าแรกเปิดในหน้าเดิม หน้าอื่นไป /jobs) · o.toast = ข้อความเด้งของหน้านั้น */
function panel(btn,o){
  o=o||{};style();
  if(opened){opened.close();return}
  const old=document.querySelector(".nb-pop");if(old)old.remove();
  const owner=uid();if(!owner)return;
  const owns=()=>owner===uid()&&(!W.CendonScope?.mine||W.CendonScope.mine(owner));
  if(!owns())return;
  let disposed=false,refreshing=false,unsubscribe=null,focusTimer=0,wasCleared=false;
  const p=document.createElement("div");p.className="nb-pop";p.setAttribute("role","dialog");p.setAttribute("aria-label",T("การแจ้งเตือน","Notifications"));
  const agoT=at=>{const m=Math.round((Date.now()-at)/60000);return m<1?T("เมื่อกี้","now"):m<60?T(`${m} นาที`,`${m}m`):m<1440?T(`${Math.round(m/60)} ชม.`,`${Math.round(m/60)}h`):T(`${Math.round(m/1440)} วัน`,`${Math.round(m/1440)}d`)};
  const jobRow=x=>`<button type="button" class="nb-job${x.r===0?" r0":""}${x.hot?" hot":""}" data-u="${escH(x.url)}" data-k="${escH(x.id)}"><span class="nb-ic"><i class="ti ${x.ic}"></i>${x.live?'<i class="lv"></i>':""}</span>${x.unread&&x.r!==2?`<span class="nb-un">${x.unread>9?"9+":x.unread}</span>`:""}
    <span class="nb-jt"><b class="nt">${escH(x.title)}</b>${x.sub?`<small class="nt">${escH(x.sub)}</small>`:""}</span>${x.cta?`<span class="nb-go">${escH(x.cta)}</span>`:x.chip?`<span class="nb-chip">${escH(x.chip)}</span>`:""}</button>`;
  const draw=()=>{if(disposed)return;if(!owns()){close();return}const L=list(),H=hub(jobsGet()),known=!!jobsGet();
    const focus=p.contains(document.activeElement)?document.activeElement:null,action=focus?.dataset.a,item=focus?.dataset.id||focus?.dataset.k,scroll=p.querySelector('.nb-body')?.scrollTop||0;
    p.innerHTML=`<div class="nb-h"><b>${T("การแจ้งเตือน","Notifications")}</b><button type="button" class="nb-gear" data-a="settings" aria-label="${T("ตั้งค่าการแจ้งเตือน","Notification settings")}" title="${T("ตั้งค่าการแจ้งเตือน","Notification settings")}"><i class="ti ti-settings"></i></button></div>
      <div class="nb-body">${tips()}
      ${H.act.length?`<p class="nb-sec"><span>${T("ต้องทำตอนนี้","Needs you")}</span><em>${H.act.length}</em></p>${H.act.map(jobRow).join("")}`:""}
      ${H.live.length?`<p class="nb-sec"><span>${T("กำลังดำเนินการ","In progress")}</span></p>${H.live.map(jobRow).join("")}`:""}
      ${known&&!H.act.length&&!H.live.length?`<p class="nb-sec"><span>${T("งานของฉัน","My jobs")}</span></p><p class="nb-quiet">${T("ไม่มีงานค้าง — งานที่จบแล้วดูได้ที่ \"งานทั้งหมด\"","Nothing open — finished jobs are under \"All jobs\"")}</p>`:""}
      <p class="nb-sec"><span>${T("อัปเดตล่าสุด","Recent updates")}</span><button type="button" data-a="clear" ${L.length?'':'disabled'} title="${T('ล้างเฉพาะการแจ้งเตือน ไม่ลบงานหรือแชต','Clear notifications only, not jobs or chats')}">${T('ล้าง','Clear')}</button></p>
      <div class="nb-list">${L.length?L.map(x=>`<button type="button" class="nb-it${x.read?"":" new"}" data-id="${escH(x.id)}" data-u="${escH(x.url)}"><span class="nb-ic${x.kind==="ai"?" ai":""}"><i class="ti ${ICON[x.kind]||"ti-bell"}"></i></span><span><b class="nt">${escH(x.title)}</b>${x.body?`<small class="nt">${escH(x.body)}</small>`:""}</span><time>${agoT(x.at)}</time></button>`).join("")
        :`<div class="nb-empty" role="status"><i class="ti ti-bell"></i>${wasCleared?T('ล้างการแจ้งเตือนแล้ว งานและแชตยังอยู่เหมือนเดิม','Notifications cleared. Your jobs and chats are unchanged.'):T("ยังไม่มีการแจ้งเตือน — เมื่อช่างเสนอราคา รับงาน หรือส่งข้อความ จะขึ้นที่นี่","Nothing yet — quotes, accepted jobs and messages show up here")}</div>`}</div></div>
      <div class="nb-f"><button type="button" data-a="jobs">${T("งานทั้งหมด (รวมที่เสร็จแล้ว)","All jobs (including finished)")}</button></div>`;
    p.querySelectorAll("[data-id]").forEach(x=>x.onclick=()=>{if(!owns()){close();return}read(x.dataset.id);close();go(x.dataset.u)});
    p.querySelectorAll("[data-k]").forEach(x=>x.onclick=()=>{if(!owns()){close();return}close();go(x.dataset.u)});
    p.querySelector('[data-a="clear"]').onclick=()=>{if(!owns()){close();return}wasCleared=true;clear();draw()};
    p.querySelector('[data-a="settings"]').onclick=()=>{close();openSettings()};
    const on_=p.querySelector('[data-a="on"]');if(on_)on_.onclick=async()=>{on_.disabled=true;const st=await enable();
      if(st==="granted"&&o.toast)o.toast(T("เปิดแจ้งเตือนในเครื่องแล้ว — ปิดหรือเปลี่ยนได้ที่ตั้งค่า","Device notifications are on — change them in Settings"));draw()};
    const km=p.querySelector('[data-a="kmon"]');if(km)km.onclick=async()=>{km.disabled=true;const r=await kmSet(true);if(o.toast&&r.msg)o.toast(r.msg);draw()};
    p.querySelectorAll('[data-x]').forEach(x=>x.onclick=()=>{snooze(x.dataset.x);draw()});
    p.querySelector('[data-a="jobs"]').onclick=()=>{if(!owns()){close();return}close();o.onJobs?o.onJobs():go("/jobs")};
    p.querySelector('.nb-body').scrollTop=scroll;
    if(action||item){const target=[...p.querySelectorAll('button')].find(b=>item?(b.dataset.id===item||b.dataset.k===item):b.dataset.a===action);(target&&!target.disabled?target:p.querySelector('[data-a="jobs"]')).focus({preventScroll:true})}
  };
  // Opening the visible inbox acknowledges its current notices, not jobs/messages.
  if(!document.hidden)read();
  draw();document.body.appendChild(p);btn.setAttribute("aria-expanded","true");
  opened={node:p,owner,close};unsubscribe=on(refresh);document.addEventListener('visibilitychange',refresh);
  /* สถานะจริงจากหลังบ้าน (อีกเครื่อง/LINE อาจเปิดปิดไว้) — ต่างจากที่จำไว้ค่อยวาดใหม่ */
  if(uid()&&hasCar())get("/api/km/remind").then(r=>{if(!owns()||disposed)return;const k=kmGet();kmPut(r);if(p.isConnected&&(!k||k.on!==!!r.on||k.line!==!!r.line))draw()}).catch(()=>{});
  fetchJobs().catch(()=>{});
  const rc=btn.getBoundingClientRect();p.style.top=(rc.bottom+8+scrollY)+"px";p.style.left=Math.max(10,Math.min(rc.right-p.offsetWidth+scrollX,innerWidth-p.offsetWidth-10))+"px";
  function close(){if(disposed)return;disposed=true;unsubscribe?.();clearTimeout(focusTimer);p.remove();btn.setAttribute("aria-expanded","false");removeEventListener("pointerdown",off,true);document.removeEventListener("keydown",k);document.removeEventListener('visibilitychange',refresh);if(opened?.node===p)opened=null}
  function off(e){if(!p.contains(e.target)&&!btn.contains(e.target))close()}
  function k(e){if(e.key==="Escape"){close();btn.focus()}}
  function refresh(){if(disposed)return;if(!owns()||!p.isConnected){close();return}if(refreshing)return;refreshing=true;try{if(!document.hidden)read();draw()}finally{refreshing=false}}
  addEventListener("pointerdown",off,true);document.addEventListener("keydown",k);
  focusTimer=setTimeout(()=>{if(disposed||!owns())return;const n=p.querySelector(".nb-job,.nb-it");(n||p.querySelector("button:not(:disabled)"))?.focus()},40);
}
const closeOtherInbox=()=>{if(opened&&opened.owner!==uid())opened.close()};
W.addEventListener('cendon:auth-ready',closeOtherInbox);document.addEventListener('cendon:auth-ready',closeOtherInbox);

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
  const n=badge(),me=!!uid()||hint;
  for(let i=BTNS.length-1;i>=0;i--)if(!BTNS[i].isConnected)BTNS.splice(i,1);
  BTNS.forEach(b=>{const e=b.querySelector("em");b.hidden=!me;e.hidden=!n;e.textContent=n>9?"9+":n||"";
    b.setAttribute("aria-label",n?T(`การแจ้งเตือน ${n} เรื่องรอคุณ`,`Notifications, ${n} waiting for you`):T("การแจ้งเตือน","Notifications"))});
}
/* ตัวเลขบนกระดิ่ง = งานที่ต้องทำ + การแจ้งเตือนที่ยังไม่อ่าน (ไม่นับซ้ำถ้าเป็นเรื่องของงานเดียวกัน) */
function badge(){
  const act=uid()?hub(jobsGet()).act:[],ids=new Set(act.map(x=>x.id));
  return act.length+load().filter(x=>!x.read&&!(String(x.tag||"").startsWith("cendon-job-")&&ids.has(String(x.tag).slice(11)))).length;
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
  poll();if(pushOn())subscribeBg();
}
async function accountPush(){
  if(pushOn()){subscribeBg();return}
  let owner;try{owner=localStorage.getItem(PUSH_OWNER)}catch{}
  const live=(W.spireAuth||W.auth)?.currentUser?.uid||"";
  if(owner&&owner!==live){const reg=await swReady();if(((W.spireAuth||W.auth)?.currentUser?.uid||"")!==live)return;
    const sub=await reg?.pushManager?.getSubscription();await sub?.unsubscribe().catch(()=>{});
    try{localStorage.removeItem(SUB)}catch{}
  }
}
W.addEventListener("cendon:auth-ready",accountPush);document.addEventListener("cendon:auth-ready",accountPush);
/* หน้าอื่นก็ต้องรู้ทันว่าช่างตอบ: ถามหลังบ้านเบา ๆ ทุก 25 วิ (ชีพจร) มีอะไรเปลี่ยนค่อยดึงรายการใบงาน */
let PV="",PT=0;
async function tick(){
  if(W.CendonBellOwnPoll){paint();return}
  const me=uid();
  if(me&&!document.hidden&&(W.spireAuth||W.auth)&&(W.spireAuth||W.auth).currentUser){
    try{const r=await get("/api/tech/pulse");
      if(r&&r.v&&r.v!==PV){const d=await get("/api/tech/jobs");if(uid()!==me||!Array.isArray(d?.jobs))return;PV=r.v;setJobs(d.jobs,null);get("/api/tech/posts").then(x=>{if(uid()===me&&Array.isArray(x?.posts))setJobs(null,x.posts)}).catch(()=>{});const evs=jobEvents(d.jobs,me);
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
W.CendonBell={add,list,unread,read,clear,enable,disable,perm,pushOn,pushSub,on,setApi,ai,sys,jobEvents,panel,style,paint,ding,buttons:()=>BTNS.slice(),
  setJobs,fetchJobs,hub:()=>hub(jobsGet()),km:{get:kmGet,set:kmSet,fetch:()=>get("/api/km/remind").then(r=>{kmPut(r);return r})},hasCar,openSettings};
/* Completion collection follows the user across every app page, not just Chat. */
if(!W.CendonChatJobs&&!document.querySelector('script[src*="chat-jobs.js"]')){const script=document.createElement('script');script.src='/chat-jobs.js?v=3';script.defer=true;document.head.append(script)}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",mount);else mount();
})(window);
