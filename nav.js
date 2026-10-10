/* ══════════════════════════════════════════════════════════════════
   nav.js — ที่อยู่หน้าเว็บแบบลึก (แบบ YouTube) + ปุ่มย้อนกลับทีละขั้น

   ทุกอย่างที่เปิดซ้อนขึ้นมา (หน้าร้านช่าง แท็บ ฟอร์ม ป๊อปอัป รายละเอียดรถ ข่าว) คือหนึ่ง "ชั้น"
   แต่ละชั้นมีที่อยู่ของตัวเอง เช่น /tech/<id>/reviews และเป็นหนึ่งรายการในประวัติของเบราว์เซอร์
     · กดย้อน (ปุ่มมือถือ/เบราว์เซอร์)  = ปิดชั้นบนสุดชั้นเดียว ของข้างใต้ยังอยู่ครบ
     · กดไปข้างหน้า                 = เปิดชั้นที่เพิ่งปิดกลับมา
     · รีเฟรช / แชร์ลิงก์ / เปิดจาก LINE = เปิดไล่ทีละชั้นจนถึงที่อยู่นั้น แล้วกดย้อนได้ทีละขั้นเหมือนเดินเข้ามาเอง

   แต่ละหน้าลงทะเบียนเส้นทางของตัวเอง (Nav.route) แล้วเรียก Nav.start เมื่อข้อมูลพร้อม
   โค้ดที่เปิดอะไรขึ้นมาเรียก Nav.push · ปิดเองด้วยปุ่ม × เรียก Nav.back หรือ Nav.drop
   ══════════════════════════════════════════════════════════════════ */
(function(){
"use strict";
if(window.Nav)return;
const H=history,LOC=location;

/* ที่อยู่แบบสะอาด: ตัด .html · /index · / ท้ายสุด */
function clean(p){
  p=String(p||"/").replace(/\.html$/,"").replace(/\/index$/,"/");
  if(p.length>1)p=p.replace(/\/+$/,"");
  return p||"/";
}
const here=()=>clean(LOC.pathname)+LOC.search;
const pathOf=u=>{const i=u.indexOf("?");return i<0?u:u.slice(0,i)};
const join=(a,b)=>(a==="/"?"":a)+"/"+b;

let base="/",root="/";                 // หน้าหลักของไฟล์นี้ · ที่อยู่ตอนไม่มีชั้นไหนเปิด
const routes=[];                       // เส้นทางที่หน้านี้รู้จัก
const stack=[];                        // ชั้นที่เปิดอยู่ ล่างสุด → บนสุด
const gone=new Map();                  // ชั้นที่เพิ่งปิดด้วยปุ่มย้อน (เปิดกลับตอนกดไปข้างหน้า)
const queue=[];                        // งานที่ต้องรอให้การย้อนประวัติเสร็จก่อน
let started=false,closing=0,expect=0,waitPop=0,waitT=0,seq=0,busy=Promise.resolve();
const newKey=()=>Date.now().toString(36)+"."+(++seq).toString(36);
const top=()=>stack[stack.length-1]||null;
const tick=()=>new Promise(r=>setTimeout(r,0));

/* ── ประวัติของเบราว์เซอร์ ──
   ถอยประวัติ (history.go) ทำงานแบบไม่ทันที ถ้าเปิดชั้นใหม่ระหว่างรอ ต้องต่อคิวไว้ก่อน
   ไม่งั้นรายการใหม่ไปแทรกผิดตำแหน่ง แล้วปุ่มย้อนพาไปที่แปลก ๆ */
function write(l){
  if(waitPop){queue.push(()=>write(l));return}
  try{H.pushState({nav:1,k:l.k},"",l.url);l.w=true}catch(e){}
}
function stamp(){
  const t=top();
  try{H.replaceState({nav:1,k:t?t.k:"root"},"",t?t.url:root)}catch(e){}
}
function travel(n){
  if(n<=0)return;
  if(waitPop){queue.push(()=>travel(n));return}
  waitPop++;clearTimeout(waitT);
  /* เผื่อเบราว์เซอร์ไม่ยิง popstate กลับมา (เช่น ไม่มีประวัติให้ถอย) จะได้ไม่ค้างคิวตลอดไป */
  waitT=setTimeout(()=>{if(waitPop){waitPop=0;flush()}},800);
  try{H.go(-n)}catch(e){waitPop=0;flush()}
}
function flush(){while(queue.length&&!waitPop)queue.shift()()}

/* ── ชั้น ── */
function abs(u){
  u=String(u||"");
  if(/^https?:/i.test(u)){try{const x=new URL(u);u=x.pathname+x.search}catch(e){}}
  if(u[0]!=="/")u=join(base,u);
  const i=u.indexOf("?");
  return i<0?clean(u):clean(u.slice(0,i))+u.slice(i);
}
/* o: {url (เต็ม) หรือ slug (ต่อท้ายชั้นที่อยู่ใต้), close(), reopen(), tag}
   ไม่มีทั้ง url และ slug = ชั้นที่ใช้ที่อยู่เดิม (ยังกดย้อนทีละขั้นได้) */
function push(o){
  if(closing)return null;
  /* ป๊อปอัปที่เพิ่งปิดในจังหวะเดียวกัน (เช่น กดรายการในแผ่นประวัติ → แผ่นปิด + เปิดแชต)
     ต้องถอยประวัติของแผ่นนั้นก่อน แล้วค่อยเพิ่มขั้นใหม่ — ไม่งั้นขั้นใหม่ไปซ้อนบนแผ่นที่ปิดไปแล้ว */
  if(mo){const r=mo.takeRecords();if(r.length)handle(r)}
  o=o||{};
  const p=top(),below=p?p.url:root;
  const url=o.url?abs(o.url):o.slug?pathOf(below).replace(/\/$/,"")+"/"+o.slug:below;
  const l={k:newKey(),url,close:o.close||null,reopen:o.reopen||null,tag:o.tag||"",w:false};
  stack.push(l);
  /* ชั้นที่เปิดตามที่อยู่ (รีเฟรช / ลิงก์ / กดไปข้างหน้า) ไม่ต้องเพิ่มประวัติ — มีอยู่แล้ว */
  if(expect){expect=0;return l}
  write(l);
  return l;
}
/* ปิดชั้นที่อยู่เหนือตำแหน่ง i (เรียกฟังก์ชันปิดของแต่ละชั้นจากบนลงล่าง) */
function closeAbove(i,run){
  closing++;
  try{
    while(stack.length>i+1){
      const l=stack.pop(),p=top();
      gone.set(l.k,{pk:p?p.k:"root",reopen:l.reopen,url:l.url,tag:l.tag});
      if(gone.size>60)gone.delete(gone.keys().next().value);
      if(run!==false&&l.close)try{l.close(l)}catch(e){console.error(e)}
    }
  }finally{closing--}
}
/* ผู้ใช้กดปิดในหน้าจอ (ปุ่ม × ปุ่มย้อนในหน้า): ปิดชั้นนี้และทุกชั้นที่อยู่เหนือมัน แล้วถอยประวัติเท่ากัน */
function back(l,run){
  if(typeof l==="number")l=stack[stack.length-l];
  l=l||top();const i=stack.indexOf(l);if(i<0)return false;
  const n=stack.slice(i).filter(x=>x.w).length;
  /* ชั้นที่ยังรอเขียนลงประวัติ (อยู่ในคิว) ไม่ต้องถอย แค่ไม่ต้องเขียน */
  closeAbove(i-1,run);
  travel(n);
  return true;
}
/* หน้าจอปิดไปเองแล้ว (เช่น ป๊อปอัปปิดตัวเองหลังบันทึก) — แค่ตามประวัติให้ตรง ไม่เรียกฟังก์ชันปิดซ้ำ */
const drop=l=>back(l,false);

/* ── เส้นทาง ──
   path: ส่วนของที่อยู่ต่อจากหน้าหลัก เช่น "tech/:id" (":" = ค่าอะไรก็ได้)
   parent: ชื่อเส้นทางที่ต้องเปิดอยู่ข้างใต้ (ไม่ใส่ = อยู่ชั้นแรกของหน้า)
   test(p): เช็กค่าเพิ่ม · open(p, query, step): เปิดหน้าจอ แล้วโค้ดของหน้าเรียก Nav.push เอง */
function route(r){
  r.segs=String(r.path).split("/").filter(Boolean);
  r.name=r.name||r.path;
  r.parents=r.parent==null?[null]:[].concat(r.parent);
  routes.push(r);
}
function chain(url){
  url=abs(url);const p=pathOf(url),q=url.slice(p.length);
  if(p!==base&&!p.startsWith(base==="/"?"/":base+"/"))return [];
  const segs=(base==="/"?p:p.slice(base.length)).split("/").filter(Boolean).map(s=>{try{return decodeURIComponent(s)}catch(e){return s}});
  const out=[];let i=0,prev=null,at=base;
  while(i<segs.length){
    let hit=null;
    for(const r of routes){
      if(!r.parents.includes(prev)||i+r.segs.length>segs.length)continue;
      const ps={};let ok=true;
      r.segs.forEach((s,j)=>{const v=segs[i+j];if(s[0]===":")ps[s.slice(1)]=v;else if(s!==v)ok=false});
      if(ok&&r.test&&!r.test(ps))ok=false;
      if(ok){hit={r,ps};break}
    }
    if(!hit)break;
    for(const s of segs.slice(i,i+hit.r.segs.length))at=join(at,encodeURIComponent(s));
    i+=hit.r.segs.length;prev=hit.r.name;
    out.push({url:at,r:hit.r,p:hit.ps});
  }
  /* ?query เป็นของชั้นสุดท้าย (เช่น /search?q=แอร์ไม่เย็น) */
  if(out.length&&q)out[out.length-1].url+=q;
  return out;
}
const sameUrl=(a,b)=>a===b;

/* เปิดตามที่อยู่: ชั้นที่ตรงกันอยู่แล้วเก็บไว้ ที่เกินปิด ที่ขาดเปิดเพิ่มทีละชั้น */
async function apply(url,k){
  const steps=chain(url),q=new URLSearchParams(url.split("?")[1]||""),opened=[];
  let n=0;while(n<stack.length&&n<steps.length&&sameUrl(stack[n].url,steps[n].url))n++;
  closeAbove(n-1);
  for(let j=n;j<steps.length;j++){
    const s=steps[j],before=stack.length;
    expect=1;
    try{await s.r.open(s.p,q,s)}catch(e){console.error(e)}
    await tick();expect=0;
    if(stack.length<=before)break;            // เปิดไม่ได้ (เช่น ไม่มีร้านนี้แล้ว) — หยุดแค่ชั้นที่เปิดได้
    const t=top();t.url=s.url;t.w=true;opened.push(t);
  }
  const t=top();if(t&&k)t.k=k;
  /* เปิดได้ไม่ครบตามที่อยู่ — แก้ที่อยู่ให้ตรงกับที่เห็นจริง */
  if((t?t.url:root)!==here())stamp();
  return opened;
}
const serial=fn=>(busy=busy.then(fn,fn));

addEventListener("popstate",e=>{
  if(!started)return;
  const own=waitPop>0;if(own){waitPop--;if(!waitPop)clearTimeout(waitT)}
  const st=e.state||{},k=st.k||null;
  serial(async()=>{
    if(own){
      /* ถอยเองหลังปิดชั้น — ปกติหน้าจอตรงกับประวัติอยู่แล้ว */
      const wr=stack.filter(l=>l.w),t=wr[wr.length-1];
      if((t?t.k:"root")===k||(!t&&clean(LOC.pathname)===pathOf(root))){flush();return}
    }
    if(k==="root"){closeAbove(-1);flush();return}
    const i=k?stack.findIndex(l=>l.k===k):-2;
    if(i>=0){closeAbove(i);flush();return}
    /* กดไปข้างหน้า: ชั้นที่เพิ่งปิดจากตรงนี้ — เปิดซ้อนกลับขึ้นไป (ของข้างใต้ยังอยู่) */
    const g=k&&gone.get(k),t=top();
    if(g&&g.pk===(t?t.k:"root")){
      if(g.reopen){
        const before=stack.length;expect=1;
        try{await g.reopen()}catch(err){console.error(err)}
        await tick();expect=0;
        if(stack.length>before){const l=top();l.k=k;l.url=g.url;l.w=true;l.reopen=l.reopen||g.reopen;gone.delete(k);flush();return}
      }else if(await onTop(here(),k)){gone.delete(k);flush();return}
    }
    await apply(here(),k);
    flush();
  });
});

/* ── เริ่มหน้า ──
   o.base: หน้าหลักของไฟล์ ("/" "/garage" …) · o.legacy(url): แปลงลิงก์รูปแบบเก่า (?shop= ?a=) เป็นที่อยู่ใหม่ */
async function start(o){
  o=o||{};
  if(started)return;
  base=clean(o.base||"/");
  let u=here();
  if(o.legacy){try{const x=o.legacy(new URL(LOC.href));if(x)u=abs(x)}catch(e){}}
  root=pathOf(u)===base?u:base;
  const st=H.state&&H.state.nav?H.state:null;
  await serial(async()=>{
    const opened=pathOf(u)!==base&&!stack.length?await apply(u,st&&st.k):[];
    if(st||!opened.length)stamp();
    else{
      /* ลิงก์ลึกที่เปิดตรง ๆ: สร้างประวัติให้ทีละชั้น กดย้อนแล้วถอยทีละขั้นเหมือนเดินเข้ามาเอง */
      try{H.replaceState({nav:1,k:"root"},"",root)}catch(e){}
      opened.forEach(l=>{try{H.pushState({nav:1,k:l.k},"",l.url)}catch(e){}});
    }
    started=true;
  });
  flush();
  scan();
}

/* เปิดตามลิงก์ในหน้าเดียวกัน (เหมือนคลิกลิงก์ใน YouTube): ชั้นที่ตรงอยู่แล้วเก็บไว้ ที่เหลือเปิดซ้อนขึ้นไป */
/* เปิดตามที่อยู่ซ้อนบนของที่เปิดอยู่ (ไม่ปิดอะไร): ถ้าชั้นบนสุดตรงกับต้นทางของที่อยู่แล้ว เปิดต่อเฉพาะส่วนที่ขาด
   k = กุญแจของรายการประวัติที่มีอยู่แล้ว (กดไปข้างหน้า) — ไม่ต้องเพิ่มประวัติใหม่ */
async function onTop(url,k){
  const steps=chain(url),q=new URLSearchParams(url.split("?")[1]||"");
  let m=Math.min(stack.length,steps.length);
  while(m>0&&!steps.slice(0,m).every((s,j)=>sameUrl(stack[stack.length-m+j].url,s.url)))m--;
  let opened=0;
  for(let j=m;j<steps.length;j++){
    const s=steps[j],before=stack.length;
    if(k)expect=1;
    try{await s.r.open(s.p,q,s)}catch(e){console.error(e)}
    await tick();expect=0;
    if(stack.length<=before)break;
    opened++;if(k){const t=top();t.url=s.url;t.w=true}
  }
  if(k&&opened)top().k=k;
  return opened;
}
/* เปิดตามลิงก์ในหน้าเดียวกัน (เหมือนคลิกลิงก์ใน YouTube) — ซ้อนขึ้นไป กดย้อนกลับมาที่เดิม */
function go(url){
  url=abs(url);
  if(!owns(url)){LOC.assign(url);return}
  if(pathOf(url)===base&&!stack.length)return;
  if(pathOf(url)===base)return home();
  return serial(()=>onTop(url));
}
/* กลับหน้าหลักของไฟล์ (ปิดทุกชั้น) — เช่น กดแท็บหน้าเดิมซ้ำ */
function home(){if(stack.length)back(stack[0]);}

/* ที่อยู่นี้เป็นของไฟล์นี้ไหม (ถ้าใช่ เปิดในหน้าเดิมได้ไม่ต้องโหลดใหม่) */
function owns(url){
  const p=pathOf(abs(url));
  if(p===base)return true;
  if(base!=="/")return p.startsWith(base+"/");
  return chain(p).length>0;
}

/* ── ป๊อปอัปของหน้าเก่า: เฝ้าดู class ของกล่อง แล้วเพิ่ม/ถอยประวัติให้เอง ──
   w: {sel, cls ("show"/"on"), url(el) หรือ slug(el), close(el), reopen(el)} */
const watchers=[];let mo=null;
function handle(list){
  const done=new Set();
  for(const m of list){
    const el=m.target;if(done.has(el)||!el.matches)continue;done.add(el);
    for(const x of watchers)if(el.matches(x.sel))seen(el,x);
  }
}
function seen(el,x){
  const on=el.classList.contains(x.cls),l=stack.find(s=>s.el===el);
  if(on&&!l&&!closing){
    if(x.when&&!x.when(el))return;
    const n=push({url:x.url&&x.url(el),slug:x.slug&&x.slug(el),tag:x.tag,
      close:()=>x.close(el),reopen:x.reopen?()=>x.reopen(el):null});
    if(n)n.el=el;
  }else if(!on&&l)drop(l);
}
/* ป๊อปอัปที่เปิดไปก่อนตัวเฝ้าพร้อม (เช่น /garage?add=1 เปิดหน้าต่างเพิ่มรถทันทีตอนโหลด) */
function scan(){for(const x of watchers)document.querySelectorAll(x.sel).forEach(el=>{if(el.classList.contains(x.cls))seen(el,x)})}
function watch(w){
  watchers.push(w);
  if(started)document.querySelectorAll(w.sel).forEach(el=>{if(el.classList.contains(w.cls))seen(el,w)});
  if(mo)return;
  mo=new MutationObserver(handle);
  const go=()=>mo.observe(document.body||document.documentElement,{subtree:true,attributes:true,attributeFilter:["class"]});
  if(document.body)go();else addEventListener("DOMContentLoaded",go);
}

/* คลิกลิงก์ที่เป็นของหน้านี้ → เปิดในหน้าเดิม ไม่ต้องโหลดใหม่ (ปุ่มกลาง/Ctrl เปิดแท็บใหม่ตามปกติ)
   ฟังที่ window = ทำงานหลังตัวจัดการของหน้าเสมอ ถ้าหน้าจัดการลิงก์นั้นเองแล้ว (preventDefault) ก็ไม่ยุ่ง */
addEventListener("click",e=>{
  if(!started||e.defaultPrevented||e.button||e.metaKey||e.ctrlKey||e.shiftKey||e.altKey)return;
  const a=e.target.closest&&e.target.closest("a[href]");
  if(!a||a.hasAttribute("download")||(a.target&&a.target!=="_self")||a.hasAttribute("data-nav-full"))return;
  let u;try{u=new URL(a.href,LOC.href)}catch(x){return}
  if(u.origin!==LOC.origin||u.hash&&clean(u.pathname)===clean(LOC.pathname))return;
  const url=clean(u.pathname)+u.search;
  if(!owns(url)||pathOf(url)===base&&url!==base)return;
  e.preventDefault();go(url);
});

window.Nav={route,start,push,back,drop,go,home,owns,watch,chain,
  replace(url){const t=top();if(!t)return;t.url=abs(url);if(t.w)stamp()},
  top,find:tag=>[...stack].reverse().find(l=>l.tag===tag)||null,
  get stack(){return stack.slice()},get base(){return base},get started(){return started},
  get closing(){return closing>0},get opening(){return expect>0},clean};
})();
