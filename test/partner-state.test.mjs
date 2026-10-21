import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
const source=readFileSync(new URL('../partner-state.js',import.meta.url),'utf8');
const settings=readFileSync(new URL('../settings.js',import.meta.url),'utf8');
const home=readFileSync(new URL('../index.html',import.meta.url),'utf8');
const settle=async()=>{for(let i=0;i<30;i++)await Promise.resolve()};
const me=(uid='one',technician=null,application=null)=>({uid,technician,application});
function fixture(p){
  const store=new Map(p?[['spire_partner',JSON.stringify(p)]]:[]),calls=[],events=[],timers=new Map(),callbacks=[],listeners={};let n=0,time=10000;
  const auth={currentUser:{uid:'one',getIdToken:async()=> 'test-token'},onAuthStateChanged:fn=>callbacks.push(fn)};
  const w={spireAuth:auth,localStorage:{getItem:k=>store.get(k)||null,setItem:(k,v)=>store.set(k,v)},
    fetch:async(url,options)=>{calls.push({url,options});return {ok:true,json:async()=>me()}},
    addEventListener:(name,fn)=>(listeners[name]||=[]).push(fn),dispatchEvent:e=>events.push(e)};
  const doc={readyState:'loading',hidden:false,addEventListener:(name,fn)=>(listeners[name]||=[]).push(fn)};
  const c={window:w,document:doc,Date:{now:()=>time},CustomEvent:class{constructor(type,o){this.type=type;this.detail=o.detail}},AbortController,
    setTimeout:(fn,ms)=>{timers.set(++n,{fn,ms});return n},clearTimeout:id=>timers.delete(id),setInterval:()=>0};
  vm.createContext(c);vm.runInContext(source,c);
  return {w,doc,auth,store,calls,events,timers,callbacks,listeners,api:w.CendonPartnerState,tick:ms=>time+=ms,run:code=>vm.runInContext(code,c)};
}
function response(d){return {ok:true,json:async()=>d}}

test('empty or foreign local storage is unknown until authenticated Cloudflare data arrives',async()=>{
  for(const p of [null,{uid:'other',s:'shop'},{uid:'one',s:'none'}]){
    const f=fixture(p);f.w.fetch=async()=>response(me('one',{id:'my-shop',test:false,verified:true}));
    assert.equal(f.api.peek('one').s,'checking','even a stale no-shop hint cannot override Cloudflare');
    await f.api.refresh();assert.equal(f.api.peek('one').s,'shop');assert.equal(f.api.peek('one').phase,'ready');
    const saved=JSON.parse(f.store.get('spire_partner'));assert.equal(saved.uid,'one');assert.equal(saved.s,'shop');
    assert.equal(saved.registered,undefined);assert.deepEqual(Object.keys(saved).sort(),['at','r','s','uid']);
  }
});

test('legacy and trial-shop hints remain shops regardless of the accidental registered flag',async()=>{
  for(const registered of [undefined,false,true]){
    const f=fixture({uid:'one',s:'shop',registered});assert.equal(f.api.peek('one').s,'shop');
    f.w.fetch=async()=>response(me('one',{id:'trial-shop',test:true,verified:false}));
    await f.api.refresh();assert.equal(f.api.peek('one').s,'shop');assert.equal(f.api.peek('one').phase,'ready');
  }
});

test('local result-reveal hints can change without overriding authoritative membership',async()=>{
  const f=fixture();f.w.fetch=async()=>response(me('one',{id:'existing'}));await f.api.refresh();
  f.store.set('spire_partner',JSON.stringify({uid:'one',s:'none',r:1}));
  assert.equal(f.api.peek('one').s,'shop');assert.equal(f.api.peek('one').r,1);
  f.store.set('spire_partner',JSON.stringify({uid:'one',s:'none',r:0}));
  assert.equal(f.api.peek('one').s,'shop');assert.equal(f.api.peek('one').r,0);
});

test('only a complete successful response can confirm no shop; existing application statuses survive',async()=>{
  for(const status of ['pending','approved','rejected','declined']){
    const f=fixture();f.w.fetch=async()=>response(me('one',null,{status}));await f.api.refresh();assert.equal(f.api.peek('one').s,status);
  }
  const f=fixture({uid:'one',s:'shop'});f.w.fetch=async()=>response(me());await f.api.refresh();assert.equal(f.api.peek('one').s,'none');
});

test('offline, denied and malformed responses never write a new-applicant status',async()=>{
  for(const old of [null,{uid:'one',s:'shop'}])for(const fail of [
    async()=>{throw Error('offline')},async()=>({ok:false,status:403}),async()=>response({}),
    async()=>response({uid:'one'}),async()=>response(me('other')),async()=>response(me('one',{})),
  ]){
    const f=fixture(old),before=f.store.get('spire_partner');f.w.fetch=fail;
    await assert.rejects(f.api.refresh());assert.equal(f.store.get('spire_partner'),before);
    assert.equal(f.api.peek('one').s,old?'shop':'checking');assert.equal(f.api.peek('one').phase,'offline');
  }
});

test('timeout covers token loading as well as the request; late results cannot overwrite the cache',async()=>{
  const f=fixture({uid:'one',s:'shop'});let release;
  f.auth.currentUser.getIdToken=()=>new Promise(r=>release=r);
  const task=f.api.refresh(),failure=assert.rejects(task,/timed out/);
  [...f.timers.values()].find(t=>t.ms===12000).fn();await failure;
  release('late');await settle();assert.equal(f.calls.length,0);assert.equal(f.api.peek('one').s,'shop');
});

test('all consumers share one authenticated no-store request, and refresh after the TTL is explicit',async()=>{
  const f=fixture();let release;f.w.fetch=async(url,options)=>{f.calls.push({url,options});await new Promise(r=>release=r);return response(me())};
  const a=f.api.refresh(),b=f.api.refresh(true);assert.equal(a,b);await settle();release();await a;
  assert.equal(f.calls.length,1);assert.equal(f.calls[0].options.method,'GET');assert.equal(f.calls[0].options.cache,'no-store');
  assert.equal(f.calls[0].options.headers.Authorization,'Bearer test-token');assert.ok(f.calls[0].options.signal);
  await f.api.refresh();assert.equal(f.calls.length,1);
  assert.doesNotMatch(JSON.stringify([...f.store]),/test-token|my-shop|technician|email|phone/);
});

test('account changes during token or HTTP work cannot expose or persist the previous account result',async()=>{
  for(const stage of ['token','http']){
    const f=fixture();let release;const hold=new Promise(r=>release=r);
    if(stage==='token')f.auth.currentUser.getIdToken=async()=>{await hold;return 'old-token'};
    else f.w.fetch=async()=>{await hold;return response(me('one',{id:'old-shop'}))};
    const old=f.api.refresh();await settle();f.auth.currentUser={uid:'two',getIdToken:async()=> 'new-token'};
    f.w.fetch=async()=>response(me('two',null,{status:'pending'}));await f.api.refresh();release();await assert.rejects(old);
    assert.equal(JSON.parse(f.store.get('spire_partner')).uid,'two');assert.equal(f.api.peek('two').s,'pending');
    assert.notEqual(f.api.peek('one').s,'shop');
  }
});

test('auth restoration, page resume and sign-out use the live identity instead of local user hints',async()=>{
  const f=fixture({uid:'one',s:'shop'});f.w.fetch=async()=>response(me('one',{id:'existing'}));
  f.listeners.DOMContentLoaded[0]();assert.equal(f.callbacks.length,1);f.callbacks[0](f.auth.currentUser);await settle();
  assert.equal(f.api.peek('one').s,'shop');
  f.auth.currentUser=null;f.callbacks[0](null);assert.equal(f.api.peek('one').phase,'signedout');assert.equal(f.api.peek('one').s,'none');
  await assert.rejects(f.api.refresh(),/Sign-in/);
});

test('returning online rechecks Cloudflare, without request storms or trusting a stale negative hint',async()=>{
  const f=fixture({uid:'one',s:'none'});f.w.fetch=async()=>{throw Error('offline')};await assert.rejects(f.api.refresh());
  assert.equal(f.api.peek('one').s,'checking');
  f.w.fetch=async()=>{f.calls.push('resume');return response(me('one',{id:'existing'}))};f.tick(6000);
  f.listeners.online[0]();f.listeners.focus[0]();await settle();
  assert.equal(f.calls.length,1);assert.equal(f.api.peek('one').s,'shop');
  f.doc.hidden=true;f.tick(60000);f.listeners.focus[0]();await settle();assert.equal(f.calls.length,1);
  f.doc.hidden=false;f.listeners.visibilitychange[0]();await settle();assert.equal(f.calls.length,2);
});

test('settings paints server status over stale hints and never calls unknown/offline a new application',()=>{
  const fragment=settings.slice(settings.indexOf('function partnerHTML(){'),settings.indexOf('const chev='));
  for(const [s,phase,href] of [['shop','ready','studio'],['checking','checking','join'],['none','offline','join'],['none','ready','join']]){
    const c={W:{CendonPartnerState:{peek:()=>({uid:'one',s,phase})}},me:()=>({uid:'one'}),fbUser:()=>({uid:'one'}),t:a=>a};vm.createContext(c);
    vm.runInContext(fragment+'result=partnerHTML()',c);assert.match(c.result,new RegExp('href="/'+href+'"'));
    if(phase==='offline'||s==='checking')assert.doesNotMatch(c.result,/สมัครเป็นช่าง|เริ่มสมัคร/);
    if(phase==='offline')assert.match(c.result,/ไม่ต้องสมัครซ้ำ/);
  }
});

test('opening /join recovers every server shop, not just public verified shops; failures never enable an application',async()=>{
  const fragment=home.slice(home.indexOf('async function openJoin(){'),home.indexOf('/* ใบสมัครช่างเป็นขั้น',home.indexOf('async function openJoin(){')));
  for(const kind of ['real','trial','staff-trial','failure','application','new']){
    const nodes={bs:{classList:{contains:()=>true}},jRetry:{}},SH={cur:null},draws=[];let studio=0,status=0;
    const technician=['real','trial','staff-trial'].includes(kind)?{id:'shop',test:kind!=='real',verified:kind==='real'}:null;
    const c={window:{},ls:{get:()=>null},document:{documentElement:{dataset:{}}},BOOT_TECH:true,location:{search:''},URLSearchParams,U:{uid:'one'},SH,
      ME:{uid:'one',technician,admin:kind==='staff-trial',staff:kind==='staff-trial',application:kind==='application'?{status:'pending'}:null},
      refreshMe:async()=>kind!=='failure',techPolicy:async()=>({ok:true}),$:id=>nodes[id],decided:()=>false,
      openStudio:()=>studio++,statusPage:()=>status++,landing:(_p,pending)=>{draws.push({pending});SH.cur=draws.at(-1)},
      sheet:o=>{SH.cur=o;draws.push(o);o.mount?.()}};
    vm.createContext(c);await vm.runInContext(fragment+'openJoin()',c);
    assert.equal(studio,technician?1:0,kind);assert.equal(status,kind==='application'?1:0,kind);
    if(kind==='failure'){assert.equal(draws.length,2);assert.equal(draws[0].pending,true);assert.match(draws[1].body,/ไม่ต้องกรอกใบสมัครซ้ำ/);assert.equal(typeof nodes.jRetry.onclick,'function')}
    if(kind==='new')assert.equal(draws.at(-1).pending,undefined);
  }
});
