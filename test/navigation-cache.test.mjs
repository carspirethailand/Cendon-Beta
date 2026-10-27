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
      if(cache==='cendon-pages'&&!path.includes('?'))path+='?__cendon_view=legacy-v386';
      await (await caches.open(cache)).put(new URL(path,BASE).href,new Response(text,{headers:build?{'X-Cendon-Shell':build}:{}}));
    },
    dispatch(path,{mode='navigate',cache='default',method='GET',destination='iframe',headers={},preload}={}){
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
  assert.equal(await (await (await f.caches.open('cendon-pages')).match(BASE+'garage?__cendon_view=legacy-v386')).text(),'updated');
});
test('query-specific frames bypass generic HTML cache and retain their intended URL',async()=>{
  const f=fixture();await f.seed('/garage');const e=f.dispatch('/garage.html?car=fixture');
  assert.equal(await (await e.response).text(),'fresh');await Promise.all(e.pending);
  assert.equal(f.requests[0][0],BASE+'garage.html?car=fixture&__cendon_document=1');
});
test('old build checks network before displaying a current response and stamps it',async()=>{
  const f=fixture();await f.seed('/news',{build:'cendon-old'});const e=f.dispatch('/news');
  const r=await e.response;assert.equal(await r.text(),'fresh');await Promise.all(e.pending);
  const saved=await (await f.caches.open('cendon-pages')).match(BASE+'news?__cendon_view=legacy-v386');assert.equal(saved.headers.get('X-Cendon-Shell'),BUILD);
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
test('frame requests explicitly request legacy markup; activation disables duplicate navigation preload',async()=>{
  const f=fixture();const e=f.dispatch('/news',{preload:Promise.resolve(new Response('preloaded'))});
  assert.equal(await (await e.response).text(),'fresh');await Promise.all(e.pending);assert.equal(f.requests.length,1);
  assert.equal(f.requests[0][0],BASE+'news?__cendon_document=1');assert.match(source,/navigationPreload\.disable\(\)/);
});
test('current-version asset is immediate and refreshes without delaying the page',async()=>{
  const net=deferred(),f=fixture({fetcher:()=>net.promise});await f.seed('/mobile-ui.js',{cache:BUILD});
  const e=f.dispatch('/mobile-ui.js',{mode:'cors',destination:'script'});
  assert.equal(await (await e.response).text(),'cached');assert.equal(f.timers.length,0);
  net.resolve(new Response('new-script'));await Promise.all(e.pending);
});
test('Barba shell prefetch is not persisted or confused with cached legacy frame HTML',async()=>{
  const f=fixture();const e=f.dispatch('/garage',{mode:'no-cors',destination:''});
  assert.equal(await (await e.response).text(),'fresh');await Promise.all(e.pending);
  assert.equal(await (await f.caches.open('cendon-pages')).match(BASE+'garage'),undefined);
  assert.equal(await (await f.caches.open('cendon-pages')).match(BASE+'garage?__cendon_view=legacy-v386'),undefined);
});
test('outer documents never receive a cached raw iframe document',async()=>{
 const f=fixture({fetcher:async()=>new Response('barba shell',{headers:{'X-Cendon-Document':'barba-shell-v1','Cache-Control':'private, no-store'}})});await f.seed('/chat',{text:'legacy raw HTML'});
 const e=f.dispatch('/chat',{destination:'document'});assert.equal(await(await e.response).text(),'barba shell');await Promise.all(e.pending);
 assert.equal(await(await(await f.caches.open('cendon-pages')).match(BASE+'chat?__cendon_view=legacy-v386')).text(),'legacy raw HTML');
});
test('idle Garage warmup fetches public static markup only, never boots a hidden app or calls personal APIs',async()=>{
 const f=fixture({fetcher:async()=>new Response('<html>public app code</html>',{headers:{'Content-Type':'text/html'}})}),pending=[];
 f.listeners.message({data:{type:'cendon:warm-garage'},source:{url:BASE},waitUntil:p=>pending.push(p)});await Promise.all(pending);
 assert.equal(f.requests.length,1);assert.equal(f.requests[0][0],BASE+'garage?__cendon_document=1');assert.equal(f.requests[0][1].credentials,'omit');
 const e=f.dispatch('/garage');assert.equal(await(await e.response).text(),'<html>public app code</html>');await Promise.all(e.pending);
 const before=f.requests.length;f.listeners.message({data:{type:'cendon:warm-garage'},source:{url:'https://evil.test/'},waitUntil:p=>pending.push(p)});assert.equal(f.requests.length,before);
});
for(const [path,options] of [['/api/tech',{}],['/api/cars',{}],['/garage',{headers:{Authorization:'Bearer fixture-only'}}],['/admin',{}],['/login-submit',{method:'POST'}],['https://other.test/garage',{}]])test('protected/non-shell request is never cached/intercepted: '+path,async()=>{
  const f=fixture();const e=f.dispatch(path,options);assert.equal(e.response,undefined);assert.equal(f.requests.length,0);
});
test('activate removes only old Cendon assets, keeping page history and unrelated caches',async()=>{
  const f=fixture();for(const name of ['cendon-old',BUILD,'cendon-pages','another-app'])await f.caches.open(name);
  const pending=[];f.listeners.activate({waitUntil:p=>pending.push(p)});await Promise.all(pending);
  assert.deepEqual((await f.caches.keys()).sort(),[BUILD,'cendon-pages','another-app'].sort());
});
test('offline uncached navigation never renders Home under another page URL',async()=>{
  const f=fixture({fetcher:async()=>{throw Error('offline')}});await f.seed('/',{text:'saved-home'});
  const e=f.dispatch('/garage'),response=await e.response;assert.equal(response.status,503);assert.doesNotMatch(await response.text(),/saved-home/);await Promise.all(e.pending);
});
