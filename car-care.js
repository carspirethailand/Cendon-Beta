/* ดูแลรถครั้งถัดไป — รอบมาตรฐานชุดเดียวที่หน้ารถ (garage.html) และหน้าแรกใช้ร่วมกัน
   นับเฉพาะรายการที่ผู้ใช้เคยบันทึกไว้ในสมุดรถ (ไม่เดาจากเลขไมล์อย่างเดียว) · ผู้ใช้ปรับรอบเองได้ต่อคัน (carlab_iv_<id>) */
(function(W){'use strict';
const PLAN=Object.freeze([
 {k:"oil",     th:"เปลี่ยนน้ำมันเครื่อง",   en:"Engine oil",       km:10000, mo:6,  sys:"engine", ev:false},
 {k:"airf",    th:"ไส้กรองอากาศ",          en:"Air filter",       km:20000, mo:12, sys:"engine", ev:false},
 {k:"cabin",   th:"กรองแอร์ในห้องโดยสาร",   en:"Cabin filter",     km:20000, mo:12, sys:"comfort",ev:true},
 {k:"plug",    th:"หัวเทียน",              en:"Spark plugs",      km:40000, mo:36, sys:"engine", ev:false},
 {k:"brakepad",th:"ผ้าเบรก",               en:"Brake pads",       km:40000, mo:36, sys:"brake",  ev:true},
 {k:"brakeoil",th:"น้ำมันเบรก",             en:"Brake fluid",      km:40000, mo:24, sys:"brake",  ev:true},
 {k:"tire",    th:"ยาง 4 เส้น",            en:"Tyres",            km:50000, mo:48, sys:"tire",   ev:true},
 {k:"align",   th:"ตั้งศูนย์ถ่วงล้อ",        en:"Wheel alignment",  km:20000, mo:12, sys:"tire",   ev:true},
 {k:"batt",    th:"แบตเตอรี่",              en:"Battery",          km:60000, mo:36, sys:"elec",   ev:true},
 {k:"coolant", th:"น้ำหล่อเย็น",            en:"Coolant",          km:60000, mo:36, sys:"engine", ev:false},
 {k:"gearoil", th:"น้ำมันเกียร์",           en:"Gearbox oil",      km:60000, mo:48, sys:"drive",  ev:false},
 {k:"belt",    th:"สายพานหน้าเครื่อง",      en:"Drive belt",       km:80000, mo:60, sys:"engine", ev:false},
 {k:"shock",   th:"โช้คอัพ",               en:"Shock absorbers",  km:80000, mo:60, sys:"susp",   ev:true}
].map(Object.freeze));
const read=k=>{try{const v=localStorage.getItem("spire_"+k);return v?JSON.parse(v):null}catch(e){return null}};
function plan(c,ev){
  const iv=(c&&read("carlab_iv_"+c.id))||{};
  return PLAN.filter(p=>!ev||p.ev).map(p=>{const o=iv[p.k];return o?Object.assign({},p,{km:Number(o.km)||p.km,mo:Number(o.mo)||p.mo,custom:true}):p});
}
/* รายการที่ใกล้ครบที่สุด: เหลือ = รอบ − (เลขไมล์ตอนนี้ − เลขไมล์ครั้งล่าสุดที่บันทึก) · ติดลบ = เลยกำหนด · ไม่เคยบันทึกเลย = null */
function next(c,o){
  if(!c||!c.id)return null;o=o||{};
  const log=read("carlab_log_"+c.id),svc=log&&Array.isArray(log.services)?log.services:[];
  const km=Number(o.km)||parseInt(c.mileage)||0;let best=null;
  for(const p of plan(c,!!o.ev)){
    const done=svc.filter(s=>s&&s.k===p.k);if(!done.length)continue;
    const last=Math.max(...done.map(s=>parseInt(s.km)||0)),left=p.km-Math.max(0,km-last);
    if(!best||left<best.left)best={k:p.k,th:p.th,en:p.en,left,every:p.km};
  }
  return best;
}
W.CendonCarCare=Object.freeze({PLAN,plan,next});
})(window);
