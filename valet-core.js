/* ══ Cendon Valet core — ตัวทำงานจริงแทนผู้ใช้ (ใช้ร่วมกัน: ห้องแชตที่พิมพ์ · ตอนโทรคุยกับ AI · หน้าแรก) ══
   ทุกอย่างทำผ่าน API เดิมด้วยสิทธิ์ของบัญชีนี้เท่านั้น — ไฟล์นี้ไม่ตัดสินใจเอง ผู้เรียกต้องให้ผู้ใช้ยืนยันก่อนเรียกตัวที่เปลี่ยนข้อมูลเสมอ
   ทำได้: ประกาศหาช่าง · เรียกช่างด่วน · ขอราคาร้านที่เลือก · ทักร้าน · รับราคา/ยกเลิก/ยืนยันงานเสร็จ · ส่งข้อความในใบงาน
          จดสมุดรถ (น้ำมัน ซ่อม ทริป) · ตั้งวันครบกำหนด (ภาษี พ.ร.บ. ประกัน ตรอ.)
   ไม่มีให้ (อันตราย): ลบบัญชี/ข้อมูล/รถ · เปลี่ยนรหัสผ่าน/อีเมล · จ่ายเงิน/ซื้อโฆษณา · แชร์ตำแหน่งให้คนอื่น · งานของทีมงาน */
(function(W){
'use strict';
const T=(th,en)=>(W.spireT?W.spireT(th,en):((W.lang||"th")==="en"?en:th));
const enc=encodeURIComponent;
const LG=(k,d)=>{try{const v=localStorage.getItem("spire_"+k);return v?JSON.parse(v):d}catch(e){return d}};
const LS=(k,v)=>{try{localStorage.setItem("spire_"+k,JSON.stringify(v))}catch(e){}};
const one=(v,n)=>String(v==null?"":v).replace(/[\r\n\t]+/g," ").trim().slice(0,n);
const uuid=()=>(W.crypto&&crypto.randomUUID)?crypto.randomUUID():"xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g,c=>{const r=Math.random()*16|0;return (c==="x"?r:(r&3|8)).toString(16)});

/* ── หลังบ้าน ── */
async function user(){
  const a=W.spireAuth||W.auth;let u=a&&a.currentUser;
  if(!u&&W.spireAwaitUser)u=await W.spireAwaitUser(10000);
  if(!u)throw new Error(T("กรุณาเข้าสู่ระบบก่อน","Please sign in first"));
  return u;
}
async function api(path,body,method){
  const u=await user();
  const r=await fetch(W.BACKEND_URL+path,{method:method||(body?"POST":"GET"),cache:"no-store",
    headers:Object.assign({Authorization:"Bearer "+await u.getIdToken()},body?{"Content-Type":"application/json"}:{}),
    body:body?JSON.stringify(body):undefined});
  let d=null;try{d=await r.json()}catch(e){}
  if(!r.ok)throw Object.assign(new Error((d&&d.error)||T("ระบบยังไม่พร้อม ลองใหม่อีกครั้ง","Not available right now — please try again")),{status:r.status});
  return d||{};
}

/* ── รถ ── */
const cars=()=>{try{const g=typeof W.garage==="function"?W.garage():LG("garage",[]);return (Array.isArray(g)?g:[]).filter(c=>c&&c.id)}catch(e){return []}};
const carName=c=>c?(c.name||[c.make,c.model].filter(Boolean).join(" ")):"";
const carLabel=c=>c?[carName(c),c.year].filter(Boolean).join(" "):"";
const curCar=()=>{const G=cars(),id=LG("selCar",null);return G.find(c=>c.id===id)||G[0]||null};
/* id ตรง ๆ หรือชื่อ ("city", "ฮอนด้า ซิตี้") — ไม่เจอ = null (ไม่เดา) */
function findCar(ref){
  const G=cars();if(!ref)return curCar();
  const r=String(ref).toLowerCase().trim();
  return G.find(c=>c.id===ref)||G.find(c=>carLabel(c).toLowerCase()===r)||G.find(c=>carLabel(c).toLowerCase().includes(r)||r.includes(carName(c).toLowerCase()))||null;
}

/* ── ตำแหน่ง: GPS จริงของเครื่อง (ขออนุญาตตามปกติของเบราว์เซอร์) ── */
const lastHere=()=>{const h=LG("tech_here",null);return h&&Number.isFinite(+h.lat)&&Number.isFinite(+h.lng)?{lat:+h.lat,lng:+h.lng}:null};
function here(timeout){
  return new Promise(res=>{
    if(!navigator.geolocation)return res(null);
    let done=false;const t=setTimeout(()=>{if(!done){done=true;res(null)}},(timeout||10000)+500);
    navigator.geolocation.getCurrentPosition(p=>{if(done)return;done=true;clearTimeout(t);
      const v={lat:+p.coords.latitude.toFixed(5),lng:+p.coords.longitude.toFixed(5)};LS("tech_here",v);res(v)},
      ()=>{if(!done){done=true;clearTimeout(t);res(null)}},{enableHighAccuracy:true,timeout:timeout||10000,maximumAge:60000});
  });
}
const RG={};
async function revgeo(p){
  if(!p)return {line:"",area:""};
  const k=p.lat.toFixed(4)+","+p.lng.toFixed(4);if(RG[k])return RG[k];
  try{const ac=new AbortController();setTimeout(()=>ac.abort(),4500);
    const r=await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&zoom=17&lat=${p.lat}&lon=${p.lng}&accept-language=${(W.lang||"th")==="th"?"th":"en"}`,{signal:ac.signal});
    const d=await r.json(),a=d.address||{};
    const line=[a.house_number,a.road||a.pedestrian||a.footway,a.neighbourhood||a.quarter||a.village].filter(Boolean).join(" ");
    const area=[a.suburb||a.city_district||a.district||a.town||a.municipality,a.city||a.province||a.state].filter(Boolean).join(" ");
    return RG[k]={line:line||String(d.display_name||"").split(",").slice(0,2).join(",").trim(),area};
  }catch(e){return {line:"",area:""}}
}
async function placeOf(p){
  const g=await revgeo(p),coord=p.lat.toFixed(5)+", "+p.lng.toFixed(5);
  return {area:(g.area||T("พิกัด ","Coords ")+coord).slice(0,160),address:[g.line,"แผนที่ https://maps.google.com/?q="+p.lat+","+p.lng].filter(Boolean).join(" · ").slice(0,500)};
}

/* ── เบอร์ ── */
const savedPhone=()=>String((LG("tech_contact",{})||{}).phone||"");
const cleanPhone=v=>String(v||"").replace(/[\s-]/g,"").replace(/^\+?66(?=\d{8,9}$)/,"0");
const okPhone=v=>/^0\d{8,9}$/.test(cleanPhone(v));

/* ตรวจฟอร์มให้ครบทีเดียว → Error ที่มีรายการข้อที่ต้องแก้ (การ์ดและเสียงบอกผู้ใช้ได้ตรงจุด) */
function need(list){if(list.length)throw Object.assign(new Error(list.join(" · ")),{issues:list})}
function checkCommon(o,minSym){
  const bad=[];
  if(!o.car||String(o.car).length<2)bad.push(T("ยังไม่รู้ว่ารถคันไหน","Which car?"));
  if(String(o.symptom||"").trim().length<minSym)bad.push(minSym>3?T(`อาการรถ (อย่างน้อย ${minSym} ตัวอักษร)`,`The problem (at least ${minSym} characters)`):T("บอกสั้น ๆ ว่าเกิดอะไรขึ้น","Say briefly what happened"));
  if(!o.pos)bad.push(T("ตำแหน่งรถ (เปิดตำแหน่งของเครื่อง)","The car's location (turn on location)"));
  if(!okPhone(o.phone))bad.push(o.phone?T("เบอร์โทรไม่ถูกต้อง (0 นำหน้า 9–10 หลัก)","Phone looks wrong (0 + 9–10 digits)"):T("เบอร์โทร","Your phone number"));
  return bad;
}
const nowTime=()=>new Date().toLocaleTimeString((W.lang||"th")==="th"?"th-TH":"en-GB",{hour:"2-digit",minute:"2-digit"});

/* ประกาศหาช่าง (ไม่ด่วน) หรือเรียกช่างด่วน — ส่งถึงช่างรอบตัวจริง หลังบ้านแจ้งร้านในรัศมี (ด่วนแจ้งทาง LINE ทันที) */
async function post(o){
  o=Object.assign({},o);o.phone=cleanPhone(o.phone);
  const urgent=!!o.urgent;need(checkCommon(o,urgent?3:10));
  const pl=await placeOf(o.pos),id=uuid();
  const r=await api("/api/tech/posts",{id,car:one(o.car,200),symptom:urgent&&String(o.symptom).trim().length<10?"งานด่วน: "+one(o.symptom,1990):one(o.symptom,2000),
    cat:["air","eng","tyre","ev","body"].includes(o.cat)?o.cat:"",mode:urgent?"mobile":(o.mode==="shop"?"shop":"mobile"),urgent,
    requestedTime:urgent?"ด่วน — ตอนนี้ ("+nowTime()+")":one(o.when||T("วันนี้","Today"),160),
    area:pl.area,address:pl.address,lat:o.pos.lat,lng:o.pos.lng,phone:o.phone,note:one(o.note,300),photos:(o.photos||[]).slice(0,3)});
  LS("tech_contact",{phone:o.phone});
  return {id,reach:r&&typeof r.reach==="number"?r.reach:null,url:"/post/"+enc(id)};
}

/* ร้านที่ผ่านการตรวจ — หาจากรหัสหรือชื่อ เรียงจากใกล้สุด */
const km=(a,b)=>{if(!a||!b||!Number.isFinite(+b.lat)||!Number.isFinite(+b.lng))return null;const r=Math.PI/180,x=(b.lat-a.lat)*r,y=(b.lng-a.lng)*r,q=Math.sin(x/2)**2+Math.cos(a.lat*r)*Math.cos(b.lat*r)*Math.sin(y/2)**2;return 6371*2*Math.atan2(Math.sqrt(q),Math.sqrt(Math.max(0,1-q)))};
async function shops(q,cat){
  const d=await api("/api/tech"),me=(W.spireAuth||W.auth||{}).currentUser,mine=me&&me.uid;
  let L=(d.techs||[]).filter(t=>t&&t.verified&&!t.test&&!t.suspended&&t.uid!==mine);
  const s=String(q||"").toLowerCase().trim(),c=["air","eng","tyre","ev","body"].includes(cat)?cat:null;
  if(s){const exact=L.filter(t=>String(t.id)===String(q));if(exact.length)return exact.map(t=>({...t,dist:null}));
    const terms=s.split(/\s+/).filter(Boolean);L=L.filter(t=>{const hay=[t.shop,t.name,t.area].join(" ").toLowerCase();return hay.includes(s)||terms.every(x=>hay.includes(x))})}
  if(c)L=L.filter(t=>(t.cats||[]).includes(c));
  const h=lastHere();
  return L.map(t=>({...t,dist:km(h,t)})).sort((a,b)=>(a.dist??1e9)-(b.dist??1e9)).slice(0,5);
}
const shopName=t=>t?(t.shop||t.name||""):"";

/* ขอราคาจากร้านที่เลือก = ใบงานจริงถึงร้านนั้น */
async function quote(o){
  o=Object.assign({},o);o.phone=cleanPhone(o.phone);
  const bad=checkCommon(o,10);if(!o.techId)bad.unshift(T("เลือกร้านก่อน","Pick a shop first"));need(bad);
  const pl=await placeOf(o.pos),id=uuid();
  const r=await api("/api/tech/jobs",{id,techId:o.techId,car:one(o.car,200),symptom:one(o.symptom,2000),mode:o.mode==="mobile"?"mobile":"shop",
    requestedTime:one(o.when||T("วันนี้","Today"),160),area:pl.area,address:pl.address,lat:o.pos.lat,lng:o.pos.lng,phone:o.phone,note:one(o.note,300),photos:(o.photos||[]).slice(0,3)});
  LS("tech_contact",{phone:o.phone});
  const jid=(r&&r.id)||id;return {id:jid,url:"/jobs/"+enc(jid)};
}
/* ทักร้าน (ถามก่อน ยังไม่ใช่การจ้าง) */
async function message(techId,text){
  const t=one(text,1000);if(!techId)need([T("เลือกร้านก่อน","Pick a shop first")]);if(t.length<2)need([T("ข้อความถึงร้าน","Your message")]);
  const r=await api("/api/tech/threads",{techId,text:t});const tid=r&&r.thread&&r.thread.id;
  return {id:tid||null,url:tid?"/messages/"+enc(tid):"/messages"};
}

/* ใบงาน */
const jobs=async()=>((await api("/api/tech/jobs")).jobs||[]).filter(j=>j.side!=="admin");
const job=async id=>(await api("/api/tech/jobs/"+enc(id))).job;
/* รับราคา (= ตกลงจ้างตามราคาในใบเสนอ) · ยกเลิก · ยืนยันว่างานเสร็จ · ส่งข้อความ */
const JOB_OPS={accept:["quoted"],cancel:["requested","quoted","accepted","enroute"],complete:["done"],message:null};
async function jobDo(id,op,o){
  o=o||{};if(!(op in JOB_OPS))throw new Error(T("ทำขั้นตอนนี้ไม่ได้","That step isn't available"));
  if(op==="message"){const t=one(o.text,1000);if(t.length<1)need([T("ข้อความ","The message")]);return api("/api/tech/jobs/"+enc(id),{action:"message",message:t})}
  const j=await job(id);if(!j)throw new Error(T("ไม่พบใบงาน","Job not found"));
  if(!JOB_OPS[op].includes(j.status))throw new Error(T("สถานะใบงานเปลี่ยนไปแล้ว","The job has moved on"));
  const b={action:op,revision:j.revision};
  if(op==="accept")b.consent=true;
  if(op==="cancel"){const n=one(o.note,2000);if(n.length<5)need([T("เหตุผลที่ยกเลิก (อย่างน้อย 5 ตัวอักษร)","Reason for cancelling (5+ characters)")]);b.note=n}
  return api("/api/tech/jobs/"+enc(id),b);
}

/* สมุดรถ — รูปแบบเดียวกับหน้าการาจ (ซิงก์ขึ้นบัญชีตามระบบเดิม) */
const SVC={oil:["เปลี่ยนน้ำมันเครื่อง","Engine oil"],airf:["ไส้กรองอากาศ","Air filter"],cabin:["กรองแอร์","Cabin filter"],plug:["หัวเทียน","Spark plugs"],
  brakepad:["ผ้าเบรก","Brake pads"],brakeoil:["น้ำมันเบรก","Brake fluid"],tire:["ยาง","Tyres"],align:["ตั้งศูนย์ถ่วงล้อ","Wheel alignment"],batt:["แบตเตอรี่","Battery"],
  coolant:["น้ำหล่อเย็น","Coolant"],gearoil:["น้ำมันเกียร์","Gearbox oil"],belt:["สายพานหน้าเครื่อง","Drive belt"],shock:["โช้คอัพ","Shock absorbers"]};
const today=()=>{const d=new Date();return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0")};
const okDate=v=>/^\d{4}-\d{2}-\d{2}$/.test(v||"")&&!isNaN(new Date(v))&&+v.slice(0,4)>=2000&&+v.slice(0,4)<=new Date().getFullYear()+15;
function logAdd(carId,kind,e){
  const c=cars().find(x=>x.id===carId);if(!c)need([T("ไม่พบรถคันนี้ในการาจ","That car isn't in your garage")]);
  const k="carlab_log_"+carId,l=LG(k,null)||{services:[],fuel:[],trips:[]};["services","fuel","trips"].forEach(x=>{if(!Array.isArray(l[x]))l[x]=[]});
  const date=okDate(e.date)?e.date:today(),n=v=>Math.max(0,Math.round(+String(v==null?"":v).replace(/[^\d.]/g,"")||0)),bad=[];
  if(kind==="fuel"){const amount=n(e.amount);if(!amount||amount>200000)bad.push(T("ยอดเติม (บาท)","Amount (฿)"));need(bad);
    l.fuel.push({km:Math.min(n(e.km),3e6),amount,litres:Math.min(+(+e.litres||0).toFixed(2),500),date})}
  else if(kind==="service"){const key=SVC[e.item]?e.item:"";if(!key)bad.push(T("รายการซ่อมบำรุง","Which service"));if(!n(e.km))bad.push(T("เลขไมล์ตอนทำ","Mileage at the time"));need(bad);
    l.services.push({k:key,km:Math.min(n(e.km),3e6),amount:Math.min(n(e.amount),1000000),date})}
  else if(kind==="trip"){const title=one(e.title,60);if(title.length<2)bad.push(T("ชื่อทริป","Trip name"));if(!n(e.km))bad.push(T("ระยะทาง (กม.)","Distance (km)"));need(bad);
    l.trips.push({title,km:Math.min(n(e.km),20000),date})}
  else throw new Error(T("บันทึกแบบนี้ไม่ได้","Can't log that"));
  LS(k,l);return {date};
}
const DUE={tax:["ต่อภาษีรถ","Road tax"],act:["พ.ร.บ.","Compulsory insurance"],ins:["ประกันภัย","Insurance"],chk:["ตรวจสภาพ ตรอ.","Vehicle inspection"]};
function dueSet(carId,key,date){
  if(!cars().some(x=>x.id===carId))need([T("ไม่พบรถคันนี้ในการาจ","That car isn't in your garage")]);
  if(!DUE[key])need([T("เรื่องที่จะตั้ง (ภาษี พ.ร.บ. ประกัน ตรอ.)","Which date (tax, insurance, inspection)")]);
  if(!okDate(date))need([T("วันที่ (ปี-เดือน-วัน)","The date (YYYY-MM-DD)")]);
  const k="reg_"+carId,r=LG(k,{})||{};r[key]=date;LS(k,r);return {date};
}

/* ── การาจ: เพิ่มรถ · เลขไมล์ · เลือกคันที่คุยถึง (รูปแบบเดียวกับหน้าการาจ ซิงก์ขึ้นบัญชีผ่าน /api/cars) ── */
const garageLS=()=>{const g=LG("garage",[]);return Array.isArray(g)?g:[]};
function saveGarageLS(g){LS("garage",g);try{W.cloudMark&&W.cloudMark("garage")}catch(e){}try{W.dispatchEvent(new CustomEvent("cendon:garage"))}catch(e){}try{typeof W.renderCarUI==="function"&&W.renderCarUI()}catch(e){}}
async function addCar(o){
  const make=one(o.make,40),model=one(o.model,50),year=String(o.year||"").replace(/\D/g,""),km=String(o.mileage||o.km||"").replace(/[^\d]/g,""),y=new Date().getFullYear()+1,bad=[];
  if(make.length<2)bad.push(T("ยี่ห้อรถ","The make"));if(!model)bad.push(T("รุ่น","The model"));
  if(!/^\d{4}$/.test(year)||+year<1950||+year>y)bad.push(T(`ปีรถ (1950–${y})`,`The year (1950–${y})`));if(km&&+km>3e6)bad.push(T("เลขไมล์ (สูงเกินจริง)","Mileage looks too high"));need(bad);
  const r=await api("/api/cars",{make,model,year,mileage:km||"-"}),id=(r&&r.id)||("c"+Date.now());
  const g=garageLS();if(!g.some(c=>c.id===id))g.push({id,make,model,name:(make+" "+model).trim(),year,mileage:km||"-",type:"sedan",color:"#FFFFFF",history:[]});saveGarageLS(g);
  try{W.CarSpec&&W.CarSpec.ensure({id,make,model,year}).catch(()=>{})}catch(e){}
  return {id,label:[make,model,year].join(" ")};
}
async function setKm(carId,km){
  const g=garageLS(),c=g.find(x=>x.id===carId);if(!c)need([T("ไม่พบรถคันนี้ในการาจ","That car isn't in your garage")]);
  const n=Math.round(+String(km==null?"":km).replace(/[^\d.]/g,""));if(!(n>0&&n<=3e6))need([T("เลขไมล์","The mileage")]);
  c.mileage=String(n);saveGarageLS(g);
  await api("/api/cars",{id:c.id,make:c.make||c.name||"",model:c.model||"",year:c.year||"",mileage:c.mileage,color:c.color||undefined,body:c.type||undefined,info:c.info||undefined});
  return {km:n,label:carLabel(c)};
}
function pickCar(carId){
  const c=cars().find(x=>x.id===carId);if(!c)need([T("ไม่พบรถคันนี้ในการาจ","That car isn't in your garage")]);
  if(typeof W.pickCar==="function"){try{W.pickCar(c.id)}catch(e){LS("selCar",c.id)}}else LS("selCar",c.id);
  try{W.cloudMark&&W.cloudMark("selCar")}catch(e){}try{W.dispatchEvent(new CustomEvent("cendon:garage"))}catch(e){}
  return {label:carLabel(c)};
}
/* ธีมสว่าง/มืด (ทุกหน้าใช้คีย์เดียวกัน) */
function setTheme(v){
  if(v!=="light"&&v!=="dark")need([T("ธีม (สว่างหรือมืด)","Theme (light or dark)")]);
  LS("theme",v);LS("chatTheme",v);
  try{if(typeof W.setChatTheme==="function")W.setChatTheme(v);else W.spireThemeSync&&W.spireThemeSync()}catch(e){}
  try{W.cloudMark&&W.cloudMark("theme")}catch(e){}
  return {theme:v};
}
/* แชตกับร้านของฉัน (ฝั่งลูกค้าเท่านั้น — ข้อความของลูกค้าคนอื่นในร้านไม่อ่านออกเสียง) */
async function threads(){
  const L=((await api("/api/tech/threads")).threads||[]);
  const mine=L.filter(t=>t&&t.role!=="technician").slice(0,6).map(t=>({id:t.id,shop:one(t.techName,80),last:t.last?one(t.last.text,140):"",fromShop:!!(t.last&&t.last.role==="technician"),unread:+t.unread||0}));
  const shopUnread=L.filter(t=>t&&t.role==="technician").reduce((n,t)=>n+(+t.unread||0),0);
  return {threads:mine,shopUnread};
}
/* ช่างเท่านั้น: เปิดรับงาน / เงียบ / พักร้าน */
const isMech=()=>{try{const p=LG("partner",null),u=(W.spireAuth||W.auth||{}).currentUser;return !!(p&&p.s==="shop"&&(!p.uid||!u||p.uid===u.uid))}catch(e){return false}};
async function shopStatus(state){
  if(!["on","quiet","pause"].includes(state))need([T("สถานะร้าน","Shop status")]);
  const me=await api("/api/tech/me"),t=me&&me.technician;if(!t)throw new Error(T("บัญชีนี้ยังไม่มีร้าน","This account has no shop"));
  const want=state==="pause",raw=t.vacationRaw||t.vacation||{};
  if(want!==!!t.vacation)await api("/api/tech/shop",{vacation:{on:want,until:want&&raw.until&&raw.until>Date.now()?raw.until:null,note:raw.note||""}});
  if(!want)await api("/api/tech/online",{online:state==="on"});
  return {state};
}
/* หน้าที่พาไปได้ (รายการคงที่ ไม่รับลิงก์จาก AI) · หน้าทีมงาน/แอดมินไม่มีในรายการ */
const PAGES={home:["หน้าหลัก","Home","/"],garage:["การาจ","Garage","/garage"],news:["นิตยสาร","Magazine","/news"],shop:["ร้านค้าอะไหล่","Parts shop","/spares"],
  profile:["โปรไฟล์และตั้งค่า","Profile & settings","/profile"],jobs:["ใบงานของฉัน","My jobs","/jobs"],map:["แผนที่ช่างรอบตัว","Mechanics map","/map"],
  messages:["ข้อความ","Messages","/messages"],chat:["แชตกับ Cendon AI","Cendon AI chat","/chat"],help:["วิธีใช้","Help","/help"],
  passport:["Car Passport","Car Passport",c=>c?"/garage/"+enc(c)+"/pass":"/garage"],calendar:["ปฏิทินค่าใช้จ่าย","Cost calendar",c=>c?"/garage/"+enc(c)+"/cal":"/garage"],
  wrapped:["สรุปปีของรถ","Car Wrapped","/garage/wrapped"],join:["สมัครเป็นช่าง","Become a mechanic","/join"],
  studio:["Studio","Studio","/studio"],studio_find:["หางานใกล้ฉัน","Find work nearby","/work/find"],studio_messages:["ข้อความใน Studio","Studio messages","/work/messages"],
  studio_services:["บริการของร้าน","Shop services","/work/posts"],studio_shop:["ร้านของฉัน","My shop","/work/shop"],studio_settings:["ตั้งค่า Studio","Studio settings","/studio/settings"],studio_stats:["สถิติร้าน","Shop stats","/studio/stats"]};
function pageOf(key){
  let k=PAGES[key]?key:null;if(!k)return null;if(/^studio/.test(k)&&!isMech())k="join";
  const p=PAGES[k],c=curCar();return {key:k,label:T(p[0],p[1]),url:typeof p[2]==="function"?p[2](c&&c.id):p[2]};
}

/* สิทธิ์ Valet ("ฝากกุญแจ") ตัวเดียวกับปุ่มจับมือในแชต — เปิดได้ด้วยการกดของผู้ใช้เท่านั้น */
const on=()=>!!(LG("valet",{})||{}).on;
const allow=()=>LS("valet",{on:true,at:Date.now()});
/* เบอร์แบบปิดกลาง สำหรับสรุปบนจอ/ให้ AI อ่านทวน */
const maskPhone=v=>{const p=cleanPhone(v);return p.length>=9?p.slice(0,3)+"-xxx-"+p.slice(-4):""};

W.CendonValetCore=Object.freeze({on,allow,maskPhone,addCar,setKm,pickCar,setTheme,threads,isMech,shopStatus,PAGES,pageOf,api,cars,carName,carLabel,curCar,findCar,here,lastHere,revgeo,savedPhone,cleanPhone,okPhone,
  post,shops,shopName,quote,message,jobs,job,jobDo,JOB_OPS,logAdd,dueSet,SVC,DUE,today,okDate,T});
})(window);
