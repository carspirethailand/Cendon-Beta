import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
/* รอบตรวจซ้ำรายการ feedback: ของที่ยังพังจริงตอนทดสอบในเบราว์เซอร์ แล้วแก้ในรอบนี้ */
const r=f=>readFileSync(new URL('../'+f,import.meta.url),'utf8').replace(/\r\n/g,'\n');
const chat=r('chat.html'),bell=r('bell.js'),garage=r('garage.html');

test('#10 หาสาเหตุกับ AI: opens the symptom picker for that car, and the late sign-in check no longer throws it back to the welcome page', () => {
  const re=chat.slice(chat.indexOf('function runEntry(){'),chat.indexOf('</script>',chat.indexOf('function runEntry(){')));
  assert.match(re,/if\(entryHeld&&!\(useFb&&!currentUser\)&&selCar\(\)&&ph!=="login"&&ph!=="gate"\)\{renderCarUI\(\);return\}/);
  assert.match(re,/entryHeld=!!\(p\.session\|\|p\.pane\|\|p\.attach\|\|p\.q\|\|p\.starter\|\|featureJob\(\)\);/);
  assert.match(re,/\}else if\(p\.starter&&!messages\.length\)\{\n[^\n]*\n    showSymCats\(\);/);
});

test('#20 notification on/off never waits forever for the service worker; the button flips right away', () => {
  assert.match(bell,/const swReady=\(\)=>"serviceWorker" in navigator\?Promise\.race\(\[navigator\.serviceWorker\.ready,new Promise\(r=>setTimeout\(\(\)=>r\(null\),4000\)\)\]\)/);
  const en=bell.slice(bell.indexOf('async function enable(){'),bell.indexOf('/* ปิดแจ้งเตือนในเครื่อง:'));
  assert.match(en,/localStorage\.setItem\(PREF,"true"\)\}catch\(e\)\{\}\n  subscribeBg\(\);/,'push sign-up happens in the background');
  assert.doesNotMatch(en+bell.slice(bell.indexOf('async function disable(){'),bell.indexOf('function on(f)')),/await navigator\.serviceWorker\.ready/);
  assert.match(bell,/if\(off_\)off_\.onclick=\(\)=>\{off_\.disabled=true;disable\(\);/);
});

test('#24 "where is my car / how far": answered instantly on the device, coordinates never go to the AI or chat history', () => {
  assert.match(chat,/window\.CendonParkAsk=\{\n  wants:t=>PARK_Q\.test/);
  const c={};vm.createContext(c);
  const src=chat.match(/const PARK_Q=(\/.*?\/i);/)[1];const re=vm.runInContext(src,c);
  for(const q of ['รถจอดอยู่ไหน','จอดรถไว้ตรงไหนนะ','ห่างจากรถเท่าไหร่','หารถไม่เจอ','where did I park','find my car','how far is my car'])assert.ok(re.test(q),q);
  for(const q of ['หาที่จอดรถแถวสยามได้ไหม','แอร์ไม่เย็น','ที่จอดรถห้างไหนฟรี'])assert.ok(!re.test(q),q);
  assert.match(chat,/const hist=messages\.filter\(m=>!m\.typing&&m\.role!=="sum"&&!m\.local\)/,'local answers are not sent to the AI');
  assert.match(chat,/if\(m\.local\)o\.local=1;/);
  assert.doesNotMatch(chat.slice(chat.indexOf('function stripForSave('),chat.indexOf('const mediaIdsOf')),/nav/,'map coordinates are not saved with the chat');
  assert.match(chat,/const hasAi=real\.some\(m=>m\.role==="ai"&&m\.text&&!m\.local\);/);
});

test('#4 a maintenance reminder cannot be set absurdly far ahead of the car\'s mileage', () => {
  assert.match(garage,/const kmCap=Math\.min\(1000000,\(KM\(c\)\|\|0\)\+200000\);\n    if\(dueKm>kmCap\)\{toastx\(/);
  assert.match(garage,/<input id="tdKm" type="number" inputmode="numeric" min="0" max="\$\{Math\.min\(1000000,\(KM\(c\)\|\|0\)\+200000\)\}"/);
});

test('#16 chat opens without flashing or jumping: theme set on the first frame, page styles read before the content', () => {
  for(const f of ['index.html','garage.html','spares.html','news.html','profile.html','chat.html']){
    const s=r(f),head=s.slice(0,s.indexOf('</head>'));
    assert.ok(head.indexOf('ธีมตั้งแต่เฟรมแรก')>-1&&head.indexOf('ธีมตั้งแต่เฟรมแรก')<head.indexOf('<script src='),f+': theme script runs before anything else');
  }
  const body=chat.slice(chat.indexOf('<body'));
  const firstMarkup=body.search(/<(div|section|header|main)\b/);
  for(const id of ['chatui2','cendon-one','feat-css'])assert.ok(body.indexOf(`<style id="${id}">`)<firstMarkup,id+' is read before the page content');
  assert.doesNotMatch(chat,/animation:pillIn/,'the top bar is page chrome: it stays put, no fade or slide');
  assert.match(chat,/<link rel="expect" href="#chatShellReady" blocking="render">/,'first frame waits until the chat layout is assembled');
  assert.match(chat,/<\/script>\n<i id="chatShellReady" hidden><\/i>/);
  assert.match(chat,/if\(D\.readyState==="loading"\)\{try\{wrap\(\)\}catch\(e\)\{\}D\.addEventListener\("DOMContentLoaded",boot\)\}/);
});

test('#14 no overshooting (bouncy) easing left in the call screen', () => {
  for(const f of ['call-ui.css','call-surface.js'])
    for(const m of r(f).matchAll(/cubic-bezier\(([^)]*)\)/g)){const v=m[1].split(',').map(Number);assert.ok(v[1]>=0&&v[1]<=1&&v[3]>=0&&v[3]<=1,f+' '+m[0])}
});

test('Studio: the bell sits in the Studio top bar next to the shop picture — the floating one is hidden so it never covers the picture', () => {
  assert.match(bell,/body\[data-mode="tech"\] \.cb-bell\.cb-m\{display:none!important\}/);
  assert.match(bell,/const st=document\.querySelector\("\.stu-top"\);\n    if\(st&&!st\.querySelector\(":scope>\.cb-bell"\)\)\{st\.insertBefore\(mkBtn\("cb-st"\),st\.querySelector\(":scope>\.stu-me"\)\);paint\(\)\}/);
  assert.match(r('index.html'),/<header class="stu-top">[\s\S]{0,900}<button type="button" class="stu-me" id="stuMe"/);
});

test('#26 specs go deeper: performance, clearance, turning radius, boot, suspension and brakes are shown; old saved specs are asked for again', () => {
  const cs=r('carspec.js');
  for(const k of ['top_kmh','accel_s','ground_clearance_mm','turning_m','cargo_l','suspension_front','suspension_rear','brakes_front','brakes_rear'])assert.ok(cs.includes(k),k);
  assert.match(cs,/have\.data\?\.schema===2&&have\.sources\?\.length&&\(equipment\|\|have\.data\.depth>=2\)/);
  for(const f of ['garage.html','news.html','profile.html','spares.html','sw.js'])assert.match(r(f),/carspec\.js\?v=2026-10-18-r1/,f);
});

test('home navbar selector stays put: no slide on load or when arriving from another page', () => {
  const home=r('index.html');
  assert.match(home,/box-shadow:0 8px 20px -8px rgba\(217,94,60,\.6\);transition:none\}/);
  assert.match(home,/::view-transition-group\(navind\)\{animation:none\}/);
  assert.match(home,/<\/div>\n      <script>\/\* วางตัวชี้แท็บที่แท็บที่เลือกตั้งแต่เฟรมแรก \*\//,'placed on the first frame, before the page scripts');
  for(const f of ['garage.html','spares.html','news.html'])assert.match(r(f),/i\.style\.transition="none";i\.style\.width=a\.offsetWidth\+"px"/,f);
});

test('desktop bell is in the navbar markup from the first frame (no blink on page change); bell.js adopts it', () => {
  for(const f of ['index.html','garage.html','spares.html','news.html','profile.html']){
    const s=r(f),nr=s.slice(s.indexOf('<div class="nav-right">'),s.indexOf('<div class="dd" id="dd">'));
    assert.match(nr,/<button type="button" class="cb-bell cb-d" aria-label="การแจ้งเตือน"><i class="ti ti-bell"><\/i><em hidden><\/em><\/button>\n        <button class="avatar" id="avatarBtn">/,f);
    assert.match(nr,/if\(!on\)\{bl\.hidden=true;return\}/,f);
    assert.match(nr,/x\.textContent=String\(u\.name\|\|"\?"\)\.charAt\(0\)\.toUpperCase\(\)/,f+': cached name is text, never HTML');
    assert.match(s,/bell\.js\?v=16/,f);
  }
  assert.match(bell,/if\(own\)wire\(own\);else\{const b=mkBtn\("cb-d"\)/);
  assert.match(bell,/if\(W\.__cbMounted\)return;W\.__cbMounted=1;/);
});

test('garage has no Wrapped banner — Wrap is reached only by flipping a car card', () => {
  const gx=r('garage-extras.js');
  assert.doesNotMatch(gx,/wrBanner|function banner/);assert.doesNotMatch(r('garage-extras.css'),/\.wr-banner/);
  assert.match(gx,/closest\('\.gx-back \[data-wrap\]'\);if\(w\)wrapped\(\{car:w\.dataset\.wrap\}\)/);
  assert.match(r('garage.html'),/garage-extras\.js\?v=7/);assert.match(r('sw.js'),/garage-extras\.js\?v=7'/);
});
