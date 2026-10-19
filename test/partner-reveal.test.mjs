/* ใบสมัครช่างโฉมใหม่ + การ์ดขูดเปิดผล: ไม่มีอะไรบอกผลก่อนขูด · ไม่ผ่านบอกอย่างอ่อนโยน · ขูดครั้งเดียวต่อผล */
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const home=readFileSync(new URL('../index.html',import.meta.url),'utf8').replace(/\r\n/g,'\n');
const part=(a,b)=>home.slice(home.indexOf(a),home.indexOf(b,home.indexOf(a)));

function reveal(){
  const store={},c=vm.createContext({U:{uid:'me'},localStorage:{getItem:k=>k in store?store[k]:null,setItem:(k,v)=>{store[k]=String(v)}}});
  vm.runInContext(part('function decided(a)','const PJ_FACE'),c);return {c,store};
}

test('a decided application is scratched once per decision; pending, test and automatic results never are',()=>{
  const {c}=reveal(),a={uid:'u1',status:'approved',review:{at:111}};
  assert.equal(c.decided(a),true);assert.equal(c.revealed(a),false);
  c.markRevealed(a);assert.equal(c.revealed(a),true);
  /* ผลใหม่รอบหน้า (ส่งใหม่แล้วตัดสินอีกครั้ง) = ขูดใหม่ */
  assert.equal(c.revealed({...a,status:'rejected',review:{at:222}}),false);
  assert.equal(c.revealed({uid:'u1',status:'pending'}),true,'nothing to scratch while pending');
  assert.equal(c.decided({uid:'u1',status:'approved',test:true}),false,'staff test shops skip it');
  assert.equal(c.revealed({uid:'u1',status:'rejected',review:{auto:true,at:5}}),true,'instant rule checks show the fix list straight away');
});

test('while the card is unscratched nothing shows the result: sheet, home card, account menu, opening /join',()=>{
  const sp=part('function statusPage(a,fresh,pv,just){','function previewStatus');
  assert.match(sp,/const scratch=decided\(a\)&&!auto&&\(pv\?pv\.scratch!==false:!revealed\(a\)\);/);
  /* หน้าการ์ดขูดมีแค่หัวกลาง ๆ + ฟอยล์ + ปุ่มเปิดเลย แล้วจบ (return) ก่อนส่วนที่บอกผล */
  const s=sp.slice(sp.indexOf('if(scratch)return sheet('),sp.indexOf('const pass='));
  assert.match(s,/ผลการพิจารณามาแล้ว/);assert.match(s,/id="pjOpen">เปิดผลเลย ไม่ต้องขูด/);
  assert.doesNotMatch(s,/ยินดีด้วย|ขอบคุณที่อยาก|อีกนิดเดียวเท่านั้น|id="sFix"|id="sJobs"/);
  /* หน้าแรก + เมนูบัญชี + เปิด /join */
  assert.match(home,/const k=p&&U&&p\.uid===U\.uid&&p\.r\?"news":/);
  assert.match(home,/r:a&&decided\(a\)&&!revealed\(a\)\?1:0/);
  assert.match(home,/\$\{a&&decided\(a\)&&!revealed\(a\)\?"ผลใบสมัครช่างมาแล้ว — แตะเพื่อขูดดู":/);
  const oj=part('async function openJoin(){','function wizBack');
  assert.ok(oj.indexOf('if(a&&decided(a)&&!revealed(a))return statusPage(a);')<oj.indexOf('return openStudio();'),'an approved applicant scratches before landing in Studio');
});

test('scratch card: real foil you rub off, auto-opens past half, a button for anyone who cannot scratch, confetti only on approval',()=>{
  const sc=part('function scratchCard(box,onOpen){','function confetti(){');
  assert.match(sc,/g\.globalCompositeOperation="destination-out"/);
  assert.match(sc,/if\(n&&c\/n>\.5\)open\(\)/);
  assert.match(sc,/new Path2D\(LOGO\)/,'foil is patterned with the Cendon mark — identical for every outcome');
  assert.match(sc,/if\(t-buzz>110&&navigator\.vibrate\)/);
  assert.match(home,/\$\("pjOpen"\)\.onclick=\(\)=>sc\.open\(\)/);
  assert.match(home,/if\(st==="approved"\)confetti\(\)/);
  assert.match(part('function confetti(){','$("bJoin")'),/prefers-reduced-motion: reduce/);
  assert.match(home,/\.pj-scratch\{[^}]*touch-action:none/,'scratching never scrolls the page');
});

test('a "no" is told kindly: no big ไม่ผ่าน, thanks first, the team note, and real next steps',()=>{
  const face=part('const PJ_FACE=','function scratchCard');
  assert.doesNotMatch(face,/ไม่ผ่าน/);assert.match(face,/declined:'[^']*ขอบคุณจากใจ/);assert.match(face,/rejected:'[^']*อีกนิดเดียว/);
  const sp=part('function statusPage(a,fresh,pv,just){','function previewStatus');
  assert.match(sp,/ไม่ได้วัดคุณค่าของฝีมือและประสบการณ์ที่คุณสั่งสมมา/);
  assert.match(sp,/ดูแลรถของคุณกับ Cendon ได้ตามปกติ/);
  assert.match(sp,/id="sTalk" href="\$\{esc\(lineChat\("@988omovg"\)\)\}"/,'a way to talk to the team');
  assert.match(sp,/ไม่ว่าผลจะเป็นแบบไหน เรามีทางไปต่อให้คุณเสมอ/);
  /* ขอแก้ = บอกตรง ๆ ว่าข้อมูลยังอยู่ แต่รูปเอกสารต้องแนบใหม่ (ไม่สัญญาเกินจริง) */
  assert.match(sp,/ข้อมูลที่กรอกไว้ยังอยู่ครบ \(รูปเอกสารแนบใหม่อีกครั้ง\)/);
  assert.match(home,/declined:"ปิดรอบนี้"/);
});

test('every signup screen uses the new design and keeps the same fields',()=>{
  const st=part('function step(n){','/* สถานะใบสมัคร');
  for(const id of ['aT','aN','aI','aD','aP','aS','aY','aC','aM','aF','aW','aB','aMap','aXY','aGps','aR','aK','aFile','aBk','aNx','aGo','dTerms','dAI'])assert.ok(st.includes(`"${id}"`)||st.includes(`'${id}'`)||st.includes(`id="${id}"`)||st.includes(`$("${id}")`),id);
  assert.match(st,/<section class="pj-card"><h3 class="pj-ct"><i class="ti ti-user-circle"><\/i>ข้อมูลส่วนบุคคล/);
  assert.match(st,/<div class="pj-ticket">/);
  assert.match(home,/const wiz=n=>\(\{wiz:n,cls:"jx",/);
  assert.match(home,/function stepHd\(n\)\{return `<div class="pj-hd"><div class="pj-road"/);
  assert.equal((st.match(/foot:PJ_FOOT\(/g)||[]).length,4);
});
