import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

/* แท็บล่างมือถือ: ตัวเลือกเลื่อนไปแท็บใหม่ · แท็บหลักเตรียมไว้ล่วงหน้า ให้เปลี่ยนหน้าครั้งแรกเร็วเท่าครั้งที่สอง */
const r = f => readFileSync(new URL('../' + f, import.meta.url), 'utf8');
const mui = r('mobile-ui.js'), app = r('app-navigation.js');

test('the tab highlight is one piece that slides, not a background that jumps', () => {
  assert.match(mui, /#mnav \.mt-ind\.go\{transition:transform \.4s cubic-bezier\(\.22,1,\.36,1\)\}/, 'transform only: no layout work while it moves');
  assert.match(mui, /#mnav\.has-ind \.mtab \.mt-i\{background:transparent!important\}/, 'per-tab backgrounds off once the slider exists, so there is never a second highlight');
  assert.match(mui, /@media \(prefers-reduced-motion:reduce\)\{#mnav \.mt-ind\.go,#mnav\.has-ind \.mtab\{transition:none\}\}/);
  assert.match(mui, /function indTarget\(n\)\{return \(D\.querySelector\("\.bs\.on\.inbox"\)&&n\.querySelector\('\[data-mnav="chat"\]'\)\)\|\|n\.querySelector\("\.mtab\.on"\)\}/, 'chat sheet over Home counts as the chat tab');
  assert.match(mui, /inboxWatch=new MutationObserver\(\(\)=>placeInd\(true\)\);inboxWatch\.observe\(bs,\{attributes:true,attributeFilter:\["class"\]\}\)/, 'watches only the sheet\'s class, not the whole page');
  assert.match(mui, /  paintAvatar\(\);\n  placeInd\(true\);watchInbox\(\);\n\}/, 'placed every time the bar is drawn');
  assert.match(mui, /window\.CendonNav=\{x\(\)\{const s=indSpot\(\$\("mnav"\)\);return s\?s\.x:null\},slideFrom\(x\)\{if\(typeof x==="number"\)placeInd\(true,x\)\}\};/);
  assert.match(mui, /if\(typeof from==="number"\)\{ind\.classList\.remove\("go"\);ind\.style\.transform=`translate\(\$\{from\}px,\$\{s\.y\}px\)`;getComputedStyle\(ind\)\.transform;indAt=from\}/, 'starts where the previous page\'s highlight was');
});

test('switching tabs hands the old highlight position to the page that is opening', () => {
  const read = app.indexOf("let navFrom=null;if(was&&was!==r)try{navFrom=was.el.contentWindow.CendonNav?.x();}catch{}");
  const toggle = app.indexOf("f.el.classList.toggle('is-active',on)");
  const give = app.indexOf("if(typeof navFrom==='number')try{r.el.contentWindow.CendonNav?.slideFrom(navFrom);}catch{}");
  assert.ok(read > 0 && read < toggle && toggle < give, 'read from the leaving page, then slide in the arriving page during the cross-fade');
});

test('main tabs are prepared in the background after Home, so the first tap is fast', () => {
  assert.match(app, /const PREWARM=\['garage','news','profile'\];/, 'Cendon AI chat is never prepared in the background');
  assert.match(app, /if\(ns===active\)\{openingDone\(\);tint\(\);schedulePrewarm\(\);\}/, 'starts only after the first page is ready');
  assert.match(app, /function schedulePrewarm\(\)\{if\(prewarmPlanned\)return;prewarmPlanned=true;/, 'once per app open');
  assert.match(app, /if\(limit<6\|\|c\?\.saveData\|\|\/2g\/\.test\(c\?\.effectiveType\|\|''\)\)return;/, 'not on low-memory phones, data saver or 2G');
  assert.match(app, /if\(!geo\|\|geo\.state==='prompt'\)return;/, 'never while location is undecided: these pages ask for it on open (weather), a prompt must not appear over Home');
  assert.match(app, /if\(busy\|\|queued\|\|D\.hidden\|\|frames\.size>=limit\)return;/, 'stops when the user is navigating or the app is in the background');
  assert.match(app, /await idle\(800\);/, 'one page at a time, in idle moments');
  assert.match(app, /const r=await prepare\(new URL\(ROOTS\[ns\],origin\)\.href,true\);if\(ns!==active\)r\.el\.contentWindow\.CendonView\?\.setHidden\(true\);/, 'prepared pages are told they are hidden');
  assert.match(app, /el\.className='app-view is-preparing';el\.inert=background;/, 'cannot be tapped or focused until really opened (activate clears inert)');
  assert.match(app, /catch\{const r=frames\.get\(ns\);if\(r&&!r\.ready&&ns!==active&&!calls\.has\(ns\)&&!authOwners\.has\(ns\)\)\{try\{r\.el\.contentWindow\.CendonView\?\.disposeAuth\?\.\(\);\}catch\{\}r\.el\.remove\(\);frames\.delete\(ns\);\}return;\}/, 'a failed preparation is dropped; a real tap then loads as before');
});

test('new code reaches phones: versions bumped together', () => {
  const sw = r('sw.js'), shell = r('lib/app-shell.mjs');
  assert.ok(shell.includes('/app-navigation.js?v=10') && sw.includes("'./app-navigation.js?v=10'"));
  for (const f of ['index.html', 'garage.html', 'news.html', 'profile.html', 'spares.html', 'chat.html', 'sw.js']) assert.ok(r(f).includes('mobile-ui.js?v=4') && !r(f).includes('mobile-ui.js?v=3'), f);
});
