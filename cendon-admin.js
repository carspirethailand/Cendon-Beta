/* ════════════════════════════════════════════════════════════════════
   Cendon Admin Panel — แผงผู้ดูแลแบบลอย (เห็นเฉพาะผู้ดูแล)
   • ปุ่มกลมลอยอยู่ทุกหน้า ลากไปวางตรงไหนก็ได้ (จำตำแหน่งไว้)
   • แตะแล้วเปิดแผง: สถานะ AI สด ทุก 5 วินาที
       - ลำดับรุ่น Gemini และตัวสำรอง: ตัวไหนใช้ได้ ตัวไหนถูกพักไว้ อีกกี่วินาทีกลับมา
       - ทุกครั้งที่ AI ตอบ: ใครถาม ใช้รุ่นไหน ลองอะไรไปบ้างตามลำดับ ใช้เวลาเท่าไร พังเพราะอะไร
       - ข้อผิดพลาดล่าสุด · สถิติชั่วโมงนี้ · คีย์ที่ตั้งไว้
   • ปุ่ม "ทดสอบทุกรุ่น" · "ปล่อยตัวที่ถูกพัก" · "คัดลอกทั้งหมด" (ส่งให้ Claude ได้เลย)
   • แท็บ Log (ทุกหน้า): การค้นสเปกรถของทุกคนจากหลังบ้าน (ทุกขั้นที่เรียก Gemini + สาเหตุจริง)
       + บันทึกของเครื่องนี้ (หน้าไหนขออะไร ได้อะไร · หลังบ้านตอบผิดพลาด · error ของหน้าเว็บ)
       + ช่องทดสอบค้นสเปกจริงจากแผงได้เลย
   • ปิด/เปิดได้ที่ ตั้งค่า (หน้าโปรไฟล์) — ผู้ใช้ทั่วไปไม่เห็นอะไรเลย
   ════════════════════════════════════════════════════════════════════ */
(function(){
"use strict";
var D=document, KEY="spire_adminPanel", POS="spire_adminPos";
var API=function(){ return window.BACKEND_URL||"https://spireonebackend.carspirethailand.workers.dev" };
function rd(k,d){try{var v=JSON.parse(localStorage.getItem(k));return v==null?d:v}catch(e){return d}}
function wr(k,v){try{localStorage.setItem(k,JSON.stringify(v))}catch(e){}}
/* ผู้ดูแลหรือไม่: ถามเซิร์ฟเวอร์ตรง ๆ (ไม่เชื่อค่าในเครื่องอย่างเดียว) แล้วจำไว้ 10 นาที
   บางหน้าเก็บข้อมูลผู้ใช้แบบไม่มีบทบาท จึงต้องถามจริง — ผู้ใช้ทั่วไปได้ 403 และไม่เห็นอะไรเลย */
var checking=false, checkUid=null, nextCheckAt=0;
function sameUser(uid){
  var u=rd("spire_cachedUser",null), a=currentAuth();
  return !!(u&&u.uid===uid&&(!a||(a.currentUser&&a.currentUser.uid===uid)));
}
function isAdmin(){
  var c=rd("spire_isAdminChk",null), u=rd("spire_cachedUser",null);
  var uid=u&&u.uid||null;
  if(checkUid!==uid){ checkUid=uid; nextCheckAt=0; data=null }
  if(c&&u&&c.uid===u.uid&&Date.now()-c.at<600000)return !!c.ok;
  if(!checking&&uid&&Date.now()>=nextCheckAt){ checking=true;
    call("/api/admin/live",null,uid)
      .then(function(j){ if(sameUser(uid)){ data=j; wr("spire_isAdminChk",{uid:uid,ok:true,at:Date.now()}) } })
      .catch(function(e){
        if(checkUid!==uid)return;
        // Only a real permission denial is cached. Slow/offline auth can retry later.
        if(e.status===403&&sameUser(uid))wr("spire_isAdminChk",{uid:uid,ok:false,at:Date.now()});
        nextCheckAt=Date.now()+(e.code==="AUTH_NOT_READY"?2000:10000);
      })
      .then(function(){ checking=false });
    // Never call boot() from this promise: an unresolved login must yield to the
    // browser. The existing 2-second timer handles both retries and repainting.
  }
  return !!(u&&(u.admin||/admin|owner/i.test(u.role||"")));
}
function enabled(){ return rd(KEY,true)!==false }
function esc(s){return String(s==null?"":s).replace(/[&<>"]/g,function(c){return{"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]})}
function ago(t){ var s=Math.max(0,Math.round((Date.now()-t)/1000)); return s<60?s+" วิ":s<3600?Math.round(s/60)+" นาที":Math.round(s/3600)+" ชม." }

var CSS=`
#cxa-fab{position:fixed;z-index:2147483000;width:46px;height:46px;border-radius:50%;display:grid;place-items:center;cursor:grab;touch-action:none;
  background:#141210;color:#F28C38;border:1px solid rgba(242,140,56,.45);box-shadow:0 10px 26px -8px rgba(0,0,0,.7);font:600 11px/1 system-ui;user-select:none}
#cxa-fab:active{cursor:grabbing}
#cxa-fab i{font-size:20px}
#cxa-fab .d{position:absolute;top:4px;right:4px;width:10px;height:10px;border-radius:50%;background:#888;border:2px solid #141210}
#cxa-fab .d.ok{background:#3FCB8A}#cxa-fab .d.warn{background:#F5B83D}#cxa-fab .d.bad{background:#F0584F;animation:cxaP 1s infinite}
@keyframes cxaP{50%{transform:scale(1.35)}}
#cxa-p{position:fixed;z-index:2147483001;width:min(420px,calc(100vw - 20px));max-height:min(78vh,680px);display:flex;flex-direction:column;
  background:#12100E;color:#EDE7E0;border:1px solid rgba(255,255,255,.1);border-radius:18px;box-shadow:0 30px 70px -20px rgba(0,0,0,.85);
  font:13px/1.5 'Kanit',system-ui,sans-serif;overflow:hidden}
#cxa-p header{display:flex;align-items:center;gap:8px;padding:11px 12px 9px;border-bottom:1px solid rgba(255,255,255,.07);cursor:move;touch-action:none}
#cxa-p header b{flex:1;font-weight:600}#cxa-p header small{color:#8F877E;font-size:11px}
#cxa-p header button{border:0;background:rgba(255,255,255,.06);color:#EDE7E0;width:28px;height:28px;border-radius:9px;cursor:pointer}
#cxa-p nav{display:flex;gap:4px;padding:8px 10px 0}
#cxa-p nav button{border:0;background:none;color:#8F877E;font:inherit;padding:6px 10px;border-radius:9px;cursor:pointer}
#cxa-p nav button.on{background:rgba(242,140,56,.15);color:#F28C38}
#cxa-b{overflow:auto;padding:10px 12px 12px}
.cxa-s{display:grid;grid-template-columns:repeat(4,1fr);gap:6px;margin-bottom:10px}
.cxa-s div{background:rgba(255,255,255,.04);border-radius:11px;padding:8px}.cxa-s small{display:block;color:#8F877E;font-size:10.5px}.cxa-s b{font-size:16px}
.cxa-h{font-size:11px;color:#8F877E;letter-spacing:.08em;text-transform:uppercase;margin:12px 2px 6px}
.cxa-r{display:flex;align-items:center;gap:8px;padding:7px 9px;border-radius:10px;background:rgba(255,255,255,.035);margin-bottom:4px}
.cxa-r .n{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.cxa-dot{width:8px;height:8px;border-radius:50%;flex:none}.g{background:#3FCB8A}.y{background:#F5B83D}.r{background:#F0584F}.x{background:#666}
.cxa-e{padding:8px 9px;border-radius:11px;background:rgba(255,255,255,.035);margin-bottom:6px}
.cxa-e .t{display:flex;gap:8px;align-items:center}.cxa-e .t span:not(.cxa-dot){flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.cxa-e .t em{font-style:normal;color:#8F877E;font-size:11px;white-space:nowrap}
.cxa-e ol{margin:6px 0 0 18px;padding:0;color:#B8AFA5;font-size:12px}.cxa-e ol li.f{color:#F0877F}.cxa-e ol li.ok{color:#7ED9A8}
.cxa-err{color:#F0877F;font-size:12px;margin-top:4px;word-break:break-word}
.cxa-btns{display:flex;flex-wrap:wrap;gap:6px;margin-top:10px}
.cxa-btns button{border:0;border-radius:10px;padding:7px 11px;font:inherit;font-size:12.5px;cursor:pointer;background:rgba(255,255,255,.07);color:#EDE7E0}
.cxa-btns button.p{background:#F28C38;color:#1A0F07;font-weight:600}
.cxa-t{display:grid;grid-template-columns:1fr 1fr 70px;gap:6px}
.cxa-t input{min-width:0;border:1px solid rgba(255,255,255,.12);background:rgba(255,255,255,.05);color:#EDE7E0;border-radius:9px;padding:7px 9px;font:inherit;font-size:12.5px}
.cxa-k{display:inline-block;font-size:10.5px;padding:1px 7px;border-radius:7px;background:rgba(255,255,255,.08);color:#CFC6BC;margin-right:4px}
.cxa-k.spec{background:rgba(242,140,56,.16);color:#F5A35C}.cxa-k.api{background:rgba(91,141,239,.18);color:#9DB8F5}.cxa-k.js{background:rgba(240,88,79,.18);color:#F0877F}
.cxa-sub{color:#8F877E;font-size:11.5px;margin-top:2px;word-break:break-word}
.cxa-pre{white-space:pre-wrap;word-break:break-word;font:11.5px/1.5 ui-monospace,Menlo,monospace;color:#CFC6BC;background:rgba(0,0,0,.3);border-radius:10px;padding:8px}
`;

var tab=rd("spire_adminTab","live"), data=null, timer=null, fab=null, pnl=null;
if(["live","models","test","log"].indexOf(tab)<0)tab="live";

/* ── บันทึกของเครื่องนี้ (ทุกหน้าใช้ร่วมกัน เก็บ 80 รายการล่าสุด) ── */
var LOGK="spire_adminLog";
function localLog(){ var a=rd(LOGK,[]); return Array.isArray(a)?a:[] }
function on(t,f){ try{ if(window.addEventListener)window.addEventListener(t,f) }catch(e){} }
function addLog(e){ var a=localLog(); a.unshift(Object.assign({at:Date.now(),page:typeof location!=="undefined"?location.pathname:""},e)); wr(LOGK,a.slice(0,80)); repaintLog() }
window.spireAdminLog=addLog;
function repaintLog(){ if(pnl&&tab==="log")paint() }
on("spire-adminlog",repaintLog);
on("storage",function(e){ if(e.key===LOGK)repaintLog() });
/* เฉพาะผู้ดูแล: จับ error ของหน้าเว็บ และคำขอไปหลังบ้านที่ไม่สำเร็จ ลงบันทึกด้วย */
function capture(){
  if(capture.on)return; capture.on=1;
  on("error",function(e){ if(!e.message)return; addLog({src:"js",msg:String(e.message).slice(0,200),err:(e.filename||"").split("/").pop()+(e.lineno?":"+e.lineno:"")}) });
  on("unhandledrejection",function(e){ var r=e.reason; addLog({src:"js",msg:"Promise: "+String(r&&r.message||r).slice(0,200)}) });
  var of=window.fetch; if(typeof of!=="function"||of.__cxa)return;
  var f=function(input,init){
    var u=String(input&&input.url||input), t0=Date.now(), p=of.apply(this,arguments);
    if(u.indexOf(API())!==0||/\/api\/admin\/live/.test(u))return p;
    var what=((init&&init.method)||(input&&input.method)||"GET")+" "+u.slice(API().length).split("?")[0];
    return p.then(function(r){
      if(!r.ok)r.clone().json().catch(function(){return {}}).then(function(j){ addLog({src:"api",msg:what,st:r.status,ms:Date.now()-t0,err:j&&j.error||""}) });
      return r },function(e){ addLog({src:"api",msg:what,ms:Date.now()-t0,err:"เชื่อมต่อไม่ได้: "+String(e&&e.message||e)}); throw e });
  };
  f.__cxa=1; window.fetch=f;
}
function currentAuth(){
  try{ return window.spireAuth||(window.firebase&&firebase.apps&&firebase.apps.length?firebase.auth():null) }catch(e){ return null }
}
function token(expectedUid){
  var a=currentAuth();
  var u=a&&a.currentUser;
  function read(x){ return x&&(!expectedUid||x.uid===expectedUid)?x.getIdToken():null }
  if(u)return read(u);
  return (window.spireAwaitUser?window.spireAwaitUser(4000):Promise.resolve(null)).then(read);
}
function call(path,opt,expectedUid,ms){
  return new Promise(function(resolve,reject){
    var done=false, controller=typeof AbortController!=="undefined"?new AbortController():null;
    function finish(fn,value){ if(done)return; done=true; clearTimeout(limit); fn(value) }
    var limit=setTimeout(function(){
      var e=new Error("ระบบตอบช้า ลองใหม่อีกครั้ง"); e.code="TIMEOUT";
      finish(reject,e); if(controller)controller.abort();
    },ms||15000);
    Promise.resolve().then(function(){ return token(expectedUid) }).then(function(t){
      if(done)return;
      if(!t||(expectedUid&&!sameUser(expectedUid))){ var e=new Error("ยังไม่ได้เข้าสู่ระบบ"); e.code="AUTH_NOT_READY"; throw e }
      var options=Object.assign({},opt||{});
      options.headers=Object.assign({},options.headers||{},{Authorization:"Bearer "+t,"Content-Type":"application/json"});
      if(controller)options.signal=controller.signal;
      return fetch(API()+path,options).then(function(r){ return r.json().then(function(j){
        if(!r.ok){ var e=new Error(j&&j.error||("HTTP "+r.status)); e.status=r.status; throw e }
        return j;
      }) });
    }).then(function(j){ finish(resolve,j) },function(e){ finish(reject,e) });
  });
}
function health(){
  if(!data)return "";
  var s=data.stats||{}; if(!data.keys.gemini)return "bad";
  if(s.hour&&s.fail/s.hour>.5)return "bad";
  if((data.parked||[]).length||s.fail)return "warn";
  if((data.specLog||[]).some(function(e){ return !e.ok&&Date.now()-e.at<3600000 }))return "warn";
  return "ok";
}
function load(){
  return call("/api/admin/live").then(function(j){ data=j; paintFab(); if(pnl)paint() })
    .catch(function(e){ data=data||null; if(pnl){ var b=D.getElementById("cxa-b"); if(b&&!data)b.innerHTML='<div class="cxa-err">โหลดไม่ได้: '+esc(e.message)+'</div>' } });
}
function paintFab(){ var d=fab&&fab.querySelector(".d"); if(d)d.className="d "+health() }

function chainHTML(){
  var h='<div class="cxa-h">Gemini (ตัวหลัก ตามลำดับที่ลอง)</div>';
  var gq=(data.parked||[]).filter(function(p){return p.key.indexOf("gemini|quota")===0})[0];
  if(gq)h+='<div class="cxa-row"><b style="color:#e5484d">โควตาคีย์ Gemini หมด</b><small>ข้าม Gemini ทั้งหมด · กลับมาลองใน '+Math.ceil((gq.backInSec||0)/60)+' นาที</small></div>';
  h+=data.chain.map(function(c){ var st=c.parked?"r":c.searchParked?"y":"g";
    return '<div class="cxa-r"><span class="cxa-dot '+st+'"></span><span class="n">'+esc(c.name)+'</span><small>'+
      (c.parked?"พักอยู่ อีก "+c.parked.backInSec+" วิ":c.searchParked?"ค้นเว็บพัก "+c.searchParked.backInSec+" วิ":"พร้อม")+'</small></div>' }).join("");
  h+='<div class="cxa-h">ตัวสำรอง</div>';
  var parked=(data.parked||[]).map(function(p){return p.key});
  var seen={};
  h+=(data.fallbacks||[]).filter(function(f){ if(seen[f.name])return false; seen[f.name]=1; return true }).map(function(f){
    var src=f.name.split(":")[0], pk=(data.parked||[]).filter(function(p){return p.key==="fb|"+src})[0];
    return '<div class="cxa-r"><span class="cxa-dot '+(pk?"r":"g")+'"></span><span class="n">'+esc(f.name)+'</span><small>'+(pk?"พัก "+pk.backInSec+" วิ":"พร้อม")+'</small></div>' }).join("")||'<div class="cxa-r"><span class="cxa-dot x"></span><span class="n">ไม่มีตัวสำรองที่ใช้ได้</span></div>';
  var k=data.keys; h+='<div class="cxa-h">คีย์ที่ตั้งไว้</div><div class="cxa-r"><span class="n">'+
    ["gemini","groq","cerebras","openrouter","workersAI"].map(function(x){return (k[x]?"✅ ":"⛔ ")+x}).join(" · ")+'</span></div>';
  return h;
}
function eventsHTML(){
  if(!data.events.length)return '<div class="cxa-r"><span class="n">ยังไม่มีการใช้งาน AI (จะขึ้นทันทีที่มีคนถาม)</span></div>';
  return data.events.map(function(e){
    return '<div class="cxa-e"><div class="t"><span class="cxa-dot '+(e.ok?"g":"r")+'"></span><span>'+esc(e.model||"ตอบไม่ได้")+'</span><em>'+(e.ms/1000).toFixed(1)+' วิ · '+ago(e.at)+'ที่แล้ว</em></div>'+
      '<div style="color:#8F877E;font-size:12px;margin-top:2px">“'+esc(e.q||"(ไฟล์แนบ)")+'” · ผู้ใช้ '+esc(e.uid)+(e.depth===0?" · โหมดเร็ว":e.depth===2?" · โหมดละเอียด":"")+(e.cost?" · "+e.cost+" โทเคน":"")+'</div>'+
      (e.trail&&e.trail.length?'<ol>'+e.trail.map(function(s){return '<li class="'+(s.ok?"ok":"f")+'">'+esc(s.model)+(s.level?" ["+s.level+"]":"")+(s.search?" +ค้น":"")+" — "+(s.ok?"ตอบได้":"พัง")+" "+(s.ms/1000).toFixed(1)+"วิ"+(s.err?": "+esc(s.err):"")+'</li>'}).join("")+'</ol>':"")+
      (e.err?'<div class="cxa-err">'+esc(e.err)+'</div>':"")+'</div>' }).join("");
}
/* ── แท็บ Log ── */
var KIND={cache:"ได้จากคลัง",wait:"มีคนกำลังค้นอยู่","failed-recent":"ไม่ค้นซ้ำ (เพิ่งพลาด < 2 นาที)",limited:"ติดโควตา",research:"ค้นใหม่",retry:"กดลองใหม่",redo:"แอดมินสั่งค้นใหม่"};
function sec(ms){ return ms==null?"":(ms/1000).toFixed(1)+" วิ" }
function trailHTML(t){
  if(!t||!t.length)return "";
  return '<ol>'+t.map(function(x){
    if(x.step==="setup")return '<li class="'+(x.ok?"ok":"f")+'">คีย์ที่ใช้: '+esc(x.keyFrom)+' · รุ่นที่จะลอง: '+esc((x.models||[]).join(" → "))+'</li>';
    var lab=(x.p?"รอบ "+x.p+" · ":"")+(x.step==="repair"?"ซ่อม JSON ":x.step==="cap"?"":"ค้นเว็บ ")+esc(x.m||"");
    var det=[x.st?"HTTP "+x.st:"",sec(x.ms),x.len!=null?"ยาว "+x.len+" ตัว":"",x.src!=null?x.src+" แหล่ง":"",x.json?"JSON: "+x.json:"",
      x.fin&&x.fin!=="STOP"?"จบเพราะ "+x.fin:"",x.retried?"ลองซ้ำแบบไม่ตั้งการคิด":""].filter(Boolean).join(" · ");
    return '<li class="'+(x.ok?"ok":"f")+'">'+lab+(det?" — "+esc(det):"")+(x.err?'<br>'+esc(x.err):"")+
      (x.head?'<br><span style="color:#8F877E">คำตอบขึ้นต้น: '+esc(x.head)+'</span>':"")+'</li>' }).join("")+'</ol>';
}
function serverLogHTML(){
  var L=(data&&data.specLog)||[];
  if(!data)return '<div class="cxa-r"><span class="n">กำลังโหลด…</span></div>';
  if(!data.specLog)return '<div class="cxa-err">หลังบ้านยังไม่ส่งบันทึกนี้ — ต้อง deploy หลังบ้านรุ่นล่าสุดก่อน</div>';
  if(!L.length)return '<div class="cxa-r"><span class="n">ยังไม่มีใครขอสเปกรถตั้งแต่ deploy ล่าสุด</span></div>';
  return L.map(function(e){
    return '<div class="cxa-e"><div class="t"><span class="cxa-dot '+(e.ok?"g":"r")+'"></span><span>'+esc(String(e.k||"").split("|").join(" "))+'</span><em>'+
      esc(KIND[e.kind]||e.kind)+' · '+sec(e.ms)+' · '+ago(e.at)+'ที่แล้ว</em></div>'+
      '<div class="cxa-sub">ผู้ใช้ '+esc(e.who||"-")+' · ผล '+esc(e.status||"-")+'</div>'+trailHTML(e.trail)+
      (e.err?'<div class="cxa-err">'+esc(e.err)+'</div>':"")+'</div>' }).join("");
}
function localLogHTML(){
  var L=localLog();
  if(!L.length)return '<div class="cxa-r"><span class="n">ยังไม่มีบันทึกในเครื่องนี้ — เปิดหน้ารถ (แท็บสเปก) แล้วจะขึ้นทันที</span></div>';
  return L.map(function(e){
    var det=[e.car,e.st?"HTTP "+e.st:"",sec(e.ms),e.auth===false?"ไม่ได้ส่งตัวตน (นับเป็นผู้ไม่ล็อกอิน)":""].filter(Boolean).join(" · ");
    return '<div class="cxa-e"><div class="t"><span class="cxa-dot '+(e.ok===true?"g":e.ok===false||e.err||e.st?"r":"x")+'"></span><span><b class="cxa-k '+esc(e.src||"")+'">'+esc(e.src||"log")+'</b>'+esc(e.msg)+'</span><em>'+ago(e.at)+'ที่แล้ว</em></div>'+
      '<div class="cxa-sub">'+esc(e.page||"")+(det?" · "+esc(det):"")+'</div>'+trailHTML(e.trace)+(e.err?'<div class="cxa-err">'+esc(e.err)+'</div>':"")+'</div>' }).join("");
}
function selCar(){
  try{ var g=rd("spire_garage",[]), id=rd("spire_selCar",""); return g.filter(function(c){return c.id===id})[0]||g[0]||null }catch(e){ return null }
}
function paintLog(b){
  if(!b.dataset.log){
    var c=selCar()||{};
    b.innerHTML='<div class="cxa-h">ทดสอบค้นสเปกจริง (ค้นใหม่ทับ · ไม่นับโควตา)</div>'+
      '<div class="cxa-t"><input id="cxa-mk" placeholder="ยี่ห้อ" value="'+esc(c.make||"")+'"><input id="cxa-md" placeholder="รุ่น" value="'+esc(c.model||"")+'"><input id="cxa-yr" placeholder="ปี" inputmode="numeric" value="'+esc(c.year||"")+'"></div>'+
      '<div class="cxa-btns"><button class="p" id="cxa-spec">ค้นตอนนี้</button><button id="cxa-cp3">คัดลอก Log ทั้งหมด (ส่งให้ Claude)</button><button id="cxa-clr">ล้างบันทึกเครื่องนี้</button></div>'+
      '<div id="cxa-sr"></div><div id="cxa-lg"></div>';
    b.dataset.log=1;
    D.getElementById("cxa-spec").onclick=specTest;
    D.getElementById("cxa-cp3").onclick=function(e){ copy(JSON.stringify({page:location.href,at:new Date().toISOString(),spec:data&&data.spec,server:data&&data.specLog,device:localLog()},null,1)); e.target.textContent="คัดลอกแล้ว ✓" };
    D.getElementById("cxa-clr").onclick=function(){ wr(LOGK,[]); paint() };
  }
  var lg=D.getElementById("cxa-lg"); if(!lg)return;
  lg.innerHTML=(data&&data.spec?'<div class="cxa-h">หลังบ้านค้นสเปกด้วย</div><div class="cxa-r"><span class="cxa-dot '+(data.spec.key?"g":"r")+'"></span><span class="n">'+
      esc(data.spec.key||"ไม่มีคีย์ Gemini!")+' · '+esc((data.spec.models||[]).join(" → "))+'</span></div>':"")+
    '<div class="cxa-h">หลังบ้าน · ทุกคน ทุกหน้า (40 ล่าสุด)</div>'+serverLogHTML()+
    '<div class="cxa-h">เครื่องนี้ · ทุกหน้า</div>'+localLogHTML();
}
function specTest(){
  var mk=D.getElementById("cxa-mk").value.trim(), md=D.getElementById("cxa-md").value.trim(), yr=D.getElementById("cxa-yr").value.trim();
  var out=D.getElementById("cxa-sr"), btn=D.getElementById("cxa-spec");
  if(!mk||!/^\d{4}$/.test(yr)){ out.innerHTML='<div class="cxa-err">ใส่ยี่ห้อและปี (4 หลัก)</div>'; return }
  btn.disabled=true; btn.textContent="กำลังค้น… (อาจถึง 90 วิ)"; var t0=Date.now();
  out.innerHTML='<div class="cxa-r"><span class="n">ส่งคำขอแล้ว รอหลังบ้านค้นเว็บสองรอบ…</span></div>';
  call("/api/car-spec",{method:"POST",body:JSON.stringify({make:mk,model:md||mk,year:yr,force:true})},null,120000)
    .then(function(j){
      addLog({src:"spec",msg:"แอดมินทดสอบค้น → "+j.status,car:[mk,md,yr].join(" "),ok:j.status==="ready"||j.status==="verified",ms:Date.now()-t0,err:j.error||"",trace:j.trace});
      out.innerHTML='<div class="cxa-e"><div class="t"><span class="cxa-dot '+(j.status==="ready"||j.status==="verified"?"g":"r")+'"></span><span>ผล: '+esc(j.status)+'</span><em>'+sec(Date.now()-t0)+'</em></div>'+
        (j.data?'<div class="cxa-sub">ตัวถัง '+esc(j.data.body||"-")+' · รุ่นย่อย '+((j.data.variants||[]).length)+' · แหล่ง '+((j.sources||[]).length)+'</div>':"")+
        trailHTML(j.trace)+(j.error?'<div class="cxa-err">'+esc(j.error)+'</div>':"")+
        (j.status==="pending"?'<div class="cxa-sub">ค้นนานเกินจะรอในคำขอเดียว — หลังบ้านทำต่อเบื้องหลัง ผลจะขึ้นในรายการด้านล่างเอง</div>':"")+'</div>';
      load();
    },function(e){
      addLog({src:"spec",msg:"แอดมินทดสอบค้น — ไม่สำเร็จ",car:[mk,md,yr].join(" "),st:e.status,err:e.message});
      out.innerHTML='<div class="cxa-err">'+esc(e.message)+(e.status===404||e.status===405?" — หลังบ้านยังไม่มีระบบนี้ (ยังไม่ได้ deploy?)":"")+'</div>';
    })
    .then(function(){ btn.disabled=false; btn.textContent="ค้นอีกครั้ง" });
}
function paint(){
  var b=D.getElementById("cxa-b"); if(!b)return;
  D.getElementById("cxa-upd").textContent=data?"อัปเดต "+new Date(data.now).toLocaleTimeString("th-TH"):"";
  D.querySelectorAll("#cxa-p nav button").forEach(function(x){x.classList.toggle("on",x.dataset.t===tab)});
  if(tab!=="log")delete b.dataset.log;
  if(tab==="log"){ delete b.dataset.test; paintLog(b); return }
  if(tab==="test"){ if(!b.dataset.test)b.innerHTML='<div class="cxa-btns"><button class="p" id="cxa-run">ทดสอบทุกรุ่นตอนนี้ (ใช้เวลา ~20 วิ)</button></div><div id="cxa-tr" style="margin-top:10px"></div>'; b.dataset.test=1; wireTest(); return }
  delete b.dataset.test;
  if(!data){ b.innerHTML='<div class="cxa-r"><span class="n">กำลังโหลด…</span></div>'; return }
  var s=data.stats||{};
  var top='<div class="cxa-s"><div><small>ชั่วโมงนี้</small><b>'+s.hour+'</b></div><div><small>สำเร็จ</small><b style="color:#7ED9A8">'+s.ok+'</b></div><div><small>ล้มเหลว</small><b style="color:#F0877F">'+s.fail+'</b></div><div><small>เฉลี่ย</small><b>'+(s.avgMs/1000).toFixed(1)+'วิ</b></div></div>';
  var le=data.lastAiError?'<div class="cxa-h">ข้อผิดพลาดล่าสุด ('+ago(data.lastAiError.at)+'ที่แล้ว)</div><div class="cxa-err">'+esc(data.lastAiError.message)+'</div>':"";
  b.innerHTML=top+(tab==="live"?eventsHTML()+le:chainHTML()+le)+
    '<div class="cxa-btns"><button id="cxa-cp">คัดลอกทั้งหมด (ส่งให้ Claude)</button>'+((data.parked||[]).length?'<button id="cxa-up">ปล่อยตัวที่ถูกพักทั้งหมด</button>':"")+'</div>';
  var cp=D.getElementById("cxa-cp"); if(cp)cp.onclick=function(){ copy(JSON.stringify(data,null,1)); cp.textContent="คัดลอกแล้ว ✓" };
  var up=D.getElementById("cxa-up"); if(up)up.onclick=function(){ up.textContent="กำลังปล่อย…"; call("/api/admin/unpark",{method:"POST",body:"{}"}).then(load) };
}
function wireTest(){
  var r=D.getElementById("cxa-run"); if(!r||r.__w)return; r.__w=1;
  r.onclick=function(){ r.disabled=true; r.textContent="กำลังทดสอบ…"; var out=D.getElementById("cxa-tr");
    call("/api/admin/diag").then(function(j){ out.innerHTML='<div class="cxa-pre">'+esc((j.providers||[]).join("\n")+"\n\n"+(j.search&&j.search.hint||""))+'</div><div class="cxa-btns"><button id="cxa-cp2">คัดลอกผลทดสอบ</button></div>';
        D.getElementById("cxa-cp2").onclick=function(){ copy(JSON.stringify(j,null,1)) } })
      .catch(function(e){ out.innerHTML='<div class="cxa-err">'+esc(e.message)+'</div>' })
      .then(function(){ r.disabled=false; r.textContent="ทดสอบอีกครั้ง" }) };
}
function copy(t){ try{ navigator.clipboard.writeText(t) }catch(e){ var a=D.createElement("textarea"); a.value=t; D.body.appendChild(a); a.select(); D.execCommand("copy"); a.remove() } }

/* ลากได้ทั้งปุ่มและแผง — แยก "ลาก" กับ "แตะ" ด้วยระยะที่ขยับ */
function draggable(el,handle,onTap,save){
  var sx,sy,ox,oy,moved=false,down=false;
  handle.addEventListener("pointerdown",function(e){ if(e.target.closest("button")&&e.target!==handle&&handle!==el)return;
    down=true; moved=false; sx=e.clientX; sy=e.clientY; var r=el.getBoundingClientRect(); ox=r.left; oy=r.top; handle.setPointerCapture(e.pointerId) });
  handle.addEventListener("pointermove",function(e){ if(!down)return; var dx=e.clientX-sx, dy=e.clientY-sy; if(Math.abs(dx)+Math.abs(dy)>5)moved=true;
    if(!moved)return; var w=el.offsetWidth,h=el.offsetHeight;
    el.style.left=Math.max(4,Math.min(innerWidth-w-4,ox+dx))+"px"; el.style.top=Math.max(4,Math.min(innerHeight-h-4,oy+dy))+"px"; el.style.right="auto"; el.style.bottom="auto" });
  handle.addEventListener("pointerup",function(){ if(!down)return; down=false; if(!moved&&onTap)onTap(); else if(save)save() });
}
function open(){
  if(pnl){ close(); return }
  pnl=D.createElement("div"); pnl.id="cxa-p";
  pnl.innerHTML='<header><b>🛠 Cendon Admin · สด</b><small id="cxa-upd"></small><button id="cxa-x" aria-label="ปิด">✕</button></header>'+
    '<nav><button data-t="live">กิจกรรม AI</button><button data-t="models">รุ่นและสถานะ</button><button data-t="test">ทดสอบ</button><button data-t="log">Log</button></nav><div id="cxa-b"></div>';
  D.body.appendChild(pnl);
  var r=fab.getBoundingClientRect(), w=pnl.offsetWidth, h=pnl.offsetHeight;
  pnl.style.left=Math.max(10,Math.min(innerWidth-w-10,r.left+r.width-w))+"px";
  pnl.style.top=(r.top>h+20?r.top-h-10:Math.min(innerHeight-h-10,r.bottom+10))+"px";
  pnl.querySelector("#cxa-x").onclick=close;
  pnl.querySelectorAll("nav button").forEach(function(b){ b.onclick=function(){ tab=b.dataset.t; wr("spire_adminTab",tab); paint() } });
  draggable(pnl,pnl.querySelector("header"));
  paint(); load(); clearInterval(timer); timer=setInterval(load,5000);
}
function close(){ if(pnl){ pnl.remove(); pnl=null } clearInterval(timer); timer=setInterval(load,30000) }

function mount(){
  if(!isAdmin()||!enabled()){ unmount(); return }
  capture();
  if(fab)return;
  if(!D.getElementById("cxa-css")){ var s=D.createElement("style"); s.id="cxa-css"; s.textContent=CSS; D.head.appendChild(s) }
  fab=D.createElement("div"); fab.id="cxa-fab"; fab.title="Cendon Admin";
  fab.innerHTML='<i class="ti ti-activity-heartbeat"></i><span class="d"></span>';
  var p=rd(POS,null);
  if(p&&p.x!=null){ fab.style.left=Math.min(innerWidth-50,p.x)+"px"; fab.style.top=Math.min(innerHeight-50,p.y)+"px" }
  else{ fab.style.right="14px"; fab.style.top="42%" }
  D.body.appendChild(fab);
  draggable(fab,fab,open,function(){ var r=fab.getBoundingClientRect(); wr(POS,{x:Math.round(r.left),y:Math.round(r.top)}) });
  load(); timer=setInterval(load,30000);
}
function unmount(){ close(); clearInterval(timer); if(fab){ fab.remove(); fab=null } }

/* สวิตช์ในหน้าตั้งค่า — ใส่แถวเพิ่มให้เองเมื่อเจอหน้าตั้งค่า (เฉพาะผู้ดูแล) */
function settingsRow(){
  if(!isAdmin())return;
  var host=D.querySelector("#v-settings .set-body, .set-main, #v-settings");
  if(!host||host.querySelector("#cxa-set")||host.offsetParent===null)return;
  var row=D.createElement("div"); row.id="cxa-set"; row.className="set-row";
  row.style.cssText="display:flex;align-items:center;gap:12px;padding:14px 15px;border-radius:14px;border:1px solid rgba(242,140,56,.35);margin:0 0 12px;cursor:pointer";
  function pnt(){ row.innerHTML='<i class="ti ti-activity-heartbeat" style="font-size:19px;color:#F28C38"></i><div class="tx" style="flex:1"><b style="display:block">แผงผู้ดูแลแบบลอย (Admin)</b><small>ดูสถานะ AI และระบบหลังบ้านแบบสดทุกหน้า · เห็นเฉพาะผู้ดูแล</small></div>'+
    '<span style="width:44px;height:26px;border-radius:13px;flex:none;position:relative;background:'+(enabled()?"#F28C38":"rgba(127,127,127,.35)")+'"><span style="position:absolute;top:3px;left:'+(enabled()?"21px":"3px")+';width:20px;height:20px;border-radius:50%;background:#fff;transition:left .2s"></span></span>' }
  pnt(); row.onclick=function(){ wr(KEY,!enabled()); pnt(); mount() };
  host.insertBefore(row,host.firstChild);
}

function boot(){ mount(); settingsRow() }
if(D.readyState==="loading")D.addEventListener("DOMContentLoaded",boot); else boot();
setInterval(boot,2000);   /* ล็อกอินเสร็จทีหลัง/เปลี่ยนหน้าในแอป ก็ยังขึ้น */
})();
