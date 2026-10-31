import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {load} from '../i18n/extract.mjs';

/* เปิดตัวในไทย: ไทย อังกฤษ (ในหน้า) + จีน (i18n/home-zh.js) — เพิ่มข้อความใหม่ในหน้าแล้วต้องแปลจีนด้วย
   ไฟล์อีก 9 ภาษาเก็บไว้เปิดทีหลัง: ต้องโหลดได้และถูกต้อง แต่ยังไม่บังคับให้แปลข้อความใหม่ครบ (เปิดภาษาไหนเมื่อไรค่อยเติม) */
const LIVE=['zh'],ARCHIVED=['ja','ko','id','vi','ms','de','fr','es','pt'],LANGS=[...LIVE,...ARCHIVED];
const {strings}=load();
function dict(lang){
  const sandbox={window:{}};vm.runInNewContext(fs.readFileSync(new URL(`../i18n/home-${lang}.js`,import.meta.url),'utf8'),sandbox);
  return sandbox.window.CENDON_L10N;
}

test('i18n: ไฟล์คำแปลครบ 10 ภาษา โหลดได้ และระบุภาษาตรงกับชื่อไฟล์',()=>{
  for(const lang of LANGS){const d=dict(lang);assert.equal(d.lang,lang);assert.ok(Object.keys(d.t).length>1000,lang);}
});

test('i18n: ทุกข้อความ UI ของหน้าแรก/หน้าช่างมีคำแปลทุกภาษาที่เปิดใช้',()=>{
  assert.ok(strings.length>1000,'ดึงข้อความได้ '+strings.length);
  for(const lang of LIVE){
    const t=dict(lang).t,missing=strings.filter(s=>!(s in t));
    assert.deepEqual(missing,[],`ภาษา ${lang} ยังไม่มีคำแปล ${missing.length} ข้อความ — เพิ่มใน i18n/home-${lang}.js`);
  }
});

test('i18n: ค่าแทน {0} {1} ไม่หายในคำแปล (ยกเว้นท้ายคำพหูพจน์อังกฤษ เช่น job{1})',()=>{
  for(const lang of LANGS){
    for(const [en,tr] of Object.entries(dict(lang).t)){
      for(const m of en.matchAll(/\{(\d)\}/g)){
        /* ติดท้ายคำอังกฤษ (day{2}, message{1}) = ส่วนเสริมไวยากรณ์อังกฤษ ภาษาอื่นไม่ต้องใช้ */
        const plural=/[A-Za-z]$/.test(en.slice(0,m.index));
        if(!plural)assert.ok(tr.includes(m[0]),`${lang}: "${en}" → "${tr}" ไม่มี ${m[0]}`);
      }
      assert.ok(!/[฀-฾เ-๿]/.test(tr)||/เชื่อมต่อ/.test(tr),`${lang}: ห้ามมีภาษาไทยในคำแปล "${tr}"`);
    }
  }
});

test('i18n: หน้าแรกโหลดพจนานุกรมก่อนสคริปต์หลัก และใช้ตัวแปลเดียวกันทั้ง T() และข้อความบนจอ',()=>{
  const html=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8');
  const loader=html.indexOf('/i18n/home-'),main=html.indexOf('const EN={');
  assert.ok(loader>0&&loader<main,'ตัวโหลดต้องอยู่ก่อนสคริปต์หลัก');
  assert.match(html,/const T=\(th,en\)=>TH\?th:\(en!=null\?xl\(en,true\):tr\(th\)\);/);
  assert.match(html,/const trText=/);
});

test('launch languages are the same everywhere: Thai, English, Chinese', () => {
  const r = f => fs.readFileSync(new URL('../' + f, import.meta.url), 'utf8');
  const home = r('index.html');
  assert.match(home, /var A=\["th","en","zh"\],l=null;/, 'pre-paint loader only fetches the Chinese pack');
  assert.match(home, /const LANGS=\["th","en","zh"\];/);
  assert.match(r('ui-language.js'), /const CODES=\['th','en','zh'\]/);
  const v = home.match(/i18n\/home-'\+l\+'\.js\?v=(\d+)/)[1];
  assert.ok(r('ui-language.js').includes(`'/i18n/home-'+code+'.js?v=${v}'`), 'shared loader asks for the same pack version as Home (no stale cached pack)');
  assert.match(r('ui-language.js'), /if\(W\.CENDON_L10N\?\.lang===code\)pack\(code\);/, 'a pack Home already loaded is reused, not fetched twice');
  assert.match(r('cloud-swap.js'), /var ORDER=\['th','en','zh'\];/);
  assert.match(r('call-session.js'), /if\(!\['th','en','zh'\]\.includes\(code\)/);
  assert.match(r('valet-core.js'), /lang:\['th','en','zh'\]/);
  assert.match(r('valet.js'), /const LANGS=\{th:"ไทย",en:"English",zh:"中文"\};/);
  for (const p of ['profile.html', 'garage.html', 'news.html', 'chat.html', 'spares.html']) {
    const s = r(p), list = s.slice(s.indexOf('const LOCALES=['), s.indexOf('];', s.indexOf('const LOCALES=[')));
    assert.deepEqual([...list.matchAll(/c:"(\w+)"/g)].map(m => m[1]), ['th', 'en', 'zh'], p);
    assert.match(s, /if\(!\["th","en","zh"\]\.includes\(lang\)\)lang=\(window\.spireLang&&window\.spireLang\(\)\)\|\|"en";/, p + ': a stored retired language falls back');
  }
  assert.doesNotMatch(r('chat.html'), /data-l="(ja|de|es)"/);
  assert.match(r('site/content/help.mjs'), /ได้ 3 ภาษา: ไทย อังกฤษ และจีน/);
  assert.doesNotMatch(r('about.html') + r('help.html'), /12 ภาษา|12 languages/);
});
