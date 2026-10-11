import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
const source=readFileSync(new URL('../carspec.js',import.meta.url),'utf8');
const car={id:'test-car',make:'Fixture Maker',model:'Roadster',name:'Fixture Maker Roadster',year:'2020'};
const complete=()=>({status:'ready',key:'fixture maker|roadster|2020',make:car.make,model:car.model,year:car.year,sources:[{url:'https://maker.example.test/spec',title:'Test manufacturer'}],data:{schema:2,body:'coupe',body_ok:false,score:{cells:3,confirmed:0},facts:{seats:{v:2,ok:null}},variants:[{name:'Fixture Alpha',engine:{v:'Test engine Alpha',ok:null},l_per_100km:{v:6.1,ok:null}},{name:'Fixture Beta',engine:{v:'Test engine Beta',ok:null},l_per_100km:{v:8.3,ok:false,alt:9.1}}]}});
const settle=async()=>{for(let i=0;i<100;i++)await Promise.resolve()};
function fixture({reply=complete(),transport,token}={}){
  const store=new Map(),elements=new Map(),events={},calls=[],timers=new Map();let now=100000,id=0;
  const document={head:{appendChild(){}},createElement:()=>({}),getElementById:key=>elements.get(key)||null,addEventListener:(k,fn)=>{events[k]=fn},dispatchEvent(){}};
  const window={lang:'en',garage:()=>[car],spireAuth:{currentUser:{uid:'fixture-only-user',getIdToken:()=>token||Promise.resolve('fixture-only-token')}},dispatchEvent(){}};
  class Clock extends Date{static now(){return now}}
  const sandbox={window,document,location:{pathname:'/garage'},localStorage:{getItem:k=>store.get(k)||null,setItem:(k,v)=>store.set(k,v)},URL,URLSearchParams,AbortController,Date:Clock,Event:class{},CustomEvent:class{},console,
    setTimeout:(fn,ms)=>{timers.set(++id,{fn,at:now+ms});return id},clearTimeout:i=>timers.delete(i),
    fetch:async(url,opt)=>{calls.push({url,opt});const r=transport?await transport(url,opt,calls.length):{body:reply};return {ok:r.status==null||r.status<400,status:r.status||200,json:()=>r.json?r.json():Promise.resolve(structuredClone(r.body))}}};
  vm.runInNewContext(source,sandbox);
  const advance=async(ms)=>{now+=ms;for(const [i,t] of [...timers])if(t.at<=now){timers.delete(i);t.fn()}await settle()};
  async function pane(c=car,kind='spec'){const html=window.CarSpec.pane(c,kind),key=html.match(/id="(cs\d+)"/)[1],el={id:key,dataset:{},innerHTML:html};elements.set(key,el);await advance(0);return el}
  return {api:window.CarSpec,window,store,calls,events,elements,pane,advance};
}
test('car spec UI: simultaneous views reuse one request and shared market/year cache',async()=>{
  const f=fixture();await Promise.all([f.api.ensure(car),f.api.ensure({...car,id:'another-car'})]);assert.equal(f.calls.length,1);
  await f.api.ensure(car);assert.equal(f.calls.length,1);
  await f.api.ensure({...car,info:{market:'JP',model_year:'2021'}});assert.equal(f.calls.length,2);
  const b=JSON.parse(f.calls[1].opt.body);assert.equal(b.market,'JP');assert.equal(b.year,'2021');
});
test('car spec UI: VIN and private car fields never reach the public spec search',async()=>{
  const f=fixture();await f.api.ensure({...car,info:{vin:'PRIVATE-VIN',plate:'PRIVATE-PLATE',trim:'Private trim',market:'JP',model_year:'2021'}});
  assert.deepEqual(Object.keys(JSON.parse(f.calls[0].opt.body)).sort(),['make','market','model','year']);
  assert.doesNotMatch(f.calls[0].opt.body,/PRIVATE|trim/);
});
test('car spec UI: provider quota explains the real blocker and does not offer a futile retry',async()=>{
  const f=fixture({reply:{status:'failed',code:'provider_quota',retryable:false,error:'429 RESOURCE_EXHAUSTED'}}),el=await f.pane();
  assert.match(el.innerHTML,/Gemini project quota/);assert.match(el.innerHTML,/Refreshing cannot fix/);assert.doesNotMatch(el.innerHTML,/data-cs-retry|Powertrain|Test engine/);
});
test('car spec UI: old failed rows still expose quota and provider configuration causes clearly',async()=>{
  for(const error of ['gemini quota 429','API key invalid 403','model NOT_FOUND 404']){
    const f=fixture({reply:{status:'failed',error}}),el=await f.pane();assert.doesNotMatch(el.innerHTML,/data-cs-retry/);assert.match(el.innerHTML,/quota|configured correctly/);
  }
});
test('car spec UI: failed HTTP-200 responses render unconfirmed and timeout codes instead of the generic failure screenshot',async()=>{
  for(const reply of [{status:'failed',code:'unconfirmed',error:'ไม่พบข้อมูลที่ใช้ได้จากแหล่งอ้างอิง'},{status:'failed',error:'ไม่พบข้อมูลที่ใช้ได้จากแหล่งอ้างอิง'},{status:'failed',code:'timeout',error:'ค้นนานเกินกำหนด'}]){
    const f=fixture({reply}),el=await f.pane();assert.doesNotMatch(el.innerHTML,/Couldn.t look up this model/);assert.match(el.innerHTML,/No sufficiently sourced|lookup timed out/);
    if(reply.code!=='timeout')assert.match(el.innerHTML,/data-cs-details|not registration year/);
  }
});
test('car spec UI: failed views reuse a short in-memory result, explicit retry really searches and a different year does not inherit it',async()=>{
  const f=fixture({reply:{status:'failed',code:'unconfirmed'}});await f.api.ensure(car);await f.api.ensure(car);assert.equal(f.calls.length,1);
  await f.api.ensure(car,{retry:true});assert.equal(f.calls.length,2);await f.api.ensure({...car,year:'2021'});assert.equal(f.calls.length,3);
  await f.advance(120001);await f.api.ensure(car);assert.equal(f.calls.length,4);
});
test('car spec UI: the details action opens the existing form without changing or posting car preferences',async()=>{
  const f=fixture({reply:{status:'failed',code:'unconfirmed'}}),el=await f.pane();let opened=null;
  const target={closest:s=>s==='.cs-wrap'?el:s==='[data-cs-details]'?{}:null};
  // A real page supplies this function; expose the fixture window to test it.
  f.window.openInfo=id=>{opened=id};await f.events.click({target});assert.equal(opened,car.id);assert.equal(f.calls.length,1);
});
test('car spec UI: ungrounded, empty and foreign model results cannot appear as usable specs',async()=>{
  for(const reply of [{status:'none'},{...complete(),sources:[]},{...complete(),key:'other vehicle|sedan|2021'}]){
    const f=fixture({reply}),el=await f.pane();assert.match(el.innerHTML,/No sufficiently sourced/);assert.doesNotMatch(el.innerHTML,/Test engine|Factory tyre/);
  }
});
test('car spec UI: multiple variants require a choice and numeric legacy selections are ignored',async()=>{
  const f=fixture();f.store.set('spire_specv_test-car','0');const el=await f.pane();
  assert.match(el.innerHTML,/Choose your variant first/);assert.doesNotMatch(el.innerHTML,/Test engine Alpha|Test engine Beta/);
  const button={dataset:{csVar:'0'}},target={closest:s=>s==='.cs-wrap'?el:s==='[data-cs-var]'?button:null};
  await f.events.click({target});await settle();assert.match(el.innerHTML,/Test engine Alpha/);assert.equal(f.api.economy(car),6.1);assert.equal(f.calls.length,1);
  const saved=JSON.parse(f.store.get('spire_specv_test-car'));assert.equal(saved.key,complete().key);assert.equal(typeof saved.variant,'string');
});
test('car spec UI: disagreement and no chosen variant cannot become a numeric fuel estimate',async()=>{
  const f=fixture();await f.api.ensure(car);assert.equal(f.api.economy(car),null);
  const el=await f.pane(),button={dataset:{csVar:'1'}};await f.events.click({target:{closest:s=>s==='.cs-wrap'?el:s==='[data-cs-var]'?button:null}});await settle();assert.equal(f.api.economy(car),null);
});
test('car spec UI: one AI-discovered engine is not proof that every car in that year uses it',async()=>{
  const reply=complete();reply.data.variants=reply.data.variants.slice(0,1);const f=fixture({reply}),el=await f.pane();
  assert.match(el.innerHTML,/Other variants may not have been found/);assert.doesNotMatch(el.innerHTML,/Test engine Alpha/);assert.equal(f.api.economy(car),null);
});
test('car spec UI: parts do not use body-type battery, oil or wiper estimates',async()=>{
  const f=fixture(),el=await f.pane(car,'parts');assert.match(el.innerHTML,/No verified battery, wiper or engine-oil specification/);assert.doesNotMatch(el.innerHTML,/NS60|45Ah|3\.7|Iridium recommended/);
});
test('car spec UI: per-field source links are safe and show the cited document',async()=>{
  const reply=complete();reply.sources.push({url:'javascript:alert(1)',title:'Unsafe'});reply.sources[0].docId=3;reply.data.facts.seats.sourceIds=[3];
  const f=fixture({reply}),el=await f.pane();assert.match(el.innerHTML,/class="cs-ref" href="https:\/\/maker.example.test\/spec"/);assert.doesNotMatch(el.innerHTML,/javascript:|Unsafe/);
});
test('car spec UI: document discovery failures are not labeled expired Gemini tokens',async()=>{
  const f=fixture({reply:{status:'failed',code:'source_unavailable',error:'discovery_http_403'}}),el=await f.pane();assert.match(el.innerHTML,/Public documents are unavailable/);assert.doesNotMatch(el.innerHTML,/quota|configured correctly|Test engine/);
});
test('car spec UI: hanging identity and JSON requests have a finite deadline',async()=>{
  for(const mode of ['token','json']){const never=new Promise(()=>{}),f=fixture(mode==='token'?{token:never}:{transport:async()=>({body:{},json:()=>never})});
    const pending=f.api.ensure(car);await settle();await f.advance(65000);await assert.rejects(pending,e=>e.name==='AbortError');assert.equal(f.calls.length,mode==='token'?0:1);
  }
});
test('car spec UI: prolonged pending lookup ends with a clear timeout, without repeatedly starting AI',async()=>{
  const f=fixture({reply:{status:'pending'}}),el=await f.pane();for(let i=0;i<20;i++)await f.advance(2000);
  assert.match(el.innerHTML,/lookup timed out/);assert.equal(f.calls.filter(x=>x.opt.method==='POST').length,1);assert.equal(f.calls.filter(x=>x.opt.method==='GET').length,20);
});
for(const file of ['garage','news','spares','profile'])test('car identity and source safety stay consistent on '+file,()=>{
  const html=readFileSync(new URL('../'+file+'.html',import.meta.url),'utf8');
  const modelBlock=html.match(/function M\(s\)[\s\S]*?const CAR_DATABASE\s*=\s*\{[\s\S]*?\n\};/)[0];
  const get=html.match(/function getBodyStyle\(name\) \{[\s\S]*?\n\}/)[0],body=html.match(/const BODY=\{[\s\S]*?function normBrand/)[0].replace(/function normBrand$/,'');
  const resolve=html.match(/function bodyOf\(c\)\{[\s\S]*?\n\}/)[0],s={};vm.runInNewContext(modelBlock+'\n'+get+'\n'+body+'\n'+resolve+'\nthis.resolve=bodyOf;this.style=getBodyStyle;',s);
  assert.equal(s.resolve({make:'Aston Martin',model:'DB11',type:'sedan'}),'coupe');assert.equal(s.resolve({make:'Mitsubishi',model:'Pajero Sport',type:'sedan'}),'suv');
  assert.equal(s.style('unknown car'),null);assert.equal(s.resolve({make:'Unknown',model:'Unknown',type:'sedan'}),'unknown');
  assert.doesNotMatch(body,/seat:|cc:|tank:|l100:|batt:|wiper:|oil:/);assert.doesNotMatch(html,/Specs confirmed|using estimates|Iridium recommended/);
  for(const m of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/g)){if(!/\bsrc=|type=/.test(m[1]))new vm.Script(m[2])}
});
test('car details: additional context is optional and VIN lookup is explicit, not sent on typing',()=>{
  const html=readFileSync(new URL('../garage.html',import.meta.url),'utf8');
  for(const k of ['vin','trim','engine_code','model_year','market','drive'])assert.match(html,new RegExp('k:"'+k+'"'));
  assert.match(html,/if\(!lookup\).*Press Check/);assert.match(html,/not Gemini or the shared spec library/);assert.match(html,/vinCheck\(inp,true\)/);
});
