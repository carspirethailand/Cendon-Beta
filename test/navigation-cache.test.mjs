import {test} from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
const source=readFileSync(new URL('../sw.js',import.meta.url),'utf8');
const BUILD=source.match(/const CACHE = '([^']+)'/)[1],BASE='https://fixture.test/';
const flush=async()=>{for(let i=0;i<40;i++)await Promise.resolve();};
const deferred=()=>{let resolve;const promise=new Promise(r=>{resolve=r});return {promise,resolve};};
function fixture({fetcher=async()=>new Response('fresh')}={}){
  const listeners={},pool=new Map(),requests=[],timers=[];
  const key=req=>new URL(typeof req==='string'?req:req.url,BASE).href;
  const caches={async open(name){if(!pool.has(name))pool.set(name,new Map());const entries=pool.get(name);
    return {async match(req){return entries.get(key(req))?.clone()},async put(req,res){entries.set(key(req),res.clone())},async add(req){entries.set(key(req),await fetcher(req))}};},
    async keys(){return [...pool.keys()]},async delete(name){return pool.delete(name)}};
  const self={location:new URL('sw.js',BASE),addEventListener:(name,fn)=>listeners[name]=fn,skipWaiting(){},
    registration:{navigationPreload:{async enable(){}},async showNotification(){}},clients:{async claim(){}}};
  class LocalRequest extends Request{constructor(u,options){super(new URL(u,BASE),options)}}
  vm.runInNewContext(source,{self,caches,URL,Set,Headers,Request:LocalRequest,Response,
    fetch:async(...args)=>{requests.push(args);return fetcher(...args)},setTimeout:(fn,ms)=>{timers.push({fn,ms});return timers.length;}});
  return {pool,requests,timers,listeners,caches,
    async seed(path,{build=BUILD,text='cached',cache='cendon-pages'}={}){
      await (await caches.open(cache)).put(new URL(path,BASE).href,new Response(text,{headers:build?{'X-Cendon-Shell':build}:{}}));
    },
    dispatch(path,{mode='navigate',cache='default',method='GET',destination='document',headers={},preload}={}){
      const pending=[];let response;
      const event={request:{url:new URL(path,BASE).href,mode,cache,method,destination,headers:new Headers(headers)},
        preloadResponse:preload,waitUntil:p=>pending.push(Promise.resolve(p)),respondWith:p=>{response=Promise.resolve(p)}};
      listeners.fetch(event);return {get response(){return response},pending};
    }};
}
test('current build page returns from cache even when network never completes',async()=>{
  const net=deferred(),f=fixture({fetcher:()=>net.promise});await f.seed('/garage');
  const e=f.dispatch('/garage');await flush();assert.equal(await (await e.response).text(),'cached');
  assert.equal(f.timers.length,0);assert.equal(f.requests.length,1);
  net.resolve(new Response('updated'));await Promise.all(e.pending);
  assert.equal(await (await (await f.caches.open('cendon-pages')).match(BASE+'garage')).text(),'updated');
});
test('HTML alias/query keys reuse public shell while background fetch keeps the intended URL',async()=>{
  const f=fixture();await f.seed('/garage');const e=f.dispatch('/garage.html?car=fixture');
  assert.equal(await (await e.response).text(),'cached');await Promise.all(e.pending);
  assert.equal(f.requests[0][0],BASE+'garage?car=fixture');
});
test('old build checks network before displaying a current response and stamps it',async()=>{
  const f=fixture();await f.seed('/news',{build:'cendon-old'});const e=f.dispatch('/news');
  const r=await e.response;assert.equal(await r.text(),'fresh');await Promise.all(e.pending);
  const saved=await (await f.caches.open('cendon-pages')).match(BASE+'news');assert.equal(saved.headers.get('X-Cendon-Shell'),BUILD);
});
test('old build still has a bounded offline/slow-network fallback',async()=>{
  const net=deferred(),f=fixture({fetcher:()=>net.promise});await f.seed('/news',{build:null});
  const e=f.dispatch('/news');await flush();assert.equal(f.timers[0].ms,1500);
  f.timers[0].fn();assert.equal(await (await e.response).text(),'cached');
  net.resolve(new Response('new'));await Promise.all(e.pending);
});
test('explicit reload bypasses the warm cache',async()=>{
  const f=fixture();await f.seed('/chat');const e=f.dispatch('/chat',{cache:'reload'});
  assert.equal(await (await e.response).text(),'fresh');await Promise.all(e.pending);
});
test('navigation preload is reused instead of fetching HTML twice',async()=>{
  const f=fixture();const e=f.dispatch('/news',{preload:Promise.resolve(new Response('preloaded'))});
  assert.equal(await (await e.response).text(),'preloaded');await Promise.all(e.pending);assert.equal(f.requests.length,0);
});
test('current-version asset is immediate and refreshes without delaying the page',async()=>{
  const net=deferred(),f=fixture({fetcher:()=>net.promise});await f.seed('/mobile-ui.js',{cache:BUILD});
  const e=f.dispatch('/mobile-ui.js',{mode:'cors',destination:'script'});
  assert.equal(await (await e.response).text(),'cached');assert.equal(f.timers.length,0);
  net.resolve(new Response('new-script'));await Promise.all(e.pending);
});
test('static prefetch populates the same HTML cache used by navigation',async()=>{
  const f=fixture();const e=f.dispatch('/garage',{mode:'no-cors',destination:''});
  assert.equal(await (await e.response).text(),'fresh');await Promise.all(e.pending);
  assert.ok(await (await f.caches.open('cendon-pages')).match(BASE+'garage'));
});
for(const [path,options] of [['/api/tech',{}],['/api/cars',{}],['/garage',{headers:{Authorization:'Bearer fixture-only'}}],['/admin',{}],['/login-submit',{method:'POST'}],['https://other.test/garage',{}]])test('protected/non-shell request is never cached/intercepted: '+path,async()=>{
  const f=fixture();const e=f.dispatch(path,options);assert.equal(e.response,undefined);assert.equal(f.requests.length,0);
});
test('activate removes only old Cendon assets, keeping page history and unrelated caches',async()=>{
  const f=fixture();for(const name of ['cendon-old',BUILD,'cendon-pages','another-app'])await f.caches.open(name);
  const pending=[];f.listeners.activate({waitUntil:p=>pending.push(p)});await Promise.all(pending);
  assert.deepEqual((await f.caches.keys()).sort(),[BUILD,'cendon-pages','another-app'].sort());
});
test('offline uncached navigation preserves the existing saved-home fallback',async()=>{
  const f=fixture({fetcher:async()=>{throw Error('offline')}});await f.seed('/',{text:'saved-home'});
  const e=f.dispatch('/garage');assert.equal(await (await e.response).text(),'saved-home');await Promise.all(e.pending);
});
