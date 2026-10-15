import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {load} from '../i18n/extract.mjs';

/* หน้าแรก/หน้าช่างรองรับ 13 ภาษา: ไทย อังกฤษ (ในหน้า) + 11 ภาษาจากไฟล์ i18n/home-<lang>.js
   เพิ่มข้อความใหม่ในหน้าแล้วต้องเพิ่มคำแปลทุกภาษา — เทสต์นี้จะบอกว่าขาดข้อความไหน */
const LANGS=['zh','ja','ko','id','vi','ms','de','fr','es','pt','ar'];
const {strings}=load();
function dict(lang){
  const sandbox={window:{}};vm.runInNewContext(fs.readFileSync(new URL(`../i18n/home-${lang}.js`,import.meta.url),'utf8'),sandbox);
  return sandbox.window.CENDON_L10N;
}

test('i18n: ไฟล์คำแปลครบ 11 ภาษา โหลดได้ และระบุภาษาตรงกับชื่อไฟล์',()=>{
  for(const lang of LANGS){const d=dict(lang);assert.equal(d.lang,lang);assert.ok(Object.keys(d.t).length>1000,lang);}
});

test('i18n: ทุกข้อความ UI ของหน้าแรก/หน้าช่างมีคำแปลทุกภาษา',()=>{
  assert.ok(strings.length>1000,'ดึงข้อความได้ '+strings.length);
  for(const lang of LANGS){
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
