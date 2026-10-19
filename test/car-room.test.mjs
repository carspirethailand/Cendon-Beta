/* หน้ารถโฉมใหม่ (การาจ): หัวเดียว + 4 ห้อง + ปุ่มบันทึกปุ่มเดียว · ฟอร์มและตัวตรวจข้อมูลชุดเดิม · ลิงก์เก่ายังพามาถูกห้อง */
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const r=f=>readFileSync(new URL('../'+f,import.meta.url),'utf8');
const g=r('garage.html'),room=g.slice(g.indexOf('/* ═══════════ หน้ารถ (โฉมใหม่) ═══════════'),g.indexOf('/* ─── การกระทำในโมดัล ─── */'));

test('four rooms replace the ten scrolling tabs, and old tab links land in the right room',()=>{
  const tabs=[...room.matchAll(/\{k:"(\w+)",th:"([^"]+)"/g)].map(m=>m[1]);
  assert.deepEqual(tabs.slice(0,4),['over','care','hist','about']);
  assert.match(room,/const OLD_TAB=\{info:"about",odo:"about",spec:"about",equip:"about",parts:"about",health:"care",plan:"care",cal:"care",cost:"hist",trip:"hist",pass:"hist"\}/);
  const nav=r('nav-pages.js');
  assert.match(nav,/const CLTABS=\["over","care","hist","about"\]/);
  assert.match(nav,/open:p=>clClick\(CLOLD\[p\.tab\]\|\|p\.tab\)/);
  /* "info" ยังเป็นหน้าต่างข้อมูลเพิ่มเติมของรถ (/garage/<รถ>/info) ห้องข้อมูลรถจึงใช้ชื่อ about */
  assert.match(nav,/path:":car\/info"/);
  for(const f of ['garage.html','news.html','profile.html','spares.html'])assert.match(r(f),/nav-pages\.js\?v=2/,f);
});

test('one + Log button opens every form; the forms keep their ids and checks, and a failed check keeps the sheet open',()=>{
  for(const id of ['clFuelAmt','clFuelL','clFuelKm','clFuelDate','clFuelAdd','clSvcK','clSvcKm','clSvcAmt','clSvcDate','clSvcAdd','crmOdoIn','crmOdoGo','symTxt','symAdd','clTripT','clTripKm','clTripDate','clTripAdd','tdT','tdKm','tdDate','tdAdd'])assert.ok(room.includes(`id="${id}"`),id);
  assert.match(room,/<input id="tdKm" type="number" inputmode="numeric" min="0" max="\$\{Math\.min\(1000000,\(KM\(c\)\|\|0\)\+200000\)\}"/);
  /* ปิดแผ่นเฉพาะตอนตัวบันทึกเดิมสั่งวาดใหม่ (บันทึกสำเร็จ) */
  assert.match(room,/if\(e\.target\.closest\("#clFuelAdd,#clSvcAdd,#clTripAdd,#symAdd,#tdAdd,\[data-rsave\],\[data-saveiv\],\[data-resetiv\],\[data-done\]"\)\)\{saving=true;/);
  assert.match(room,/if\(saving\)\{saving=false;closeSheet\(\)\}/);
  /* ไม่มีช่องกรอกกางค้างในห้องอีก */
  for(const pane of ['paneOver','paneCare','paneHist','paneInfo']){const s=room.slice(room.indexOf('function '+pane+'('),room.indexOf('\n}\n',room.indexOf('function '+pane+'(')));assert.doesNotMatch(s,/<input|<select|<textarea/,pane)}
  /* ตัวตรวจข้อมูลเดิมยังอยู่ครบ */
  assert.match(g,/if\(!okKm\(km,c\)\|\|!okMoney\(amt,c,\{job:k,what:jobName\(c,k\)\}\)\)return;/);
  assert.match(g,/data-del="trips" data-i="\$\{l\.trips\.indexOf\(t\)\}"/);
});

test('mileage typed in a car page belongs to that car, not whichever car is selected',()=>{
  assert.match(room,/if\(!okKm\(v,c\)\)return;[\s\S]{0,400}SpireODO\.confirm\(c,v,"manual"\)/);
  assert.match(g,/const inRoom=e\.target\.closest&&e\.target\.closest\("#clModal"\);\s*const c=\(inRoom&&window\.SpireCarLab&&SpireCarLab\.cur&&SpireCarLab\.cur\(\)\)\|\|activeCar\(\);/);
  assert.match(g,/cur:\(\)=>modal&&modal\.classList\.contains\("show"\)\?curCar:null,/);
});

test('delete sits in the ⋯ menu behind a confirm, never next to the main buttons',()=>{
  const act=room.slice(room.indexOf('function actButtons(){'),room.indexOf('\n}\n',room.indexOf('function actButtons(){')));
  assert.doesNotMatch(act,/data-act="del"|ti-trash/);
  assert.match(room,/data-cm="del"/);
  assert.match(room,/if\(k==="del"\)\{\s*if\(!confirm\(/);
});

test('hero is a flat graphic with real data: car art in its own colour + a dial of distance to the next logged care item',()=>{
  assert.match(room,/function nextDue\(c\)\{\s*const items=status\(c\)\.items\.filter\(\(\{p\}\)=>lastDone\(c,p\.k\)\)/,'only items the owner logged — never a guess');
  assert.match(room,/\$\{dial\(n\?n\.d\.left\/n\.p\.km:0,over\)\}\$\{artOf\(c\)\}/);
  assert.doesNotMatch(g,/three(-0\.160\.0)?\.module|fx3d\.js|WebGLRenderer/,'no 3D on the garage page');
});

test('other pages send the car page to the garage, where the new design lives',()=>{
  for(const f of ['news.html','spares.html','profile.html'])assert.match(r(f),/window\.openCarDetail=function\(id\)\{\n[^\n]*\n  if\(id\)\{location\.href="\/garage\/"\+encodeURIComponent\(id\)/,f);
});
