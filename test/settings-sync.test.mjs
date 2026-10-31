import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

/* ตั้งค่าที่หน้าไหนก็ตาม แท็บอื่นที่เปิดค้าง/เตรียมไว้ล่วงหน้าต้องเปลี่ยนตามทันที (เดิม การาจ/นิตยสาร ค้างธีมเก่าจนกว่าจะรีเฟรช) */
const r = f => readFileSync(new URL('../' + f, import.meta.url), 'utf8').replace(/\r\n/g,'\n');
const PAGES = ['garage.html', 'news.html', 'profile.html', 'spares.html', 'chat.html'];

test('theme set on one tab repaints every other tab at once', () => {
  for (const f of PAGES) {
    const s = r(f), i = s.indexOf('window.spireOnTheme=fn=>');
    assert.ok(i > 0, f);
    assert.ok(s.slice(i, i + 500).includes('addEventListener("storage",e=>{if(e.key!==KEY&&e.key!=="spire_chatTheme")return;const k=read();if(D.documentElement.dataset.theme===k)return;apply(k);listeners.forEach(fn=>{ try{ fn(k) }catch(x){} })});'), f + ' follows spire_theme changes and tells its own components');
  }
  assert.match(r('index.html'), /if\(e\.key===TKEY\|\|e\.key===PKEY\|\|e\.key==="spire_chatTheme"\)sync\(\);/, 'Home already followed theme and accent');
  assert.match(r('app-navigation.js'), /W\.addEventListener\('storage',e=>\{if\(e\.key!=='spire_theme'\)return;try\{D\.documentElement\.dataset\.theme=/, 'the shell background behind loading pages follows too');
});

test('accent colour set on one tab repaints the tabs that have one', () => {
  for (const f of ['garage.html', 'chat.html'])
    assert.ok(r(f).includes('window.spireApplyPrimary=()=>apply(read());\n/* สีหลักที่ตั้งจากหน้าอื่น ทาหน้านี้ใหม่ทันทีด้วย */\naddEventListener("storage",e=>{if(e.key===KEY)apply(read())});'), f);
});

test('language set on one tab switches the other tabs in place', () => {
  for (const f of PAGES) {
    const s = r(f), i = s.indexOf('window.spireOnLang=fn=>');
    assert.ok(s.slice(i, i + 600).includes('addEventListener("storage",e=>{if(e.key!==KEY)return;let v=null;try{v=JSON.parse(e.newValue)}catch(x){}if(typeof v==="string"&&v!==cur&&CODES.indexOf(v)>=0)set(v)});'), f + ' re-renders through its own set() (only when it really changed, so no echo loop)');
  }
});
