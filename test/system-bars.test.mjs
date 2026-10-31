import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

/* แถบของมือถือ (แถบสถานะบน · แถบปุ่มล่าง) ต้องกลืนกับแอป ไม่ใช่แถบดำ/ส้มคั่น */
const r = f => readFileSync(new URL('../' + f, import.meta.url), 'utf8');

test('installed app bottom bar is the app background, not the old orange', () => {
  const m = JSON.parse(r('manifest.webmanifest'));
  assert.notEqual(m.theme_color.toUpperCase(), '#D95E3C', 'Android paints the bottom bar with the manifest theme_color');
  assert.match(m.theme_color, /^#0[0-9A-F]0[0-9A-F]0[0-9A-F]$/i, 'a near-black that matches the dark app background');
});

test('status bar follows the page that is open, in light and dark themes', () => {
  const app = r('app-navigation.js'), shell = r('lib/app-shell.mjs'), sw = r('sw.js');
  assert.match(app, /const shellTint=D\.querySelector\('meta\[name="theme-color"\]'\);let tintWatch=null;/);
  assert.match(app, /m=frames\.get\(active\)\?\.el\.contentDocument\?\.querySelector\('meta\[name="theme-color"\]'\);/, 'reads the open view\'s own theme-color (set by theme.js)');
  assert.match(app, /tintWatch=new MutationObserver\(copy\);tintWatch\.observe\(m,\{attributes:true,attributeFilter:\['content'\]\}\);/, 'keeps following when that page switches theme');
  assert.match(app, /tintWatch\?\.disconnect\(\);tintWatch=null;/, 'only one view is watched at a time');
  assert.match(app, /if\(ns===active\)\{openingDone\(\);tint\(\);\}/, 'first view ready');
  assert.match(app, /D\.title=r\.el\.contentDocument\?\.title\|\|'Cendon';tint\(\);callUI\(\);evict\(\);/, 'every tab switch');
  assert.ok(shell.includes('/app-navigation.js?v=8') && sw.includes("'./app-navigation.js?v=8'"), 'shell and offline cache load the same version');
  assert.ok(shell.includes('/app-navigation.css?v=4') && sw.includes("'./app-navigation.css?v=4'"));
});

test('home sky glows right up to the top edge (fullscreen draws under the camera area)', () => {
  const home = r('index.html');
  assert.match(home, /\.lx-sky\{position:absolute;top:calc\(-1 \* env\(safe-area-inset-top\)\);[^}]*mask-image:linear-gradient\(180deg,#000 0%,#000 48%,/);
});

test('installed app opens fullscreen, and the pages still know they are installed', () => {
  const m = JSON.parse(r('manifest.webmanifest'));
  assert.equal(m.display, 'fullscreen', 'no status bar or button bar strips above and below the app');
  for (const f of ['profile.html', 'app.js', 'chat.html', 'spares.html', 'garage.html', 'news.html']) {
    const src = r(f);
    assert.ok(src.includes('window.matchMedia("(display-mode: standalone),(display-mode: fullscreen)").matches||'), f + ' must not offer "install the app" inside the installed app');
    assert.ok(!src.includes('matchMedia("(display-mode: standalone)")'), f);
  }
});

test('Android first frame hands over to the opening screen without a jump', () => {
  const m = JSON.parse(r('manifest.webmanifest')), css = r('app-navigation.css'), shell = r('lib/app-shell.mjs');
  assert.equal(m.background_color, '#0B0B0E');
  assert.match(css, /#appOpening \.op-bg\{inset:0;background:#0B0B0E\}/, 'same dark as the Android first frame');
  assert.ok(shell.includes('<meta name="theme-color" content="#0B0B0E">'), 'bars (when shown) match the opening screen until the first page tints them');
  const any512 = m.icons.find(i => i.sizes === '512x512' && i.purpose === 'any');
  assert.equal(any512.src, './icon-splash.png', 'Android draws the splash from the 512 "any" icon');
  assert.ok(m.icons.some(i => i.purpose === 'maskable' && i.src === './iconmaskable.png'), 'home-screen icon unchanged');
  const png = readFileSync(new URL('../icon-splash.png', import.meta.url));
  assert.equal(png.readUInt32BE(16), 512); assert.equal(png.readUInt32BE(20), 512);
  assert.equal(png[25], 6, 'RGBA: rounded tile on a transparent square, not a hard-edged orange block');
  assert.match(css, /#appOpening \.op-mark\{left:50%;top:calc\(50% - 112px\);width:120px;height:120px;margin-left:-60px;animation:opLift/);
  assert.match(css, /@keyframes opLift\{from\{transform:translateY\(52px\)\}to\{transform:none\}\}/, 'starts dead centre, where Android left the icon');
});

test('opening screen: waves while loading, leaves when Home is ready, never gets stuck', () => {
  const css = r('app-navigation.css'), app = r('app-navigation.js'), shell = r('lib/app-shell.mjs');
  assert.ok(shell.includes('<div id="appOpening" role="status" aria-label="กำลังเปิดแอป · Opening your app"><i class="op-bg"></i><i class="op-glow"></i><span class="op-waves" aria-hidden="true"><i></i><i></i><i></i></span><i class="op-mark" aria-hidden="true"><b></b></i><strong>Cendon</strong>'));
  assert.match(css, /#appOpening\{position:fixed;inset:0;z-index:10;[^}]*animation:opBail \.4s ease-in 10s forwards\}/, 'above the loading page; CSS gives up by itself after 10 s even without scripts');
  assert.match(css, /#appOpening\.is-ready\{pointer-events:none\}/, 'taps reach Home as soon as it is ready');
  assert.match(app, /const wait=calm\?0:Math\.max\(0,900-performance\.now\(\)\);/, 'only waits for the first beat, never longer');
  assert.match(app, /setTimeout\(\(\)=>\{opening\.classList\.add\('is-out'\);setTimeout\(\(\)=>\{opening\.hidden=true;\},calm\?220:720\);\},wait\);/);
  assert.match(app, /\nsetTimeout\(openingDone,6000\);\n/, 'a page that never reports ready still shows');
  assert.ok(!/getElementById\('appOpening'\)\.hidden=true/.test(app), 'every exit goes through openingDone');
  assert.match(css, /@media\(prefers-reduced-motion:reduce\)\{\n  #appOpening \*,#appOpening \*::after\{animation:none!important\}/);
  /* คลื่นวนต่อกันไม่มีรอยต่อ: เลื่อนครั้งละ 1 รอบคลื่น (390) ของภาพกว้าง 780 */
  assert.match(css, /@keyframes opFlow\{to\{transform:translateX\(-390px\)\}\}/);
  assert.equal((css.match(/#appOpening \.op-waves i:nth-child\(\d\)\{[^}]*background-image:url\("data:image\/svg\+xml,/g) || []).length, 3);
});
