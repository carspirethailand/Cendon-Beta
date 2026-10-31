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
  assert.match(app, /if\(ns===active\)\{D\.getElementById\('appOpening'\)\.hidden=true;tint\(\);\}/, 'first view ready');
  assert.match(app, /D\.title=r\.el\.contentDocument\?\.title\|\|'Cendon';tint\(\);callUI\(\);evict\(\);/, 'every tab switch');
  assert.ok(shell.includes('/app-navigation.js?v=7') && sw.includes("'./app-navigation.js?v=7'"), 'shell and offline cache load the same version');
});

test('home sky starts from the page colour at the top edge, so a solid status bar joins it', () => {
  const home = r('index.html');
  assert.match(home, /\.lx-sky\{[^}]*mask-image:linear-gradient\(180deg,transparent 0,#000 calc\(env\(safe-area-inset-top\) \+ 48px\),/);
});
