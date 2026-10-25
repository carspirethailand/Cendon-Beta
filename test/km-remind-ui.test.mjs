import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
/* เตือนจดเลขไมล์ 18:00: ปุ่มเปิด/ปิดอยู่ในแผงกระดิ่ง (ทุกหน้า ไม่เพิ่มกล่องใหม่ในหน้า) · แตะแจ้งเตือนแล้วเปิดช่องใส่เลขไมล์ของคันนั้น */
const r=f=>readFileSync(new URL('../'+f,import.meta.url),'utf8').replace(/\r\n/g,'\n');

test('6 pm mileage reminder: bell only suggests it while off (signed in + has a car); the on/off switch lives in Settings', () => {
  const b=r('bell.js'),st=r('settings.js');
  assert.match(b,/if\(uid\(\)&&hasCar\(\)&&k&&!k\.on&&!snoozed\("km"\)\)out\.push\(/,'suggestion card only while the reminder is off');
  assert.match(b,/const r=await post\("\/api\/km\/remind",\{on:want\}\);kmPut\(r\);/);
  assert.match(b,/if\(!\(st&&st\.line\)&&!pushOn\(\)&&await enable\(\)!=="granted"\)/,'without LINE it needs device notifications, asked on the tap');
  assert.match(b,/get\("\/api\/km\/remind"\)\.then\(r=>\{if\(!owns\(\)\|\|disposed\)return;const k=kmGet\(\);kmPut\(r\);/,'real state from the server only for the still-open account');
  assert.match(b,/v&&v\.uid===uid\(\)\?v:null/,'remembered state belongs to this account only');
  assert.match(st,/if\(B\.hasCar&&B\.hasCar\(\)\)\{const k=B\.km\.get\(\)\|\|\{\};rows\.push\(swRow\(\{ic:'ti-gauge',act:'notif-km'/,'Settings shows the switch for users with a car');
  assert.match(st,/else\{const r=await B\.km\.set\(want\);/);
});

test('every page loads the new bell; the 6 pm notification opens that car\'s mileage box', () => {
  for(const f of ['index.html','garage.html','chat.html','news.html','profile.html','spares.html'])assert.match(r(f),/bell\.js\?v=18/,f);
  assert.match(r('sw.js'),/'\.\/bell\.js\?v=18'/);
  const g=r('garage.html');
  assert.match(g,/const car=q\.get\("car"\), due=q\.get\("due"\);[\s\S]{0,300}if\(car\)sheet\(car,due\|\|""\);/);
});
