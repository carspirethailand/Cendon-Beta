import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=f=>readFileSync(new URL('../'+f,import.meta.url),'utf8');

/* เปลี่ยนภาษา/ธีม/สีหลักในแอป = เมฆลอยตัดหน้า (ชุดเดียวกับเว็บ) — ทุกหน้าที่มีหน้าตั้งค่าต้องโหลดตัวนี้ */
test('cloud-swap: ทุกหน้าที่มีหน้าตั้งค่าโหลด cloud-swap.js และ service worker เก็บไว้',()=>{
  for(const f of ['garage.html','news.html','profile.html','spares.html','chat.html'])
    assert.match(read(f),/<script src="\/cloud-swap\.js\?v=\d+" defer><\/script>/,f);
  assert.match(read('sw.js'),/'\.\/cloud-swap\.js\?v=\d+'/);
});

test('cloud-swap: ดักปุ่มภาษา/ธีม/สีหลักที่หน้าตั้งค่าใช้จริง และปล่อยให้ปุ่มทำงานตอนหมอกทึบเต็มที่',()=>{
  const js=read('cloud-swap.js');
  /* ปุ่มในหน้าตั้งค่าแต่ละหน้า ต้องยังใช้ชื่อแอตทริบิวต์เดียวกับที่ตัวดักรู้จัก */
  /* หน้าตั้งค่าตัวเดียว (settings.js) ใช้ทุกหน้า รวมหน้าแชต */
  for(const f of ['garage.html','news.html','profile.html','spares.html','chat.html'])assert.match(read(f),/<script src="\/settings\.js\?v=\d+" defer><\/script>/,f);
  const st=read('settings.js');assert.match(st,/data-lang="\$\{esc\(x\.c\)\}"/);assert.match(st,/seg\(t\('ธีม','Theme'\),'data-sitetheme'/);
  assert.match(js,/button\[data-lang\]/);assert.match(js,/button\[data-sitetheme\]/);assert.match(js,/#v-settings button\[data-theme\]/);assert.match(js,/button\[data-pri\]/);
  /* ปุ่มทำงานจริงหลังหมอกฟุ้งจนทึบ และหมอกเริ่มจางหลังเปลี่ยนเสร็จเท่านั้น (เครื่องหน่วงก็ไม่เห็นตัวหนังสือ/สีกระโดด) */
  assert.match(js,/vin\.onfinish=function\(\)\{\s*doApply\(\);\s*var vout=veil\.animate\(/);
  assert.match(js,/function doApply\(\)\{if\(applied\)return;applied=true;try\{apply\(\)\}catch\(e\)\{\}/);
  /* ดักก่อนทุกตัว และกดซ้ำผ่านได้ครั้งเดียว ไม่วนดักตัวเอง */
  assert.match(js,/W\.addEventListener\('click',function\(e\)\{[\s\S]*?\},true\)/);
  assert.match(js,/if\(el\.__cloudPass\)\{el\.__cloudPass=false;return\}/);
  /* กันค้าง: ยังเปลี่ยนค่าให้ แล้วปลดหมอก */
  assert.match(js,/setTimeout\(function\(\)\{if\(!done\)\{doApply\(\);finish\(\)\}\},T\+1500\)/);
});
