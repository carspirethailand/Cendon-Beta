/* คลิปเปิดแอปบนหน้าเข้าสู่ระบบ: รถ → กล้องพุ่งเข้าจอกลางรถ → เส้นแสงวาร์ป → หน้าเข้าสู่ระบบโผล่ขึ้นมา
   เริ่มเผยหน้าเข้าสู่ระบบตอนเส้นแสงเริ่ม (≈5.65 วิ) · กด "ข้าม" / Esc ได้ทุกเมื่อ
   เล่นไม่ได้ (เบราว์เซอร์กันเล่นอัตโนมัติ โหมดประหยัดแบต เน็ตช้า) → ไปหน้าเข้าสู่ระบบทันที ไม่ค้างจอดำ */
(function(W,D){
'use strict';
const H=D.documentElement;if(!H.classList.contains('ci-on'))return;
const WARP=5.65,th=(()=>{try{return (JSON.parse(localStorage.getItem('spire_lang'))||'th')==='th'}catch(e){return true}})();
const big=Math.max(W.innerWidth,W.innerHeight)*(W.devicePixelRatio||1)>=1700&&W.innerWidth>=W.innerHeight;
const wrap=D.createElement('div');wrap.className='ci';wrap.setAttribute('data-ac-free','');wrap.setAttribute('role','presentation');
wrap.innerHTML=`<video muted playsinline autoplay preload="auto" disablepictureinpicture disableremoteplayback aria-hidden="true" poster="/intro-poster.jpg"><source src="/intro-${big?1080:720}.mp4" type="video/mp4"><source src="/intro-720.webm" type="video/webm"></video><button class="ci-skip" type="button">${th?'ข้าม':'Skip'}</button>`;
D.body.appendChild(wrap);
const v=wrap.querySelector('video'),skip=wrap.querySelector('.ci-skip');
v.muted=true;v.defaultMuted=true;
try{sessionStorage.setItem('cendon_intro','1')}catch(e){}
let done=false,raf=0;
function finish(fast){
  if(done)return;done=true;cancelAnimationFrame(raf);clearTimeout(t1);clearTimeout(t2);
  if(fast)H.classList.add('ci-fast');
  H.classList.add('ci-reveal');H.classList.remove('ci-on');
  D.removeEventListener('keydown',key,true);
  setTimeout(()=>{wrap.remove();H.classList.remove('ci-reveal','ci-fast');try{v.pause()}catch(e){}
    /* โฟกัสหัวข้อหน้าเข้าสู่ระบบ (ถ้ายังไม่มีอะไรถูกโฟกัสอยู่) ให้โปรแกรมอ่านหน้าจอเริ่มถูกที่ */
    const t=D.getElementById('acTitle'),a=D.activeElement;if(t&&t.focus&&(!a||a===D.body||!a.isConnected))t.focus({preventScroll:true})},fast?520:1250);
}
function tick(){if(done)return;if(v.currentTime>=WARP)finish(false);else raf=requestAnimationFrame(tick)}
function key(e){if(e.key==='Escape'||e.key==='Enter'&&D.activeElement===skip){e.preventDefault();finish(true)}}
v.addEventListener('playing',()=>{raf=requestAnimationFrame(tick)});
v.addEventListener('ended',()=>finish(false));
/* เปิดไม่ได้ทั้ง mp4 และ webm → error ขึ้นที่ source ตัวสุดท้าย */
const srcs=wrap.querySelectorAll('source');srcs[srcs.length-1].addEventListener('error',()=>finish(true));v.addEventListener('error',()=>finish(true));
skip.addEventListener('click',()=>finish(true));
D.addEventListener('keydown',key,true);
/* เริ่มไม่ได้ภายใน 2.5 วิ (เน็ตช้า/ถูกบล็อก) → ข้ามไปเลย · กันค้างสุดท้าย 10 วิ */
const t1=setTimeout(()=>{if(v.paused||v.currentTime<0.05)finish(true)},2500);
const t2=setTimeout(()=>finish(false),10000);
try{const p=v.play();if(p&&p.catch)p.catch(()=>finish(true))}catch(e){finish(true)}
/* ผู้ใช้กลับมาเมื่อสลับแท็บ — ไม่ต้องดูคลิปต่อ */
D.addEventListener('visibilitychange',()=>{if(D.hidden)finish(true)},{once:true});
})(window,document);
