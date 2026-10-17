/* ══ เมนูดรอปดาวน์ทุกหน้า: เลื่อนคลี่ลงมาอย่างนุ่ม แทนการเด้งขยายแบบป๊อปอัป ══
   เมนูในแอปเปิดกันหลายแบบ (สลับคลาส show/on/open · สร้างใหม่ตอนกด · hidden · display) จึงไม่ไปแก้ทีละเมนู
   ไฟล์นี้คอยดูว่าเมนูไหน "เพิ่งเปิด" แล้วเล่นภาพเคลื่อนไหวชุดเดียวกัน:
   · คลี่จากขอบด้านที่ติดปุ่ม (เมนูที่ห้อยลง = คลี่ลง · เมนูที่เปิดขึ้นเหนือปุ่ม เช่น ปุ่ม + ในแชต = คลี่ขึ้น)
   · ปิดแบบที่ยังอยู่ในหน้า (สลับคลาส) = ม้วนกลับทางเดิม
   · ใช้ translate แยกจาก transform ของเมนูเอง ตำแหน่งที่จัดไว้ (เช่น จัดกลาง translateX(-50%)) จึงไม่เพี้ยน
   · ผู้ใช้ตั้งลดภาพเคลื่อนไหว = เปิด/ปิดทันที */
(function(D,W){
'use strict';
if(!Element.prototype.animate)return;
/* เมนู → เปิดอยู่หรือไม่ (นอกจากต้องมองเห็นได้) */
const MENUS=[
  ['.dd',e=>e.classList.contains('show')],
  ['.custom-select-options',e=>!!(e.closest('.custom-select')||{}).classList&&e.closest('.custom-select').classList.contains('active')],
  ['.car-pop,.att-pop,.pl-menu',e=>e.classList.contains('on')],
  ['.p-drop',e=>e.classList.contains('open')],
  ['.lx-carmenu,.stu-menu,.ch-menu,.nb-pop,.sess-pop,.dp-pop,.acct-drop,.vl-more,.sk-pop',()=>true]
];
const SEL=MENUS.map(m=>m[0]).join(',');
const calm=()=>matchMedia('(prefers-reduced-motion:reduce)').matches;
/* ของเดิมเด้งขยาย (scale) — ปิดไว้ ให้เหลือแบบคลี่ลงแบบเดียวทั้งแอป */
const st=D.createElement('style');st.id='cdDropCss';
st.textContent='.nb-pop,.vl-more,.sess-pop,.dp-pop,.p-drop.open,.lx-carmenu,.stu-menu,.ch-menu{animation:none!important}'+
  '.dd,.car-pop,.att-pop,.pl-menu{transition:opacity .22s ease!important;transform:none!important}';
(D.head||D.documentElement).appendChild(st);

const openOf=e=>{const m=MENUS.find(m=>e.matches(m[0]));if(!m||!m[1](e)||e.hidden)return false;
  const cs=getComputedStyle(e);return cs.display!=='none'&&cs.visibility!=='hidden'&&e.getClientRects().length>0};
let lastY=null;
D.addEventListener('pointerdown',e=>{lastY=e.clientY},true);
D.addEventListener('keydown',()=>{lastY=null},true);
const state=new WeakMap();
function play(e,open){
  if(calm())return;
  const r=e.getBoundingClientRect(),rad=getComputedStyle(e).borderTopLeftRadius||'14px';
  /* เปิดขึ้นเหนือจุดที่กด = คลี่ขึ้น · นอกนั้นคลี่ลง */
  const up=lastY!=null&&r.bottom<=lastY+6&&r.top<lastY;
  const shut=up?`inset(100% 0 0 0 round ${rad})`:`inset(0 0 100% 0 round ${rad})`;
  const full=`inset(-30px -30px -60px -30px round ${rad})`;
  const k0={clipPath:shut,translate:`0 ${up?10:-10}px`,opacity:0},k1={clipPath:full,translate:'0 0',opacity:1};
  try{if(e._cdAnim)e._cdAnim.cancel()}catch(x){}
  e._cdAnim=e.animate(open?[k0,k1]:[k1,k0],{duration:open?340:220,easing:open?'cubic-bezier(.2,.9,.25,1)':'cubic-bezier(.4,0,.8,.4)'});
}
function check(e){
  const was=state.get(e)||false,now=openOf(e);
  if(now===was)return;state.set(e,now);
  if(now){requestAnimationFrame(()=>play(e,true))}
  else if(e.isConnected)play(e,false);
}
let q=new Set(),raf=0;
const flush=()=>{raf=0;const L=[...q];q.clear();L.forEach(check)};
const add=e=>{q.add(e);if(!raf)raf=requestAnimationFrame(flush)};
new MutationObserver(ms=>{for(const m of ms){
  if(m.type==='childList'){m.addedNodes.forEach(n=>{if(n.nodeType!==1)return;if(n.matches(SEL))add(n);n.querySelectorAll&&n.querySelectorAll(SEL).forEach(add)})}
  else{const t=m.target;if(t.nodeType!==1)continue;
    if(t.matches(SEL))add(t);
    /* custom select: คลาส active อยู่ที่กล่องแม่ */
    if(t.classList&&t.classList.contains('custom-select'))t.querySelectorAll('.custom-select-options').forEach(add);}
}}).observe(D.documentElement,{childList:true,subtree:true,attributes:true,attributeFilter:['class','hidden','style']});
W.CendonDrop={play};
})(document,window);
