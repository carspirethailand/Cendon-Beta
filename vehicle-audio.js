/* Recording-specific vehicle choice. No storage, network, device access or Garage writes.
   ไม่ถามก่อนฟัง: ใช้รถที่เลือกอยู่เป็นค่าเริ่มต้น แสดงเป็นป้ายบนจอ แตะเพื่อเปลี่ยน */
(() => {
  'use strict';
  const clean=(v,n=90)=>typeof v==='string'||typeof v==='number'?String(v).replace(/[\u0000-\u001f<>]/g,' ').replace(/\s+/g,' ').trim().slice(0,n):'';
  const esc=v=>clean(v,300).replace(/[&"']/g,c=>({'&':'&amp;','"':'&quot;',"'":'&#39;'}[c]));
  function car(c={}){
    if(!c||typeof c!=='object')return {};
    c={...c,...Object.fromEntries(Object.entries(c.info||{}).filter(([k])=>['model_year','engine','engine_code','fuel','market'].includes(k)))};
    const words=clean(c.name).split(/\s+/),validYear=y=>/^(19|20)\d{2}$/.test(String(y||''))&&+y>=1950&&+y<=new Date().getFullYear()+1;
    const year=validYear(c.model_year)?String(c.model_year):validYear(c.year)?String(c.year):'';
    return Object.fromEntries(Object.entries({make:clean(c.make||words[0]),model:clean(c.model||words.slice(1).join(' ')),year,engine:clean(c.engine,80),engine_code:clean(c.engine_code,24),fuel:clean(c.fuel||c.fuelType,30),mileage:clean(c.mileage,12),market:clean(c.market||c.country,40),kind:clean(c.kind||c.vehicle_type,20)}).filter(([,v])=>v));
  }
  const label=c=>{const v=car(c);return [v.make,v.model,v.year,v.engine,v.engine_code].filter(Boolean).join(' ')};
  const key=c=>JSON.stringify([clean(c?.id),car(c)]);
  function choice(source,saved,other){
    if(!['garage_confirmed','other_confirmed','unknown'].includes(source))throw Error('Choose the vehicle in this recording first');
    if(source==='garage_confirmed'&&!label(saved))throw Error('Select a Garage car, or choose another/unknown vehicle');
    return {version:1,source,vehicle:source==='garage_confirmed'?car(saved):source==='other_confirmed'?car(other):{},...(source==='garage_confirmed'?{garageKey:key(saved)}:{})};
  }
  const current=(v,saved)=>v?.version===1&&v.source&& (v.source!=='garage_confirmed'||v.garageKey===key(saved));
  const payload=v=>({version:1,source:v.source,vehicle:car(v.vehicle)});
  /* ค่าเริ่มต้น = รถที่เลือกอยู่ในการาจ (ไม่ต้องถามก่อน) · ไม่มีรถในการาจ = ไม่ระบุรุ่น
     ป้ายรถอยู่บนจอตลอด แตะเปลี่ยนได้ — ไม่แตะคือยอมรับคันนี้ */
  const defaultChoice=saved=>label(saved)?choice('garage_confirmed',saved):choice('unknown',saved);
  /* "รถคันอื่น" ช่องเดียว: "Mazda 2 ปี 2018" → ยี่ห้อ/รุ่น/ปี (ปี พ.ศ. แปลงเป็น ค.ศ.) ไม่ต้องครบ */
  function parseOther(text){
    let s=clean(text,90),year='';
    s=s.replace(/(?:ปี|รุ่นปี|year)?\s*\b((?:19|20)\d{2}|25\d{2})\b/i,(m,y)=>{const n=+y;year=String(n>2400?n-543:n);return ' '}).replace(/\s+/g,' ').trim();
    const w=s.split(' ').filter(Boolean);
    return Object.fromEntries(Object.entries({make:w[0]||'',model:w.slice(1).join(' '),year}).filter(([,v])=>v));
  }
  const ART=['sedan','coupe','mpv','pickup','van'];
  const artOf=c=>{const t=String(c?.type||c?.body||c?.kind||'').toLowerCase();return '/img/cars/'+(ART.includes(t)?t:t==='suv'||t==='ppv'?'mpv':t==='truck'?'pickup':'sedan')+'.webp'};
  const CAR_ICO='<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 17a2 2 0 1 0 4 0a2 2 0 1 0-4 0M15 17a2 2 0 1 0 4 0a2 2 0 1 0-4 0M5 17H3v-6l2-5h9l4 5h1a2 2 0 0 1 2 2v4h-2m-4 0H9m-6-6h15m-6 0V6"/></svg>';
  const WAVE_ICO='<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 12h2l2-6l3 12l3-9l2 6l2-3h4"/></svg>';
  const pillText=(v,en)=>{const l=v?label(v.vehicle):'';return l||(v?.source==='other_confirmed'?(en?'Another car':'รถคันอื่น'):(en?'Vehicle not specified':'ไม่ระบุรุ่น'))};
  /* ป้ายรถเล็ก ๆ แทนช่องเลือก — fieldset ไว้ให้หน้าที่เรียกปิดได้ทั้งก้อนตอนกำลังอัด */
  function picker(prefix,saved,value,lang='th'){
    const en=lang==='en',v=current(value,saved)?value:defaultChoice(saved);
    return `<fieldset class="va-pick" id="${prefix}Picker"><button type="button" class="va-pill" id="${prefix}Pill" aria-haspopup="dialog" aria-label="${en?'Vehicle in this recording: ':'รถในเสียงนี้: '}${esc(pillText(v,en))} ${en?'— tap to change':'แตะเพื่อเปลี่ยน'}"><span class="va-pill-ic">${v.source==='unknown'?WAVE_ICO:CAR_ICO}</span><span class="va-pill-t" id="${prefix}PillT">${esc(pillText(v,en))}</span><span class="va-pill-ch">${en?'Change':'เปลี่ยน'}</span></button></fieldset>`;
  }
  /* bind: ใส่ค่าเริ่มต้นให้ทันที (ถ้ายังไม่มีค่าที่ใช้ได้) · แตะป้าย = แผ่นเลือกรถ
     opts: {value, cars:[รถในการาจทั้งหมด], lang, host, onOpen, onClose} */
  function bind(prefix,saved,onChange,opts={}){
    const D=document,pill=D.getElementById(prefix+'Pill');if(!pill)return;
    const en=(opts.lang||'th')==='en',t=(th,eng)=>en?eng:th;
    let v=current(opts.value,saved)?opts.value:null;
    if(!v){v=defaultChoice(saved);onChange(v);}
    const paint=()=>{const n=D.getElementById(prefix+'PillT');if(n)n.textContent=pillText(v,en);pill.querySelector('.va-pill-ic').innerHTML=v.source==='unknown'?WAVE_ICO:CAR_ICO;pill.setAttribute('aria-label',t('รถในเสียงนี้: ','Vehicle in this recording: ')+pillText(v,en)+' '+t('แตะเพื่อเปลี่ยน','— tap to change'));};
    pill.onclick=()=>{
      const host=opts.host||pill.closest?.('.ct-layer')||D.body,others=(opts.cars||[]).filter(c=>c&&label(c)&&key(c)!==key(saved)).slice(0,6);
      const opt=[];
      if(label(saved))opt.push({k:'g',src:'garage_confirmed',c:saved,t:label(saved),s:t('ในการาจ · คันที่เลือกอยู่','In Garage · selected'),art:artOf(saved)});
      others.forEach((c,i)=>opt.push({k:'o'+i,src:'other_confirmed',c,t:label(c),s:t('ในการาจ','In Garage'),art:artOf(c)}));
      opt.push({k:'x',src:'other_confirmed',t:t('รถคันอื่น · รถเพื่อน','Another car · a friend’s'),s:t('พิมพ์รุ่นช่องเดียว ไม่ต้องครบ','One line, any detail'),ic:CAR_ICO});
      opt.push({k:'u',src:'unknown',t:t('ไม่ระบุรุ่น','Don’t specify'),s:t('ให้ AI บอกลักษณะเสียงอย่างเดียว','AI describes the sound only'),ic:WAVE_ICO});
      const isText=v.source==='other_confirmed'&&!opt.some(o=>o.c&&key(o.c)===key(v.vehicle)&&o.src===v.source);
      let pick=v.source==='garage_confirmed'?'g':v.source==='unknown'?'u':isText?'x':(opt.find(o=>o.c&&JSON.stringify(car(o.c))===JSON.stringify(v.vehicle))||{k:'x'}).k;
      const prev=isText?[v.vehicle.make,v.vehicle.model,v.vehicle.year].filter(Boolean).join(' '):'';
      const bg=D.createElement('div');bg.className='va-sheet-bg';
      const sh=D.createElement('section');sh.className='va-sheet';sh.setAttribute('role','dialog');sh.setAttribute('aria-modal','true');sh.setAttribute('aria-labelledby',prefix+'SheetT');
      sh.innerHTML=`<div class="va-grab" aria-hidden="true"></div><h2 id="${prefix}SheetT">${t('เสียงนี้มาจากรถคันไหน','Which vehicle is in this recording?')}</h2><p class="va-sub">${t('ไม่แก้ข้อมูลในการาจ','Garage records stay unchanged')}</p>
        <div class="va-opts" role="radiogroup" aria-labelledby="${prefix}SheetT">${opt.map(o=>`<div class="va-opt-w" data-k="${o.k}"><button type="button" class="va-opt" role="radio" data-k="${o.k}" aria-checked="${o.k===pick}"><span class="va-art">${o.art?`<img src="${esc(o.art)}" alt="" onerror="this.hidden=true;this.nextElementSibling.hidden=false"><span hidden>${CAR_ICO}</span>`:o.ic}</span><span class="va-tx"><b>${esc(o.t)}</b><small>${esc(o.s)}</small></span><span class="va-dot" aria-hidden="true"></span></button>${o.k==='x'?`<label class="va-other" ${pick==='x'?'':'hidden'}><span>${t('ยี่ห้อ รุ่น ปี (ไม่บังคับ)','Make, model, year (optional)')}</span><input id="${prefix}OtherIn" maxlength="80" autocomplete="off" value="${esc(prev)}" placeholder="${t('เช่น Mazda 2 ปี 2018','e.g. Mazda 2 2018')}"></label>`:''}</div>`).join('')}</div>
        <button type="button" class="va-go" id="${prefix}Go"></button><small class="va-fine">${t('AI บอกรุ่นรถจากเสียงอย่างเดียวไม่ได้ — ระบุรุ่นช่วยให้ฟังแม่นขึ้น','Audio alone cannot identify a make or model — naming it helps')}</small>`;
      host.appendChild(bg);host.appendChild(sh);
      const go=sh.querySelector('#'+prefix+'Go'),input=sh.querySelector('#'+prefix+'OtherIn');
      const sync=()=>{sh.querySelectorAll('.va-opt').forEach(b=>b.setAttribute('aria-checked',String(b.dataset.k===pick)));const lb=sh.querySelector('.va-other');if(lb)lb.hidden=pick!=='x';
        go.textContent=pick==='u'?t('ฟังโดยไม่ระบุรุ่น','Continue without a model'):pick==='x'?t('ใช้รุ่นนี้','Use this'):t('ใช้คันนี้','Use this car')};
      sh.querySelectorAll('.va-opt').forEach(b=>b.onclick=()=>{pick=b.dataset.k;sync();if(pick==='x'&&input)setTimeout(()=>{try{input.focus()}catch(e){}},60)});
      const close=()=>{bg.remove();sh.remove();D.removeEventListener('keydown',esc_);opts.onClose?.(v);try{pill.focus()}catch(e){}};
      const esc_=e=>{if(e.key==='Escape')close()};D.addEventListener('keydown',esc_);
      bg.onclick=close;
      go.onclick=()=>{const o=opt.find(x=>x.k===pick)||opt[opt.length-1];
        v=o.k==='x'?choice('other_confirmed',saved,parseOther(input?.value||'')):o.src==='garage_confirmed'?choice('garage_confirmed',saved):o.src==='unknown'?choice('unknown',saved):choice('other_confirmed',saved,o.c);
        paint();onChange(v);close()};
      sync();opts.onOpen?.();
      setTimeout(()=>{try{(sh.querySelector('.va-opt[aria-checked="true"]')||go).focus()}catch(e){}},40);
    };
    paint();
  }
  const prompt=c=>'\nSaved Garage candidate (not proof of the car now heard): '+JSON.stringify(car(c))+' Never identify make/model/year from audio. Ask whether this is the saved car or another car; use listen_engine and wait for its result. A user-selected recording vehicle overrides old assistant guesses, but never changes Garage records.';
  function recording(stream,source='dedicated_microphone'){
    const settings=stream?.getAudioTracks?.()[0]?.getSettings?.()||{},processing={};
    for(const k of ['echoCancellation','noiseSuppression','autoGainControl'])if(typeof settings[k]==='boolean')processing[k]=settings[k];
    return {source,processing,...(Number.isFinite(settings.sampleRate)?{sampleRate:settings.sampleRate}:{})};
  }
  function researchMarkup(r,lang='th'){
    if(!r)return '';
    const en=lang==='en',lines=(r.sources||[]).slice(0,3).map(s=>{
      try{const u=new URL(s.url);if(u.protocol!=='https:'||u.username||u.password)return '';
        return '<li><a href="'+esc(u.href)+'" target="_blank" rel="noopener noreferrer">'+esc(s.title||u.hostname)+'</a> · '+(s.status==='read'?(en?'page read; applicability unconfirmed':'อ่านหน้าเว็บแล้ว ยังต้องตรวจว่าใช้กับรุ่นนี้หรือไม่'):(en?'link only; not read':'พบลิงก์ ยังไม่ได้อ่าน'))+'</li>';
      }catch{return ''}
    }).filter(Boolean);
    const curated=(r.manufacturerEvidence?.records||[]).slice(0,4).map(s=>{
      try{const u=new URL(s.url);if(u.protocol!=='https:'||u.hostname!=='static.nhtsa.gov'||u.username||u.password)return '';
        return '<li><a href="'+esc(u.href)+'" target="_blank" rel="noopener noreferrer">'+esc(s.title)+'</a> · '+(en?'Source market: ':'เอกสารตลาด ')+esc((s.markets||[]).join(', '))+' · '+(en?'vehicle applicability unconfirmed':'ยังไม่ยืนยันใช้กับรถคันนี้')+'</li>';
      }catch{return ''}
    }).filter(Boolean);
    return '<section class="va-research"><b>'+(en?'Internet references':'ข้อมูลอ้างอิงจากอินเทอร์เน็ต')+'</b><p>'+(r.status==='found'?(en?'Documents found, not a confirmed fault or recall.':'พบเอกสาร ไม่ใช่การยืนยันอาการเสียหรือการเรียกคืน'):r.status==='links_only'?(en?'Links found, content not verified.':'พบลิงก์ แต่ยังตรวจเนื้อหาไม่ได้'):r.status==='needs_vehicle'?(en?'Choose a model to research; audio observations are still available.':'ระบุรุ่นเพื่อค้นอ้างอิงเพิ่มเติมได้ ยังฟังลักษณะเสียงได้ตามปกติ'):(en?'Online sources unavailable; no model-specific fault is verified.':'ยังค้นเอกสารออนไลน์ไม่ได้ จึงยังไม่ยืนยันอาการประจำรุ่น'))+'</p>'+(lines.length?'<ul>'+lines.join('')+'</ul>':'')+(curated.length?'<b>'+(en?'Separately reviewed manufacturer documents':'เอกสารผู้ผลิตที่ตรวจไว้แยกจากการค้นสด')+'</b><p>'+(en?'Not audio-training examples or a diagnosis. Check engine, market and production range.':'ไม่ใช่ตัวอย่างเสียงที่ใช้ฝึกหรือผลวินิจฉัย ต้องเทียบเครื่องยนต์ ตลาด และช่วงผลิต')+'</p><ul>'+curated.join('')+'</ul>':'')+'</section>';
  }
  function assessmentLabel(value,lang='th'){
    const labels={no_clear_abnormality:['ยังไม่พบเสียงผิดปกติชัด','No clear abnormality heard'],possible_abnormality:['อาจมีเสียงผิดปกติ ต้องตรวจเพิ่ม','Possible abnormality — check further'],abnormal_sound:['ได้ยินเสียงผิดปกติ ควรให้ช่างตรวจ','Unusual sound — inspection advised'],inconclusive:['หลักฐานเสียงยังไม่พอ','Insufficient audio evidence']};
    return (labels[value]||labels.inconclusive)[lang==='en'?1:0];
  }
  window.CendonVehicleAudio=Object.freeze({car,label,choice,current,payload,picker,bind,defaultChoice,parseOther,prompt,recording,researchMarkup,assessmentLabel});
})();
