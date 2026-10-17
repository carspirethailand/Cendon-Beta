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
  ['.lx-carmenu,.stu-menu,.ch-menu,.nb-pop,.sess-pop,.dp-pop,.acct-drop,.vl-more,.sk-pop,.cs-list',()=>true]
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
/* ══ ช่องเลือก <select> ทั้งแอป ══
   ของเดิมแตะแล้วเด้งตัวเลือกของระบบ (iPhone = วงล้อจากด้านล่าง · Android/คอม = กล่องป๊อปอัป)
   ตอนนี้ดักการแตะไว้ แล้วเปิดรายการของเราเอง คลี่ลงใต้ช่อง (ถ้าข้างล่างไม่พอ คลี่ขึ้นเหนือช่อง)
   ช่องเดิมยังอยู่ที่เดิมทุกอย่าง (หน้าตา ค่าที่เลือก การตรวจฟอร์ม โค้ดที่ตั้งค่าเอง) — เลือกแล้วส่ง input/change เหมือนผู้ใช้เลือกเอง
   ไม่ยุ่งกับช่องเลือกหลายค่า (multiple/size) และช่องที่ติด data-native */
const skipSel=x=>!x||x.multiple||x.size>1||x.disabled||!!x.closest('[data-native]');
const csCss=D.createElement('style');csCss.id='csListCss';
csCss.textContent='.cs-list{position:fixed;z-index:2147483000;overflow:auto;overscroll-behavior:contain;-webkit-overflow-scrolling:touch;padding:6px;border-radius:14px;'+
  'background:var(--cs-bg);color:var(--cs-fg);box-shadow:0 0 0 1px var(--cs-line),0 22px 48px -18px rgba(0,0,0,.45);font-family:Kanit,system-ui,sans-serif;box-sizing:border-box}'+
  '.cs-o{display:flex;align-items:center;gap:10px;width:100%;min-height:42px;padding:9px 12px;border:0;border-radius:10px;background:none;color:inherit;font:inherit;font-size:14.5px;line-height:1.35;text-align:left;cursor:pointer}'+
  '.cs-o:hover,.cs-o:focus-visible{background:var(--cs-hover);outline:none}.cs-o[aria-selected="true"]{font-weight:600}'+
  '.cs-o[aria-selected="true"]::after{content:"";flex:none;margin-left:auto;width:8px;height:8px;border-radius:50%;background:var(--co,#E9682A)}'+
  '.cs-o:disabled{opacity:.42;cursor:default}.cs-g{padding:9px 12px 4px;font-size:11.5px;font-weight:600;letter-spacing:.03em;opacity:.6}';
(D.head||D.documentElement).appendChild(csCss);
let CS=null;
const solidBg=el=>{for(let e=el;e&&e.nodeType===1;e=e.parentElement){const c=getComputedStyle(e).backgroundColor,m=c.match(/rgba?\(([^)]+)\)/);if(m){const p=m[1].split(',').map(Number);if((p[3]===undefined?1:p[3])>.85)return c}}return getComputedStyle(D.body).backgroundColor||'#fff'};
function closeList(back){
  const c=CS;if(!c)return;CS=null;
  c.sel.removeAttribute('aria-expanded');removeEventListener('resize',onWin);D.removeEventListener('scroll',onScroll,true);D.removeEventListener('pointerdown',onOut,true);
  if(!calm()){play(c.L,false);setTimeout(()=>c.L.remove(),200)}else c.L.remove();
  if(back&&!c.touch)try{c.sel.focus({preventScroll:true})}catch(e){}
}
const onWin=()=>closeList(false);
const onScroll=e=>{if(CS&&!CS.L.contains(e.target))closeList(false)};
const onOut=e=>{if(CS&&!CS.L.contains(e.target)&&e.target!==CS.sel)closeList(false)};
function pick(i){
  const c=CS;if(!c)return;const sel=c.sel,changed=sel.selectedIndex!==i;
  sel.selectedIndex=i;closeList(true);
  if(changed){sel.dispatchEvent(new Event('input',{bubbles:true}));sel.dispatchEvent(new Event('change',{bubbles:true}))}
}
function openList(sel,touch){
  if(CS){const same=CS.sel===sel;closeList(false);if(same)return}
  const r=sel.getBoundingClientRect();if(!r.width)return;
  const L=D.createElement('div');L.className='cs-list';L.setAttribute('role','listbox');
  const lab=sel.getAttribute('aria-label')||(sel.labels&&sel.labels[0]&&sel.labels[0].textContent.trim())||'';if(lab)L.setAttribute('aria-label',lab.slice(0,80));
  const bg=solidBg(sel),fg=getComputedStyle(sel).color;
  L.style.setProperty('--cs-bg',bg);L.style.setProperty('--cs-fg',fg);
  L.style.setProperty('--cs-hover',`color-mix(in srgb,${fg} 9%,${bg})`);L.style.setProperty('--cs-line',`color-mix(in srgb,${fg} 14%,transparent)`);
  const esc=t=>String(t).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  let h='';
  const item=o=>o.hidden?'':`<button type="button" class="cs-o" role="option" data-i="${o.index}" aria-selected="${o.index===sel.selectedIndex}"${o.disabled?' disabled':''}>${esc(o.text)}</button>`;
  for(const ch of sel.children){if(ch.tagName==='OPTGROUP'){h+=`<div class="cs-g" role="presentation">${esc(ch.label)}</div>`;for(const o of ch.children)if(o.tagName==='OPTION')h+=item(o)}else if(ch.tagName==='OPTION')h+=item(ch)}
  L.innerHTML=h;D.body.appendChild(L);
  /* วางใต้ช่อง · ข้างล่างไม่พอและข้างบนกว้างกว่า = วางเหนือช่อง */
  const vw=innerWidth,vh=innerHeight,w=Math.min(Math.max(r.width,200),vw-16),below=vh-r.bottom-12,above=r.top-12,want=Math.min(L.scrollHeight,340);
  const up=below<want&&above>below;
  L.style.width=w+'px';L.style.left=Math.max(8,Math.min(r.left,vw-w-8))+'px';L.style.maxHeight=Math.max(120,Math.min(340,up?above:below))+'px';
  if(up)L.style.bottom=(vh-r.top+6)+'px';else L.style.top=(r.bottom+6)+'px';
  lastY=up?r.top:r.bottom;
  sel.setAttribute('aria-expanded','true');
  CS={sel,L,touch:!!touch};
  const cur=L.querySelector('[aria-selected="true"]');if(cur){cur.scrollIntoView({block:'nearest'});if(!touch)cur.focus({preventScroll:true})}else if(!touch){const f=L.querySelector('.cs-o:not(:disabled)');if(f)f.focus({preventScroll:true})}
  L.addEventListener('click',e=>{const b=e.target.closest('.cs-o');if(b&&!b.disabled)pick(+b.dataset.i)});
  L.addEventListener('keydown',e=>{
    const all=[...L.querySelectorAll('.cs-o:not(:disabled)')],i=all.indexOf(D.activeElement);
    if(e.key==='ArrowDown'||e.key==='ArrowUp'){e.preventDefault();const n=all[Math.max(0,Math.min(all.length-1,i+(e.key==='ArrowDown'?1:-1)))];if(n)n.focus()}
    else if(e.key==='Home'||e.key==='End'){e.preventDefault();const n=e.key==='Home'?all[0]:all[all.length-1];if(n)n.focus()}
    else if(e.key==='Escape'){e.preventDefault();e.stopPropagation();closeList(true)}
    else if(e.key==='Tab')closeList(false);
    else if(e.key.length===1&&/\S/.test(e.key)){const k=e.key.toLowerCase(),n=all.slice(i+1).concat(all.slice(0,i+1)).find(b=>b.textContent.trim().toLowerCase().startsWith(k));if(n)n.focus()}
  });
  addEventListener('resize',onWin);D.addEventListener('scroll',onScroll,true);setTimeout(()=>D.addEventListener('pointerdown',onOut,true),0);
}
/* คอม: กดเมาส์ที่ช่อง → ไม่ให้กล่องของระบบเด้ง เปิดของเราแทน */
D.addEventListener('mousedown',e=>{const x=e.target.closest&&e.target.closest('select');if(!x||skipSel(x)||e.button>0)return;e.preventDefault();lastY=e.clientY;openList(x,false)},true);
/* มือถือ: แตะ (ไม่ใช่ปัดเลื่อนหน้า) → ไม่ให้วงล้อ/ป๊อปอัปของระบบเด้ง เปิดของเราแทน */
let tS=null;
D.addEventListener('touchstart',e=>{const x=e.target.closest&&e.target.closest('select'),t=e.touches[0];tS=x&&!skipSel(x)&&t?{x,cx:t.clientX,cy:t.clientY}:null},{capture:true,passive:true});
D.addEventListener('touchmove',e=>{const t=e.touches[0];if(tS&&t&&(Math.abs(t.clientX-tS.cx)>8||Math.abs(t.clientY-tS.cy)>8))tS=null},{capture:true,passive:true});
D.addEventListener('touchend',e=>{const st=tS;tS=null;if(!st)return;const x=e.target.closest&&e.target.closest('select');if(x!==st.x)return;
  e.preventDefault();try{x.blur()}catch(err){}openList(x,true)},{capture:true,passive:false});
/* Esc ปิดรายการได้เสมอ แม้เปิดด้วยการแตะ (ตอนนั้นโฟกัสไม่ได้อยู่ในรายการ) */
D.addEventListener('keydown',e=>{if(CS&&e.key==='Escape'&&!CS.L.contains(e.target)){e.preventDefault();e.stopPropagation();closeList(true)}},true);
/* คีย์บอร์ด: เว้นวรรค/Enter/ลูกศร บนช่อง → เปิดรายการ */
D.addEventListener('keydown',e=>{const x=e.target;if(!(x instanceof HTMLSelectElement)||skipSel(x)||CS)return;
  if(e.key===' '||e.key==='Enter'||e.key==='ArrowDown'||e.key==='ArrowUp'){e.preventDefault();lastY=null;openList(x,false)}},true);

W.CendonDrop={play,openList,closeList};
})(document,window);
