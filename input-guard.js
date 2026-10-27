/* ตัวกันข้อมูลที่เป็นไปไม่ได้ในช่องตัวเลขและวันที่ — ใช้ทุกหน้าที่มีฟอร์ม (การาจ สมุดรถ บำรุงรักษา ค่าใช้จ่าย สมุดเดินทาง เลขไมล์ ใบเสนอราคา)
   ทำไมต้องมี: ช่องตัวเลขของเบราว์เซอร์ยอมให้พิมพ์ติดลบ และช่องวันที่ยอมให้พิมพ์ปี 2900 เอง ข้อมูลแบบนี้ทำให้ AI สรุปผิด
   กติกา
   · ช่องตัวเลข (type=number หรือมี data-num): ห้ามติดลบ ห้าม e/+ · ต่ำกว่า min (ค่าเริ่ม 0) หรือเกิน max ปรับให้อยู่ในช่วง
   · ช่องวันที่ของ "สิ่งที่เกิดขึ้นแล้ว" (บันทึกซ่อม เติมน้ำมัน เดินทาง ทำล่าสุด) ห้ามเกินวันนี้ · ช่องอื่น (วันครบกำหนด วันหมดอายุ) ไม่เกิน 10 ปีข้างหน้า
   · ทุกช่องวันที่ไม่ก่อนปี 1990 (ปรับเองได้ด้วย min/max ในมาร์กอัป หรือ data-past="1" = ห้ามเกินวันนี้)
   ปรับค่าให้แล้วบอกผู้ใช้สั้น ๆ ใต้ช่อง ไม่เงียบ */
(function(){
  'use strict';
  var D=document;
  var PAST_IDS=/^(clSvcDate|clFuelDate|clTripDate)$/;
  var iso=function(d){return new Date(d.getTime()-d.getTimezoneOffset()*60000).toISOString().slice(0,10)};
  var th=function(){var l='';try{l=JSON.parse(localStorage.getItem('spire_lang')||'"th"')}catch(e){}return l==='th'||!l};
  function isNum(el){return el&&el.tagName==='INPUT'&&(el.type==='number'||el.hasAttribute('data-num'))&&!el.hasAttribute('data-neg')}
  function isDate(el){return el&&el.tagName==='INPUT'&&el.type==='date'}
  function past(el){return el.getAttribute('data-past')==='1'||el.hasAttribute('data-rd')||PAST_IDS.test(el.id||'')}
  /* ตั้งขอบเขตให้ปฏิทินของเครื่องเลือกได้เฉพาะวันที่เป็นไปได้ (ปีที่เกินไปกดไม่ได้เลย) */
  function bounds(el){
    if(isNum(el)){if(!el.hasAttribute('min'))el.setAttribute('min','0');
      var job=el.getAttribute('data-ra')||(el.id==='clSvcAmt'?(D.getElementById('clSvcK')||{}).value:null);
      if(job){var car=window.SpireCarLab&&window.SpireCarLab.cur(),p=window.CendonGarageData&&car&&window.CendonGarageData.policy(car),t=tier(car),j=JOB[job];
        el.setAttribute('max',String(Math.min(p?p.cap:t.ceil,p&&p.maxByJob&&p.maxByJob[job]||(j?j[0]:500000)*(p?p.factor:t.f))));el.setAttribute('step','0.01');el.dataset.money='1';}
      return}
    if(!isDate(el))return;
    var now=new Date();
    if(!el.hasAttribute('min'))el.setAttribute('min','1990-01-01');
    if(!el.hasAttribute('max')){var m=new Date(now);if(!past(el))m.setFullYear(m.getFullYear()+10);el.setAttribute('max',iso(m))}
  }
  var tipEl=null,tipT=0;
  function tip(el,msg){
    if(!tipEl){tipEl=D.createElement('div');tipEl.setAttribute('role','status');
      tipEl.style.cssText='position:fixed;z-index:2147483000;max-width:min(320px,calc(100vw - 32px));padding:7px 11px;border-radius:10px;background:#18181b;color:#fff;font:500 12.5px/1.4 Kanit,system-ui,sans-serif;box-shadow:0 6px 20px rgba(0,0,0,.18);pointer-events:none;opacity:0;transition:opacity .18s';
      D.body.appendChild(tipEl)}
    var r=el.getBoundingClientRect();tipEl.textContent=msg;
    tipEl.style.left=Math.max(16,Math.min(r.left,innerWidth-336))+'px';
    tipEl.style.top=Math.min(r.bottom+6,innerHeight-48)+'px';tipEl.style.opacity='1';
    clearTimeout(tipT);tipT=setTimeout(function(){tipEl.style.opacity='0'},2600);
  }
  function fixNum(el,final){
    if(el.hasAttribute('data-money-input'))return; // Currency form validates explicitly; never silently change a quote.
    var v=el.value;if(v==='')return;
    if(el.type!=='number'){var c=v.replace(/[^\d.,]/g,'');if(c!==v){el.value=c;tip(el,th()?'ใส่ได้เฉพาะตัวเลข ห้ามติดลบ':'Numbers only, no negatives')}return}
    var n=Number(v);if(!isFinite(n))return;
    var lo=el.hasAttribute('min')?Number(el.getAttribute('min')):0,hi=el.hasAttribute('max')?Number(el.getAttribute('max')):Infinity;
    if(n<0){el.value=String(Math.abs(n));n=Math.abs(n);tip(el,th()?'ตัวเลขติดลบไม่ได้':'Negative numbers aren’t allowed')}
    if(final&&n<lo){el.value=String(lo);tip(el,th()?'ต้องไม่น้อยกว่า '+lo:'Must be at least '+lo)}
    else if(final&&n>hi){if(el.dataset.money==='1'){tip(el,th()?'ยอดเกินเกณฑ์ กรุณาตรวจตัวเลขก่อนบันทึก':'Amount exceeds the limit; check it before saving');return}el.value=String(hi);tip(el,th()?'ต้องไม่เกิน '+hi:'Must be at most '+hi)}
  }
  function fixDate(el){
    bounds(el);var v=el.value;if(!v)return;
    var lo=el.getAttribute('min'),hi=el.getAttribute('max');
    if(hi&&v>hi){el.value=hi;tip(el,past(el)?(th()?'บันทึกนี้เป็นเรื่องที่เกิดแล้ว ใส่วันในอนาคตไม่ได้ — ปรับเป็นวันนี้':'This is a past event — the date can’t be in the future, set to today'):(th()?'วันที่ไกลเกินจริง — ปรับให้แล้ว':'That date is too far ahead — adjusted'))}
    else if(lo&&v<lo){
      /* ปีที่ยังพิมพ์ไม่ครบ (เช่น 0002, 0020) = ตั้งใจพิมพ์ปีปัจจุบัน ไม่ใช่ปี 1990 */
      var y=Number(v.slice(0,4)),cur=String(new Date(Date.now()).getFullYear());
      if(y<1000){var fixed=cur+v.slice(4);if((!lo||fixed>=lo)&&(!hi||fixed<=hi)){el.value=fixed;tip(el,th()?'ปรับเป็นปี '+cur+' ให้แล้ว':'Set to '+cur);return}}
      el.value=lo;tip(el,th()?'วันที่เก่าเกินจริง — ปรับให้แล้ว':'That date is too far back — adjusted')}
  }
  D.addEventListener('focusin',function(e){bounds(e.target)},true);
  D.addEventListener('pointerdown',function(e){bounds(e.target)},true);
  D.addEventListener('keydown',function(e){var el=e.target;if(isNum(el)&&el.type==='number'&&(e.key==='-'||e.key==='e'||e.key==='E'||e.key==='+')){e.preventDefault();if(e.key==='-')tip(el,th()?'ตัวเลขติดลบไม่ได้':'Negative numbers aren’t allowed')}},true);
  D.addEventListener('input',function(e){if(isNum(e.target))fixNum(e.target,false)},true);
  /* ช่องวันที่: Chrome ยิง change ทุกครั้งที่พิมพ์ตัวเลขปีแต่ละหลัก — ระหว่างยังโฟกัสอยู่ห้ามปรับ (ไม่งั้นพิมพ์ "2" ปุ๊บกลายเป็นปี 1990) ไปตรวจตอนออกจากช่อง */
  D.addEventListener('change',function(e){var el=e.target;if(isNum(el))fixNum(el,true);else if(isDate(el)&&D.activeElement!==el)fixDate(el)},true);
  /* วางข้อความลงช่องวันที่บางเบราว์เซอร์ไม่ยิง change — ตรวจอีกรอบตอนออกจากช่อง */
  D.addEventListener('blur',function(e){var el=e.target;if(isDate(el))fixDate(el);else if(isNum(el))fixNum(el,true)},true);

  /* ── ข้อความที่ผู้ใช้ตั้งเอง (อาการ งานของฉัน ชื่อทริป หมายเหตุ): กันพิมพ์มั่วและยาวเกิน ──
     ไม่ได้ตัดสินว่าสะกดถูกไหม จับเฉพาะแบบที่ไม่ใช่ข้อความจริงแน่ ๆ: ไม่มีตัวอักษรเลย · ตัวเดียวซ้ำยาว ๆ
     · กดไล่แป้นพิมพ์ (asdfg / ฟหกด) · ชุดเดิมวนซ้ำ · พยัญชนะอังกฤษติดกันยาวผิดธรรมชาติ
     ไทยไม่มีเว้นวรรคและ อ ว ย ร ทำหน้าที่สระได้ จึงไม่นับพยัญชนะไทยติดกัน (เช่น "ตรวจสอบรถ" ต้องผ่าน) */
  var ROWS=['qwertyuiop','asdfghjkl','zxcvbnm','ภถุึคตจขช','ๆไำพะัีรนยบลฃ','ฟหกดเ้่าสวง','ผปแอิืทมใฝ'];
  function junk(s){
    var t=String(s||'').toLowerCase().replace(/\s+/g,' ').trim();if(!t)return '';
    var L=t.replace(/[^a-z฀-๿぀-ヿ一-鿿가-힯]/g,'');
    /* รหัสสั้น ๆ อย่างรุ่นรถ "2" "X5" ไม่ใช่ข้อความมั่ว */
    if(!L.length)return /\d/.test(t)&&t.length<=6?'':'letters';
    /* ลากเสียงแบบ "ดังงงงง" ยังนับเป็นคำ — ยุบตัวซ้ำก่อน แล้วดูว่าเหลือคำจริงไหม */
    var C=L.replace(/(.)\1{2,}/g,'$1');
    if((L.length>=3&&C.length<2)||(L.length>=6&&new Set(Array.from(L)).size<=2))return 'repeat';
    if(/(.{2,5})\1{2,}/.test(C))return 'repeat';
    for(var i=0;i<ROWS.length;i++){var r=ROWS[i],w=/[a-z]/.test(r)?5:4,rv=Array.from(r).reverse().join('');
      for(var j=0;j+w<=r.length;j++)if(C.indexOf(r.substr(j,w))>=0||C.indexOf(rv.substr(j,w))>=0)return 'mash'}
    if(/[bcdfghjklmnpqrstvwxz]{6,}/.test(C)||/[a-z]{25,}/.test(C))return 'mash';
    return '';
  }
  function chars(v){return Array.from(v).length}
  /* text(ค่า,{max,min,eg,egEn}) → {ok,v,msg} · v คือข้อความที่ตัดช่องว่างเกินแล้ว */
  function text(s,o){
    o=o||{};var v=String(s==null?'':s).replace(/\s+/g,' ').trim(),max=o.max||80,min=o.min==null?2:o.min;
    if(!v)return min?{ok:false,v:v,msg:th()?'ยังไม่ได้พิมพ์อะไร':'Nothing typed yet'}:{ok:true,v:v};
    if(chars(v)>max)return {ok:false,v:v,msg:th()?'ยาวเกินไป ใช้ไม่เกิน '+max+' ตัวอักษร (ตอนนี้ '+chars(v)+')':'Too long — keep it under '+max+' characters (now '+chars(v)+')'};
    if(chars(v)<min)return {ok:false,v:v,msg:th()?'สั้นเกินไป ช่วยพิมพ์ให้ชัดขึ้นอีกนิด':'Too short — add a little more detail'};
    if(junk(v))return {ok:false,v:v,msg:th()?'ข้อความนี้อ่านไม่ออก ช่วยพิมพ์เป็นคำที่อ่านได้ เช่น “'+(o.eg||'เสียงดังตอนเบรก')+'”':'We can’t read that — please use real words, e.g. “'+(o.egEn||'squeal when braking')+'”'};
    return {ok:true,v:v};
  }

  /* ── มูลค่ารถโดยประมาณจากยี่ห้อ/รุ่น ──
     ระบบไม่มีราคารถจริง จึงจัดกลุ่มตามยี่ห้อ/รุ่น ใช้เพดานราคารถใหม่ของกลุ่มนั้นในไทย และตัวคูณค่าอะไหล่/ค่าแรง
     รถแพงได้เพดานสูงตาม ไม่ตัดยอดของคนที่ใช้รถหรูจริง · ยอดหนึ่งรายการเกินมูลค่ารถรุ่นนี้ = เป็นไปไม่ได้ */
  var TIERS=[
    {k:'exotic',ceil:8e7,f:10,re:/ferrari|lamborghini|rolls|bentley|mclaren|bugatti|pagani|koenigsegg|aston|maybach|rimac/},
    {k:'lux',ceil:25e6,f:5,re:/porsche|maserati|land ?rover|range ?rover|lotus|alphard|vellfire|land ?cruiser|lexus ?l[mxc]\b|\bamg\b|\bg ?63\b|\bm[2-8]\b|\br8\b|\brs ?[3-7q]\b|gt-?r\b|lucid/},
    {k:'premium',ceil:1e7,f:2.5,re:/bmw|mercedes|benz|audi|lexus|volvo|jaguar|tesla|mini|genesis|cadillac|lincoln|infiniti|acura|alfa|polestar|jeep|mustang|zeekr|denza|hongqi|lynk|supra|type ?r\b|nismo|corvette|chevrolet camaro|camaro/}
  ],STD={k:'std',ceil:3e6,f:1};
  function tier(c){var n=[c&&c.make,c&&c.model,c&&c.name].filter(Boolean).join(' ').toLowerCase();
    for(var i=0;i<TIERS.length;i++)if(TIERS[i].re.test(n))return TIERS[i];return STD}
  var fmt=function(n){return Math.round(n).toLocaleString('en-US')};
  /* ราคาต่องานของรถทั่วไป: hi = เพดานที่เป็นไปได้ (คูณตามกลุ่มรถ) · ref = ช่วงราคาปกติ (เกิน 4 เท่าของปกติ = ถามก่อน) */
  var JOB={oil:[15e3,1200,2500],airf:[5e3,300,800],cabin:[5e3,250,700],plug:[2e4,1200,3500],brakepad:[25e3,1500,3500],brakeoil:[6e3,500,1200],
    tire:[8e4,8000,20000],align:[6e3,400,900],batt:[3e4,2500,5000],coolant:[1e4,600,1500],gearoil:[2e4,1200,3500],belt:[25e3,800,2500],shock:[8e4,6000,16000]};
  /* money(ยอด,รถ,{job,what}) → {ok,msg} หรือ {ok:true,ask} (ให้หน้าเรียก confirm) */
  function money(n,c,o){
    o=o||{};n=Number(n);if(!Number.isFinite(n)||n<0||Math.abs(n*100-Math.round(n*100))>0.00001)return {ok:false,msg:th()?'จำนวนเงินไม่ถูกต้อง ใช้ทศนิยมไม่เกิน 2 ตำแหน่ง':'Invalid amount; use at most 2 decimal places'};if(n===0)return {ok:true};
    var policy=window.CendonGarageData&&window.CendonGarageData.policy(c||{});
    if(policy&&policy.basis!=='heuristic'){
      var cap=Math.min(policy.cap,(policy.maxByJob||{})[o.job]||(JOB[o.job]?JOB[o.job][0]:500000)*(policy.factor||1));
      return n<=cap?{ok:true}:{ok:false,msg:th()?'ยอดสูงกว่าเกณฑ์อ้างอิงของรถรุ่นและปีนี้ กรุณาตรวจตัวเลข':'Above this model-year reference limit; check the amount'};
    }
    var t=tier(c),j=JOB[o.job],hard=Math.min((j?j[0]:500000)*t.f,t.ceil),what=o.what||(th()?'รายการนี้':'this item');
    if(n>hard)return {ok:false,msg:th()?'฿'+fmt(n)+' เกินเกณฑ์ตรวจสอบเบื้องต้น (ไม่เกิน ฿'+fmt(hard)+') — ยังไม่มีราคาอ้างอิงตรงรุ่น/ปี กรุณาตรวจเลข':'฿'+fmt(n)+' exceeds the preliminary limit (฿'+fmt(hard)+'); no exact model-year price reference is available'};
    if(j&&n>j[2]*4*t.f)return {ok:true,ask:th()?'฿'+fmt(n)+' สูงกว่าปกติของ'+what+'มาก (รถทั่วไปราว ฿'+fmt(j[1])+'–'+fmt(j[2])+') ตัวเลขถูกต้องไหม?':'฿'+fmt(n)+' is far above the usual '+what+' cost (about ฿'+fmt(j[1])+'–'+fmt(j[2])+' for most cars). Is that right?'};
    return {ok:true};
  }
  /* เติมน้ำมัน/ชาร์จหนึ่งครั้ง: ถังใหญ่สุดของรถทั่วไป ~150 ลิตร · ราคาต่อลิตร/หน่วยต้องเป็นไปได้ */
  function fuel(amt,lit){
    amt=Number(amt)||0;lit=Number(lit)||0;
    if(amt>15000)return {ok:false,msg:th()?'เติมครั้งเดียว ฿'+fmt(amt)+' สูงเกินจริง (ไม่เกิน ฿15,000) — ถ้ารวมหลายครั้ง แยกบันทึกทีละครั้ง':'฿'+fmt(amt)+' for one fill-up is too high (max ฿15,000) — log each fill-up separately'};
    if(lit>300)return {ok:false,msg:th()?'เติมครั้งเดียวไม่เกิน 300 ลิตร / kWh':'One fill-up can’t be more than 300 L / kWh'};
    if(amt&&lit){var p=amt/lit;if(p<2||p>120)return {ok:true,ask:th()?'ตกลิตร/หน่วยละ ฿'+p.toFixed(1)+' ดูไม่ปกติ ตัวเลขถูกต้องไหม?':'That works out to ฿'+p.toFixed(1)+' per litre/kWh, which looks off. Is that right?'}}
    if(amt>6000)return {ok:true,ask:th()?'เติมครั้งเดียว ฿'+fmt(amt)+' ถูกต้องไหม?':'฿'+fmt(amt)+' for one fill-up — is that right?'};
    return {ok:true};
  }
  function showIssues(list,root){
    root=root||D;var first=null;
    list.forEach(function(issue){
      var el=issue.element||(issue.id&&D.getElementById(issue.id));if(!el&&issue.field)el=root.querySelector('[data-info="'+String(issue.field).replace(/[^a-z_]/g,'')+'"]');
      if(!el)return;if(!first)first=el;
      var wrap=el.closest('label,.fld,.gx-fld,.gx-field')||el.parentElement;
      var name=wrap&&wrap.querySelector('label,span,.gx-label');
      var title=issue.label||(name&&name.textContent.trim())||el.getAttribute('aria-label')||issue.field||'';
      var note=D.createElement('small');note.className='cdf-error';note.id='cdf-'+(el.id||issue.field||'field')+'-'+Math.random().toString(36).slice(2,7);note.setAttribute('role','alert');note.textContent=(title?title+': ':'')+issue.msg;
      (wrap||el.parentElement).querySelectorAll('.cdf-error').forEach(function(n){n.remove()});(wrap||el.parentElement).appendChild(note);
      el.classList.add('bad-f');el.setAttribute('aria-invalid','true');var prior=el.getAttribute('aria-describedby')||'';el.setAttribute('aria-describedby',(prior+' '+note.id).trim());
      var clear=function(){el.classList.remove('bad-f');el.removeAttribute('aria-invalid');if(prior)el.setAttribute('aria-describedby',prior);else el.removeAttribute('aria-describedby');note.remove();el.removeEventListener('input',clear);el.removeEventListener('change',clear)};el.addEventListener('input',clear);el.addEventListener('change',clear);
    });
    if(!first)return false;
    var details=first.closest('details');if(details)details.open=true;
    var target=first.hidden?(first.closest('label,.fld')||first.parentElement):first;
    target.scrollIntoView({block:'center',behavior:matchMedia('(prefers-reduced-motion:reduce)').matches?'auto':'smooth'});
    if(!target.matches('input,select,textarea,button,[tabindex]'))target.tabIndex=-1;
    target.focus({preventScroll:true});return true;
  }
  var invalid=[],queued=false;
  D.addEventListener('invalid',function(e){e.preventDefault();invalid.push({element:e.target,msg:e.target.validationMessage});if(!queued){queued=true;queueMicrotask(function(){showIssues(invalid);invalid=[];queued=false})}},true);
  var style=D.createElement('style');style.textContent='.cdf-error{display:block;color:var(--bad,#c73737);font:12px/1.6 system-ui;margin-top:5px}.bad-f[aria-invalid="true"]{outline:2px solid var(--bad,#c73737);outline-offset:2px;scroll-margin-block:100px}';(D.head||D.documentElement).appendChild(style);
  window.CendonFormIssues=Object.freeze({show:showIssues});
  window.spireGuard={bounds:bounds,fixDate:fixDate,fixNum:fixNum,junk:junk,text:text,tier:tier,money:money,fuel:fuel,JOB:JOB};
})();
