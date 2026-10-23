import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
/* เตือนจดเลขไมล์ 18:00: ปุ่มเปิด/ปิดอยู่ในแผงกระดิ่ง (ทุกหน้า ไม่เพิ่มกล่องใหม่ในหน้า) · แตะแจ้งเตือนแล้วเปิดช่องใส่เลขไมล์ของคันนั้น */
const r=f=>readFileSync(new URL('../'+f,import.meta.url),'utf8').replace(/\r\n/g,'\n');

test('bell panel: one row to turn the 6 pm mileage reminder on or off, only for signed-in users with a car', () => {
  const b=r('bell.js');
  assert.match(b,/function kmRow\(\)\{\n  if\(!uid\(\)\|\|!hasCar\(\)\)return "";/);
  assert.match(b,/\$\{kmRow\(\)\}\n      <div class="nb-list">/);
  assert.match(b,/const r=await post\("\/api\/km\/remind",\{on:want\}\);kmPut\(r\);/);
  assert.match(b,/if\(!\(s&&s\.line\)&&!pushOn\(\)&&await enable\(\)!=="granted"\)/,'without LINE it needs device notifications, asked on the tap');
  assert.match(b,/get\("\/api\/km\/remind"\)\.then\(r=>\{const k=kmGet\(\);kmPut\(r\);/,'real state from the server when the panel opens');
  assert.match(b,/v&&v\.uid===uid\(\)\?v:null/,'remembered state belongs to this account only');
});

test('every page loads the new bell; the 6 pm notification opens that car\'s mileage box', () => {
  for(const f of ['index.html','garage.html','chat.html','news.html','profile.html','spares.html'])assert.match(r(f),/bell\.js\?v=13/,f);
  assert.match(r('sw.js'),/'\.\/bell\.js\?v=13'/);
  const g=r('garage.html');
  assert.match(g,/const car=q\.get\("car"\), due=q\.get\("due"\);[\s\S]{0,300}if\(car\)sheet\(car,due\|\|""\);/);
});
