import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
const read=f=>readFileSync(new URL('../'+f,import.meta.url),'utf8');
function fixture(){
  const data=new Map(),attrs=new Map(),timers=[],requests=[];let saves=0;
  const storage={getItem:k=>data.get(k)??null,setItem:(k,v)=>data.set(k,String(v))};
  const put=(k,v)=>storage.setItem('spire_'+k,JSON.stringify(v)),get=k=>JSON.parse(storage.getItem('spire_'+k));
  put('valet',{on:true,uid:'me'});put('theme','light');put('chatTheme','light');put('lang','th');put('setup',{uid:'me',lang:'th',distance:'km',currency:'THB'});
  const root={setAttribute:(k,v)=>attrs.set(k,String(v)),getAttribute:k=>attrs.get(k),lang:'th'};
  const D={readyState:'complete',hidden:false,documentElement:root,addEventListener(){},querySelector:()=>null,querySelectorAll:()=>[],getElementById:()=>null};
  const W={document:D,spireAuth:{currentUser:{uid:'me',getIdToken:async()=> 'fixture-token'}},CendonScope:{mine:uid=>uid===W.spireAuth.currentUser?.uid},cloudMark(){},localStorage:storage};
  W.spireSetupRead=()=>get('setup');W.spireLang=()=>get('lang');W.spireSetLang=v=>put('lang',v);
  W.spirePrimary=()=>get('primary');W.spireSetPrimary=v=>put('primary',v);
  W.CendonDepth={get:()=>get('depth')??1,set:v=>put('depth',v)};
  W.spireSavePrefs=async patch=>{requests.push(patch);const p={...get('setup'),...patch};put('setup',p);if(patch.lang)put('lang',patch.lang);return p};
  const context=vm.createContext({window:W,document:D,localStorage:storage,MutationObserver:class{observe(){}},setTimeout:fn=>timers.push(fn),clearTimeout(){},encodeURIComponent,JSON,saveSession(){saves++},messages:[],
    fetch:async()=>{throw Error('Unexpected live request')}});
  vm.runInContext(read('valet-core.js'),context);vm.runInContext(read('valet.js'),context);
  return {W,D,data,attrs,put,get,requests,timers,V:W.CendonValet,C:W.CendonValetCore,context,saves:()=>saves};
}
test('explicit Thai typos and English theme requests route deterministically, with no model or search',()=>{
  const f=fixture();
  for(const t of ['ช่วยเปลี่ยนธีมเป็นสีมืดหน่อยครับ','เปลี่ยนตีมให้เป็นมืด','ธีมสว่าง','please switch theme to dark','set appearance light','dark mode']){
    assert.equal(f.V.intent(t)?.do,'setting',t);assert.equal(f.V.intent(t)?.key,'theme',t);assert.ok(f.V.wantsAct(t));
  }
  for(const t of ['อย่าเปลี่ยนธีมเป็นมืด','please do not change theme to dark','ตัวอย่าง เปลี่ยนธีมเป็นมืด','ถ้าเปลี่ยนธีมเป็นมืดจะดีไหม','"เปลี่ยนธีมเป็นมืด"','เปิดหน้า https://evil.example/admin','เปลี่ยนธีมเป็นมืด แล้วลบบัญชี'])assert.equal(f.V.intent(t),null,t);
  assert.equal(f.requests.length,0);
});
test('each reversible setting executes the actual adapter and verifies the result',async()=>{
  const f=fixture();
  for(const [text,key,value] of [['เปลี่ยนตีมเป็นสีมืด','theme','dark'],['เปลี่ยนภาษาเป็นอังกฤษ','lang','en'],['เปลี่ยนหน่วยระยะทางเป็นไมล์','distance','mi'],['เปลี่ยนสกุลเงินเป็นยูโร','currency','EUR'],['เปลี่ยนโหมด AI เป็น atelier','depth','2'],['เปลี่ยนสีหลักเป็น #123abc','primary','#123abc']]){
    const action=f.V.intent(text);assert.equal(action.key,key,text);assert.equal(action.value,value,text);
    const m={acts:[action]};await f.V.run(m);assert.equal(action.s,'done',text);assert.equal(String(f.C.getSetting(key)),value,text);
    await f.C.setSetting(key, f.C.getSetting(key));
  }
  assert.equal(f.attrs.get('data-theme'),'dark');assert.equal(f.attrs.get('data-ctheme'),'dark');
  assert.equal(f.get('chatTheme'),'dark');assert.equal(f.get('theme'),'dark');
  assert.ok(f.requests.some(p=>p.distance==='mi'));assert.ok(f.requests.every(p=>Object.keys(p).every(k=>['lang','distance','currency'].includes(k))));
});
test('failed adapters, denied storage and unsupported keys never produce a success status',async()=>{
  const f=fixture();f.W.spireSavePrefs=async()=>{throw Error('fixture offline')};
  const a={do:'setting',key:'currency',value:'USD'};await f.V.run({acts:[a]});assert.equal(a.s,'err');assert.equal(f.C.getSetting('currency'),'THB');
  f.W.localStorage.setItem=()=>{throw Error('fixture storage full')};
  const b={do:'setting',key:'theme',value:'dark'};await f.V.run({acts:[b]});assert.equal(b.s,'err');assert.notEqual(f.attrs.get('data-theme'),'dark');
  for(const key of ['admin','role','uid','token','__proto__','constructor','email','notify','billing'])await assert.rejects(f.C.setSetting(key,'true'),/not allowed|ไม่อยู่ในรายการ/);
  assert.equal(f.C.pageOf('__proto__'),null);assert.equal(f.C.pageOf('constructor'),null);assert.equal(f.C.pageOf('admin'),null);
});
test('a setting is awaited, runs once, and is not replayed when the completed answer is rendered again',async()=>{
  const f=fixture();let complete;f.W.spireSavePrefs=patch=>new Promise(r=>complete=()=>{const saved={...f.get('setup'),...patch};f.put('setup',saved);r(saved)});
  const a={do:'setting',key:'currency',value:'USD'},m={acts:[a]};const job=f.V.run(m);await new Promise(r=>setImmediate(r));assert.equal(a.s,'working');
  await f.V.run(m);complete();await job;assert.equal(a.s,'done');assert.equal(f.C.getSetting('currency'),'USD');
});
test('permission revocation, hidden history, changed conversation and switched accounts do not auto-execute',async()=>{
  const f=fixture();f.D.hidden=true;const a={do:'setting',key:'theme',value:'dark'};await f.V.run({acts:[a]});assert.equal(a.s,undefined);
  f.D.hidden=false;await f.V.run({acts:[a]},{isCurrent:()=>false});assert.equal(a.s,undefined);
  f.put('valet',{on:false,uid:'me'});await f.V.run({acts:[a]});assert.equal(a.s,undefined);await assert.rejects(f.C.setSetting('theme','dark'),/Allow Valet|อนุญาต/);
  f.put('valet',{on:true,uid:'me'});let complete;f.W.spireSavePrefs=()=>new Promise(r=>complete=r);
  const b={do:'setting',key:'currency',value:'USD'},m={acts:[b]};const job=f.V.run(m);await new Promise(r=>setImmediate(r));const saved=f.saves();
  f.W.spireAuth.currentUser={uid:'other'};complete({uid:'me',currency:'USD'});await job;
  assert.notEqual(b.s,'done');assert.equal(f.saves(),saved,'no old-conversation save under the new account');assert.equal(f.V.on(),false);
});
test('false model completion without an action is replaced by a pending/unsupported message',()=>{
  const f=fixture();const result=f.V.guard({text:'เปลี่ยนธีมให้เรียบร้อยแล้วครับ',acts:[]},'ช่วยเปลี่ยนตีมเป็นสีมืด');
  assert.doesNotMatch(result.text,/เรียบร้อยแล้ว/);assert.equal(result.acts[0].do,'setting');assert.equal(f.get('theme'),'light','parsing is not execution');
  const blocked=f.V.guard({text:'ทำสำเร็จแล้ว',acts:[]},'เปลี่ยนสกุลเงินเป็น ZZZ');assert.doesNotMatch(blocked.text,/สำเร็จแล้ว/);
  assert.match(f.V.html({acts:blocked.acts}),/ยังไม่ได้เปลี่ยน|Nothing changed/);
});

test('an unspecified theme asks the user to choose; an explicit toggle uses the actual current theme',async()=>{
  const f=fixture(),a=f.V.intent('ช่วยเปลี่ยนตีมหน่อย');assert.equal(a.key,'theme');assert.equal(a.value,undefined);
  await f.V.run({acts:[a]});assert.equal(f.get('theme'),'light');assert.match(f.V.html({acts:[a]}),/data-va="theme-choice"/);
  const toggle=f.V.intent('สลับธีม');await f.V.run({acts:[toggle]});assert.equal(f.get('theme'),'dark');
});
test('capability catalogue exposes own-account tools and fixed customer routes, not staff/admin or arbitrary URLs',()=>{
  const f=fixture(),c=f.C.capabilities();
  for(const key of ['theme','lang','depth','distance','currency','primary'])assert.ok(Object.hasOwn(c.settings,key));
  for(const action of ['go','search','setting','pick_car'])assert.ok(c.immediate.includes(action));
  for(const action of ['log','due','car_info','car_km','msg_shop','book'])assert.ok(c.confirm.includes(action));
  for(const page of ['tools','listen','engine_scan','quote_check','parking','car_cost','car_maintenance'])assert.ok(f.C.pageOf(page)?.url.startsWith('/'));
  assert.ok(!c.pages.some(p=>/admin|staff|handbook/.test(p)));assert.ok(c.unavailable.includes('arbitrary_api'));assert.ok(c.unavailable.includes('other_accounts'));
});
