import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
/* การาจ: ข้อความมั่ว/ยาวเกิน และตัวเลขเกินจริงตามรุ่นรถ (input-guard.js) — ใช้ร่วมกันทุกฟอร์มและ Valet */
const src=readFileSync(new URL('../input-guard.js',import.meta.url),'utf8');
const garage=readFileSync(new URL('../garage.html',import.meta.url),'utf8');
const extras=readFileSync(new URL('../garage-extras.js',import.meta.url),'utf8');
const valet=readFileSync(new URL('../valet-core.js',import.meta.url),'utf8');
function guard(lang='th'){
  const c={window:{},document:{addEventListener(){}},localStorage:{getItem:()=>JSON.stringify(lang)}};vm.createContext(c);
  vm.runInContext(src,c);return c.window.spireGuard;
}
const G=guard();

test('real Thai and English text passes, keyboard mashing and repeats do not',()=>{
  for(const s of ['มีเสียงเอี๊ยดตอนเลี้ยวซ้าย เฉพาะตอนเช้า','ตรวจสอบรถยนต์','ต่อ พ.ร.บ.','กรุงเทพ–หัวหิน','นครปฐม','เสียงดังงงงงง','แอร์ไม่เย็น',
    'squeal when turning left','property tax','Bangkok to Hua Hin','ไฟเตือน check engine ขึ้น','Rhythm check'])
    assert.equal(G.junk(s),'',s);
  for(const s of ['ฟหกดฟหกด','asdfgh','qwerty','sdkfjsdlkfj','aaaaaaa','!!!!!!','12345678','กกกกกกก','abababab','zxcvbnm','อิอิอิอิ'])
    assert.notEqual(G.junk(s),'',s);
});

test('text(): too long, too short and gibberish each explain themselves; model codes like "2" or "X5" are fine',()=>{
  assert.match(G.text('ก'.repeat(130),{max:120}).msg,/ไม่เกิน 120 ตัวอักษร/);
  assert.equal(G.text('',{min:0}).ok,true,'optional fields may stay empty');
  assert.match(G.text('ฟหกดฟหกด',{max:60}).msg,/อ่านไม่ออก/);
  for(const s of ['2','X5','GT-R','CX-30','BMW'])assert.equal(G.text(s,{max:30,min:1}).ok,true,s);
  assert.match(guard('en').text('asdfgh').msg,/real words/);
});

test('money(): a single record can never exceed what this car model is worth; expensive cars get higher limits',()=>{
  const vios={make:'Toyota',model:'Vios'},p911={make:'Porsche',model:'911'},f8={make:'Ferrari',model:'F8'};
  assert.equal(G.money(50000,vios,{job:'oil'}).ok,false,'฿50,000 oil change on a Vios is impossible');
  assert.ok(G.money(12000,vios,{job:'oil'}).ask,'unusual but possible → ask first');
  assert.deepEqual({...G.money(1800,vios,{job:'oil'})},{ok:true});
  assert.equal(G.money(60000,p911,{job:'oil'}).ok,true,'a Porsche oil service can cost that much');
  assert.equal(G.money(5e6,vios,{}).ok,false);
  assert.equal(G.money(5e6,f8,{}).ok,true);
  assert.equal(G.tier({make:'Toyota',model:'Alphard'}).k,'lux');
});

test('fuel(): one fill-up is bounded and the price per litre must be plausible',()=>{
  assert.deepEqual({...G.fuel(1200,30)},{ok:true});
  assert.equal(G.fuel(50000,0).ok,false);
  assert.equal(G.fuel(1000,400).ok,false);
  assert.ok(G.fuel(1200,3).ask,'฿400/L → ask');
});

test('every garage form checks before saving (no silent clamping)',()=>{
  assert.match(garage,/if\(!okKm\(km,c\)\|\|!okMoney\(amt,c,\{job:k,what:jobName\(c,k\)\}\)\)return;/,'service log');
  assert.match(garage,/r=g\?g\.fuel\(amt,li\):\{ok:true\}/,'fuel log');
  assert.match(garage,/const ti=okText\(\$\("clTripT"\)\.value,\{max:60,min:0/,'trip name');
  assert.match(garage,/if\(\+km>10000\)\{toastx\(/,'trip distance');
  assert.match(garage,/const t=okText\(raw,\{max:120,min:3/,'symptom');
  assert.match(garage,/const t=okText\(\$\("tdT"\)\.value,\{max:60/,'my reminders');
  assert.match(garage,/kmv<500\|\|kmv>200000/,'service interval');
  assert.match(garage,/okText\(note,\{max:80/,'record note');
  assert.match(garage,/data-del="trips" data-i="\$\{l\.trips\.indexOf\(t\)\}"/,'deleting a trip removes that trip, not whatever sits at the sorted position');
  assert.match(extras,/r=g\?g\.money\(n,c,\{job:k,what:itemName\(c,k\)\}\):\{ok:true\}/,'cost calendar price');
  assert.match(extras,/\+s\.amount<=cap/,'impossible old amounts are left out of the calendar total');
  assert.match(valet,/if\(G\)tooMuch\(G\.money\(amount,c,\{job:key/,'Valet follows the same rules');
});
