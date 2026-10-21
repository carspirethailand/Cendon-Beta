import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
const read=f=>readFileSync(new URL('../'+f,import.meta.url),'utf8');
const index=read('index.html');
const settle=async()=>{for(let n=0;n<25;n++)await Promise.resolve()};

test('mechanic menu paints before delayed account/policy requests; closing it prevents a late reopen',async()=>{
  const source=index.slice(index.indexOf('async function openJoin(){'),index.indexOf('/* ใบสมัครช่างเป็นขั้น',index.indexOf('async function openJoin(){')));
  let release;const wait=new Promise(r=>release=r),draws=[],SH={cur:null};
  const context={U:{uid:'one'},ME:null,SH,window:{},document:{documentElement:{dataset:{}}},BOOT_TECH:true,location:{search:''},URLSearchParams,
    sheet:o=>{SH.cur=o;draws.push(o)},$:()=>({classList:{contains:()=>true}}),
    landing:(_push,pending)=>{const o={pending};SH.cur=o;draws.push(o)},
    refreshMe:()=>wait,techPolicy:()=>wait,needLogin:()=>assert.fail('unexpected login')};
  vm.createContext(context);vm.runInContext(source,context);
  const task=vm.runInContext('openJoin()',context);assert.equal(draws.length,1);assert.equal(draws[0].pending,true);assert.equal(context.BOOT_TECH,false);
  SH.cur={title:'different menu'};release();await task;assert.equal(draws.length,1,'late result must not replace another screen');
});

test('policy refreshes share a request and retain a bounded timeout',async()=>{
  const source=index.slice(index.indexOf('let TP=null'),index.indexOf('const DIDIT=',index.indexOf('let TP=null')));
  let calls=0,release;const wait=new Promise(r=>release=r);
  const c={API:'https://fixture',Date,AbortSignal,fetch:async()=>{calls++;await wait;return{ok:true,json:async()=>({ok:true,version:12,identity:'didit',consentVer:'test'})}}};
  vm.createContext(c);vm.runInContext(source,c);const a=vm.runInContext('techPolicy()',c),b=vm.runInContext('techPolicy()',c);release();await Promise.all([a,b]);assert.equal(calls,1);
});

test('cloud acknowledges only server-saved snapshots, not rejected keys or edits made in flight',async()=>{
  for(const file of ['garage.html','chat.html']){
    const src=read(file),begin=src.indexOf('      const ack=await req("/api/state"'),end=src.indexOf('      St.pushed=',begin),fragment=src.slice(begin,end);
    assert.ok(begin>0&&end>begin,file);
    const state={saved:{v:{title:'sent'},t:10},rejected:{v:99,t:10}},sy={},dirty=new Set(Object.keys(state));
    const c={state,dirty,req:async()=>({saved:['saved'],skipped:['rejected'],errors:{rejected:'invalid record'}}),synced:()=>sy,setSynced(){},sig:v=>v,localStorage:{getItem:()=>JSON.stringify({title:'newer local edit'})}};
    vm.createContext(c);await assert.rejects(()=>vm.runInContext('(async()=>{'+fragment+'})()',c),/invalid record/);
    assert.equal(sy.saved.h,JSON.stringify(state.saved.v));assert.equal(sy.rejected,undefined);assert.ok(dirty.has('saved'));assert.ok(dirty.has('rejected'));
  }
});

test('uncached offline Chat responds with an offline page, never cached Home under the wrong URL',async()=>{
  let response;const home=new Response('HOME FIXTURE');const self={location:{origin:'https://fixture',href:'https://fixture/sw.js'},addEventListener(){}};
  const c={self,URL,Request,Response,Headers,Set,Promise,setTimeout,caches:{open:async()=>({match:async key=>String(key)==='https://fixture/'?home:null})},fetch:async()=>{throw Error('offline')}};
  vm.createContext(c);vm.runInContext(read('sw.js'),c);c.event={request:{cache:'default'},respondWith:r=>response=r,waitUntil:()=>{}};
  vm.runInContext('openPage(event,new URL("https://fixture/chat"))',c);const r=await response;
  assert.equal(r.status,503);assert.doesNotMatch(await r.text(),/HOME FIXTURE/);
});

test('a completed account with a pending optional tour enters Chat directly, without a Home redirect',async()=>{
  const src=read('account.js'),begin=src.indexOf('  function enter(){'),end=src.indexOf('  /* ออกจากหน้าเข้าสู่ระบบ',begin);
  let tutorials=0;const redirected=[];
  const c={S:{status:{tutorial:{status:'pending'}},next:'/chat'},LOGIN:false,W:{},location:{pathname:'/chat',search:'',hash:''},close(){},safeNext:()=>'/chat',go:u=>redirected.push(u),URLSearchParams,encodeURIComponent,tutorial:async()=>{tutorials++}};
  vm.createContext(c);vm.runInContext(src.slice(begin,end)+'enter();',c);await settle();assert.deepEqual(redirected,[]);assert.equal(tutorials,1);
});

test('shared money/text checks reject unlimited, overprecision, reverse keyboard and repeated junk',()=>{
  const c={window:{}};vm.createContext(c);vm.runInContext(read('garage-rules.js'),c);const R=c.window.CendonGarageRules,car={make:'Toyota',model:'Vios'};
  for(const amount of [1e20,-1,1.234,Infinity,NaN])assert.throws(()=>R.money(amount,car,'oil'));
  assert.equal(R.money('1,234.56',car,'oil'),1234.56);
  assert.throws(()=>R.money(600000,car,'unknown'));assert.equal(R.money(5000000,{make:'Ferrari'},'unknown'),5000000);
  for(const s of ['อิอิอิอิ','ababab','lkjhgfdsa','ก'.repeat(61)])assert.throws(()=>R.label(s,60));
  for(const s of ['เปลี่ยนใบปัดน้ำฝน','ตรวจสอบรถยนต์','เช็กเบรก ABS','Change brake pads'])assert.equal(R.label(s,60),s);
});

test('new Thai Valet message grammar prepares only explicit recipients/messages, never a negated or hypothetical request',()=>{
  const source=read('valet.js'),begin=source.indexOf('const one='),end=source.indexOf('const wantsAct=',begin);
  // Use the existing complete Valet test harness rather than evaluate UI hooks.
  const document={readyState:'complete',addEventListener(){},querySelector:()=>null,querySelectorAll:()=>[],getElementById:()=>null};
  const window={spireAuth:{currentUser:{uid:'fixture'}}},localStorage={getItem:()=>JSON.stringify({on:true,uid:'fixture'})};
  const c={window,document,localStorage,MutationObserver:class{observe(){}},setTimeout:()=>0};vm.createContext(c);vm.runInContext(source,c);
  for(const s of ['ช่วยทักช่างนนทการช่างว่ารถสตาร์ตไม่ติด','ส่งข้อความถึงร้านนนทการช่างและบอกว่าพรุ่งนี้เปิดไหม'])assert.equal(window.CendonValet.intent(s)?.do,'msg_shop');
  for(const s of ['อย่าทักช่างนนทการช่างว่ารถสตาร์ตไม่ติด','ถ้าทักช่างนนทการช่างว่ารถเสีย จะดีไหม','ช่างนนทการช่างอยู่ไหน'])assert.equal(window.CendonValet.intent(s),null);
});
