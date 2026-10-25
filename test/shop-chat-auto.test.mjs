import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const r=f=>readFileSync(new URL('../'+f,import.meta.url),'utf8');
const home=r('index.html');

test('new chat with a shop shows its greeting right away; automatic messages are labelled for both sides',()=>{
  assert.match(home,/greet:String\(t\.greet\|\|""\)\.trim\(\)\},\[\],ask\)/);
  assert.match(home,/cust&&!h\.id&&h\.greet\?`<div class="msg" data-greet>\$\{esc\(h\.greet\)\}/);
  assert.match(home,/m\.kind==="greet"\?T\("ข้อความต้อนรับ","Welcome message"\)/);
  assert.match(home,/m\.kind==="auto"\?T\("ตอบกลับอัตโนมัติ","Auto-reply"\)/);
  /* ตั้งค่าใน Studio บอกตรงกับที่ระบบทำ */
  assert.match(home,/ส่งให้ลูกค้าทันทีที่ทักหรือขอราคาเข้ามา ถ้าร้านยังไม่ได้ตอบใน 12 ชั่วโมง/);
  assert.match(home,/คำทักทาย — ขึ้นบนหน้าร้าน และเป็นข้อความแรกเมื่อลูกค้ากดแชต/);
});

test('cancelled job page says who cancelled (from the server record) and why',()=>{
  assert.match(home,/technician:tech\?T\("คุณยกเลิกงานนี้","You cancelled this job"\):T\("ร้านยกเลิกงานนี้","The shop cancelled this job"\)/);
  assert.match(home,/customer:cust\?T\("คุณยกเลิกงานนี้","You cancelled this job"\):T\("ลูกค้ายกเลิกงานนี้","The customer cancelled this job"\)/);
  assert.match(home,/\[j\.cancelledBy\]\|\|"";/);
  for(const l of ['ja','zh','ko','id','vi','ms','de','fr','es','pt'])assert.match(r('i18n/home-'+l+'.js'),/"The shop cancelled this job":/,l);
});
