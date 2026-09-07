/* Live marketplace. No local success fallback, seeded people, or simulated payments. */
(function(){
  'use strict';
  let me=null, selectedJob=null, lastFocus=null, testList=[], requestId=null;
  const statusNames={requested:'รอช่างเสนอราคา',quoted:'รอยืนยันราคา',accepted:'ยืนยันนัดแล้ว',enroute:'ช่างกำลังเดินทาง',working:'กำลังซ่อม',done:'รอลูกค้าตรวจงาน',completed:'เสร็จสมบูรณ์',cancelled:'ยกเลิกแล้ว',disputed:'แจ้งปัญหาแล้ว'};
  const checkNames={identity:'ตรวจตัวตนและชื่อเจ้าของบัญชี',phone:'โทรยืนยันเบอร์ที่ติดต่อได้',portfolio:'ตรวจผลงานจริงอย่างน้อย 3 งาน',skills:'สัมภาษณ์ทักษะหรือสอบทานใบรับรอง (EV ต้องมีทักษะไฟแรงสูง)',equipment:'ตรวจอู่หรือเครื่องมือช่างนอกสถานที่',terms:'ยืนยันราคา ขอบเขตบริการ และเงื่อนไขรับประกัน'};
  const date=x=>new Date(x).toLocaleString('th-TH',{dateStyle:'medium',timeStyle:'short'});
  const button=(label,fn,primary=false)=>`<button type="button" class="${primary?'p':'s'}" ${fn?`data-action="${fn}"`:''}>${label}</button>`;
  const field=(name,label,type='text',value='',required=true,extra='')=>`<label class="market-field">${label}<input name="${name}" type="${type}" value="${esc(value)}" ${required?'required':''} ${extra}></label>`;
  const area=(name,label,value='',min=5)=>`<label class="market-field">${label}<textarea name="${name}" required minlength="${min}" maxlength="2000">${esc(value)}</textarea></label>`;
  const errorBox='<p class="market-error" id="marketError" role="alert"></p>';
  function error(e){const el=$('marketError');if(el){el.textContent=e.message||String(e);el.scrollIntoView({block:'nearest'})}else toast(e.message||String(e),'ti-alert-triangle');}
  function panel(title,html){
    lastFocus=document.activeElement;
    $('pnT').textContent=title; $('pnB').innerHTML=html;
    $('sheet').classList.add('on'); document.body.style.overflow='hidden';
    const dialog=$('sheet').querySelector('.pn')||$('pnB').parentElement;
    dialog.setAttribute('role','dialog');dialog.setAttribute('aria-modal','true');dialog.setAttribute('aria-labelledby','pnT');
    requestAnimationFrame(()=>{const el=$('pnB').querySelector('input,textarea,button,a'); if(el)el.focus({preventScroll:true});});
  }
  const oldClose=closeSheet;
  closeSheet=function(){oldClose();selectedJob=null;lastFocus?.focus?.({preventScroll:true});};
  document.addEventListener('keydown',e=>{
    if(e.key!=='Tab'||!$('sheet').classList.contains('on'))return;
    const items=[...$('sheet').querySelectorAll('button:not(:disabled),a[href],input:not(:disabled),select,textarea')].filter(x=>x.getClientRects().length);
    if(!items.length)return;
    if(e.shiftKey&&document.activeElement===items[0]){e.preventDefault();items.at(-1).focus();}
    else if(!e.shiftKey&&document.activeElement===items.at(-1)){e.preventDefault();items[0].focus();}
  });
  async function task(fn,form){
    const submit=form?.querySelector('[type="submit"]');if(submit)submit.disabled=true;
    try{await fn()}catch(e){error(e)}finally{if(submit?.isConnected)submit.disabled=false;}
  }
  function wireForm(fn){const form=$('marketForm');form.addEventListener('submit',e=>{e.preventDefault();if(form.reportValidity())task(()=>fn(Object.fromEntries(new FormData(form)),form),form);});}
  function actions(map){$('pnB').querySelectorAll('[data-action]').forEach(b=>b.onclick=()=>task(()=>map[b.dataset.action]?.()));}
  async function signIn(){
    try{
      if(!auth)throw new Error('กำลังเชื่อมต่อบัญชี กรุณาลองอีกครั้ง');
      if(auth.currentUser){await authChanged();return inbox();}
      await auth.signInWithPopup(new firebase.auth.GoogleAuthProvider());
      await authChanged();
    }catch(e){error(e)}
  }
  async function requireMe(){
    if(!auth?.currentUser){panel('เข้าสู่ระบบเพื่อทำรายการ',`<div class="market-empty"><i class="ti ti-user-circle"></i><h3>เก็บทุกงานไว้ในบัญชีเดียว</h3><p>ใช้บัญชี Cendon เดิม เพื่อติดตามนัด พูดคุยกับช่าง และดูประวัติงานจากอุปกรณ์อื่น</p>${button('เข้าสู่ระบบด้วย Google','login',true)}${errorBox}</div>`);actions({login:signIn});return null;}
    me=await api('/api/tech/me'); CAN=me.admin;return me;
  }
  async function authChanged(){
    me=null;testList=[];
    $('marketAuth').textContent=auth?.currentUser?'บัญชีของฉัน':'เข้าสู่ระบบ';
    if(auth?.currentUser){try{me=await api('/api/tech/me');CAN=me.admin;}catch{CAN=false;}}
    else CAN=false;
    adminBar();run();
  }
  function findTech(id){return [...Techs.all(),...testList].find(x=>x.id===id);}
  openTech=function(id){
    const t=findTech(id);if(!t)return;
    panel(t.shop||t.name,`<div class="market-profile"><span class="market-monogram">${esc(t.name[0])}</span><div><p class="market-kicker">${t.test?'บัญชีทดสอบ · เฉพาะผู้ดูแล':'CENDON CARE / ช่างในระบบ'}</p><h2>${esc(t.name)}</h2><p>${esc(t.area)||'ยังไม่ระบุพื้นที่'}</p></div></div>
      <div class="market-metrics"><span><b>${t.reviewCount?Number(t.rating).toFixed(1):'—'}</b> ${t.reviewCount?'คะแนนจาก '+t.reviewCount+' รีวิว':'ยังไม่มีรีวิว'}</span><span><b>${t.jobs||0}</b> งานสำเร็จ</span><span><b>${t.years||0}</b> ปีประสบการณ์</span></div>
      <p class="market-copy">${esc(t.about)||'บัญชีนี้ใช้ทดสอบขั้นตอนรับงาน'}</p><div class="market-tags">${(t.skills||[]).map(s=>`<span>${esc(s)}</span>`).join('')}</div>
      <div class="market-facts"><p><span>ราคาเริ่มต้น</span><strong>฿${money(t.from)}</strong></p><p><span>รูปแบบบริการ</span><strong>${t.mobile?'ถึงที่ / ที่อู่':'ที่อู่'}</strong></p><p><span>รัศมีบริการที่แจ้ง</span><strong>${t.radius||0} กม.</strong></p><p><span>รับประกันโดยช่าง</span><strong>${t.warranty||0} วัน ตามขอบเขตที่ตกลง</strong></p></div>
      <div class="market-note">${t.test?'บัญชีทดสอบยังไม่ผ่านการคัดกรอง ไม่แสดงให้ลูกค้าทั่วไปเห็น':'ตรวจตัวตน ผลงาน และความพร้อมโดยทีมงานแล้ว'} · ราคาจริงและค่าเดินทางจะระบุในใบเสนอราคาก่อนยืนยัน</div>
      <div class="acts">${button('ขอราคาและนัดช่าง','book',true)}${CAN?button('พักการแสดงผล','suspend'):''}</div>${errorBox}`);
    actions({book:()=>booking(id),suspend:async()=>{await api('/api/tech/moderate',{method:'POST',body:{id,suspend:true}});closeSheet();await reload();}});
  };
  card=function(t){return `<button class="pro" data-id="${esc(t.id)}"><span class="face">${esc(t.name?.[0]||'C')}</span><span class="b"><span class="nm">${esc(t.shop||t.name)}${t.verified?'<i class="ti ti-rosette-discount-check vf" title="ผ่านการตรวจโดยทีมงาน"></i>':''}</span><span class="shop">${esc(t.name)}</span><span class="where">${esc(t.area)} · ${t.mobile?'ออกนอกสถานที่':'รับที่อู่'}</span><span class="skills">${(t.skills||[]).slice(0,3).map(x=>`<span>${esc(x)}</span>`).join('')}</span><span class="market-rating"><i class="ti ti-star"></i> ${t.reviewCount?Number(t.rating).toFixed(1)+' ('+t.reviewCount+')':'ยังไม่มีรีวิว'} · ${t.jobs||0} งานสำเร็จ</span><span class="foot"><span>เริ่ม <b class="pz">฿${money(t.from)}</b></span><span class="sp"></span><span>ดูบริการ <i class="ti ti-arrow-up-right"></i></span></span></span></button>`;};
  const originalRun=run;
  run=function(){
    originalRun();
    if(!Techs.all().length){
      $('list').innerHTML=`<div class="market-empty"><div class="market-empty-symbol"><i class="ti ${Techs.loading?'ti-loader':Techs.error?'ti-cloud-off':'ti-tool'}"></i></div><p class="market-kicker">${Techs.loading?'กำลังเชื่อมต่อ':Techs.error?'CONNECTION':'YOUR NEXT REPAIR'}</p><h2>${Techs.loading?'กำลังค้นหาช่างในระบบ':Techs.error?'ยังโหลดรายชื่อไม่ได้':'ช่างคนที่ใช่ กำลังจะมา'}</h2><p>${Techs.error?'ลองเชื่อมต่ออีกครั้ง รายชื่อจะแสดงเมื่อได้รับข้อมูลจากระบบ':Techs.loading?'รอสักครู่':'พื้นที่นี้เปิดสำหรับช่างที่ผ่านการตรวจแล้ว เมื่อมีช่างพร้อมรับงาน คุณจะเลือกดูบริการและขอราคาได้ที่นี่'}</p><div>${Techs.error?'<button class="p" onclick="reload()">ลองใหม่</button>':'<button class="p" onclick="openApply()">ร่วมเป็นช่างกับ Cendon</button>'}</div></div>`;
    }
  };
  reload=async function(){await Techs.load(BACKEND_URL);drawCats();run();};
  aiJob=id=>booking(id);
  async function booking(techId){
    if(!await requireMe())return;
    const t=findTech(techId);if(!t)throw new Error('ไม่พบช่าง กรุณาโหลดรายชื่อใหม่');
    requestId=crypto.randomUUID();
    panel('ขอราคาและนัดหมาย',`<p class="market-kicker">ส่งถึง ${esc(t.shop||t.name)}</p><h2>เล่าอาการให้ช่างฟัง</h2><p class="market-copy">คำขอนี้ยังไม่มีค่าใช้จ่าย รอช่างเสนอราคาและเวลานัดก่อนยืนยัน</p><form id="marketForm" class="market-form">${field('car','รถ / รุ่น / ปี','text','',true,'maxlength="200"')}${area('symptom','อาการและงานที่อยากให้ช่วย',S.q,10)}<div class="two">${field('area','เขต / อำเภอ / จังหวัด','text','',true,'minlength="4" maxlength="160"')}${field('phone','เบอร์โทรติดต่อ','tel','',true,'pattern="0[0-9]{8,9}"')}</div>${area('address','ที่อยู่และจุดสังเกต (ช่างเห็นหลังยืนยันงาน)','',8)}${field('requestedTime','วันและช่วงเวลาที่สะดวก','text','',true,'minlength="4" maxlength="160"')}<label class="market-field">รูปแบบบริการ<select name="mode">${t.mobile?'<option value="mobile">ให้ช่างมาหาถึงที่</option>':''}<option value="shop">นำรถไปที่อู่</option></select></label><p class="market-note">เบอร์โทรกับที่อยู่ละเอียดจะเปิดให้ช่างหลังคุณยืนยันราคา ใช้เบอร์จริงสำหรับนัดหมาย ไม่มีบริการเบอร์กลาง</p>${errorBox}<button class="p" type="submit">ส่งคำขอราคา <i class="ti ti-arrow-right"></i></button></form>`);
    wireForm(async values=>{const result=await api('/api/tech/jobs',{method:'POST',body:{...values,id:requestId,techId}});await job(result.id||result.job.id);});
  }
  async function inbox(all=false){
    if(!await requireMe())return;
    panel(all?'งานทั้งหมด / ผู้ดูแล':'งานของฉัน',`<div class="market-empty"><p>กำลังโหลดใบงาน…</p></div>${errorBox}`);
    const result=await api('/api/tech/jobs'+(all?'?all=1':''));
    $('pnB').innerHTML=`<div class="market-section-head"><p>คำขอ นัดหมาย และประวัติงาน</p>${button('รีเฟรช','refresh')}</div>${result.jobs.length?result.jobs.map(j=>`<button class="market-job" data-job="${j.id}"><span class="market-job-state">${j.test?'ทดสอบ · ':''}${statusNames[j.status]}</span><strong>${esc(j.techName)}</strong><span>${esc(j.symptom)}</span><small>${esc(j.car)} · ${date(j.createdAt)}</small><i class="ti ti-arrow-up-right"></i></button>`).join(''):'<div class="market-empty"><i class="ti ti-clipboard-text"></i><h3>เริ่มใบงานแรกของคุณ</h3><p>เลือกช่างและส่งอาการเพื่อขอราคา เมื่อช่างตอบ คุณจะพบใบเสนอราคาและข้อความที่นี่</p></div>'}${errorBox}`;
    $('pnB').querySelectorAll('[data-job]').forEach(b=>b.onclick=()=>task(()=>job(b.dataset.job)));
    actions({refresh:()=>inbox(all)});
  }
  async function job(id){
    const {job:j}=await api('/api/tech/jobs/'+id);selectedJob=j;
    const customer=['customer','both'].includes(j.role), tech=['technician','both'].includes(j.role);
    const s=j.status, q=j.quote;
    let controls='';
    if(tech&&['requested','quoted'].includes(s))controls+=button('เสนอราคา / แก้ไข','quote',true);
    if(customer&&s==='quoted')controls+=button('ยืนยันราคาและเปิดข้อมูลติดต่อ','accept',true);
    if(tech&&s==='accepted'&&j.mode==='mobile')controls+=button('กำลังเดินทาง','enroute',true);
    if(tech&&['accepted','enroute'].includes(s))controls+=button('เริ่มซ่อม','start',true);
    if(tech&&s==='working')controls+=button('ส่งงานให้ลูกค้าตรวจ','done',true);
    if(customer&&s==='done')controls+=button('ตรวจแล้ว ยืนยันว่างานเสร็จ','complete',true);
    if(customer&&s==='completed'&&!j.review)controls+=button('ให้คะแนนงานนี้','review',true);
    if((customer||tech)&&['requested','quoted','accepted','enroute'].includes(s))controls+=button('ยกเลิกงาน','cancel');
    if((customer||tech)&&['accepted','enroute','working','done','completed'].includes(s))controls+=button('แจ้งปัญหา','dispute');
    if(me?.admin&&s==='disputed')controls+=button('บันทึกผลการช่วยเหลือ','resolve');
    panel('ใบงาน '+id.slice(0,8),`<div class="market-section-head"><span class="market-job-state">${j.test?'งานทดสอบ · ':''}${statusNames[s]}</span>${button('รีเฟรช','refresh')}</div><h2>${esc(j.techName)}</h2><p>${esc(j.car)}</p><p class="market-copy">${esc(j.symptom)}</p><div class="market-facts"><p><span>บริการ</span><strong>${j.mode==='mobile'?'นอกสถานที่':'ที่อู่'}</strong></p><p><span>พื้นที่ / เวลาที่ขอ</span><strong>${esc(j.area)}<br>${esc(j.requestedTime)}</strong></p>${j.address?`<p><span>ที่อยู่ลูกค้า</span><strong>${esc(j.address)}</strong></p>`:''}</div>
      ${q?`<section class="market-quote"><p class="market-kicker">ใบเสนอราคา</p><strong class="market-total">฿${money(q.total)}</strong><div class="market-price-lines"><span>ค่าแรง ฿${money(q.labor)}</span><span>อะไหล่ ฿${money(q.parts)}</span><span>เดินทาง ฿${money(q.travel)}</span></div><p>${esc(q.scope)}</p><p>นัด: ${esc(q.appointment)} · รับประกันโดยช่าง ${q.warranty} วัน</p></section>`:''}
      ${j.acceptedAt?`<section class="market-contact"><h3>ติดต่อนัดหมาย</h3><p>ใช้เบอร์จริงที่ทั้งสองฝ่ายแจ้งไว้</p>${j.customerPhone?`<a href="tel:${esc(j.customerPhone)}"><i class="ti ti-phone"></i> ลูกค้า ${esc(j.customerPhone)}</a>`:''}${/^0\d{8,9}$/.test(j.technicianPhone||'')?`<a href="tel:${esc(j.technicianPhone)}"><i class="ti ti-phone"></i> ช่าง ${esc(j.technicianPhone)}</a>`:'<p>ช่างยังไม่ได้ระบุเบอร์ที่โทรได้ ใช้ข้อความในใบงานเพื่อนัดหมาย</p>'}</section>`:'<p class="market-note">เบอร์โทรและที่อยู่ละเอียดเปิดหลังลูกค้ายืนยันราคาและนัดหมาย</p>'}
      ${j.completion?`<p class="market-note">สรุปการซ่อม: ${esc(j.completion)}</p>`:''}${j.dispute?`<p class="market-error">ปัญหาที่แจ้ง: ${esc(j.dispute)}</p>`:''}${j.resolution?`<p>ผลการช่วยเหลือ: ${esc(j.resolution)}</p>`:''}${j.review?`<p class="market-review"><i class="ti ti-star-filled"></i> ${j.review.rating}/5 · ${esc(j.review.text)}</p>`:''}
      <div class="market-actions">${controls}</div><p class="market-note">ชำระกับช่างตามข้อตกลง Cendon ยังไม่รับชำระหรือพักเงิน การยืนยันว่างานเสร็จไม่ได้เป็นหลักฐานชำระเงิน</p>
      <section class="market-messages"><h3>คุยรายละเอียดงาน</h3>${j.messages.length?j.messages.map(m=>`<div class="market-message ${m.role==='customer'?'customer':''}"><small>${m.role==='customer'?'ลูกค้า':'ช่าง'} · ${date(m.at)}</small><p>${esc(m.text)}</p></div>`).join(''):'<p class="market-copy">แจ้งอาการ เครื่องมือที่ต้องเตรียม และรายละเอียดนัดหมายได้ที่นี่</p>'}</section>
      ${(customer||tech)&&!['completed','cancelled'].includes(s)?`<form id="marketForm" class="market-form">${area('message','ข้อความถึงอีกฝ่าย','',1)}<button type="submit" class="p">ส่งข้อความ</button></form>`:''}
      <details class="market-history"><summary>ประวัติสถานะ (${j.history.length})</summary>${j.history.map(h=>`<p>${date(h.at)} · ${statusNames[h.status]||h.status}</p>`).join('')}</details>${errorBox}<div class="market-actions">${button('กลับไปงานทั้งหมด','back')}</div>`);
    selectedJob=j;
    const update=async(action,body={})=>{await api('/api/tech/jobs/'+id,{method:'POST',body:{action,revision:j.revision,...body}});await job(id);};
    actions({refresh:()=>job(id),back:()=>inbox(),quote:()=>quote(j),accept:()=>confirmAccept(j),
      enroute:()=>update('enroute'),start:()=>update('start'),complete:()=>confirmComplete(j),
      done:()=>noteAction(j,'done','สรุปงานที่ซ่อมเสร็จ'),cancel:()=>noteAction(j,'cancel','เหตุผลที่ยกเลิก'),dispute:()=>noteAction(j,'dispute','รายละเอียดปัญหาที่ต้องการให้ช่วย'),review:()=>noteAction(j,'review','รีวิวงานที่เสร็จแล้ว'),resolve:()=>noteAction(j,'resolve','ผลการช่วยเหลือ / ผู้ดูแล')});
    if($('marketForm'))wireForm(values=>update('message',values));
  }
  async function change(j,action,values={}){await api('/api/tech/jobs/'+j.id,{method:'POST',body:{...values,action,revision:j.revision}});await job(j.id);}
  function quote(j){const q=j.quote||{};panel('ใบเสนอราคา',`<form class="market-form" id="marketForm"><div class="two">${field('labor','ค่าแรง (บาท)','number',q.labor||0,true,'min="0" max="1000000" step="0.01"')}${field('parts','อะไหล่ (บาท)','number',q.parts||0,true,'min="0" max="1000000" step="0.01"')}</div>${field('travel','เดินทาง (บาท)','number',q.travel||0,true,'min="0" max="100000" step="0.01"')}${area('scope','งานที่รวม / ไม่รวม และเงื่อนไข',q.scope||'',10)}${field('appointment','วัน เวลา และจุดนัดหมาย','text',q.appointment||'',true,'minlength="4" maxlength="200"')}${field('warranty','รับประกันงานนี้ (วัน)','number',q.warranty??7,true,'min="0" max="365"')}<p class="market-note">ช่างยินยอมให้เปิดเผยเบอร์ที่สมัครไว้แก่ลูกค้าหลังยืนยันนัด หากต้องเปลี่ยนราคาเพิ่มเติม ต้องตกลงกับลูกค้าและบันทึกหลักฐานก่อนลงมือ</p>${errorBox}<button type="submit" class="p">ส่งใบเสนอราคา</button></form>`);wireForm(v=>change(j,'quote',v));}
  function confirmAccept(j){panel('ยืนยันใบเสนอราคา',`<h2>฿${money(j.quote.total)}</h2><p>${esc(j.quote.scope)}</p><p>นัด: ${esc(j.quote.appointment)}</p><form id="marketForm" class="market-form"><label class="market-check"><input name="consent" type="checkbox" required> ยอมรับขอบเขตงานและราคา ยินยอมเปิดเบอร์โทรและที่อยู่ให้ช่างเพื่อนัดซ่อม</label><p class="market-note">ยังไม่มีการตัดเงินผ่าน Cendon ชำระโดยตรงกับช่างตามข้อตกลง</p>${errorBox}<button type="submit" class="p">ยืนยันนัดหมาย</button></form>`);wireForm(()=>change(j,'accept',{consent:true}));}
  function confirmComplete(j){panel('ตรวจรับงาน',`<h2>งานซ่อมครบตามที่ตกลงแล้ว?</h2><p>${esc(j.completion)}</p><p class="market-note">หากยังมีปัญหา ให้กลับไปแจ้งปัญหาในใบงาน เมื่อยืนยันแล้ว คุณจะให้รีวิวจากงานนี้ได้</p><form id="marketForm" class="market-form"><label class="market-check"><input type="checkbox" required> ตรวจงานแล้วและยืนยันว่าเสร็จสมบูรณ์</label>${errorBox}<button class="p" type="submit">ยืนยันงานเสร็จ</button></form>`);wireForm(()=>change(j,'complete'));}
  function noteAction(j,action,title){panel(title,`<form id="marketForm" class="market-form">${area('note',title,'',action==='cancel'||action==='review'?5:10)}${action==='review'?field('rating','คะแนน 1–5','number',5,true,'min="1" max="5" step="1"'):''}${action==='resolve'?'<label class="market-field">ผลสรุป<select name="outcome"><option value="completed">ปิดงานสำเร็จ</option><option value="cancelled">ยกเลิกงาน</option></select></label>':''}${errorBox}<button type="submit" class="p">บันทึก</button></form>`);wireForm(v=>change(j,action,v));}

  openApply=async function(){try{
    if(!await requireMe())return;
    if(me.application){
      const a=me.application;
      panel('พื้นที่ช่าง',`<p class="market-kicker">${a.test?'บัญชีทดสอบ · ไม่เปิดสาธารณะ':'ใบสมัครของคุณ'}</p><h2>${a.status==='approved'?'พร้อมรับคำขอราคา':a.status==='rejected'?'ต้องปรับข้อมูลเพิ่มเติม':'อยู่ระหว่างตรวจใบสมัคร'}</h2><p>${esc(a.name)} · ${esc(a.area)}</p>${a.review?`<p class="market-note">หมายเหตุจากทีมงาน: ${esc(a.review.note)}</p>`:''}<p>ติดตามคำขอราคาและข้อความจากลูกค้าใน “งานของฉัน” โปรดเปิดดูเป็นประจำ ยังไม่มีการแจ้งเตือนทาง SMS</p><div class="market-actions">${button('เปิดงานของฉัน','inbox',true)}${a.status==='rejected'?button('แก้ไขและส่งใหม่','apply'):''}${me.admin?button('เปิดพื้นที่ทดสอบ','test'):''}</div>${errorBox}`);
      actions({inbox:()=>inbox(),apply:()=>applicationForm(false,a),test:()=>showTests()});return;
    }
    applicationForm(false);
  }catch(e){error(e)}};
  function applicationForm(test=false,a={}){
    if(test&&!me?.admin)return;
    panel(test?'สมัครช่างสำหรับทดสอบ':'สมัครเป็นช่าง Cendon',`<p class="market-kicker">${test?'ADMIN SANDBOX':'BECOME A CARE PARTNER'}</p><h2>${test?'เริ่มทดสอบด้วยชื่อเดียว':'ฝีมือของคุณ มีที่นี่'}</h2><p class="market-copy">${test?'ข้ามเกณฑ์คัดกรอง ใช้บัญชีแอดมินปัจจุบันเป็นเจ้าของช่าง ทดสอบจองและรับงานได้ในบัญชีเดียว ไม่เผยแพร่ให้ผู้ใช้ทั่วไป':'ส่งข้อมูลจริงเพื่อให้ทีมงานตรวจตัวตน โทรยืนยัน และตรวจผลงาน / เครื่องมือก่อนเผยแพร่ ข้อมูลติดต่อไม่แสดงในหน้าค้นหา'}</p><form id="marketForm" class="market-form">${field('name','ชื่อผู้รับงาน','text',a.name||'',true,'maxlength="100"')}${field('shop','ชื่อร้าน / ชื่อบริการ','text',a.shop||'',false,'maxlength="120"')}${field('phone','เบอร์โทร'+(test?' (ไม่บังคับ)':''),'tel',a.phone||'',!test,'pattern="0[0-9]{8,9}"')}
      ${test?'<label class="market-check"><input type="checkbox" name="mobile"> ทดสอบรับงานนอกสถานที่</label>':`${field('area','เขต / อำเภอ / จังหวัด','text',a.area||'',true,'minlength="4" maxlength="160"')}<div class="two">${field('age','อายุ','number',a.age||'',true,'min="18" max="100"')}${field('years','ประสบการณ์ (ปี)','number',a.years||'',true,'min="1" max="80"')}</div>${area('experience','ประสบการณ์ / อู่เดิม / บุคคลอ้างอิงเพื่อให้ทีมงานตรวจสอบ',a.experience||'',10)}${area('about','ความถนัด เครื่องมือ และงานที่ไม่รับ',a.about||'',40)}<div class="two">${field('from','ราคาเริ่มต้น (บาท)','number',a.from||'',true,'min="1" max="1000000"')}${field('warranty','รับประกันโดยช่าง (วัน)','number',a.warranty||7,true,'min="7" max="365"')}</div>${field('radius','รัศมีบริการ (กม.)','number',a.radius??20,true,'min="0" max="200"')}<fieldset class="market-options"><legend>หมวดงานที่รับ (อย่างน้อย 1)</legend>${Techs.CATS.filter(c=>['body','ev','tyre','air','eng'].includes(c.id)).map(c=>`<label class="market-check"><input type="checkbox" name="cats" value="${c.id}" ${a.cats?.includes(c.id)?'checked':''}>${esc(c.th)}</label>`).join('')}</fieldset><label class="market-check"><input type="checkbox" name="mobile" ${a.mobile?'checked':''}> ออกนอกสถานที่ได้</label><label class="market-check"><input type="checkbox" name="urgent" ${a.urgent?'checked':''}> รับงานด่วน (ขึ้นกับการยืนยันนัด)</label>${[0,1,2].map(i=>field('portfolio','ลิงก์ผลงานจริง '+(i+1),'url',a.portfolio?.[i]||'',true,'pattern="https://.*" maxlength="500"')).join('')}<p class="market-note">ใช้ลิงก์รูปผลงานที่ทีมงานเปิดดูได้ กรุณาปิดข้อมูลลูกค้าบนรูป ไม่แนบบัตรประชาชนหรือข้อมูลสำคัญลงลิงก์สาธารณะ ทีมงานจะประสานขั้นตอนตรวจตัวตนแยกต่างหาก</p><label class="market-check"><input type="checkbox" name="consent" required> ยืนยันว่าเป็นผลงานของตนเอง ยินยอมให้ทีมงานติดต่อเพื่อตรวจสอบ และเปิดเบอร์ให้ลูกค้าหลังยืนยันใบงาน รับผิดชอบขอบเขตงานและรับประกันตามที่เสนอ</label>`}
      ${errorBox}<button type="submit" class="p">${test?'สร้างบัญชีช่างทดสอบ':'ส่งใบสมัครให้ทีมงานตรวจ'}</button></form>${me?.admin&&!test?'<div class="market-admin-note">สำหรับผู้ดูแล: <button data-action="test">สมัครแบบทดสอบ ข้ามเกณฑ์ทั้งหมด</button></div>':''}`);
    actions({test:()=>applicationForm(true)});
    wireForm(async(v,form)=>{
      const f=new FormData(form),values={...v,test,mobile:f.has('mobile'),urgent:f.has('urgent'),consent:f.has('consent'),cats:f.getAll('cats'),portfolio:f.getAll('portfolio')};
      await api('/api/tech/apply',{method:'POST',body:values});
      me=await api('/api/tech/me');await openApply();toast(test?'สร้างช่างทดสอบแล้ว':'เซิร์ฟเวอร์รับใบสมัครแล้ว');
    });
  }
  openAdmin=()=>task(async()=>{if(!await requireMe())return;if(!me.admin)throw new Error('เฉพาะผู้ดูแล');if(me.technician)return showTests();applicationForm(true);});
  adminBar=function(){const host=$('adminBar');if(!CAN){host.innerHTML='';return;}host.innerHTML='<div class="abar"><span class="ab-t"><i class="ti ti-adjustments"></i> พื้นที่ผู้ดูแล</span><button class="ab-b" onclick="openAdmin()">ช่างทดสอบ</button><button class="ab-b" onclick="openPending()">ตรวจใบสมัคร</button><button class="ab-b" onclick="Marketplace.inbox(true)">งานและปัญหาทั้งหมด</button></div>';};
  async function showTests(){
    if(!await requireMe())return;if(!me.admin)throw new Error('เฉพาะผู้ดูแล');
    testList=(await api('/api/tech?test=1')).techs;
    panel('พื้นที่ทดสอบ',`<p class="market-note">เห็นได้เฉพาะแอดมิน ไม่รวมในรายชื่อช่างจริง และไม่ใช้สร้างคะแนนสาธารณะ</p>${testList.map(t=>`<button class="market-job" data-test="${t.id}"><strong>${esc(t.name)}</strong><span>เปิดโปรไฟล์เพื่อทดสอบขอราคาและรับงาน</span></button>`).join('')||'<p>ยังไม่มีช่างทดสอบ</p>'}${!me.technician?button('สมัครช่างทดสอบ','create',true):''}${errorBox}`);
    $('pnB').querySelectorAll('[data-test]').forEach(b=>b.onclick=()=>openTech(b.dataset.test));actions({create:()=>applicationForm(true)});
  }
  openPending=async function(){try{
    if(!await requireMe())return;if(!me.admin)throw new Error('เฉพาะผู้ดูแล');
    panel('ตรวจใบสมัคร',`<p>กำลังโหลด…</p>${errorBox}`);
    const list=(await api('/api/tech/applications')).applications;
    $('pnB').innerHTML=`<p class="market-note">อนุมัติเมื่อทีมงานตรวจครบจริง ช่างจะเริ่มด้วย 0 งานและยังไม่มีรีวิว</p>${list.map((a,i)=>`<button class="market-job" data-app="${i}"><strong>${esc(a.name)}</strong><span>${esc(a.shop)} · ${esc(a.area)}</span></button>`).join('')||'<div class="market-empty"><i class="ti ti-inbox"></i><h3>ไม่มีใบสมัครรอตรวจ</h3></div>'}${errorBox}`;
    $('pnB').querySelectorAll('[data-app]').forEach(b=>b.onclick=()=>reviewApplication(list[Number(b.dataset.app)]));
  }catch(e){error(e)}};
  function reviewApplication(a){
    panel('ตรวจใบสมัคร '+a.name,`<h2>${esc(a.shop||a.name)}</h2><p>${esc(a.name)} · ${esc(a.phone)} · ${esc(a.area)}</p><p>อายุ ${a.age} · ประสบการณ์ ${a.years} ปี · เริ่ม ฿${money(a.from)} · รับประกัน ${a.warranty} วัน</p><p class="market-copy">${esc(a.about)}</p><p>ประสบการณ์ / อ้างอิง: ${esc(a.experience)}</p><div class="market-actions">${a.portfolio.map((url,i)=>`<a class="s" href="${esc(url)}" target="_blank" rel="noopener noreferrer">ผลงาน ${i+1} ↗</a>`).join('')}</div><form id="marketForm" class="market-form"><fieldset class="market-options"><legend>หลักฐานที่ทีมงานตรวจแล้ว</legend>${Object.entries(checkNames).map(([k,label])=>`<label class="market-check"><input type="checkbox" name="${k}">${label}</label>`).join('')}</fieldset>${area('note','บันทึกสิ่งที่ตรวจ / สาเหตุที่ให้แก้ไข','',10)}<label class="market-field">ผลการตรวจ<select name="decision"><option value="approve">อนุมัติ (ต้องตรวจครบทุกข้อ)</option><option value="reject">ให้แก้ไขและสมัครใหม่</option></select></label>${errorBox}<button type="submit" class="p">บันทึกผลตรวจ</button></form>`);
    wireForm(async(v,form)=>{const f=new FormData(form);await api('/api/tech/review',{method:'POST',body:{uid:a.uid,revision:a.revision,decision:v.decision,note:v.note,checks:Object.fromEntries(Object.keys(checkNames).map(k=>[k,f.has(k)]))}});await openPending();await reload();});
  }
  openTrust=function(){panel('จองผ่าน Cendon ได้อะไร',`<p class="market-kicker">CARE THAT STAYS WITH YOU</p><h2>คุยกันได้<br>เก็บข้อตกลงไว้ด้วย</h2><div class="market-benefits"><section><b>01 / ก่อนซ่อม</b><h3>เห็นราคาทั้งงาน</h3><p>ช่างแจกแจงค่าแรง อะไหล่ ค่าเดินทาง ขอบเขตงานและวันนัด คุณยืนยันก่อนเริ่ม</p></section><section><b>02 / ระหว่างซ่อม</b><h3>โทรนัดหมายได้จริง</h3><p>หลังยืนยันงาน ทั้งสองฝ่ายเห็นเบอร์จริงและที่อยู่ลูกค้า แนะนำให้บันทึกการเปลี่ยนแปลงราคาไว้ในใบงาน</p></section><section><b>03 / หลังซ่อม</b><h3>ประวัติและคะแนนอยู่กับคุณ</h3><p>เก็บข้อตกลง ข้อความและสรุปการซ่อมไว้ในงานเดียว รีวิวได้เฉพาะลูกค้าที่ปิดงานสำเร็จ</p></section></div><p class="market-note">ขณะนี้ไม่มีการรับชำระเงิน เงินพัก ประกันจาก Cendon หรือเบอร์กลาง การรับประกันเป็นข้อตกลงของช่างตามใบเสนอราคา แจ้งปัญหาในใบงานให้ผู้ดูแลตรวจสอบได้ แต่ไม่มีคำรับรองการชดเชยหรือเวลาตอบ</p><a class="s" href="terms.html">อ่านเงื่อนไขการใช้งาน ↗</a>`);};
  window.Marketplace={inbox:(all)=>task(()=>inbox(all)),signIn,authChanged};
  // The existing search and Firebase boot continue to own their own state.
  run();adminBar();
})();
