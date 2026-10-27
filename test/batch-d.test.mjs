import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
/* ชุด D: บริการหลายหมวด · ปุ่มเรียกช่างด่วน (เลิกพลิกแล้ว) · ช่องพิมพ์ 2 แถวบนคอม · การ์ดร้านพลิกเป็น QR */
const r=f=>readFileSync(new URL('../'+f,import.meta.url),'utf8').replace(/\r\n/g,'\n');
const home=r('index.html'),chat=r('chat.html');

test('a service can sit in up to 6 categories and shows up under every one of them',()=>{
  assert.match(home,/const GIG_MAX=2,GIG_CATS=6;/);
  assert.match(home,/<div class="gcp" id="gC">/);
  assert.match(home,/cats:\[\.\.\.F2\.cats\],brands:/);
  assert.match(home,/else if\(F2\.cats\.length>=GIG_CATS\)\{toast\(/,'the 7th tap is refused with a reason');
  assert.match(home,/function gigCats\(g\)\{const L=\(g\.cats\|\|\[\]\)\.filter\(c=>topOf\(c\)\);return L\.length\?L:\[gigCat\(g\)\]\}/);
  assert.match(home,/for\(const g of l\)for\(const k of new Set\(gigCats\(g\)\.map\(c=>topOf\(c\)\|\|"other"\)\)\)/,'home rows: one card per category');
  assert.match(home,/CATK==="all"\|\|gigCats\(g\)\.some\(/,'category page matches any of the categories');
});

test('home urgent button is plain solid red — no 180° flip, no hidden back side',()=>{
  assert.doesNotMatch(home,/id="qFlip"|function qFlipWire|\.lx-qflip/,'the flip card is gone');
  assert.match(home,/<button type="button" class="lx-urg" data-q="urgent" title="\$\{T\("รถเสีย \/ อุบัติเหตุ ตอนนี้","Breakdown or accident, now"\)\}"><i class="ti ti-urgent"><\/i><b>\$\{T\("เรียกช่างด่วน","Urgent mechanic"\)\}<\/b><\/button>/);
  assert.match(home,/#hQuick \.lx-urg\{background:linear-gradient\(160deg,#e02424,#c81e1e\)!important;/);
});

test('the urgent button works like an emergency light: first tap counts, even right after scrolling or before the account loads',()=>{
  /* ทำงานตอนยกนิ้ว ไม่รอ click (มือถือกลืน click แรกตอนหน้ายังไหล) · กัน click ที่ตามมาไม่ให้ซ้ำ */
  assert.match(home,/btn\.addEventListener\("touchend",e=>\{\n    btn\.classList\.remove\("press"\);\n    if\(tm\|\|e\.touches\.length\|\|performance\.now\(\)-tt>900\)return;tm=true;\n    if\(e\.cancelable\)e\.preventDefault\(\);/);
  assert.match(home,/urgTap\(\$\("hQuick"\)\.querySelector\("\.lx-urg"\),\(\)=>go\("urgent"\)\);/);
  assert.match(home,/b\.onclick=\(\)=>\{if\(b\.dataset\.tapped\)return;go\(b\.dataset\.q\)\}/,'the click after a touch never fires twice');
  assert.match(home,/#hQuick \.lx-urg\.press\{scale:\.97\}/,'instant pressed feedback');
  /* เพิ่งเปิดแอป บัญชียังโหลดไม่เสร็จ: เปิดหน้าฉุกเฉินได้เลย ไม่เด้งไปหน้าเข้าสู่ระบบ */
  assert.match(home,/function emergency\(\)\{\n  if\(!U&&!signedHint\(\)\)return needLogin\(\);/);
  assert.match(home,/async function urgentCall\(pre,o2\)\{\n  if\(!await userReady\(\)\)return needLogin\(\);/);
  assert.match(home,/async function accident\(step\)\{\n  if\(!await userReady\(\)\)return needLogin\(\);/);
});

test('desktop chat composer: text on top, buttons on the row below',()=>{
  assert.match(chat,/@media\(min-width:900px\)\{\n  #composer \.crow\{flex-wrap:wrap!important;/);
  assert.match(chat,/#composer \.crow #inp\{order:-1;flex:1 0 100%!important;/);
});

test('Studio shop card flips between profile and a scannable QR (white back even in dark mode)',()=>{
  assert.match(home,/<button type="button" class="so-flip" id="sFlip" aria-pressed="false"/);
  assert.match(home,/\.so-flip \.sf-b\{transform:rotateY\(180deg\);background:#fff;color:#09090B;/);
  assert.match(home,/if\(back&&!drawn\)\{drawn=true;/,'QR is drawn once, on the first flip');
});
