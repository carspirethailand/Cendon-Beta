import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const page=readFileSync(new URL('../chat.html',import.meta.url),'utf8');
const marker=page.indexOf('const quotaUid=');
const source=page.slice(page.lastIndexOf('(function(){',marker),page.indexOf('\n})();',marker)+7);
function fixture({uid='one',quota={used:1,limit:100,left:99,resetAt:Date.now()+100000},legacy=false,locked=false}={}){
  const store=new Map(),elements=new Map(),classes=new Set(),listeners=new Map(),calls=[];
  if(legacy)store.set('spire_quotaLock',JSON.stringify(Date.now()+100000));
  if(locked)store.set('spire_quotaLock:'+uid,JSON.stringify(Date.now()+100000));
  const input={disabled:locked,placeholder:'Original placeholder',dataset:{}},send={disabled:locked};
  const bar={classList:{add:c=>classes.add(c),remove:c=>classes.delete(c),contains:c=>classes.has(c)},parentNode:{insertBefore:el=>elements.set(el.id,el)}};
  elements.set('inp',input);elements.set('sendBtn',send);if(locked)classes.add('quota-locked');
  const auth={currentUser:{uid,getIdToken:async()=>'test-only-token'},onAuthStateChanged(fn){listeners.set('auth',fn)}};
  const window={auth,lang:'en',BACKEND_URL:'https://test.invalid'};
  const document={getElementById:id=>elements.get(id)||null,querySelector:()=>bar,createElement:()=>({remove(){elements.delete(this.id)}})};
  const sandbox={window,document,Date,Number,AbortController,localStorage:{getItem:k=>store.get(k)||null,setItem:(k,v)=>store.set(k,v)},setInterval:()=>1,clearInterval(){},setTimeout:()=>1,clearTimeout(){},addEventListener:(name,fn)=>listeners.set(name,fn),fetch:async(url)=>{calls.push(url);return {ok:true,json:async()=>({quota})}}};
  vm.runInNewContext(source,sandbox);
  return {window,auth,store,input,send,classes,listeners,calls};
}
test('legacy browser-wide lock does not lock a different Cendon account',async()=>{
  const f=fixture({legacy:true});await f.window.spireRefreshQuota();
  assert.equal(f.input.disabled,false);assert.equal(f.classes.has('quota-locked'),false);
});
test('authoritative available quota clears a stale account lock',async()=>{
  const f=fixture({locked:true});await f.window.spireRefreshQuota();
  assert.equal(f.input.disabled,false);assert.equal(f.send.disabled,false);assert.equal(JSON.parse(f.store.get('spire_quotaLock:one')),0);
});
test('admin unlimited quota clears an old lock',async()=>{
  const f=fixture({locked:true,quota:{unlimited:true,used:100,limit:100,left:0}});await f.window.spireRefreshQuota();assert.equal(f.input.disabled,false);
});
test('genuine exhausted quota keeps the composer locked until server reset',async()=>{
  const resetAt=Date.now()+200000;
  const f=fixture({quota:{used:100,limit:100,left:0,resetAt}});await f.window.spireRefreshQuota();
  assert.equal(f.input.disabled,true);assert.equal(f.send.disabled,true);assert.equal(Number(f.store.get('spire_quotaLock:one')),resetAt);
});
test('provider 429 without Cendon quota cannot create a five-hour local lock',async()=>{
  const f=fixture();f.window.quotaHit(null);await f.window.spireRefreshQuota();
  assert.equal(f.input.disabled,false);assert.equal(Number(f.store.get('spire_quotaLock:one')),0);
  assert.ok(!page.includes('if(r.status===429||(d&&d.error==="quota"))'));
});
test('sign-out releases local UI without changing the old account quota',async()=>{
  const f=fixture({locked:true});f.auth.currentUser=null;await f.window.spireRefreshQuota();
  assert.equal(f.input.disabled,false);assert.ok(Number(f.store.get('spire_quotaLock:one'))>Date.now());
});
