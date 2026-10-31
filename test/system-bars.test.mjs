import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { inflateSync } from 'node:zlib';

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
  assert.ok(shell.includes('/app-navigation.js?v=9') && sw.includes("'./app-navigation.js?v=9'"), 'shell and offline cache load the same version');
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

test('Android first frame is the opening screen\'s first frame, so the two read as one', () => {
  const m = JSON.parse(r('manifest.webmanifest')), css = r('app-navigation.css'), shell = r('lib/app-shell.mjs');
  assert.equal(m.background_color, '#0B0B0E');
  assert.match(css, /#appOpening \.op-bg\{inset:0;background:#0B0B0E\}/, 'same dark as the Android first frame');
  assert.ok(shell.includes('<meta name="theme-color" content="#0B0B0E">'), 'bars (when shown) match the opening screen until the first page tints them');
  /* Chrome วาดหน้าเปิดจากไอคอน "any" ใหญ่สุดบนพื้น background_color (ภาพหน้าจอผู้ใช้ตรงกับ icon512 เดิม) */
  const anyIcons = m.icons.filter(i => i.purpose === 'any');
  assert.deepEqual(anyIcons.map(i => i.src + ' ' + i.sizes), ['./icon192.png 192x192', './icon-splash.png 1024x1024']);
  assert.ok(m.icons.some(i => i.purpose === 'maskable' && i.src === './iconmaskable.png'), 'home-screen icon unchanged');
  const png = readFileSync(new URL('../icon-splash.png', import.meta.url));
  assert.equal(png.readUInt32BE(16), 1024); assert.equal(png.readUInt32BE(20), 1024);
  assert.equal(png[25], 2, 'opaque, so nothing can fill transparency with another colour');
  /* มุมภาพต้องเป็นสีพื้นเดียวกันพอดี ไม่งั้นเห็นเป็นกล่องบนจอ (พิกเซลแรกของแถวแรกไม่ขึ้นกับตัวกรอง PNG) */
  const idat = [];for (let o = 8; o < png.length;) { const n = png.readUInt32BE(o), t = png.toString('latin1', o + 4, o + 8); if (t === 'IDAT') idat.push(png.subarray(o + 8, o + 8 + n)); o += 12 + n; }
  const raw = inflateSync(Buffer.concat(idat));
  assert.deepEqual([...raw.subarray(1, 4)], [0x0B, 0x0B, 0x0E], 'corner = background_color');
  /* หน้าเปิดเริ่มที่ภาพเดียวกัน: กล่อง 240 (ขนาดที่ Chrome วาดไอคอน) แสงนุ่ม + โลโก้ 60×72 กลางจอ */
  assert.match(css, /#appOpening \.op-mark\{left:50%;top:50%;width:240px;height:240px;margin:-120px 0 0 -120px\}/, 'dead centre, where Android draws its icon');
  assert.match(css, /#appOpening \.op-logo\{position:absolute;left:90px;top:84px;width:60px;height:72px;/);
  /* โลโก้เป็น <img> จริง: Chrome นับว่า "วาดเนื้อหาแล้ว" ตั้งแต่ภาพนี้ขึ้น (รูป > 32×32) แล้วจางหน้าของมันออกทันที ไม่รอสคริปต์ */
  assert.match(shell, /<i class="op-mark" aria-hidden="true"><i class="op-halo"><\/i><img class="op-logo" alt="" src="data:image\/svg\+xml,%3Csvg xmlns='http:\/\/www\.w3\.org\/2000\/svg' width='95' height='112' /);
  assert.ok(!css.includes('.op-mark b'), 'no orange tile any more');
});

test('no second opening screen: the page only holds Android\'s frame until Home is ready, and never gets stuck', () => {
  const css = r('app-navigation.css'), app = r('app-navigation.js'), shell = r('lib/app-shell.mjs'), sw = r('sw.js');
  assert.ok(shell.includes('<div id="appOpening" role="status" aria-label="กำลังเปิดแอป · Opening your app"><i class="op-bg"></i><i class="op-mark" aria-hidden="true"><i class="op-halo"></i><img class="op-logo"'));
  assert.match(shell, /<img class="op-logo" alt="" src="[^"]+"><\/i><\/div>/, 'logo and glow only: no waves, wordmark or loader');
  for (const gone of ['op-waves', 'op-load', 'op-tag', 'opFlow', 'opLift', 'kanit-600-latin']) assert.ok(!css.includes(gone) && !shell.includes(gone), gone + ' removed');
  assert.match(css, /#appOpening\{position:fixed;inset:0;z-index:10;pointer-events:auto;animation:opBail \.3s ease-in 10s forwards\}/, 'above the loading page; CSS gives up by itself after 10 s even without scripts');
  assert.match(css, /#appOpening\.is-out\{animation:opOut \.28s ease-out both\}/);
  assert.match(app, /opening\.classList\.add\('is-ready','is-out'\);setTimeout\(\(\)=>\{opening\.hidden=true;\},300\);/, 'fades the moment Home is ready, no extra wait');
  assert.match(app, /\nsetTimeout\(openingDone,6000\);\n/, 'a page that never reports ready still shows');
  assert.ok(!/getElementById\('appOpening'\)\.hidden=true/.test(app), 'every exit goes through openingDone');
  assert.ok(shell.includes('/app-navigation.js?v=9') && sw.includes("'./app-navigation.js?v=9'") && shell.includes('/app-navigation.css?v=5') && sw.includes("'./app-navigation.css?v=5'"));
});

test('install settings and their icons always come from the server, never the offline cache', () => {
  /* Chrome อ่าน manifest/ไอคอนผ่าน service worker ตอนติดตั้งและตอนเช็กอัปเดต — ถ้าตอบจากแคชก่อน จะได้รุ่นก่อนหน้า (ติดตั้งใหม่ก็ยังสี่เหลี่ยมส้ม/ไม่เต็มจอ) */
  const sw = r('sw.js'), m = JSON.parse(r('manifest.webmanifest'));
  const fetchStart = sw.indexOf("self.addEventListener('fetch'");
  const bypass = sw.indexOf("if (/^\\/(?:manifest\\.webmanifest|icon192\\.png|icon512\\.png|icon-splash\\.png|iconmaskable\\.png)$/.test(url.pathname)) return;");
  assert.ok(fetchStart > 0 && bypass > fetchStart, 'passed straight to the network');
  assert.ok(bypass < sw.indexOf('e.respondWith(asset(e, req))'), 'before the cache-first asset handler');
  for (const i of m.icons) assert.ok(new RegExp('\\|' + i.src.replace('./', '').replace('.', '\\\\.') + '\\||\\(\\?:' + i.src.replace('./', '').replace('.', '\\\\.') + '\\||\\|' + i.src.replace('./', '').replace('.', '\\\\.') + '\\)').test(sw.slice(bypass, bypass + 200)), i.src + ' bypasses the cache');
});
