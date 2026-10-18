/* ══════════════════════════════════════════════════════════════════
   garage-extras.js — ของใหม่ในหน้าการาจ
   1) Cendon Wrapped: สรุปปีของรถแบบสไลด์เต็มจอ + รูปแชร์ 9:16 (คำนวณในเครื่องจากสมุดรถจริง · AI ตั้งฉายาได้วันละไม่กี่ครั้ง)
   2) ปฏิทินค่าใช้จ่าย 12 เดือน: เดือนไหนต้องเปลี่ยนอะไร ประมาณกี่บาท ควรเก็บเดือนละเท่าไร + เตือนทาง LINE/แจ้งเตือนในเครื่อง
   3) Car Passport: หน้าประวัติรถที่เจ้าของเลือกเปิดให้คนอื่นดู (ขายรถมือสอง) + QR · ไม่มีชื่อ ทะเบียน เบอร์ · ปิดได้ทุกเมื่อ
   ใช้ข้อมูลจาก window.SpireCarLab / SpireODO ในหน้าการาจ — ไม่แต่งตัวเลขเอง ที่เป็นค่าประมาณติดป้ายบอกทุกที่
   ══════════════════════════════════════════════════════════════════ */
(function(){
'use strict';
const D=document,$=id=>D.getElementById(id);
const EN=()=>(window.lang||'th')==='en';
const T=(th,en)=>(window.spireT?window.spireT(th,en):(EN()?en:th));
const esc=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const num=n=>Math.round(Number(n)||0).toLocaleString(EN()?'en-US':'th-TH');
const LOC=()=>EN()?'en-GB':'th-TH';
const LG=(k,d)=>{try{const v=localStorage.getItem('spire_'+k);return v?JSON.parse(v):d}catch(e){return d}};
const LSet=(k,v)=>{try{localStorage.setItem('spire_'+k,JSON.stringify(v))}catch(e){}};
const toast=(m,ic)=>{try{if(window.toast)return window.toast(m,ic)}catch(e){}};
const CL=()=>window.SpireCarLab||{};
const cars=()=>{try{return (window.garage&&window.garage())||LG('garage',[])}catch(e){return []}};
const nameOf=c=>[c.make||c.name||'',c.model||'',c.year||''].filter(Boolean).join(' ').trim()||c.name||T('รถของฉัน','My car');
const logOf=c=>{try{const l=CL().getLog(c.id)||{};return {services:l.services||[],fuel:l.fuel||[],trips:l.trips||[]}}catch(e){return {services:[],fuel:[],trips:[]}}};
const kmOf=c=>{try{return window.SpireODO?(window.SpireODO.value(c)||parseInt(c.mileage)||0):parseInt(c.mileage)||0}catch(e){return parseInt(c.mileage)||0}};
/* กม./วัน ที่ขับจริง: จากระบบเลขไมล์ก่อน · ไม่มีก็คิดจากสมุดรถ (เลขไมล์ที่จดตอนเติมน้ำมัน/ซ่อม ห่างกันอย่างน้อย 30 วัน) */
const rateOf=c=>{
  try{const e=window.SpireODO&&window.SpireODO.km(c);if(e&&e.rate>0)return e.rate}catch(e){}
  const L=logOf(c),pts=[...L.fuel,...L.services].filter(x=>+x.km>0&&x.date).map(x=>({t:new Date(x.date).getTime(),km:+x.km})).filter(x=>x.t>0).sort((a,b)=>a.t-b.t);
  if(pts.length<2)return null;const a=pts[0],b=pts[pts.length-1],days=(b.t-a.t)/864e5;
  return days>=30&&b.km>a.km?(b.km-a.km)/days:null;
};
const planOf=c=>{try{return CL().planFor(c)||[]}catch(e){return []}};
const itemName=(c,k)=>{const p=planOf(c).find(x=>x.k===k);return p?T(p.th,p.en):String(k||T('งานซ่อมบำรุง','Service'))};
async function user(){let u=window.spireAuth&&window.spireAuth.currentUser;if(!u&&window.spireAwaitUser)u=await window.spireAwaitUser(6000);return u||null}
async function api(path,body,method){
  const u=await user();if(!u)throw Object.assign(Error(T('เข้าสู่ระบบก่อนนะครับ','Please sign in first')),{status:401});
  const r=await fetch(window.BACKEND_URL+path,{method:method||(body?'POST':'GET'),headers:{'Content-Type':'application/json',Authorization:'Bearer '+await u.getIdToken()},body:body?JSON.stringify(body):undefined,cache:'no-store'});
  const d=await r.json().catch(()=>null);
  if(!r.ok)throw Object.assign(Error((d&&d.error)||T('ระบบไม่พร้อมชั่วคราว ลองใหม่อีกครั้ง','Temporarily unavailable — please try again')),{status:r.status,data:d});
  return d;
}

/* ═════════════════ 2) ปฏิทินค่าใช้จ่าย 12 เดือน ═════════════════ */
/* ช่วงราคาทั่วไปโดยประมาณในไทย (รถเก๋ง/กระบะทั่วไป รวมค่าแรง) — ใช้เมื่อยังไม่มีราคาที่ผู้ใช้จ่ายจริง และติดป้าย "ประมาณการ" เสมอ */
const REF={oil:[1200,2500],airf:[300,800],cabin:[250,700],plug:[1200,3500],brakepad:[1500,3500],brakeoil:[500,1200],tire:[8000,20000],align:[400,900],batt:[2500,5000],coolant:[600,1500],gearoil:[1200,3500],belt:[800,2500],shock:[6000,16000]};
const RATE_DEFAULT=41;   /* ~15,000 กม./ปี ค่าเฉลี่ยคนไทย ใช้จนกว่าจะมีเลขไมล์จริงพอคำนวณ */
const myPrices=c=>LG('cal_price_'+c.id,{})||{};
/* เพดานราคาต่องานตามกลุ่มรถ (input-guard.js) — ตัวเลขที่เป็นไปไม่ได้ซึ่งบันทึกไว้ก่อนมีการตรวจ จะไม่ถูกนำมารวมยอด */
function capOf(c,k){const g=window.spireGuard;if(!g)return Infinity;const t=g.tier(c),j=g.JOB[k];return j?Math.min(j[0]*t.f,t.ceil):t.ceil}
function priceOf(c,k,own){
  const cap=capOf(c,k);
  const paid=own.filter(s=>s.k===k&&+s.amount>0&&+s.amount<=cap).sort((a,b)=>String(b.date||'').localeCompare(String(a.date||'')))[0];
  if(paid)return {v:+paid.amount,src:'paid'};
  const mine=+myPrices(c)[k];if(mine>0&&mine<=cap)return {v:mine,src:'mine'};
  const r=REF[k];return r?{v:Math.round((r[0]+r[1])/2/50)*50,lo:r[0],hi:r[1],src:'ref'}:{v:0,src:'none'};
}
function calendar(c){
  const now=new Date(),today=new Date(now.getFullYear(),now.getMonth(),now.getDate());
  const km=kmOf(c);let rate=rateOf(c);const est=!(rate>0);if(est)rate=RATE_DEFAULT;
  const own=logOf(c).services;
  const end=new Date(today);end.setMonth(end.getMonth()+12);
  const events=[];
  for(const p of planOf(c)){
    const done=own.filter(s=>s.k===p.k).sort((a,b)=>(+b.km||0)-(+a.km||0)||String(b.date||'').localeCompare(String(a.date||'')))[0];
    const left=done?(+done.km||0)+p.km-km:p.km-(km%p.km||0);
    const byKm=new Date(today.getTime()+Math.max(0,left)/rate*864e5);
    let byTime=null;if(done&&done.date){byTime=new Date(done.date);if(!isNaN(byTime))byTime.setMonth(byTime.getMonth()+p.mo);else byTime=null}
    let due=byKm,by='km';if(byTime&&byTime<due){due=byTime;by='time'}
    const over=left<=0||(byTime&&byTime<=today);
    if(over)due=today;
    if(due>end)continue;
    events.push({k:p.k,name:T(p.th,p.en),due,by,over,logged:!!done,p,price:priceOf(c,p.k,own)});
  }
  events.sort((a,b)=>a.due-b.due);
  const months=[];
  for(let i=0;i<12;i++){const d=new Date(today.getFullYear(),today.getMonth()+i,1);months.push({d,items:[],total:0})}
  events.forEach(e=>{const i=Math.max(0,(e.due.getFullYear()-today.getFullYear())*12+e.due.getMonth()-today.getMonth());if(months[i]){months[i].items.push(e);months[i].total+=e.price.v||0}});
  const total=months.reduce((a,m)=>a+m.total,0);
  return {events,months,total,perMonth:Math.ceil(total/12/50)*50,rate,est,km};
}
function paneCal(c){
  const C=calendar(c),max=Math.max(1,...C.months.map(m=>m.total)),refUsed=C.events.some(e=>e.price.src==='ref');
  const mLabel=d=>d.toLocaleDateString(LOC(),{month:'short'});
  const rem=!!LG('cal_rem_'+c.id,false);
  if(!planOf(c).length)return `<div class="cx-empty">${T('ยังไม่มีตารางบำรุงรักษาสำหรับรถคันนี้','No maintenance plan for this car yet')}</div>`;
  return `<div class="cx-cal" data-car="${esc(c.id)}">
    <div class="cx-hero"><div><small>${T('12 เดือนข้างหน้า ประมาณ','Next 12 months, about')}</small><b>฿${num(C.total)}</b>
      <p>${T('ควรเก็บไว้เดือนละ','Set aside')} <em>฿${num(C.perMonth)}</em>${T('',' a month')}</p></div>
      <div class="cx-bars" role="img" aria-label="${T('ค่าใช้จ่ายรายเดือน','Monthly costs')}">${C.months.map((m,i)=>`<button type="button" class="${m.items.length?'has':''}${i===0?' now':''}" data-m="${i}" style="--h:${Math.max(m.total?8:3,Math.round(m.total/max*100))}%"><i></i><span>${mLabel(m.d)}</span></button>`).join('')}</div></div>
    <p class="cx-basis"><i class="ti ti-info-circle"></i>${C.est?T(`ยังไม่มีเลขไมล์พอคำนวณระยะที่คุณขับจริง — ใช้ค่าเฉลี่ย ~15,000 กม./ปี ไปก่อน · บันทึกเลขไมล์บ่อย ๆ ปฏิทินจะแม่นขึ้นเอง`,`Not enough mileage history yet — assuming ~15,000 km/year · log your mileage and this gets more accurate`):T(`คำนวณจากที่คุณขับจริงราว ${num(C.rate*30)} กม./เดือน · เลขไมล์ตอนนี้ ~${num(C.km)} กม.`,`Based on your real driving, ~${num(C.rate*30)} km/month · now ~${num(C.km)} km`)}</p>
    <div class="cx-months">${C.months.map((m,i)=>m.items.length?`<section class="cx-m" id="cxm-${i}"><h4><span>${m.d.toLocaleDateString(LOC(),{month:'long',year:'numeric'})}</span><b>฿${num(m.total)}</b></h4>
      ${m.items.map(e=>`<div class="cx-it${e.over?' over':''}"><span class="cx-ic"><i class="ti ti-${e.over?'alert-triangle':e.by==='time'?'calendar':'gauge'}"></i></span>
        <div><b>${esc(e.name)}</b><small>${e.over?T('เลยกำหนดแล้ว — ทำเร็วที่สุด','Overdue — do it soon'):e.by==='time'?T(`ครบ ${e.p.mo} เดือน · ประมาณ ${e.due.toLocaleDateString(LOC(),{day:'numeric',month:'short'})}`,`${e.p.mo}-month interval · around ${e.due.toLocaleDateString(LOC(),{day:'numeric',month:'short'})}`):T(`ครบ ${num(e.p.km)} กม. · ประมาณ ${e.due.toLocaleDateString(LOC(),{day:'numeric',month:'short'})}`,`${num(e.p.km)} km interval · around ${e.due.toLocaleDateString(LOC(),{day:'numeric',month:'short'})}`)}${e.logged?'':' · '+T('ยังไม่เคยบันทึก','never logged')}</small></div>
        <button type="button" class="cx-pr ${e.price.src}" data-k="${esc(e.k)}" title="${T('แก้ราคา','Edit price')}">${e.price.v?(e.price.src==='ref'?'≈':'')+'฿'+num(e.price.v):T('ใส่ราคา','Add price')}<small>${e.price.src==='paid'?T('ที่คุณจ่ายครั้งก่อน','what you paid'):e.price.src==='mine'?T('ราคาที่คุณตั้ง','your estimate'):e.price.src==='ref'?T(`ทั่วไป ${num(e.price.lo)}–${num(e.price.hi)}`,`typical ${num(e.price.lo)}–${num(e.price.hi)}`):''}</small></button></div>`).join('')}</section>`:'').join('')||`<div class="cx-empty">${T('12 เดือนข้างหน้ายังไม่มีอะไรถึงกำหนด','Nothing due in the next 12 months')}</div>`}</div>
    ${refUsed?`<p class="cx-fine">${T('≈ = ช่วงราคาทั่วไปโดยประมาณ (รวมค่าแรง) ไม่ใช่ราคาอ้างอิง · แตะราคาเพื่อใส่ราคาที่คุณได้จริง','≈ = rough typical price incl. labour, not a quote · tap a price to set your own')}</p>`:''}
    <label class="cx-rem"><span class="sq"><i class="ti ti-bell-ringing"></i></span><div><b>${T('เตือนก่อนถึงกำหนด 7 วัน','Remind me 7 days before')}</b><small>${T('ทาง LINE (ถ้าเชื่อมไว้) และแจ้งเตือนในเครื่อง','Via LINE (if linked) and device notifications')}</small></div><input type="checkbox" id="cxRem" ${rem?'checked':''}><i class="sw"></i></label>
  </div>`;
}
async function setReminders(c,on){
  const C=calendar(c),ids=[];
  const now=Date.now(),max=now+390*864e5;
  for(const e of C.events.slice(0,13)){
    const at=new Date(e.due);at.setDate(at.getDate()-7);at.setHours(9,0,0,0);
    const id=('cal:'+c.id+':'+e.k).slice(0,60);ids.push(id);
    if(!on||e.over||at.getTime()<now+3600e3||at.getTime()>max)continue;
    await api('/api/push/schedule',{id,sendAt:at.getTime(),tag:'cendon-cal',url:'/garage/'+encodeURIComponent(c.id)+'/cal',
      title:T(`${e.name} ใกล้ถึงกำหนด`,`${e.name} is due soon`),
      body:T(`${nameOf(c)} · ประมาณ ${e.due.toLocaleDateString('th-TH',{day:'numeric',month:'short'})}${e.price.v?` · ราว ฿${num(e.price.v)}`:''}`,`${nameOf(c)} · around ${e.due.toLocaleDateString('en-GB',{day:'numeric',month:'short'})}${e.price.v?` · ~฿${num(e.price.v)}`:''}`)});
  }
  if(!on)for(const id of LG('cal_ids_'+c.id,[]))await api('/api/push/cancel',{id}).catch(()=>{});
  LSet('cal_ids_'+c.id,on?ids:[]);
}
function mountCal(c){
  const box=D.querySelector('.cx-cal');if(!box)return;
  box.querySelectorAll('.cx-bars [data-m]').forEach(b=>b.onclick=()=>{const s=$('cxm-'+b.dataset.m);if(s){s.scrollIntoView({behavior:'smooth',block:'start'});s.classList.add('flash');setTimeout(()=>s.classList.remove('flash'),900)}});
  box.querySelectorAll('.cx-pr').forEach(b=>b.onclick=()=>{
    const k=b.dataset.k,cur=myPrices(c)[k]||'';
    const v=prompt(T(`ราคาที่คุณคาดว่าจะจ่ายสำหรับ "${itemName(c,k)}" (บาท)`,`Your expected price for "${itemName(c,k)}" (THB)`),cur);
    if(v===null)return;const all=myPrices(c);
    /* เว้นว่าง = กลับไปใช้ราคาทั่วไป · ตัวเลขต้องสมจริงตามรุ่นรถ — ไม่ผ่านบอกเหตุผล ไม่ลบราคาเดิมเงียบ ๆ */
    if(!String(v).trim()){delete all[k];LSet('cal_price_'+c.id,all);rerender();return}
    let n;try{n=window.CendonGarageRules?window.CendonGarageRules.number(v,1,1000000000,'amount'):Number(v)}catch(e){toast(e.message,'ti-alert-triangle');return}
    if(!(n>0)){toast(T('ใส่ราคาเป็นตัวเลข (บาท)','Enter the price as a number (THB)'),'ti-alert-triangle');return}
    const g=window.spireGuard,r=g?g.money(n,c,{job:k,what:itemName(c,k)}):{ok:true};
    if(!r.ok){toast(r.msg,'ti-alert-triangle');return}
    if(r.ask&&!confirm(r.ask))return;
    all[k]=n;LSet('cal_price_'+c.id,all);rerender();
  });
  const rem=$('cxRem');if(rem)rem.onchange=async()=>{
    const on=rem.checked;rem.disabled=true;
    try{await setReminders(c,on);LSet('cal_rem_'+c.id,on);toast(on?T('ตั้งเตือนแล้ว — จะเตือนก่อนถึงกำหนด 7 วัน','Reminders set — 7 days before each item'):T('ปิดการเตือนแล้ว','Reminders off'),on?'ti-bell-ringing':'ti-bell-off')}
    catch(e){rem.checked=!on;toast(e.status===401?T('เข้าสู่ระบบเพื่อรับการเตือน','Sign in to get reminders'):T('ตั้งเตือนไม่สำเร็จ ลองใหม่อีกครั้ง','Could not set reminders — try again'),'ti-alert-triangle')}
    finally{rem.disabled=false}};
}

/* ═════════════════ 3) Car Passport (ฝั่งเจ้าของรถ) ═════════════════ */
const PASS={};   /* สถานะต่อคัน: {loading, data, jobs, picked, err} */
const passUrl=t=>location.origin+'/passport/'+encodeURIComponent(t);
function payload(c,st){
  const L=logOf(c),today=new Date().toISOString().slice(0,10);
  const odo=[...L.services,...L.fuel].filter(x=>+x.km>0&&x.date).map(x=>({date:String(x.date).slice(0,10),km:+x.km}));
  const k=kmOf(c);if(k>0)odo.push({date:today,km:k});
  const seen=new Set(),odo2=odo.sort((a,b)=>a.date<b.date?-1:1).filter(x=>{const key=x.date+':'+x.km;if(seen.has(key))return false;seen.add(key);return true}).slice(-200);
  return {carKey:c.id,car:{make:c.make||c.name||'',model:c.model||'',year:c.year||null,fuel:c.fuel||c.fuelType||'',body:(CL().bodyOf&&CL().bodyOf(c))||''},km:k||null,
    odo:odo2,services:L.services.filter(s=>s.date).map(s=>({date:String(s.date).slice(0,10),km:+s.km||null,item:itemName(c,s.k),amount:+s.amount||null})).slice(-200),
    showCost:!!st.showCost,jobs:[...st.picked]};
}
async function loadPass(c){
  const st=PASS[c.id]=PASS[c.id]||{picked:new Set(),showCost:false};
  st.loading=true;st.err='';rerender();
  try{
    const [m,j]=await Promise.all([api('/api/tech/passport?car='+encodeURIComponent(c.id)),api('/api/tech/jobs').catch(()=>({jobs:[]}))]);
    st.data=m.passport||null;
    /* สวิตช์ "แสดงค่าใช้จ่าย" เริ่มตามที่หน้า Passport ใช้อยู่จริง (ยังไม่เคยแตะเองเท่านั้น) */
    if(!st.costTouched)st.showCost=!!(st.data&&st.data.showCost);
    st.jobs=(j.jobs||[]).filter(x=>x.side!=='technician'&&x.status==='completed');
    /* เดาใบงานของรถคันนี้จากชื่อรุ่น — เจ้าของติ๊กเพิ่ม/เอาออกเองได้ */
    if(!st.touched){const key=String(c.model||c.name||'').toLowerCase();st.picked=new Set(st.jobs.filter(x=>key&&String(x.car||'').toLowerCase().includes(key)).map(x=>x.id))}
  }catch(e){st.err=e.status===401?'login':e.message}
  st.loading=false;rerender();
}
function panePass(c){
  const st=PASS[c.id];
  if(!st){setTimeout(()=>loadPass(c),0);return `<div class="cx-pass"><div class="cx-load"><span class="spin"></span>${T('กำลังโหลด…','Loading…')}</div></div>`}
  if(st.loading&&!st.data&&!st.jobs)return `<div class="cx-pass"><div class="cx-load"><span class="spin"></span>${T('กำลังโหลด…','Loading…')}</div></div>`;
  if(st.err==='login')return `<div class="cx-pass"><div class="cx-empty">${T('เข้าสู่ระบบเพื่อสร้าง Car Passport','Sign in to create a Car Passport')}</div></div>`;
  const L=logOf(c),d=st.data;
  return `<div class="cx-pass">
    <div class="cx-pcard"><div class="cx-pbadge"><i class="ti ti-id-badge-2"></i>Car Passport</div>
      <h3>${esc(nameOf(c))}</h3><p>${T('หน้าประวัติรถที่คนซื้อรถสแกนดูได้ — ช่วยให้ขายรถมือสองได้ราคาดีขึ้น','A history page buyers can scan — helps your used car sell for more')}</p>
      <div class="cx-pstat"><div><b>${L.services.length}</b><small>${T('บันทึกโดยเจ้าของ','owner records')}</small></div><div><b>${st.picked.size}</b><small>${T('ยืนยันโดยร้าน','shop-verified')}</small></div><div><b>${num(kmOf(c))}</b><small>${T('กม.','km')}</small></div></div></div>
    ${d?`<div class="cx-live"><div class="cx-qr" id="cxQr"></div><div><b>${T('เปิดใช้งานอยู่','Live')}</b><small>${T(`มีคนเปิดดู ${num(d.views)} ครั้ง · อัปเดต ${new Date(d.updatedAt).toLocaleDateString(LOC(),{day:'numeric',month:'short'})}`,`${num(d.views)} views · updated ${new Date(d.updatedAt).toLocaleDateString(LOC(),{day:'numeric',month:'short'})}`)}</small>
      <div class="cx-acts"><button type="button" class="cx-b" id="cxCopy"><i class="ti ti-link"></i>${T('คัดลอกลิงก์','Copy link')}</button><button type="button" class="cx-b" id="cxShare"><i class="ti ti-share-3"></i>${T('แชร์','Share')}</button><button type="button" class="cx-b" id="cxDl"><i class="ti ti-download"></i>QR</button><a class="cx-b" href="${esc(passUrl(d.token))}" target="_blank" rel="noopener"><i class="ti ti-external-link"></i>${T('ดูหน้า','Open')}</a></div></div></div>`:''}
    ${(st.jobs||[]).length?`<div class="cx-jobs"><h4>${T('งานซ่อมผ่าน Cendon ที่จะติดป้าย "ยืนยันโดยร้าน"','Cendon repairs shown as "shop-verified"')}</h4>${st.jobs.map(j=>`<label class="cx-job"><input type="checkbox" data-j="${esc(j.id)}" ${st.picked.has(j.id)?'checked':''}><div><b>${esc(j.techName||'')}</b><small>${esc(j.car||'')} · ${esc(String(j.symptom||'').slice(0,60))}</small></div></label>`).join('')}</div>`:''}
    <label class="cx-rem"><span class="sq"><i class="ti ti-coin"></i></span><div><b>${T('แสดงค่าใช้จ่าย','Show costs')}</b><small>${T('ปิดไว้ = คนดูเห็นแค่รายการและวันที่','Off = viewers see items and dates only')}</small></div><input type="checkbox" id="cxCost" ${st.showCost?'checked':''}><i class="sw"></i></label>
    ${st.showCost?(()=>{const sv=L.services.filter(x=>+x.amount>0),tot=sv.reduce((a,x)=>a+(+x.amount||0),0);
      return `<p class="cx-cost">${sv.length?T(`ค่าใช้จ่ายที่จะแสดง: ${sv.length} รายการ · รวม ฿${num(tot)}`,`Costs shown: ${sv.length} items · ฿${num(tot)} total`):T('ยังไม่มีรายการที่ใส่ค่าใช้จ่าย — ใส่ราคาตอนบันทึกการดูแลรถ แล้วจะแสดงที่นี่','No records with a cost yet — add the price when you log maintenance')}${d?'':T(' · แสดงเมื่อกดสร้าง Car Passport',' · appears once you create the Car Passport')}</p>`})():''}
    <p class="cx-fine"><i class="ti ti-shield-lock"></i>${T('ไม่มีชื่อ ทะเบียน เบอร์ หรือที่อยู่ของคุณ · รายการที่คุณบันทึกเองติดป้าย "บันทึกโดยเจ้าของ" · งานผ่าน Cendon ดึงจากระบบจริง แก้ไม่ได้ · ปิดลิงก์ได้ทุกเมื่อ','No name, plate, phone or address · your own records are labelled "owner-recorded" · Cendon jobs come straight from the system and can\'t be edited · turn the link off any time')}</p>
    <div class="cx-acts main"><button type="button" class="cx-b p" id="cxPub"><i class="ti ti-${d?'refresh':'sparkles'}"></i>${d?T('อัปเดตข้อมูลล่าสุด','Update with latest'):T('สร้าง Car Passport','Create Car Passport')}</button>${d?`<button type="button" class="cx-b" id="cxOff"><i class="ti ti-link-off"></i>${T('ปิดลิงก์','Turn off')}</button>`:''}</div>
    ${st.err&&st.err!=='login'?`<p class="cx-err">${esc(st.err)}</p>`:''}
  </div>`;
}
function qrInto(el,text,cb){
  const draw=()=>{try{el.innerHTML='';new window.QRCode(el,{text,width:168,height:168,colorDark:'#111111',colorLight:'#ffffff',correctLevel:window.QRCode.CorrectLevel.M});cb&&cb()}catch(e){}};
  if(window.QRCode)return draw();
  const s=D.createElement('script');s.src='https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js';s.onload=draw;D.head.appendChild(s);
}
function mountPass(c){
  const st=PASS[c.id];if(!st)return;const box=D.querySelector('.cx-pass');if(!box)return;
  box.querySelectorAll('[data-j]').forEach(x=>x.onchange=()=>{st.touched=true;x.checked?st.picked.add(x.dataset.j):st.picked.delete(x.dataset.j);const s=box.querySelectorAll('.cx-pstat b')[1];if(s)s.textContent=st.picked.size});
  const publish=async msg=>{
    const r=await api('/api/tech/passport',payload(c,st));st.data={token:r.token,updatedAt:r.updatedAt,views:(st.data&&st.data.views)||0,jobs:r.jobs,showCost:!!st.showCost};st.err='';
    toast(msg||T('Car Passport พร้อมแล้ว — แชร์ลิงก์หรือ QR ได้เลย','Car Passport is ready — share the link or QR'),'ti-id-badge-2');};
  /* เปิด/ปิดค่าใช้จ่าย: มีหน้า Passport อยู่แล้ว = อัปเดตหน้าจริงทันที (เดิมต้องกดอัปเดตเองจึงดูเหมือนไม่ทำงาน) */
  const cost=$('cxCost');if(cost)cost.onchange=async()=>{
    st.showCost=cost.checked;st.costTouched=true;
    if(st.data){cost.disabled=true;
      try{await publish(st.showCost?T('หน้า Car Passport แสดงค่าใช้จ่ายแล้ว','Costs now show on your Car Passport'):T('ซ่อนค่าใช้จ่ายจากหน้า Car Passport แล้ว','Costs hidden from your Car Passport'))}
      catch(e){st.showCost=!st.showCost;st.err=e.message}}
    rerender();};
  const pub=$('cxPub');if(pub)pub.onclick=async()=>{
    pub.disabled=true;const h=pub.innerHTML;pub.innerHTML='<span class="spin"></span>';
    try{await publish()}
    catch(e){st.err=e.status===404?T('ฟีเจอร์นี้ยังไม่พร้อมใช้งานชั่วคราว','This feature is temporarily unavailable'):e.message}
    pub.innerHTML=h;pub.disabled=false;rerender();
  };
  const off=$('cxOff');if(off)off.onclick=async()=>{if(!confirm(T('ปิดลิงก์ Car Passport? คนที่มีลิงก์/QR เดิมจะเปิดไม่ได้อีก','Turn off this Car Passport? The old link and QR will stop working')))return;
    try{await api('/api/tech/passport/revoke',{carKey:c.id});st.data=null;toast(T('ปิดลิงก์แล้ว','Link turned off'),'ti-link-off')}catch(e){st.err=e.message}rerender()};
  const d=st.data;if(!d)return;
  const url=passUrl(d.token),qr=$('cxQr');if(qr)qrInto(qr,url);
  const cp=$('cxCopy');if(cp)cp.onclick=async()=>{try{await navigator.clipboard.writeText(url);toast(T('คัดลอกลิงก์แล้ว','Link copied'),'ti-copy')}catch(e){prompt(T('คัดลอกลิงก์นี้','Copy this link'),url)}};
  const sh=$('cxShare');if(sh)sh.onclick=async()=>{try{if(navigator.share)await navigator.share({title:'Car Passport · '+nameOf(c),text:T('ประวัติรถคันนี้บน Cendon','This car\'s history on Cendon'),url});else{await navigator.clipboard.writeText(url);toast(T('คัดลอกลิงก์แล้ว','Link copied'),'ti-copy')}}catch(e){}};
  const dl=$('cxDl');if(dl)dl.onclick=()=>{
    /* ป้าย QR สำหรับติดกระจก: ชื่อรุ่น + QR + "สแกนดูประวัติรถ" */
    const src=qr&&(qr.querySelector('canvas')||qr.querySelector('img'));if(!src)return;
    const cv=D.createElement('canvas');cv.width=900;cv.height=1200;const g=cv.getContext('2d');
    g.fillStyle='#ffffff';g.fillRect(0,0,900,1200);g.fillStyle='#0d0d0f';g.fillRect(0,0,900,220);
    g.fillStyle='#ff8a3d';g.font='600 34px Kanit, sans-serif';g.textAlign='center';g.fillText('CENDON · CAR PASSPORT',450,96);
    g.fillStyle='#fff';g.font='600 52px Kanit, sans-serif';g.fillText(nameOf(c).slice(0,26),450,170);
    g.imageSmoothingEnabled=false;g.drawImage(src,180,300,540,540);
    g.fillStyle='#0d0d0f';g.font='600 46px Kanit, sans-serif';g.fillText(T('สแกนดูประวัติรถคันนี้','Scan to see this car\'s history'),450,940);
    g.fillStyle='#71717a';g.font='400 30px Kanit, sans-serif';g.fillText(T('ประวัติซ่อม · เลขไมล์ · งานที่ร้านยืนยัน','Service history · mileage · shop-verified work'),450,1000);
    const a=D.createElement('a');a.download='cendon-passport.png';a.href=cv.toDataURL('image/png');a.click();
  };
}

/* ═════════════════ 1) Cendon Wrapped ═════════════════ */
const WY=()=>{const n=new Date();return n.getMonth()===0?n.getFullYear()-1:n.getFullYear()};
const MONTHS=()=>Array.from({length:12},(_,i)=>new Date(2026,i,1).toLocaleDateString(LOC(),{month:'short'}));
/* only = รหัสรถ → สรุปเฉพาะคันนั้น (Wrap ของคันนี้ จากการพลิกการ์ด) · ไม่ใส่ = ทุกคันรวมกัน */
function yearStats(Y,only){
  const ys=String(Y),inY=x=>String(x&&x.date||'').startsWith(ys);
  const out={Y,only:only||null,km:0,fuel:0,litres:0,refuels:0,svc:0,svcCost:0,trips:0,tripKm:0,longest:null,months:Array(12).fill(0),monthsCost:Array(12).fill(0),top:{},cars:[],topCar:null,entries:0};
  for(const c of cars().filter(c=>!only||c.id===only)){
    const L=logOf(c),F=L.fuel.filter(inY),S=L.services.filter(inY),R=L.trips.filter(inY);
    const reads=[...F,...S].filter(x=>+x.km>0).map(x=>+x.km);
    const odo=reads.length>1?Math.max(...reads)-Math.min(...reads):0,tk=R.reduce((a,t)=>a+(+t.km||0),0);
    const km=Math.max(odo,tk);
    out.km+=km;out.fuel+=F.reduce((a,f)=>a+(+f.amount||0),0);out.litres+=F.reduce((a,f)=>a+(+f.litres||0),0);out.refuels+=F.length;
    out.svc+=S.length;out.svcCost+=S.reduce((a,s)=>a+(+s.amount||0),0);out.trips+=R.length;out.tripKm+=tk;
    R.forEach(t=>{if(!out.longest||(+t.km||0)>(+out.longest.km||0))out.longest={title:t.title||'',km:+t.km||0,date:t.date}});
    S.forEach(s=>{const n=itemName(c,s.k);out.top[n]=(out.top[n]||0)+1});
    [...F,...S,...R].forEach(x=>{const m=+String(x.date).slice(5,7)-1;if(m>=0&&m<12){out.months[m]++;out.monthsCost[m]+=(+x.amount||0)}});
    out.entries+=F.length+S.length+R.length;
    out.cars.push({c,km,entries:F.length+S.length+R.length});
  }
  out.topCar=out.cars.slice().sort((a,b)=>b.km-a.km||b.entries-a.entries)[0]||null;
  out.topItem=Object.entries(out.top).sort((a,b)=>b[1]-a[1])[0]||null;
  out.bestMonth=out.months.some(Boolean)?out.months.indexOf(Math.max(...out.months)):-1;
  return out;
}
/* ฉายาจากตัวเลขจริง (ใช้เมื่อ AI ไม่พร้อม) */
function ruleName(s){
  if(s.km>=25000)return {nickname:T('นักเดินทางไม่มีวันหยุด','The Unstoppable Traveller'),line:T(`ปีนี้คุณกับรถไปด้วยกัน ${num(s.km)} กม. ไกลกว่าที่คนส่วนใหญ่ขับทั้งปี`,`You covered ${num(s.km)} km together this year — more than most people drive`)};
  if(s.trips>=6)return {nickname:T('สายเที่ยวตัวจริง','The Road-Trip Regular'),line:T(`${s.trips} ทริปในปีเดียว รถคันนี้รู้จักถนนดีกว่าใคร`,`${s.trips} trips in one year — this car knows the roads`)};
  if(s.svc>=4)return {nickname:T('รถที่ถูกรักที่สุด','The Most Loved Car'),line:T(`ดูแลกันถึง ${s.svc} ครั้ง รถคันนี้โชคดีที่มีคุณ`,`Looked after ${s.svc} times — a lucky car`)};
  if(s.refuels>=24)return {nickname:T('ขาประจำปั๊ม','The Pump Regular'),line:T(`เติมน้ำมัน ${s.refuels} ครั้ง ใช้งานทุกวันจริงจัง`,`${s.refuels} fill-ups — a true daily driver`)};
  if(s.km>0&&s.km<6000)return {nickname:T('สายชิลในเมือง','The City Cruiser'),line:T(`${num(s.km)} กม. แบบสบาย ๆ ไม่เร่งไม่รีบ`,`${num(s.km)} km, nice and easy`)};
  return {nickname:T('คู่หูประจำวัน','The Daily Companion'),line:T('อยู่ด้วยกันทุกวัน ปีหน้าบันทึกให้ครบ จะได้เห็นเรื่องราวของรถชัดขึ้น','Always there — log more next year to see the full story')};
}
const nickKey=s=>'wrapped_'+s.Y+(s.only?'_'+s.only:'');
async function nickname(s){
  const key=nickKey(s),sig=[s.km,s.fuel,s.svc,s.trips,s.refuels].join('|'),hit=LG(key,null);
  if(hit&&hit.sig===sig&&hit.nickname)return hit;
  try{
    const top=s.topCar&&s.topCar.c;
    const r=await api('/api/features/analyze',{tool:'wrapped',lang:EN()?'en':'th',question:T('ตั้งฉายาให้รถจากตัวเลขปีนี้','Nickname this car from this year\'s numbers'),
      context:{stats:{year:s.Y,distanceKm:Math.round(s.km),fuelBaht:Math.round(s.fuel),litres:Math.round(s.litres),refuels:s.refuels,services:s.svc,serviceBaht:Math.round(s.svcCost),trips:s.trips,longestTripKm:s.longest?s.longest.km:0,busiestMonth:s.bestMonth>=0?s.bestMonth+1:null,topService:s.topItem?s.topItem[0]:null,car:top?[top.make||top.name,top.model,top.year].filter(Boolean).join(' '):''}}});
    const d=r&&r.data;if(d&&d.nickname){const v={nickname:d.nickname,line:d.line||'',sig,ai:true};LSet(key,v);return v}
  }catch(e){}
  return {...ruleName(s),sig};
}
const fx=(()=>{let cv,g,parts=[],raf=0,on=false;
  return {start(host){cv=D.createElement('canvas');cv.className='wr-fx';host.prepend(cv);g=cv.getContext('2d');on=true;
      const fit=()=>{const r=Math.min(2,devicePixelRatio||1);cv.width=cv.clientWidth*r;cv.height=cv.clientHeight*r};fit();addEventListener('resize',fit);
      parts=Array.from({length:46},()=>({x:Math.random(),y:Math.random(),r:.6+Math.random()*2.2,v:.0006+Math.random()*.0016,a:.25+Math.random()*.6}));
      const loop=()=>{if(!on)return;g.clearRect(0,0,cv.width,cv.height);
        for(const p of parts){p.y-=p.v;if(p.y<-.02){p.y=1.02;p.x=Math.random()}g.beginPath();g.arc(p.x*cv.width,p.y*cv.height,p.r*(devicePixelRatio||1),0,7);g.fillStyle=`rgba(255,${150+Math.round(p.a*80)},${70+Math.round(p.a*60)},${p.a})`;g.fill()}
        raf=requestAnimationFrame(loop)};if(!matchMedia('(prefers-reduced-motion:reduce)').matches)loop()},
    stop(){on=false;cancelAnimationFrame(raf)}}})();
function countUp(el,to,ms){
  if(!el)return;const t0=performance.now(),dur=ms||1400,fmt=el.dataset.fmt||'';
  const step=n=>{const k=Math.min(1,(n-t0)/dur),e=1-Math.pow(1-k,3);el.textContent=fmt.replace('#',num(to*e));if(k<1)requestAnimationFrame(step)};
  if(matchMedia('(prefers-reduced-motion:reduce)').matches){el.textContent=fmt.replace('#',num(to));return}requestAnimationFrame(step);
}
let WR=null;
/* opt.car = รหัสรถ → Wrap ของคันนั้นคันเดียว (กดจากแบนเนอร์ = ทุกคันรวมกัน · onclick ส่ง event มา จึงเช็กก่อน) */
async function wrapped(opt){
  if(WR)return;
  opt=opt&&opt.car?opt:{};
  const s=yearStats(WY(),opt.car);
  const W=D.createElement('div');W.className='wr';W.setAttribute('role','dialog');W.setAttribute('aria-modal','true');W.setAttribute('aria-label','Cendon Wrapped '+s.Y);
  const top=s.topCar&&s.topCar.c,empty=s.entries<3,one=!!(s.only&&top);
  const bkk=Math.round(s.km/690*10)/10;
  const slides=[];
  slides.push({cls:'s-intro',html:`<div class="wr-in"><span class="wr-kick lat">CENDON WRAPPED</span><b class="wr-year">${s.Y}</b><p>${empty?(one?T(`ปีนี้ ${esc(nameOf(top))} มีเรื่องเล่าน้อยไปหน่อย…`,`${esc(nameOf(top))} kept a low profile this year…`):T('ปีนี้รถของคุณมีเรื่องเล่าน้อยไปหน่อย…','Your car kept a low profile this year…')):(one?T(`ปีนี้ ${esc(nameOf(top))} มีเรื่องจะเล่า`,`${esc(nameOf(top))} has a story to tell`):T('ปีนี้รถของคุณมีเรื่องจะเล่า','Your car has a story to tell'))}</p>${top&&!one?`<small>${esc(nameOf(top))}${s.cars.length>1?T(` และอีก ${s.cars.length-1} คัน`,` + ${s.cars.length-1} more`):''}</small>`:''}</div>`});
  if(s.km>0)slides.push({cls:'s-km',html:`<div class="wr-in"><span class="wr-kick">${T('ระยะทางทั้งปี','Distance this year')}</span><b class="wr-big" data-n="${Math.round(s.km)}" data-fmt="#"></b><em>${T('กิโลเมตร','kilometres')}</em><p>${bkk>=1?T(`เท่ากับขับ กรุงเทพ–เชียงใหม่ ${num(bkk)} เที่ยว`,`That's Bangkok–Chiang Mai ${bkk} times`):T('ทุกกิโลเมตรมีความหมาย','Every kilometre counts')}</p><small>${T('จากเลขไมล์และทริปที่บันทึก','From your logged mileage and trips')}</small></div>`});
  if(s.fuel>0)slides.push({cls:'s-fuel',html:`<div class="wr-in"><span class="wr-kick">${T('ค่าน้ำมันทั้งปี','Fuel this year')}</span><b class="wr-big" data-n="${Math.round(s.fuel)}" data-fmt="฿#"></b><p>${T(`เติม ${s.refuels} ครั้ง`,`${s.refuels} fill-ups`)}${s.litres>0?T(` · ${num(s.litres)} ลิตร · เฉลี่ย ฿${(s.fuel/s.litres).toFixed(2)}/ลิตร`,` · ${num(s.litres)} L · avg ฿${(s.fuel/s.litres).toFixed(2)}/L`):''}</p><small>${T(`เท่ากับกาแฟเย็น ~${num(s.fuel/60)} แก้ว`,`About ${num(s.fuel/60)} iced coffees`)}</small></div>`});
  if(s.trips>0)slides.push({cls:'s-trip',html:`<div class="wr-in"><span class="wr-kick">${T('ทริปที่บันทึก','Trips logged')}</span><b class="wr-big" data-n="${s.trips}" data-fmt="#"></b><em>${T('ทริป','trips')}</em>${s.longest&&s.longest.km?`<div class="wr-chip"><i class="ti ti-route-2"></i><div><small>${T('ไกลที่สุด','Longest')}</small><b>${esc(s.longest.title||T('ทริปไม่มีชื่อ','Untitled trip'))} · ${num(s.longest.km)} ${T('กม.','km')}</b></div></div>`:''}</div>`});
  if(s.svc>0)slides.push({cls:'s-care',html:`<div class="wr-in"><span class="wr-kick">${T('การดูแลรถ','Car care')}</span><b class="wr-big" data-n="${s.svc}" data-fmt="#"></b><em>${T('ครั้งที่รถได้รับการดูแล','times your car was looked after')}</em>${s.svcCost>0?`<p>${T('รวม','Total')} ฿${num(s.svcCost)}</p>`:''}${s.topItem?`<div class="wr-chip"><i class="ti ti-tool"></i><div><small>${T('ทำบ่อยที่สุด','Most often')}</small><b>${esc(s.topItem[0])} · ${s.topItem[1]} ${T('ครั้ง','x')}</b></div></div>`:''}</div>`});
  if(s.bestMonth>=0&&s.entries>=4){const M=MONTHS(),mx=Math.max(...s.months);
    slides.push({cls:'s-month',html:`<div class="wr-in"><span class="wr-kick">${T('เดือนที่ยุ่งที่สุด','Busiest month')}</span><b class="wr-mid">${new Date(2026,s.bestMonth,1).toLocaleDateString(LOC(),{month:'long'})}</b><div class="wr-chart">${s.months.map((v,i)=>`<div class="${i===s.bestMonth?'on':''}"><i style="--h:${Math.max(4,Math.round(v/mx*100))}%;--d:${i*60}ms"></i><span>${M[i]}</span></div>`).join('')}</div><small>${T('นับจากบันทึกน้ำมัน ซ่อม และทริป','Counted from fuel, service and trip logs')}</small></div>`})}
  slides.push({cls:'s-name',html:`<div class="wr-in"><span class="wr-kick">${T('ฉายารถของคุณปีนี้','Your car\'s title this year')}</span><div class="wr-name" id="wrName"><span class="wr-dots"><i></i><i></i><i></i></span></div><p id="wrLine"></p></div>`,name:true});
  slides.push({cls:'s-sum',html:`<div class="wr-in sum"><div class="wr-card" id="wrCard"><span class="wr-kick lat">CENDON WRAPPED ${s.Y}</span><b class="wr-cname" id="wrCName">—</b>
    <div class="wr-grid"><div><b>${num(s.km)}</b><small>${T('กม.','km')}</small></div><div><b>฿${num(s.fuel)}</b><small>${T('ค่าน้ำมัน','fuel')}</small></div><div><b>${s.svc}</b><small>${T('ครั้งที่ดูแล','services')}</small></div><div><b>${s.trips}</b><small>${T('ทริป','trips')}</small></div></div>
    <small class="wr-car">${top?esc(nameOf(top)):''}</small></div>
    ${empty?`<p class="wr-tip">${T('บันทึกน้ำมัน ซ่อม และทริปในการาจ — ปีหน้า Wrapped ของคุณจะปังกว่านี้','Log fuel, services and trips in Garage — next year\'s Wrapped will be epic')}</p>`:''}
    <div class="wr-acts"><button type="button" class="wr-b p" id="wrShare"><i class="ti ti-share-3"></i>${T('แชร์','Share')}</button><button type="button" class="wr-b" id="wrSave"><i class="ti ti-download"></i>${T('บันทึกรูป','Save image')}</button><button type="button" class="wr-b" id="wrAgain"><i class="ti ti-refresh"></i>${T('ดูอีกครั้ง','Replay')}</button></div></div>`});
  W.innerHTML=`<div class="wr-bars">${slides.map(()=>'<i><b></b></i>').join('')}</div><button type="button" class="wr-x" aria-label="${T('ปิด','Close')}"><i class="ti ti-x"></i></button>
    <div class="wr-stage">${slides.map((x,i)=>`<section class="wr-s ${x.cls}" data-i="${i}">${x.html}</section>`).join('')}</div>
    <button type="button" class="wr-tap l" aria-label="${T('ก่อนหน้า','Previous')}"></button><button type="button" class="wr-tap r" aria-label="${T('ถัดไป','Next')}"></button>`;
  D.body.appendChild(W);D.body.style.overflow='hidden';fx.start(W);
  /* ซ่อนหน้าการาจด้านหลังทั้งหมดระหว่างดู — Safari บนไอโฟนวาดชั้นสีรถ (ผสมสีแบบคูณ + หน้ากากรูป) ทะลุขึ้นมาทับสตอรี่ได้
     คนที่เลือกสีแดงให้รถจึงเห็นสีแดงบังจอ · หน้าด้านหลังถูกบังอยู่แล้ว ซ่อนไปก็ไม่มีใครเห็นต่าง */
  /* แถบเบราว์เซอร์ (iPhone) ย้อมสีตาม theme-color — ระหว่างดูให้ดำเหมือนสตอรี่ ไม่ใช่สีส้มแดงตั้งต้นของหน้า · จำตำแหน่งเลื่อนไว้คืนตอนปิด */
  const tc=D.querySelector('meta[name="theme-color"]'),tc0=tc&&tc.getAttribute('content'),sy=scrollY;
  if(tc)tc.setAttribute('content','#0b0b0d');
  D.documentElement.classList.add('wr-open');
  WR={W,i:-1,t:0,paused:false,start:0,left:0,DUR:5200,name:null,tc,tc0,sy};
  const bars=[...W.querySelectorAll('.wr-bars i b')],S=[...W.querySelectorAll('.wr-s')];
  const nameP=nickname(s).then(n=>{WR&&(WR.name=n);const a=$('wrName'),b=$('wrLine'),c=$('wrCName');if(a)a.textContent=n.nickname;if(b)b.textContent=n.line;if(c)c.textContent=n.nickname;return n});
  const go=i=>{
    if(!WR)return;i=Math.max(0,Math.min(S.length-1,i));WR.i=i;clearTimeout(WR.t);
    S.forEach((x,k)=>x.classList.toggle('on',k===i));
    bars.forEach((b,k)=>{b.style.transition='none';b.style.width=k<i?'100%':'0%'});
    const cur=S[i];cur.querySelectorAll('[data-n]').forEach(el=>countUp(el,+el.dataset.n));
    const last=i===S.length-1;
    if(!last){requestAnimationFrame(()=>{bars[i].style.transition=`width ${WR.DUR}ms linear`;bars[i].style.width='100%'});WR.start=Date.now();WR.left=WR.DUR;WR.t=setTimeout(()=>go(i+1),WR.DUR)}
    else bars[i].style.width='100%';
  };
  const pause=on=>{if(!WR||WR.i===S.length-1)return;const b=bars[WR.i];
    if(on&&!WR.paused){WR.paused=true;clearTimeout(WR.t);WR.left-=Date.now()-WR.start;const w=getComputedStyle(b).width;b.style.transition='none';b.style.width=w}
    else if(!on&&WR.paused){WR.paused=false;WR.start=Date.now();requestAnimationFrame(()=>{b.style.transition=`width ${Math.max(0,WR.left)}ms linear`;b.style.width='100%'});WR.t=setTimeout(()=>go(WR.i+1),Math.max(0,WR.left))}};
  W.querySelector('.wr-tap.l').onclick=()=>go(WR.i-1);W.querySelector('.wr-tap.r').onclick=()=>go(WR.i+1);
  W.querySelectorAll('.wr-tap').forEach(t=>{t.onpointerdown=()=>pause(true);t.onpointerup=t.onpointerleave=()=>pause(false)});
  W.querySelector('.wr-x').onclick=()=>closeWrapped(true);
  W.addEventListener('keydown',e=>{if(e.key==='ArrowRight')go(WR.i+1);if(e.key==='ArrowLeft')go(WR.i-1);if(e.key==='Escape')closeWrapped(true)});
  $('wrAgain').onclick=()=>go(0);
  const file=async()=>{const n=await nameP;const blob=await shareImage(s,n);return new File([blob],`cendon-wrapped-${s.Y}${one?'-'+String(nameOf(top)).replace(/[^\w\u0E00-\u0E7F-]+/g,'-').slice(0,40):''}.png`,{type:'image/png'})};
  $('wrSave').onclick=async()=>{const f=await file();const a=D.createElement('a');a.href=URL.createObjectURL(f);a.download=f.name;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),4000)};
  $('wrShare').onclick=async()=>{const f=await file();
    try{if(navigator.canShare&&navigator.canShare({files:[f]}))await navigator.share({files:[f],text:T(`Cendon Wrapped ${s.Y} — สรุปปีของรถฉัน`,`My car's ${s.Y} on Cendon Wrapped`)});else $('wrSave').click()}catch(e){}};
  W.tabIndex=-1;W.focus();
  if(window.Nav&&!WR.nav)WR.nav=Nav.push({url:'/garage/wrapped',tag:'wrapped',close:()=>closeWrapped(false)});
  go(0);
}
function closeWrapped(fromUi){
  if(!WR)return;const w=WR;WR=null;clearTimeout(w.t);fx.stop();
  D.documentElement.classList.remove('wr-open');
  if(w.tc&&w.tc0)w.tc.setAttribute('content',w.tc0);
  scrollTo(0,w.sy||0);
  w.W.classList.add('out');setTimeout(()=>w.W.remove(),280);D.body.style.overflow='';
  if(fromUi&&w.nav&&window.Nav)try{Nav.drop(w.nav)}catch(e){}
}
/* รูปแชร์ 1080×1920 (สตอรี่ IG/TikTok/LINE) — ไม่มีทะเบียน ชื่อเจ้าของ หรือที่อยู่ */
async function shareImage(s,n){
  try{await Promise.all(['600 120px Kanit','500 48px Kanit','400 36px Kanit'].map(f=>D.fonts.load(f)))}catch(e){}
  const cv=D.createElement('canvas');cv.width=1080;cv.height=1920;const g=cv.getContext('2d');
  const bg=g.createLinearGradient(0,0,0,1920);bg.addColorStop(0,'#0b0b0d');bg.addColorStop(.55,'#160f0c');bg.addColorStop(1,'#2a130a');g.fillStyle=bg;g.fillRect(0,0,1080,1920);
  const glow=(x,y,r,c)=>{const q=g.createRadialGradient(x,y,0,x,y,r);q.addColorStop(0,c);q.addColorStop(1,'rgba(0,0,0,0)');g.fillStyle=q;g.fillRect(0,0,1080,1920)};
  glow(900,260,620,'rgba(255,138,61,.42)');glow(120,1650,700,'rgba(255,90,60,.26)');
  for(let i=0;i<90;i++){g.beginPath();g.arc((i*137.5)%1080,(i*263.1)%1920,1+((i*7)%3),0,7);g.fillStyle=`rgba(255,${170+(i%5)*12},${90+(i%4)*15},${.18+(i%5)*.08})`;g.fill()}
  g.textAlign='left';g.fillStyle='#ff8a3d';g.font='600 40px Kanit, sans-serif';g.fillText('CENDON WRAPPED',90,190);
  g.fillStyle='#fff';g.font='600 220px Kanit, sans-serif';g.fillText(String(s.Y),80,410);
  g.fillStyle='rgba(255,244,232,.7)';g.font='400 40px Kanit, sans-serif';g.fillText(T('ฉายารถของฉันปีนี้','My car\'s title this year'),90,540);
  const wrap=(t,x,y,w,lh,max)=>{const words=String(t).split(/(\s+)/);let line='',n=0;
    const chars=/[฀-๿]/.test(t)&&words.length<3?Array.from(t):words;
    for(const ch of chars){const test=line+ch;if(g.measureText(test).width>w&&line){g.fillText(line.trim(),x,y+n*lh);line=ch.trim()?ch:'';n++;if(n>=max)return n}else line=test}
    if(line)g.fillText(line.trim(),x,y+n*lh);return n+1};
  g.fillStyle='#fff';g.font='600 104px Kanit, sans-serif';const lines=wrap(n.nickname,90,670,900,118,2);
  g.fillStyle='rgba(255,244,232,.78)';g.font='400 38px Kanit, sans-serif';wrap(n.line||'',90,670+lines*118+20,900,54,3);
  const cells=[[num(s.km),T('กิโลเมตร','kilometres')],['฿'+num(s.fuel),T('ค่าน้ำมัน','on fuel')],[String(s.svc),T('ครั้งที่ดูแลรถ','services')],[String(s.trips),T('ทริป','trips')]];
  cells.forEach(([v,l],i)=>{const x=90+(i%2)*470,y=1180+Math.floor(i/2)*250;
    g.fillStyle='rgba(255,255,255,.07)';const r=36,w=430,h=210;g.beginPath();g.moveTo(x+r,y);g.arcTo(x+w,y,x+w,y+h,r);g.arcTo(x+w,y+h,x,y+h,r);g.arcTo(x,y+h,x,y,r);g.arcTo(x,y,x+w,y,r);g.fill();
    g.fillStyle='#fff';g.font='600 76px Kanit, sans-serif';g.fillText(v,x+36,y+112);g.fillStyle='#ffb35c';g.font='500 34px Kanit, sans-serif';g.fillText(l,x+36,y+168)});
  const top=s.topCar&&s.topCar.c;if(top){g.fillStyle='rgba(255,244,232,.6)';g.font='400 36px Kanit, sans-serif';g.fillText(nameOf(top).slice(0,40),90,1740)}
  g.fillStyle='#ff8a3d';g.font='600 42px Kanit, sans-serif';g.fillText('cendon',90,1830);g.fillStyle='rgba(255,244,232,.55)';g.font='400 30px Kanit, sans-serif';g.textAlign='right';g.fillText(T('สรุปปีของรถคุณ','your car\'s year'),990,1830);
  return new Promise(r=>cv.toBlob(r,'image/png'));
}
/* แบนเนอร์บนหน้าการาจ */
function banner(){
  const list=$('garageList');if(!list||!cars().length)return;
  let b=$('wrBanner');
  if(!b){b=D.createElement('button');b.id='wrBanner';b.type='button';b.className='wr-banner';b.onclick=wrapped;list.parentNode.insertBefore(b,list)}
  const s=yearStats(WY());
  b.innerHTML=`<span class="wr-bk">CENDON WRAPPED</span><b>${s.Y}</b><span class="wr-bt">${T('สรุปปีของรถคุณ — ดูเลย','Your car\'s year in review — watch now')}</span><i class="ti ti-player-play-filled"></i>`;
}

/* ═════════════════ 4) ความลับของการ์ดรถ: ปัดการ์ดพลิก 180° → Wrap ของคันนั้น ═════════════════
   แบบเดียวกับช่องค้นหาหน้าแรก: การ์ดหมุนตามนิ้ว (มือถือ) หรือตามเมาส์ที่ลาก (คอม) · ปล่อยเกินราวหนึ่งในสี่ = พลิก ไม่ถึง = เด้งกลับ
   แนวตั้งยังเลื่อนหน้าได้ปกติ · ลากแล้วปล่อยบนการ์ด ไม่นับเป็นการกดเข้าหน้ารถ · ไม่มีป้ายบอก — เป็นของลับ
   ด้านหลัง = ฉายาและตัวเลขของคันนี้ปีนี้ (คำนวณจากสมุดรถจริงตอนพลิก) + ปุ่มเล่นสตอรี่ Wrap ของคันนี้ */
const carOf=id=>cars().find(c=>c.id===id);
function backHTML(c){
  const s=yearStats(WY(),c.id),hit=LG(nickKey(s),null),n=hit&&hit.nickname?hit:ruleName(s);
  return `<div class="gx-bk"><span class="gx-bk-glow" aria-hidden="true"></span>
    <button type="button" class="gx-bk-x" data-unflip aria-label="${T('พลิกกลับ','Flip back')}"><i class="ti ti-rotate-2"></i></button>
    <span class="gx-bk-k">CENDON WRAPPED ${s.Y}</span>
    <b class="gx-bk-n">${esc(n.nickname)}</b>
    <small class="gx-bk-c">${esc(nameOf(c))}</small>
    <span class="gx-bk-g"><span><b>${num(s.km)}</b><small>${T('กม.','km')}</small></span><span><b>฿${num(s.fuel)}</b><small>${T('ค่าน้ำมัน','fuel')}</small></span><span><b>${s.svc}</b><small>${T('ครั้งที่ดูแล','services')}</small></span><span><b>${s.trips}</b><small>${T('ทริป','trips')}</small></span></span>
    <button type="button" class="gx-bk-play" data-wrap="${esc(c.id)}"><i class="ti ti-player-play-filled"></i>${T('ดู Wrap ของคันนี้','Play this car’s Wrap')}</button></div>`;
}
const turn=(el,deg,anim)=>{el.style.transition=anim?'':'none';el.style.transform=`rotateY(${deg}deg)`};
function setFlip(f,on,dir){
  const fin=f.querySelector('.gx-flipin'),front=f.querySelector('.gx-car'),back=f.querySelector('.gx-back');if(!fin||!back)return;
  if(on&&!back.firstChild){const c=carOf(f.dataset.car);if(!c)return;back.innerHTML=backHTML(c)}
  const rot=(+f.dataset.rot||0)+(on===f.classList.contains('on')?0:(dir||1)*180);f.dataset.rot=rot;
  f.classList.toggle('on',on);f.classList.add('moving');clearTimeout(f._mv);f._mv=setTimeout(()=>f.classList.remove('moving'),760);
  front.inert=on;front.setAttribute('aria-hidden',on);back.inert=!on;back.setAttribute('aria-hidden',!on);
  turn(fin,rot,true);
  if(on){f.classList.remove('burst');void f.offsetWidth;f.classList.add('burst');try{navigator.vibrate&&navigator.vibrate(8)}catch(e){}}
}
let FP=null;
D.addEventListener('pointerdown',e=>{
  const f=e.target.closest&&e.target.closest('.gx-flip');
  if(!f||FP||e.button>0||WR||e.target.closest('button,a,input,select,textarea'))return;
  FP={f,fin:f.querySelector('.gx-flipin'),id:e.pointerId,sx:e.clientX,sy:e.clientY,dx:0,lock:null,w:Math.max(220,f.offsetWidth),t0:performance.now(),rot:+f.dataset.rot||0};
},true);
D.addEventListener('pointermove',e=>{
  const P=FP;if(!P||e.pointerId!==P.id)return;
  const mx=e.clientX-P.sx,my=e.clientY-P.sy;
  if(P.lock===null){
    if(Math.abs(mx)<8&&Math.abs(my)<8)return;
    P.lock=Math.abs(mx)>Math.abs(my)*1.15?'x':'y';if(P.lock==='y'){FP=null;return}
    const back=P.f.querySelector('.gx-back');
    /* เพิ่งเริ่มพลิกจากด้านหน้า → วาดด้านหลังใหม่ ตัวเลขจะได้เป็นของล่าสุด */
    if(back&&!P.f.classList.contains('on')){const c=carOf(P.f.dataset.car);if(c)back.innerHTML=backHTML(c)}
    P.f.classList.add('drag');try{P.f.setPointerCapture(P.id)}catch(x){}
  }
  if(P.lock!=='x')return;
  e.preventDefault();P.dx=mx;turn(P.fin,P.rot+Math.max(-1,Math.min(1,mx/P.w))*180,false);
},{passive:false});
const flipEnd=e=>{
  const P=FP;if(!P||e.pointerId!==P.id)return;FP=null;if(P.lock!=='x')return;
  P.f.classList.remove('drag');
  const v=P.dx/Math.max(1,performance.now()-P.t0),go=Math.abs(P.dx)>P.w*.26||(Math.abs(v)>.55&&Math.abs(P.dx)>24);
  /* ลากแล้วปล่อยบนการ์ด → ไม่นับเป็นการกด (ไม่งั้นเด้งเข้าหน้ารถ) */
  const eat=ev=>{ev.preventDefault();ev.stopPropagation()};D.addEventListener('click',eat,{capture:true,once:true});setTimeout(()=>D.removeEventListener('click',eat,true),400);
  if(go)setFlip(P.f,!P.f.classList.contains('on'),P.dx>0?1:-1);else turn(P.fin,P.rot,true);
};
D.addEventListener('pointerup',flipEnd,true);D.addEventListener('pointercancel',flipEnd,true);
D.addEventListener('click',e=>{
  const u=e.target.closest&&e.target.closest('.gx-back [data-unflip]');if(u){setFlip(u.closest('.gx-flip'),false,-1);return}
  const w=e.target.closest&&e.target.closest('.gx-back [data-wrap]');if(w)wrapped({car:w.dataset.wrap});
});
/* ลากรูปรถบนคอม = ลากการ์ด ไม่ใช่ลากรูปออกไป */
D.addEventListener('dragstart',e=>{if(e.target.closest&&e.target.closest('.gx-flip'))e.preventDefault()});

/* ── ต่อเข้ากับหน้ารถ ── */
function rerender(){try{CL().rerender&&CL().rerender()}catch(e){}}
window.CarExtras={
  cal:paneCal,pass:panePass,wrapped,flip:setFlip,
  after(tab,c){if(tab==='cal')mountCal(c);if(tab==='pass')mountPass(c)},
  _stats:yearStats,_cal:calendar
};
const tickBanner=()=>{try{banner()}catch(e){}};
if(D.readyState==='loading')D.addEventListener('DOMContentLoaded',()=>setTimeout(tickBanner,300));else setTimeout(tickBanner,300);
/* วาดแบนเนอร์ใหม่เมื่อรายการรถถูกวาดใหม่ */
const mo=new MutationObserver(()=>{if(!$('wrBanner'))tickBanner()});
const watchList=()=>{const l=$('garageList');if(l&&l.parentNode)mo.observe(l.parentNode,{childList:true})};
if(D.readyState==='loading')D.addEventListener('DOMContentLoaded',watchList);else watchList();
})();
