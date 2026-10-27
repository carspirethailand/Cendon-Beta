/* ══════════════════════════════════════════════════════════════════
   media-store.js — รูป · วิดีโอ · เสียง ที่แนบในแชต (window.CendonMedia)

   เดิมรูปหายหลังปิดแอป เพราะบันทึกแชตลง localStorage ได้แค่ "เคยแนบรูป" ไม่ใช่ตัวรูป
   (localStorage จุได้ราว 5MB รูปเดียวก็เต็ม) ตอนนี้ข้อความเก็บแค่รหัสไฟล์ ส่วนไฟล์จริงเก็บสองที่:
     1) ในเครื่อง — IndexedDB (จุได้มาก ขอให้เบราว์เซอร์ไม่ลบเองด้วย storage.persist)
     2) บนเซิร์ฟเวอร์ — /api/tech/media/<id> ล้างเครื่องหรือเปลี่ยนเครื่องก็ดึงกลับมาได้
   อัปโหลดไม่สำเร็จ (ออฟไลน์ / ยังไม่ล็อกอิน / เซิร์ฟเวอร์ยังไม่อัปเดต) จดคิวไว้ ลองใหม่เองรอบหน้า

   วาดไฟล์: ใส่ data-mid="<รหัส>" ที่ <img>/<video>/<audio> แล้วตัวนี้เติม src ให้เอง
   (แท็ก <img> ส่งโทเคนไม่ได้ จึงดึงด้วย fetch แล้วแสดงเป็น blob)
   ══════════════════════════════════════════════════════════════════ */
(function(){
"use strict";
if(window.CendonMedia)return;
const D=document;
const API=()=>String(window.CENDON_MEDIA_API||window.TECH_API_URL||window.BACKEND_URL||"https://spireonebackend.carspirethailand.workers.dev").replace(/\/+$/,"");
const EN=()=>{try{const l=window.lang||JSON.parse(localStorage.getItem("spire_lang")||'"th"');return l==="en"}catch(e){return false}};
const L=(th,en)=>EN()?en:th;
const guest='guest:'+((crypto.randomUUID&&crypto.randomUUID())||Math.random().toString(36).slice(2));
const signed=()=>{try{const a=window.spireAuth||window.auth||(window.firebase?.apps?.length?firebase.auth():null);return a&&'currentUser' in a?a.currentUser:window.currentUser||null}catch{return null}};
let activeAccount='';
function account(){
  const next=String(signed()?.uid||guest);
  if(activeAccount&&activeAccount!==next){
    mem.clear();pulling.clear();for(const u of urls.values())URL.revokeObjectURL(u);urls.clear();
    D.querySelectorAll('[data-mid][src^="blob:"]').forEach(el=>{el.removeAttribute('src');delete el.dataset.mok});
  }
  activeAccount=next;return next;
}
const storageId=(owner,id)=>owner+'|'+id;

/* ── โทเคนผู้ใช้ — ตอนเพิ่งเปิดหน้า ระบบล็อกอินยังกู้สถานะไม่เสร็จ รอได้สักครู่ ── */
async function token(wait){
  for(let i=0;i<(wait?25:1);i++){
    try{
      const u=signed();if(u&&u.getIdToken)return await u.getIdToken();
    }catch(e){}
    if(wait)await new Promise(r=>setTimeout(r,200));
  }
  return null;
}

/* ── IndexedDB ── */
let dbp=null;
function db(){
  if(dbp)return dbp;
  dbp=new Promise((res,rej)=>{
    if(!window.indexedDB)return rej(new Error("no indexedDB"));
    const r=indexedDB.open("cendon-media",1);let ended=false;const timer=setTimeout(()=>{ended=true;rej(new Error("media storage timeout"))},5000);
    r.onupgradeneeded=()=>{const d=r.result;if(!d.objectStoreNames.contains("files"))d.createObjectStore("files",{keyPath:"id"})};
    r.onsuccess=()=>{clearTimeout(timer);if(ended)r.result.close();else res(r.result)};r.onerror=()=>{clearTimeout(timer);rej(r.error)};r.onblocked=()=>{ended=true;clearTimeout(timer);rej(new Error("blocked"))};
  });
  dbp.catch(()=>{dbp=null});
  return dbp;
}
function tx(mode,fn){return db().then(d=>new Promise((res,rej)=>{
  const t=d.transaction("files",mode),r=fn(t.objectStore("files"));
  const timeout=setTimeout(()=>{try{t.abort()}catch{}rej(Error('Local file storage timed out'))},5000);
  t.oncomplete=()=>{clearTimeout(timeout);res(r&&r.result)};t.onerror=()=>{clearTimeout(timeout);rej(t.error)};t.onabort=()=>{clearTimeout(timeout);rej(t.error)};
}))}
const mem=new Map();   /* ใช้แทนเมื่อเบราว์เซอร์ปิด IndexedDB (โหมดส่วนตัวบางตัว) */
async function save(rec){
  const owner=rec.owner;if(!owner)return;
  if(owner===account())mem.set(rec.id,rec);
  const stored={...rec,id:storageId(owner,rec.id),fileId:rec.id};
  try{await tx("readwrite",s=>s.put(stored));return true}
  /* Safari รุ่นเก่าเก็บ Blob ลง IndexedDB ไม่ได้ — เก็บเป็นไบต์แทน */
  catch(e){try{const buf=await rec.blob.arrayBuffer();await tx("readwrite",s=>s.put({...stored,blob:null,buf}));return true}catch(x){return false}}
}
async function rec(id){
  const owner=account();
  if(mem.has(id))return mem.get(id);
  // Legacy entries have no provable owner. Do not expose or auto-upload them
  // after account changes; re-download through the authenticated endpoint instead.
  try{const r=await tx("readonly",s=>s.get(storageId(owner,id)));if(r&&r.owner===owner&&owner===account()){r.id=id;if(!r.blob&&r.buf)r.blob=new Blob([r.buf],{type:r.mime});delete r.buf;mem.set(id,r);return r}}catch(e){}
  return null;
}

const kindOf=m=>/^image\//.test(m)?"image":/^video\//.test(m)?"video":/^audio\//.test(m)?"audio":null;
const newId=()=>"m_"+(window.crypto&&crypto.randomUUID?crypto.randomUUID().replace(/-/g,""):Date.now().toString(36)+Math.random().toString(36).slice(2,14));
function fromB64(b64,mime){const s=atob(b64),u=new Uint8Array(s.length);for(let i=0;i<s.length;i++)u[i]=s.charCodeAt(i);return new Blob([u],{type:mime})}
const toB64=b=>new Promise((res,rej)=>{const r=new FileReader();r.onload=()=>res(String(r.result).split(",")[1]);r.onerror=()=>rej(r.error);r.readAsDataURL(b)});
let asked=false;
function persist(){if(asked)return;asked=true;try{navigator.storage&&navigator.storage.persist&&navigator.storage.persist().catch(()=>{})}catch(e){}}

/* เก็บไฟล์ใหม่ คืนรหัสไฟล์ · o: {id, kind, mime, name, scope (ai|draft), upload (false = ยังไม่ส่งขึ้น)} */
async function put(blob,o){
  o=o||{};
  const mime=String(o.mime||blob.type||"").split(";")[0]||"application/octet-stream";
  const owner=account(),r={id:o.id||newId(),owner,blob,mime,kind:o.kind||kindOf(mime),name:o.name||"",t:Date.now(),up:0,scope:o.scope||"ai"};
  persist();
  mem.set(r.id,r);
  const persisted=await save(r);
  if(owner!==account())throw Error('Account changed; please retry');
  if(o.requirePersistent&&!persisted){
    // A memory-only file disappears on /chat navigation. Keep the form open
    // unless an authenticated private upload has made the handoff durable.
    if(!(await upload(r.id,r.scope)))throw Error(L('เก็บเสียงข้ามหน้าไม่ได้ กรุณาอนุญาตพื้นที่เก็บข้อมูลหรือเชื่อมต่ออินเทอร์เน็ตแล้วลองอีกครั้ง','Cannot preserve the recording between pages. Allow site storage or reconnect and retry.'));
  }
  if(o.upload!==false)uploadSoon(r.id,r.scope);
  return r.id;
}

/* ไฟล์ตามรหัส — ไม่มีในเครื่อง (ล้างเครื่อง/เปลี่ยนเครื่อง) ดึงจากเซิร์ฟเวอร์แล้วเก็บไว้ในเครื่องด้วย */
const pulling=new Map();
async function get(id){
  const owner=account();
  const r=await rec(id);if(owner!==account())return null;if(r&&r.blob)return r.blob;
  if(pulling.has(id))return pulling.get(id);
  const p=(async()=>{
    const tok=await token(true);if(!tok||owner!==account())return null;
    let res;try{res=await fetch(API()+"/api/tech/media/"+encodeURIComponent(id),{cache:'no-store',headers:{Authorization:"Bearer "+tok}})}catch(e){return null}
    if(!res.ok)return null;
    const blob=await res.blob(),mime=(res.headers.get("Content-Type")||blob.type||"").split(";")[0];
    if(owner!==account())return null;
    await save({id,owner,blob,mime,kind:kindOf(mime),name:"",t:Date.now(),up:1});
    return owner===account()?blob:null;
  })().finally(()=>{if(pulling.get(id)===p)pulling.delete(id)});
  pulling.set(id,p);
  return p;
}
const urls=new Map();
async function url(id){
  const owner=account();
  if(urls.has(id))return urls.get(id);
  const b=await get(id);if(!b||owner!==account())return null;
  const u=URL.createObjectURL(b);urls.set(id,u);return u;
}
const cached=id=>{account();return urls.get(id)||null};

/* ── ส่งขึ้นเซิร์ฟเวอร์ ──
   คืน true เมื่อสำเร็จ · โยน error เมื่อเซิร์ฟเวอร์ปฏิเสธ (status ติดมาด้วย) · คืน false เมื่อยังส่งไม่ได้ (ไม่ได้ล็อกอิน/ออฟไลน์) */
async function upload(id,scope){
  const r=await rec(id);if(!r||!r.blob)return false;
  if(r.up===1)return true;
  const owner=account(),tok=await token(true);if(!tok||owner!==account()||r.owner!==owner)return false;
  let res;
  try{res=await fetch(API()+"/api/tech/media/"+encodeURIComponent(id)+"?scope="+encodeURIComponent(scope||r.scope||"ai"),
    {method:"PUT",headers:{Authorization:"Bearer "+tok,"Content-Type":r.mime},body:r.blob,signal:AbortSignal.timeout(20000)})}
  catch(e){return false}
  if(!res.ok){
    let m="";try{m=(await res.json()).error||""}catch(e){}
    throw Object.assign(new Error(m||L("ส่งไฟล์ไม่สำเร็จ","Upload failed")+" ("+res.status+")"),{status:res.status});
  }
  if(owner!==account())return false;
  r.up=1;await save(r);
  return true;
}
const QK="spire_mediaQueue";
const queue=()=>{try{return JSON.parse(localStorage.getItem(QK+':'+account()))||[]}catch(e){return []}};
const setQueue=l=>{try{localStorage.setItem(QK+':'+account(),JSON.stringify(l.slice(-300)))}catch(e){}};
const unqueue=id=>setQueue(queue().filter(x=>x.id!==id));
function uploadSoon(id,scope){
  const l=queue();if(!l.some(x=>x.id===id))l.push({id,scope:scope||"ai"});setQueue(l);
  clearTimeout(uploadSoon.t);uploadSoon.t=setTimeout(drain,600);
}
let draining=false;
async function drain(){
  if(draining||!queue().length)return;draining=true;
  const owner=account();
  try{
    for(const x of queue()){
      if(owner!==account())break;
      try{
        if(!(await rec(x.id))){unqueue(x.id);continue}   /* ไฟล์ถูกลบไปแล้ว */
        if(await upload(x.id,x.scope)){if(owner!==account())break;unqueue(x.id)}else break;  /* ยังไม่ล็อกอิน/ออฟไลน์ — รอบหน้าค่อยลอง */
      }catch(e){
        if(owner!==account())break;
        /* ชนิด/ขนาดที่เซิร์ฟเวอร์ไม่รับ ลองซ้ำก็ไม่ผ่าน — เก็บไว้ในเครื่องอย่างเดียว
           404/5xx/429 = เซิร์ฟเวอร์ยังไม่พร้อม หรือส่งถี่ไป รอรอบหน้า */
        if([400,409,413,415].includes(e.status))unqueue(x.id);else break;
      }
    }
  }finally{draining=false}
}
addEventListener("online",()=>setTimeout(drain,1500));
setTimeout(drain,6000);

/* ลบ (ในเครื่อง + บนเซิร์ฟเวอร์) — ใช้ตอนลบแชต/เอาไฟล์ออกก่อนส่ง */
async function del(id,local){
  const owner=account();
  mem.delete(id);unqueue(id);
  const u=urls.get(id);if(u){URL.revokeObjectURL(u);urls.delete(id)}
  try{await tx("readwrite",s=>s.delete(storageId(owner,id)))}catch(e){}
  if(local)return;
  const tok=await token();if(!tok||owner!==account())return;
  try{await fetch(API()+"/api/tech/media/"+encodeURIComponent(id),{method:"DELETE",headers:{Authorization:"Bearer "+tok}})}catch(e){}
}

/* ── เติมไฟล์ให้ทุก [data-mid] ที่โผล่บนจอ ── */
function goneLabel(kind){
  return kind==="video"?L("วิดีโอนี้เปิดไม่ได้แล้ว","This video is no longer available")
    :kind==="audio"?L("ข้อความเสียงนี้เปิดไม่ได้แล้ว","This voice note is no longer available")
    :L("รูปนี้เปิดไม่ได้แล้ว","This photo is no longer available");
}
function fill(el){
  if(el.dataset.mok)return;el.dataset.mok="1";
  el.classList.add("m-wait");
  url(el.dataset.mid).then(u=>{
    el.classList.remove("m-wait");
    if(u){el.src=u;return}
    const kind=el.tagName==="VIDEO"?"video":el.tagName==="AUDIO"?"audio":"image";
    const s=D.createElement("span");s.className="m-gone";s.textContent=goneLabel(kind);
    el.replaceWith(s);
  }).catch(()=>el.classList.remove("m-wait"));
}
function hydrate(root){(root||D).querySelectorAll("[data-mid]:not([data-mok])").forEach(fill)}
let raf=0;
function watch(){
  if(!D.body)return D.addEventListener("DOMContentLoaded",watch,{once:true});
  hydrate(D.body);
  new MutationObserver(()=>{if(raf)return;raf=requestAnimationFrame(()=>{raf=0;hydrate(D.body)})}).observe(D.body,{childList:true,subtree:true});
}
watch();

/* สไตล์กลาง: กล่องรอโหลด / ไฟล์ที่หายไปแล้ว */
const css=D.createElement("style");
css.textContent=`img.m-wait,video.m-wait{min-width:96px;min-height:72px;background:color-mix(in srgb,currentColor 8%,transparent);animation:mpulse 1.2s ease-in-out infinite}
@keyframes mpulse{50%{opacity:.55}}
.m-gone{display:inline-flex;align-items:center;gap:6px;padding:7px 11px;border-radius:10px;font-size:12px;opacity:.75;background:color-mix(in srgb,currentColor 8%,transparent)}
.m-view{position:fixed;inset:0;z-index:99999;display:grid;place-items:center;background:rgba(0,0,0,.88);cursor:zoom-out;animation:mfade .2s ease}
.m-view img{max-width:96vw;max-height:92vh;border-radius:10px;object-fit:contain}
@keyframes mfade{from{opacity:0}}`;
(D.head||D.documentElement).appendChild(css);

/* ดูรูปเต็มจอ (แตะที่ไหนก็ปิด) */
function view(src){
  if(!src)return;
  const v=D.createElement("div");v.className="m-view";v.setAttribute("role","dialog");
  const i=D.createElement("img");i.src=src;i.alt="";v.appendChild(i);
  const close=()=>{v.remove();removeEventListener("keydown",esc)};
  const esc=e=>{if(e.key==="Escape")close()};
  v.onclick=close;addEventListener("keydown",esc);D.body.appendChild(v);
}

window.CendonMedia={put,get,url,cached,upload,uploadSoon,drain,del,hydrate,view,newId,kindOf,fromB64,toB64,token};
let observedAuth=null;
function bindAccount(){
  const a=window.spireAuth||window.auth||(window.firebase?.apps?.length?firebase.auth():null);
  if(a&&a!==observedAuth&&typeof a.onAuthStateChanged==='function'){observedAuth=a;a.onAuthStateChanged(()=>account());}
}
D.addEventListener('cendon:auth-ready',bindAccount);bindAccount();
})();
