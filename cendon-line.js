/* ══════════════════════════════════════════════════════════════════
   Cendon — เชื่อม LINE เพื่อรับแจ้งเตือน

   วางที่ไหนก็ได้: <div data-line-connect></div>          → การ์ดเต็ม (หน้าบัญชี, Studio)
                   <div data-line-connect="nudge"></div>  → แถบเล็ก โผล่เฉพาะคนที่ยังไม่เชื่อม (ในใบงาน)
   ตัวนี้หาเองทุกครั้งที่มีกล่องแบบนี้โผล่ในหน้า ไม่ต้องเรียกอะไร

   ขั้นตอน: ขอรหัส 6 ตัว → เปิดห้องแชต LINE ของ Cendon พร้อมพิมพ์รหัสไว้ให้ → ผู้ใช้กดส่ง
   → บอทผูกบัญชี → หน้านี้ถามสถานะทุก 3 วินาทีจนเห็นว่าเชื่อมแล้ว
   ข้อความที่เตรียมให้ส่งมีแค่ภาษาไทยกับรหัส — บอทหารหัสจาก "คำอังกฤษ 6 ตัว"
   ถ้ามีคำอย่าง CENDON ปนมา บอทจะหยิบผิดตัว
   ══════════════════════════════════════════════════════════════════ */
(function(){
"use strict";
const API=()=>window.TECH_API_URL||"https://spireonebackend.carspirethailand.workers.dev";
const EN=()=>{try{return JSON.parse(localStorage.getItem("spire_lang"))==="en"}catch(e){return false}};
const T=(th,en)=>EN()?en:th;
const esc=s=>String(s==null?"":s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));

function user(){try{const a=window.firebase&&firebase.apps&&firebase.apps.length&&firebase.auth();return a&&a.currentUser||null}catch(e){return null}}
/* รอ Firebase บอกว่าใครล็อกอินอยู่ (หน้าเพิ่งเปิด) ไม่เกิน 15 วินาที */
function whenUser(){return new Promise(res=>{let n=0;(function w(){const u=user();if(u||++n>75)return res(u);setTimeout(w,200)})()})}
async function call(method,path){
  const u=user();if(!u)throw new Error(T("กรุณาเข้าสู่ระบบก่อน","Please sign in first"));
  const r=await fetch(API()+path,{method,headers:{Authorization:"Bearer "+await u.getIdToken()},cache:"no-store"});
  let d={};try{d=await r.json()}catch(e){}
  if(!r.ok)throw new Error(d.error||T("เชื่อมต่อไม่ได้ ลองใหม่อีกครั้ง","Couldn't connect. Please try again"));
  return d;
}

/* สถานะร่วมของทั้งหน้า: ถามเซิร์ฟเวอร์ครั้งเดียว ทุกกล่องใช้ร่วมกัน */
let st=null,stAt=0,code=null,poll=0;
const boxes=new Set();
async function status(force){
  if(!force&&st&&Date.now()-stAt<60000)return st;
  st=await call("GET","/api/line/link");stAt=Date.now();return st;
}
function paintAll(){boxes.forEach(el=>{if(el.isConnected)paint(el);else boxes.delete(el)})}

const oaUrl=(oa,text)=>`https://line.me/R/oaMessage/${encodeURIComponent(oa)}/?${encodeURIComponent(text)}`;
const addUrl=oa=>`https://line.me/R/ti/p/${encodeURIComponent(oa)}`;
const ICON='<span class="cl-ic"><i class="ti ti-brand-line"></i></span>';

/* วาด แล้วซ่อนกรอบที่ครอบอยู่ (data-line-card) ถ้าไม่มีอะไรให้โชว์ — ไม่ให้เหลือหัวข้อลอย ๆ */
function paint(el){
  draw(el);
  const empty=!el.innerHTML.trim(),host=el.closest("[data-line-card]");
  el.style.display=empty?"none":"";if(host)host.style.display=empty?"none":"";
}
function draw(el){
  const nudge=el.dataset.lineConnect==="nudge";
  if(!st){el.innerHTML="";return}
  /* หลังบ้านยังไม่ได้ตั้ง LINE (ไม่มีชื่อบัญชี OA) — ไม่โชว์ปุ่มที่กดแล้วไปไม่ถึงไหน */
  if(st.oa===""){el.innerHTML="";return}
  if(st.linked){
    el.innerHTML=nudge?"":`<div class="cl ok">${ICON}<div class="cl-tx"><b>${T("เชื่อม LINE แล้ว","LINE connected")}</b>
      <small>${T("งานใหม่ ราคา และข้อความจะส่งเข้า LINE ของคุณ","New jobs, quotes and messages go to your LINE")}</small></div>
      <button type="button" class="cl-lnk" data-cl="off">${T("ยกเลิกการเชื่อม","Disconnect")}</button></div>`;
    return;
  }
  if(code){
    const oa=code.oa||st.oa||"",msg="รหัสเชื่อมบัญชี "+code.code;
    el.innerHTML=`<div class="cl wait">${ICON}<div class="cl-tx">
      <b>${T("ส่งรหัสนี้ใน LINE ของ Cendon","Send this code to Cendon on LINE")}</b>
      <div class="cl-code">${esc(code.code)}</div>
      ${oa?`<a class="cl-btn" href="${esc(oaUrl(oa,msg))}" target="_blank" rel="noopener">${T("เปิด LINE แล้วกดส่ง","Open LINE and tap send")}</a>
      <small>${T("ยังไม่ได้เพิ่มเพื่อน?","Not friends yet?")} <a href="${esc(addUrl(oa))}" target="_blank" rel="noopener">${T("เพิ่มเพื่อน","Add")} ${esc(oa)}</a> ${T("ก่อน แล้วพิมพ์รหัสนี้","first, then type this code")}</small>`
        :`<small>${T("เพิ่มเพื่อน LINE ของ Cendon แล้วพิมพ์รหัสนี้","Add Cendon on LINE and type this code")}</small>`}
      <small class="cl-wt"><span class="cl-dot"></span>${T("รอการยืนยัน · รหัสใช้ได้ 20 นาที","Waiting for LINE · code valid for 20 minutes")}</small></div></div>`;
    return;
  }
  el.innerHTML=nudge
    ?`<div class="cl nudge">${ICON}<div class="cl-tx"><b>${T("รับแจ้งเตือนงานนี้ทาง LINE","Get updates on LINE")}</b></div>
      <button type="button" class="cl-btn sm" data-cl="go">${T("เชื่อม","Connect")}</button></div>`
    :`<div class="cl">${ICON}<div class="cl-tx"><b>${T("รับแจ้งเตือนทาง LINE","Get notified on LINE")}</b>
      <small>${T("งานใหม่ ราคา ข้อความ และเตือนดูแลรถ ส่งเข้า LINE ทันที ไม่ต้องเปิดแอปค้างไว้","New jobs, quotes, messages and car reminders, straight to LINE")}</small>
      <button type="button" class="cl-btn" data-cl="go">${T("เชื่อม LINE","Connect LINE")}</button></div></div>`;
}

async function start(el){
  const b=el.querySelector('[data-cl="go"]');if(b){b.disabled=true;b.textContent="…"}
  try{code=await call("POST","/api/line/code");if(code.oa!==undefined&&st)st.oa=st.oa||code.oa}
  catch(e){alert(e.message);paintAll();return}
  paintAll();watch();
}
/* ระหว่างรอผู้ใช้กดส่งใน LINE ถามสถานะเป็นระยะ (หยุดเองเมื่อเชื่อมแล้ว หรือรหัสหมดอายุ) */
function watch(){
  clearTimeout(poll);
  const tick=async()=>{
    if(!code)return;
    if(Date.now()>(code.expiresAt||0)){code=null;paintAll();return}
    try{await status(true);if(st.linked){code=null;paintAll();return}}catch(e){}
    poll=setTimeout(tick,document.hidden?6000:3000);
  };
  poll=setTimeout(tick,3000);
}
document.addEventListener("visibilitychange",()=>{if(!document.hidden&&code)watch()});
document.addEventListener("click",async e=>{
  const b=e.target.closest&&e.target.closest("[data-cl]");if(!b)return;
  const el=b.closest("[data-line-connect]");if(!el)return;
  e.preventDefault();
  if(b.dataset.cl==="go")return start(el);
  if(b.dataset.cl==="off"){
    if(!confirm(T("เลิกรับแจ้งเตือนทาง LINE?","Stop LINE notifications?")))return;
    try{await call("DELETE","/api/line/link");await status(true)}catch(err){alert(err.message)}
    paintAll();
  }
});

async function mount(el){
  if(boxes.has(el))return;boxes.add(el);
  const u=await whenUser();if(!u){el.innerHTML="";paint(el);return}
  try{await status()}catch(e){st=st||null}
  paintAll();
}
function scan(root){(root||document).querySelectorAll("[data-line-connect]").forEach(mount)}
new MutationObserver(ms=>{for(const m of ms)for(const n of m.addedNodes){if(n.nodeType!==1)continue;
  if(n.matches&&n.matches("[data-line-connect]"))mount(n);else if(n.querySelector&&n.querySelector("[data-line-connect]"))scan(n)}})
  .observe(document.documentElement,{childList:true,subtree:true});
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",()=>scan());else scan();

/* หน้าตา: เส้นบาง พื้นโปร่ง เข้ากับธีมไหนก็ได้ · ปุ่มเขียว LINE เป็นสีของแบรนด์ LINE เอง */
const css=document.createElement("style");css.textContent=`
.cl{display:flex;align-items:flex-start;gap:12px;padding:14px;border:1px solid var(--line,rgba(127,127,127,.25));border-radius:14px;text-align:left}
.cl.nudge{align-items:center;padding:10px 12px}
.cl-ic{width:36px;height:36px;flex:none;border-radius:10px;background:#06C755;color:#fff;display:grid;place-items:center;font-size:21px}
.cl-tx{flex:1;min-width:0;display:flex;flex-direction:column;gap:4px}
.cl-tx b{font-size:14.5px;font-weight:600}
.cl-tx small{font-size:12.5px;opacity:.72;line-height:1.45}
.cl-tx small a{color:#06C755;font-weight:600}
.cl-btn{align-self:flex-start;display:inline-flex;align-items:center;justify-content:center;height:40px;padding:0 18px;margin-top:6px;border:0;border-radius:999px;background:#06C755;color:#fff!important;font-weight:600;font-size:14px;font-family:inherit;text-decoration:none;cursor:pointer}
.cl-btn.sm{height:34px;padding:0 14px;margin:0;font-size:13px;flex:none}
.cl-btn:disabled{opacity:.6}
.cl-lnk{flex:none;border:0;background:none;color:inherit;opacity:.6;font-weight:500;font-size:12.5px;font-family:inherit;text-decoration:underline;cursor:pointer;align-self:center}
.cl-code{font:700 26px/1.2 ui-monospace,SFMono-Regular,Menlo,monospace;letter-spacing:.18em;margin:2px 0}
.cl-wt{display:flex;align-items:center;gap:6px}
.cl-dot{width:7px;height:7px;border-radius:50%;background:#06C755;animation:clP 1.2s infinite}
@keyframes clP{0%,100%{opacity:.25}50%{opacity:1}}
.cl.ok .cl-tx b::after{content:" ✓";color:#06C755}
`;document.head.appendChild(css);

window.CendonLine={scan,refresh:()=>status(true).then(paintAll).catch(()=>{})};
})();
