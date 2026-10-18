/* ══ Cendon Valet — AI ทำงานในแอปแทนผู้ใช้ (ห้องแชต) ══
   ปุ่มรูปจับมือข้างช่องพิมพ์ → ถามก่อนว่า "ฝากกุญแจให้ Valet ไหม" → อนุญาตแล้ว AI ปิดท้ายคำตอบด้วยบล็อก [[ACT]]{...}[[/ACT]]
   ไฟล์นี้แปลงบล็อกเป็นการ์ด แล้วทำผ่าน API เดิมด้วยสิทธิ์ของบัญชีนี้เท่านั้น
   · พาไปหน้า / เปลี่ยนธีม-ภาษา = ทำทันที (ยกเลิก/ย้อนได้)
   · อะไรที่เปลี่ยนข้อมูลหรือส่งถึงคนอื่น (เพิ่มรถ เลขไมล์ ประกาศหาช่าง เรียกช่างด่วน ขอราคา ทักร้าน รับราคา/ยกเลิก/ปิดงาน
     ส่งรูป จดสมุดรถ ตั้งวันครบกำหนด สถานะร้าน) = ต้องกดยืนยันในการ์ดก่อนเสมอ แล้วส่งจริงผ่าน valet-core.js
   · ปลายทางมาจากรายการคงที่ (ไม่รับลิงก์จาก AI) · ค่าทุกช่องตรวจก่อนใช้
   · ไม่มีคำสั่งอันตราย: ลบบัญชี/ข้อมูล/รถ · รหัสผ่าน/อีเมล · จ่ายเงิน/โฆษณา · แชร์ตำแหน่งให้คนอื่น */
(function(W,D){
'use strict';
const T=(th,en)=>(W.spireT?W.spireT(th,en):((W.lang||"th")==="en"?en:th));
const esc=s=>String(s==null?"":s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const enc=encodeURIComponent;
const KEY="spire_valet";
const NAME="Cendon Valet";
const read=()=>{try{return JSON.parse(localStorage.getItem(KEY)||"null")||{}}catch(e){return {}}};
const isOn=()=>{const p=read(),uid=uidNow();return!!uid&&p.on===true&&p.uid===uid};
const cars=()=>{try{return typeof garage==="function"?garage():[]}catch(e){return []}};
const carName=c=>c?(c.name||[c.make,c.model].filter(Boolean).join(" ")):"";
const curCar=()=>{try{return typeof selCar==="function"?selCar():null}catch(e){return null}};
const uidNow=()=>{try{const a=W.spireAuth||W.auth;return a&&a.currentUser&&a.currentUser.uid||""}catch(e){return ""}};
/* เป็นช่างไหม: หน้าแรกจำไว้ตอนโหลดร้าน (ของบัญชีนี้เท่านั้น) */
const isMech=()=>{try{const p=JSON.parse(localStorage.getItem("spire_partner")||"null");return !!(p&&p.s==="shop"&&(!p.uid||p.uid===uidNow()))}catch(e){return false}};

/* ── เรียกหลังบ้านด้วยโทเคนของผู้ใช้ ── */
async function vapi(path,body,method){
  const a=W.spireAuth||W.auth;let u=a&&a.currentUser;
  if(!u&&W.spireAwaitUser)u=await W.spireAwaitUser();
  if(!u)throw new Error(T("กรุณาเข้าสู่ระบบก่อน","Please sign in first"));
  const r=await fetch(W.BACKEND_URL+path,{method:method||(body?"POST":"GET"),
    headers:Object.assign({Authorization:"Bearer "+await u.getIdToken()},body?{"Content-Type":"application/json"}:{}),
    body:body?JSON.stringify(body):undefined});
  let d=null;try{d=await r.json()}catch(e){}
  if(!r.ok)throw new Error((d&&d.error)||("HTTP "+r.status));
  return d||{};
}

/* ═══ บริบทที่ส่งไปกับข้อความ: เปิด = รายการรถ + เป็นช่างไหม · ปิด = บอกหลังบ้านว่าปิด (AI จะบอกทางเปิดเอง) ═══ */
function body(){
  if(!isOn())return {valet:false};
  return {agent:{v:1,mech:isMech(),cars:cars().slice(0,8).map(c=>({id:c.id,name:carName(c).slice(0,60),year:String(c.year||""),km:+String(c.mileage||"").replace(/[^\d]/g,"")||0}))}};
}

/* ═══ แกะบล็อกคำสั่งออกจากคำตอบ ═══ */
const ACTS=["enable","go","search","setting","add_car","car_km","car_info","pick_car","post_job","urgent","book","msg_shop","job","send_photos","jobs","log","due","shop_status"];
const one=(v,n)=>String(v==null?"":v).replace(/[\r\n\t]+/g," ").trim().slice(0,n);
const LEN={symptom:600,text:600,note:300,q:120,shop:80,title:60,phone:20};
function clean(o){
  if(!o||typeof o!=="object"||!ACTS.includes(o.do))return null;
  const a={do:o.do};
  ["to","q","key","value","make","model","year","mileage","car","km","symptom","cat","when","mode","text","state",
   "shop","op","job","note","kind","amount","litres","item","title","date","phone"].forEach(k=>{if(o[k]!=null&&o[k]!=="")a[k]=one(o[k],LEN[k]||80)});
  if(o.do==="car_info")INFO_K.forEach(k=>{if(o[k]!=null&&o[k]!=="")a[k]=one(o[k],INFO_MAX[k])});
  return a;
}
/* ข้อมูลรถที่ AI กรอกให้จากที่ผู้ใช้พูด (ช่องเดียวกับ "ข้อมูลเพิ่มเติม" ในการาจ · หลังบ้านตรวจซ้ำด้วย cleanInfo) */
const INFO_K=["trim","engine","engine_code","model_year","gear","fuel","drive","tire","vin","plate","province"];
const INFO_MAX={trim:60,engine:60,engine_code:40,model_year:4,gear:20,fuel:20,drive:20,tire:30,vin:17,plate:20,province:40};
const INFO_LBL={trim:["รุ่นย่อย / เกรด","Trim"],engine:["เครื่องยนต์","Engine"],engine_code:["รหัสเครื่องยนต์","Engine code"],model_year:["ปีรุ่น (ค.ศ.)","Model year"],
  gear:["เกียร์","Gearbox"],fuel:["เชื้อเพลิง","Fuel"],drive:["ระบบขับเคลื่อน","Drivetrain"],tire:["ขนาดยาง","Tyre size"],vin:["เลขตัวถัง (VIN)","VIN"],plate:["ทะเบียนรถ","Plate"],province:["จังหวัด","Province"]};
/* ประโยคสั่งให้ทำในแอป (ไม่ใช่แค่ถาม) — ใช้ตัดสินว่าไม่ต้องค้นร้านล่วงหน้า และ Valet ปิดอยู่ให้ขึ้นการ์ดขออนุญาตแทน */
const ACT_RE=/(ทัก|ส่งข้อความ|แชท|แจ้ง|บอก)\s*(ไป)?\s*(หา|ถึง|กับ)?\s*(ร้าน|ช่าง|อู่)|ขอ\s*(ใบ)?ราคา\s*(จาก|กับ)?\s*(ร้าน|ช่าง|อู่)|(เรียก|ตาม)\s*ช่าง|ช่างด่วน|(ประกาศ|โพสต์)\s*หาช่าง|ยกเลิก\s*(งาน|ใบงาน|นัด)|รับราคา|ปิดงาน|งานเสร็จแล้ว|เพิ่มรถ|(อัปเดต|อัพเดท|แก้|เปลี่ยน)\s*(เลข)?ไมล์|พาไป(หน้า)?|เปิดหน้า|เปลี่ยน\s*(เป็น)?\s*ธีม|ธีม(มืด|สว่าง)|จด\s*(เติม)?\s*น้ำมัน|ตั้งวัน|ส่งรูปให้ช่าง|\b(message|text|tell)\s+(the\s+)?(shop|mechanic|garage)|\bbook\b|\bcancel\s+(the\s+|my\s+)?(job|booking)|\bdark mode\b|\badd\s+(a|my)\s+car\b/i;
const denied=t=>/^(?:ช่วย\s*)?(?:อย่า|ห้าม|ไม่ต้อง|ยังไม่ต้อง|do not|don't|never)\s*(?:ทัก|ส่งข้อความ|แจ้ง|บอก|message|text|tell)/i.test(t);
function intent(text){
  const t=String(text||'').trim();if(t.length>1000||denied(t))return null;
  // A narrow, explicit command grammar. No inferred recipient, symptom or send.
  const th=t.match(/^(?:(?:ช่วย|รบกวน|ฝาก)\s*)?(?:ทัก|ส่งข้อความ|ส่งแชท|ส่งแชต|แชท|แชต)\s*(?:ไป\s*)?(?:หา|ถึง|กับ)\s*(?:ร้าน|ช่าง|อู่)?\s*(.{2,80}?)\s*(?:และ\s*)?(?:บอก|แจ้ง)(?:เขา|ช่าง|ร้าน)?\s*ว่า\s*([\s\S]{1,600})$/i);
  const en=t.match(/^(?:please\s+)?(?:message|text)\s+(?:(?:the\s+)?(?:shop|mechanic|garage)\s+)?(.{2,80}?)\s+(?:and\s+)?(?:say|saying|tell them)\s*[:,-]?\s+([\s\S]{1,600})$/i);
  const m=th||en;if(!m)return null;
  const shop=one(m[1],80),message=one(m[2],600);
  if(!shop||message.length<2||/^(?:anyone|someone|ใครก็ได้)$/i.test(shop))return null;
  return{do:'msg_shop',shop,text:message};
}
const wantsAct=t=>!denied(String(t||'').trim())&&(!!intent(t)||ACT_RE.test(String(t||"")));
function cut(txt){
  const acts=[],on=isOn();
  let text=String(txt||"").replace(/\[\[ACT\]\]([\s\S]*?)(\[\[\/ACT\]\]|$)/g,(m,j)=>{
    if(acts.length<3){try{const o=JSON.parse(j.trim());if(on){const a=clean(o);if(a)acts.push(a)}else if(o&&o.do==="enable")acts.push({do:"enable"})}catch(e){}}
    return "";
  }).replace(/\n{3,}/g,"\n\n").trim();
  /* หลังบ้านรุ่นเก่า: Valet ปิดอยู่ AI แค่บอกทางเปิด — แปลงเป็นการ์ดกดอนุญาตแล้วทำต่อ */
  if(!on&&!acts.length&&/ปุ่มรูปจับมือ|handshake button/i.test(text)){acts.push({do:"enable"});text="";}
  return {text,acts};
}
/* เก็บลงประวัติ: เฉพาะค่าเล็ก ๆ ที่จำเป็น (ไม่เก็บรูปในร่าง) */
const save=acts=>(acts||[]).map(a=>{const o={};Object.keys(a).forEach(k=>{if(k[0]!=="_")o[k]=a[k]});return o});

/* ═══ หน้าที่พาไปได้ (รายการคงที่) ═══ */
const PAGES={
  home:["หน้าหลัก","Home","/"],garage:["การาจ","Garage","/garage"],news:["นิตยสาร","Magazine","/news"],shop:["ร้านค้าอะไหล่","Parts shop","/spares"],
  profile:["โปรไฟล์และตั้งค่า","Profile & settings","/profile"],jobs:["ใบงานของฉัน","My jobs","/jobs"],map:["แผนที่ช่างรอบตัว","Mechanics map","/map"],
  help:["วิธีใช้","Help","/help"],passport:["Car Passport","Car Passport",c=>c?"/garage/"+enc(c)+"/pass":"/garage"],
  calendar:["ปฏิทินค่าใช้จ่าย","Cost calendar",c=>c?"/garage/"+enc(c)+"/cal":"/garage"],wrapped:["สรุปปีของรถ","Car Wrapped","/garage/wrapped"],
  join:["สมัครเป็นช่าง","Become a mechanic","/join"],
  studio:["Studio","Studio","/studio"],studio_find:["หางานใกล้ฉัน","Find work nearby","/work/find"],studio_messages:["ข้อความใน Studio","Studio messages","/work/messages"],
  studio_services:["บริการของร้าน","Shop services","/work/posts"],studio_shop:["ร้านของฉัน","My shop","/work/shop"],
  studio_settings:["ตั้งค่า Studio","Studio settings","/studio/settings"],studio_stats:["สถิติร้าน","Shop stats","/studio/stats"]};
function dest(a){
  if(a.do==="search")return {label:T("หาช่าง: ","Find: ")+a.q,url:"/search?q="+enc(a.q||"")};
  let k=PAGES[a.to]?a.to:null;if(!k)return null;
  if(/^studio/.test(k)&&!isMech())k="join";
  const p=PAGES[k],c=curCar(),url=typeof p[2]==="function"?p[2](c&&c.id):p[2];
  return {label:T(p[0],p[1]),url};
}
function go(url){try{W.CendonPaint&&W.CendonPaint.prepare(url)}catch(e){}location.href=url}

/* ═══ การตั้งค่าที่เปลี่ยนได้ ═══ */
const LANGS={th:"ไทย",en:"English",ja:"日本語",zh:"中文",ko:"한국어",id:"Indonesia",vi:"Tiếng Việt",ms:"Melayu",de:"Deutsch",fr:"Français",es:"Español",pt:"Português"};
const DEPTH=[["Sprint (ตอบสั้น)","Sprint (short)"],["Grand Tour (ปกติ)","Grand Tour (balanced)"],["Atelier (ละเอียด)","Atelier (in depth)"]];
function setting(a){
  if(a.key==="theme"&&/^(light|dark)$/.test(a.value))return {label:T("ธีม","Theme")+": "+(a.value==="dark"?T("มืด","Dark"):T("สว่าง","Light")),
    get:()=>(W.spireTheme&&W.spireTheme())||"dark",set:v=>{if(typeof setChatTheme==="function")setChatTheme(v);else if(W.spireSetTheme)W.spireSetTheme(v)},v:a.value};
  if(a.key==="lang"&&LANGS[a.value])return {label:T("ภาษา","Language")+": "+LANGS[a.value],get:()=>W.lang||"th",set:v=>{if(typeof setLang==="function")setLang(v)},v:a.value};
  if(a.key==="depth"&&/^[012]$/.test(a.value))return {label:T("โหมด AI","AI mode")+": "+T(...DEPTH[+a.value]),
    get:()=>W.CendonDepth?W.CendonDepth.get():1,set:v=>{if(W.CendonDepth)W.CendonDepth.set(+v)},v:+a.value};
  return null;
}

/* ═══ ย่อรูปในเครื่องก่อนส่ง (ยาวสุด 1600px JPEG) ═══ */
function shrinkImg(file,max){return new Promise((ok,no)=>{const u=URL.createObjectURL(file),im=new Image();
  im.onload=()=>{const s=Math.min(1,(max||1600)/Math.max(im.width,im.height)),c=D.createElement("canvas");c.width=Math.round(im.width*s);c.height=Math.round(im.height*s);
    c.getContext("2d").drawImage(im,0,0,c.width,c.height);URL.revokeObjectURL(u);c.toBlob(b=>b?ok(b):no(new Error("image")),"image/jpeg",.85)};
  im.onerror=()=>{URL.revokeObjectURL(u);no(new Error(T("เปิดรูปนี้ไม่ได้","Couldn't open this image")))};im.src=u})}
const b2d=b=>new Promise(ok=>{const r=new FileReader();r.onload=()=>ok(r.result);r.readAsDataURL(b)});

/* ═══ การ์ด ═══ */
const ST={done:"ti-circle-check",no:"ti-circle-x",err:"ti-alert-triangle"};
const head=(ic,t)=>`<div class="vl-h"><span class="vl-ic"><i class="ti ${ic}"></i></span><span><small>${NAME}</small><b>${t}</b></span></div>`;
const stLine=a=>a.s?`<p class="vl-st ${a.s}"><i class="ti ${ST[a.s]||"ti-info-circle"}"></i>${esc(a.r||"")}</p>`:"";
const JOBST={requested:["รอร้านเสนอราคา","Waiting for a quote"],quoted:["มีราคาแล้ว รอคุณตอบ","Quote ready"],accepted:["นัดแล้ว","Booked"],enroute:["ช่างกำลังมา","On the way"],
  working:["กำลังซ่อม","In repair"],done:["รอตรวจรับงาน","Waiting for sign-off"],disputed:["แจ้งปัญหาแล้ว","Problem reported"],completed:["เสร็จแล้ว","Completed"],cancelled:["ยกเลิกแล้ว","Cancelled"]};
/* มุมช่าง (ใบงานของร้านตัวเอง) อ่านสถานะคนละแบบ */
const JOBST_T={requested:["ต้องเสนอราคา","Send a quote"],quoted:["รอลูกค้าตอบราคา","Waiting for the customer"]};
const jobSt=j=>T(...((j.side==="technician"&&JOBST_T[j.status])||JOBST[j.status]||[j.status,j.status]));
const liveJob=j=>!["completed","cancelled"].includes(j.status);

/* ── ชิ้นส่วนฟอร์มที่ใช้ร่วมกัน (ส่งจริงผ่าน CendonValetCore) ── */
const VC=()=>W.CendonValetCore||null;
const money=n=>Number(n||0).toLocaleString(undefined,{maximumFractionDigits:2});
/* รถ: เลือกจากการาจ หรือพิมพ์เอง ("คันอื่น") */
function carH(a){const G=cars(),c=VC()?VC().findCar(a.car):curCar(),other=!c&&a.car?a.car:"";
  if(!G.length)return `<div class="vl-f"><label><span>${T("รถ","Car")}</span><input data-f="cartext" maxlength="80" value="${esc(other)}" placeholder="${T("ยี่ห้อ รุ่น ปี","Make, model, year")}"></label></div>`;
  return `<div class="vl-f"><label><span>${T("รถ","Car")}</span><select data-f="car">${G.map(x=>`<option value="${esc(x.id)}"${c&&x.id===c.id?" selected":""}>${esc(carName(x))}${x.year?" "+esc(x.year):""}</option>`).join("")}<option value=""${c?"":" selected"}>${T("คันอื่น","Another car")}</option></select></label>
    <input data-f="cartext" maxlength="80" value="${esc(other)}" placeholder="${T("ยี่ห้อ รุ่น ปี","Make, model, year")}"${c?" hidden":""}></div>`}
const locH=()=>`<div class="vl-loc" data-loc><i class="ti ti-map-pin"></i><span data-lt>${T("ยังไม่มีตำแหน่งรถ","No location yet")}</span><button type="button" class="vl-b gh sm" data-va="loc">${T("ใช้ตำแหน่งปัจจุบัน","Use my location")}</button></div>`;
const phoneH=a=>`<label><span>${T("เบอร์โทร","Phone")}</span><input data-f="phone" type="tel" inputmode="tel" maxlength="15" autocomplete="tel" value="${esc(a.phone||(VC()?VC().savedPhone():""))}" placeholder="08x xxx xxxx"></label>`;
const shopH=()=>`<div class="vl-f"><label><span>${T("ร้าน","Shop")}</span><select data-f="shop" disabled><option>${T("กำลังหาร้าน…","Finding shops…")}</option></select></label></div>`;
/* ปลายทางหลังทำเสร็จ: สร้างจากรหัสที่หลังบ้านตอบกลับ (ไม่ใช่ลิงก์จาก AI) */
function seeUrl(a){const id=/^[\w-]{1,64}$/.test(a.rid||"")?enc(a.rid):"";
  if(a.do==="log"||a.do==="due")return "/garage";if(!id)return "";
  return a.do==="post_job"||a.do==="urgent"?"/post/"+id:a.do==="msg_shop"?"/messages/"+id:"/jobs/"+id}
const seeBtn=(a,label)=>a.s==="done"&&seeUrl(a)?`<div class="vl-acts"><button type="button" class="vl-b gh" data-va="see"><i class="ti ti-arrow-right"></i>${label}</button></div>`:"";
const URG=[["ยางแตก","Flat tyre","tyre"],["แบตหมด","Dead battery","eng"],["สตาร์ทไม่ติด","Won't start","eng"],["ความร้อนขึ้น","Overheating","eng"],["น้ำมันหมด","Out of fuel","eng"],["กุญแจติดในรถ","Locked out","body"],["รถชน","Accident","body"]];
/* ใบงาน: [ไอคอน, หัวการ์ด, ปุ่ม] + สถานะที่ทำได้ (ตามกติกาหลังบ้าน) */
const JOBOP={accept:["ti-circle-check","รับราคาและนัดช่าง","Accept the quote","ยืนยันรับราคา","Accept quote"],
  cancel:["ti-circle-x","ยกเลิกใบงาน","Cancel the job","ยืนยันยกเลิก","Cancel job"],
  complete:["ti-checks","ยืนยันว่างานเสร็จ","Confirm the job is done","ยืนยันงานเสร็จ","Confirm done"],
  message:["ti-message","ส่งข้อความถึงช่าง","Message your mechanic","ส่งข้อความ","Send"]};
const LOGK={fuel:["ti-gas-station","เติมน้ำมัน","Fuel"],service:["ti-tool","ซ่อมบำรุง","Service"],trip:["ti-route","ทริป","Trip"]};
function card(m,i){
  const a=m.acts[i],id=`data-vm="${esc(m._vid)}" data-vi="${i}"`;
  const done=!!a.s;
  if(a.do==="enable"){
    return `<div class="vl vl-ask" ${id}>${head("ti-key",T("ให้ Cendon Valet ทำเรื่องนี้ให้ไหม?","Let Cendon Valet do this for you?"))}
      ${done?stLine(a):`<p class="vl-note">${T("Valet ทำในแอปแทนคุณได้ — อะไรที่ส่งถึงคนอื่นหรือเปลี่ยนข้อมูล จะขึ้นการ์ดให้คุณตรวจและกดยืนยันก่อนทุกครั้ง · ปิดได้ทุกเมื่อ","Valet can act in the app for you — anything that reaches others or changes your data shows a card for you to check and confirm first · switch it off anytime")}</p>
      <div class="vl-acts"><button type="button" class="vl-b" data-va="enable"><i class="ti ti-key"></i>${T("อนุญาตและทำต่อ","Allow and continue")}</button><button type="button" class="vl-b gh" data-va="no">${T("ไม่ใช่ตอนนี้","Not now")}</button></div>`}</div>`}
  if(a.do==="go"||a.do==="search"){const d=dest(a);if(!d)return "";
    return `<div class="vl" ${id}>${head(a.do==="search"?"ti-search":"ti-route",(a.do==="search"?"":T("พาไป ","Go to "))+esc(d.label))}
      ${a._cd&&!done?`<div class="vl-cd"><span class="vl-bar"><i style="animation-duration:${a._cd}ms"></i></span><button type="button" class="vl-b gh" data-va="stop">${T("ยกเลิก","Cancel")}</button></div>`
        :`${stLine(a)}<div class="vl-acts"><button type="button" class="vl-b" data-va="go"><i class="ti ti-arrow-right"></i>${T("ไปเลย","Go")}</button></div>`}</div>`}
  if(a.do==="setting"){const s=setting(a);if(!s)return "";
    return `<div class="vl" ${id}>${head("ti-adjustments",esc(s.label))}${stLine(a)}<div class="vl-acts">${a.s==="done"&&a._prev!=null?`<button type="button" class="vl-b gh" data-va="undo"><i class="ti ti-arrow-back-up"></i>${T("ย้อนกลับ","Undo")}</button>`
      :a.s?"":`<button type="button" class="vl-b" data-va="apply"><i class="ti ti-check"></i>${T("เปลี่ยนเลย","Apply")}</button>`}</div></div>`}
  if(a.do==="add_car"){const y=new Date().getFullYear()+1;
    return `<div class="vl" ${id}>${head("ti-car-garage",T("เพิ่มรถเข้าการาจ","Add a car to your garage"))}
      ${done?stLine(a)+(a.s==="done"&&a._id?`<div class="vl-acts"><button type="button" class="vl-b gh" data-va="pick" data-car="${esc(a._id)}"><i class="ti ti-messages"></i>${T("คุยเรื่องคันนี้","Chat about this car")}</button></div>`:""):`
      <div class="vl-f two"><label><span>${T("ยี่ห้อ","Make")}</span><input data-f="make" maxlength="40" value="${esc(a.make||"")}"></label><label><span>${T("รุ่น","Model")}</span><input data-f="model" maxlength="50" value="${esc(a.model||"")}"></label></div>
      <div class="vl-f two"><label><span>${T("ปี","Year")}</span><input data-f="year" inputmode="numeric" maxlength="4" value="${esc(a.year||"")}" placeholder="${y-1}"></label><label><span>${T("เลขไมล์ (กม.)","Mileage (km)")}</span><input data-f="mileage" inputmode="numeric" maxlength="9" value="${esc(String(a.mileage||"").replace(/[^\d]/g,""))}" placeholder="${T("ไม่บังคับ","optional")}"></label></div>
      <p class="vl-err" hidden></p><div class="vl-acts"><button type="button" class="vl-b" data-va="add"><i class="ti ti-plus"></i>${T("เพิ่มเข้าการาจ","Add to garage")}</button><button type="button" class="vl-b gh" data-va="no">${T("ไม่ใช่ตอนนี้","Not now")}</button></div>`}</div>`}
  if(a.do==="car_km"||a.do==="pick_car"){const c=cars().find(x=>x.id===a.car)||(a.do==="car_km"?curCar():null);
    if(!c)return `<div class="vl" ${id}>${head("ti-car","—")}<p class="vl-st err"><i class="ti ti-alert-triangle"></i>${T("ไม่พบรถคันนี้ในการาจ","That car isn't in your garage")}</p></div>`;
    if(a.do==="pick_car")return `<div class="vl" ${id}>${head("ti-car",T("คุยเรื่อง ","Talk about ")+esc(carName(c)))}${stLine(a)}${done?"":`<div class="vl-acts"><button type="button" class="vl-b" data-va="pick" data-car="${esc(c.id)}"><i class="ti ti-switch-horizontal"></i>${T("สลับไปคันนี้","Switch to this car")}</button></div>`}</div>`;
    const old=+String(c.mileage||"").replace(/[^\d]/g,"")||0,nw=Math.round(+String(a.km||"").replace(/[^\d.]/g,""))||0,low=old&&nw<old;
    return `<div class="vl" ${id}>${head("ti-gauge",T("อัปเดตเลขไมล์ ","Update mileage · ")+esc(carName(c)))}
      ${done?stLine(a):`<div class="vl-km"><span>${old?old.toLocaleString():"—"}</span><i class="ti ti-arrow-right"></i><b>${nw?nw.toLocaleString():"—"}</b><small>${T("กม.","km")}</small></div>
      ${low?`<p class="vl-warn"><i class="ti ti-alert-triangle"></i>${T("น้อยกว่าเลขเดิม — ตรวจให้แน่ใจก่อนยืนยัน","Lower than the current reading — double-check first")}</p>`:""}
      <div class="vl-acts"><button type="button" class="vl-b" data-va="km" data-car="${esc(c.id)}" ${nw>0&&nw<=3e6?"":"disabled"}><i class="ti ti-check"></i>${low?T("ยืนยันแม้น้อยกว่าเดิม","Confirm anyway"):T("ยืนยัน","Confirm")}</button><button type="button" class="vl-b gh" data-va="no">${T("ไม่ใช่ตอนนี้","Not now")}</button></div>`}</div>`}
  /* บันทึกข้อมูลรถที่ผู้ใช้บอก: เห็นทุกช่องที่จะบันทึก แก้ได้ก่อนกด · ไม่มีช่องไหน = ไม่มีปุ่ม */
  if(a.do==="car_info"){const c=cars().find(x=>x.id===a.car)||curCar(),F=INFO_K.filter(k=>a[k]);
    if(!c)return `<div class="vl" ${id}>${head("ti-car","—")}<p class="vl-st err"><i class="ti ti-alert-triangle"></i>${T("ไม่พบรถคันนี้ในการาจ","That car isn't in your garage")}</p></div>`;
    return `<div class="vl" ${id}>${head("ti-file-text",T("บันทึกข้อมูลรถ · ","Save car details · ")+esc(carName(c)))}
      ${done?stLine(a):F.length?`${F.map(k=>`<div class="vl-f"><label><span>${T(INFO_LBL[k][0],INFO_LBL[k][1])}</span><input data-f="${k}" maxlength="${INFO_MAX[k]}" value="${esc(a[k])}"></label></div>`).join("")}
      <p class="vl-warn" style="color:inherit;opacity:.7"><i class="ti ti-info-circle"></i>${T("ตรวจให้ตรงก่อนบันทึก แก้ในช่องได้ · ข้อมูลเดิมช่องอื่นไม่เปลี่ยน","Check before saving — you can edit · other saved details stay as they are")}</p><p class="vl-err" hidden></p>
      <div class="vl-acts"><button type="button" class="vl-b" data-va="info" data-car="${esc(c.id)}"><i class="ti ti-check"></i>${T("บันทึก","Save")}</button><button type="button" class="vl-b gh" data-va="no">${T("ไม่ใช่ตอนนี้","Not now")}</button></div>`
      :`<p class="vl-st err"><i class="ti ti-alert-triangle"></i>${T("ยังไม่มีข้อมูลรถให้บันทึก","No car details to save")}</p>`}</div>`}
  if(a.do==="post_job"){const when=a.when||T("วันนี้","Today"),mode=a.mode==="shop"?"shop":"mobile";
    return `<div class="vl" ${id}>${head("ti-speakerphone",T("ประกาศหาช่าง (ไม่ด่วน)","Post a job (not urgent)"))}
      ${done?stLine(a)+seeBtn(a,T("ดูข้อเสนอจากช่าง","See offers")):`${carH(a)}
      <div class="vl-f"><label><span>${T("อาการ","Symptom")}</span><textarea data-f="symptom" rows="2" maxlength="600">${esc(a.symptom||"")}</textarea></label></div>
      <div class="vl-f two"><label><span>${T("เมื่อไร","When")}</span><input data-f="when" maxlength="60" value="${esc(when)}"></label>
        <label><span>${T("ซ่อมที่ไหน","Where")}</span><select data-f="mode"><option value="mobile"${mode==="mobile"?" selected":""}>${T("ให้ช่างมาหา","Come to me")}</option><option value="shop"${mode==="shop"?" selected":""}>${T("เอารถเข้าอู่","At the garage")}</option></select></label></div>
      ${locH()}<div class="vl-f">${phoneH(a)}</div>
      <div class="vl-ph" data-ph></div><input type="file" accept="image/*" multiple hidden data-file data-nocrop>
      <p class="vl-note"><i class="ti ti-lock"></i>${T("ช่างรอบตัวเห็นแค่ย่านกับอาการ — เบอร์กับที่อยู่เปิดให้ร้านที่คุณรับราคาเท่านั้น","Nearby mechanics see only the area and problem — your phone and address go only to the shop whose quote you accept")}</p>
      <p class="vl-err" hidden></p><div class="vl-acts"><button type="button" class="vl-b" data-va="post"><i class="ti ti-send"></i>${T("ประกาศหาช่างเลย","Post it now")}</button><button type="button" class="vl-b gh" data-va="addph"><i class="ti ti-camera-plus"></i>${T("แนบรูป","Photos")}</button></div>`}</div>`}
  if(a.do==="urgent")return `<div class="vl vl-red" ${id}>${head("ti-urgent",T("เรียกช่างด่วน","Urgent call-out"))}
      ${done?stLine(a)+seeBtn(a,T("ดูช่างที่ตอบรับ","See who's coming")):`<p class="vl-sos"><i class="ti ti-phone"></i><span>${T("มีคนเจ็บหรือไม่ปลอดภัย โทร","Injured or unsafe? Call")} <a href="tel:1669">1669</a> · <a href="tel:191">191</a> · <a href="tel:1193">1193</a> ${T("ก่อน","first")}</span></p>
      ${carH(a)}
      <div class="vl-f"><label><span>${T("เกิดอะไรขึ้น","What happened")}</span><input data-f="symptom" maxlength="300" value="${esc(a.symptom||"")}" placeholder="${T("เช่น ยางแตก แบตหมด","e.g. flat tyre, dead battery")}"></label></div>
      <div class="vl-chips">${URG.map(x=>`<button type="button" data-va="chip" data-t="${esc(T(x[0],x[1]))}" data-c="${x[2]}">${T(x[0],x[1])}</button>`).join("")}</div>
      ${locH()}<div class="vl-f">${phoneH(a)}</div>
      <p class="vl-err" hidden></p><div class="vl-acts"><button type="button" class="vl-b red" data-va="urg"><i class="ti ti-urgent"></i>${T("เรียกช่างด่วนเลย","Call a mechanic now")}</button><button type="button" class="vl-b gh" data-va="urgfull"><i class="ti ti-car-crash"></i>${T("โหมดอุบัติเหตุ","Accident mode")}</button></div>`}</div>`;
  if(a.do==="book"){const when=a.when||T("วันนี้","Today"),mode=a.mode==="mobile"?"mobile":"shop";
    return `<div class="vl" ${id}>${head("ti-file-dollar",T("ขอราคาจากร้าน","Ask a shop for a quote"))}
      ${done?stLine(a)+seeBtn(a,T("เปิดใบงาน","Open the job")):`${shopH()}${carH(a)}
      <div class="vl-f"><label><span>${T("อาการ","Symptom")}</span><textarea data-f="symptom" rows="2" maxlength="600">${esc(a.symptom||"")}</textarea></label></div>
      <div class="vl-f two"><label><span>${T("เมื่อไร","When")}</span><input data-f="when" maxlength="60" value="${esc(when)}"></label>
        <label><span>${T("ซ่อมที่ไหน","Where")}</span><select data-f="mode"><option value="shop"${mode==="shop"?" selected":""}>${T("เอารถเข้าอู่","At the garage")}</option><option value="mobile"${mode==="mobile"?" selected":""}>${T("ให้ช่างมาหา","Come to me")}</option></select></label></div>
      ${locH()}<div class="vl-f">${phoneH(a)}</div>
      <div class="vl-ph" data-ph></div><input type="file" accept="image/*" multiple hidden data-file data-nocrop>
      <p class="vl-note"><i class="ti ti-info-circle"></i>${T("ร้านจะส่งราคามาให้ก่อน — ยังไม่ใช่การจ้าง คุณเลือกรับราคาเองทีหลัง","The shop sends a quote first — this isn't a booking yet; you decide after")}</p>
      <p class="vl-err" hidden></p><div class="vl-acts"><button type="button" class="vl-b" data-va="book" disabled><i class="ti ti-send"></i>${T("ส่งคำขอราคา","Send the request")}</button><button type="button" class="vl-b gh" data-va="addph"><i class="ti ti-camera-plus"></i>${T("แนบรูป","Photos")}</button></div>`}</div>`}
  if(a.do==="msg_shop")return `<div class="vl" ${id}>${head("ti-message-circle",T("ทักร้าน","Message a shop"))}
      ${done?stLine(a)+seeBtn(a,T("เปิดแชตกับร้าน","Open the chat")):`${shopH()}
      <div class="vl-f"><label><span>${T("ข้อความ","Message")}</span><textarea data-f="text" rows="2" maxlength="600">${esc(a.text||"")}</textarea></label></div>
      <p class="vl-err" hidden></p><div class="vl-acts"><button type="button" class="vl-b" data-va="msg" disabled><i class="ti ti-send"></i>${T("ส่งข้อความ","Send")}</button></div>`}</div>`;
  if(a.do==="job"){const op=JOBOP[a.op]?a.op:"message",L=JOBOP[op];
    return `<div class="vl${op==="cancel"?" vl-red":""}" ${id}>${head(L[0],T(L[1],L[2]))}
      ${done?stLine(a)+seeBtn(a,T("เปิดใบงาน","Open the job")):`<div class="vl-f"><label><span>${T("ใบงาน","Job")}</span><select data-f="job" disabled><option>${T("กำลังโหลดใบงาน…","Loading jobs…")}</option></select></label></div>
      ${op==="accept"?`<div class="vl-q" data-q hidden></div><label class="vl-ck"><input type="checkbox" data-f="consent"><span>${T("ยอมรับขอบเขตงานและราคา ยินยอมเปิดเบอร์โทรและที่อยู่ให้ร้านนี้เพื่อนัดซ่อม","I accept the scope and price, and agree to share my phone and address with this shop to arrange the repair")}</span></label>
        <p class="vl-note"><i class="ti ti-cash"></i>${T("ยังไม่มีการตัดเงินผ่าน Cendon — ชำระกับช่างโดยตรงตามที่ตกลง","Cendon doesn't take payment — you pay the mechanic directly as agreed")}</p>`:""}
      ${op==="cancel"?`<div class="vl-f"><label><span>${T("เหตุผลที่ยกเลิก","Reason")}</span><textarea data-f="note" rows="2" maxlength="300">${esc(a.note||"")}</textarea></label></div>`:""}
      ${op==="message"?`<div class="vl-f"><label><span>${T("ข้อความถึงช่าง","Message")}</span><input data-f="text" maxlength="600" value="${esc(a.text||"")}"></label></div>`:""}
      ${op==="complete"?`<p class="vl-note"><i class="ti ti-eye-check"></i>${T("ตรวจรถให้เรียบร้อยก่อนยืนยัน — ยืนยันแล้วใบงานปิดและให้คะแนนช่างได้","Check the car first — confirming closes the job and lets you rate the mechanic")}</p>`:""}
      <p class="vl-err" hidden></p><div class="vl-acts"><button type="button" class="vl-b${op==="cancel"?" red":""}" data-va="jobdo" disabled><i class="ti ${L[0]}"></i>${T(L[3],L[4])}</button><button type="button" class="vl-b gh" data-va="no">${T("ไม่ใช่ตอนนี้","Not now")}</button></div>`}</div>`}
  if(a.do==="log"){const k=LOGK[a.kind]?a.kind:"fuel",G=cars(),c=VC()?VC().findCar(a.car):curCar(),d=VC()&&VC().okDate(a.date)?a.date:(VC()?VC().today():""),SVC=VC()?VC().SVC:{};
    const num=(f,lab,v,ph)=>`<label><span>${lab}</span><input data-f="${f}" inputmode="decimal" maxlength="9" value="${esc(String(v||"").replace(/[^\d.]/g,""))}"${ph?` placeholder="${ph}"`:""}></label>`;
    return `<div class="vl" ${id}>${head(LOGK[k][0],T("จดสมุดรถ · ","Logbook · ")+T(LOGK[k][1],LOGK[k][2]))}
      ${done?stLine(a)+seeBtn(a,T("เปิดการาจ","Open garage")):!G.length?`<p class="vl-st err"><i class="ti ti-alert-triangle"></i>${T("ยังไม่มีรถในการาจ","No cars in your garage yet")}</p>`:`
      <div class="vl-f"><label><span>${T("รถ","Car")}</span><select data-f="car">${G.map(x=>`<option value="${esc(x.id)}"${c&&x.id===c.id?" selected":""}>${esc(carName(x))}${x.year?" "+esc(x.year):""}</option>`).join("")}</select></label></div>
      ${k==="fuel"?`<div class="vl-f two">${num("amount",T("ยอดเติม (บาท)","Amount (฿)"),a.amount)}${num("litres",T("ลิตร","Litres"),a.litres,T("ไม่บังคับ","optional"))}</div><div class="vl-f two">${num("km",T("เลขไมล์","Odometer"),a.km,T("ไม่บังคับ","optional"))}<label><span>${T("วันที่","Date")}</span><input data-f="date" type="date" value="${esc(d)}"></label></div>`:""}
      ${k==="service"?`<div class="vl-f"><label><span>${T("รายการ","Service")}</span><select data-f="item">${Object.keys(SVC).map(x=>`<option value="${x}"${x===a.item?" selected":""}>${T(SVC[x][0],SVC[x][1])}</option>`).join("")}</select></label></div><div class="vl-f two">${num("km",T("เลขไมล์ตอนทำ","Odometer"),a.km)}${num("amount",T("ค่าใช้จ่าย (บาท)","Cost (฿)"),a.amount,T("ไม่บังคับ","optional"))}</div><div class="vl-f"><label><span>${T("วันที่","Date")}</span><input data-f="date" type="date" value="${esc(d)}"></label></div>`:""}
      ${k==="trip"?`<div class="vl-f"><label><span>${T("ชื่อทริป","Trip")}</span><input data-f="title" maxlength="60" value="${esc(a.title||"")}"></label></div><div class="vl-f two">${num("km",T("ระยะทาง (กม.)","Distance (km)"),a.km)}<label><span>${T("วันที่","Date")}</span><input data-f="date" type="date" value="${esc(d)}"></label></div>`:""}
      <p class="vl-err" hidden></p><div class="vl-acts"><button type="button" class="vl-b" data-va="log"><i class="ti ti-check"></i>${T("บันทึก","Save")}</button><button type="button" class="vl-b gh" data-va="no">${T("ไม่ใช่ตอนนี้","Not now")}</button></div>`}</div>`}
  if(a.do==="due"){const G=cars(),c=VC()?VC().findCar(a.car):curCar(),DUE=VC()?VC().DUE:{},k=DUE[a.key]?a.key:"tax",d=VC()&&VC().okDate(a.date)?a.date:"";
    return `<div class="vl" ${id}>${head("ti-calendar-due",T("ตั้งวันครบกำหนด","Set a due date"))}
      ${done?stLine(a)+seeBtn(a,T("เปิดการาจ","Open garage")):!G.length?`<p class="vl-st err"><i class="ti ti-alert-triangle"></i>${T("ยังไม่มีรถในการาจ","No cars in your garage yet")}</p>`:`
      <div class="vl-f"><label><span>${T("รถ","Car")}</span><select data-f="car">${G.map(x=>`<option value="${esc(x.id)}"${c&&x.id===c.id?" selected":""}>${esc(carName(x))}${x.year?" "+esc(x.year):""}</option>`).join("")}</select></label></div>
      <div class="vl-f two"><label><span>${T("เรื่อง","What")}</span><select data-f="key">${Object.keys(DUE).map(x=>`<option value="${x}"${x===k?" selected":""}>${T(DUE[x][0],DUE[x][1])}</option>`).join("")}</select></label>
        <label><span>${T("ครบกำหนด","Due on")}</span><input data-f="date" type="date" value="${esc(d)}"></label></div>
      <p class="vl-err" hidden></p><div class="vl-acts"><button type="button" class="vl-b" data-va="due"><i class="ti ti-check"></i>${T("ตั้งวันที่","Set date")}</button><button type="button" class="vl-b gh" data-va="no">${T("ไม่ใช่ตอนนี้","Not now")}</button></div>`}</div>`}
  if(a.do==="send_photos")return `<div class="vl" ${id}>${head("ti-photo-up",T("ส่งรูปให้ช่าง","Send photos to your mechanic"))}
      ${done?stLine(a)+(a.s==="done"&&a._job?`<div class="vl-acts"><button type="button" class="vl-b gh" data-va="open" data-job="${esc(a._job)}"><i class="ti ti-message-circle"></i>${T("เปิดแชตใบงาน","Open the job chat")}</button></div>`:""):`
      <div class="vl-f"><label><span>${T("ใบงาน","Job")}</span><select data-f="job" disabled><option>${T("กำลังโหลดใบงาน…","Loading jobs…")}</option></select></label></div>
      <div class="vl-f"><label><span>${T("ข้อความถึงช่าง","Message")}</span><input data-f="text" maxlength="300" value="${esc(a.text||"")}" placeholder="${T("เช่น รูปจุดที่รั่วครับ","e.g. here's the leak")}"></label></div>
      <div class="vl-ph" data-ph></div><input type="file" accept="image/*" multiple hidden data-file data-nocrop>
      <p class="vl-err" hidden></p><div class="vl-acts"><button type="button" class="vl-b gh" data-va="addph"><i class="ti ti-camera-plus"></i>${T("เลือกรูป","Pick photos")}</button><button type="button" class="vl-b" data-va="send" disabled><i class="ti ti-send"></i>${T("ส่งให้ช่าง","Send")}</button></div>`}</div>`;
  if(a.do==="jobs")return `<div class="vl" ${id}>${head("ti-clipboard-list",T("ใบงานล่าสุด","Your latest jobs"))}<div class="vl-list" data-jobs><p class="vl-note">${T("กำลังโหลด…","Loading…")}</p></div></div>`;
  if(a.do==="shop_status"){const L={on:["เปิดรับงาน (แจ้งเตือนทันที)","Taking jobs (alerts on)"],quiet:["รับงาน ไม่แจ้งเตือน","Taking jobs, no alerts"],pause:["พักร้านชั่วคราว","Paused"]}[a.state];
    if(!L||!isMech())return "";
    return `<div class="vl" ${id}>${head("ti-building-store",T("สถานะร้าน: ","Shop status: ")+T(...L))}${stLine(a)}${done?"":`<div class="vl-acts"><button type="button" class="vl-b" data-va="shop"><i class="ti ti-check"></i>${T("ยืนยัน","Confirm")}</button><button type="button" class="vl-b gh" data-va="no">${T("ไม่ใช่ตอนนี้","Not now")}</button></div>`}</div>`}
  return "";
}
let VID=0;
function html(m){
  if(!m||!m.acts||!m.acts.length)return "";
  if(!m._vid)m._vid="v"+(++VID);
  const h=m.acts.map((a,i)=>card(m,i)).join("");
  return h?`<div class="vl-wrap">${h}</div>`:"";
}

/* ═══ การกระทำ ═══ */
const msgOf=id=>(typeof messages!=="undefined"?messages:[]).find(m=>m._vid===id);
function finish(m,a,s,r){a.s=s;a.r=r;a._cd=0;try{saveSession()}catch(e){}repaint(m)}
function repaint(m){
  const el=D.querySelector(`.vl-wrap [data-vm="${m._vid}"]`);const wrap=el&&el.closest(".vl-wrap");
  if(wrap){const t=D.createElement("div");t.innerHTML=html(m);const n=t.firstElementChild;if(n){n.dataset.h=1;wrap.replaceWith(n);hydrate(n,m)}}
}
function errOn(el,msg){const e=el.querySelector(".vl-err");if(e){e.hidden=!msg;e.textContent=msg||""}}
async function busyBtn(btn,fn){if(btn.disabled)return;const h=btn.innerHTML;btn.disabled=true;btn.innerHTML='<i class="ti ti-loader-2 vl-spin"></i>';try{await fn()}finally{if(btn.isConnected){btn.disabled=false;btn.innerHTML=h}}}

/* รูปที่แนบในการ์ด (ร่างโพสต์ / ส่งให้ช่าง) — อยู่ในหน่วยความจำ ไม่เก็บลงประวัติ */
function drawPh(el,a){const box=el.querySelector("[data-ph]");if(!box)return;const P=a._ph||[];
  box.innerHTML=P.map((p,i)=>`<span class="vl-pi"><img src="${p.url}" alt=""><button type="button" data-va="rmph" data-i="${i}" aria-label="${T("ลบรูป","Remove")}"><i class="ti ti-x"></i></button></span>`).join("");
  box.hidden=!P.length;const s=el.querySelector('[data-va="send"]');if(s&&a.do==="send_photos")s.disabled=!P.length||!el.querySelector('[data-f="job"]').value}

/* ตำแหน่งรถ: GPS ของเครื่อง (ผู้ใช้กดเอง หรือการ์ดด่วนขอให้ทันที) — ชื่อย่านแสดงให้ตรวจก่อนส่ง */
function drawLoc(el,a){const b=el.querySelector("[data-loc]");if(!b)return;const t=b.querySelector("[data-lt]"),btn=b.querySelector('[data-va="loc"]');
  b.classList.toggle("ok",!!a._pos);b.classList.toggle("bad",!a._pos&&!!a._locErr);
  t.textContent=a._pos?(a._place||T("ตำแหน่งปัจจุบันของคุณ","Your current location")):(a._locErr||T("ยังไม่มีตำแหน่งรถ","No location yet"));
  if(btn&&!btn.disabled)btn.innerHTML=a._pos?T("อัปเดต","Refresh"):T("ใช้ตำแหน่งปัจจุบัน","Use my location");
  let f=b.querySelector('[data-va="form"]');
  if(!a._pos&&a._locErr&&(a.do==="post_job"||a.do==="book")&&!f){f=D.createElement("button");f.type="button";f.className="vl-b gh sm";f.dataset.va="form";f.textContent=T("ปักหมุดเองในฟอร์ม","Pin it on the form");b.appendChild(f)}
  else if(f&&a._pos)f.remove()}
async function getLoc(el,a){
  if(!VC())return null;const p=await VC().here(12000);
  if(!p){a._locErr=T("ยังไม่ได้ตำแหน่ง — อนุญาตตำแหน่งในเบราว์เซอร์ แล้วกดอีกครั้ง","No location yet — allow location access, then tap again");drawLoc(el,a);errOn(el,a._locErr);return null}
  a._pos=p;a._locErr="";a._place="";drawLoc(el,a);
  VC().revgeo(p).then(g=>{a._place=[g.line,g.area].filter(Boolean).join(" · ");drawLoc(el,a)}).catch(()=>{});
  return p}
function carOf(el){const s=el.querySelector('[data-f="car"]');if(s&&s.value){const c=cars().find(x=>x.id===s.value);if(c)return [carName(c),c.year].filter(Boolean).join(" ")}
  const t=el.querySelector('[data-f="cartext"]');return t?t.value.trim():""}
function shopOf(el,a){const s=el.querySelector('[data-f="shop"]');return s&&s.value?(a._shops||[]).find(t=>String(t.id)===s.value)||null:null}
const vErr=e=>e&&e.issues?T("ยังขาด: ","Still needed: ")+e.issues.join(" · "):(e&&e.message)||T("ทำไม่สำเร็จ ลองใหม่อีกครั้ง","That didn't work — try again");
function reachMsg(n,urgent){
  if(urgent)return n>0?T(`แจ้งช่างด่วน ${n} ร้านรอบตัวแล้ว — รอช่างตอบรับ อยู่ในที่ปลอดภัยไว้ก่อนนะ`,`Alerted ${n} nearby shop${n>1?"s":""} — wait somewhere safe for a reply`)
    :n===0?T("ส่งคำขอด่วนแล้ว แต่ตอนนี้ยังไม่มีร้านในรัศมี — ร้านที่ออนไลน์เข้ามาจะเห็นทันที หรือโทรประกัน/1193","Sent, but no shops are in range right now — new shops coming online will see it; or call your insurer / 1193")
    :T("ส่งคำขอด่วนแล้ว — รอช่างตอบรับ","Urgent request sent — waiting for a mechanic");
  return n>0?T(`ประกาศแล้ว — ส่งถึงช่าง ${n} ร้านรอบตัว รอข้อเสนอราคา`,`Posted — ${n} nearby shop${n>1?"s":""} can see it; offers will come in`)
    :T("ประกาศแล้ว — ร้านในรัศมีที่เข้ามาจะเห็นและเสนอราคาได้","Posted — shops in range will see it and can send offers")}
/* ปักหมุดเองไม่ได้ในการ์ด → ส่งร่างไปฟอร์มประกาศเต็ม (เลือกจุดบนแผนที่ได้) */
async function toForm(el,a){
  const v=f=>{const x=el.querySelector(`[data-f="${f}"]`);return x?x.value.trim():""};
  const carId=v("car"),c=cars().find(x=>x.id===carId);
  const photos=[];for(const p of (a._ph||[]).slice(0,3))photos.push(await b2d(p.blob));
  const d={at:Date.now(),sym:v("symptom"),cat:["air","eng","tyre","ev","body"].includes(a.cat)?a.cat:"",carId:c?c.id:undefined,car:c?undefined:(v("cartext")||a.car||""),when:v("when"),mode:v("mode")==="shop"?"shop":"mobile",photos};
  try{sessionStorage.setItem("spire_postDraft",JSON.stringify(d))}catch(e){d.photos=[];try{sessionStorage.setItem("spire_postDraft",JSON.stringify(d))}catch(e2){}}
  finish(MSG(el),a,"no",T("ส่งร่างไปฟอร์มประกาศแล้ว","Draft moved to the post form"));go("/post")}
const MSG=el=>msgOf(el.dataset.vm);

async function act(btn){
  const el=btn.closest(".vl"),m=msgOf(el.dataset.vm),i=+el.dataset.vi,a=m&&m.acts[i],k=btn.dataset.va;if(!a)return;
  const v=f=>{const x=el.querySelector(`[data-f="${f}"]`);return x?x.value.trim():""};
  if(k==="stop"){clearTimeout(a._t);finish(m,a,"no",T("ยกเลิกแล้ว","Cancelled"));return}
  if(k==="go"){const d=dest(a);if(d)go(d.url);return}
  if(k==="no"){finish(m,a,"no",T("ไม่ได้ทำ","Skipped"));return}
  if(k==="apply"||k==="undo"){const s=setting(a);if(!s)return;
    if(k==="apply"){a._prev=s.get();s.set(s.v);finish(m,a,"done",T("เปลี่ยนแล้ว","Done"))}else{s.set(a._prev);a._prev=null;finish(m,a,"no",T("ย้อนกลับแล้ว","Undone"))}return}
  if(k==="pick"){try{pickCar(btn.dataset.car)}catch(e){}return}
  if(k==="open"){go("/jobs/"+enc(btn.dataset.job)+"/chat");return}
  /* อนุญาต Valet แล้วทำคำขอเดิมต่อทันที (ไม่ต้องพิมพ์ใหม่) */
  if(k==="enable"){
    localStorage.setItem(KEY,JSON.stringify({on:true,uid:uidNow(),at:Date.now()}));paintBtns();
    const list=typeof messages!=="undefined"?messages:[],mi=list.indexOf(m),prev=mi>0?list[mi-1]:null,q=a.text||(prev&&prev.role==="user"?prev.text:"");
    if(mi>=0)list.splice(mi,1);if(prev&&prev.role==="user"&&prev.text===q)list.splice(list.indexOf(prev),1);
    try{saveSession()}catch(e){}try{renderMessages()}catch(e){}
    const inp=D.getElementById("inp");if(q&&inp&&typeof sendMsg==="function"){inp.value=q;sendMsg()}
    try{toast(T("Valet พร้อมแล้ว","Valet is on"),"ti-key")}catch(e){}
    return}
  if(k==="urgfull"){go("/urgent");return}
  if(k==="form"){toForm(el,a);return}
  if(k==="see"){const u=seeUrl(a);if(u)go(u);return}
  if(k==="loc")return busyBtn(btn,()=>getLoc(el,a)).then(()=>drawLoc(el,a));
  if(k==="chip"){const x=el.querySelector('[data-f="symptom"]');if(x){x.value=btn.dataset.t;a._cat=btn.dataset.c}
    el.querySelectorAll(".vl-chips button").forEach(b=>b.classList.toggle("on",b===btn));return}
  if(k==="addph"){el.querySelector("[data-file]").click();return}
  if(k==="rmph"){(a._ph||[]).splice(+btn.dataset.i,1);drawPh(el,a);return}
  if(k==="add")return busyBtn(btn,async()=>{
    const make=v("make"),model=v("model"),year=v("year"),km=v("mileage").replace(/[^\d]/g,""),y=new Date().getFullYear()+1;
    if(make.length<2||model.length<1)return errOn(el,T("ใส่ยี่ห้อและรุ่นก่อน","Enter the make and model"));
    if(!/^\d{4}$/.test(year)||+year<1950||+year>y)return errOn(el,T(`ปีรถต้องอยู่ระหว่าง 1950–${y}`,`Year must be 1950–${y}`));
    if(km&&+km>3e6)return errOn(el,T("เลขไมล์มากเกินจริง","That mileage looks too high"));
    errOn(el,"");
    let id="c"+Date.now();
    if(typeof carsAreRemote==="function"&&carsAreRemote()){const r=await vapi("/api/cars",{make,model,year,mileage:km||"-"});if(r&&r.id)id=r.id}
    const g=garage();g.push({id,make,model,name:(make+" "+model).trim(),year,mileage:km||"-",type:"sedan",color:"#FFFFFF",history:[]});saveGarage(g);
    try{W.CarSpec&&W.CarSpec.ensure({id,make,model,year}).catch(()=>{})}catch(e){}
    try{typeof renderCarUI==="function"&&renderCarUI()}catch(e){}
    a._id=id;finish(m,a,"done",T(`เพิ่ม ${make} ${model} ${year} เข้าการาจแล้ว`,`Added ${make} ${model} ${year} to your garage`));
  }).catch(e=>errOn(el,e.message));
  if(k==="info")return busyBtn(btn,async()=>{
    const g=garage(),c=g.find(x=>x.id===btn.dataset.car);if(!c)return;
    const add={};INFO_K.forEach(f=>{const x=el.querySelector(`[data-f="${f}"]`);if(x&&x.value.trim())add[f]=x.value.trim().slice(0,INFO_MAX[f])});
    if(add.vin){add.vin=add.vin.toUpperCase().replace(/[\s-]/g,"");if(!/^[A-HJ-NPR-Z0-9]{17}$/.test(add.vin))throw new Error(T("เลขตัวถัง (VIN) ต้องมี 17 ตัว ไม่มี I O Q","A VIN has 17 characters, no I, O or Q"))}
    if(add.model_year&&!(/^\d{4}$/.test(add.model_year)&&+add.model_year>=1950&&+add.model_year<=new Date().getFullYear()+1))throw new Error(T("ปีรุ่นไม่ถูกต้อง","That model year doesn't look right"));
    if(!Object.keys(add).length)return;
    if(!VC())throw Error(T('อัปเดตหน้าเว็บก่อนบันทึก','Update the app before saving'));
    await VC().setInfo(c.id,add,{allowPrivate:true});
    c.info={...(c.info||{}),...add};
    try{W.CarSpec&&W.CarSpec.ensure({id:c.id,make:c.make,model:c.model,year:c.year,info:c.info}).catch(()=>{})}catch(e){}
    try{typeof renderCarUI==="function"&&renderCarUI()}catch(e){}
    finish(m,a,"done",T(`บันทึกข้อมูล ${carName(c)} แล้ว (${Object.keys(add).length} ช่อง)`,`Saved ${Object.keys(add).length} detail${Object.keys(add).length>1?"s":""} for ${carName(c)}`));
  }).catch(e=>errOn(el,e.message));
  if(k==="km")return busyBtn(btn,async()=>{
    const g=garage(),c=g.find(x=>x.id===btn.dataset.car);if(!c)return;
    const nw=Math.round(+String(a.km).replace(/[^\d.]/g,""));if(!(nw>0&&nw<=3e6))return;
    if(!VC())throw Error(T('อัปเดตหน้าเว็บก่อนบันทึก','Update the app before saving'));
    await VC().setKm(c.id,nw,{confirmJump:true});
    try{typeof renderCarUI==="function"&&renderCarUI()}catch(e){}
    finish(m,a,"done",T(`${carName(c)}: ${nw.toLocaleString()} กม. แล้ว`,`${carName(c)} is now at ${nw.toLocaleString()} km`));
  }).catch(e=>finish(m,a,"err",e.message));
  /* ประกาศหาช่าง / เรียกช่างด่วน — ส่งถึงช่างรอบตัวจริง (ด่วน: หลังบ้านแจ้งร้านในรัศมีทาง LINE ทันที) */
  if(k==="post"||k==="urg")return busyBtn(btn,async()=>{
    const urgent=k==="urg";errOn(el,"");
    const pos=a._pos||await getLoc(el,a);if(!pos)return;
    const photos=[];for(const p of (a._ph||[]).slice(0,3))photos.push(await b2d(p.blob));
    const r=await VC().post({urgent,car:carOf(el),symptom:v("symptom"),cat:a._cat||a.cat,when:v("when"),mode:v("mode"),pos,phone:v("phone"),photos});
    a._ph=[];a.rid=r.id;finish(m,a,"done",reachMsg(r.reach,urgent));
  }).catch(e=>errOn(el,vErr(e)));
  /* ขอราคาจากร้านที่เลือก = ใบงานจริงถึงร้านนั้น (ยังไม่ใช่การจ้าง) */
  if(k==="book")return busyBtn(btn,async()=>{
    errOn(el,"");const sh=shopOf(el,a);
    const pos=a._pos||await getLoc(el,a);if(!pos)return;
    const photos=[];for(const p of (a._ph||[]).slice(0,3))photos.push(await b2d(p.blob));
    const r=await VC().quote({techId:sh&&sh.id,car:carOf(el),symptom:v("symptom"),when:v("when"),mode:v("mode"),pos,phone:v("phone"),photos});
    a._ph=[];a.rid=r.id;finish(m,a,"done",T(`ส่งคำขอราคาให้ ${VC().shopName(sh)} แล้ว — รอร้านเสนอราคา`,`Request sent to ${VC().shopName(sh)} — waiting for their quote`));
  }).catch(e=>errOn(el,vErr(e)));
  if(k==="msg")return busyBtn(btn,async()=>{
    errOn(el,"");const sh=shopOf(el,a);
    const r=await VC().message(sh&&sh.id,v("text"));
    a.rid=r.id;finish(m,a,"done",T(`ส่งข้อความถึง ${VC().shopName(sh)} แล้ว`,`Message sent to ${VC().shopName(sh)}`));
  }).catch(e=>errOn(el,vErr(e)));
  /* ใบงาน: รับราคา (ติ๊กยินยอมในการ์ดเอง) · ยกเลิก (ต้องมีเหตุผล) · ยืนยันงานเสร็จ · ส่งข้อความ */
  if(k==="jobdo")return busyBtn(btn,async()=>{
    const op=JOBOP[a.op]?a.op:"message",jid=v("job");if(!jid)return errOn(el,T("เลือกใบงานก่อน","Pick a job first"));
    if(op==="accept"&&!(el.querySelector('[data-f="consent"]')||{}).checked)return errOn(el,T("ติ๊กยอมรับขอบเขตงานและราคาก่อน","Tick to accept the scope and price first"));
    errOn(el,"");await VC().jobDo(jid,op,{note:v("note"),text:v("text")});
    a.rid=jid;finish(m,a,"done",T(...{accept:["รับราคาแล้ว — ร้านได้รับนัดพร้อมเบอร์ของคุณ","Quote accepted — the shop has your booking and number"],
      cancel:["ยกเลิกใบงานแล้ว","Job cancelled"],complete:["ปิดงานแล้ว — ให้คะแนนช่างได้ในใบงาน","Job closed — you can rate the mechanic in the job"],message:["ส่งข้อความแล้ว","Message sent"]}[op]));
  }).catch(e=>errOn(el,vErr(e)));
  if(k==="log"){try{errOn(el,"");const kind=LOGK[a.kind]?a.kind:"fuel";
      const r=await VC().logAdd(v("car"),kind,{amount:v("amount"),litres:v("litres"),km:v("km"),item:v("item"),title:v("title"),date:v("date")});
      a.rid="garage";finish(m,a,"done",T("บันทึกลงสมุดรถแล้ว","Saved to the logbook")+" · "+r.date)}catch(e){errOn(el,vErr(e))}return}
  if(k==="due"){try{errOn(el,"");const key=v("key"),r=await VC().dueSet(v("car"),key,v("date")),L=VC().DUE[key];
      a.rid="garage";finish(m,a,"done",T(`ตั้ง${L[0]}ไว้ ${r.date} แล้ว`,`${L[1]} set for ${r.date}`))}catch(e){errOn(el,vErr(e))}return}
  if(k==="send")return busyBtn(btn,async()=>{
    const job=v("job"),P=(a._ph||[]).slice(0,4);if(!job||!P.length)return;
    if(!W.CendonMedia)throw new Error(T("เครื่องนี้ส่งไฟล์ไม่ได้","This device can't send files"));
    const ids=[];for(const p of P){const id=await CendonMedia.put(p.blob,{kind:"image",mime:"image/jpeg",name:"photo.jpg",upload:false});
      if(!(await CendonMedia.upload(id,"draft")))throw new Error(T("ส่งรูปไม่สำเร็จ ตรวจสอบอินเทอร์เน็ตแล้วลองใหม่","Couldn't upload — check your connection and try again"));ids.push(id)}
    await vapi("/api/tech/jobs/"+enc(job),{action:"message",message:v("text")||T("รูปเพิ่มเติมครับ","More photos"),media:ids});
    const sel=el.querySelector('[data-f="job"]'),nm=sel&&sel.selectedOptions[0]?sel.selectedOptions[0].textContent:"";
    a._ph=[];a._job=job;finish(m,a,"done",T(`ส่ง ${ids.length} รูปให้ช่างแล้ว`,`Sent ${ids.length} photo${ids.length>1?"s":""}`)+(nm?" · "+nm:""));
  }).catch(e=>errOn(el,e.message));
  if(k==="shop")return busyBtn(btn,async()=>{
    const me=await vapi("/api/tech/me"),t=me&&me.technician;if(!t)throw new Error(T("บัญชีนี้ยังไม่มีร้าน","This account has no shop"));
    const wantPause=a.state==="pause",raw=t.vacationRaw||t.vacation||{};
    if(wantPause!==!!t.vacation)await vapi("/api/tech/shop",{vacation:{on:wantPause,until:wantPause&&raw.until&&raw.until>Date.now()?raw.until:null,note:raw.note||""}});
    if(!wantPause)await vapi("/api/tech/online",{online:a.state==="on"});
    finish(m,a,"done",T("ตั้งสถานะร้านแล้ว","Shop status updated"));
  }).catch(e=>finish(m,a,"err",e.message));
}

/* ═══ หลังวาดการ์ด: ใบงาน รูป และการพาไปอัตโนมัติ ═══ */
function hydrate(wrap,m){
  wrap.querySelectorAll(".vl").forEach(el=>{
    const a=m.acts[+el.dataset.vi];if(!a)return;
    const f=el.querySelector("[data-file]");
    if(f)f.onchange=async()=>{const max=a.do==="send_photos"?4:3;a._ph=a._ph||[];
      for(const x of [...f.files].slice(0,max-a._ph.length)){try{const b=await shrinkImg(x,a.do==="send_photos"?1600:1280);a._ph.push({blob:b,url:URL.createObjectURL(b)})}catch(e){errOn(el,e.message)}}
      f.value="";drawPh(el,a)};
    drawPh(el,a);
    if(a.do==="send_photos"&&!a.s)vapi("/api/tech/jobs").then(d=>{
      const L=(d.jobs||[]).filter(j=>liveJob(j)&&(j.side==="customer"||j.side==="both"||j.side==="technician")).slice(0,10),sel=el.querySelector('[data-f="job"]');if(!sel)return;
      if(!L.length){sel.innerHTML=`<option value="">${T("ยังไม่มีใบงานที่คุยกับช่างอยู่","No active jobs with a mechanic")}</option>`;return}
      sel.innerHTML=L.map(j=>`<option value="${esc(j.id)}">${esc(j.side==="technician"?T("ลูกค้า","Customer"):j.techName||"")} · ${esc(j.car||"")}</option>`).join("");sel.disabled=false;sel.onchange=()=>drawPh(el,a);drawPh(el,a);
    }).catch(e=>errOn(el,e.message));
    if(a.do==="jobs")vapi("/api/tech/jobs").then(d=>{const box=el.querySelector("[data-jobs]");if(!box)return;
      const L=(d.jobs||[]).filter(j=>j.side!=="admin").sort((x,y)=>(liveJob(y)-liveJob(x))||((y.updatedAt||0)-(x.updatedAt||0))).slice(0,5);
      box.innerHTML=L.length?L.map(j=>`<button type="button" class="vl-row" data-va="open" data-job="${esc(j.id)}"><span><b class="nt">${esc(j.car||"")}</b><small>${esc(j.side==="technician"?T("งานของร้านคุณ","Your shop's job"):j.techName||"")}</small></span><em class="${liveJob(j)?"on":""}">${esc(jobSt(j))}</em></button>`).join("")
        :`<p class="vl-note">${T("ยังไม่มีใบงาน — บอกอาการรถแล้วให้ Valet ช่วยหาช่างได้เลย","No jobs yet — describe the problem and Valet can help you find a mechanic")}</p>`;
    }).catch(e=>{const box=el.querySelector("[data-jobs]");if(box)box.innerHTML=`<p class="vl-st err"><i class="ti ti-alert-triangle"></i>${esc(e.message)}</p>`});
    if(a.s)return;
    /* รถ "คันอื่น" → ช่องพิมพ์ชื่อรถ */
    const cs=el.querySelector('select[data-f="car"]'),ct=el.querySelector('[data-f="cartext"]');
    if(cs&&ct)cs.addEventListener("change",()=>{ct.hidden=!!cs.value;if(!cs.value)ct.focus()});
    drawLoc(el,a);
    /* ร้าน: หาจากชื่อ/รหัสที่ AI ส่งมา (ร้านที่ผ่านการตรวจเท่านั้น) */
    if((a.do==="book"||a.do==="msg_shop")&&VC()){const sel=el.querySelector('[data-f="shop"]'),go1=el.querySelector('[data-va="book"],[data-va="msg"]');
      const fill=L=>{a._shops=L;if(!sel)return;
        if(!L.length){sel.innerHTML=`<option value="">${T("ไม่พบร้านนี้ — ลองบอกชื่อร้านอีกครั้ง หรือให้ Valet หาช่างให้","Shop not found — say the name again, or let Valet find one")}</option>`;sel.disabled=true;if(go1)go1.disabled=true;return}
        const q=String(a.shop||'').trim().toLocaleLowerCase(),only=L.length===1?L[0]:null;
        const exact=only&&(String(only.id)===a.shop||String(VC().shopName(only)).trim().toLocaleLowerCase()===q);
        const chosen=L.some(t=>String(t.id)===a._chosen)?a._chosen:exact?String(only.id):'';
        sel.innerHTML=(chosen?'':`<option value="" selected disabled>${T('ตรวจและเลือกร้านผู้รับ','Check and select the recipient shop')}</option>`)+L.map(t=>`<option value="${esc(t.id)}">${esc(VC().shopName(t))}${t.area?" · "+esc(t.area):""}${t.dist!=null?" · "+t.dist.toFixed(1)+" "+T("กม.","km"):""}</option>`).join("");
        sel.value=chosen;sel.disabled=false;if(go1)go1.disabled=!chosen;
        sel.onchange=()=>{a._chosen=sel.value;if(go1)go1.disabled=!shopOf(el,a)};};
      if(a._shops)fill(a._shops);else VC().shops(a.shop,a.cat).then(fill).catch(e=>errOn(el,vErr(e)))}
    /* ใบงาน: เฉพาะใบที่ทำขั้นนี้ได้ตอนนี้ (ตามกติกาหลังบ้าน) */
    if(a.do==="job"&&VC()){const op=JOBOP[a.op]?a.op:"message",sel=el.querySelector('[data-f="job"]'),b=el.querySelector('[data-va="jobdo"]'),q=el.querySelector("[data-q]"),ck=el.querySelector('[data-f="consent"]');
      const can=j=>op==="message"?liveJob(j):(VC().JOB_OPS[op]||[]).includes(j.status)&&(op==="cancel"?j.side!=="admin":j.side==="customer"||j.side==="both");
      const paintQ=()=>{const j=(a._jobs||[]).find(x=>x.id===sel.value);if(b)b.disabled=!j||(op==="accept"&&ck&&!ck.checked);
        if(q){q.hidden=!(j&&j.quote);if(j&&j.quote)q.innerHTML=`<b>฿${money(j.quote.total)}</b><span>${esc(j.techName||"")}</span><p>${esc(j.quote.scope||"")}</p>${j.quote.appointment?`<small><i class="ti ti-calendar"></i>${esc(j.quote.appointment)}</small>`:""}${j.quote.warranty?`<small><i class="ti ti-shield-check"></i>${T("รับประกัน","Warranty")} ${esc(j.quote.warranty)} ${T("วัน","days")}</small>`:""}`}};
      if(ck)ck.onchange=paintQ;
      VC().jobs().then(all=>{const L=all.filter(can).sort((x,y)=>(y.updatedAt||0)-(x.updatedAt||0)).slice(0,10);a._jobs=L;if(!sel)return;
        if(!L.length){sel.innerHTML=`<option value="">${T("ไม่มีใบงานที่ทำขั้นนี้ได้ตอนนี้","No jobs at this step right now")}</option>`;return}
        sel.innerHTML=L.map(j=>`<option value="${esc(j.id)}"${j.id===a.job?" selected":""}>${esc(j.side==="technician"?T("ลูกค้า","Customer"):j.techName||"")} · ${esc(j.car||"")}${j.quote?" · ฿"+money(j.quote.total):""}</option>`).join("");
        sel.disabled=false;sel.onchange=paintQ;paintQ()}).catch(e=>errOn(el,vErr(e)))}
  });
}
/* คำตอบใหม่สด ๆ เท่านั้น (ไม่ใช่ตอนเปิดประวัติ): พาไปหน้า = นับถอยหลังสั้น ๆ ยกเลิกได้ · เปลี่ยนธีม/ภาษา = ทำเลย ย้อนได้ */
function run(m){
  if(!m||!m.acts||!m.acts.length||m._ran)return;m._ran=true;
  m.acts.forEach(a=>{
    if(a.s)return;
    if(a.do==="setting"){const s=setting(a);if(!s)return;a._prev=s.get();if(String(a._prev)===String(s.v)){a.s="done";a.r=T("ตั้งไว้แบบนี้อยู่แล้ว","Already set");a._prev=null;return}
      s.set(s.v);a.s="done";a.r=T("เปลี่ยนแล้ว","Done")}
    if(a.do==="urgent")setTimeout(()=>{const el=D.querySelector(`.vl[data-vm="${m._vid}"][data-vi="${m.acts.indexOf(a)}"]`);if(el&&!a._pos&&!a.s)getLoc(el,a)},400);
    if((a.do==="go"||a.do==="search")&&dest(a)&&m.acts.filter(x=>x.do==="go"||x.do==="search").length===1){a._cd=2200;a._t=setTimeout(()=>{if(!a.s){a.s="done";a.r=T("พาไปแล้ว","Opened");try{saveSession()}catch(e){}go(dest(a).url)}},2200)}
  });
  try{saveSession()}catch(e){}
  repaint(m);
}
D.addEventListener("click",e=>{const b=e.target.closest(".vl [data-va]");if(!b)return;e.preventDefault();act(b)});
/* วาดห้องใหม่ทุกครั้ง การ์ดต้องได้ตัวจัดการกลับมา */
const mo=new MutationObserver(()=>{D.querySelectorAll(".vl-wrap:not([data-h])").forEach(w=>{w.dataset.h=1;const el=w.querySelector(".vl"),m=el&&msgOf(el.dataset.vm);if(m)hydrate(w,m)})});
function watch(){const th=D.getElementById("thread");if(th)mo.observe(th,{childList:true,subtree:true});else setTimeout(watch,300)}
watch();

/* ═══ ปุ่มรูปจับมือ + หน้าต่างขออนุญาต ═══ */
function paintBtns(){D.querySelectorAll(".vl-btn").forEach(b=>{const o=isOn();b.classList.toggle("on",o);b.setAttribute("aria-pressed",o);
  b.title=o?T(NAME+" เปิดอยู่","Cendon Valet is on"):T("ให้ "+NAME+" ช่วยทำในแอปแทน","Let Cendon Valet act for you")});
  const mo=D.getElementById("pMore");if(mo)mo.classList.toggle("vl-onv",isOn())}
function inject(){
  [["#composer .crow","#sendBtn"],["#v-welcome .w-row","#wSend"]].forEach(([r,b])=>{const row=D.querySelector(r),before=D.querySelector(b);
    if(!row||!before||row.querySelector(".vl-btn"))return;
    const x=D.createElement("button");x.type="button";x.className="vl-btn";x.setAttribute("aria-haspopup","dialog");x.innerHTML='<i class="ti ti-heart-handshake"></i>';
    const dp=row.querySelector(".dp-btn");row.insertBefore(x,dp||before);x.onclick=e=>{e.stopPropagation();sheet()}});
  /* มือถือ: ช่องพิมพ์แคบ — ปุ่มโหมด AI กับ Valet ย้ายไปอยู่ในปุ่ม ⋮ มุมขวาบน (แทนปุ่มแชตใหม่ ซึ่งย้ายเข้าไปในเมนูเดียวกัน) · คอมเหมือนเดิม */
  const pill=D.querySelector("header.pill"),nw=D.getElementById("pNew");
  if(pill&&nw&&!D.getElementById("pMore")){
    const b=D.createElement("button");b.type="button";b.className="p-btn p-more";b.id="pMore";
    b.setAttribute("aria-label",T("ตัวเลือกแชต","Chat options"));b.setAttribute("aria-haspopup","menu");b.setAttribute("aria-expanded","false");
    b.innerHTML='<i class="ti ti-dots-vertical"></i>';
    nw.after(b);b.onclick=e=>{e.stopPropagation();more(b)};
  }
  paintBtns();
}
/* เมนู ⋮ บนมือถือ: แชตใหม่ · โหมด AI (Sprint / Grand Tour / Atelier) · Cendon Valet */
const MODES=[["ti-bolt","Sprint","ฉับไว ตอบสั้น กระชับ","Swift, short answers"],["ti-steering-wheel","Grand Tour","สมดุล Cendon เลือกให้ว่าคิดแค่ไหน","Balanced — Cendon decides how deep"],["ti-diamond","Atelier","ละเอียดที่สุด คิดลึก ค้นหลายแหล่ง","Most thorough — deeper, more sources"]];
function more(btn){
  const old=D.querySelector(".vl-more");if(old){old.remove();btn.setAttribute("aria-expanded","false");return}
  const cur=W.CendonDepth?W.CendonDepth.get():1,o=isOn(),m=D.createElement("div");m.className="vl-more";m.setAttribute("role","menu");
  m.innerHTML=`<button type="button" role="menuitem" data-m="new"><i class="ti ti-edit"></i><span><b>${T("แชตใหม่","New chat")}</b></span></button>
    <p class="vl-mh">${T("ประสิทธิภาพ AI","AI performance")}</p>
    ${MODES.map((x,i)=>`<button type="button" role="menuitemradio" aria-checked="${i===cur}" data-m="d${i}"><i class="ti ${x[0]}"></i><span><b>${x[1]}</b><small>${T(x[2],x[3])}</small></span>${i===cur?'<i class="ti ti-check vl-ck"></i>':""}</button>`).join("")}
    <p class="vl-mh">${NAME}</p>
    <button type="button" role="menuitemcheckbox" aria-checked="${o}" data-m="valet"><i class="ti ti-heart-handshake"></i><span><b>${o?T("Valet เปิดอยู่","Valet is on"):T("ให้ Valet ช่วยทำแทน","Let Valet act for you")}</b><small>${o?T("แตะเพื่อปิด","Tap to turn off"):T("ต้องอนุญาตก่อนใช้","Needs your permission first")}</small></span><span class="vl-sw${o?" on":""}"><i></i></span></button>`;
  D.body.appendChild(m);btn.setAttribute("aria-expanded","true");
  const r=btn.getBoundingClientRect();m.style.top=(r.bottom+8)+"px";m.style.right=Math.max(10,innerWidth-r.right)+"px";
  const close=()=>{m.remove();btn.setAttribute("aria-expanded","false");removeEventListener("pointerdown",off,true);D.removeEventListener("keydown",k)};
  const off=e=>{if(!m.contains(e.target)&&e.target!==btn&&!btn.contains(e.target))close()};
  const k=e=>{if(e.key==="Escape"){close();btn.focus()}};
  setTimeout(()=>{addEventListener("pointerdown",off,true);D.addEventListener("keydown",k)},0);
  m.querySelectorAll("[data-m]").forEach(b=>b.onclick=()=>{const v=b.dataset.m;close();
    if(v==="new"){if(W.newSession)W.newSession();return}
    if(v[0]==="d"){if(W.CendonDepth)W.CendonDepth.set(+v[1]);try{toast(T("โหมด AI: ","AI mode: ")+MODES[+v[1]][1],MODES[+v[1]][0])}catch(e){}return}
    if(v==="valet"){if(isOn()){localStorage.setItem(KEY,JSON.stringify({on:false,at:Date.now()}));paintBtns();try{toast(T("ปิด Valet แล้ว","Valet is off"),"ti-key-off")}catch(e){}}else sheet()}});
  (m.querySelector('[aria-checked="true"]')||m.querySelector("button")).focus();
}
function sheet(){
  D.querySelector(".vl-pop")?.remove();
  const o=isOn(),mech=isMech(),p=D.createElement("div");p.className="vl-pop";p.setAttribute("role","dialog");p.setAttribute("aria-modal","true");p.setAttribute("aria-labelledby","vlT");
  p.innerHTML=`<div class="vl-card">
    <div class="vl-key"><i class="ti ti-key"></i></div>
    <h3 id="vlT">${o?T(NAME+" ดูแลให้อยู่","Cendon Valet is on duty"):T("ฝากกุญแจให้ "+NAME+" ไหม?","Hand the keys to Cendon Valet?")}</h3>
    <p class="vl-lead">${T("Valet คือ AI ที่ลงมือทำในแอปแทนคุณ แค่บอกในแชต","Valet is an AI that acts inside the app for you — just say it in chat")}</p>
    <ul>
      <li><i class="ti ti-route"></i>${T("พาไปหน้าไหนก็ได้ · เปลี่ยนธีม ภาษา โหมด AI","Takes you anywhere · changes theme, language, AI mode")}</li>
      <li><i class="ti ti-car-garage"></i>${T("เพิ่มรถ อัปเดตเลขไมล์ในการาจ","Adds cars and updates mileage in your garage")}</li>
      <li><i class="ti ti-urgent"></i>${T("เรียกช่างด่วน · ประกาศหาช่าง · ขอราคาและทักร้าน ส่งถึงช่างจริง","Calls an urgent mechanic · posts jobs · asks shops for quotes and messages them — for real")}</li>
      <li><i class="ti ti-clipboard-check"></i>${T("รับราคา ยกเลิก ปิดงาน ส่งรูปและข้อความในใบงาน","Accepts quotes, cancels or closes jobs, sends photos and messages")}</li>
      <li><i class="ti ti-notebook"></i>${T("จดน้ำมัน ซ่อมบำรุง ทริป · ตั้งวันต่อภาษี พ.ร.บ. ประกัน","Logs fuel, services and trips · sets tax, insurance and inspection dates")}</li>
      ${mech?`<li><i class="ti ti-building-store"></i>${T("คุมสถานะร้านและหน้า Studio","Runs your shop status and Studio pages")}</li>`:""}
    </ul>
    <p class="vl-safe"><i class="ti ti-shield-lock"></i>${T("อะไรที่เปลี่ยนข้อมูลหรือส่งถึงคนอื่น Valet จะขึ้นการ์ดให้คุณตรวจและกดยืนยันก่อนทุกครั้ง · ไม่ลบข้อมูล ไม่แตะรหัสผ่าน ไม่จ่ายเงิน · ทำได้เฉพาะในบัญชีของคุณ · ปิดได้ทุกเมื่อที่ปุ่มนี้","Anything that changes your data or reaches someone else waits for you to check and tap a card · never deletes data, touches passwords or pays · only inside your own account · switch it off anytime here")}</p>
    <div class="vl-pa">${o?`<button type="button" class="vl-b gh" data-p="off">${T("ปิด Valet","Turn Valet off")}</button><button type="button" class="vl-b" data-p="x">${T("ปิดหน้าต่าง","Close")}</button>`
      :`<button type="button" class="vl-b gh" data-p="x">${T("ไม่ใช่ตอนนี้","Not now")}</button><button type="button" class="vl-b" data-p="on"><i class="ti ti-key"></i>${T("อนุญาต Valet","Allow Valet")}</button>`}</div>
  </div>`;
  D.body.appendChild(p);requestAnimationFrame(()=>p.classList.add("in"));
  const close=()=>{p.classList.remove("in");setTimeout(()=>p.remove(),220);D.removeEventListener("keydown",esc1);const b=D.querySelector(".vl-btn");b&&b.focus()};
  const esc1=e=>{if(e.key==="Escape")close()};D.addEventListener("keydown",esc1);
  p.onclick=e=>{if(e.target===p)close()};
  p.querySelectorAll("[data-p]").forEach(b=>b.onclick=()=>{const k=b.dataset.p;
    if(k==="on"){localStorage.setItem(KEY,JSON.stringify({on:true,uid:uidNow(),at:Date.now()}));paintBtns();close();
      try{toast(T("Valet พร้อมแล้ว — ลองพิมพ์ “พาไปการาจ” หรือ “เพิ่มรถ Civic 2020”","Valet is ready — try “take me to my garage” or “add a 2020 Civic”"),"ti-key")}catch(e){}}
    else if(k==="off"){localStorage.setItem(KEY,JSON.stringify({on:false,at:Date.now()}));paintBtns();close();try{toast(T("ปิด Valet แล้ว","Valet is off"),"ti-key-off")}catch(e){}}
    else close()});
  setTimeout(()=>{const f=p.querySelector('[data-p="on"],[data-p="x"]');f&&f.focus()},60);
}
if(D.readyState==="loading")D.addEventListener("DOMContentLoaded",inject);else inject();
setTimeout(inject,800);

W.CendonValet={on:isOn,body,cut,save,html,run,open:sheet,inject,wantsAct,intent};
})(window,document);
