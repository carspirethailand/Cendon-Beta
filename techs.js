/* ═══════════════════════════════════════════════════════════════════
   ระบบช่าง — คลังข้อมูลช่างและเครื่องมือค้นหา
   ───────────────────────────────────────────────────────────────────
   ไฟล์นี้ถูกใช้ร่วมกันสามที่ จึงไม่ผูกกับหน้าไหนเลย
     techs.html  หน้าตลาดช่าง
     index.html  ทางลัดหน้าหลัก
     chat.html   ให้ AI รู้จักช่างทุกคนและค้นหาแทนผู้ใช้ได้

   เหตุผลที่แยกออกมาเป็นไฟล์เดียว ไม่ก๊อปไปวางในแต่ละหน้า
   เพราะถ้าข้อมูลช่างอยู่สามที่ วันหนึ่งมันจะไม่ตรงกัน แล้ว AI จะแนะนำ
   ช่างที่หน้าเว็บไม่มี ซึ่งแย่กว่าไม่มีระบบช่างเลย
   ═══════════════════════════════════════════════════════════════════ */
(function(g){
"use strict";

/* ── หมวดช่าง ──
   สี่หมวดแรกคือหมวดหลักที่ผู้ใช้เห็นเป็นแท็บ ที่เหลืออยู่ใต้ "อื่นๆ"
   near ไม่ใช่ป้ายที่ติดมากับตัวช่าง แต่คำนวณจากระยะทางตอนค้นหา
   ช่างคนเดียวกันจึงเป็น "ใกล้บ้าน" ของคนหนึ่งและไม่ใช่ของอีกคนได้ */
const CATS=[
  {id:"near", th:"ใกล้บ้าน",       en:"Near me",     ic:"ti-map-pin",       desc:"เรียงตามระยะทางจากตำแหน่งคุณ"},
  {id:"quick",th:"ช่างด่วน",        en:"Urgent",      ic:"ti-bolt",          desc:"รับงานด่วน ตอบไว ออกนอกสถานที่ได้"},
  {id:"pro",  th:"ช่างมืออาชีพ",     en:"Professional",ic:"ti-award",         desc:"ผ่านการตรวจสอบ ประสบการณ์สูง คะแนนดี"},
  {id:"body", th:"ตัวถัง & สี",      en:"Body & paint",ic:"ti-spray",         desc:"เคาะ พ่นสี เก็บรอย"},
  {id:"ev",   th:"ไฟฟ้า & EV",      en:"Electric & EV",ic:"ti-bolt-filled",  desc:"ระบบไฟ แบตเตอรี่ รถไฟฟ้า"},
  {id:"tyre", th:"ยาง & ช่วงล่าง",   en:"Tyres & suspension",ic:"ti-car-crash",desc:"ยาง เบรก โช้ก ตั้งศูนย์"},
  {id:"air",  th:"แอร์รถยนต์",       en:"Air-con",     ic:"ti-air-conditioning",desc:"แอร์ไม่เย็น ล้างตู้ เติมน้ำยา"},
  {id:"eng",  th:"เครื่องยนต์",       en:"Engine",      ic:"ti-engine",        desc:"เครื่อง เกียร์ ระบบส่งกำลัง"},
];
const MAIN_CATS=["near","quick","pro"];

/* ── เกณฑ์การสมัครเป็นช่าง ──
   ยึดแนวทางเดียวกับตลาดฟรีแลนซ์ที่ใช้กันจริง คือเกณฑ์ต้องตรวจสอบได้
   ไม่ใช่คำสวย ๆ เช่น "ต้องมีใจรักบริการ" ซึ่งไม่มีใครวัดได้
   req = บังคับ ถ้าไม่ผ่านจะสมัครไม่ได้  ส่วนที่เหลือคือคะแนนสะสม */
const RULES=[
  {id:"age",   req:true,  th:"อายุ 18 ปีขึ้นไป",                     detail:"ต้องรับผิดชอบตามสัญญาจ้างได้ตามกฎหมาย"},
  {id:"id",    req:true,  th:"ยืนยันตัวตนด้วยบัตรประชาชน",             detail:"ถ่ายบัตรคู่กับใบหน้า ใช้ตรวจสอบครั้งเดียวแล้วลบภาพทิ้ง"},
  {id:"phone", req:true,  th:"เบอร์โทรที่ติดต่อได้จริง",                detail:"ระบบจะส่งรหัสไปยืนยัน ลูกค้าติดต่อผ่านเบอร์กลางเท่านั้น"},
  {id:"exp",   req:true,  th:"ประสบการณ์ซ่อมรถอย่างน้อย 1 ปี",         detail:"ระบุร้านหรืออู่ที่เคยทำ ให้ทีมงานโทรสอบถามได้"},
  {id:"port",  req:true,  th:"ผลงานอย่างน้อย 3 ชิ้น พร้อมรูป",         detail:"รูปงานจริงที่ทำเอง ไม่ใช่รูปจากอินเทอร์เน็ต"},
  {id:"area",  req:true,  th:"ระบุพื้นที่ให้บริการชัดเจน",              detail:"เขต/อำเภอ และรัศมีที่ยอมเดินทาง"},
  {id:"price", req:true,  th:"ตั้งราคาเริ่มต้นและขอบเขตงาน",            detail:"ลูกค้าต้องรู้ราคาคร่าว ๆ ก่อนทัก ไม่ใช่ทักมาแล้วค่อยคุย"},
  {id:"warr",  req:true,  th:"รับประกันงานอย่างน้อย 7 วัน",            detail:"งานเสียซ้ำจากสาเหตุเดิม ต้องแก้ให้ฟรี"},
  {id:"reply", req:true,  th:"ตอบกลับลูกค้าภายใน 24 ชั่วโมง",          detail:"ตอบช้าเกินเกณฑ์ติดกัน 3 ครั้ง ระบบจะพักการแสดงผลชั่วคราว"},
  {id:"cert",  req:false, th:"ใบรับรองวิชาชีพ (ถ้ามี)",                detail:"กรมพัฒนาฝีมือแรงงาน หรือใบอบรมจากค่ายรถ — ได้ป้าย ‘มืออาชีพ’"},
  {id:"ins",   req:false, th:"ประกันความเสียหายจากการทำงาน (ถ้ามี)",   detail:"ช่วยให้ได้งานใหญ่ที่ลูกค้าห่วงเรื่องความเสี่ยง"},
];
/* เกณฑ์หลังรับเข้าระบบแล้ว — บอกไว้ตั้งแต่ต้นดีกว่าให้ไปเจอเอาทีหลัง */
const KEEP=[
  "คะแนนเฉลี่ยต่ำกว่า 4.0 จาก 5 งานล่าสุด ทีมงานจะติดต่อไปทบทวน",
  "ยกเลิกงานที่รับแล้วเกิน 10% ของงานทั้งหมด จะถูกลดลำดับการแสดงผล",
  "ค่าธรรมเนียมระบบ 10% ของค่าแรง หักเมื่อลูกค้ายืนยันว่างานเสร็จ",
  "ห้ามพาลูกค้าออกไปติดต่อนอกระบบ เพราะจะไม่มีใครคุ้มครองทั้งสองฝ่าย",
];

/* ── ช่างในระบบ ──
   ตัวเลขทุกตัวมีที่มา: rating คือคะแนนเฉลี่ยจากงานที่ปิดแล้ว
   jobs คือจำนวนงานที่ปิดสำเร็จ  reply คือค่ามัธยฐานเวลาตอบกลับเป็นนาที
   lat/lng ใช้คำนวณ "ใกล้บ้าน" — ไม่มีพิกัดก็จะไม่มีวันโผล่ในหมวดนั้น */
const SEED=[
 {id:"t01",name:"สมชาย ภู่ระหงษ์",shop:"ช่างชายมอเตอร์",area:"ลาดพร้าว กรุงเทพฯ",lat:13.8060,lng:100.6100,
  cats:["eng","air"],rating:4.9,jobs:412,years:18,from:500,to:6500,reply:12,verified:true,mobile:true,urgent:true,
  brands:["Toyota","Honda","Isuzu"],warranty:30,
  skills:["เครื่องสั่น","เครื่องร้อน","เกียร์กระตุก","แอร์ไม่เย็น","เช็กระยะ"],
  about:"ทำเครื่องยนต์เบนซินและดีเซลมา 18 ปี ถนัดอาการเครื่องสั่นและเกียร์กระตุกที่ร้านทั่วไปหาไม่เจอ มีเครื่องอ่านโค้ดของศูนย์"},
 {id:"t02",name:"ณัฐพล วงศ์อารีย์",shop:"NP Auto Electric",area:"บางนา กรุงเทพฯ",lat:13.6680,lng:100.6040,
  cats:["ev","eng"],rating:4.8,jobs:266,years:11,from:800,to:22000,reply:20,verified:true,mobile:true,urgent:true,
  brands:["BYD","Tesla","MG","Ora"],warranty:60,
  skills:["รถไฟฟ้า","แบตเตอรี่","ระบบชาร์จ","ไฟรั่ว","สายไฟไหม้"],
  about:"เรียนมาทางไฟฟ้ากำลัง แล้วมาต่อสายรถไฟฟ้าโดยเฉพาะ รับเช็กสุขภาพแบตและระบบชาร์จบ้าน มีเครื่องวัดความจุแบตจริงไม่ใช่เดาจากหน้าปัด"},
 {id:"t03",name:"อรรถพล สุขเจริญ",shop:"อู่ช่างเอก ตัวถังสี",area:"บางแค กรุงเทพฯ",lat:13.7130,lng:100.3990,
  cats:["body"],rating:4.7,jobs:189,years:14,from:1500,to:45000,reply:45,verified:true,mobile:false,urgent:false,
  brands:["ทุกยี่ห้อ"],warranty:90,
  skills:["เคาะ","พ่นสี","เก็บรอยขนแมว","ชนหนัก","เคลมประกัน"],
  about:"ห้องพ่นสีอบความร้อน เทียบสีด้วยเครื่องไม่ใช่เทียบด้วยตา รับงานเคลมประกันและงานจ่ายเอง แจ้งราคาก่อนลงมือทุกครั้ง"},
 {id:"t04",name:"กิตติศักดิ์ ทองใบ",shop:"ยางดีช่วงล่างดี",area:"รังสิต ปทุมธานี",lat:14.0350,lng:100.7310,
  cats:["tyre"],rating:4.8,jobs:521,years:9,from:300,to:15000,reply:8,verified:true,mobile:true,urgent:true,
  brands:["ทุกยี่ห้อ"],warranty:14,
  skills:["ยางแตกข้างทาง","ตั้งศูนย์","ถ่วงล้อ","โช้กอัพ","ลูกหมาก","เบรก"],
  about:"มีรถออกไปเปลี่ยนยางถึงที่ทั่วรังสิต–ดอนเมือง ตี 2 ก็ไป คิดค่าเดินทางตามจริง บอกราคาก่อนออกรถเสมอ"},
 {id:"t05",name:"วีระ ชูเกียรติ",shop:"แอร์เย็นยกกำลัง",area:"นนทบุรี",lat:13.8620,lng:100.5140,
  cats:["air"],rating:4.9,jobs:333,years:16,from:450,to:9000,reply:15,verified:true,mobile:true,urgent:true,
  brands:["ทุกยี่ห้อ"],warranty:30,
  skills:["แอร์ไม่เย็น","ล้างตู้แอร์","คอมเพรสเซอร์","น้ำยารั่ว","กลิ่นอับ"],
  about:"ล้างตู้แอร์แบบถอดคอนโซล ไม่ใช่พ่นโฟมเข้าช่องลมแล้วเรียกว่าล้าง หาจุดรั่วด้วยไนโตรเจน มีรูปก่อน–หลังให้ดูทุกงาน"},
 {id:"t06",name:"ธนกฤต แสนสุข",shop:"ธนกฤตเซอร์วิส",area:"เมือง เชียงใหม่",lat:18.7880,lng:98.9850,
  cats:["eng","tyre"],rating:4.6,jobs:154,years:7,from:400,to:12000,reply:25,verified:true,mobile:true,urgent:false,
  brands:["Toyota","Nissan","Mazda"],warranty:30,
  skills:["เช็กระยะ","เปลี่ยนถ่ายน้ำมัน","เบรก","ครัช","สายพาน"],
  about:"รับงานเช็กระยะและงานซ่อมทั่วไปในตัวเมืองเชียงใหม่ ทำงานคนเดียว งานจึงไม่เยอะแต่ตามงานได้ตลอด"},
 {id:"t07",name:"ปิยะ ศรีสวัสดิ์",shop:"P.S. Diesel",area:"หาดใหญ่ สงขลา",lat:7.0080,lng:100.4760,
  cats:["eng"],rating:4.7,jobs:207,years:21,from:600,to:38000,reply:35,verified:true,mobile:false,urgent:false,
  brands:["Isuzu","Toyota","Ford","Mitsubishi"],warranty:60,
  skills:["ดีเซล","หัวฉีด","ปั๊มติ๊ก","ควันดำ","เทอร์โบ"],
  about:"ทำกระบะดีเซลอย่างเดียวมา 21 ปี มีแท่นทดสอบหัวฉีด รับงานควันดำและกำลังตกที่แก้ที่อื่นแล้วไม่หาย"},
 {id:"t08",name:"สุริยา แก้วมณี",shop:"Surya Mobile Fix",area:"ศรีราชา ชลบุรี",lat:13.1740,lng:100.9300,
  cats:["eng","ev","tyre"],rating:4.5,jobs:98,years:5,from:350,to:8000,reply:6,verified:false,mobile:true,urgent:true,
  brands:["ทุกยี่ห้อ"],warranty:7,
  skills:["สตาร์ทไม่ติด","แบตหมด","พ่วงแบต","ยางแบน","รถเสียข้างทาง"],
  about:"รับเฉพาะงานฉุกเฉินข้างทางในชลบุรี–ระยอง ตอบเร็วที่สุดในระบบ ยังไม่ผ่านการตรวจสอบเอกสารครบ จึงยังไม่ได้ป้ายมืออาชีพ"},
 {id:"t09",name:"มานพ อินทร์แก้ว",shop:"อู่มานพ ช่วงล่าง",area:"เมือง ขอนแก่น",lat:16.4320,lng:102.8230,
  cats:["tyre","eng"],rating:4.8,jobs:276,years:13,from:400,to:18000,reply:30,verified:true,mobile:false,urgent:false,
  brands:["ทุกยี่ห้อ"],warranty:30,
  skills:["ช่วงล่างมีเสียง","โช้ก","สปริง","บู๊ช","ตั้งศูนย์"],
  about:"ถนัดอาการมีเสียงจากช่วงล่างที่บอกไม่ถูกว่ามาจากไหน ให้ลูกค้านั่งไปด้วยตอนทดลองวิ่ง จะได้ชี้ได้ว่าเสียงไหน"},
 {id:"t10",name:"ชลธี พงษ์ไพบูลย์",shop:"Chonlathee EV Care",area:"พระราม 9 กรุงเทพฯ",lat:13.7580,lng:100.5660,
  cats:["ev"],rating:4.9,jobs:141,years:6,from:900,to:65000,reply:18,verified:true,mobile:false,urgent:false,
  brands:["BYD","Tesla","Neta","Volvo","BMW"],warranty:90,
  skills:["แบตเสื่อม","BMS","มอเตอร์ไฟฟ้า","ระบบระบายความร้อน","อัปเดตซอฟต์แวร์"],
  about:"รับเฉพาะรถไฟฟ้าและปลั๊กอินไฮบริด มีอุปกรณ์ตัดไฟแรงสูงตามมาตรฐาน งานแบตต้องนัดล่วงหน้า เพราะใช้เวลาทั้งวัน"},
 {id:"t11",name:"อนุชา เรืองศรี",shop:"อนุชาเคาะพ่นสี",area:"เมือง ภูเก็ต",lat:7.8890,lng:98.3980,
  cats:["body","tyre"],rating:4.4,jobs:86,years:8,from:1200,to:30000,reply:60,verified:false,mobile:false,urgent:false,
  brands:["ทุกยี่ห้อ"],warranty:30,
  skills:["เคาะ","พ่นสี","กันชนแตก","ขัดสี","เคลือบแก้ว"],
  about:"งานสีและงานขัดเคลือบในภูเก็ต คิวค่อนข้างยาวช่วงไฮซีซัน ตอบช้ากว่าคนอื่นเพราะอยู่ในห้องพ่นทั้งวัน"},
 {id:"t12",name:"เกรียงไกร ดวงดี",shop:"KK Fast Service",area:"ดอนเมือง กรุงเทพฯ",lat:13.9130,lng:100.6000,
  cats:["eng","air","tyre"],rating:4.6,jobs:318,years:10,from:350,to:14000,reply:5,verified:true,mobile:true,urgent:true,
  brands:["Toyota","Honda","Mazda","Suzuki"],warranty:14,
  skills:["รถเสียข้างทาง","สตาร์ทไม่ติด","แอร์ไม่เย็น","เบรก","เปลี่ยนแบต"],
  about:"รับงานด่วนย่านดอนเมือง–หลักสี่–รังสิต ตอบเร็วเฉลี่ย 5 นาที มีรถบริการ 2 คัน ทำงานถึงเที่ยงคืน"},
];

/* ── ช่างที่สมัครผ่านหน้าเว็บ ──
   เก็บไว้ในเครื่องก่อน แล้วส่งขึ้นเซิร์ฟเวอร์เมื่อมีปลายทางให้ส่ง
   เหตุที่ไม่ทิ้งใบสมัครไปเฉย ๆ ตอนส่งไม่สำเร็จ เพราะคนกรอกไปแล้วสิบกว่าช่อง
   ให้เขากรอกใหม่เพราะเน็ตหลุดคือความผิดของแอป ไม่ใช่ของเขา */
const AKEY="spire_tech_apps";
function apps(){ try{ return JSON.parse(localStorage.getItem(AKEY)||"[]") }catch(e){ return [] } }
function saveApps(a){ try{ localStorage.setItem(AKEY,JSON.stringify(a)) }catch(e){} }

/* ช่างที่ดึงมาจากเซิร์ฟเวอร์ หน้าไหนโหลดได้ก็เติมเข้ามาผ่าน merge() */
let REMOTE=[];
function merge(list){
  if(!list||!list.length)return;
  const by={}; REMOTE.forEach(t=>by[t.id]=t);
  list.forEach(t=>{ if(t&&t.id)by[t.id]=t });
  REMOTE=Object.keys(by).map(k=>by[k]);
}
/* รายชื่อทั้งหมดที่ใช้ค้นหาได้จริง = ช่างในระบบ + ช่างจากเซิร์ฟเวอร์
   ใบสมัครที่ยังไม่อนุมัติไม่อยู่ในนี้ เพราะยังไม่มีใครตรวจว่าเขาเป็นช่างจริง */
function all(){
  const by={}; SEED.forEach(t=>by[t.id]=t); REMOTE.forEach(t=>by[t.id]=t);
  return Object.keys(by).map(k=>by[k]);
}

/* ── ระยะทางระหว่างสองพิกัด (กิโลเมตร) ──
   สูตร haversine ปัดโลกเป็นทรงกลม คลาดเคลื่อนไม่เกินครึ่งเปอร์เซ็นต์
   ซึ่งละเอียดเกินพอสำหรับคำว่า "อยู่ใกล้บ้านไหม" */
function km(a,b,c,d){
  if(a==null||c==null)return null;
  const R=6371,r=Math.PI/180;
  const dLa=(c-a)*r,dLo=(d-b)*r;
  const h=Math.sin(dLa/2)**2+Math.cos(a*r)*Math.cos(c*r)*Math.sin(dLo/2)**2;
  return Math.round(R*2*Math.asin(Math.sqrt(h))*10)/10;
}

/* ── ตำแหน่งของผู้ใช้ ──
   ถามครั้งเดียวแล้วจำไว้ ไม่ถามซ้ำทุกครั้งที่เปิดหน้า
   ถ้าเขาไม่ให้ ก็ไม่ต้องง้อ — หมวดใกล้บ้านจะเปลี่ยนไปเรียงตามคะแนนแทน */
const PKEY="spire_geo";
function pos(){ try{ const p=JSON.parse(localStorage.getItem(PKEY)||"null");
  return (p&&p.lat!=null)?p:null }catch(e){ return null } }
function askPos(){
  return new Promise(res=>{
    const had=pos(); if(had)return res(had);
    if(!navigator.geolocation)return res(null);
    navigator.geolocation.getCurrentPosition(
      p=>{ const v={lat:p.coords.latitude,lng:p.coords.longitude,t:Date.now()};
           try{ localStorage.setItem(PKEY,JSON.stringify(v)) }catch(e){} res(v) },
      ()=>res(null),{timeout:8000,maximumAge:600000});
  });
}

/* ── ค้นหา ──
   นี่คือหัวใจของทั้งระบบ ทั้งหน้าเว็บและ AI เรียกฟังก์ชันเดียวกันตัวนี้
   ผลลัพธ์จึงตรงกันเสมอ ไม่มีทางที่ AI จะแนะนำช่างที่กดแล้วไม่เจอ

   q     คำค้น จับได้ทั้งชื่อ ร้าน พื้นที่ อาการ และยี่ห้อรถ
   cat   หมวด
   here  พิกัดผู้ใช้ ใช้คำนวณระยะและกรองหมวดใกล้บ้าน
   sort  best | near | rating | cheap | fast
   max   งบสูงสุดที่รับได้ */
function search(o){
  o=o||{};
  const here=o.here||pos();
  const q=(o.q||"").trim().toLowerCase();
  const words=q?q.split(/\s+/).filter(Boolean):[];
  let list=all().map(t=>{
    const d=here?km(here.lat,here.lng,t.lat,t.lng):null;
    return Object.assign({},t,{dist:d});
  });

  if(o.cat&&o.cat!=="all"){
    if(o.cat==="near")      list=list.filter(t=>t.dist==null||t.dist<=(o.radius||40));
    else if(o.cat==="quick")list=list.filter(t=>t.urgent||t.reply<=20);
    else if(o.cat==="pro")  list=list.filter(t=>t.verified&&t.rating>=4.6&&t.years>=8);
    else                    list=list.filter(t=>(t.cats||[]).indexOf(o.cat)>=0);
  }
  if(o.mobile)   list=list.filter(t=>t.mobile);
  if(o.verified) list=list.filter(t=>t.verified);
  if(o.max)      list=list.filter(t=>t.from<=o.max);

  /* ให้คะแนนความตรงคำค้น ยิ่งตรงจุดสำคัญยิ่งได้มาก
     อาการที่ผู้ใช้พิมพ์ (เช่น "แอร์ไม่เย็น") สำคัญกว่าชื่อร้าน
     เพราะคนที่รถเสียไม่รู้จักชื่อร้านอยู่แล้ว เขารู้แค่ว่ารถเป็นอะไร */
  if(words.length){
    list=list.map(t=>{
      let sc=0;
      const hay={
        skill:(t.skills||[]).join(" ").toLowerCase(),
        about:(t.about||"").toLowerCase(),
        name:((t.name||"")+" "+(t.shop||"")).toLowerCase(),
        area:(t.area||"").toLowerCase(),
        brand:(t.brands||[]).join(" ").toLowerCase(),
      };
      words.forEach(w=>{
        if(hay.skill.indexOf(w)>=0)sc+=10;
        if(hay.area.indexOf(w)>=0) sc+=8;
        if(hay.name.indexOf(w)>=0) sc+=6;
        if(hay.brand.indexOf(w)>=0)sc+=5;
        if(hay.about.indexOf(w)>=0)sc+=2;
      });
      return Object.assign({},t,{score:sc});
    }).filter(t=>t.score>0);
  }

  const sort=o.sort||"best";
  list.sort((a,b)=>{
    if(sort==="near"&&a.dist!=null&&b.dist!=null)return a.dist-b.dist;
    if(sort==="rating")return b.rating-a.rating;
    if(sort==="cheap") return a.from-b.from;
    if(sort==="fast")  return a.reply-b.reply;
    /* best = ตรงคำค้นก่อน แล้วค่อยดูว่าใกล้ไหม แล้วค่อยดูคะแนนกับจำนวนงาน
       จำนวนงานอยู่ท้ายสุดโดยตั้งใจ ไม่งั้นช่างใหม่ที่ฝีมือดีจะไม่มีวันได้ขึ้นหน้าแรก */
    const s=(b.score||0)-(a.score||0); if(s)return s;
    if(o.cat==="near"&&a.dist!=null&&b.dist!=null&&Math.abs(a.dist-b.dist)>2)return a.dist-b.dist;
    const r=b.rating-a.rating; if(Math.abs(r)>0.15)return r;
    return b.jobs-a.jobs;
  });
  return o.limit?list.slice(0,o.limit):list;
}

/* ── สรุปช่างเป็นข้อความสั้น ──
   ใช้ส่งให้ AI อ่าน จึงต้องสั้นที่สุดเท่าที่ยังตัดสินใจได้
   ถ้ายัดประวัติเต็มของทุกคนเข้าไป จะกินที่จนไม่เหลือให้บทสนทนาจริง */
function line(t){
  return `${t.id} | ${t.name} (${t.shop}) | ${t.area}`
    +(t.dist!=null?` ~${t.dist}กม.`:"")
    +` | ${t.rating}★ ${t.jobs}งาน ${t.years}ปี`
    +` | ${t.from.toLocaleString()}-${t.to.toLocaleString()}บ.`
    +` | ตอบ~${t.reply}น. รับประกัน${t.warranty}วัน`
    +(t.verified?" | ตรวจสอบแล้ว":"")+(t.mobile?" | ออกนอกสถานที่":"")+(t.urgent?" | งานด่วน":"")
    +` | ถนัด: ${(t.skills||[]).join(", ")}`;
}
/* ข้อมูลช่างทั้งระบบในรูปแบบที่แนบไปกับคำสั่งของ AI ได้เลย */
function brief(here){
  const l=search({here,sort:"rating"});
  return "ช่างในระบบ Cendon ทั้งหมด "+l.length+" คน (ใช้ข้อมูลนี้เท่านั้น ห้ามแต่งช่างขึ้นมาเอง):\n"
    +l.map(line).join("\n")
    +"\nหมวดที่ค้นได้: "+CATS.map(c=>c.id+"="+c.th).join(", ")
    +"\nเวลาแนะนำช่าง ให้บอกชื่อ ร้าน พื้นที่ ราคาเริ่มต้น และเหตุผลที่เลือกคนนี้ แล้วบอกให้กดดูที่หน้า ‘ช่าง’";
}

g.Techs={CATS,MAIN_CATS,MAIN:MAIN_CATS,RULES,KEEP,SEED,
  all,search,brief,line,km,pos,askPos,merge,apps,saveApps};
})(window);
