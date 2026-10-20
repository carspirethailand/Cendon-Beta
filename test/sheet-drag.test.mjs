import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const r = f => readFileSync(new URL('../' + f, import.meta.url), 'utf8');
const js = r('sheet-drag.js');

test('sheet drag: one shared script on every app page and in the offline cache', () => {
  for (const f of ['index.html', 'garage.html', 'chat.html', 'news.html', 'profile.html', 'spares.html'])
    assert.match(r(f), /<script src="\/sheet-drag\.js\?v=\d+" defer><\/script>/, f);
  assert.match(r('sw.js'), /'\.\/sheet-drag\.js\?v=\d+'/);
  assert.doesNotThrow(() => new vm.Script(js));
});

test('sheet drag: covers every bottom sheet that shows a grab handle', () => {
  /* แผ่นที่มีขีดจับในแอป: หน้าแรก · การาจ (เพิ่มรถ/หน้ารถ) · ตั้งค่า · เลือกรถในเสียง · เครื่องมือทั้งหมด */
  for (const sel of ['.bs.on:not(.full)>.pn', '.gx-pop.on>.gx-sh', '.crm-sh.on', '#stSheet.in .st-sh', '.va-sheet', '.msheet.on'])
    assert.ok(js.includes(`panel:'${sel}'`), sel);
  /* แผ่นเต็มจอของหน้าแรกไม่มีขีด จึงไม่ลาก */
  assert.match(r('index.html'), /\.bs\.full \.pn::before\{display:none\}/);
  /* ขีดจับที่มีอยู่ในหน้าเว็บ ยังเป็นชื่อเดิม */
  assert.match(r('garage.html'), /\.carx \.crm-grab\{/);
  assert.match(r('garage.html'), /\.gx-sh::before\{content:"";display:block;width:40px;height:4px/);
  assert.match(r('settings.js'), /class="st-grab"/);
  assert.match(r('vehicle-audio.js'), /class="va-grab"/);
});

test('sheet drag: follows the finger, closes past a quarter or on a flick, springs back otherwise', () => {
  assert.match(js, /const rubber=dy=>dy>=0\?dy:-Math\.min\(56,Math\.sqrt\(-dy\)\*4\);/);
  assert.match(js, /const shut=s\.y>Math\.min\(s\.h\*\.25,180\)\|\|\(v>\.5&&s\.y>16\);/);
  /* ปิดด้วยทางเดิมของแผ่น (ปุ่ม × / พื้นมืด) ไม่ลบแผ่นเอง — ประวัติย้อนกลับของเครื่องจึงยังถูก */
  assert.match(js, /close:\(\)=>tap\(D\.getElementById\('bsX'\)\)/);
  assert.match(js, /close:p=>tap\(q\(p\.parentNode,'\.st-scrim'\)\)/);
  assert.doesNotMatch(js, /\.remove\(\)/);
});

test('sheet drag: page scroll and taps keep working', () => {
  /* กันหน้าเลื่อนได้เฉพาะตอนลากแผ่นจริง */
  assert.match(js, /D\.addEventListener\('touchmove',[\s\S]*?\{passive:false\}\)/);
  assert.match(js, /if\(move\(p\.clientX,p\.clientY,e\.timeStamp\)&&e\.cancelable\)e\.preventDefault\(\);/);
  /* ปัดข้าง หรือเลื่อนขึ้นในเนื้อหา = ไม่ยุ่ง · เนื้อหาเลื่อนอยู่ = รอให้ถึงบนสุดก่อน */
  assert.match(js, /if\(Math\.abs\(dx\)>Math\.abs\(dy\)\|\|\(!g\.inHead&&\(dy<0\|\|\(g\.sc&&g\.sc\.scrollTop>0\)\)\)\)\{g=null;return false\}/);
  assert.match(js, /mode:!inHead&&sc&&sc\.scrollTop>0\?'wait':null/);
  /* ช่องพิมพ์ แผนที่ การ์ดขูด ไม่เริ่มลาก */
  assert.match(js, /const SKIP='input,textarea,select,\[contenteditable="true"\],canvas,video,\.leaflet-container,\.picker,\[data-nodrag\]';/);
  /* หลังลาก กันเฉพาะคลิกจากผู้ใช้ — คลิกปิดที่สคริปต์สั่งเองต้องผ่าน */
  assert.match(js, /if\(e\.isTrusted&&swallow&&Date\.now\(\)-swallow<400\)/);
  /* บนคอม (หน้าต่างกลางจอ/แผงข้าง) ไม่ลาก */
  assert.match(js, /return r\.width>=vw\*\.85&&r\.bottom>=W\.innerHeight-8&&r\.height>0;/);
});
