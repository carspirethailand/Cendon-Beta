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
    if(isNum(el)){if(!el.hasAttribute('min'))el.setAttribute('min','0');return}
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
    var v=el.value;if(v==='')return;
    if(el.type!=='number'){var c=v.replace(/[^\d.,]/g,'');if(c!==v){el.value=c;tip(el,th()?'ใส่ได้เฉพาะตัวเลข ห้ามติดลบ':'Numbers only, no negatives')}return}
    var n=Number(v);if(!isFinite(n))return;
    var lo=el.hasAttribute('min')?Number(el.getAttribute('min')):0,hi=el.hasAttribute('max')?Number(el.getAttribute('max')):Infinity;
    if(n<0){el.value=String(Math.abs(n));n=Math.abs(n);tip(el,th()?'ตัวเลขติดลบไม่ได้':'Negative numbers aren’t allowed')}
    if(final&&n<lo){el.value=String(lo);tip(el,th()?'ต้องไม่น้อยกว่า '+lo:'Must be at least '+lo)}
    else if(final&&n>hi){el.value=String(hi);tip(el,th()?'ต้องไม่เกิน '+hi:'Must be at most '+hi)}
  }
  function fixDate(el){
    bounds(el);var v=el.value;if(!v)return;
    var lo=el.getAttribute('min'),hi=el.getAttribute('max');
    if(hi&&v>hi){el.value=hi;tip(el,past(el)?(th()?'บันทึกนี้เป็นเรื่องที่เกิดแล้ว ใส่วันในอนาคตไม่ได้ — ปรับเป็นวันนี้':'This is a past event — the date can’t be in the future, set to today'):(th()?'วันที่ไกลเกินจริง — ปรับให้แล้ว':'That date is too far ahead — adjusted'))}
    else if(lo&&v<lo){el.value=lo;tip(el,th()?'วันที่เก่าเกินจริง — ปรับให้แล้ว':'That date is too far back — adjusted')}
  }
  D.addEventListener('focusin',function(e){bounds(e.target)},true);
  D.addEventListener('pointerdown',function(e){bounds(e.target)},true);
  D.addEventListener('keydown',function(e){var el=e.target;if(isNum(el)&&el.type==='number'&&(e.key==='-'||e.key==='e'||e.key==='E'||e.key==='+')){e.preventDefault();if(e.key==='-')tip(el,th()?'ตัวเลขติดลบไม่ได้':'Negative numbers aren’t allowed')}},true);
  D.addEventListener('input',function(e){if(isNum(e.target))fixNum(e.target,false)},true);
  D.addEventListener('change',function(e){var el=e.target;if(isNum(el))fixNum(el,true);else if(isDate(el))fixDate(el)},true);
  /* วางข้อความลงช่องวันที่บางเบราว์เซอร์ไม่ยิง change — ตรวจอีกรอบตอนออกจากช่อง */
  D.addEventListener('blur',function(e){var el=e.target;if(isDate(el))fixDate(el);else if(isNum(el))fixNum(el,true)},true);
  window.spireGuard={bounds:bounds,fixDate:fixDate,fixNum:fixNum};
})();
