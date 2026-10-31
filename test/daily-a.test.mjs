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

test('next service comes from one shared plan and only from what the owner logged', () => {
  const store = new Map(), W = {};
  const localStorage = { getItem: k => store.has(k) ? store.get(k) : null };
  new Function('window', 'localStorage', r('car-care.js'))(W, localStorage);
  const C = W.CendonCarCare, car = { id: 'c1', mileage: '52000' };
  assert.equal(C.next(car), null, 'nothing logged = nothing shown (no guessing)');
  store.set('spire_carlab_log_c1', JSON.stringify({ services: [{ k: 'oil', km: 43200 }, { k: 'oil', km: 33000 }, { k: 'tire', km: 10000 }] }));
  assert.deepEqual(C.next(car), { k: 'oil', th: 'เปลี่ยนน้ำมันเครื่อง', en: 'Engine oil', left: 1200, every: 10000 }, 'latest log wins; smallest remaining first');
  store.set('spire_carlab_iv_c1', JSON.stringify({ oil: { km: 5000 } }));
  assert.equal(C.next(car).left, -3800, 'owner intervals apply; negative = overdue');
  assert.equal(C.next(car, { ev: true }).k, 'tire', 'EVs skip engine-oil items');
  const garage = r('garage.html');
  assert.match(garage, /const PLAN=window\.CendonCarCare\.PLAN;/, 'the car page uses the same plan');
  assert.ok(garage.indexOf('<script src="/car-care.js?v=1"></script>') < garage.indexOf('const PLAN=window.CendonCarCare.PLAN'));
  assert.match(garage, /\$\{gxDue\(c,bodyStyle\)\}\n\s*<span class="gx-foot">/, 'the garage card shows the next service');
});

test('home answers "what is going on" with one live-job row and the next service on my car', () => {
  assert.match(home, /<div class="hm-job" id="hJob" hidden><\/div>\n  <div class="lx-mycar" id="myCar" hidden><\/div>/, 'live job sits in the centred group above my car');
  assert.match(home, /function liveJobs\(\)\{const H=U&&window\.CendonBell&&CendonBell\.hub\?CendonBell\.hub\(\):null;return H\?H\.act\.map\(x=>\(\{\.\.\.x,need:true\}\)\)\.concat\(H\.live\):\[\]\}/, 'same data as the bell: needs-you first');
  assert.match(home, /if\(!all\.length\)\{box\.hidden=true;box\.textContent="";return\}/, 'no jobs = no filler');
  assert.match(home, /jobSub=CendonBell\.on\(\(\)=>\{try\{drawLiveJob\(\)\}catch\(e\)\{\}\}\)/, 'updates when jobs refresh');
  assert.match(home, /<b class="nt">\$\{esc\(\[c\.name,c\.year\]\.filter\(Boolean\)\.join\(" "\)\)\}<\/b>\$\{carDue\(c\)\}/);
  assert.match(home, /const J=liveJobs\(\)\.slice\(0,3\),jobs=J\.length\?`<p class="jw-sec"><span>\$\{T\("งานที่กำลังเดิน","Jobs in progress"\)\}/, 'the chat tab lists live jobs under Cendon AI');
  for (const l of ['de', 'es', 'fr', 'id', 'ja', 'ko', 'ms', 'pt', 'vi', 'zh']) {
    const d = r(`i18n/home-${l}.js`);
    for (const k of ['"{0} km left":', '"{0} km overdue":', '"Jobs in progress":', '"Needs you":', '"In progress":']) assert.ok(d.includes(k), l + ' ' + k);
  }
});

test('the + button becomes the call menu (and back) without touching the rest of the page', () => {
  const cx = r('call-x.css');
  assert.match(home, /function plusMorph\(a,b,swap\)\{/);
  assert.match(home, /if\(!d\.startViewTransition\|\|matchMedia\("\(prefers-reduced-motion: reduce\)"\)\.matches\|\|h\.dataset\.cxDir\)\{swap\(\);return false\}/, 'old grow-from-corner menu when unsupported, reduced or mid job-page transition');
  assert.match(home, /if\(!plusMorph\(b,m,\(\)=>\{m\.classList\.add\("cxp-now"\);document\.body\.append\(sc,m\);/);
  assert.match(home, /plusMorph\(p\.m,b,\(\)=>\{p\.sc\.remove\(\);p\.m\.remove\(\)\}\)/, 'closing folds back into the button');
  assert.match(home, /d\.querySelectorAll\("\.cxp-src,\.cxp-now"\)\.forEach\(e=>e\.classList\.remove\("cxp-src","cxp-now"\)\)/, 'the shared name never lingers');
  assert.match(cx, /\.cxp-src\{view-transition-name:cx-plus\}/);
  assert.match(cx, /html\[data-cxp\] \.mnav\{view-transition-name:none!important\}/);
  assert.match(cx, /html\[data-cxp\]::view-transition-group\(cx-plus\)\{animation-duration:\.46s;animation-timing-function:var\(--cx-spring\)\}/);
  /* ตัวเลือกใต้ html[data-cxp] ห้ามลงท้ายด้วย * หรือแท็ก — ไม่งั้นตั้ง attribute แล้วคำนวณสไตล์ทั้งเอกสาร */
  for (const m of cx.replace(/\/\*[\s\S]*?\*\//g, '').matchAll(/(?:^|\})([^{}@]*html\[data-cxp\][^{]*)\{/g))
    for (const x of m[1].split(',').map(v => v.trim()).filter(v => v.startsWith('html[data-cxp]') && !v.includes('::view-transition')))
      assert.match(x, /[.#][\w-]+$/, x);
});
