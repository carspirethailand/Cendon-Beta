/* ══ Cendon call shell — สายโทรกับ AI ไม่หลุดตอนเปลี่ยนหน้า ══
   ระหว่างมีสาย: การไปหน้าอื่นในเว็บเดียวกัน (ลิงก์ เมนูล่าง ปุ่มที่สั่ง location.href) ถูกดักด้วย Navigation API
   แล้วเปิดหน้านั้นในกรอบเต็มจอทับหน้านี้ — หน้านี้ (ที่ถือสาย ไมค์ และเสียง) ไม่ถูกปิด สายจึงคุยต่อได้
   · ที่อยู่บนแถบเบราว์เซอร์และชื่อหน้าเป็นของหน้าที่เห็นจริง · ปุ่มย้อนกลับใช้ได้ปกติ
   · หน้าในกรอบกดโทร = เปิดสายเดิมขึ้นมา (ไม่เริ่มสายใหม่ ไม่ซ้อนสาย)
   · กลับมาหน้าที่ถือสาย = ปิดกรอบ เห็นหน้าเดิมทันที
   · วางสายแล้ว หน้าที่เห็นอยู่โหลดเป็นหน้าจริงแทนกรอบ (ที่อยู่เดิม ไม่หลงหน้า)
   เบราว์เซอร์ที่ไม่มี Navigation API: ดักได้เฉพาะการกดลิงก์ */
(function(W,D){
'use strict';
if(W.CendonCallShell)return;
const isTop=W.parent===W,H=D.documentElement;
let call=null,frame=null,base=null,timer=0;
const same=u=>u.origin===location.origin;
const keyOf=u=>(u.pathname.replace(/\.html$/,'').replace(/\/index$/,'/').replace(/\/+$/,'')||'/');
const isBase=u=>!!base&&keyOf(u)===base.key;
function frameHref(){try{const h=frame.contentWindow.location.href;return h&&h!=='about:blank'?h:null}catch(e){return null}}
/* ที่อยู่และชื่อหน้าตามหน้าที่อยู่ในกรอบ */
function sync(){if(!frame)return;const h=frameHref();if(!h)return;try{if(h!==location.href)history.replaceState(history.state,'',h)}catch(e){}try{D.title=frame.contentWindow.document.title||D.title}catch(e){}}
/* หน้าในกรอบจะกลับมาหน้าที่ถือสาย = ปิดกรอบแทน (ไม่โหลดหน้าเดิมซ้อนอีกชั้น) */
function wire(){
  let cw;try{cw=frame.contentWindow}catch(e){return}
  try{
    const nv=cw.navigation;if(!nv||nv.__cv)return;nv.__cv=1;
    nv.addEventListener('navigate',ev=>{if(!call||!ev.cancelable||ev.destination.sameDocument)return;const u=new URL(ev.destination.url);if(same(u)&&isBase(u)){ev.preventDefault();hide(u.href);}});
    nv.addEventListener('navigatesuccess',sync);
  }catch(e){}
  try{cw.addEventListener('popstate',sync);cw.addEventListener('hashchange',sync);}catch(e){}
}
function show(url){
  if(!frame){
    frame=D.createElement('iframe');frame.id='cvShell';frame.title='Cendon';
    frame.setAttribute('allow','camera; microphone; geolocation; clipboard-write; fullscreen');
    frame.addEventListener('load',()=>{if(!frame)return;sync();wire();frame.classList.add('in');H.classList.add('cv-shell-in');});
    D.body.append(frame);H.classList.add('cv-shelled');
    try{call&&call.minimize&&call.minimize()}catch(e){}
  }
  frame.classList.remove('in');
  try{frame.contentWindow.location.replace(url)}catch(e){frame.src=url}
}
function hide(href){
  if(!frame)return;const f=frame;frame=null;H.classList.remove('cv-shelled','cv-shell-in');f.classList.remove('in');setTimeout(()=>f.remove(),220);
  if(base)D.title=base.title;if(href){try{history.replaceState(history.state,'',href)}catch(e){}}
  try{call&&call.refresh&&call.refresh()}catch(e){}
}
/* ดักการเปลี่ยนหน้าระหว่างมีสาย */
function onNavigate(e){
  if(!call||!e.canIntercept||e.hashChange||e.downloadRequest||e.formData||e.destination.sameDocument)return;
  const u=new URL(e.destination.url);if(!same(u)||e.navigationType==='traverse'||e.navigationType==='reload')return;
  e.intercept({scroll:'manual',focusReset:'manual',handler(){if(isBase(u)&&u.search===base.search)hide();else show(u.href);}});
}
/* ย้อน/ไปข้างหน้าระหว่างรายการที่ดักไว้ (ประวัติของหน้านี้เอง) */
function onPop(){if(!call)return;const u=new URL(location.href);if(isBase(u)){if(frame)hide();}else if(frameHref()!==u.href)show(u.href);}
function onClick(e){
  if(!call||e.defaultPrevented||e.button!==0||e.metaKey||e.ctrlKey||e.shiftKey||e.altKey)return;
  const a=e.target.closest&&e.target.closest('a[href]');if(!a||a.target&&a.target!=='_self'||a.hasAttribute('download'))return;
  let u;try{u=new URL(a.href,location.href)}catch(x){return}if(!same(u)||(u.pathname===location.pathname&&u.search===location.search))return;
  e.preventDefault();try{history.pushState(null,'',u.href)}catch(x){}if(isBase(u))hide();else show(u.href);
}
W.CendonCallShell=Object.freeze({
  active:()=>!!call,
  expand(){try{call&&call.expand&&call.expand()}catch(e){}},
  /* หน้าที่ถือสายแจ้งว่าเริ่มสาย / สายจบ (call-session.js) */
  started(api){if(!isTop)return;call=api;clearTimeout(timer);base={key:keyOf(new URL(location.href)),search:location.search,title:D.title};},
  ended(api){
    if(!isTop||(api&&call&&api!==call))return;call=null;
    if(frame){const h=frameHref()||location.href;timer=setTimeout(()=>{try{location.replace(h)}catch(e){}},460);}
  },
  open(url){if(call&&isTop)show(String(url));else location.assign(url);}
});
if(isTop){
  if(W.navigation&&W.navigation.addEventListener)W.navigation.addEventListener('navigate',onNavigate);
  else D.addEventListener('click',onClick,true);
  W.addEventListener('popstate',onPop);
}
})(window,document);
