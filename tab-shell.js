/* ═══════════════════════════════════════════════════════════════════
   เก็บแท็บที่เคยเปิดไว้ แบบแอปทั่วไป (window.CendonTabs) — ทุกแท็บล่าง (ขั้นทดสอบ)
   หน้าแรก / · การาจ /garage · แชต /messages (= กล่องข้อความของหน้าแรก) · นิตยสาร /news · บัญชี /profile
   ───────────────────────────────────────────────────────────────────
   เดิมกดแท็บ = เปิดหน้าเว็บใหม่ทั้งหน้า (~1 MB) มือถือต้องอ่าน/รันโค้ดใหม่ทุกครั้ง
   ตอนนี้ (เฉพาะเครื่องที่เปิดโหมดทดสอบ ?tabs=1 · ปิด ?tabs=0):
     • แท็บแรกที่เปิด = หน้าหลัก · แท็บอื่นเปิดในกรอบเต็มจอทับ และเก็บค้างไว้
     • กดกลับไปแท็บที่เคยเปิด = แค่สลับให้เห็น (ตำแหน่งเลื่อน/สิ่งที่พิมพ์ยังอยู่)
     • เปิดแท็บครั้งแรก: หน้าเดิมยังอยู่บนจอจนแท็บใหม่วาดเสร็จ (ไม่มีจอว่าง)
     • แท็บที่ซ่อนอยู่: บอกหน้าว่า "ถูกซ่อน" และพักคำขอ GET ไปเซิร์ฟเวอร์ไว้ — ไม่ดึงข้อมูลซ้ำซ้อน
       กลับมาเห็นจึงส่งคำขอที่พักไว้ (ที่อยู่ซ้ำส่งครั้งเดียว)
     • ข้อมูลที่หน้าใช้วาด (รถ ภาษา ธีม หน่วย ชื่อ) เปลี่ยนระหว่างซ่อน → โหลดแท็บนั้นใหม่ตอนกลับมา
     • ปุ่มย้อน/ไปข้างหน้า ที่อยู่บนแถบเบราว์เซอร์ ตรงกับแท็บที่เห็น · รีเฟรช = เปิดหน้านั้นตามปกติ
     • มีสายโทรกับ AI ในหน้าหลัก → ปล่อยให้ call-shell.js จัดการเหมือนเดิม
       สายในแท็บซ้อน → แท็บนั้นไม่ถูกพัก/ไม่ถูกปล่อย และมีปุ่ม "กลับไปที่สาย" ระหว่างดูแท็บอื่น
     • เก็บแท็บซ้อนไว้สูงสุด 3 แท็บ (แรมน้อยกว่า 4GB: 1 แท็บ) — เกินแล้วปล่อยแท็บที่ไม่ได้ดูนานสุด
   ไปหน้าอื่นที่ไม่ใช่แท็บล่าง/ลิงก์ลึก = เปิดหน้าแบบเดิมทั้งหน้า
   โหลดแบบไม่ defer ต้นหน้า (ต่อจากสคริปต์ธีม) ก่อนสคริปต์อื่นที่เรียกเซิร์ฟเวอร์
   ═══════════════════════════════════════════════════════════════════ */
(function(W,D){
  'use strict';
  if(W.CendonTabs)return;
  try{const q=new URLSearchParams(location.search).get('tabs');if(q==='1')localStorage.setItem('cendon_tabs','1');if(q==='0')localStorage.removeItem('cendon_tabs')}catch(e){}
  let enabled=false;try{enabled=localStorage.getItem('cendon_tabs')==='1'}catch(e){}
  const fe=(()=>{try{return W.frameElement}catch(e){return null}})(),childKey=fe&&fe.dataset&&fe.dataset.cendonTab||null;
  if(!enabled&&!childKey){W.CendonTabs=Object.freeze({on:false,go:()=>false});return}

  const TABS={'/':'home','/messages':'home','/garage':'garage','/news':'news','/profile':'profile'},URLS={home:'/',garage:'/garage',news:'/news',profile:'/profile'};
  const WATCH=['spire_garage','spire_selCar','spire_setup','spire_lang','spire_theme','spire_chatTheme','spire_units','spire_cachedUser','spire___owner','cendon_signed'];
  const clean=p=>{p=String(p||'/').replace(/\.html$/,'').replace(/\/index$/,'/');if(p.length>1)p=p.replace(/\/+$/,'');return p||'/'};
  /* ปุ่มแท็บพาไปที่อยู่แท็บตรง ๆ เท่านั้น (ไม่มี ?query) — ลิงก์ลึก เช่น /garage/<รถ> เปิดหน้าแบบเดิม */
  const tabOf=u=>{try{const x=new URL(u,location.href);return x.origin===location.origin&&!x.search&&!x.hash?TABS[clean(x.pathname)]||null:null}catch(e){return null}};
  const fileOf=p=>{const m=clean(p).match(/^\/(garage|news|profile)(\/|$)/);return m?m[1]:'home'};
  const inboxUrl=u=>{try{return clean(new URL(u,location.href).pathname)==='/messages'}catch(e){return false}};
  const sig=()=>{let s='';try{for(const k of WATCH)s+=k+'='+(localStorage.getItem(k)||'')+'\n'}catch(e){}return s};
  const api=u=>{try{const x=new URL(u,location.href);return /\.workers\.dev$/.test(x.hostname)||x.origin===location.origin&&/^\/api(\/|$)/.test(x.pathname)}catch(e){return false}};

  /* ── "ซ่อนอยู่" ของแต่ละหน้า (หน้าหลักที่ถูกกรอบทับ / กรอบที่ถูกซ่อน) ── */
  let hidden=false,hiddenSig='';
  const P=Document.prototype,dh=Object.getOwnPropertyDescriptor(P,'hidden'),dv=Object.getOwnPropertyDescriptor(P,'visibilityState');
  try{
    Object.defineProperty(D,'hidden',{configurable:true,get(){return hidden||dh.get.call(D)}});
    Object.defineProperty(D,'visibilityState',{configurable:true,get(){return hidden?'hidden':dv.get.call(D)}});
  }catch(e){}
  const nativeFetch=W.fetch.bind(W),held=[];
  W.fetch=function(input,init){
    const url=typeof input==='string'?input:input&&input.url,method=String(init&&init.method||input&&input.method||'GET').toUpperCase();
    if(!hidden||method!=='GET'||!api(url))return nativeFetch(input,init);
    return new Promise((resolve,reject)=>held.push({input,init,url,resolve,reject}));
  };
  function release(){
    const shared=new Map(),list=held.splice(0);
    for(const q of list){
      const key=q.url+'\n'+JSON.stringify(q.init&&q.init.headers||null);
      let p=shared.get(key);if(!p){p=nativeFetch(q.input,q.init);shared.set(key,p)}
      p.then(r=>q.resolve(r.clone()),q.reject);
    }
  }
  /* คืน true = ข้อมูลเปลี่ยนระหว่างซ่อน (ต้องโหลดหน้าใหม่) */
  function setHidden(h){
    if(h===hidden)return false;hidden=h;
    if(h){hiddenSig=sig();try{D.activeElement&&D.activeElement.blur&&D.activeElement.blur()}catch(e){}}
    try{D.dispatchEvent(new Event('visibilitychange'))}catch(e){}
    if(!h){if(hiddenSig&&hiddenSig!==sig())return true;release()}
    return false;
  }

  /* ════════ หน้าในกรอบ (แท็บที่ไม่ใช่หน้าหลัก) ════════ */
  if(childKey){
    const host=W.parent&&W.parent.CendonTabs;
    /* กรอบไปโหลดหน้าที่ไม่ใช่ของแท็บนี้ (เบราว์เซอร์ที่ดักการเปลี่ยนหน้าไม่ได้) → เปิดหน้านั้นแบบเต็มแทน */
    if(!host||fileOf(location.pathname)!==childKey){try{W.top.location.replace(location.href)}catch(e){}}
    /* พร้อมโชว์ = หน้าเริ่มมีเนื้อหาให้เห็นแล้ว (เหมือนภาพแรกของการเปิดหน้าปกติ)
       นับจากภาพที่วาดไม่ได้ — กรอบที่ยังซ่อน (โปร่งใส) เบราว์เซอร์ไม่นับว่า "วาดแล้ว" */
    /* หน้าในแอป (การาจ นิตยสาร บัญชี) ซ่อนเนื้อหาไว้จนรู้ว่าเป็นบัญชีไหน (data-gate / data-level="pending" · account-paint.js)
       และวาดรายการตอนอ่านหน้าจบ (DOMContentLoaded) — ต้องรอทั้งสองอย่าง ไม่งั้นสลับมาเจอจอว่าง
       (หน้าแรกไม่ต้องรอ: เนื้อหาอยู่ใน HTML ก่อนสคริปต์ก้อนใหญ่ เห็นได้ตั้งแต่อ่านถึง) */
    let sent=false;const ready=()=>{if(sent)return;sent=true;try{host&&host.ready(childKey)}catch(e){}};
    const R=D.documentElement,shown=()=>{const b=D.body;return !!(b&&b.childElementCount>3&&D.querySelector('.mnav,#mnav,main,.wrap')&&R.dataset.gate!=='1'&&R.dataset.level!=='pending'&&(childKey==='home'||D.readyState!=='loading'))};
    (function look(){if(sent)return;if(shown())requestAnimationFrame(()=>requestAnimationFrame(ready));else requestAnimationFrame(look)})();
    const sync=()=>{try{host&&host.sync(childKey,location.href,D.title)}catch(e){}};
    if(W.navigation&&W.navigation.addEventListener){
      W.navigation.addEventListener('navigate',e=>{
        if(!e.cancelable||e.destination.sameDocument||e.hashChange||e.downloadRequest||e.formData||e.navigationType==='reload'||e.navigationType==='traverse')return;
        const u=e.destination.url;e.preventDefault();
        try{if(!(host&&host.go(u)))host.top(u)}catch(x){location.assign(u)}
      });
      W.navigation.addEventListener('navigatesuccess',sync);
    }
    W.addEventListener('popstate',sync);
    /* สายโทรที่เริ่มในแท็บซ้อน: call-shell.js ของหน้านี้ไม่คุม (ไม่ใช่หน้าบนสุด) — แจ้งตัวคุมแท็บแทน
       (ห่อหลัง call-shell.js สร้างตัวเองแล้วเท่านั้น ไม่งั้นมันจะไม่ทำงาน) */
    let inCall=false;
    const wrapCall=()=>{const o=W.CendonCallShell;if(!o||o.__tab)return;
      W.CendonCallShell=Object.freeze({__tab:1,active:()=>inCall||o.active(),expand:()=>o.expand(),open:u=>o.open(u),
        started(a){o.started(a);inCall=true;try{host&&host.call(childKey,true)}catch(e){}},
        ended(a){o.ended(a);inCall=false;try{host&&host.call(childKey,false)}catch(e){}}})};
    D.addEventListener('DOMContentLoaded',wrapCall);W.addEventListener('load',wrapCall);
    W.CendonTabs=Object.freeze({on:true,child:true,setHidden,inCall:()=>inCall,go:u=>{try{return !!(host&&host.go(u))}catch(e){return false}}});
    return;
  }

  /* ════════ หน้าหลัก (ตัวคุมแท็บ) ════════ */
  if(W.parent!==W){W.CendonTabs=Object.freeze({on:false,go:()=>false});return}   // อยู่ในกรอบอื่น (เช่นกรอบสายโทร) — ไม่คุม
  const base=fileOf(location.pathname),frames={},calls={};let cur=base,baseTitle='',order=[];
  const MAX=(navigator.deviceMemory||8)>=4?3:1;
  const calling=()=>{try{return !!(W.CendonCallShell&&W.CendonCallShell.active())}catch(e){return false}};
  const css=D.createElement('style');
  css.textContent='iframe.cdn-tab{position:fixed;inset:0;width:100%;height:100%;border:0;margin:0;padding:0;z-index:2147482000;background:transparent;opacity:0;pointer-events:none;visibility:hidden}'+
    'iframe.cdn-tab.on{opacity:1;pointer-events:auto;visibility:visible}iframe.cdn-tab.load{visibility:visible}'+
    'html.cdn-covered>body{visibility:hidden}'+
    '#cdnCallPill{position:fixed;left:50%;transform:translateX(-50%);bottom:calc(96px + env(safe-area-inset-bottom));z-index:2147483000;display:flex;align-items:center;gap:8px;padding:10px 16px;border:0;border-radius:999px;background:#E9682A;color:#fff;font:600 14px/1.2 Kanit,system-ui,sans-serif;box-shadow:0 10px 30px -8px rgba(0,0,0,.45)}'+
    '#cdnCallPill i{width:8px;height:8px;border-radius:50%;background:#fff;animation:cdnPulse 1.2s ease-in-out infinite}@keyframes cdnPulse{50%{opacity:.35}}'+
    /* แถบโหลดบาง ๆ บนสุด ระหว่างเปิดแท็บครั้งแรก — กดแล้วเห็นว่าแอปรับแล้ว (หน้าเดิมยังค้างจนแท็บใหม่พร้อม) */
    '#cdnTabBar{position:fixed;left:0;top:0;height:3px;width:100%;z-index:2147483001;background:#E9682A;transform-origin:0 50%;transform:scaleX(0);pointer-events:none;animation:cdnBar 2.4s cubic-bezier(.1,.7,.2,1) forwards}@keyframes cdnBar{to{transform:scaleX(.9)}}';
  (D.head||D.documentElement).appendChild(css);
  /* เกินจำนวนที่เก็บได้ → ปล่อยแท็บซ้อนที่ไม่ได้ดูนานสุด (ยกเว้นแท็บที่มีสายโทร) */
  function evict(){
    const alive=order.filter(x=>frames[x]&&frames[x].el.isConnected);
    while(alive.length>=MAX){const i=alive.findIndex(x=>x!==cur&&!calls[x]);if(i<0)break;const x=alive.splice(i,1)[0];frames[x].el.remove();delete frames[x]}
    order=alive;
  }
  function frameOf(k,url){
    let f=frames[k];if(f&&f.el.isConnected)return f;
    evict();
    const el=D.createElement('iframe');el.className='cdn-tab load';el.dataset.cendonTab=k;el.title='Cendon';
    el.setAttribute('allow','camera; microphone; geolocation; clipboard-write; fullscreen');
    f=frames[k]={el,ready:false,wait:null};el.src=url||URLS[k];
    /* อยู่ใต้ <html> นอก <body> — ซ่อนเนื้อหาหน้าหลักทั้งหน้าได้โดยกรอบยังเห็น */
    D.documentElement.appendChild(el);return f;
  }
  function win(k){try{return frames[k].el.contentWindow}catch(e){return null}}
  /* ส่ง "บริบทการวาด" ให้แท็บใหม่ แบบเดียวกับการกดลิงก์ไปหน้าอื่นตามปกติ (CendonPaint.prepare ใน account-paint.js)
     — หน้าปลายทางแสดงเนื้อหาได้ทันทีตอนอ่านหน้า ไม่ต้องรอ Firebase ยืนยันตัวตนอีกรอบ (มือถือ 0.5–2 วิ)
     ใช้หน้าที่ผู้ใช้กำลังดูก่อน แล้วค่อยหน้าหลัก (ต้องเป็นหน้าที่รู้บัญชีแล้วเท่านั้น ไม่งั้นได้ false) */
  function handoff(url){for(const w of [cur===base?W:win(cur),W]){try{if(w&&w.CendonPaint&&w.CendonPaint.prepare(url))return}catch(e){}}}
  function tabs(k){try{return k===base?W.CendonTabs:win(k).CendonTabs}catch(e){return null}}
  /* แท็บซ้อนที่มีสายโทร: ไม่พัก · ระหว่างดูแท็บอื่นมีปุ่มกลับไปที่สาย */
  const PILL={th:'กลับไปที่สาย',en:'Back to call',zh:'返回通话',ja:'通話に戻る',ko:'통화로 돌아가기',id:'Kembali ke panggilan',vi:'Quay lại cuộc gọi',ms:'Kembali ke panggilan',de:'Zurück zum Anruf',fr:"Retour à l'appel",es:'Volver a la llamada',pt:'Voltar à chamada'};
  function pill(){
    const k=Object.keys(calls).find(x=>calls[x]&&x!==cur&&frames[x]);let b=D.getElementById('cdnCallPill');
    if(!k){if(b)b.remove();return}
    if(!b){b=D.createElement('button');b.type='button';b.id='cdnCallPill';D.documentElement.appendChild(b)}
    let l='th';try{l=JSON.parse(localStorage.getItem('spire_lang'))||'th'}catch(e){}
    b.innerHTML='<i></i><span></span>';b.lastChild.textContent=PILL[l]||PILL.en;
    b.onclick=()=>{try{history.pushState({cendonTab:k},'',URLS[k])}catch(e){}reveal(k)};
  }
  function hideFrame(x){frames[x].el.classList.remove('on','load');if(!calls[x]&&tabs(x))tabs(x).setHidden(true)}
  /* แชต = กล่องข้อความของหน้าแรก */
  function inbox(k){try{const w=k===base?W:win(k);if(w&&typeof w.openInbox==='function')w.openInbox()}catch(e){}}
  function bar(on){let b=D.getElementById('cdnTabBar');if(!on){if(b)b.remove();return}if(!b){b=D.createElement('i');b.id='cdnTabBar';D.documentElement.appendChild(b)}}
  let showing=0;
  function reveal(k,opt){
    const n=++showing,box=opt&&opt.inbox;order=order.filter(x=>x!==k).concat(k);
    if(k===base){
      for(const x in frames)hideFrame(x);
      D.documentElement.classList.remove('cdn-covered');bar(false);cur=base;if(baseTitle)D.title=baseTitle;
      /* ข้อมูลเปลี่ยนระหว่างซ่อน → โหลดหน้าหลักใหม่ · มาเพื่อเปิดแชต: ที่อยู่ยังเป็นของแท็บก่อน (กล่องข้อความยังไม่ได้เพิ่มรายการประวัติ) → เปิด /messages แทน */
      if(setHidden(false)){if(box&&clean(location.pathname)!=='/messages')location.assign('/messages');else location.reload();return}
      if(box)inbox(k);pill();
      return;
    }
    const fresh=!frames[k]||!frames[k].el.isConnected;
    if(fresh)handoff(box?'/messages':URLS[k]);
    const f=frameOf(k,box?'/messages':null),go=()=>{
      if(n!==showing)return;
      f.el.classList.add('on');f.el.classList.remove('load');bar(false);
      for(const x in frames)if(x!==k)hideFrame(x);
      if(cur===base){if(!hidden)baseTitle=D.title;setHidden(true);D.documentElement.classList.add('cdn-covered')}
      cur=k;const t=tabs(k);if(t&&t.setHidden(false))win(k).location.reload();else if(box&&!fresh)inbox(k);
      try{D.title=win(k).document.title||D.title}catch(e){}
      pill();
    };
    if(f.ready)go();
    else{
      /* หน้าเดิมกำลังจะถูกบัง — พักการดึงข้อมูลตั้งแต่ตอนนี้ ให้เครื่องมีแรงโหลดแท็บใหม่ */
      if(cur===base){baseTitle=D.title;setHidden(true)}
      /* ครั้งแรก: หน้าเดิมยังอยู่บนจอจนแท็บใหม่วาดเสร็จ (กันจอว่าง) · ช้าเกิน 4 วิ ก็โชว์ไปเลย */
      f.el.classList.add('load');bar(true);clearTimeout(f.wait);f.wait=setTimeout(()=>{f.ready=true;go()},4000);f.go=go;
    }
  }
  function go(u){
    const k=tabOf(u);if(!k||calling())return false;
    const box=inboxUrl(u);
    if(k===cur){if(box)inbox(k);return true}
    /* แชตของหน้าหลัก: เพิ่มรายการ "หน้าหลัก" ก่อน แล้วกล่องข้อความเพิ่มรายการของมันเอง (nav.js)
       — ปิดกล่องข้อความ (ย้อนหนึ่งขั้น) จะกลับมาที่หน้าหลัก ไม่ใช่แท็บที่อยู่ก่อนหน้า */
    const self=box&&k===base;
    try{history.pushState(box&&!self?{cendonTab:k,inbox:1}:{cendonTab:k},'',box&&!self?'/messages':URLS[k])}catch(e){}
    reveal(k,{inbox:box});return true;
  }
  /* ย้อน/ไปข้างหน้า: รายการของแท็บ → สลับแท็บ (ไม่ให้ nav.js ของหน้าหลักแปลที่อยู่ของแท็บอื่น) */
  W.addEventListener('popstate',e=>{
    const st=e.state;
    /* รายการ "หน้าหลัก" ขณะอยู่หน้าหลักแล้ว (เช่น ปิดกล่องข้อความ) — ให้ nav.js จัดชั้นของหน้าตามปกติ */
    if(st&&st.cendonTab===base&&cur===base)return;
    if(st&&st.cendonTab){e.stopImmediatePropagation();if(st.cendonTab!==cur)reveal(st.cendonTab,{inbox:!!st.inbox});return}
    if(cur!==base)reveal(base);
  });
  if(W.navigation&&W.navigation.addEventListener){
    W.navigation.addEventListener('navigate',e=>{
      if(!e.cancelable||e.destination.sameDocument||e.navigationType!=='push'&&e.navigationType!=='replace'||e.formData||e.downloadRequest)return;
      if(tabOf(e.destination.url)&&!calling()){e.preventDefault();go(e.destination.url)}
    });
  }
  W.CendonTabs=Object.freeze({
    on:true,child:false,setHidden,go,
    top:u=>{location.assign(u)},
    call(k,on){calls[k]=!!on;if(on&&tabs(k))tabs(k).setHidden(false);pill()},
    ready(k){const f=frames[k];if(!f||f.ready)return;f.ready=true;clearTimeout(f.wait);if(f.go){const g=f.go;f.go=null;g()}},
    sync(k,href,title){if(k!==cur)return;try{history.replaceState(history.state&&history.state.cendonTab?history.state:{cendonTab:k},'',href)}catch(e){}if(title)D.title=title},
    current:()=>cur
  });
})(window,document);
