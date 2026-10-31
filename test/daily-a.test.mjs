import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

/* แบบ A: แก้จุดที่คนใช้ครั้งแรกสะดุด โดยยึดหน้าตาเดิมของแอป */
const r = f => readFileSync(new URL('../' + f, import.meta.url), 'utf8').replace(/\r\n/g, '\n');
const home = r('index.html'), mui = r('mobile-ui.js'), stab = r('stability.css');

test('tabs are named like their pages: the chat tab opens "แชต", with one way out on mobile', () => {
  assert.match(home, /sheet\(\{title:T\("แชต","Chat"\),url:"\/messages",full:true,inbox:true,/);
  assert.doesNotMatch(home, /sheet\(\{title:T\("ข้อความ","Messages"\),url:"\/messages"/);
  const mobile = home.slice(home.indexOf('body:has(.bs.on.inbox) #mnav{z-index:1100}'), home.indexOf('body:has(.bs.on.inbox) #mnav .mtab{color:inherit}'));
  assert.match(mobile, /\.bs\.inbox #bsX\{display:none\}/, 'the tab bar is the way out, not a second close button');
});

test('account tab never looks like a broken picture', () => {
  assert.match(mui, /const ready=a&&a\.innerHTML\.trim\(\)&&\(a\.querySelector\("img"\)\|\|a\.textContent\.trim\(\)!=="\?"\);/, 'the "?" placeholder shows the person icon');
  assert.match(stab, /\.mnav \.mt-i \.fb\{border-radius:50%;background:linear-gradient\(140deg,#ef8a3d,#d35b2e\);color:#fff!important;/, 'an initial is a full orange circle');
});

test('empty lists point to one next step', () => {
  assert.equal((home.match(/<b>ยังไม่มีงาน<\/b>เลือกช่างแล้วกดขอราคา<button class="lx-cta" type="button" data-newpost>\$\{T\("ประกาศหาช่าง","Post a job"\)\}<\/button>/g) || []).length, 2);
  assert.equal((home.match(/b\.querySelector\("\[data-newpost\]"\)\?\.addEventListener\("click",\(\)=>openPostForm\("","",\{\}\)\)/g) || []).length, 2);
  assert.match(home, /<button class="lx-cta" type="button" id="ibPost">\$\{T\("ประกาศหาช่าง","Post a job"\)\}<\/button>/);
  assert.match(home, /if\(\$\("ibPost"\)\)\$\("ibPost"\)\.onclick=\(\)=>openPostForm\("","",\{\}\);/);
});

test('light theme: the partner card follows the page instead of a black block', () => {
  assert.match(home, /html\[data-theme="light"\] \.lp-card,html\[data-theme="plant"\] \.lp-card\{color:#09090B;background:[^}]*#FFFFFF;/);
  assert.match(home, /html\[data-theme="light"\] \.lp-tx em,html\[data-theme="plant"\] \.lp-tx em\{color:#71717A\}/);
});
