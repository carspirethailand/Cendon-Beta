import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
/* ชุด D: บริการหลายหมวด · การ์ดเรียกช่างแบบพลิก · ช่องพิมพ์ 2 แถวบนคอม · การ์ดร้านพลิกเป็น QR */
const r=f=>readFileSync(new URL('../'+f,import.meta.url),'utf8');
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

test('desktop chat composer: text on top, buttons on the row below',()=>{
  assert.match(chat,/@media\(min-width:900px\)\{\n  #composer \.crow\{flex-wrap:wrap!important;/);
  assert.match(chat,/#composer \.crow #inp\{order:-1;flex:1 0 100%!important;/);
});

test('Studio shop card flips between profile and a scannable QR (white back even in dark mode)',()=>{
  assert.match(home,/<button type="button" class="so-flip" id="sFlip" aria-pressed="false"/);
  assert.match(home,/\.so-flip \.sf-b\{transform:rotateY\(180deg\);background:#fff;color:#09090B;/);
  assert.match(home,/if\(back&&!drawn\)\{drawn=true;/,'QR is drawn once, on the first flip');
});
