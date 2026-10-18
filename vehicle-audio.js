/* Recording-specific vehicle choice. No storage, network, device access or Garage writes. */
(() => {
  'use strict';
  const clean=(v,n=90)=>typeof v==='string'||typeof v==='number'?String(v).replace(/[\u0000-\u001f<>]/g,' ').replace(/\s+/g,' ').trim().slice(0,n):'';
  const esc=v=>clean(v,300).replace(/[&"']/g,c=>({'&':'&amp;','"':'&quot;',"'":'&#39;'}[c]));
  function car(c={}){
    if(!c||typeof c!=='object')return {};
    const words=clean(c.name).split(/\s+/);
    return Object.fromEntries(Object.entries({make:clean(c.make||words[0]),model:clean(c.model||words.slice(1).join(' ')),year:clean(c.model_year||c.year,4),engine:clean(c.engine,80),engine_code:clean(c.engine_code,24),fuel:clean(c.fuel||c.fuelType,30),mileage:clean(c.mileage,12)}).filter(([,v])=>v));
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
  function picker(prefix,saved,value,lang='th'){
    const en=lang==='en',t=(th,eng)=>en?eng:th,s=value?.source||'',v=value?.vehicle||{};
    return `<fieldset class="va-pick" id="${prefix}Picker"><legend>${t('เสียงที่กำลังฟังมาจากรถคันไหน?','Which vehicle is in this recording?')}</legend><label><span>${t('รถในคลิป','Recording vehicle')}</span><select id="${prefix}Scope" aria-label="${t('รถในคลิป','Recording vehicle')}"><option value="">${t('เลือกก่อนเริ่มฟัง','Choose before listening')}</option>${label(saved)?`<option value="garage_confirmed" ${s==='garage_confirmed'?'selected':''}>${t('รถใน Garage: ','Garage car: ')}${esc(label(saved))}</option>`:''}<option value="other_confirmed" ${s==='other_confirmed'?'selected':''}>${t('รถคันอื่น / รถเพื่อน / คลิปจากที่อื่น','Another car / friend’s car / external clip')}</option><option value="unknown" ${s==='unknown'?'selected':''}>${t('ยังไม่ทราบรุ่น — ฟังลักษณะเสียงก่อน','Unknown vehicle — describe the sound first')}</option></select></label><div id="${prefix}Other" ${s==='other_confirmed'?'':'hidden'}>${[['make','ยี่ห้อ','Make'],['model','รุ่น','Model'],['year','ปีรุ่น','Model year'],['engine','เครื่องยนต์ เช่น 3.0 D-4D','Engine, e.g. 3.0 D-4D'],['fuel','เชื้อเพลิง','Fuel']].map(([k,th,eng])=>`<label><span>${t(th,eng)} (${t('ไม่บังคับ','optional')})</span><input id="${prefix}_${k}" maxlength="${k==='year'?4:80}" value="${esc(v[k]||'')}" autocomplete="off" ${k==='year'?'inputmode="numeric"':''}></label>`).join('')}</div><small>${t('AI ระบุยี่ห้อหรือรุ่นจากเสียงอย่างเดียวไม่ได้ • ไม่เปลี่ยนข้อมูลใน Garage','Audio alone cannot identify a make or model • Garage records stay unchanged')}</small></fieldset>`;
  }
  function bind(prefix,saved,onChange){
    const D=document,scope=D.getElementById(prefix+'Scope');if(!scope)return;
    const labelNode=scope.closest?.('label');let summary=D.getElementById(prefix+'Summary');
    if(!summary&&labelNode){summary=D.createElement('p');summary.id=prefix+'Summary';summary.className='va-summary';labelNode.after(summary);}
    if(summary)summary.textContent=scope.value==='garage_confirmed'?label(saved):'';
    const read=()=>{
      const other={};for(const k of ['make','model','year','engine','fuel'])other[k]=D.getElementById(prefix+'_'+k)?.value||'';
      const box=D.getElementById(prefix+'Other');if(box)box.hidden=scope.value!=='other_confirmed';
      const v=scope.value?choice(scope.value,saved,other):null;
      if(summary)summary.textContent=v?label(v.vehicle):'';
      onChange(v);
    };
    scope.onchange=read;
    for(const k of ['make','model','year','engine','fuel']){const input=D.getElementById(prefix+'_'+k);if(input)input.oninput=read;}
  }
  const prompt=c=>'\nSaved Garage candidate (not proof of the car now heard): '+JSON.stringify(car(c))+' Never identify make/model/year from audio. Ask whether this is the saved car or another car; use listen_engine and wait for its result. A user-selected recording vehicle overrides old assistant guesses, but never changes Garage records.';
  window.CendonVehicleAudio=Object.freeze({car,label,choice,current,payload,picker,bind,prompt});
})();
