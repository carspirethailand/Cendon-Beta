/* ════════════════════════════════════════════════════════════════════
   Cendon Home — หน้าหลักสองช่วง
     ช่วง 1  วิเคราะห์รถด้วย AI   (#hmAi)   ช่องถาม AI · เครื่องมือเสริม · รถของฉัน
     ช่วง 2  เรียกช่าง            (#hmCall) ค้นหา · ด่วน/ประกาศ/ถึงบ้าน/ขอราคา · หมวด · พาร์ทเนอร์ · บริการจากช่าง

   เป็นแค่การจัดระเบียบ: ของเดิมทุกชิ้น (id เดิม ตัวจัดการเดิม) อยู่ครบ ไฟล์นี้ทำสามอย่างเท่านั้น
     1) แสดงทีละช่วง — ไม่มีตำแหน่งครึ่งทางระหว่างสองช่วง (ซ่อนอีกช่วงทั้งก้อน ไม่ใช่เลื่อนหน้า)
     2) สลับช่วงด้วยก้อนเมฆลอยผ่านจอ ระหว่างนั้นล็อกจอ (กดไม่ได้ เลื่อนไม่ได้)
        ใช้: เลื่อนลง/ปัดขึ้นที่ท้ายช่วง 1 · เลื่อนขึ้น/ดึงลงที่ต้นช่วง 2 · ปุ่ม · จุดข้างจอ · ลูกศรคีย์บอร์ด
     3) เขียนข้อความหัวช่วงตามภาษา

   ลดการเคลื่อนไหว (prefers-reduced-motion) = สลับด้วยการจางสั้น ๆ ไม่มีเมฆ
   ════════════════════════════════════════════════════════════════════ */
(function(W,D){
"use strict";
const $=id=>D.getElementById(id);
const T=(th,en)=>W.spireT?W.spireT(th,en):th;
const root=$("vMenu"),ai=$("hmAi"),call=$("hmCall");
if(!root||!ai||!call)return;
const H=D.documentElement,KEY="cendon_homeStage";
const calm=()=>matchMedia("(prefers-reduced-motion: reduce)").matches;
let stage="ai",busy=false,cool=0,guard=0,lockEl=null,leaving=null;

/* ── ข้อความ ── */
function paint(){
  $("hmAiH").textContent=T("ให้ AI วิเคราะห์รถของคุณ","Let AI check your car");
  $("hmTitle").querySelector(".hm-sub").textContent=T("ถามอาการ ส่งรูป หรืออัดเสียงเครื่อง ให้ AI ช่วยดูก่อน","Describe a symptom, send a photo or record the engine — AI takes a first look");
  const next=$("hmNext"),hint=T("ด่วน ขอราคา หรือค้นช่างใกล้คุณ","Urgent, get quotes or find shops near you");
  next.innerHTML=`<b></b><small></small><i class="ti ti-chevron-down" aria-hidden="true"></i>`;
  next.querySelector("b").textContent=T("เรียกช่าง","Call a mechanic");next.querySelector("small").textContent=hint;
  $("hmCallH").textContent=T("เรียกช่าง","Call a mechanic");
  call.querySelector(".hm-sub").textContent=hint;
  $("hmBack").querySelector("span").textContent=T("กลับไปคุยกับ AI","Back to AI check");
  const q=T("ค้นหาอาการ อู่ หรือบริการ","Search symptoms, shops or services"),s2=$("hs2");
  s2.placeholder=q;s2.setAttribute("aria-label",q);$("hmSearch").querySelector("button").setAttribute("aria-label",q);
  $("hTools").setAttribute("role","group");$("hTools").setAttribute("aria-label",T("ให้ AI ดูก่อน","Let AI look first"));
  const [a,c]=$("hmDots").children;
  a.setAttribute("aria-label",T("วิเคราะห์รถด้วย AI","AI car check"));c.setAttribute("aria-label",T("เรียกช่าง","Call a mechanic"));
  dots();
}
function dots(){[...$("hmDots").children].forEach(b=>b.setAttribute("aria-current",b.dataset.s===stage?"true":"false"))}

/* ── ความสูงช่วง 1 = พื้นที่จอใต้แถบบน (เหลือที่ให้แถบล่างมือถือ) ── */
function fit(){
  if(ai.hidden)return;
  /* ช่วง 1 พอดีจอ: จอ − ส่วนบน − ช่องว่างท้ายหน้า (padding ของ body เผื่อแถบล่างมือถือไว้แล้ว) → หน้าไม่ต้องเลื่อนเลย */
  const top=ai.getBoundingClientRect().top+W.scrollY;let bottom=0;
  for(let e=ai.parentElement;e&&e!==H;e=e.parentElement){const cs=getComputedStyle(e);bottom+=(parseFloat(cs.paddingBottom)||0)+(parseFloat(cs.marginBottom)||0)}
  H.style.setProperty("--hm-h",Math.max(380,Math.floor(innerHeight-top-bottom))+"px");
}

/* ── ล็อกจอระหว่างเปลี่ยนช่วง ──
   แผ่นใสเต็มจอใต้เมฆ: รับการกด/ล้อ/นิ้วแทนหน้าข้างหลัง (เมฆของ cloud-swap.js ไม่รับการกดเอง) */
function lock(on){
  if(!on){if(lockEl)lockEl.remove();lockEl=null;return}
  if(lockEl)return;
  lockEl=D.createElement("div");lockEl.className="hm-lock";lockEl.setAttribute("aria-hidden","true");
  for(const ev of ["wheel","touchmove"])lockEl.addEventListener(ev,e=>{if(e.cancelable)e.preventDefault()},{passive:false});
  D.body.appendChild(lockEl);
}

/* ── เลื่อนเข้า-ออกให้สมูท ──
   ช่วงเก่าลอยขึ้น/ลงจางหายขณะหมอกฟุ้ง · ช่วงใหม่ไล่เลื่อนเข้าทีละชิ้น (stagger) ขณะหมอกจาง — เฉพาะ opacity/transform */
const EASE_OUT="cubic-bezier(.22,1,.36,1)",EASE_IN="cubic-bezier(.5,0,.9,.5)";
const shown=el=>[...el.children].filter(c=>!c.hidden&&getComputedStyle(c).display!=="none");
function leave(el,dir){
  if(calm()||!el.animate)return;
  try{leaving=el.animate([{opacity:1,transform:"translate3d(0,0,0)"},{opacity:0,transform:`translate3d(0,${-dir*34}px,0)`}],{duration:520,easing:EASE_IN,fill:"forwards"})}catch(e){leaving=null}
}
function enter(el,dir){
  if(calm()||!el.animate)return;
  shown(el).forEach((c,i)=>{try{c.animate([{opacity:0,transform:`translate3d(0,${dir*46}px,0)`},{opacity:1,transform:"translate3d(0,0,0)"}],{duration:780,delay:70+Math.min(i,7)*70,easing:EASE_OUT,fill:"backwards"})}catch(e){}});
}

/* ── สลับช่วง ── */
const typing=t=>!!(t&&t.closest&&t.closest("input,textarea,select,[contenteditable='true']"));
/* ไม่สลับเมื่อมีอย่างอื่นทับหน้าอยู่: แผ่นล่าง เมนู + สายโทร หรือไม่ได้อยู่หน้าแรก */
function blocked(){
  return root.hidden||D.body.style.overflow==="hidden"||H.classList.contains("cv-calling")||!!D.querySelector(".bs.on,.cx-menu.on,.cx-scrim.on");
}
function swap(to){
  stage=to;ai.hidden=to!=="ai";call.hidden=to!=="call";root.dataset.stage=to;
  W.scrollTo(0,0);edgeAt=performance.now();dots();fit();
  try{sessionStorage.setItem(KEY,to)}catch(e){}
  /* แถวหมวด/ท้องฟ้า AI วัดขนาดตอนมองเห็น — ให้คำนวณใหม่หลังโผล่ */
  W.dispatchEvent(new Event("resize"));
  const h=$(to==="ai"?"hmAiH":"hmCallH");try{h.focus({preventScroll:true})}catch(e){}
  $("hmLive").textContent=h.textContent;
}
async function go(to){
  if(busy||to===stage||blocked())return false;
  busy=true;const dir=to==="call"?1:-1,from=stage,cloud=W.CendonCloud,next=to==="ai"?ai:call;
  lock(true);
  /* กันค้าง: ไม่ว่าอะไรผิดพลาด จอต้องปลดล็อกและอยู่ช่วงที่ถูกต้องเสมอ */
  guard=setTimeout(()=>{if(stage!==to)swap(to);finish()},4800);
  let fin=false;
  const finish=()=>{if(fin)return;fin=true;clearTimeout(guard);if(leaving){leaving.cancel();leaving=null}lock(false);busy=false;cool=performance.now()+450};
  try{
    const apply=()=>{swap(to);if(leaving){leaving.cancel();leaving=null}enter(next,dir)};
    if(cloud&&!cloud.busy()&&D.body.animate){
      /* เมฆชุดเดียวกับตอนเปลี่ยนธีม/ภาษาในหน้าตั้งค่า (cloud-swap.js): หมอกบังเต็มจอแล้วค่อยสลับ */
      leave(from==="ai"?ai:call,dir);
      cloud.run({kind:"stage",dir,from,to},apply,finish);
    }else{apply();finish()}
  }catch(e){if(stage!==to)swap(to);finish()}
  return true;
}

/* ── ท่าทาง: ทำงานเฉพาะที่ขอบหน้า (ท้ายช่วง 1 / ต้นช่วง 2) และต้องเริ่มท่าที่ขอบนั้นจริง ──
   ล้อเมาส์: นับต่อเนื่องกัน inertia ของแทร็กแพด · นิ้ว: ปัดแนวตั้งเด่นชัดเท่านั้น (แนวนอนเป็นของแถวหมวด/ช่องค้นหา) */
const atTop=()=>W.scrollY<=2,atBottom=()=>W.scrollY+innerHeight>=H.scrollHeight-12;
const edge=()=>stage==="ai"?atBottom():atTop();
const want=dy=>stage==="ai"?dy>0:dy<0;
/* เพิ่งเลื่อนมาถึงขอบ = ยังไม่นับเป็นการ "ดันต่อ" — ต้องค้างที่ขอบอีกครู่ (กันล้อเมาส์เด้งข้ามช่วงโดยไม่ตั้งใจ) */
let acc=0,lastWheel=0,gestureEdge=false,edgeAt=0,wasEdge=false;
const dwell=()=>performance.now()-edgeAt>350;
addEventListener("scroll",()=>{const e=edge();if(e&&!wasEdge)edgeAt=performance.now();wasEdge=e},{passive:true});
addEventListener("wheel",e=>{
  if(busy||blocked()||e.ctrlKey||Math.abs(e.deltaX)>Math.abs(e.deltaY))return;
  const now=performance.now();
  if(now-lastWheel>200){acc=0;gestureEdge=edge()&&dwell()}      /* ท่าใหม่ = เริ่มนับใหม่ และจำว่าเริ่มที่ขอบหรือเปล่า */
  lastWheel=now;
  if(now<cool||!gestureEdge||!want(e.deltaY)||typing(e.target)){return}
  acc+=Math.abs(e.deltaY);
  if(acc>70){acc=0;go(stage==="ai"?"call":"ai")}
},{passive:true});
let ty=0,tx=0,tEdge=false,tOn=false;
addEventListener("touchstart",e=>{tOn=e.touches.length===1&&!busy&&!blocked();if(!tOn)return;ty=e.touches[0].clientY;tx=e.touches[0].clientX;tEdge=edge()},{passive:true});
addEventListener("touchend",e=>{
  if(!tOn)return;tOn=false;
  const t=e.changedTouches[0],dy=t.clientY-ty,dx=t.clientX-tx;
  if(performance.now()<cool||!tEdge||typing(e.target)||Math.abs(dy)<70||Math.abs(dy)<Math.abs(dx)*1.6)return;
  if(stage==="ai"&&dy<0)go("call");else if(stage==="call"&&dy>0)go("ai");
},{passive:true});
addEventListener("touchcancel",()=>{tOn=false},{passive:true});
addEventListener("keydown",e=>{
  if(busy){if(/^(ArrowUp|ArrowDown|PageUp|PageDown|Home|End| )$/.test(e.key)&&!typing(e.target))e.preventDefault();return}
  if(typing(e.target)||e.altKey||e.ctrlKey||e.metaKey||blocked())return;
  if((e.key==="ArrowDown"||e.key==="PageDown")&&stage==="ai"&&atBottom()){e.preventDefault();go("call")}
  else if((e.key==="ArrowUp"||e.key==="PageUp")&&stage==="call"&&atTop()){e.preventDefault();go("ai")}
});

/* ── ปุ่ม ── */
$("hmNext").onclick=()=>go("call");
$("hmBack").onclick=()=>go("ai");
$("hmDots").addEventListener("click",e=>{const b=e.target.closest("button[data-s]");if(b)go(b.dataset.s)});
/* ค้นหาช่าง/บริการ (ช่วง 2): ไปหน้าผลลัพธ์เดียวกับช่องค้นหาเดิม */
$("hmSearch").onsubmit=e=>{e.preventDefault();const v=$("hs2").value.trim();if(v.length<2){$("hs2").focus();return}if(typeof W.openRes==="function")W.openRes(v)};
/* แตะแท็บ "หน้าหลัก" ตอนอยู่ช่วง 2 = กลับช่วง AI (เหมือนกลับขึ้นบนสุดของหน้าหลัก) */
D.addEventListener("click",e=>{
  if(stage==="call"&&!root.hidden&&e.target.closest&&e.target.closest('.navwrap [data-view="home"],[data-mnav="home"]'))go("ai");
},true);

/* ── เริ่มต้น ── */
paint();
if(typeof W.spireOnLang==="function")W.spireOnLang(()=>paint());
addEventListener("resize",fit);addEventListener("orientationchange",()=>setTimeout(fit,250));
try{
  const nav=performance.getEntriesByType("navigation")[0],back=nav&&(nav.type==="back_forward"||nav.type==="reload");
  if(back&&sessionStorage.getItem(KEY)==="call"){stage="call";ai.hidden=true;call.hidden=false;root.dataset.stage="call";dots()}
}catch(e){}
fit();if(D.fonts&&D.fonts.ready)D.fonts.ready.then(fit);
addEventListener("load",()=>setTimeout(fit,300));
/* สำหรับเทสต์/เครื่องมืออื่น: ดูหรือสั่งสลับช่วงได้ (ยังเคารพการล็อกระหว่างเปลี่ยน) */
W.CendonHomeStages=Object.freeze({go,get stage(){return stage},get busy(){return busy}});
})(window,document);
