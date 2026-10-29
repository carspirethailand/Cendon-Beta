import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
/* หน้าหลัก ↔ แชตไม่ค้าง · เมนูดรอปดาวน์ไม่กะพริบ · เปลี่ยนหน้า/ปิดแผ่นแบบนุ่ม (ทดสอบจริงในเบราว์เซอร์: home-chat-barba-browser.mjs) */
const r=f=>readFileSync(new URL('../'+f,import.meta.url),'utf8').replace(/\r\n/g,'\n');
const nav=r('nav.js'),stab=r('stability.js'),bridge=r('app-navigation-bridge.js'),app=r('app-navigation.js'),css=r('app-navigation.css'),drop=r('drop.js'),home=r('index.html'),chat=r('chat.html');

test('tapping the current tab inside the app frame closes layers in place instead of going back in shared history',()=>{
  assert.match(nav,/function reset\(\)\{closeAbove\(-1\);stamp\(\);\}/);
  assert.match(nav,/window\.Nav=\{route,start,push,back,drop,go,home,reset,/);
  assert.match(stab,/if\(window\.CendonView&&Nav\.reset\)Nav\.reset\(\);else Nav\.home\(\)/,'mobile tab bar');
  assert.match(home,/if\(window\.CendonView&&Nav\.reset\)Nav\.reset\(\);else Nav\.home\(\)\}else location\.href="\/"/,'desktop Home link');
});

test('a view never keeps a layer URL after its layers are closed',()=>{
  assert.match(nav,/function home\(\)\{if\(stack\.length\)back\(stack\[0\]\);else if\(here\(\)!==root\)stamp\(\);\}/,'Home with no layers repairs a stale URL');
  assert.match(nav,/if\(window\.CendonView\)\{if\(n\)local\(\);else stamp\(\)\}\n  travel\(n\);/,'frame URL follows the closed layers before the host traverses');
  assert.match(bridge,/local\(state,title,url\)\{replace\(state,title,url\);P\.CendonApp\?\.track\?\.\(ns,W\.location\.href\);\}/);
  assert.match(bridge,/const replace=\(\.\.\.a\)=>W\.history\.replaceState\(\.\.\.a\);/,'page hooks (tab highlight) still see URL changes');
  assert.match(app,/let at=r\.url;try\{at=r\.el\.contentWindow\.location\.href;\}catch\{\}\n  if\(r\.url!==url\|\|at!==url\)/,'checks the real frame location before revealing it');
});

test('a browser-restored stale document is never shown inside another view',()=>{
  assert.match(app,/if\(namespace\(u,origin\)===r\.el\.dataset\.cendonView\)return false;w\.__cendonHostNav=true;w\.location\.replace\(/);
  assert.match(app,/function ready\(ns,localHistory\)\{const r=frames\.get\(ns\);if\(r&&wrongDocument\(r\)\)\{r\.ready=false;return;\}/);
  assert.match(bridge,/if\(W\.__cendonHostNav\|\|e\.destination\.sameDocument/,'the correction is not re-routed through the host');
});

test('views crossfade briefly; the view being shown never keeps the leaving state',()=>{
  assert.match(css,/\.app-view\.is-leaving\{visibility:visible;opacity:1;z-index:2;pointer-events:none\}\.app-view\.is-entering\{animation:app-in \.2s /);
  assert.match(css,/@media\(prefers-reduced-motion:reduce\)\{#appProgress,\.app-view\.is-entering\{animation:none\}\}/);
  assert.match(app,/r\.el\.classList\.remove\('is-leaving'\);/);
  assert.match(app,/if\(was&&was!==r&&was\.el\.isConnected&&!immediate\)\{/);
  assert.ok(app.includes("if(immediate)for(const f of frames.values())f.el.classList.remove('is-leaving','is-entering')"),'a first view has no extra fade delay or overlapping navbars');
});

test('dropdowns start their open animation before the first painted frame (no flash, vanish, fade)',()=>{
  assert.match(drop,/const add=e=>\{q\.add\(e\);if\(!due\)\{due=true;queueMicrotask\(flush\)\}\};/);
  assert.match(drop,/if\(now\)play\(e,true\);/);
  assert.doesNotMatch(drop,/requestAnimationFrame\(\(\)=>play\(e,true\)\)/);
});

test('sheets slide out before hiding; the Chat tab switches like a tab, not a pop-up',()=>{
  assert.match(home,/\.bs\{position:fixed;inset:0;z-index:1000;visibility:hidden;pointer-events:none;transition:visibility 0s linear \.3s\}/);
  assert.match(home,/\.bs\.on\{visibility:visible;pointer-events:auto;transition:none\}/);
  assert.match(home,/\.bs\.inbox \.bg\{display:none\}\n  \.bs\.inbox \.pn\{transform:translateY\(8px\);opacity:0;box-shadow:none\}/);
  assert.match(home,/if\(!was\)\{if\(bs\.classList\.contains\("inbox"\)!==!!o\.inbox\)\{bs\.classList\.toggle\("inbox",!!o\.inbox\);void bs\.offsetWidth\}/,'a normal sheet after the inbox still slides up');
});

test('chat history ⋯ menu opens under the tapped button',()=>{
  assert.match(chat,/window\.sessMenu\(mn\.dataset\.menu,\{currentTarget:mn,target:mn,stopPropagation\(\)\{\},preventDefault\(\)\{\}\}\)/);
});

test('Home repairs itself if it is ever left showing with a closed layer\'s URL',()=>{
  assert.match(home,/function healUrl\(\)\{try\{/);
  assert.match(home,/if\(Nav\.stack\.some\(l=>l\.tag==="sheet"\|\|l\.tag==="chat"\)\)\{if\(window\.CendonView&&Nav\.reset\)Nav\.reset\(\);else Nav\.home\(\);return\}/);
  assert.match(home,/if\(!Nav\.top\(\)&&Nav\.clean\(location\.pathname\)!==Nav\.base\)Nav\.home\(\);/);
  assert.match(home,/addEventListener\("cendon:view-active",\(\)=>healSoon\(300\)\);/);
});

test('nav.js is versioned everywhere so a fix is never served from an older cache',()=>{
  for(const f of ['index','garage','chat','news','spares','profile'])assert.match(r(f+'.html'),/<script src="\/?nav\.js\?v=2"><\/script>/,f);
  assert.match(r('sw.js'),/'\.\/nav\.js\?v=2'/);
});
