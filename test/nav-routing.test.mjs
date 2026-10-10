import {test} from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
/* nav.js: ที่อยู่แบบลึก + ปุ่มย้อนทีละขั้น — จำลองประวัติของเบราว์เซอร์ (history.go ทำงานแบบไม่ทันทีเหมือนของจริง) */
const source=readFileSync(new URL('../nav.js',import.meta.url),'utf8');
const wait=(ms=30)=>new Promise(r=>setTimeout(r,ms));
function browser(start='/'){
  const entries=[{url:start,state:null}];let i=0;const listeners={};
  const loc={get pathname(){return entries[i].url.split('?')[0]},get search(){const u=entries[i].url;const k=u.indexOf('?');return k<0?'':u.slice(k)},
    get href(){return 'https://x.test'+entries[i].url},origin:'https://x.test',assign(u){loc.assigned=u}};
  const history={get state(){return entries[i].state},get length(){return entries.length},
    pushState(s,_t,u){entries.splice(i+1);entries.push({url:u,state:s});i++},
    replaceState(s,_t,u){entries[i]={url:u??entries[i].url,state:s}},
    go(n){setTimeout(()=>{const j=Math.max(0,Math.min(entries.length-1,i+n));if(j===i)return;i=j;(listeners.popstate||[]).forEach(f=>f({state:entries[i].state}))},5)}};
  const window={location:loc,history,addEventListener:(t,f)=>(listeners[t]=listeners[t]||[]).push(f)};
  const document={addEventListener(){},querySelectorAll:()=>[],body:{},documentElement:{}};
  window.document=document;window.window=window;
  vm.runInNewContext(source,{window,document,history,location:loc,addEventListener:window.addEventListener,URL,URLSearchParams,setTimeout,clearTimeout,console,Promise,Map,Set,MutationObserver:class{observe(){}takeRecords(){return []}}});
  return {Nav:window.Nav,entries,get i(){return i},url:()=>entries[i].url,back:()=>history.go(-1),fwd:()=>history.go(1)};
}
/* หน้าจอจำลอง: ชั้นที่เปิดอยู่ */
function app(B){
  const ui=[];
  const open=(name,url)=>{ui.push(name);B.Nav.push({url,close:()=>ui.splice(ui.lastIndexOf(name),1)})};
  B.Nav.route({path:'tech/:id',name:'tech',open:p=>open('tech:'+p.id,'/tech/'+p.id)});
  B.Nav.route({path:':tab',parent:'tech',test:p=>['reviews','about'].includes(p.tab),open:p=>open('tab:'+p.tab,B.Nav.top().url+'/'+p.tab)});
  B.Nav.route({path:'category/:k',open:p=>open('cat:'+p.k,'/category/'+p.k)});
  return {ui,open};
}

test('route chain follows parents and tests',()=>{
  const B=browser();app(B);
  assert.deepEqual([...B.Nav.chain('/tech/a1/reviews').map(s=>s.url)],['/tech/a1','/tech/a1/reviews']);
  assert.deepEqual([...B.Nav.chain('/tech/a1/zzz').map(s=>s.url)],['/tech/a1']);
  assert.deepEqual([...B.Nav.chain('/category/air').map(s=>s.url)],['/category/air']);
  assert.equal(B.Nav.chain('/garage/x').length,0);
  assert.ok(B.Nav.owns('/tech/a1'));assert.ok(!B.Nav.owns('/garage'));
});
test('every opened layer is one history entry and device back closes exactly one',async()=>{
  const B=browser();const A=app(B);await B.Nav.start({base:'/'});
  A.open('tech:a1','/tech/a1');A.open('tab:about','/tech/a1/about');
  assert.equal(B.url(),'/tech/a1/about');assert.equal(B.entries.length,3);
  B.back();await wait();assert.equal(B.url(),'/tech/a1');assert.deepEqual(A.ui,['tech:a1']);
  B.back();await wait();assert.equal(B.url(),'/');assert.deepEqual(A.ui,[]);
});
test('forward reopens the layer that back closed, on top of what is still open',async()=>{
  const B=browser();const A=app(B);await B.Nav.start({base:'/'});
  A.open('cat:air','/category/air');A.open('tech:a1','/tech/a1');
  B.back();await wait();assert.deepEqual(A.ui,['cat:air']);
  B.fwd();await wait();assert.deepEqual(A.ui,['cat:air','tech:a1']);assert.equal(B.url(),'/tech/a1');
});
test('a deep link opens every level and back walks out one step at a time',async()=>{
  const B=browser('/tech/a1/reviews');const A=app(B);await B.Nav.start({base:'/'});
  assert.deepEqual(A.ui,['tech:a1','tab:reviews']);
  assert.deepEqual(B.entries.map(e=>e.url),['/','/tech/a1','/tech/a1/reviews']);
  B.back();await wait();assert.deepEqual(A.ui,['tech:a1']);
  B.back();await wait();assert.deepEqual(A.ui,[]);assert.equal(B.url(),'/');
});
test('closing in the UI (× button) rewinds history by the layers it closed',async()=>{
  const B=browser();const A=app(B);await B.Nav.start({base:'/'});
  A.open('tech:a1','/tech/a1');A.open('tab:about','/tech/a1/about');
  B.Nav.back(B.Nav.stack[0]);assert.deepEqual(A.ui,[]);
  await wait();assert.equal(B.url(),'/');assert.equal(B.i,0);
});
test('opening something while history is still rewinding lands in the right place',async()=>{
  const B=browser();const A=app(B);await B.Nav.start({base:'/'});
  A.open('tech:a1','/tech/a1');
  B.Nav.drop(B.Nav.stack[0]);A.ui.length=0;A.open('cat:air','/category/air');
  await wait(60);assert.deepEqual(B.entries.slice(0,B.i+1).map(e=>e.url),['/','/category/air']);
  B.back();await wait();assert.deepEqual(A.ui,[]);assert.equal(B.url(),'/');
});
test('unknown or vanished targets trim the address to what is actually shown',async()=>{
  const B=browser('/tech/a1/nope');const A=app(B);await B.Nav.start({base:'/'});
  assert.deepEqual(A.ui,['tech:a1']);assert.equal(B.url(),'/tech/a1');
});
test('legacy query links are converted before opening',async()=>{
  const B=browser('/?shop=a1');const A=app(B);
  await B.Nav.start({base:'/',legacy:u=>u.searchParams.get('shop')?'/tech/'+u.searchParams.get('shop'):null});
  assert.deepEqual(A.ui,['tech:a1']);assert.equal(B.url(),'/tech/a1');assert.equal(B.entries[0].url,'/');
});
test('Cloudflare serves the right page for every deep prefix, and the worker agrees',()=>{
  const rules=readFileSync(new URL('../_redirects',import.meta.url),'utf8').split('\n').map(l=>l.trim().split(/\s+/)).filter(x=>x[2]==='200');
  const sw=readFileSync(new URL('../sw.js',import.meta.url),'utf8');
  const ctx={self:{location:new URL('https://x.test/sw.js'),addEventListener(){}},caches:{},URL,Set,Headers,Request,Response,fetch(){},setTimeout};
  vm.runInNewContext(sw+';this.shellOf=shellOf',ctx);
  for(const [from,to] of rules){
    const sample=from.endsWith('/*')?from.slice(0,-2)+'/x/y':from;
    assert.equal(ctx.shellOf(sample),to,'sw shell for '+sample);
  }
  assert.ok(rules.every(([,to])=>!/\.html$/.test(to)),'targets must not end in .html (308 loop)');
});
