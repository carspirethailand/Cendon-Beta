import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
/* ชุด D: บริการหลายหมวด · การ์ดเรียกช่างแบบพลิก · ช่องพิมพ์ 2 แถวบนคอม · การ์ดร้านพลิกเป็น QR */
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

test('home call card flips 180° (front urgent, back not urgent); the hidden side is out of the tab order',()=>{
  assert.match(home,/<div class="lx-qflip" id="qFlip"/);
  assert.match(home,/class="qf-face qf-f" data-q="urgent"/);assert.match(home,/class="qf-face qf-b" data-q="post" tabindex="-1" aria-hidden="true"/);
  assert.match(home,/\.lx-qflip\.back \.qf-in\{transform:rotateY\(180deg\)\}/);
  assert.match(home,/f\.tabIndex=back\?-1:0;bk\.tabIndex=back\?0:-1;/);
  assert.match(home,/if\(b\.closest\("#qFlip"\)&&\$\("qFlip"\)\.dataset\.swiped\)return;/,'a swipe never doubles as a tap');
});

test('call card turns with the finger like the search bar, the ⇄ turns with the card, and urgent is solid red',()=>{
  /* มือถือ: แนวนอนเป็นของการ์ด (ไม่งั้นเบราว์เซอร์แย่งท่าปัดไป) · หมุนตามระยะลาก · ปล่อยเกินหนึ่งในสามหรือปัดเร็ว = พลิก */
  assert.match(home,/\.lx-qflip\{position:relative;perspective:900px;min-width:0;touch-action:pan-y;/);
  assert.match(home,/dx=mx;turn\(rot\+Math\.max\(-1,Math\.min\(1,dx\/w\)\)\*180,false\)/);
  assert.match(home,/go=Math\.abs\(dx\)>w\*\.3\|\|Math\.abs\(v\)>\.5&&Math\.abs\(dx\)>20;\n    if\(go\)set\(!back,dx>0\?1:-1\);else turn\(rot,true\);/);
  /* ⇄ อยู่ในการ์ดแต่ละหน้า (ไม่ใช่ปุ่มลอยนอกการ์ด) แตะแล้วพลิก ไม่เปิดงาน */
  assert.match(home,/<b>\$\{T\("เรียกช่างด่วน","Urgent mechanic"\)\}<\/b>\$\{SW\}/);
  assert.match(home,/<b>\$\{T\("เรียกช่าง \(ไม่ด่วน\)","Find a mechanic"\)\}<\/b>\$\{SW\}/);
  assert.match(home,/box\.addEventListener\("click",e=>\{if\(!e\.target\.closest\("\.qf-sw"\)\)return;e\.preventDefault\(\);e\.stopPropagation\(\);/);
  assert.doesNotMatch(home,/<button type="button" class="qf-sw"/);
  /* ด้านหลังไม่หายตอนเอาเมาส์ชี้ (motion.css ตั้ง transform:none ตอนชี้การ์ด) */
  assert.match(home,/html #hQuick \.lx-qflip \.qf-b\{transform:rotateY\(180deg\)!important\}/);
  assert.match(home,/#hQuick \.lx-qflip \.qf-f\{background:linear-gradient\(160deg,#e02424,#c81e1e\)!important;/);
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
