/* ══════════════════════════════════════════════════════════════════
   หน้าตั้งค่า — ไฟล์เดียวใช้ทุกหน้า (โปรไฟล์ การาจ นิตยสาร ร้านค้า แชต) · window.CendonSettings
   ───────────────────────────────────────────────────────────────────
   หน้าเดียวเลื่อนจบ ไม่มีแท็บ:
     ชื่อ/รูป → การ์ดสมัครช่าง (เด่นสุด) → ตั้งค่าแอป → แจ้งเตือน LINE → AI วันนี้ → ช่วยเหลือ → บัญชีของฉัน
     → ปุ่มออกจากระบบ (ถามยืนยันก่อน) → "ลบบัญชีถาวร" ตัวแดงล่างสุด (ต้องพิมพ์ยืนยัน)
   ปุ่มที่มีผลกับบัญชีแยกหน้าตา แยกที่ ไม่มีวันวางติดกัน: ดาวน์โหลด = แถวธรรมดา · ออกจากระบบ = ปุ่มใหญ่
   · ลบบัญชี = ตัวแดงห่างออกไป · รีเซ็ต/ปิดใช้งาน = หน้าย่อยของตัวเอง แต่ละอันถามยืนยันอีกชั้น
   หน้าที่ใช้: เรียก CendonSettings.open(...) — แชตส่ง {root, back, extra} มาเอง (วางในคอลัมน์ของแชต)
   ═══════════════════════════════════════════════════════════════════ */
(function(W,D){
'use strict';
if(W.CendonSettings)return;
const $=id=>D.getElementById(id);
const t=(th,en)=>W.spireT?W.spireT(th,en):((W.lang||'th')==='th'?th:en);
const esc=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const API=()=>String(W.BACKEND_URL||'https://spireonebackend.carspirethailand.workers.dev').replace(/\/+$/,'');
const auth=()=>{try{return W.auth||W.spireAuth||(W.firebase&&W.firebase.apps&&W.firebase.apps.length?W.firebase.auth():null)}catch(e){return null}};
const fbUser=()=>{try{const a=auth();return a&&a.currentUser||null}catch(e){return null}};
const me=()=>{try{const u=W.currentUser;if(u&&typeof u==='object')return u;return JSON.parse(localStorage.getItem('spire_cachedUser')||'null')||{}}catch(e){return {}}};
const setup=()=>{try{return (W.spireSetupRead&&W.spireSetupRead())||{}}catch(e){return {}}};
const curLang=()=>{try{return (W.spireLang&&W.spireLang())||W.lang||'th'}catch(e){return 'th'}};
const DARK=['dark','carbon','night','midnight','cyber','aurora','ocean','sunset','magma'];
const curTheme=()=>{let v='';try{v=(W.spireTheme&&W.spireTheme())||D.documentElement.getAttribute('data-theme')||''}catch(e){}return DARK.includes(v)?'dark':'light'};
const toast=(m,ic)=>{try{W.toast&&W.toast(m,ic||'ti-info-circle')}catch(e){}};
const MONEY=['THB','USD','EUR','GBP','JPY','CNY','SGD','AUD','CAD','CHF','NZD','HKD','MYR','IDR','KRW','VND','INR','TWD','AED'];
const money=()=>{try{return (W.spireMoney&&W.spireMoney())||MONEY}catch(e){return MONEY}};
const curName=c=>{try{return new Intl.DisplayNames([curLang()],{type:'currency'}).of(c)}catch(e){return c}};
const ADMIN=['owner','admin','moderator'];

let host={},main=null,manage=null,sheetEl=null,lastFocus=null;

/* ── ประกอบหน้าหลัก ── */
function partnerHTML(){
  const u=fbUser()||me();let s=u.uid?'checking':'none',phase='checking',paused=false;
  if(W.CendonPartnerState){const p=W.CendonPartnerState.peek(u.uid);s=p.s;phase=p.phase;paused=!!p.suspended}
  else try{const p=JSON.parse(localStorage.getItem('spire_partner')||'null');if(p&&u.uid&&p.uid===u.uid&&['none','pending','approved','rejected','declined','withdrawn','shop'].includes(p.s))s=p.s}catch(e){}
  if(s==='none'&&phase==='offline')s='checking';
  if(s==='withdrawn')s='none';
  const C={
    checking:['ti-refresh',t('บัญชีช่างของคุณ','Your mechanic account'),t(phase==='offline'?'ยังเชื่อมต่อไม่ได้ · ไม่ต้องสมัครซ้ำ':'กำลังตรวจสถานะจากระบบ…',phase==='offline'?'Could not connect · do not apply again':'Checking your account…'),t('ตรวจสถานะ','Check status')],
    none:['ti-tool',t('สมัครเป็นช่าง','Become a mechanic'),t('รับงานซ่อมจากลูกค้าใกล้คุณ','Get repair jobs from customers near you'),t('เริ่มสมัคร','Apply now')],
    pending:['ti-clock',t('ใบสมัครช่างของคุณ','Your mechanic application'),t('กำลังพิจารณา','Under review'),t('ดูสถานะ','See status')],
    approved:['ti-check',t('ใบสมัครช่างของคุณ','Your mechanic application'),t('อนุมัติแล้ว · ดูสถานะร้าน','Approved · check shop status'),t('ดูสถานะ','See status')],
    declined:['ti-file-description',t('ใบสมัครช่างของคุณ','Your mechanic application'),t('ดูผลการพิจารณา','See the review result'),t('ดูสถานะ','See status')],
    rejected:['ti-pencil',t('ใบสมัครช่างของคุณ','Your mechanic application'),t('ต้องแก้ไขบางอย่าง','Needs a few changes'),t('ดูว่าต้องแก้อะไร','See what to fix')],
    shop:['ti-building-store',t('Studio · ร้านของฉัน','Studio · My shop'),t('งาน ข้อความ บริการ และหน้าร้าน','Jobs, messages, services and your shop page'),t('เปิด Studio','Open Studio')]}[s];
  const href=fbUser()||u.uid?(s==='shop'?'/studio':'/join'):'/login?next=%2Fjoin';
  if(s==='shop'&&paused)C[2]=t('ร้านถูกพักใช้งาน · ดูสถานะใน Studio ไม่ต้องสมัครใหม่','Shop suspended · check Studio, do not apply again');
  return `<a class="st-partner st-p-${s}" href="${href}" data-partner>
    <span class="st-p-fx" aria-hidden="true"><i class="st-p-glow"></i><i class="st-p-dots"></i><i class="st-p-ring"></i><i class="st-p-spot"></i><i class="st-p-sheen"></i></span>
    <span class="st-p-top"><span class="st-p-ic"><i class="ti ${C[0]}" aria-hidden="true"></i></span>
      <span class="st-p-tx"><b>${C[1]}</b><small>${C[2]}</small></span></span>
    <span class="st-p-go">${C[3]}<i class="ti ti-arrow-right" aria-hidden="true"></i></span></a>`;
}
const chev='<i class="ti ti-chevron-right st-ch" aria-hidden="true"></i>',out='<i class="ti ti-arrow-up-right st-ch" aria-hidden="true"></i>';
function row(o){
  const tag=o.href?'a':'button',attr=o.href?`href="${o.href}" data-nav-full`:`type="button" data-st="${o.act}"`;
  return `<${tag} class="st-row${o.sub?' tall':''}" ${attr}><i class="ti ${o.ic}" aria-hidden="true"></i>
    <span class="st-t"><b>${o.title}</b>${o.sub?`<small>${o.sub}</small>`:''}</span>${o.val?`<span class="st-v">${o.val}</span>`:''}${o.href?out:chev}</${tag}>`;
}
/* การแจ้งเตือน (ย้ายมาจากแผงกระดิ่ง): ในเครื่องนี้ · เตือนเลขไมล์ 18:00 — กระดิ่งแค่แนะนำตอนยังไม่เปิด เปิดแล้วจัดการที่นี่ */
function swRow(o){
  return `<div class="st-row tall nohover"><i class="ti ${o.ic}" aria-hidden="true"></i><span class="st-t"><b>${o.title}</b><small>${o.sub}</small></span>
    <button type="button" class="st-sw" role="switch" aria-checked="${!!o.on}" data-st="${o.act}" aria-label="${o.title}"${o.off?' disabled':''}><i></i></button></div>`;
}
function notifHTML(){
  const B=W.CendonBell;if(!B)return `<span class="st-note" style="display:block;padding:16px">${t('เปิดหน้าใหม่อีกครั้งเพื่อตั้งค่าการแจ้งเตือน','Reload the page to manage notifications')}</span>`;
  const pm=B.perm(),on=B.pushOn(),rows=[];
  if(pm!=='unsupported')rows.push(swRow({ic:on?'ti-bell-ringing':'ti-bell-off',act:'notif-dev',on,off:pm==='denied',title:t('แจ้งเตือนในเครื่องนี้','Notifications on this device'),
    sub:pm==='denied'?t('ถูกปิดไว้ในเบราว์เซอร์ — เปิดได้ที่การตั้งค่าเว็บไซต์ของเบราว์เซอร์','Blocked in the browser — allow it in the browser’s site settings')
      :on?t('เด้งบนเครื่องเมื่อช่างเสนอราคา รับงาน ส่งข้อความ หรือ AI ตอบตอนคุณไม่ได้ดูแชต','Pops up when a mechanic quotes, takes the job, messages you, or the AI replies while you’re away')
      :t('ปิดอยู่ — ยังดูทุกเรื่องได้ที่กระดิ่ง','Off — everything is still listed under the bell')}));
  if(B.hasCar&&B.hasCar()){const k=B.km.get()||{};rows.push(swRow({ic:'ti-gauge',act:'notif-km',on:!!k.on,title:t('เตือนจดเลขไมล์ 18:00','Mileage reminder at 6 pm'),
    sub:k.on?(k.line?t('ถามทาง LINE และเด้งในเครื่องที่เปิดไว้ทุกเย็น · คันที่จดแล้ววันนั้นไม่ถาม','Asked on LINE and on enabled devices each evening · cars already logged are skipped'):t('เด้งบนเครื่องทุกเย็น แตะแล้วใส่เลขได้เลย','A notification every evening — tap it to enter the reading'))
      :t('ช่วยให้เตือนเปลี่ยนน้ำมันเครื่องและอะไหล่ได้แม่นขึ้น','Keeps oil-change and parts reminders accurate')}))}
  return rows.join('')||`<span class="st-note" style="display:block;padding:16px">${t('เครื่องนี้ไม่รองรับการแจ้งเตือน — ดูทุกเรื่องได้ที่กระดิ่ง','This device doesn’t support notifications — everything is listed under the bell')}</span>`;
}
function paintNotif(){const c=$('stNotif');if(c)c.innerHTML=notifHTML()}
function seg(label,attr,items,cur){
  return `<div class="st-seg" role="group" aria-label="${label}">${items.map(([v,n])=>`<button type="button" ${attr}="${v}" aria-pressed="${v===cur}">${n}</button>`).join('')}</div>`;
}
function mainHTML(){
  const u=me(),su=setup(),name=su.name||u.name||u.displayName||'',email=u.email||'';
  const photo=typeof u.photo==='string'&&/^https:\/\//.test(u.photo)?u.photo:'';
  const av=photo?`<img src="${esc(photo)}" alt="" referrerpolicy="no-referrer">`:esc(String(name||email||'?').trim().charAt(0).toUpperCase());
  const loc=((W.spireLocales&&W.spireLocales())||[]).find(x=>x.c===curLang());
  const dist=su.distance==='mi'?'mi':'km',cur=MONEY.includes(su.currency)?su.currency:'THB';
  const ex=host.extra&&host.extra.html?`<div class="st-lbl">${host.extra.title}</div><div class="st-card st-x">${host.extra.html()}</div>`:'';
  const staff=ADMIN.includes(u.role)?row({ic:'ti-shield-check',title:t('แผงควบคุมแอดมิน','Admin panel'),href:'/admin'}):'';
  const lineH=(()=>{try{return localStorage.getItem('cendon_line_card')==='0'?' hidden':''}catch(e){return ''}})();
  return `<div class="st-head"><button type="button" class="st-back" data-st="back" aria-label="${t('กลับ','Back')}"><i class="ti ti-arrow-left" aria-hidden="true"></i></button>
      <h1>${t('ตั้งค่า','Settings')}</h1></div>
    <div class="st-me"><span class="st-av">${av}</span>
      <span class="st-me-tx"><b>${esc(name||t('บัญชีของคุณ','Your account'))}</b><small>${esc(email)}</small></span>
      <button type="button" class="st-pill" data-st="name">${t('แก้ไข','Edit')}</button></div>
    ${partnerHTML()}
    <div class="st-lbl">${t('การตั้งค่าแอป','App settings')}</div>
    <div class="st-card">
      ${row({ic:'ti-world',title:t('ภาษา','Language'),act:'lang',val:esc(loc?loc.name:curLang().toUpperCase())})}
      <div class="st-row nohover"><i class="ti ti-moon" aria-hidden="true"></i><span class="st-t"><b>${t('ธีม','Theme')}</b></span>
        ${seg(t('ธีม','Theme'),'data-sitetheme',[['light',t('สว่าง','Light')],['dark',t('มืด','Dark')]],curTheme())}</div>
      <div class="st-row nohover"><i class="ti ti-route" aria-hidden="true"></i><span class="st-t"><b>${t('ระยะทาง','Distance')}</b></span>
        ${seg(t('ระยะทาง','Distance'),'data-dist',[['km',t('กม.','km')],['mi',t('ไมล์','mi')]],dist)}</div>
      ${row({ic:'ti-cash',title:t('สกุลเงิน','Currency'),act:'currency',val:esc(cur+' · '+curName(cur))})}
    </div>
    ${ex}
    <div class="st-lbl" id="stNotifLbl">${t('การแจ้งเตือน','Notifications')}</div>
    <div class="st-card" id="stNotif">${notifHTML()}</div>
    <section data-line-card${lineH}><div class="st-card st-line" data-line-connect="row" style="margin-top:10px"></div></section>
    <div class="st-lbl">${t('AI วันนี้','AI today')}</div>
    <div class="st-card st-ai" id="stAi" aria-live="polite"><span class="st-note">${t('กำลังดู…','Checking…')}</span></div>
    <div class="st-lbl">${t('ช่วยเหลือ','Help')}</div>
    <div class="st-card">
      ${row({ic:'ti-message-dots',title:t('ส่งความเห็น','Send feedback'),act:'fb'})}
      ${row({ic:'ti-lifebuoy',title:t('ศูนย์ช่วยเหลือ','Help centre'),href:'/help'})}
      ${row({ic:'ti-file-text',title:t('ข้อกำหนดการใช้งาน','Terms of use'),href:'/terms'})}
      ${row({ic:'ti-shield-lock',title:t('นโยบายความเป็นส่วนตัว','Privacy policy'),href:'/privacy'})}
    </div>
    <div class="st-lbl">${t('บัญชีของฉัน','My account')}</div>
    <div class="st-card">
      ${staff}
      ${row({ic:'ti-download',title:t('ดาวน์โหลดข้อมูลของฉัน','Download my data'),sub:t('สำเนาทุกอย่างในบัญชี เป็นไฟล์เดียว','A copy of everything in your account, as one file'),act:'export'})}
      ${row({ic:'ti-user-cog',title:t('รีเซ็ตหรือปิดใช้งานบัญชี','Reset or deactivate account'),sub:t('มีผลกับข้อมูลจริง ดูรายละเอียดก่อน','Affects real data — review first'),act:'manage'})}
    </div>
    <p class="st-msg" id="stMsg" role="status"></p>
    <button type="button" class="st-out" data-st="signout"><i class="ti ti-logout" aria-hidden="true"></i>${t('ออกจากระบบ','Sign out')}</button>
    <span class="st-cap">${t('ข้อมูลในบัญชียังอยู่ครบ เข้าสู่ระบบใหม่เมื่อไรก็กลับมา','Your account keeps everything — sign back in anytime')}</span>
    <button type="button" class="st-del" data-st="delete"><i class="ti ti-trash" aria-hidden="true"></i>${t('ลบบัญชีถาวร','Delete account permanently')}</button>
    <a class="st-foot" href="/about" data-nav-full>${t('เกี่ยวกับ Cendon','About Cendon')}</a>`;
}
function manageHTML(){
  return `<div class="st-head"><button type="button" class="st-back" data-st="manage-back" aria-label="${t('กลับ','Back')}"><i class="ti ti-arrow-left" aria-hidden="true"></i></button>
      <h1>${t('รีเซ็ตหรือปิดใช้งานบัญชี','Reset or deactivate')}</h1></div>
    <div class="st-tip"><i class="ti ti-download" aria-hidden="true"></i><span>${t('แนะนำให้ดาวน์โหลดข้อมูลเก็บไว้ก่อน','We suggest downloading your data first')}</span>
      <button type="button" class="st-pill" data-st="export">${t('ดาวน์โหลด','Download')}</button></div>
    <div class="st-act"><div class="st-act-h"><span class="st-ic"><i class="ti ti-refresh" aria-hidden="true"></i></span><b>${t('รีเซ็ตบัญชี','Reset account')}</b></div>
      <p><b>${t('ล้าง','Clears')}</b>${t('รถ แชต AI และการตั้งค่า','cars, AI chats and settings')}<br><b>${t('เก็บไว้','Keeps')}</b>${t('บัญชี ร้านช่าง และใบงาน','your account, shop and jobs')}</p>
      <button type="button" class="st-btn" data-st="reset">${t('รีเซ็ตบัญชี…','Reset account…')}</button></div>
    <div class="st-act"><div class="st-act-h"><span class="st-ic"><i class="ti ti-lock" aria-hidden="true"></i></span><b>${t('ปิดใช้งานบัญชี','Deactivate account')}</b></div>
      <p>${t('ล็อกบัญชีไว้ ข้อมูลยังอยู่ครบ','Locks the account — your data stays')}<br>${t('เข้าใช้ไม่ได้จนกว่าจะติดต่อทีมงานให้เปิดคืน','You can’t sign in until you ask us to restore it')}</p>
      <button type="button" class="st-btn" data-st="deactivate">${t('ปิดใช้งานบัญชี…','Deactivate account…')}</button></div>
    <p class="st-msg" id="stMsg2" role="status"></p>
    <div class="st-manage-end"><small>${t('ต้องการลบทุกอย่างถาวร','Want to erase everything?')}</small>
      <button type="button" class="st-del" data-st="delete"><i class="ti ti-trash" aria-hidden="true"></i>${t('ลบบัญชีถาวร','Delete account permanently')}</button></div>`;
}

/* การ์ดสมัครช่างเอียงตามเมาส์เล็กน้อย (ชั้นในลอยคนละระดับ) — เฉพาะเครื่องที่มีเมาส์ และไม่ได้ตั้งลดการเคลื่อนไหว */
function tilt(v){
  let ok=false;try{ok=matchMedia('(hover:hover) and (pointer:fine)').matches&&!matchMedia('(prefers-reduced-motion: reduce)').matches}catch(e){}
  if(!ok)return;
  v.addEventListener('pointermove',e=>{const c=e.target.closest&&e.target.closest('.st-partner');if(!c)return;
    const r=c.getBoundingClientRect(),x=Math.min(1,Math.max(0,(e.clientX-r.left)/r.width)),y=Math.min(1,Math.max(0,(e.clientY-r.top)/r.height));
    c.style.setProperty('--rx',((.5-y)*9).toFixed(2)+'deg');c.style.setProperty('--ry',((x-.5)*11).toFixed(2)+'deg');
    c.style.setProperty('--mx',(x*100).toFixed(1)+'%');c.style.setProperty('--my',(y*100).toFixed(1)+'%');c.classList.add('tilt')});
  v.addEventListener('pointerout',e=>{const c=e.target.closest&&e.target.closest('.st-partner');if(!c||c.contains(e.relatedTarget))return;
    c.classList.remove('tilt');c.style.removeProperty('--rx');c.style.removeProperty('--ry')});
}
/* ── ที่วางหน้าตั้งค่า ── */
function ensure(){
  let v=host.root||$('v-settings');
  if(!v){v=D.createElement('section');v.className='setpane st-float';v.id='v-settings';D.body.appendChild(v)}
  if(!host.root)v.classList.add('st-float');
  if(!main||!v.contains(main)){
    const keep=v.querySelector(':scope>.cb-bell');
    v.textContent='';
    main=D.createElement('div');main.className='st-pg st-main';main.id='stMain';
    manage=D.createElement('div');manage.className='st-pg st-sub';manage.id='stManage';
    v.append(main,manage);if(keep)v.appendChild(keep);
    v.addEventListener('click',onClick);tilt(v);
  }
  /* กระดิ่งมือถือ: วางไว้ตั้งแต่เปิด (bell.js รับช่วง) — หน้าแชตมีกระดิ่งของตัวเองแล้ว */
  if(!host.root&&!v.querySelector(':scope>.cb-bell')){const b=D.createElement('button');b.type='button';b.className='cb-bell cb-m cb-sh cb-pre';b.setAttribute('aria-label',t('การแจ้งเตือน','Notifications'));
    b.innerHTML='<i class="ti ti-bell"></i><em hidden></em>';try{if(localStorage.getItem('cendon_signed')!=='1')b.hidden=true}catch(e){}v.appendChild(b)}
  navWire();
  return v;
}
/* ชื่อ รูป บทบาท สถานะช่าง ค่าที่ตั้งไว้ — ข้อมูลบัญชีมาถึงทีหลังตอนเพิ่งเปิดหน้า: เปลี่ยนเมื่อไรวาดหน้าหลักใหม่ (เฉพาะตอนเปิดอยู่) */
let lastSig='',watchT=0;
function sig(){const u=me(),su=setup();let pt='';try{pt=localStorage.getItem('spire_partner')||''}catch(e){}
  const p=W.CendonPartnerState?.peek(fbUser()?.uid||u.uid);
  return [u.uid,u.name,u.email,u.photo,u.role,su.name,su.distance,su.currency,curLang(),curTheme(),pt,p?.s,p?.phase].join('|')}
function shown(){const v=$('v-settings');return !!(v&&main&&v.contains(main)&&(host.root?v.offsetParent!==null:v.classList.contains('on')))}
function refresh(){if(!shown()){clearInterval(watchT);watchT=0;return}if(sig()!==lastSig)render()}
function render(){
  const v=ensure();lastSig=sig();
  main.innerHTML=mainHTML();
  if(v.classList.contains('st-m'))manage.innerHTML=manageHTML();
  try{host.extra&&host.extra.wire&&host.extra.wire(main)}catch(e){}
  try{W.CendonLine&&W.CendonLine.scan&&W.CendonLine.scan(main)}catch(e){}
  paintAi();
  /* สถานะเตือนเลขไมล์จริงจากหลังบ้าน (อีกเครื่อง/LINE อาจเปิดปิดไว้) */
  try{if(W.CendonBell&&W.CendonBell.hasCar()&&fbUser())W.CendonBell.km.fetch().then(paintNotif).catch(()=>{})}catch(e){}
}
/* เปิดหน้าตั้งค่า · which: manage = หน้าย่อยรีเซ็ต/ปิดใช้งาน · fb = เปิดแผ่นส่งความเห็น · usage = เลื่อนไปที่ AI วันนี้ */
function open(which,opts){
  if(opts)host=Object.assign({},opts);
  const v=ensure();
  render();
  if(!host.root)v.classList.add('on');
  try{v.scrollTop=0}catch(e){}
  go(which);
  quota(true);
  W.CendonPartnerState?.refresh().catch(()=>{});
  clearInterval(watchT);watchT=setInterval(refresh,1500);
}
function go(which){
  if(which==='manage')openManage();
  else if(which==='fb')setTimeout(()=>sheet('fb'),60);
  else if(which==='usage'){const a=$('stAi');if(a)setTimeout(()=>a.scrollIntoView({block:'center'}),60)}
  else if(which==='notif'){const a=$('stNotifLbl');if(a)setTimeout(()=>a.scrollIntoView({block:'start',behavior:'smooth'}),80)}
}
function close(){
  if(typeof host.back==='function'){host.back();return}
  /* /profile = หน้าตั้งค่าคือทั้งหน้า กดกลับ = ออกจากหน้านี้ */
  if(W.__SPIRE_PAGE__==='profile'){
    let fromApp=false;try{fromApp=!!D.referrer&&new URL(D.referrer).origin===location.origin}catch(e){}
    if(fromApp&&history.length>1){try{W.CendonPaint&&W.CendonPaint.prepare(D.referrer)}catch(e){}history.back()}else location.href='/';
    return;
  }
  const v=$('v-settings');if(v)v.classList.remove('on');
}
function openManage(){
  const v=ensure();manage.innerHTML=manageHTML();
  v.classList.add('st-m');manage.classList.add('on');
  try{v.scrollTop=0}catch(e){}
  const b=manage.querySelector('.st-back');if(b)b.focus({preventScroll:true});
}
function closeManage(){
  const v=$('v-settings');if(!v||!manage)return;
  manage.classList.remove('on');v.classList.remove('st-m');
  const b=main&&main.querySelector('[data-st="manage"]');if(b)b.focus({preventScroll:true});
}
/* ปุ่มกลับ/ยกเลิก = ถอยหนึ่งขั้นในประวัติ ถ้าชั้นนั้นอยู่ในประวัติ (ปุ่มย้อนของเครื่องก็ปิดได้เหมือนกัน) */
function dismiss(tag,fn){const top=W.Nav&&W.Nav.top&&W.Nav.top();if(top&&top.tag===tag){W.Nav.back(top);return}fn()}
function navWire(){
  if(navWire.done||!W.Nav||!W.Nav.watch)return;navWire.done=1;
  W.Nav.watch({sel:'#stManage',cls:'on',tag:'stmanage',
    url:()=>{if(/^\/chat(\/|$)/.test(location.pathname))return undefined;const top=W.Nav.top&&W.Nav.top();
      const base=String(top&&top.url||location.pathname).replace(/^https?:\/\/[^/]+/,'').split('?')[0].replace(/\/$/,'');return base+'/manage'},
    close:closeManage});
  W.Nav.watch({sel:'#stSheet',cls:'on',tag:'stsheet',close:closeSheet});
}

/* ── AI วันนี้: ตัวเลขจริงจากเซิร์ฟเวอร์ (โควตาผูกกับบัญชี ไม่ใช่ตัวนับในเครื่อง) ── */
let Q=null,qAt=0,qJob=null;
function quota(force){
  if(qJob)return qJob;
  if(!force&&Q&&Date.now()-qAt<30000){paintAi();return Promise.resolve(Q)}
  qJob=(async()=>{try{
      /* เพิ่งเปิดหน้า ระบบล็อกอินอาจยังกู้สถานะไม่เสร็จ — รอได้สักครู่ */
      const u=fbUser()||(W.spireAwaitUser?await W.spireAwaitUser(8000):null);if(!u)throw new Error('signed_out');
      const r=await fetch(API()+'/api/quota',{headers:{Authorization:'Bearer '+await u.getIdToken()},cache:'no-store'});
      if(r.ok){const d=await r.json();Q=d&&d.quota||null;qAt=Date.now()}}catch(e){}
    qJob=null;paintAi();return Q})();
  return qJob;
}
function paintAi(){
  const el=$('stAi');if(!el)return;
  if(!Q){if(!qJob)el.innerHTML=`<span class="st-note">${t('ดูโควตาไม่ได้ตอนนี้ ลองใหม่ภายหลัง','Usage isn’t available right now')}</span>`;return}
  if(Q.unlimited){el.innerHTML=`<div class="st-ai-top"><b>${t('ใช้ได้ไม่จำกัด','Unlimited')}</b><span>${t('บัญชีทีมงาน','Staff account')}</span></div>`;return}
  const pct=Q.limit?Math.min(100,Math.round(Q.used/Q.limit*100)):0;
  const mins=Q.resetAt?Math.max(0,Math.round((Q.resetAt-Date.now())/60000)):0,hh=Math.floor(mins/60),mm=mins%60;
  const when=hh?t(`${hh} ชม. ${mm} นาที`,`${hh}h ${mm}m`):t(`${mm} นาที`,`${mm}m`);
  const win=Number(Q.windowHours)||5;
  el.innerHTML=`<div class="st-ai-top"><b>${t('ใช้ไปแล้ว','Used')}</b><span><b>${pct}%</b> ${t('ของโควตา','of your quota')}</span></div>
    <div class="st-bar"><i style="width:${pct}%"></i></div>
    <span class="st-note">${pct&&mins?t(`เติมใหม่อัตโนมัติในอีก ${when}`,`Refills automatically in ${when}`):t(`เติมใหม่อัตโนมัติทุก ${win} ชั่วโมง`,`Refills automatically every ${win} hours`)}</span>`;
}

/* ── แผ่นยืนยัน / แผ่นเลือก ── */
function sheetRoot(){
  if(sheetEl&&sheetEl.isConnected)return sheetEl;
  sheetEl=D.createElement('div');sheetEl.id='stSheet';
  sheetEl.innerHTML='<div class="st-scrim" data-st="sheet-x"></div><div class="st-sh" role="dialog" aria-modal="true" aria-labelledby="stShT"></div>';
  D.body.appendChild(sheetEl);
  sheetEl.addEventListener('click',onClick);
  sheetEl.addEventListener('input',onInput);
  /* Esc ปิดแผ่นได้เสมอ (แม้โฟกัสหลุดออกจากแผ่น เช่น ช่องพิมพ์ถูกปิดชั่วคราวระหว่างส่ง) */
  D.addEventListener('keydown',e=>{if(e.key==='Escape'&&sheetEl&&sheetEl.classList.contains('in')){e.preventDefault();dismiss('stsheet',closeSheet)}});
  sheetEl.addEventListener('keydown',e=>{
    if(e.key!=='Tab')return;
    const f=[...sheetEl.querySelectorAll('button:not([disabled]),input,textarea,a[href]')];if(!f.length)return;
    if(e.shiftKey&&D.activeElement===f[0]){e.preventDefault();f[f.length-1].focus()}else if(!e.shiftKey&&D.activeElement===f[f.length-1]){e.preventDefault();f[0].focus()}
  });
  return sheetEl;
}
const grab='<span class="st-grab" aria-hidden="true"></span>';
const cancelBtn=()=>`<button type="button" class="st-b2" data-st="sheet-x">${t('ยกเลิก','Cancel')}</button>`;
function confirmWord(){return curLang()==='th'?'ลบบัญชี':'DELETE'}
function sheetHTML(kind){
  const u=me(),su=setup();
  if(kind==='signout')return `${grab}<div class="st-sh-c"><span class="st-sh-ic"><i class="ti ti-logout" aria-hidden="true"></i></span>
      <h2 id="stShT">${t('ออกจากระบบ?','Sign out?')}</h2>${u.email?`<span class="st-sh-who">${esc(u.email)}</span>`:''}
      <p>${t('ข้อมูลในเครื่องนี้จะถูกล้างเพื่อความเป็นส่วนตัว รถ แชต และการตั้งค่าในบัญชียังอยู่ครบ เข้าสู่ระบบอีกครั้งเมื่อไรก็กลับมา','This device’s copy is cleared for privacy. Your cars, chats and settings stay in your account — sign back in anytime.')}</p>
      <div class="st-sh-btns"><button type="button" class="st-b1" data-st="do-signout">${t('ออกจากระบบ','Sign out')}</button>${cancelBtn()}</div><p class="st-msg" id="stShMsg" role="status"></p></div>`;
  if(kind==='reset')return `${grab}<div class="st-sh-c"><span class="st-sh-ic"><i class="ti ti-refresh" aria-hidden="true"></i></span>
      <h2 id="stShT">${t('รีเซ็ตบัญชี?','Reset account?')}</h2>
      <p>${t('ล้างรถ แชต AI และการตั้งค่าบนเซิร์ฟเวอร์ แล้วเริ่มตั้งค่าใหม่ · บัญชี ร้านช่าง และใบงานยังอยู่ · ย้อนกลับไม่ได้','Clears your cars, AI chats and settings on the server, then starts setup again. Your account, shop and jobs stay. This can’t be undone.')}</p>
      <div class="st-sh-btns"><button type="button" class="st-b1" data-st="do-reset">${t('รีเซ็ตบัญชี','Reset account')}</button>${cancelBtn()}</div><p class="st-msg" id="stShMsg" role="status"></p></div>`;
  if(kind==='deactivate')return `${grab}<div class="st-sh-c"><span class="st-sh-ic"><i class="ti ti-lock" aria-hidden="true"></i></span>
      <h2 id="stShT">${t('ปิดใช้งานบัญชี?','Deactivate account?')}</h2>
      <p>${t('ล็อกบัญชีไว้ ข้อมูลยังอยู่ครบ แต่จะเข้าใช้ไม่ได้จนกว่าจะติดต่อทีมงานให้เปิดคืน','The account is locked and your data stays, but you can’t sign in until you ask us to restore it.')}</p>
      <div class="st-sh-btns"><button type="button" class="st-b1" data-st="do-deactivate">${t('ปิดใช้งานบัญชี','Deactivate account')}</button>${cancelBtn()}</div><p class="st-msg" id="stShMsg" role="status"></p></div>`;
  if(kind==='delete'){const w=confirmWord();return `${grab}
      <div class="st-sh-h"><span class="st-dic"><i class="ti ti-trash" aria-hidden="true"></i></span><span><h2 id="stShT">${t('ลบบัญชีถาวร','Delete account permanently')}</h2><small>${t('ลบแล้วกู้คืนไม่ได้','This can’t be undone')}</small></span></div>
      <div class="st-loss"><b>${t('สิ่งที่จะหายไปทั้งหมด','Everything below will be gone')}</b><span>${t('รถ สมุดรถ และประวัติซ่อม','Cars, car log and repair history')}</span><span>${t('แชต AI รูป และไฟล์ที่แนบ','AI chats, photos and attached files')}</span><span>${t('การเชื่อม LINE และร้านช่าง (ถ้ามี)','Your LINE link and mechanic shop (if any)')}</span><span>${t('บัญชีที่ใช้เข้าสู่ระบบ','The sign-in account itself')}</span></div>
      <button type="button" class="st-dl" data-st="export"><i class="ti ti-download" aria-hidden="true"></i>${t('ดาวน์โหลดข้อมูลเก็บไว้ก่อน','Download my data first')}</button>
      <label class="st-lab" for="stDelIn">${t('พิมพ์','Type')} <b>${w}</b> ${t('เพื่อยืนยัน','to confirm')}</label>
      <input id="stDelIn" class="st-in" type="text" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="${w}">
      <div class="st-sh-btns" style="margin-top:16px"><button type="button" class="st-bd" data-st="do-delete" disabled>${t('ลบบัญชีถาวร','Delete account permanently')}</button>${cancelBtn()}</div>
      <p class="st-msg" id="stShMsg" role="status"></p>`}
  if(kind==='lang'){const cur=curLang();return `${grab}<h2 class="st-sh-t" id="stShT">${t('ภาษา','Language')}</h2>
      <div class="st-list">${((W.spireLocales&&W.spireLocales())||[]).map(x=>`<button type="button" data-lang="${esc(x.c)}" aria-pressed="${x.c===cur}"><span aria-hidden="true">${x.flag||''}</span><span class="st-t">${esc(x.name)}</span><i class="ti ti-check" aria-hidden="true"></i></button>`).join('')}</div>
      <p class="st-note" style="margin:12px 4px 0">${t('ภาษาที่ยังแปลไม่ครบจะแสดงเป็นภาษาอังกฤษแทน','Anything not yet translated shows in English')}</p>
      <div class="st-sh-btns" style="margin-top:16px">${cancelBtn()}</div>`}
  if(kind==='currency'){const cur=MONEY.includes(su.currency)?su.currency:'THB';return `${grab}<h2 class="st-sh-t" id="stShT">${t('สกุลเงิน','Currency')}</h2>
      <div class="st-list">${money().map(c=>`<button type="button" data-cur="${c}" aria-pressed="${c===cur}"><span class="st-t">${c} <small>${esc(curName(c))}</small></span><i class="ti ti-check" aria-hidden="true"></i></button>`).join('')}</div>
      <p class="st-note" style="margin:12px 4px 0">${t('ใช้แสดงค่าใช้จ่าย ไม่ใช่การเรียกเก็บเงิน','Used to show costs — nothing is charged')}</p>
      <div class="st-sh-btns" style="margin-top:16px">${cancelBtn()}</div>`}
  if(kind==='name')return `${grab}<h2 class="st-sh-t" id="stShT">${t('ชื่อที่อยากให้เรียก','What should we call you?')}</h2>
      <input id="stNameIn" class="st-in" type="text" maxlength="60" autocomplete="nickname" value="${esc(su.name||u.name||'')}" aria-labelledby="stShT">
      <p class="st-note" style="margin:10px 4px 0">${t('ใช้ชื่อเล่นก็ได้ แสดงในแอปและตอนคุยกับช่าง','A nickname is fine — shown in the app and to mechanics you talk to')}</p>
      <div class="st-sh-btns"><button type="button" class="st-b1" data-st="do-name">${t('บันทึก','Save')}</button>${cancelBtn()}</div><p class="st-msg" id="stShMsg" role="status"></p>`;
  if(kind==='fb')return `${grab}<h2 class="st-sh-t" id="stShT">${t('บอกเราหน่อย','Tell us')}</h2>
      <p class="st-note" style="margin:0 0 4px">${t('อะไรที่ใช้แล้วติดขัด อะไรที่อยากให้มี พิมพ์มาได้เลย เราอ่านทุกอัน','What got in your way, what you wish existed — we read all of it')}</p>
      <div class="st-chips" role="group" aria-label="${t('เรื่องที่อยากบอก','Topic')}">${[['bug','ti-bug',t('เจอบั๊ก','Something’s broken')],['idea','ti-bulb',t('อยากให้มี','I want a feature')],['ux','ti-mood-confuzed',t('ใช้แล้วงง','This confused me')],['good','ti-heart',t('ชอบมาก','I like this')]]
        .map(([k,ic,n])=>`<button type="button" data-fbk="${k}" aria-pressed="${k==='idea'}"><i class="ti ${ic}" aria-hidden="true"></i>${n}</button>`).join('')}</div>
      <textarea id="stFbTxt" class="st-ta" maxlength="2000" placeholder="${t('เล่าให้ฟังหน่อย…','Tell us more…')}" aria-label="${t('ความเห็น','Feedback')}"></textarea>
      <div class="st-sh-btns" style="margin-top:14px"><button type="button" class="st-b1" data-st="do-fb">${t('ส่งความเห็น','Send feedback')}</button>${cancelBtn()}</div><p class="st-msg" id="stShMsg" role="status"></p>`;
  return '';
}
let sheetKind='';
function sheet(kind){
  const r=sheetRoot(),box=r.querySelector('.st-sh');
  sheetKind=kind;lastFocus=D.activeElement;
  box.innerHTML=sheetHTML(kind);
  if(!r.classList.contains('on')){r.classList.add('on');requestAnimationFrame(()=>requestAnimationFrame(()=>r.classList.add('in')))}
  const f=box.querySelector('input,textarea')||box.querySelector('[aria-pressed="true"]')||box.querySelector('button');
  setTimeout(()=>{try{f&&f.focus({preventScroll:kind==='lang'||kind==='currency'})}catch(e){}},80);
}
function closeSheet(){
  const r=sheetEl;if(!r||!r.classList.contains('on'))return;
  r.classList.remove('in');sheetKind='';
  setTimeout(()=>{if(!r.classList.contains('in')){r.classList.remove('on');const b=r.querySelector('.st-sh');if(b)b.innerHTML=''}},260);
  try{lastFocus&&lastFocus.isConnected&&lastFocus.focus({preventScroll:true})}catch(e){}
}
/* ปิดแผ่นแล้วค่อยทำต่อ (เช่นเปิดอีกแผ่น) — รอให้ประวัติถอยเสร็จก่อน */
function closeThen(fn){dismiss('stsheet',closeSheet);setTimeout(fn,300)}
const say=(id,m)=>{const el=$(id);if(el)el.textContent=m||''};
function busy(b,label){if(!b)return ()=>{};const old=b.innerHTML;b.disabled=true;if(label)b.textContent=label;return ()=>{if(b.isConnected){b.disabled=false;b.innerHTML=old}}}

/* ── การกด ── */
/* บัญชี: ดาวน์โหลด รีเซ็ต ปิดใช้งาน ลบ (account-actions.js) */
const acts=()=>{const a=W.CendonAccountActions;if(!a)throw new Error('not_ready');return a};
async function onClick(e){
  const b=e.target.closest&&e.target.closest('[data-st],[data-sitetheme],[data-dist],[data-lang],[data-cur],[data-fbk]');if(!b)return;
  if(b.hasAttribute('data-sitetheme')){
    const v=b.dataset.sitetheme;try{W.spireSetTheme&&W.spireSetTheme(v)}catch(x){}
    b.parentNode.querySelectorAll('button').forEach(x=>x.setAttribute('aria-pressed',String(x===b)));return}
  if(b.hasAttribute('data-dist')){
    const v=b.dataset.dist,group=b.parentNode,was=group.querySelector('[aria-pressed="true"]');
    if(was===b)return;group.querySelectorAll('button').forEach(x=>x.setAttribute('aria-pressed',String(x===b)));
    try{if(!W.spireSavePrefs)throw new Error('not_ready');await W.spireSavePrefs({distance:v})}
    catch(x){group.querySelectorAll('button').forEach(y=>y.setAttribute('aria-pressed',String(y===was)));toast(t('บันทึกไม่สำเร็จ กรุณาลองใหม่','Could not save. Please retry'),'ti-alert-triangle')}
    return}
  if(b.hasAttribute('data-lang')){
    const v=b.dataset.lang;b.disabled=true;
    try{if(!W.spireSavePrefs)throw Error('not_ready');await W.spireSavePrefs({lang:v});W.spireSetLang&&W.spireSetLang(v);
      closeThen(()=>{render();if(!W.CendonCallShell?.active())W.location.reload();else toast(t('เปลี่ยนภาษาแล้ว บางหน้าจะเปลี่ยนครบเมื่อวางสาย','Language saved. Some screens update fully after the call.'))})}
    catch(x){b.disabled=false;toast(t('บันทึกไม่สำเร็จ กรุณาลองใหม่','Could not save. Please retry'),'ti-alert-triangle')}return}
  if(b.hasAttribute('data-cur')){
    const v=b.dataset.cur;sheetEl.querySelectorAll('[data-cur]').forEach(x=>x.setAttribute('aria-pressed',String(x===b)));
    try{if(!W.spireSavePrefs)throw new Error('not_ready');await W.spireSavePrefs({currency:v});closeThen(render)}
    catch(x){toast(t('บันทึกไม่สำเร็จ กรุณาลองใหม่','Could not save. Please retry'),'ti-alert-triangle')}
    return}
  if(b.hasAttribute('data-fbk')){b.parentNode.querySelectorAll('[data-fbk]').forEach(x=>x.setAttribute('aria-pressed',String(x===b)));return}
  const a=b.dataset.st;
  if(a==='notif-dev'||a==='notif-km'){
    const B=W.CendonBell,want=b.getAttribute('aria-checked')!=='true';if(!B)return;b.disabled=true;
    if(a==='notif-dev'){if(want){const st=await B.enable();toast(st==='granted'?t('เปิดแจ้งเตือนในเครื่องแล้ว','Device notifications are on'):t('เบราว์เซอร์ยังไม่อนุญาตการแจ้งเตือน','The browser didn’t allow notifications'),st==='granted'?'ti-bell-ringing':'ti-bell-off')}
      /* ปิด: สวิตช์เปลี่ยนทันที — ยกเลิก Push ที่เซิร์ฟเวอร์ทำต่อเบื้องหลัง (ไม่รอ service worker) */
      else{B.disable().catch(()=>{});toast(t('ปิดแจ้งเตือนในเครื่องแล้ว — ยังดูได้ที่กระดิ่ง','Device notifications off — still listed under the bell'),'ti-bell-off')}}
    else{const r=await B.km.set(want);if(r.msg)toast(r.msg,r.ok?'ti-gauge':'ti-alert-triangle')}
    paintNotif();return}
  if(a==='back')return close();
  if(a==='manage')return openManage();
  if(a==='manage-back')return dismiss('stmanage',closeManage);
  if(a==='sheet-x')return dismiss('stsheet',closeSheet);
  if(['signout','reset','deactivate','delete','lang','currency','name','fb'].includes(a)){
    if(sheetKind){closeThen(()=>sheet(a));return}
    return sheet(a)}
  if(a==='export'){
    const msgId=sheetKind?'stShMsg':(b.closest('#stManage')?'stMsg2':'stMsg'),done=busy(b,t('กำลังเตรียมไฟล์…','Preparing…'));
    say(msgId,t('กำลังเตรียมไฟล์…','Preparing your file…'));
    try{await acts().exportData();say(msgId,t('ดาวน์โหลดแล้ว — ไฟล์มีข้อมูลส่วนตัว เก็บไว้ในที่ปลอดภัย','Downloaded — the file contains personal data, keep it safe'))}
    catch(x){say(msgId,t('ดาวน์โหลดไม่สำเร็จ กรุณาลองใหม่','Download failed. Please retry.'))}
    done();return}
  if(a==='do-signout'){
    const done=busy(b,t('กำลังออกจากระบบ…','Signing out…'));
    try{if(W.CendonScope)await W.CendonScope.signOut();else{const x=auth();if(x)await x.signOut()}
      /* account.js พาไปหน้าเข้าสู่ระบบเอง · กันค้าง: ถ้ายังอยู่ที่เดิม ไปเองหลังครู่หนึ่ง */
      setTimeout(()=>location.replace('/login'),1500)}
    catch(x){done();say('stShMsg',t('ออกจากระบบไม่สำเร็จ กรุณาลองใหม่','Could not sign out. Please retry.'))}
    return}
  if(a==='do-reset'){
    const done=busy(b,t('กำลังรีเซ็ต…','Resetting…'));
    let r={server:false};try{r=await acts().reset()}catch(x){}
    if(!r.server){done();say('stShMsg',t('รีเซ็ตไม่สำเร็จหรือยังล้างข้อมูลไม่ครบ ข้อมูลในเครื่องยังไม่ได้ล้าง กรุณาลองใหม่','The reset did not finish. Local data was not cleared. Please retry.'));return}
    closeSheet();if(W.CendonAccount)W.CendonAccount.reload();else location.reload();return}
  if(a==='do-deactivate'){
    const done=busy(b,t('กำลังปิดใช้งาน…','Deactivating…'));
    try{await acts().deactivate();setTimeout(()=>location.replace('/login'),1200)}
    catch(x){done();say('stShMsg',t('ปิดใช้งานไม่สำเร็จ กรุณาลองใหม่หรือติดต่อผู้ดูแล','Could not deactivate the account. Please retry or contact support.'))}
    return}
  if(a==='do-delete'){
    const inp=$('stDelIn');if(!inp||!matches(inp.value))return;
    const done=busy(b,t('กำลังลบ…','Deleting…'));inp.disabled=true;
    let ok=false;try{ok=await acts().remove(m=>say('stShMsg',m))}catch(x){say('stShMsg',t('ลบไม่สำเร็จ ยังไม่มีอะไรถูกลบ กรุณาลองใหม่','Could not delete. Nothing was removed. Please retry.'))}
    if(!ok){done();inp.disabled=false;b.disabled=!matches(inp.value);inp.focus()}
    return}
  if(a==='do-name'){
    const inp=$('stNameIn'),v=String(inp&&inp.value||'').trim();
    const valid=W.CendonAccount&&W.CendonAccount.validName?W.CendonAccount.validName(v):!!v;
    if(!valid){say('stShMsg',t('ใส่ชื่อ 1–60 ตัวอักษร (ตัวอักษรหรือตัวเลข)','Use 1–60 letters or numbers'));return}
    const done=busy(b,t('กำลังบันทึก…','Saving…'));
    try{if(!W.spireSavePrefs)throw new Error('not_ready');await W.spireSavePrefs({name:v});closeThen(render)}
    catch(x){done();say('stShMsg',t('บันทึกไม่สำเร็จ กรุณาลองใหม่','Could not save. Please retry'))}
    return}
  if(a==='do-fb')return sendFeedback(b);
}
const matches=v=>{const w=confirmWord();return w==='DELETE'?String(v).trim().toUpperCase()===w:String(v).trim()===w};
function onInput(e){
  if(e.target.id==='stDelIn'){const b=sheetEl.querySelector('[data-st="do-delete"]');if(b)b.disabled=!matches(e.target.value)}
}
/* ส่งความเห็นขึ้นเซิร์ฟเวอร์จริง (เข้าหน้าแอดมิน) · ส่งไม่ได้ = เก็บเข้าคิว ตัวซิงก์ส่งให้เองรอบหน้า */
async function sendFeedback(b){
  const ta=$('stFbTxt'),txt=String(ta&&ta.value||'').trim();
  if(!txt){say('stShMsg',t('พิมพ์อะไรสักหน่อยก่อนส่ง','Write something first'));return}
  const kind=(sheetEl.querySelector('[data-fbk][aria-pressed="true"]')||{dataset:{fbk:'idea'}}).dataset.fbk;
  const item={kind,message:txt.slice(0,2000),page:location.pathname,at:Date.now()};
  const done=busy(b,t('กำลังส่ง…','Sending…'));let sent=false;
  try{const u=fbUser();if(u){const r=await fetch(API()+'/api/feedback',{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+await u.getIdToken()},body:JSON.stringify(item)});sent=r.ok}}catch(e){}
  if(!sent)try{const q=JSON.parse(localStorage.getItem('spire_fbQueue')||'[]');q.unshift(item);localStorage.setItem('spire_fbQueue',JSON.stringify(q.slice(0,50)))}catch(e){}
  done();if(ta)ta.value='';
  say('stShMsg',sent?t('ส่งถึงทีมงานแล้ว ขอบคุณที่บอกเรา','Sent to the team — thank you!')
    :t('ยังส่งไม่ได้ตอนนี้ เก็บไว้ให้แล้ว จะส่งให้เองเมื่อออนไลน์','Couldn’t send right now — saved, and it’ll be sent automatically when you’re back online'));
}

/* ภาษาเปลี่ยน (จากที่ไหนก็ตาม) → วาดหน้าตั้งค่าใหม่ถ้าเปิดอยู่ */
try{W.spireOnLang&&W.spireOnLang(()=>{const v=$('v-settings');if(v&&main&&v.contains(main))setTimeout(render,0)})}catch(e){}

W.CendonSettings=Object.freeze({open,render,refresh,go,close,openManage,closeManage,sheet,closeSheet,quota});
W.addEventListener('cendon:partner-state',refresh);

/* ── หน้าเว็บหลัก (โปรไฟล์ การาจ นิตยสาร ร้านค้า) — หน้าแชตมีตัวเปิดของตัวเอง ── */
if(/^\/chat(\/|$)/.test(location.pathname))return;
W.spireOpenSettings=which=>open(which);
W.spireCloseSettings=close;
/* เมนูรูปโปรไฟล์ (คอม): "ตั้งค่า" + "บัญชีของฉัน" พาเข้าหน้านี้ */
function mountMenu(){
  const dd=$('dd');if(!dd||$('ddSettings'))return;
  const old=dd.querySelector('[data-view="profile"]');
  if(old){old.removeAttribute('data-view');const l=old.querySelector('span');if(l)l.textContent=t('บัญชีของฉัน','My account');
    old.onclick=e=>{e.preventDefault();e.stopPropagation();dd.classList.remove('show');open()}}
  const b=D.createElement('button');b.id='ddSettings';b.type='button';
  b.innerHTML='<i class="ti ti-settings"></i> <span>'+t('ตั้งค่า','Settings')+'</span>';
  b.onclick=()=>{dd.classList.remove('show');open()};
  const first=dd.firstElementChild;dd.insertBefore(b,first?first.nextSibling:null);
}
/* /profile = หน้าตั้งค่าทั้งหน้า (ลิงก์เก่า /profile?tab=… ก็มาที่นี่) */
function autoOpen(){
  if(W.__SPIRE_PAGE__!=='profile')return;
  const v=$('v-settings');if(v&&v.classList.contains('on'))return;
  const tab=new URLSearchParams(location.search).get('tab');
  open(tab==='fb'||tab==='usage'||tab==='notif'?tab:undefined);
}
const ready=fn=>{if(D.readyState==='loading')D.addEventListener('DOMContentLoaded',fn,{once:true});else fn()};
ready(mountMenu);setTimeout(mountMenu,800);setTimeout(mountMenu,2200);
ready(autoOpen);setTimeout(autoOpen,900);
})(window,document);
