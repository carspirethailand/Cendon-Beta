import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
/* ภาษาที่เลือกใน Settings ต้องคงเดิมทุกหน้า — เดิมหน้าร้านค้า/นิตยสารโหลดสถานะบัญชีใหม่แล้วเขียนทับด้วยภาษาตอนสมัคร (ไทย) */
const r=f=>readFileSync(new URL('../'+f,import.meta.url),'utf8').replace(/\r\n/g,'\n');
const acc=r('account.js');

function pick({local,setupUid,seen,srv}){
  const store={};if(local!==undefined)store.spire_lang=JSON.stringify(local);if(seen!==undefined)store.spire_langSrv=JSON.stringify(seen);
  const src=acc.slice(acc.indexOf('  function pickLang(p,old){'),acc.indexOf('  /* เปลี่ยนภาษาใน Settings'));
  const c={S:{uid:'u1'},read:(k,d)=>k in store?JSON.parse(store[k]):d,write:(k,v)=>{store[k]=JSON.stringify(v)}};vm.createContext(c);
  vm.runInContext(src+';this.pickLang=pickLang',c);
  return {lang:c.pickLang({lang:srv},setupUid?{uid:setupUid}:{}),store};
}

test('a language chosen on this device survives every page reload of the account status', () => {
  assert.equal(pick({local:'en',setupUid:'u1',srv:'th'}).lang,'en','first load after this fix keeps the choice');
  assert.equal(pick({local:'en',setupUid:'u1',seen:'th',srv:'th'}).lang,'en');
  assert.equal(pick({local:'ja',setupUid:'u1',seen:'th',srv:'th'}).store.spire_langSrv,'"th"');
});

test('the account language is used on a new device, before any choice, or after it changed elsewhere', () => {
  assert.equal(pick({local:undefined,setupUid:'u1',srv:'de'}).lang,'de','never chosen');
  assert.equal(pick({local:'en',setupUid:null,srv:'de'}).lang,'de','first sign-in on this device');
  assert.equal(pick({local:'en',setupUid:'other',srv:'de'}).lang,'de','different account on this device');
  assert.equal(pick({local:'en',setupUid:'u1',seen:'th',srv:'ja'}).lang,'ja','changed on another device');
});

test('changing the language in Settings is saved to the account; reloads never call setLang with an old value', () => {
  assert.match(acc,/W\.spireOnLang\(code=>\{const p=S\.status&&S\.status\.profile;if\(!code\|\|!setupDone\(\)\|\|\(p&&p\.lang===code\)\)return;setupSave\(\{lang:code\}\)\}\)/);
  assert.match(acc,/write\('spire_setup',projection\);write\('spire_lang',lang\);/);
  assert.doesNotMatch(acc,/write\('spire_lang',p\.lang\|\|'th'\)/);
  assert.match(acc,/if\(W\.spireSetLang&&lang&&!\(W\.spireLang&&W\.spireLang\(\)===lang\)\)W\.spireSetLang\(lang\);/);
});

test('cloud sync never pulls an old value over a change made on this device that is not uploaded yet', () => {
  for(const f of ['garage.html','chat.html'])
    assert.match(r(f),/const cur=localStorage\.getItem\("spire_"\+k\);\n    if\(cur!==null&&sn0\[k\]!==undefined&&sig\(cur\)!==sn0\[k\]\)\{m\[k\]=Date\.now\(\);return\}/,f);
  for(const f of ['index.html','spares.html','news.html','garage.html','profile.html','chat.html'])assert.match(r(f),/account\.js\?v=2026-10-18-seo1/,f);
});
