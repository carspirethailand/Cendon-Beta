import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

/* แท็บล่างมือถือ: ตัวเลือกเลื่อนไปแท็บใหม่ · แท็บหลักเตรียมไว้ล่วงหน้า ให้เปลี่ยนหน้าครั้งแรกเร็วเท่าครั้งที่สอง */
const r = f => readFileSync(new URL('../' + f, import.meta.url), 'utf8').replace(/\r\n/g,'\n');
const mui = r('mobile-ui.js'), app = r('app-navigation.js');

test('the tab highlight is one piece that slides, not a background that jumps', () => {
  assert.match(mui, /#mnav \.mt-ind\{transition:transform \.4s cubic-bezier\(\.22,1,\.36,1\)\}/, 'transform only: no layout work while it moves');
  /* วางทันทีด้วยการปิด transition ชั่วคราว — ห้ามถอด transition ระหว่างไหล (หน้าที่เพิ่งเปิดวาดแถบซ้ำหลายรอบตอนบูต เคยทำให้การไหลถูกยกเลิกแล้วกระโดด) */
  assert.match(mui, /function jumpInd\(ind,x,y\)\{ind\.style\.transition="none";ind\.style\.transform=`translate\(\$\{x\}px,\$\{y\}px\)`;getComputedStyle\(ind\)\.transform;ind\.style\.transition="";indAt=x\}/);
  assert.match(mui, /else if\(indAt===null\|\|\(!anim&&indAt!==s\.x\)\)jumpInd\(ind,s\.x,s\.y\);\n  if\(indAt!==s\.x\)\{ind\.style\.transform=`translate\(\$\{s\.x\}px,\$\{s\.y\}px\)`;indAt=s\.x\}/, 'redrawing at the same spot never touches a slide in progress');
  assert.ok(!/classList\.(?:toggle|remove)\("go"/.test(mui));
  assert.match(mui, /#mnav\.has-ind \.mtab \.mt-i\{background:transparent!important\}/, 'per-tab backgrounds off once the slider exists, so there is never a second highlight');
  assert.match(mui, /@media \(prefers-reduced-motion:reduce\)\{#mnav \.mt-ind,#mnav\.has-ind \.mtab\{transition:none\}\}/);
  assert.match(mui, /\|\|\(D\.querySelector\("\.bs\.on\.inbox"\)&&n\.querySelector\('\[data-mnav="chat"\]'\)\)\|\|n\.querySelector\("\.mtab\.on"\)\}/, 'chat sheet over Home counts as the chat tab');
  assert.match(mui, /inboxWatch=new MutationObserver\(\(\)=>placeInd\(true\)\);inboxWatch\.observe\(bs,\{attributes:true,attributeFilter:\["class"\]\}\)/, 'watches only the sheet\'s class, not the whole page');
  assert.match(mui, /  paintAvatar\(\);\n  placeInd\(true\);watchInbox\(\);\n\}/, 'placed every time the bar is drawn');
  assert.match(mui, /if\(typeof from==="number"\)jumpInd\(ind,from,s\.y\);/, 'starts where the previous page\'s highlight was');
  assert.match(mui, /if\(ind\)\{try\{const m=getComputedStyle\(ind\)\.transform;if\(m&&m!=="none"\)return new DOMMatrixReadOnly\(m\)\.m41\}catch\(e\)\{\}\}/, 'hands over where it visually is, even mid-slide');
  assert.match(mui, /slideFrom\(x\)\{if\(typeof x==="number"\)placeInd\(true,x\)\},/);
  /* แตะแล้วไหลทันที ไม่ต้องรอหน้าใหม่เปิด · ไม่ได้ออกจริงก็ไหลกลับ */
  assert.match(mui, /function go\(k\)\{\n  if\(k!=="account"\|\|signedIn\(\)\)pressInd\(k\);/);
  /* ระหว่างหน้าใหม่กำลังเปิด แท็บที่แตะนับเป็นแท็บที่เลือก — หน้าเดิมวาดแถบซ้ำก็ไม่ดึงกลับ · เปิดไม่สำเร็จ (หน้านี้ยังเห็นอยู่) ไหลกลับเอง */
  assert.match(mui, /function indTarget\(n\)\{return \(pressed&&n\.querySelector\(`\[data-mnav="\$\{pressed\}"\]`\)\)\|\|/);
  assert.match(mui, /function unpress\(\)\{const v=window\.CendonView;if\(v&&!v\.visible\)return;if\(pressed\)\{pressed=null;placeInd\(true\)\}\}/);
  assert.match(mui, /addEventListener\("cendon:view-active",\(\)=>\{clearTimeout\(pressFix\);if\(pressed\)\{pressed=null;placeInd\(true\)\}\}\);/);
  assert.match(mui, /press\(k\)\{if\(k!=="account"\|\|signedIn\(\)\)pressInd\(k\)\}\};/);
  /* ใน shell ตัวรับคลิกของ shell หยุดคลิกแท็บไว้ก่อนถึงแถบ — จึงต้องเรียก press ให้เอง */
  const bridge = readFileSync(new URL('../app-navigation-bridge.js', import.meta.url), 'utf8');
  assert.ok(bridge.indexOf("if(a.matches('#mnav [data-mnav]'))try{W.CendonNav?.press?.(a.dataset.mnav);}catch{}") > 0 &&
    bridge.indexOf("if(a.matches('#mnav [data-mnav]'))") < bridge.indexOf("if(go(u.href)){e.preventDefault();e.stopImmediatePropagation();}"), 'the shell starts the slide before it takes over the tap');
});

test('switching tabs hands the old highlight position to the page that is opening', () => {
  const read = app.indexOf("let navFrom=null;if(was&&was!==r)try{navFrom=was.el.contentWindow.CendonNav?.x();}catch{}");
  const toggle = app.indexOf("f.el.classList.toggle('is-active',on)");
  const give = app.indexOf("if(typeof navFrom==='number')try{r.el.contentWindow.CendonNav?.slideFrom(navFrom);}catch{}");
  assert.ok(read > 0 && read < toggle && toggle < give, 'read from the leaving page, then slide in the arriving page during the cross-fade');
});

test('main tabs are prepared in the background after Home, so the first tap is fast', () => {
  assert.match(app, /const PREWARM=\['garage','chat','news','profile'\];/, 'Cendon AI chat is prepared too (it was the slowest first open: 1.37 s -> 0.35 s at 4x CPU)');
  assert.match(app, /if\(ns==='chat'\)\{let job=null;try\{job=sessionStorage\.getItem\('spire_featureJob'\)\|\|sessionStorage\.getItem\('spire_quoteJob'\);\}catch\{\}if\(job\)continue;\}/, 'not while an AI job from Home is waiting to be sent');
  const chat = r('chat.html');
  assert.match(chat, /async function runFeatureJob\(\)\{\n[^\n]*\n[^\n]*\n  if\(window\.frameElement&&window\.frameElement\.inert\)return false;\n  const job=featureJob\(\);/, 'a chat page prepared in the background never sends a queued AI job before it is opened');
  assert.match(chat, /window\.addEventListener\("cendon:view-active",\(\)=>\{\n  if\(featureJob\(\)\)runFeatureJob\(\)/, 'once opened it picks the job up');
  assert.match(app, /if\(ns===active\)\{openingDone\(\);tint\(\);schedulePrewarm\(\);\}/, 'starts only after the first page is ready');
  assert.match(app, /function schedulePrewarm\(\)\{if\(prewarmPlanned\)return;prewarmPlanned=true;/, 'once per app open');
  assert.match(app, /if\(limit<6\|\|c\?\.saveData\|\|\/2g\/\.test\(c\?\.effectiveType\|\|''\)\)return;/, 'not on low-memory phones, data saver or 2G');
  assert.ok(!app.includes("permissions?.query({name:'geolocation'})"), 'works for people who never answered the location prompt too');
  for (const f of ['garage.html', 'news.html', 'profile.html'])
    assert.ok(r(f).includes('function loadWx(force){\n  /* หน้านี้ถูกเตรียมไว้เบื้องหลัง') &&
      r(f).includes('  if(!force&&window.frameElement&&window.frameElement.inert){addEventListener("cendon:view-active",()=>loadWx(false),{once:true});return Promise.resolve(null)}'),
      f + ': a page prepared in the background asks for location (weather) only once it is really opened');
  assert.match(app, /if\(busy\|\|queued\|\|D\.hidden\|\|frames\.size>=limit\)return;/, 'stops when the user is navigating or the app is in the background');
  assert.match(app, /await idle\(800\);/, 'one page at a time, in idle moments');
  assert.match(app, /const r=await prepare\(new URL\(ROOTS\[ns\],origin\)\.href,true\);if\(ns!==active\)r\.el\.contentWindow\.CendonView\?\.setHidden\(true\);/, 'prepared pages are told they are hidden');
  assert.match(app, /el\.className='app-view is-preparing';el\.inert=background;/, 'cannot be tapped or focused until really opened (activate clears inert)');
  assert.match(app, /catch\{const r=frames\.get\(ns\);if\(r\?\.background&&!r\.ready&&ns!==active&&!calls\.has\(ns\)&&!authOwners\.has\(ns\)&&!r\.el\.contentWindow\.CendonView\?\.dirty\)\{try\{r\.el\.contentWindow\.CendonView\?\.disposeAuth\?\.\(\);\}catch\{\}r\.el\.remove\(\);frames\.delete\(ns\);\}return;\}/, 'failed speculative preparation never removes a replacement foreground view or form');
});

test('new code reaches phones: versions bumped together', () => {
  const sw = r('sw.js'), shell = r('lib/app-shell.mjs');
  assert.ok(shell.includes('/app-navigation.js?v=14') && sw.includes("'./app-navigation.js?v=14'"));
  for (const f of ['index.html', 'garage.html', 'news.html', 'profile.html', 'spares.html', 'chat.html', 'sw.js']) assert.ok(r(f).includes('mobile-ui.js?v=6') && !r(f).includes('mobile-ui.js?v=5'), f);
});
