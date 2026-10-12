import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
const source=readFileSync(new URL('../carspec.js',import.meta.url),'utf8');
const car={id:'test-car',make:'Fixture Maker',model:'Roadster',name:'Fixture Maker Roadster',year:'2020'};
const complete=()=>({status:'ready',key:'fixture maker|roadster|2020|global',make:car.make,model:car.model,year:car.year,sources:[{url:'https://maker.example.test/spec',title:'Test manufacturer'}],data:{schema:2,query:{market:'GLOBAL'},body:'coupe',body_ok:false,score:{cells:3,confirmed:0},facts:{seats:{v:2,ok:null}},variants:[{name:'Fixture Alpha',engine:{v:'Test engine Alpha',ok:null},l_per_100km:{v:6.1,ok:null}},{name:'Fixture Beta',engine:{v:'Test engine Beta',ok:null},l_per_100km:{v:8.3,ok:false,alt:9.1}}]}});
const settle=async()=>{for(let i=0;i<100;i++)await Promise.resolve()};
function fixture({reply,transport,token}={}){
  const store=new Map(),elements=new Map(),events={},calls=[],timers=new Map();let now=100000,id=0;
  const document={head:{appendChild(){}},createElement:()=>({}),getElementById:key=>elements.get(key)||null,addEventListener:(k,fn)=>{events[k]=fn},dispatchEvent(){}};
  const window={lang:'en',garage:()=>[car],spireAuth:{currentUser:{uid:'fixture-only-user',getIdToken:()=>token||Promise.resolve('fixture-only-token')}},dispatchEvent(){}};
  class Clock extends Date{static now(){return now}}
  const sandbox={window,document,location:{pathname:'/garage'},localStorage:{getItem:k=>store.get(k)||null,setItem:(k,v)=>store.set(k,v)},URL,URLSearchParams,AbortController,Date:Clock,Event:class{},CustomEvent:class{},console,
    setTimeout:(fn,ms)=>{timers.set(++id,{fn,at:now+ms});return id},clearTimeout:i=>timers.delete(i),
    fetch:async(url,opt)=>{calls.push({url,opt});let body=reply;if(!body){const Q=opt.body?JSON.parse(opt.body):Object.fromEntries(new URL(url).searchParams);body=complete();body.key=[Q.make,Q.model,Q.year,...(Q.market&&Q.market!=='TH'?[Q.market]:[])].join('|').toLowerCase();body.data.query={market:Q.market||'GLOBAL'}}const r=transport?await transport(url,opt,calls.length):{body};return {ok:r.status==null||r.status<400,status:r.status||200,json:()=>r.json?r.json():Promise.resolve(structuredClone(r.body))}}};
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
test('car spec UI: make/model/year alone request reference specs, without VIN, trim or market prerequisites',async()=>{
  const f=fixture(),el=await f.pane({...car,info:{}});const Q=JSON.parse(f.calls[0].opt.body);
  assert.deepEqual(Q,{make:car.make,model:car.model,year:car.year,market:'GLOBAL'});assert.match(el.innerHTML,/Test engine Alpha|Model reference specifications/);assert.doesNotMatch(el.innerHTML,/Check model year|data-cs-details/);
});
test('car spec UI: bad optional context does not block the valid main vehicle year',async()=>{
  const f=fixture();await f.api.ensure({...car,info:{model_year:'invalid',market:'invalid',vin:'private'}});const Q=JSON.parse(f.calls[0].opt.body);assert.equal(Q.year,car.year);assert.equal(Q.market,'GLOBAL');assert.equal(Q.vin,undefined);
});
test('car spec UI: unavailable optional regional refinement falls back to usable reference data, without saving car preferences',async()=>{
  const f=fixture({transport:async(url,opt)=>{const Q=JSON.parse(opt.body);return {body:Q.market==='TH'?{status:'failed',code:'unconfirmed'}:complete()}}}),c={...car,info:{market:'TH'}};
  const el=await f.pane(c);assert.match(el.innerHTML,/Model reference specifications/);assert.match(el.innerHTML,/refinement is not available/);assert.match(el.innerHTML,/Test engine Alpha/);assert.equal(c.info.market,'TH');assert.equal(f.calls.length,2);
});
test('car spec UI: reference lookup cannot reuse a legacy Thai-only cache as if it were global',async()=>{
  const f=fixture(),old=complete();old.key='fixture maker|roadster|2020';old.data.query.market='TH';old._at=100000;f.store.set('spire_spec_'+old.key,JSON.stringify(old));await f.api.ensure(car);assert.equal(f.calls.length,1);assert.equal(JSON.parse(f.calls[0].opt.body).market,'GLOBAL');
});
test('car spec UI: VIN and private car fields never reach the public spec search',async()=>{
  const f=fixture();await f.api.ensure({...car,info:{vin:'PRIVATE-VIN',plate:'PRIVATE-PLATE',trim:'Private trim',market:'JP',model_year:'2021'}});
  assert.deepEqual(Object.keys(JSON.parse(f.calls[0].opt.body)).sort(),['make','market','model','year']);
  assert.doesNotMatch(f.calls[0].opt.body,/PRIVATE|trim/);
});
test('car spec UI: auth restoration must complete before a new lookup can be counted as guest',async()=>{
  const f=fixture();let loaded,changed,unsubscribed=0;const user=f.window.spireAuth.currentUser;
  f.window.spireFbReady=new Promise(resolve=>{loaded=resolve});f.window.spireAuth={currentUser:null,onAuthStateChanged:fn=>{changed=fn;return()=>{unsubscribed++}}};
  const result=f.api.ensure(car);await settle();assert.equal(f.calls.length,0);
  loaded(true);await settle();assert.equal(f.calls.length,0);f.window.spireAuth.currentUser=user;changed(user);await result;
  assert.equal(f.calls.length,1);assert.equal(f.calls[0].opt.headers.Authorization,'Bearer fixture-only-token');assert.equal(unsubscribed,1);
});
test('car spec UI: token failures and auth-load failure never silently spend the guest quota',async()=>{
  for(const mode of ['token','sdk']){const f=fixture();if(mode==='token')f.window.spireAuth.currentUser.getIdToken=async()=>{throw Error('network token failure')};else{f.window.spireAuth.currentUser=null;f.window.spireFbReady=Promise.resolve(false)}
    const el=await f.pane();assert.equal(f.calls.length,0);assert.match(el.innerHTML,/No guest lookup was sent/);assert.doesNotMatch(el.innerHTML,/Daily lookup limit|Gemini project quota/);
  }
});
test('car spec UI: an authoritative signed-out callback allows genuine guest use; a pending callback does not',async()=>{
  const f=fixture();let changed;f.window.spireAuth={currentUser:null,onAuthStateChanged:fn=>{changed=fn;return()=>{}}};
  const result=f.api.ensure(car);await settle();assert.equal(f.calls.length,0);changed(null);await result;assert.equal(f.calls[0].opt.headers.Authorization,undefined);
  const pending=fixture();pending.window.spireAuth={currentUser:null,onAuthStateChanged:()=>()=>{}};const p=pending.api.ensure(car);await settle();await pending.advance(8001);await assert.rejects(p,e=>e.code==='auth_pending');assert.equal(pending.calls.length,0);
});
test('car spec UI: changing account while the token resolves cannot send a previous-account bearer token',async()=>{
  const f=fixture();let release;f.window.spireAuth.currentUser.getIdToken=()=>new Promise(resolve=>{release=resolve});const p=f.api.ensure(car);await settle();f.window.spireAuth.currentUser={uid:'different-user'};release('previous-account-token');await assert.rejects(p,e=>e.code==='auth_changed');assert.equal(f.calls.length,0);
});
test('car spec UI: Cendon quota reasons distinguish guest, user, system and retry caps, without blaming Gemini',async()=>{
  for(const [code,phrase] of [['guest_limit','This request is signed out'],['user_limit','Your Cendon daily lookup allowance'],['system_limit','shared daily lookup allowance'],['attempt_limit','retry safety limit']]){
    const f=fixture({reply:{status:'limited',code,scope:code==='guest_limit'||code==='attempt_limit'?'guest':'user'}}),el=await f.pane();assert.match(el.innerHTML,new RegExp(phrase));assert.doesNotMatch(el.innerHTML,/Gemini project quota|Try again/);if(code==='guest_limit')assert.match(el.innerHTML,/\/login\?next=/);
  }
});
test('car spec UI: a server-denied bearer session is an authentication state, not exhausted AI quota',async()=>{
  const f=fixture({transport:async()=>({status:401,body:{error:'Could not confirm your signed-in session',code:'auth_required'}})}),el=await f.pane();assert.match(el.innerHTML,/signed-in session could not be confirmed/);assert.doesNotMatch(el.innerHTML,/Daily lookup limit|Gemini project quota/);
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
    const f=fixture({reply}),el=await f.pane();assert.doesNotMatch(el.innerHTML,/Couldn.t look up this model|data-cs-details|Check model year/);assert.match(el.innerHTML,/No additional car details are required|lookup timed out/);
  }
});
test('car spec UI: failed views reuse a short in-memory result, explicit retry really searches and a different year does not inherit it',async()=>{
  const f=fixture({reply:{status:'failed',code:'unconfirmed'}});await f.api.ensure(car);await f.api.ensure(car);assert.equal(f.calls.length,1);
  await f.api.ensure(car,{retry:true});assert.equal(f.calls.length,2);await f.api.ensure({...car,year:'2021'});assert.equal(f.calls.length,3);
  await f.advance(120001);await f.api.ensure(car);assert.equal(f.calls.length,4);
});
test('car spec UI: empty optional details never make model-year or market correction a prerequisite',async()=>{
  const f=fixture({reply:{status:'failed',code:'unconfirmed'}}),el=await f.pane();assert.match(el.innerHTML,/No additional car details are required/);assert.doesNotMatch(el.innerHTML,/data-cs-details|Check model year|not registration year/);assert.equal(f.calls.length,1);
  const Q=JSON.parse(f.calls[0].opt.body);assert.equal(Q.market,'GLOBAL');assert.equal(Q.year,car.year);
});
test('car spec UI: ungrounded, empty and foreign model results cannot appear as usable specs',async()=>{
  for(const reply of [{status:'none'},{...complete(),sources:[]},{...complete(),key:'other vehicle|sedan|2021'}]){
    const f=fixture({reply}),el=await f.pane();assert.match(el.innerHTML,/No additional car details are required/);assert.doesNotMatch(el.innerHTML,/Test engine|Factory tyre/);
  }
});
test('car spec UI: all discovered variants can be viewed without a choice, but numeric legacy selections cannot personalize the car',async()=>{
  const f=fixture();f.store.set('spire_specv_test-car','0');const el=await f.pane();
  assert.match(el.innerHTML,/without requiring a selection/);assert.match(el.innerHTML,/Test engine Alpha/);assert.match(el.innerHTML,/Test engine Beta/);assert.doesNotMatch(el.innerHTML,/aria-checked="true"/);assert.equal(f.api.economy(car),null);
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
  assert.match(el.innerHTML,/without requiring a selection/);assert.match(el.innerHTML,/Test engine Alpha/);assert.equal(f.api.economy(car),null);
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
