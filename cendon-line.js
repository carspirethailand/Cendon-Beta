/* ══════════════════════════════════════════════════════════════════
   Cendon — เชื่อม LINE เพื่อรับแจ้งเตือน

   วางที่ไหนก็ได้: <div data-line-connect></div>          → การ์ดเต็ม (Studio)
                   <div data-line-connect="row"></div>    → แถวเดียวในหน้าตั้งค่า (settings.js · หน้าตาจาก settings.css)
                   <div data-line-connect="nudge"></div>  → แถบเล็ก โผล่เฉพาะคนที่ยังไม่เชื่อม (ในใบงาน)
   ตัวนี้หาเองทุกครั้งที่มีกล่องแบบนี้โผล่ในหน้า ไม่ต้องเรียกอะไร

   ขั้นตอน (เริ่มจากในแชต LINE): ปุ่มเปิดห้องแชต LINE ของ Cendon พร้อมพิมพ์ "เชื่อมต่อบัญชี" ไว้ให้ → ผู้ใช้กดส่ง
   → บอทส่งลิงก์หน้าเชื่อมต่อ (/line?t=…) → ผู้ใช้เปิด ล็อกอิน แล้วกด "เชื่อมต่อ" (หน้านั้นอยู่ใน index.html)
   → หลังบ้านผูกบัญชีแล้ว push แจ้งใน LINE · หน้านี้ถามสถานะทุก 3 วินาทีจนเห็นว่าเชื่อมแล้ว
   (ใน LINE จะกดเมนู "เชื่อมบัญชี" เองก็ได้ ผลเหมือนกัน)
   ══════════════════════════════════════════════════════════════════ */
(function(){
"use strict";
const API=()=>window.TECH_API_URL||"https://spireonebackend.carspirethailand.workers.dev";
/* ภาษาอื่นที่ไม่ใช่ไทย = อังกฤษ (หน้าที่มีตัวแปลภาษาบอกเองผ่าน spireLang) */
const EN=()=>{try{if(window.spireLang)return window.spireLang()!=="th";const v=JSON.parse(localStorage.getItem("spire_lang"));return v?v!=="th":!/^th/i.test(navigator.language||"")}catch(e){return false}};
const T=(th,en)=>EN()?en:th;
const esc=s=>String(s==null?"":s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));

function user(){try{const a=window.spireAuth||window.auth||(window.firebase&&firebase.apps&&firebase.apps.length&&firebase.auth());return a&&a.currentUser||null}catch(e){return null}}
/* รอ Firebase บอกว่าใครล็อกอินอยู่ (หน้าเพิ่งเปิด) ไม่เกิน 15 วินาที */
function whenUser(){return new Promise(res=>{let n=0;(function w(){const u=user();if(u||++n>75)return res(u);setTimeout(w,200)})()})}
async function call(method,path){
  const u=user();if(!u)throw new Error(T("กรุณาเข้าสู่ระบบก่อน","Please sign in first"));
  const token=await u.getIdToken();if(user()?.uid!==u.uid)throw Error('Account changed');
  const r=await fetch(API()+path,{method,headers:{Authorization:"Bearer "+token},cache:"no-store",signal:AbortSignal.timeout(10000)});
  let d={};try{d=await r.json()}catch(e){}
  if(user()?.uid!==u.uid)throw Error('Account changed');
  if(!r.ok)throw new Error(d.error||T("เชื่อมต่อไม่ได้ ลองใหม่อีกครั้ง","Couldn't connect. Please try again"));
  return d;
}

/* สถานะร่วมของทั้งหน้า: ถามเซิร์ฟเวอร์ครั้งเดียว ทุกกล่องใช้ร่วมกัน */
/* pending = เวลาที่เลิกรอ หลังผู้ใช้กดเปิด LINE (รอทำต่อใน LINE ไม่เกิน 20 นาที) */
let st=null,stAt=0,stUid=null,pending=0,poll=0,inflight=null,linkEpoch=0;
const CONNECT="เชื่อมต่อบัญชี";
const boxes=new Set();
/* จำสถานะล่าสุดของแต่ละบัญชีไว้ในเครื่อง: เปิดหน้าครั้งหน้าวาดการ์ดได้ทันที ไม่ต้องรอล็อกอิน + เซิร์ฟเวอร์ (เดิมช้าหลายวินาที)
   เก็บแค่ เชื่อมแล้ว/ยัง/รอเพิ่มเพื่อน + ชื่อบัญชี OA — ไม่มีข้อมูลส่วนตัว */
const KEY=uid=>"cendon_line_st:"+uid;
function guessUid(){try{const c=JSON.parse(localStorage.getItem("spire_cachedUser")||"null");return c&&typeof c.uid==="string"?c.uid:null}catch(e){return null}}
function remembered(uid){try{const v=JSON.parse(localStorage.getItem(KEY(uid))||"null");return v&&v.st&&typeof v.st==="object"?v.st:null}catch(e){return null}}
async function status(force){
  const u=user();if(!u)throw Error('Sign in first');
  if(stUid!==u.uid){st=remembered(u.uid);stUid=u.uid;stAt=0;pending=0}
  if(!force&&st&&Date.now()-stAt<60000)return st;
  if(inflight?.uid===u.uid)return inflight.task;
  const request={uid:u.uid,epoch:linkEpoch};request.task=(async()=>{const d=await call("GET","/api/line/link");
  if(user()?.uid!==u.uid||request.epoch!==linkEpoch)throw Error('Connection state changed');
  st={linked:!!d.linked,paused:!!d.paused,oa:d.oa==null?null:String(d.oa)};stAt=Date.now();stUid=u&&u.uid;
  if(stUid)try{localStorage.setItem(KEY(stUid),JSON.stringify({st,at:stAt}))}catch(e){}
  return st;})().finally(()=>{if(inflight===request)inflight=null});inflight=request;return request.task;
}
function paintAll(){boxes.forEach(el=>{if(el.isConnected)paint(el);else boxes.delete(el)})}

const oaUrl=(oa,text)=>`https://line.me/R/oaMessage/${encodeURIComponent(oa)}/?${encodeURIComponent(text)}`;
const addUrl=oa=>`https://line.me/R/ti/p/${encodeURIComponent(oa)}`;
/* โลโก้ LINE ของจริง (img/line-logo.svg) ฝังไว้ในไฟล์ — ขึ้นทันทีไม่ต้องรอโหลดฟอนต์ไอคอน */
const ICON='<span class="cl-ic"><svg xmlns="http://www.w3.org/2000/svg" viewBox="33 3 54 54" aria-hidden="true"><g transform="matrix(.45 0 0 -.45 -12.839115 167.764935)"><path d="M195.865 246.144h-68c-14.36 0-26 11.64-26 26v68c0 14.36 11.64 26 26 26h68c14.36 0 26-11.64 26-26v-68c0-14.36-11.64-26-26-26" fill="#00b900"/><path d="M205.36 311.42c0 19.55-19.6 35.456-43.69 35.456s-43.7-15.906-43.7-35.456c0-17.527 15.543-32.205 36.54-34.98 1.423-.307 3.36-.94 3.85-2.155.44-1.104.288-2.835.14-3.95l-.623-3.74c-.19-1.104-.88-4.32 3.784-2.355s25.162 14.816 34.328 25.367h-.002c6.332 6.943 9.365 14 9.365 21.814" fill="#fff"/><g fill="#00b900"><path d="M152.793 320.868h-3.065a.85.85 0 0 1-.851-.85V300.98a.85.85 0 0 1 .851-.848h3.065a.85.85 0 0 1 .851.848v19.037a.85.85 0 0 1-.851.85m21.094.001h-3.064a.85.85 0 0 1-.851-.85v-11.3l-8.725 11.782a.93.93 0 0 1-.066.086l-.005.006-.067.067-.046.038c-.007.006-.014.012-.022.017l-.044.03c-.008.006-.017.01-.026.015l-.045.026-.027.013-.05.02-.027.01c-.017.007-.034.012-.05.017l-.03.008-.048.01c-.012.003-.025.004-.036.005l-.045.006-.044.003-.03.001h-3.064a.85.85 0 0 1-.851-.85V300.98a.85.85 0 0 1 .851-.848h3.064a.85.85 0 0 1 .852.848v11.307l8.734-11.797a.85.85 0 0 1 .217-.21l.06-.038.024-.014.04-.02.04-.018.025-.01.06-.018c.08-.022.154-.03.23-.03h3.064a.85.85 0 0 1 .851.848v19.037a.85.85 0 0 1-.851.85"/><path d="M145.405 304.9h-8.327v15.12a.85.85 0 0 1-.85.851h-3.065a.85.85 0 0 1-.851-.851v-19.036a.84.84 0 0 1 .238-.588l.024-.025a.85.85 0 0 1 .587-.237h12.244a.85.85 0 0 1 .85.851v3.065a.85.85 0 0 1-.85.851m45.405 11.2a.85.85 0 0 1 .85.851v3.065a.85.85 0 0 1-.85.851h-12.244a.88.88 0 0 1-.6-.24c-.015-.014-.02-.02-.023-.024a.84.84 0 0 1-.236-.586V300.98a.84.84 0 0 1 .238-.588l.023-.023c.153-.147.36-.238.588-.238H190.8a.85.85 0 0 1 .85.85v3.066a.85.85 0 0 1-.85.851h-8.326v3.218h8.326a.85.85 0 0 1 .85.851v3.064a.85.85 0 0 1-.85.852h-8.326v3.217h8.326z"/></g></g></svg></span>';

/* ชั้นประกายในการ์ด: แสงฟุ้ง 3 ดวง · จุดแสงลอยขึ้น 14 จุด · ประกายระยิบ 5 จุด · แสงกวาด 1 เส้น
   ตำแหน่งคำนวณตายตัว ไม่สุ่ม — วาดใหม่กี่ครั้งก็อยู่ที่เดิม ไม่กระโดด */
const FX=(()=>{let h="";
  [[80,16,96,13],[10,92,74,17],[58,118,64,21]].forEach(([x,y,s,d],i)=>h+=`<i class="cl-bk" style="--x:${x}%;--y:${y}%;--s:${s}px;--d:${d}s;--dl:-${i*4}s"></i>`);
  for(let i=0;i<14;i++)h+=`<i class="cl-dt" style="--x:${(i*37+11)%100}%;--s:${(1.4+(i%3)*.9).toFixed(1)}px;--d:${(6+(i%5)*1.6).toFixed(1)}s;--dl:-${(i*1.3).toFixed(1)}s;--o:${(.35+(i%4)*.15).toFixed(2)}"></i>`;
  [[88,20,20,2.8,0],[72,64,13,3.4,1.1],[95,74,11,2.4,.6],[58,14,12,3.1,1.8],[34,26,9,2.7,2.3]].forEach(([x,y,s,d,dl])=>h+=`<i class="cl-sp" style="--x:${x}%;--y:${y}%;--s:${s}px;--d:${d}s;--dl:${dl}s"></i>`);
  return `<span class="cl-fx" aria-hidden="true">${h}<i class="cl-sh"></i></span>`;})();

/* วาด แล้วซ่อนกรอบที่ครอบอยู่ (data-line-card) ถ้าไม่มีอะไรให้โชว์ — ไม่ให้เหลือหัวข้อลอย ๆ */
function paint(el){
  draw(el);
  const card=el.querySelector(".cl");if(card&&!card.querySelector(".cl-fx"))card.insertAdjacentHTML("afterbegin",FX);
  const empty=!el.innerHTML.trim(),host=el.closest("[data-line-card]");
  /* แถวในหน้าตั้งค่า: ยังไม่รู้สถานะ = เว้นที่ไว้ (ไม่กระโดด) · ซ่อนทั้งหมวดเฉพาะตอนรู้แน่แล้วว่าไม่มี LINE */
  if(el.dataset.lineConnect==="row"){const gone=!!st&&st.oa==="";if(host){host.hidden=gone;host.style.display=""}
    try{localStorage.setItem("cendon_line_card",gone?"0":"1")}catch(e){}return}
  el.style.display=empty?"none":"";if(host)host.style.display=empty?"none":"";
  /* จำว่าการ์ดโชว์ไหม สูงเท่าไร — หน้าตั้งค่าครั้งหน้าจองที่ไว้ก่อน ส่วนด้านล่างจะได้ไม่กระโดด */
  el.style.minHeight="";
  if(host)try{localStorage.setItem("cendon_line_card",empty?"0":"1");if(!empty&&el.offsetHeight)localStorage.setItem("cendon_line_h",String(el.offsetHeight))}catch(e){}
}
/* แถวเดียวในหน้าตั้งค่า: ชื่อเดิมเสมอ เปลี่ยนแค่บรรทัดสถานะกับปุ่มด้านขวา */
function rowHTML(){
  if(!st)return `<div class="cl-row">${ICON}<div class="cl-tx"><b>${T('แจ้งเตือนทาง LINE','LINE notifications')}</b><small role="status">${T('กำลังตรวจการเชื่อมต่อ…','Checking…')}</small></div><button type="button" class="cl-go" data-cl="retry">${T('ตรวจอีกครั้ง','Retry')}</button></div>`;
  if(st.oa==="")return "";
  const oa=st.oa||"",head=T("แจ้งเตือนทาง LINE","LINE notifications");
  const one=(sub,right)=>`<div class="cl-row">${ICON}<div class="cl-tx"><b>${head}</b><small>${sub}</small></div>${right}</div>`;
  if(st.linked)return one(`<span class="cl-ok">●</span> ${T("เชื่อมแล้ว · งานใหม่และข้อความส่งเข้า LINE","Connected · jobs and messages go to LINE")}`,
    `<button type="button" class="cl-off" data-cl="off">${T("ยกเลิก","Disconnect")}</button>`);
  if(st.paused)return one(T("อีกขั้นเดียว: เพิ่ม Cendon เป็นเพื่อนใน LINE","One more step: add Cendon as a friend on LINE"),
    oa?`<a class="cl-go" href="${esc(addUrl(oa))}" target="_blank" rel="noopener">${T("เพิ่มเพื่อน","Add friend")}</a>`:"");
  if(!oa)return "";
  const go=label=>`<a class="cl-go" data-cl="go" href="${esc(oaUrl(oa,CONNECT))}" target="_blank" rel="noopener">${label}</a>`;
  if(pending>Date.now())return one(T(`ทำต่อใน LINE: กดส่ง "${CONNECT}"`,`Continue in LINE: send "${CONNECT}"`),go(T("เปิด LINE","Open LINE")));
  return one(T("งานใหม่ ข้อความ และเตือนดูแลรถ","New jobs, messages and car reminders"),go(T("เชื่อม","Connect")));
}
function draw(el){
  if(el.dataset.lineConnect==="row"){el.innerHTML=rowHTML();return}
  const nudge=el.dataset.lineConnect==="nudge";
  if(!st){el.innerHTML=rowHTML();return}
  /* หลังบ้านยังไม่ได้ตั้ง LINE (ไม่มีชื่อบัญชี OA) — ไม่โชว์ปุ่มที่กดแล้วไปไม่ถึงไหน */
  if(st.oa===""){el.innerHTML="";return}
  if(st.linked){
    el.innerHTML=nudge?"":`<div class="cl ok">${ICON}<div class="cl-tx"><b>${T("เชื่อม LINE แล้ว","LINE connected")}</b>
      <small>${T("งานใหม่ ราคา และข้อความจะส่งเข้า LINE ของคุณ","New jobs, quotes and messages go to your LINE")}</small></div>
      <button type="button" class="cl-lnk" data-cl="off">${T("ยกเลิกการเชื่อม","Disconnect")}</button></div>`;
    return;
  }
  /* เชื่อมแล้วแต่ยังไม่ได้เพิ่มเพื่อน (หรือบล็อก) Cendon ใน LINE — LINE ส่งแจ้งเตือนให้ไม่ได้จนกว่าจะเพิ่มเพื่อน
     เพิ่มแล้วหลังบ้านเปิดให้เอง หน้านี้ถามสถานะใหม่ตอนผู้ใช้สลับกลับมา */
  if(st.paused){
    const oa=st.oa||"";
    el.innerHTML=nudge
      ?`<div class="cl nudge">${ICON}<div class="cl-tx"><b>${T("เพิ่มเพื่อน Cendon เพื่อรับแจ้งเตือน","Add Cendon on LINE to get updates")}</b></div>
        ${oa?`<a class="cl-btn sm" href="${esc(addUrl(oa))}" target="_blank" rel="noopener">${T("เพิ่มเพื่อน","Add")}</a>`:""}</div>`
      :`<div class="cl wait">${ICON}<div class="cl-tx"><b>${T("อีกขั้นเดียว: เพิ่ม Cendon เป็นเพื่อน","One more step: add Cendon as a friend")}</b>
        <small>${T("เชื่อมบัญชีแล้ว แต่ LINE ส่งแจ้งเตือนได้เฉพาะคนที่เพิ่มเพื่อน (หรือไม่ได้บล็อก) Cendon","Your account is linked, but LINE only delivers to people who have added (and not blocked) Cendon")}</small>
        ${oa?`<a class="cl-btn" href="${esc(addUrl(oa))}" target="_blank" rel="noopener">${T("เพิ่มเพื่อน","Add friend")} ${esc(oa)}</a>`:""}
        <small class="cl-wt"><span class="cl-dot"></span>${T("เพิ่มแล้วการแจ้งเตือนจะเปิดเองทันที","Notifications turn on as soon as you add it")}</small>
        <button type="button" class="cl-lnk" data-cl="off" style="align-self:flex-start;margin:2px 0 0;padding:0">${T("ยกเลิกการเชื่อม","Disconnect")}</button></div></div>`;
    return;
  }
  const oa=st.oa,go=(cls,label)=>`<a class="${cls}" data-cl="go" href="${esc(oaUrl(oa,CONNECT))}" target="_blank" rel="noopener">${label}</a>`;
  if(pending>Date.now()&&!nudge){
    el.innerHTML=`<div class="cl wait">${ICON}<div class="cl-tx">
      <b>${T("ทำต่อใน LINE","Continue in LINE")}</b>
      <ol class="cl-steps"><li>${T(`กดส่งข้อความ "${CONNECT}"`,`Send "${CONNECT}"`)}</li><li>${T('กดปุ่ม "เชื่อมต่อบัญชี" ที่บอทตอบกลับ','Tap the "เชื่อมต่อบัญชี" button the bot replies with')}</li><li>${T('ล็อกอิน (ถ้าถาม) แล้วกด "เชื่อมต่อ"','Sign in if asked, then tap "เชื่อมต่อ"')}</li></ol>
      ${go("cl-btn",T("เปิด LINE อีกครั้ง","Open LINE again"))}
      <small>${T("ยังไม่ได้เพิ่มเพื่อน?","Not friends yet?")} <a href="${esc(addUrl(oa))}" target="_blank" rel="noopener">${T("เพิ่มเพื่อน","Add")} ${esc(oa)}</a></small>
      <small class="cl-wt"><span class="cl-dot"></span>${T("รอการเชื่อมต่อ…","Waiting for LINE…")}</small></div></div>`;
    return;
  }
  el.innerHTML=nudge
    ?`<div class="cl nudge">${ICON}<div class="cl-tx"><b>${T("รับแจ้งเตือนงานนี้ทาง LINE","Get updates on LINE")}</b></div>
      ${go("cl-btn sm",T("เชื่อม","Connect"))}</div>`
    :`<div class="cl">${ICON}<div class="cl-tx"><b>${T("รับแจ้งเตือนทาง LINE","Get notified on LINE")}</b>
      <small>${T("งานใหม่ ราคา ข้อความ และเตือนดูแลรถ ส่งเข้า LINE ทันที ไม่ต้องเปิดแอปค้างไว้","New jobs, quotes, messages and car reminders, straight to LINE")}</small>
      ${go("cl-btn",T("เชื่อม LINE","Connect LINE"))}</div></div>`;
}

/* กดเชื่อม = ลิงก์เปิดห้องแชต LINE (ปล่อยให้เปิดเอง) แล้วการ์ดเปลี่ยนเป็น "ทำต่อใน LINE" และรอผล */
function start(){pending=Date.now()+20*60000;setTimeout(()=>{paintAll();watch()},60)}
/* ระหว่างรอผู้ใช้ทำต่อใน LINE ถามสถานะเป็นระยะ (หยุดเองเมื่อเชื่อมแล้ว หรือเกิน 20 นาที) */
function watch(){
  clearTimeout(poll);
  const tick=async()=>{
    if(!pending)return;
    if(Date.now()>pending){pending=0;paintAll();return}
    try{const was=st&&st.paused;await status(true);if(st.linked){pending=0;paintAll();return}if(st.paused!==was)paintAll()}catch(e){}
    poll=setTimeout(tick,document.hidden?6000:3000);
  };
  tick();
}
/* กลับมาจาก LINE (เชื่อมจากเมนูใน LINE ก็ได้): ถามสถานะใหม่ทันทีถ้ายังไม่ได้เชื่อม — การ์ดชวนเชื่อมหายเองเมื่อเชื่อมแล้ว */
function resume(){if(document.hidden||!user())return;if(pending)watch();else status(true).then(paintAll).catch(()=>{})}
document.addEventListener("visibilitychange",resume);addEventListener('focus',resume);
/* เชื่อมสำเร็จในแท็บอื่น → แท็บนี้เปลี่ยนตาม */
addEventListener("storage",e=>{if(!e.key||!stUid||e.key!==KEY(stUid))return;const v=remembered(stUid);if(v){st=v;stAt=Date.now();paintAll()}});
/* หน้าอื่นในแอปบอกได้ว่าเพิ่งเชื่อม/ยกเลิก (เช่น หน้าเชื่อมต่อ /line ในหน้าแรก) */
window.CendonLine={refresh:()=>{linkEpoch++;inflight=null;return status(true).then(paintAll).catch(()=>{})}};
document.addEventListener("click",async e=>{
  const b=e.target.closest&&e.target.closest("[data-cl]");if(!b)return;
  const el=b.closest("[data-line-connect]");if(!el)return;
  if(b.dataset.cl==="go")return start();
  e.preventDefault();
  if(b.dataset.cl==="retry"){b.disabled=true;try{await status(true)}catch(err){alert(err.message)}finally{b.disabled=false;paintAll()}return}
  if(b.dataset.cl==="off"){
    if(!confirm(T("เลิกรับแจ้งเตือนทาง LINE?","Stop LINE notifications?")))return;
    b.disabled=true;try{await call("DELETE","/api/line/link");linkEpoch++;inflight=null;pending=0;await status(true)}catch(err){alert(err.message)}finally{b.disabled=false}
    paintAll();
  }
});

async function mount(el){
  if(boxes.has(el))return;boxes.add(el);
  /* วาดทันทีจากสถานะที่จำไว้ของบัญชีนี้ แล้วค่อยเช็กของจริงตามหลัง */
  const g=(user()||{}).uid||guessUid();if(g!==stUid){st=g?remembered(g):null;stAt=0;stUid=g;pending=0}
  paint(el);
  const u=await whenUser();if(!u){st=null;el.innerHTML="";paint(el);return}
  if(stUid&&stUid!==u.uid){st=null;stAt=0}
  /* ยังไม่ได้เชื่อม = ถามใหม่ทุกครั้งที่การ์ดโผล่ (เบามาก) — เพิ่งเชื่อมเสร็จ การ์ดชวนเชื่อมในใบงานต้องไม่ขึ้นอีก */
  try{await status(!st||!st.linked)}catch(e){}
  paintAll();
}
function scan(root){(root||document).querySelectorAll("[data-line-connect]").forEach(mount)}
new MutationObserver(ms=>{for(const m of ms)for(const n of m.addedNodes){if(n.nodeType!==1)continue;
  if(n.matches&&n.matches("[data-line-connect]"))mount(n);else if(n.querySelector&&n.querySelector("[data-line-connect]"))scan(n)}})
  .observe(document.documentElement,{childList:true,subtree:true});
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",()=>scan());else scan();

/* หน้าตา: การ์ดเขียวโทน LINE แบบเดียวกับการ์ด "สรุปวันนี้" ของ Cendon
   ไล่สีเขียวเข้ม→สว่าง · แสงมุมขวาบน · เกล็ดโลหะ (flake) · ประกายระยิบ จุดแสงลอยขึ้น และแสงกวาดผ่านช้า ๆ
   ปุ่มเป็นสีขาวตัวอักษรเขียว ให้เด่นบนพื้นเขียว · ผู้ใช้ที่ปิดภาพเคลื่อนไหวในเครื่องจะเห็นแบบนิ่ง */
const css=document.createElement("style");css.textContent=`
.cl{--cl-flake:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='f' x='0' y='0' width='100%25' height='100%25'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='2.6' numOctaves='1' seed='11' stitchTiles='stitch' result='n'/%3E%3CfeColorMatrix in='n' type='matrix' values='0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 1 0 0 0 0'/%3E%3CfeComponentTransfer%3E%3CfeFuncA type='linear' slope='16' intercept='-10.08'/%3E%3C/feComponentTransfer%3E%3C/filter%3E%3Crect width='160' height='160' filter='url(%23f)'/%3E%3C/svg%3E");
  position:relative;isolation:isolate;overflow:hidden;display:flex;align-items:flex-start;gap:14px;
  padding:18px;border-radius:18px;text-align:left;color:#fff;
  background:linear-gradient(150deg,#03803A 0%,#06B14E 48%,#2ED36E 100%);
  box-shadow:inset 0 1px 0 rgba(255,255,255,.35),0 14px 30px -16px rgba(3,100,45,.75)}
.cl::before{content:"";position:absolute;inset:0;z-index:-2;pointer-events:none;
  background:radial-gradient(120% 85% at 94% 0%,rgba(255,255,255,.38),transparent 55%),
             radial-gradient(90% 75% at 0% 100%,rgba(0,58,26,.55),transparent 62%)}
.cl::after{content:"";position:absolute;inset:0;z-index:-1;pointer-events:none;opacity:.2;
  background-image:var(--cl-flake);background-size:160px 160px;mix-blend-mode:screen}
.cl>*:not(.cl-fx){position:relative;z-index:1}
.cl.nudge{align-items:center;padding:12px 14px;border-radius:15px}
.cl-fx{position:absolute;inset:0;z-index:-1;pointer-events:none;overflow:hidden;border-radius:inherit}
.cl-fx i{position:absolute;display:block}
.cl-bk{left:var(--x);top:var(--y);width:var(--s);height:var(--s);margin:calc(var(--s) / -2);border-radius:50%;
  background:radial-gradient(circle,rgba(255,255,255,.26),rgba(255,255,255,0) 70%);
  animation:clDrift var(--d) ease-in-out var(--dl) infinite alternate}
.cl-dt{left:var(--x);bottom:-6px;width:var(--s);height:var(--s);border-radius:50%;background:#fff;
  box-shadow:0 0 6px rgba(255,255,255,.85);opacity:0;animation:clRise var(--d) linear var(--dl) infinite}
.cl-sp{left:var(--x);top:var(--y);width:var(--s);height:var(--s);margin:calc(var(--s) / -2);
  background:radial-gradient(circle,#fff 0 10%,rgba(255,255,255,.55) 20%,transparent 55%),
    linear-gradient(90deg,transparent,rgba(255,255,255,.95) 50%,transparent) center/100% 1.5px no-repeat,
    linear-gradient(0deg,transparent,rgba(255,255,255,.95) 50%,transparent) center/1.5px 100% no-repeat;
  animation:clTw var(--d) ease-in-out var(--dl) infinite}
.cl-sh{top:-30%;bottom:-30%;left:-45%;width:30%;
  background:linear-gradient(90deg,transparent,rgba(255,255,255,.2),transparent);
  transform:skewX(-20deg);animation:clSheen 7s ease-in-out 1.2s infinite}
@keyframes clDrift{to{transform:translate(-18px,-10px) scale(1.15)}}
@keyframes clRise{0%{transform:translateY(0);opacity:0}15%,80%{opacity:var(--o)}100%{transform:translateY(-190px);opacity:0}}
@keyframes clTw{0%,100%{opacity:.2;transform:scale(.6) rotate(0)}50%{opacity:1;transform:scale(1) rotate(45deg)}}
@keyframes clSheen{0%{transform:skewX(-20deg) translateX(0)}38%,100%{transform:skewX(-20deg) translateX(640%)}}
@media(prefers-reduced-motion:reduce){.cl-fx i{animation:none!important}.cl-dt,.cl-sh{display:none}.cl-sp{opacity:.7}}
.cl-ic{width:40px;height:40px;flex:none;display:block;border-radius:21.7%;
  box-shadow:0 0 0 2px rgba(255,255,255,.95),0 8px 18px -8px rgba(0,50,20,.75)}
.cl-ic svg{width:100%;height:100%;display:block}
.cl.nudge .cl-ic{width:34px;height:34px}
.cl-tx{flex:1;min-width:0;display:flex;flex-direction:column;gap:4px}
.cl-tx b{font-size:15px;font-weight:700;color:#fff;text-shadow:0 1px 2px rgba(0,60,25,.25)}
.cl-tx small{font-size:12.5px;color:rgba(255,255,255,.9);line-height:1.5}
.cl-tx small a{color:#fff;font-weight:700;text-decoration:underline;text-underline-offset:2px}
.cl-btn{align-self:flex-start;display:inline-flex;align-items:center;justify-content:center;height:40px;padding:0 20px;margin-top:8px;
  border:0;border-radius:999px;background:#fff;color:#04913F!important;font-weight:700;font-size:14px;font-family:inherit;
  text-decoration:none;cursor:pointer;box-shadow:0 8px 18px -10px rgba(0,50,20,.8),inset 0 -1px 0 rgba(0,0,0,.06);
  transition:transform .2s cubic-bezier(.32,.72,0,1)}
.cl-btn:hover{transform:translateY(-1px)}
.cl-btn:active{transform:scale(.97)}
.cl-btn.sm{height:34px;padding:0 16px;margin:0;font-size:13px;flex:none}
.cl-btn:disabled{opacity:.7}
.cl-lnk{flex:none;border:0;background:none;color:#fff;opacity:.72;font-weight:500;font-size:12px;font-family:inherit;text-decoration:underline;text-underline-offset:2px;cursor:pointer;align-self:center}
.cl-steps{margin:2px 0 4px;padding-left:20px;display:grid;gap:4px;font-size:13.5px;line-height:1.5;color:rgba(255,255,255,.95)}
.cl-steps li::marker{font-weight:700}
.cl-code{align-self:flex-start;font:700 26px/1.2 ui-monospace,SFMono-Regular,Menlo,monospace;letter-spacing:.18em;margin:4px 0 2px;
  padding:6px 8px 6px 14px;border-radius:12px;background:rgba(255,255,255,.16);border:1px solid rgba(255,255,255,.3);
  text-shadow:0 2px 10px rgba(0,60,25,.35)}
.cl-wt{display:flex;align-items:center;gap:6px}
.cl-dot{width:7px;height:7px;border-radius:50%;background:#fff;animation:clP 1.2s infinite}
@keyframes clP{0%,100%{opacity:.3}50%{opacity:1}}
.cl.ok .cl-tx b::after{content:" ✓";color:#fff}
`;document.head.appendChild(css);

window.CendonLine={scan,refresh:()=>status(true).then(paintAll).catch(()=>{})};
})();
