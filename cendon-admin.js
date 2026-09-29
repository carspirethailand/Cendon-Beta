/* ════════════════════════════════════════════════════════════════════
   Cendon Admin Panel — แผงผู้ดูแลแบบลอย (เห็นเฉพาะผู้ดูแล)
   • ปุ่มกลมลอยอยู่ทุกหน้า ลากไปวางตรงไหนก็ได้ (จำตำแหน่งไว้)
   • แตะแล้วเปิดแผง: สถานะ AI สด ทุก 5 วินาที
       - ลำดับรุ่น Gemini และตัวสำรอง: ตัวไหนใช้ได้ ตัวไหนถูกพักไว้ อีกกี่วินาทีกลับมา
       - ทุกครั้งที่ AI ตอบ: ใครถาม ใช้รุ่นไหน ลองอะไรไปบ้างตามลำดับ ใช้เวลาเท่าไร พังเพราะอะไร
       - ข้อผิดพลาดล่าสุด · สถิติชั่วโมงนี้ · คีย์ที่ตั้งไว้
   • ปุ่ม "ทดสอบทุกรุ่น" · "ปล่อยตัวที่ถูกพัก" · "คัดลอกทั้งหมด" (ส่งให้ Claude ได้เลย)
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
var checking=false;
function isAdmin(){
  var c=rd("spire_isAdminChk",null), u=rd("spire_cachedUser",null);
  if(c&&u&&c.uid===u.uid&&Date.now()-c.at<600000)return !!c.ok;
  if(!checking&&u&&u.uid){ checking=true;
    call("/api/admin/live").then(function(j){ data=j; wr("spire_isAdminChk",{uid:u.uid,ok:true,at:Date.now()}) })
      .catch(function(e){ if(!/ยังไม่ได้เข้าสู่ระบบ/.test(e.message))wr("spire_isAdminChk",{uid:u.uid,ok:false,at:Date.now()}) })
      .then(function(){ checking=false; boot() }) }
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
.cxa-pre{white-space:pre-wrap;word-break:break-word;font:11.5px/1.5 ui-monospace,Menlo,monospace;color:#CFC6BC;background:rgba(0,0,0,.3);border-radius:10px;padding:8px}
`;

var tab="live", data=null, timer=null, fab=null, pnl=null;
function token(){
  var a=window.spireAuth; if(!a){ try{ a=window.firebase&&firebase.apps&&firebase.apps.length?firebase.auth():null }catch(e){} }
  var u=a&&a.currentUser;
  if(u)return u.getIdToken();
  return (window.spireAwaitUser?window.spireAwaitUser(4000):Promise.resolve(null)).then(function(x){return x?x.getIdToken():null});
}
function call(path,opt){
  return token().then(function(t){ if(!t)throw new Error("ยังไม่ได้เข้าสู่ระบบ");
    return fetch(API()+path,Object.assign({headers:{Authorization:"Bearer "+t,"Content-Type":"application/json"}},opt||{}))
      .then(function(r){ return r.json().then(function(j){ if(!r.ok)throw new Error(j.error||("HTTP "+r.status)); return j }) }) });
}
function health(){
  if(!data)return "";
  var s=data.stats||{}; if(!data.keys.gemini)return "bad";
  if(s.hour&&s.fail/s.hour>.5)return "bad";
  if((data.parked||[]).length||s.fail)return "warn";
  return "ok";
}
function load(){
  return call("/api/admin/live").then(function(j){ data=j; paintFab(); if(pnl)paint() })
    .catch(function(e){ data=data||null; if(pnl){ var b=D.getElementById("cxa-b"); if(b&&!data)b.innerHTML='<div class="cxa-err">โหลดไม่ได้: '+esc(e.message)+'</div>' } });
}
function paintFab(){ var d=fab&&fab.querySelector(".d"); if(d)d.className="d "+health() }

function chainHTML(){
  var h='<div class="cxa-h">Gemini (ตัวหลัก ตามลำดับที่ลอง)</div>';
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
function paint(){
  var b=D.getElementById("cxa-b"); if(!b)return;
  D.getElementById("cxa-upd").textContent=data?"อัปเดต "+new Date(data.now).toLocaleTimeString("th-TH"):"";
  D.querySelectorAll("#cxa-p nav button").forEach(function(x){x.classList.toggle("on",x.dataset.t===tab)});
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
    '<nav><button data-t="live">กิจกรรม AI</button><button data-t="models">รุ่นและสถานะ</button><button data-t="test">ทดสอบ</button></nav><div id="cxa-b"></div>';
  D.body.appendChild(pnl);
  var r=fab.getBoundingClientRect(), w=pnl.offsetWidth, h=pnl.offsetHeight;
  pnl.style.left=Math.max(10,Math.min(innerWidth-w-10,r.left+r.width-w))+"px";
  pnl.style.top=(r.top>h+20?r.top-h-10:Math.min(innerHeight-h-10,r.bottom+10))+"px";
  pnl.querySelector("#cxa-x").onclick=close;
  pnl.querySelectorAll("nav button").forEach(function(b){ b.onclick=function(){ tab=b.dataset.t; paint() } });
  draggable(pnl,pnl.querySelector("header"));
  paint(); load(); clearInterval(timer); timer=setInterval(load,5000);
}
function close(){ if(pnl){ pnl.remove(); pnl=null } clearInterval(timer); timer=setInterval(load,30000) }

function mount(){
  if(!isAdmin()||!enabled()){ unmount(); return }
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
