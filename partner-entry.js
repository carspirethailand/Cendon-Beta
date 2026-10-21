/* Public application entry, never an authorization or application decision.
   Paint on the source page while /join loads; no hidden app/iframe, auth request,
   private snapshot, document upload, or automatic submission. */
(function(W,D){
  'use strict';if(W.CendonPartnerEntry)return;
  const H=D.documentElement;
  const isJoin=raw=>{try{const u=new URL(raw,W.location.href);return u.origin===W.location.origin&&/^\/join(?:\.html)?\/?$/.test(u.pathname)}catch{return false}};
  const boot=isJoin(W.location.href);if(boot)H.dataset.partnerBoot='1';
  let pane=null,previous=null,finished=false,navGeneration=0;
  const th=()=>{try{const l=JSON.parse(localStorage.getItem('spire_lang')||'null');return l?l==='th':/^th/i.test(navigator.language||'th')}catch{return true}};
  const T=(a,b)=>th()?a:b;
  function hide(){finished=true;navGeneration++;delete H.dataset.partnerBoot;if(!pane)return;pane.remove();pane=null;try{previous?.focus({preventScroll:true})}catch{}previous=null;}
  function show(){
    if(pane||!D.body)return;finished=false;previous=D.activeElement;
    pane=D.createElement('section');pane.id='partnerEntry';pane.setAttribute('role','dialog');pane.setAttribute('aria-modal','true');pane.setAttribute('aria-labelledby','partnerEntryTitle');
    pane.innerHTML=`<div class="pe-page"><header><button type="button" data-pe-back aria-label="${T('ย้อนกลับ','Back')}">←</button><span>${T('สมัครเป็นช่าง','Become a mechanic')}</span><small>CENDON PARTNER</small></header>
      <main><div class="pe-hero"><small>CENDON PARTNER PROGRAM</small><h1 id="partnerEntryTitle" tabindex="-1">${T('ร่วมเป็นพาร์ทเนอร์ช่าง','Become a partner mechanic')}<em>${T('กับ Cendon','with Cendon')}</em></h1><p>${T('รับงานจากเจ้าของรถในพื้นที่ของคุณ · ใช้เวลากรอกประมาณ 10 นาที','Get jobs from car owners near you · takes about 10 minutes')}</p></div>
      <div class="pe-benefits"><div><b>${T('งานใกล้คุณ','Jobs near you')}</b><span>${T('ลูกค้าในรัศมีที่เลือก','Customers in your radius')}</span></div><div><b>${T('ไม่มีค่าสมัคร','No sign-up fee')}</b><span>${T('ไม่มีค่าแรกเข้า','No joining fee')}</span></div><div><b>${T('ตั้งราคาเอง','Your prices')}</b><span>${T('เสนอราคาทุกงาน','You quote every job')}</span></div></div>
      <h2>${T('คุณสมบัติผู้สมัคร','Applicant requirements')}</h2><ul><li>${T('อายุ 18 ปีขึ้นไป มีบัตรประชาชนไทย','Age 18 or older with a Thai national ID')}</li><li>${T('ประสบการณ์ซ่อมรถ 2 ปีขึ้นไป','At least 2 years of repair experience')}</li><li>${T('มีเบอร์โทรที่ติดต่อได้จริง','A reachable phone number')}</li><li>${T('มีอู่ หรือเครื่องมือพร้อมออกหน้างาน','A workshop or tools for on-site work')}</li></ul></main>
      <footer><p role="status">${T('กำลังเตรียมแบบฟอร์ม · คุณอ่านรายละเอียดได้เลย','Preparing your form · you can read the details now')}</p><button type="button" disabled>${T('เริ่มกรอกใบสมัคร','Start the application')}</button></footer></div>`;
    D.body.append(pane);pane.querySelector('[data-pe-back]').onclick=()=>{hide();if(boot){if(W.history.length>1)W.history.back();else W.location.assign('/profile')}else W.stop?.()};
    pane.addEventListener('keydown',e=>{if(e.key==='Escape'){e.preventDefault();pane?.querySelector('[data-pe-back]').click()}else if(e.key==='Tab'){e.preventDefault();pane?.querySelector('[data-pe-back]').focus()}});
    pane.querySelector('h1').focus({preventScroll:true});
  }
  D.addEventListener('click',e=>{
    if(e.defaultPrevented||e.button||e.metaKey||e.ctrlKey||e.shiftKey||e.altKey)return;
    const a=e.target.closest?.('a[href]');if(!a||a.hasAttribute('download')||a.target&&a.target!=='_self')return;
    // Old in-memory settings markup must not send an Apply-labelled card to Studio.
    if(a.matches('[data-partner].st-p-none,[data-partner].st-p-pending,[data-partner].st-p-rejected'))a.setAttribute('href','/join');
    if(!isJoin(a.href))return;
    show();
    e.preventDefault();
    if(typeof W.cendonOpenJoin==='function'&&!new URL(a.href,W.location.href).search){W.cendonOpenJoin();return;}
    // Allow the source document to paint the introduction before the browser
    // suspends it for navigation. No status/network request gates this frame.
    const href=a.href,generation=++navGeneration;
    W.requestAnimationFrame(()=>W.requestAnimationFrame(()=>{if(pane&&navGeneration===generation)W.location.assign(href)}));
  },true);
  W.addEventListener('pageshow',e=>{if(e.persisted&&!isJoin(W.location.href))hide()});
  W.CendonPartnerEntry=Object.freeze({show,hide,isJoin});
  if(boot){if(D.readyState==='loading')D.addEventListener('DOMContentLoaded',()=>{if(!finished)show()},{once:true});else show()}
})(window,document);
