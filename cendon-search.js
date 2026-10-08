/* ══════════════════════════════════════════════════════════════════
   Cendon — ค้นช่างและบริการด้วยคำค้น + แผงผลลัพธ์

   ใช้กับ AI ในหน้าแชต (แบบเดียวกับผู้ช่วยของ Fastwork)
     1. ผู้ใช้พิมพ์ว่าอยากหาช่าง/บริการ ("อยากได้คนล้างรถ", "หาที่เปลี่ยนผ้าเบรกใกล้ ๆ")
        → ค้นก่อนส่งให้ AI แล้วแนบผลให้ AI เลือกแนะนำจากของจริงในแอป
     2. AI วินิจฉัยแล้วแนะนำให้ไปหาช่าง → AI ปิดท้ายด้วย [[ค้นหา: …]] เราค้นให้เอง
     3. คำตอบมีการ์ด "ค้นหา: … · N ผลลัพธ์ · ดู" กดแล้วเปิดแผง
        คอม = แผงด้านขวา (แชตหดเหลือฝั่งซ้าย) · มือถือ = แผ่นเต็มจอ ปุ่มย้อนกลับปิดได้

   แนะนำเฉพาะช่างของ Cendon — ตอนผู้ใช้หาช่าง หน้าแชตปิดการค้นเว็บรอบนั้น และสั่ง AI ห้ามแนะนำอู่/แอปนอก Cendon
   ข้อมูลมาจาก /api/tech/gigs (บริการพร้อมราคา) และ /api/tech (ร้าน) ที่เปิดอยู่แล้ว
   ค้นในเครื่อง ไม่ต้องรอหลังบ้าน deploy อะไรเพิ่ม
   ══════════════════════════════════════════════════════════════════ */
(function(){
"use strict";
const API=()=>window.TECH_API_URL||"https://spireonebackend.carspirethailand.workers.dev";
const EN=()=>{try{return JSON.parse(localStorage.getItem("spire_lang"))==="en"}catch(e){return false}};
const T=(th,en)=>EN()?en:th;
const esc=s=>String(s==null?"":s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const money=n=>Number(n||0).toLocaleString("th-TH");
const img=id=>`${API()}/api/tech/img/${id}`;

/* หมวดชุดเดียวกับแถวหมวดหน้าแรก (img/cat/<id>.webp) + คำที่คนใช้เรียกจริง
   หมวดย่อยมาก่อนหมวดหลัก "ล้างแอร์" จะได้ตกหมวดล้างแอร์ ไม่ใช่แอร์เฉย ๆ */
const CATS=[
  {id:"air-clean",base:"air",th:"ล้างแอร์ เติมน้ำยา",en:"A/C cleaning",kw:/ล้างแอร์|ล้างตู้แอร์|เติมน้ำยาแอร์|น้ำยาแอร์|เติมแอร์/},
  {id:"air",th:"แอร์รถยนต์",en:"Car A/C",kw:/แอร์|ไม่เย็น|คอมแอร์|คอมเพรสเซอร์|\ba\/?c\b|air ?con/i},
  {id:"oil",base:"eng",th:"เปลี่ยนน้ำมันเครื่อง",en:"Oil change",kw:/น้ำมันเครื่อง|ถ่ายน้ำมัน|เปลี่ยนถ่าย|กรองน้ำมัน|oil change/i},
  {id:"service",base:"eng",th:"เช็กระยะ",en:"Scheduled service",kw:/เช็กระยะ|เช็คระยะ|ตรวจเช็[กค]|ตรวจสภาพ|บำรุงรักษา|service/i},
  {id:"gear",base:"eng",th:"เกียร์ คลัตช์",en:"Gearbox & clutch",kw:/เกียร์|คลัตช์|คลัทช์|ครัช|gear|clutch/i},
  {id:"cool",base:"eng",th:"หม้อน้ำ ระบบหล่อเย็น",en:"Cooling system",kw:/หม้อน้ำ|ความร้อนขึ้น|ความร้อนสูง|หล่อเย็น|คูลแลนท์|coolant|radiator/i},
  {id:"exhaust",base:"eng",th:"ท่อไอเสีย",en:"Exhaust",kw:/ท่อไอเสีย|หม้อพัก|ปลายท่อ|ควันดำ|exhaust/i},
  {id:"eng",th:"เครื่องยนต์",en:"Engine",kw:/เครื่องยนต์|เครื่องสั่น|เครื่องดับ|เครื่องเดินไม่เรียบ|ซ่อมเครื่อง|หัวฉีด|จูน|ไฟเครื่อง|engine/i},
  {id:"brake",base:"tyre",th:"เบรก ผ้าเบรก",en:"Brakes",kw:/เบรก|เบรค|ผ้าเบรก|ผ้าเบรค|จานเบรก|brake/i},
  {id:"align",base:"tyre",th:"ตั้งศูนย์ ถ่วงล้อ",en:"Alignment",kw:/ตั้งศูนย์|ถ่วงล้อ|ศูนย์ล้อ|alignment/i},
  {id:"susp",base:"tyre",th:"ช่วงล่าง โช้ค",en:"Suspension",kw:/ช่วงล่าง|โช้ค|โช๊ค|ลูกหมาก|บูช|suspension|shock/i},
  {id:"tyre",th:"ยาง ปะยาง",en:"Tyres",kw:/ยาง|ปะยาง|ล้อแม็ก|tyre|tire/i},
  {id:"battery",base:"ev",th:"แบตเตอรี่",en:"Battery",kw:/แบต|สตาร์ทไม่ติด|จั๊มพ์|จั๊ม|battery/i},
  {id:"audio",base:"ev",th:"เครื่องเสียง กล้องติดรถ",en:"Audio & dashcam",kw:/เครื่องเสียง|ลำโพง|กล้องติดรถ|กล้องหน้ารถ|จอแอนดรอยด์|วิทยุ|dash ?cam/i},
  {id:"ev",th:"ระบบไฟ EV",en:"Electrical & EV",kw:/\bev\b|อีวี|รถไฟฟ้า|ระบบไฟ|ไดชาร์จ|สายไฟ|ไฟหน้า|ไฟท้าย|electrical/i},
  {id:"wash",base:"body",th:"ล้างรถ",en:"Car wash",kw:/ล้างรถ|คาร์แคร์|car ?wash|ดูดฝุ่น|ซักเบาะ|ล้างห้องเครื่อง|ล้างอัดฉีด/i},
  {id:"detail",base:"body",th:"ขัดสี เคลือบเงา",en:"Polish & coating",kw:/ขัดสี|ขัดเงา|เคลือบ|แว็กซ์|แวกซ์|wax|เซรามิก|ceramic|detailing|ดีเทล/i},
  {id:"glass",base:"body",th:"กระจก ฟิล์ม",en:"Glass & tint",kw:/ฟิล์ม|กระจก|ที่ปัดน้ำฝน|tint|windshield/i},
  {id:"body",th:"เคาะ พ่นสี",en:"Body & paint",kw:/เคาะ|พ่นสี|ทำสี|บุบ|รอยขีด|ขีดข่วน|ตัวถัง|กันชน|โดนชน|รถชน|body ?work|paint/i},
  {id:"tow",base:"mobile",th:"รถยก ลากรถ",en:"Towing",kw:/รถยก|ลากรถ|รถสไลด์|สไลด์|เคลื่อนย้ายรถ|tow/i},
  {id:"mobile",th:"ช่างมาถึงที่",en:"Comes to you",kw:/มาถึงที่|นอกสถานที่|ถึงบ้าน|ถึงที่|มาที่บ้าน|มาหา|on ?site|mobile mechanic/i}
];
const CAT=Object.fromEntries(CATS.map(c=>[c.id,c]));
const OTHER={id:"other",th:"บริการอื่น ๆ",en:"Other services"};
const baseOf=id=>(CAT[id]&&CAT[id].base)||id;
/* คำที่บอกว่ากำลังหาคนทำให้ (ไม่ใช่แค่ถามอาการ) — "แอร์ไม่เย็นเกิดจากอะไร" ไม่ต้องค้น ให้ AI วิเคราะห์ก่อน */
const FIND=/หา|อยากได้|แนะนำ|ที่ไหน|ร้าน|อู่|ช่าง|ใกล้|จ้าง|บริการ|ราคา|เท่าไ[รห]|ใครรับ|รับทำ|มีใคร|ไปไหน|ต้องไป|ซ่อมที่|จองคิว|find|near|recommend|shop|mechanic|garage|price|hire|book/i;
const WHO=/ช่าง|อู่|ร้านซ่อม|ซ่อมที่ไหน|เอารถไป|mechanic|garage|workshop/i;
const STOP=/อยากได้|อยาก|ช่วย|หา|แนะนำ|ให้หน่อย|หน่อย|ครับ|ค่ะ|คะ|นะ|ที่ไหน|ดี|ใกล้\s*ๆ|ใกล้|ร้าน|อู่|ช่าง|คน|บริการ|ราคา|เท่าไหร่|เท่าไร|รับ|ทำ|มีใคร|ไหม|มั้ย|บ้าง|แถว|ๆ|\?|find|me|a|the|near|recommend/gi;

function detect(text){const t=String(text||"");return CATS.filter(c=>c.kw.test(t)).map(c=>c.id)}
function wants(text){const t=String(text||"");return (FIND.test(t)&&detect(t).length>0)||WHO.test(t)}

/* ── ข้อมูล: โหลดครั้งเดียว เก็บไว้ 2 นาที ── */
let cache=null,cacheAt=0;
async function data(){
  if(cache&&Date.now()-cacheAt<120000)return cache;
  const get=p=>fetch(API()+p,{cache:"no-store"}).then(r=>r.ok?r.json():{}).catch(()=>({}));
  const [g,t]=await Promise.all([get("/api/tech/gigs"),get("/api/tech")]);
  cache={gigs:Array.isArray(g.gigs)?g.gigs:[],techs:Array.isArray(t.techs)?t.techs:[]};cacheAt=Date.now();
  return cache;
}
function here(){try{const h=JSON.parse(localStorage.getItem("spire_tech_here"));return h&&isFinite(h.lat)?h:null}catch(e){return null}}
function km(a,b){if(!a||!b||!isFinite(b.lat)||!isFinite(b.lng))return null;const R=6371,r=x=>x*Math.PI/180,dl=r(b.lat-a.lat),dg=r(b.lng-a.lng);
  const s=Math.sin(dl/2)**2+Math.cos(r(a.lat))*Math.cos(r(b.lat))*Math.sin(dg/2)**2;return 2*R*Math.asin(Math.sqrt(s))}
const gigCat=g=>{for(const c of g.cats||[])if(CAT[c])return c;const d=detect((g.title||"")+" "+(g.body||""));return d[0]||"other"};
const tokens=q=>String(q||"").toLowerCase().replace(STOP," ").split(/\s+/).filter(w=>w.length>=2).slice(0,6);
/* หัวข้อที่โชว์: ชื่อหมวดที่จับได้ ("อยากได้คนล้างรถ" → "ล้างรถ") ไม่ใช่ประโยคเต็มที่ผู้ใช้พิมพ์ */
const nice=(q,cats)=>cats.length?cats.slice(0,2).map(c=>EN()?CAT[c].en:CAT[c].th).join(" · "):(String(q).replace(STOP," ").replace(/\s+/g," ").trim()||q);
const quality=t=>(t&&t.reviewCount?Number(t.rating||0)*0.6+Math.log2(1+t.reviewCount)*0.4:0)+(t&&t.verified?0.3:0);

/* ── ค้น: ตรงหมวด > ตรงคำ > คะแนนร้าน > ใกล้ ── */
async function find(text,opt){
  opt=opt||{};
  const q=String(text||"").trim().slice(0,80);
  const cats=opt.cats&&opt.cats.length?opt.cats:detect(q);
  const bases=[...new Set(cats.map(baseOf))],words=tokens(q),me=here();
  const {gigs,techs}=await data();
  const byId=Object.fromEntries(techs.map(t=>[t.id,t]));
  const textHit=s=>{s=String(s||"").toLowerCase();return words.reduce((a,w)=>a+(s.includes(w)?1:0),0)};
  const out=[];
  for(const g0 of gigs){
    const t={...(g0.tech||{}),...(byId[(g0.tech||{}).id]||{})},g={...g0,tech:t},c=gigCat(g);
    let s=0;
    if(cats.includes(c))s+=12;else if(bases.includes(baseOf(c))||bases.includes(c))s+=7;
    s+=textHit(g.title+" "+g.body)*3;
    if(cats.includes("mobile")&&t.mobile)s+=4;
    if(!cats.length&&!words.length)s+=1;
    if(s<=0)continue;
    const d=km(me,t);
    out.push({g,c,d,s:s+quality(t)-(d!=null?Math.min(d,60)/30:0)});
  }
  out.sort((a,b)=>b.s-a.s);
  /* ร้านที่ตรงหมวดแต่ยังไม่ได้ลงบริการพร้อมราคา — ยังควรเห็น */
  const withGig=new Set(out.map(x=>x.g.tech.id));
  const shops=techs.filter(t=>!withGig.has(t.id)).map(t=>{
    let s=0;const tc=[...(t.cats||[]),...(t.subs||[])];
    if(cats.some(c=>tc.includes(c)))s+=10;else if(bases.some(b=>tc.includes(b)))s+=6;
    s+=textHit((t.shop||"")+" "+(t.name||"")+" "+(t.about||"")+" "+(t.skills||[]).join(" "))*2;
    if(cats.includes("mobile")&&t.mobile)s+=6;
    if(!cats.length&&!words.length)s+=1;
    const d=km(me,t);return {t,d,s:s>0?s+quality(t)-(d!=null?Math.min(d,60)/30:0):0};
  }).filter(x=>x.s>0).sort((a,b)=>b.s-a.s).slice(0,24);
  const groups=[];const seen={};
  for(const x of out){const k=x.c;if(!seen[k]){seen[k]={cat:k,items:[]};groups.push(seen[k])}seen[k].items.push(x)}
  return {q:opt.label||nice(q,cats),cats,groups,shops,total:out.length+shops.length,gigCount:out.length,at:Date.now()};
}

/* ── ส่งให้ AI: รายการสั้น ๆ ให้เลือกแนะนำจากของจริง ── */
function context(r){
  if(!r)return "";
  const L=[];
  r.groups.forEach(gr=>gr.items.forEach(x=>{const t=x.g.tech||{};
    L.push(`- บริการ "${x.g.title}" โดยร้าน ${t.shop||t.name} · เริ่มต้น ฿${money(x.g.price)} · ${t.reviewCount?`★${Number(t.rating).toFixed(1)} (${t.reviewCount} รีวิว)`:"ร้านใหม่ ยังไม่มีรีวิว"}${t.mobile?" · ช่างไปถึงที่ได้":""}${x.d!=null?` · ห่าง ${x.d.toFixed(1)} กม.`:""}${t.verified?" · ผ่านการตรวจ":""}`)}));
  r.shops.forEach(x=>{const t=x.t;L.push(`- ร้าน ${t.shop||t.name}${t.area?` (${t.area})`:""} · ${t.from?`เริ่ม ฿${money(t.from)} · `:""}${t.reviewCount?`★${Number(t.rating).toFixed(1)} (${t.reviewCount} รีวิว)`:"ร้านใหม่"}${t.mobile?" · ไปถึงที่ได้":""}${x.d!=null?` · ห่าง ${x.d.toFixed(1)} กม.`:""}`)});
  if(!L.length)return `\n\n[ระบบค้นหาของ Cendon: ยังไม่มีร้านหรือบริการในแอปที่ตรงกับ "${r.q}"]\nบอกผู้ใช้ตรง ๆ ว่าตอนนี้ยังไม่มีช่างในหมวดนี้บน Cendon แนะนำให้กด "ขอราคา 3 ร้าน" ที่หน้าแรก ระบบจะส่งงานให้ช่างใกล้ ๆ มาเสนอราคา ห้ามแนะนำอู่ ร้าน เว็บไซต์ หรือแอปอื่นนอก Cendon และห้ามแต่งชื่อร้านขึ้นเอง ไม่ต้องใส่บรรทัด [[ค้นหา: …]]`;
  return `\n\n[ผลค้นหาในแอป Cendon สำหรับ "${r.q}" — ${r.total} รายการ ผู้ใช้เห็นรายการทั้งหมดเป็นการ์ดใต้คำตอบนี้แล้ว]\n${L.slice(0,8).join("\n")}\n`
    +`ตอบสั้น 2–4 ประโยค: บอกว่าเจออะไรบน Cendon แล้วแนะนำ 1–2 ตัวเลือกที่เหมาะที่สุดพร้อมเหตุผลสั้น ๆ (ราคา รีวิว ระยะทาง ไปถึงที่ได้) แนะนำได้เฉพาะช่างและร้านของ Cendon ในรายการนี้เท่านั้น ห้ามแนะนำอู่ ร้าน เว็บไซต์ หรือแอปอื่นนอก Cendon ห้ามแต่งร้าน ราคา หรือรีวิวเอง ไม่ต้องลิสต์ทุกร้าน ไม่ต้องใส่บรรทัด [[ค้นหา: …]]`;
}
/* AI ขอค้นเองได้ — วินิจฉัยเสร็จแล้วแนะนำให้ไปหาช่าง ก็ปิดท้ายด้วยคำค้น */
function rule(){
  return `\n\n[ค้นหาช่างใน Cendon] ถ้าผู้ใช้อยากหาหรือจ้างช่าง ร้าน หรือบริการ หรือคุณแนะนำให้เอารถไปให้ช่างดู ให้ปิดท้ายคำตอบด้วยบรรทัดเดียวรูปแบบนี้: [[ค้นหา: คำค้นสั้น ๆ]] เช่น [[ค้นหา: เปลี่ยนผ้าเบรก]] หรือ [[ค้นหา: ช่างแอร์]] ระบบจะค้นช่างของ Cendon แล้วแสดงให้ผู้ใช้เอง แนะนำได้เฉพาะช่างใน Cendon เท่านั้น ห้ามแนะนำอู่ ร้าน ศูนย์บริการ เว็บไซต์ หรือแอปอื่นนอก Cendon (รวมถึงที่เจอจากการค้นเว็บ) ห้ามแต่งชื่อร้าน ราคา หรือรีวิวขึ้นเอง ถ้าไม่เกี่ยวกับการหาช่างไม่ต้องใส่`;
}
const MARK=/\[\[\s*(?:ค้นหา|search)\s*:\s*([^\]\n]{1,60})\]\]/i;
const strip=t=>String(t||"").replace(new RegExp(MARK.source,"gi"),"").replace(/\[\[[^\]\n]{0,70}$/,"").replace(/\n{3,}/g,"\n\n").trim();
function takeMarker(m){if(!m||!m.text)return null;const x=MARK.exec(m.text);m.text=strip(m.text);return x?x[1].trim():null}
const ref=r=>({q:r.q,cats:r.cats,total:r.total});

/* ── การ์ดใต้คำตอบ ── */
function chipHTML(s){
  if(!s)return "";
  const n=s.total||0;
  return `<button type="button" class="svc-chip" data-svq="${esc(s.q)}" data-svc="${esc((s.cats||[]).join(","))}">
    <span class="svc-ci"><i class="ti ti-search"></i></span>
    <span class="svc-ct"><b>${T("ค้นหา","Search")}: ${esc(s.q)}</b><small>${n?T(`${n} ผลลัพธ์ · ดู`,`${n} results · View`):T("ยังไม่มีร้านที่ตรง · ดูร้านทั้งหมด","No exact match · Browse all")}</small></span>
    <i class="ti ti-chevron-right svc-cg"></i></button>`;
}

/* ── แผงผลลัพธ์ ── */
const wide=()=>matchMedia("(min-width:900px)").matches;
const tgt=()=>wide()?' target="_blank" rel="noopener"':"";
const stars=t=>t&&t.reviewCount?`<i class="ti ti-star-filled"></i><b>${Number(t.rating).toFixed(1)}</b><small>(${t.reviewCount})</small>`:`<small>${T("ร้านใหม่","New")}</small>`;
const initial=s=>esc((String(s||"C").trim().replace(/^(อู่|ร้าน|ช่าง)\s*/,"")[0]||"C").toUpperCase());
const dist=d=>d==null?"":` · ${d<1?Math.round(d*1000)+" ม.":d.toFixed(1)+" กม."}`;
function gigCard(x){
  const g=x.g,t=g.tech||{},ph=(g.photos||[])[0];
  return `<a class="svc" href="/?gig=${encodeURIComponent(g.id)}"${tgt()}>
    <span class="svc-h"><span class="svc-av"${t.avatar?` style="background-image:url('${img(t.avatar)}')"`:""}>${t.avatar?"":initial(t.shop||t.name)}</span><b>${esc(t.shop||t.name||"")}</b>${t.verified?'<i class="ti ti-rosette-discount-check-filled svc-ok"></i>':""}</span>
    <span class="svc-v"${ph?` style="background-image:url('${img(ph)}')"`:""}>${ph?"":`<img src="img/cat/${esc(x.c)}.webp" alt="" onerror="this.remove()">`}</span>
    <span class="svc-f"><b class="svc-t">${esc(g.title)}</b>
      <span class="svc-r">${stars(t)}${t.mobile?`<em>${T("ไปถึงที่","On-site")}</em>`:""}${esc(dist(x.d))}</span>
      <span class="svc-p"><small>${T("เริ่มต้น","From")}</small>฿${money(g.price)}</span></span></a>`;
}
function shopCard(x){
  const t=x.t,cv=t.cover||(t.photos||[])[0];
  return `<a class="svc" href="/?shop=${encodeURIComponent(t.id)}"${tgt()}>
    <span class="svc-h"><span class="svc-av"${t.avatar?` style="background-image:url('${img(t.avatar)}')"`:""}>${t.avatar?"":initial(t.shop||t.name)}</span><b>${esc(t.shop||t.name||"")}</b>${t.verified?'<i class="ti ti-rosette-discount-check-filled svc-ok"></i>':""}</span>
    <span class="svc-v"${cv?` style="background-image:url('${img(cv)}')"`:""}>${cv?"":`<img src="img/cat/${esc(((t.cats||[])[0])||"other")}.webp" alt="" onerror="this.remove()">`}</span>
    <span class="svc-f"><b class="svc-t">${esc(t.area||T("ร้านช่าง","Mechanic shop"))}</b>
      <span class="svc-r">${stars(t)}${t.mobile?`<em>${T("ไปถึงที่","On-site")}</em>`:""}${esc(dist(x.d))}</span>
      <span class="svc-p">${t.from?`<small>${T("เริ่มต้น","From")}</small>฿${money(t.from)}`:`<small>${T("ดูหน้าร้าน","View shop")}</small>`}</span></span></a>`;
}
function head(id,label,n){
  return `<div class="svp-gh"><span class="svp-gi">${id&&id!=="other"?`<img src="img/cat/${esc(id)}.webp" alt="" onerror="this.remove()">`:""}</span><b>${esc(label)}</b><small>${n} ${T("ผลลัพธ์","results")}</small></div>`;
}
function bodyHTML(r){
  if(!r.total)return `<div class="svp-empty"><img src="img/cat/${esc(r.cats[0]||"other")}.webp" alt="" onerror="this.remove()">
    <b>${T("ยังไม่มีร้านใน Cendon ที่ตรงกับคำค้นนี้","No shops on Cendon match this yet")}</b>
    <p>${T("ลองส่งงานให้ช่างใกล้ ๆ เสนอราคา หรือดูร้านทั้งหมดในหน้าแรก","Ask nearby mechanics for quotes, or browse every shop on the home page")}</p>
    <a class="svp-btn" href="/">${T("ดูร้านช่างทั้งหมด","Browse all shops")}</a></div>`;
  const L=n=>(CAT[n]?(EN()?CAT[n].en:CAT[n].th):(EN()?OTHER.en:OTHER.th));
  return r.groups.map(gr=>`<section class="svp-g">${head(gr.cat,L(gr.cat),gr.items.length)}<div class="svp-grid">${gr.items.map(gigCard).join("")}</div></section>`).join("")
    +(r.shops.length?`<section class="svp-g"><div class="svp-gh"><span class="svp-gi"><i class="ti ti-building-store"></i></span><b>${T("ร้านช่างที่เกี่ยวข้อง","Related shops")}</b><small>${r.shops.length} ${T("ร้าน","shops")}</small></div><div class="svp-grid">${r.shops.map(shopCard).join("")}</div></section>`:"");
}
let pane=null,last=null,pushed=false;
function mount(){
  if(pane)return pane;
  pane=document.createElement("aside");pane.className="svp";pane.setAttribute("role","dialog");pane.setAttribute("aria-label",T("ผลค้นหาช่าง","Mechanic search results"));
  pane.innerHTML=`<header class="svp-hd"><button type="button" class="svp-back" aria-label="${T("ปิด","Close")}"><i class="ti ti-chevron-left"></i></button>
      <span class="svp-si"><i class="ti ti-search"></i></span><b class="svp-q"></b>
      <button type="button" class="svp-x" aria-label="${T("ปิด","Close")}"><i class="ti ti-x"></i></button></header>
    <div class="svp-sc"><p class="svp-n"></p><div class="svp-b"></div></div>`;
  document.body.appendChild(pane);
  pane.querySelector(".svp-x").onclick=close;pane.querySelector(".svp-back").onclick=close;
  addEventListener("keydown",e=>{if(e.key==="Escape"&&isOpen())close()});
  addEventListener("popstate",()=>{if(pushed){pushed=false;close(true)}});
  return pane;
}
const isOpen=()=>!!(pane&&pane.classList.contains("on"));
function paint(r){
  const p=mount();last=r;
  p.querySelector(".svp-q").textContent=r.q;
  p.querySelector(".svp-n").textContent=r.total?T(`${r.total} ผลลัพธ์`,`${r.total} results`):"";
  p.querySelector(".svp-b").innerHTML=bodyHTML(r);
  p.querySelector(".svp-sc").scrollTop=0;
}
function show(){
  const p=mount();p.classList.add("on");document.body.classList.add("svp-on");
  /* มือถือ: ปุ่มย้อนกลับของเครื่องปิดแผง ไม่ใช่ออกจากหน้าแชต */
  if(!wide()&&!pushed){try{history.pushState({svp:1},"");pushed=true}catch(e){}}
}
async function open(r,o){
  o=o||{};
  if(o.auto&&!wide())return;          /* มือถือไม่เด้งเอง ให้ผู้ใช้อ่านคำตอบก่อน แล้วค่อยกดการ์ด */
  paint(r);show();
}
async function openRef(s){
  const p=mount();p.querySelector(".svp-q").textContent=s.q;p.querySelector(".svp-n").textContent="";
  p.querySelector(".svp-b").innerHTML='<div class="svp-load"><span></span><span></span><span></span></div>';show();
  try{paint(await find(s.q,{cats:s.cats,label:s.q}))}catch(e){p.querySelector(".svp-b").innerHTML=`<div class="svp-empty"><b>${T("โหลดผลค้นหาไม่ได้","Couldn't load results")}</b><p>${T("ลองใหม่อีกครั้ง","Please try again")}</p></div>`}
}
function close(fromPop){
  if(!pane)return;pane.classList.remove("on");document.body.classList.remove("svp-on");
  if(pushed&&fromPop!==true){pushed=false;try{history.back()}catch(e){}}
}
document.addEventListener("click",e=>{
  const c=e.target.closest&&e.target.closest(".svc-chip");if(!c)return;
  e.preventDefault();
  const s={q:c.dataset.svq,cats:(c.dataset.svc||"").split(",").filter(Boolean)};
  if(isOpen()&&last&&last.q===s.q&&wide()){close();return}
  openRef(s);
});

/* ── หน้าตา (โทนเดียวกับการ์ดบริการหน้าแรก · ส้ม Cendon แค่จุดเล็ก ๆ) ── */
const css=document.createElement("style");css.id="svc-css";
css.textContent=`
.svc-chip{display:flex;align-items:center;gap:12px;width:min(100%,360px);margin:12px 0 2px;padding:11px 14px;border-radius:14px;border:1px solid var(--line,rgba(0,0,0,.12));background:var(--surface,#fff);color:var(--ink,#1c1a17);font:inherit;text-align:left;cursor:pointer;transition:border-color .2s,transform .2s}
.svc-chip:hover{border-color:#E8590C}.svc-chip:active{transform:scale(.98)}
.svc-ci{width:34px;height:34px;flex:none;display:grid;place-items:center;border-radius:10px;background:color-mix(in srgb,#E8590C 12%,transparent);color:#E8590C;font-size:17px}
.svc-ct{display:flex;flex-direction:column;min-width:0;flex:1}.svc-ct b{font-size:14px;font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.svc-ct small{font-size:12px;color:var(--muted,#6c665a);margin-top:2px}.svc-cg{color:var(--muted,#6c665a);font-size:16px}
.svp{position:fixed;z-index:2147482500;display:flex;flex-direction:column;background:var(--surface,#fff);color:var(--ink,#1c1a17);opacity:0;pointer-events:none;transition:opacity .25s,transform .35s cubic-bezier(.32,.72,0,1)}
.svp.on{opacity:1;pointer-events:auto;transform:none}
.svp-hd{display:flex;align-items:center;gap:12px;padding:14px 16px;border-bottom:1px solid var(--line,rgba(0,0,0,.1));flex:none}
.svp-si{width:36px;height:36px;flex:none;display:grid;place-items:center;border-radius:10px;background:color-mix(in srgb,#E8590C 12%,transparent);color:#E8590C;font-size:18px}
.svp-q{flex:1;min-width:0;font-size:17px;font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.svp-x,.svp-back{width:36px;height:36px;flex:none;border:0;border-radius:10px;background:none;color:var(--muted,#6c665a);font-size:20px;cursor:pointer;display:grid;place-items:center}
.svp-x:hover,.svp-back:hover{background:color-mix(in srgb,var(--ink,#000) 6%,transparent);color:var(--ink,#1c1a17)}
.svp-back{display:none}
.svp-sc{flex:1;overflow-y:auto;overscroll-behavior:contain;padding:14px 18px 28px}
.svp-n{margin:0 0 14px;font-size:13px;color:var(--muted,#6c665a)}
.svp-g+.svp-g{margin-top:22px}
.svp-gh{display:flex;align-items:center;gap:8px;margin-bottom:10px}.svp-gh b{font-size:15px;font-weight:600}.svp-gh small{font-size:12px;color:var(--muted,#6c665a)}
.svp-gi{width:28px;height:28px;display:grid;place-items:center;flex:none;color:var(--muted,#6c665a);font-size:18px}.svp-gi img{width:30px;height:30px;object-fit:contain}
.svp-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(190px,1fr));gap:12px}
.svc{display:flex;flex-direction:column;min-width:0;border-radius:14px;overflow:hidden;border:1px solid var(--line,rgba(0,0,0,.1));background:var(--surface,#fff);color:inherit;text-decoration:none;transition:border-color .2s,transform .25s cubic-bezier(.32,.72,0,1),box-shadow .25s}
.svc:hover{border-color:color-mix(in srgb,#E8590C 55%,transparent);transform:translateY(-2px);box-shadow:0 10px 24px -14px rgba(0,0,0,.25)}
.svc-h{display:flex;align-items:center;gap:8px;padding:9px 10px;min-width:0}.svc-h b{font-size:12.5px;font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.svc-ok{color:#E8590C;font-size:14px;flex:none}
.svc-av{width:24px;height:24px;flex:none;border-radius:50%;background:color-mix(in srgb,var(--ink,#000) 8%,transparent) center/cover;display:grid;place-items:center;font-size:11px;font-weight:700;color:var(--muted,#6c665a)}
.svc-v{aspect-ratio:16/9;background:color-mix(in srgb,var(--ink,#000) 4%,transparent) center/cover;display:grid;place-items:center}.svc-v img{width:46%;height:76%;object-fit:contain;opacity:.9}
.svc-f{display:flex;flex-direction:column;gap:5px;padding:10px 11px 11px;flex:1}
.svc-t{font-size:13.5px;font-weight:600;line-height:1.35;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;min-height:2.7em}
.svc-r{display:flex;align-items:center;gap:4px;font-size:12px;color:var(--muted,#6c665a);flex-wrap:wrap}.svc-r .ti{color:#f5a524;font-size:13px}.svc-r b{color:var(--ink,#1c1a17);font-weight:600}
.svc-r em{font-style:normal;font-size:11px;padding:1px 6px;border-radius:6px;border:1px solid var(--line,rgba(0,0,0,.12));margin-left:2px}
.svc-p{margin-top:auto;text-align:right;font-size:15px;font-weight:700}.svc-p small{display:block;font-size:10.5px;font-weight:400;color:var(--muted,#6c665a)}
.svp-empty{text-align:center;padding:40px 12px;color:var(--muted,#6c665a)}.svp-empty img{width:88px;height:88px;object-fit:contain;display:block;margin:0 auto 10px}
.svp-empty b{display:block;color:var(--ink,#1c1a17);font-size:15px;margin-bottom:6px}.svp-empty p{margin:0 0 16px;font-size:13px}
.svp-btn{display:inline-flex;height:40px;align-items:center;padding:0 18px;border-radius:999px;background:#E8590C;color:#fff;text-decoration:none;font-weight:600;font-size:14px}
.svp-load{display:flex;gap:6px;justify-content:center;padding:40px 0}.svp-load span{width:8px;height:8px;border-radius:50%;background:var(--muted,#999);animation:svpDot 1s infinite}
.svp-load span:nth-child(2){animation-delay:.15s}.svp-load span:nth-child(3){animation-delay:.3s}
@keyframes svpDot{0%,100%{opacity:.25}50%{opacity:1}}
body.svp-on #cxa-fab{display:none!important}
/* คอมกลาง (900–1199): แผงลอยทับด้านขวา · จอใหญ่ (1200+): แชตหดไปฝั่งซ้าย เหลืออย่างน้อย ~460px แบบ Fastwork */
@media(min-width:900px){
  .svp{top:12px;right:12px;bottom:12px;width:min(560px,calc(100vw - 24px));border-radius:18px;border:1px solid var(--line,rgba(0,0,0,.1));box-shadow:0 24px 60px -24px rgba(0,0,0,.35);transform:translateX(24px)}
}
@media(min-width:1200px){
  .svp{width:clamp(480px,calc(100vw - 760px),1040px)}
  body.svp-on .colwrap{margin-right:calc(clamp(480px,calc(100vw - 760px),1040px) + 24px);transition:margin-right .35s cubic-bezier(.32,.72,0,1)}
}
@media(max-width:899px){
  .svp{inset:0;padding-top:env(safe-area-inset-top);transform:translateY(16px)}
  .svp-back{display:grid}.svp-x{display:none}
  .svp-sc{padding:12px 12px calc(24px + env(safe-area-inset-bottom))}
  .svp-grid{grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}
  .svc-h{padding:8px}.svc-f{padding:8px 9px 10px}.svc-t{font-size:13px}.svc-p{font-size:14px}
}
@media(prefers-reduced-motion:reduce){.svp,.svc{transition:none}}
`;
document.head.appendChild(css);

window.CendonSearch={detect,wants,find,context,rule,strip,takeMarker,ref,chipHTML,open,openRef,close,isOpen};
})();
