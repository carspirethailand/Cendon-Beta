import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {webcrypto} from 'node:crypto';
const read=f=>readFileSync(new URL('../'+f,import.meta.url),'utf8').replace(/\r\n/g,'\n');
test('desktop Chat has no floating bell, popups do not animate and live call visuals are not globally disabled',()=>{
  const bell=read('bell.js'),drop=read('drop.js'),css=read('calm-ui.css');
  assert.doesNotMatch(bell,/if\(chat\)document\.body\.appendChild\(mkBtn\("cb-fx"\)\)/);
  assert.match(css,/@media\(min-width:900px\)\{\.pill \.cb-bell\{display:none!important\}\}/);
  assert.match(drop,/e\.matches\('\.nb-pop,\.cm-pop'\)/);assert.match(css,/\.nb-pop\{transform:none!important;transition:none!important\}/);
  assert.doesNotMatch(css,/\*\{animation:none/);
});
test('cold car images paint color in the same SVG image operation, never a second CSS mask',()=>{
  const page=read('garage.html'),code=page.slice(page.indexOf('function carArt(k,color){'),page.indexOf('function colorDots('));
  assert.match(code,/feColorMatrix/);assert.match(code,/<image href=/);assert.doesNotMatch(code,/mask-image/);
  assert.doesNotMatch(code,/tintURL|toDataURL/,'the same-operation SVG is also the warm path, not an initial placeholder before synchronous PNG encoding');
});
test('GPS sessions are bound to a selected car and user; estimated distance cannot become a confirmed odometer',()=>{
  for(const p of ['chat.html','garage.html']){const s=read(p);assert.match(s,/dv\.carId=selected\.id;dv\.owner=owner/);assert.match(s,/if\(car\(\)\?\.id!==dv\.carId/);assert.doesNotMatch(s,/confirm\(c,Math\.round\(cur\+dv\.saved\.km\),"manual"\)/);assert.match(s,/Enter the actual parked dashboard reading/);}
});
function core(fetcher){
  const data=new Map([['spire_garage',JSON.stringify([{id:'car-1',make:'Honda',model:'Civic',year:'2020',mileage:'50000'}])],['spire_selCar','"car-1"'],['spire_park_car-1',JSON.stringify({lat:13.7,lng:100.5,acc:12,t:Date.now(),note:'ชั้น 2 เสา B4'})]]);
  const window={auth:{currentUser:{uid:'me',getIdToken:async()=> 'test-only'}},BACKEND_URL:'https://unit.test',crypto:webcrypto,dispatchEvent(){},navigator:{geolocation:{getCurrentPosition(resolve){resolve({coords:{latitude:13.701,longitude:100.5,accuracy:15}})}}}};
  const localStorage={getItem:k=>data.get(k)||null,setItem:(k,v)=>data.set(k,v)};
  const context={window,localStorage,fetch:async(url,init)=>fetcher(url,init,window),Date,CustomEvent:class{}};
  vm.runInNewContext(read('garage-rules.js'),context);vm.runInNewContext(read('valet-core.js'),context);return{data,window,V:window.CendonValetCore};
}
test('parking computes approximate distance locally, includes saved note/age, and never returns raw coordinates',async()=>{
  const f=core(async()=>Response.json([{id:'car-1'}]));const p=await f.V.parking();
  assert.equal(p.saved,true);assert.equal(p.note,'ชั้น 2 เสา B4');assert.ok(p.straightLineMeters>=100&&p.straightLineMeters<=120);
  assert.equal(p.accuracyMeters,15);for(const k of ['lat','lng','latitude','longitude'])assert.ok(!(k in p));
  assert.match(f.V.parkingText(p),/straight line|เส้นตรง/);
  const denied=core(async()=>Response.json([{id:'someone-else'}]));assert.equal((await denied.V.parking()).saved,false);
});
test('account changes cannot expose a previous car parking or write Garage data under the new user',async()=>{
  const f=core(async(_u,_i,w)=>{w.auth.currentUser={uid:'other'};return Response.json([{id:'car-1'}])});
  await assert.rejects(()=>f.V.parking(),/Account changed|บัญชีเปลี่ยน/);
});
test('car detail and logbook mutation report success only after the cloud acknowledgement',async()=>{
  const f=core(async()=>Response.json({error:'offline'},{status:503}));
  const before=f.data.get('spire_garage');await assert.rejects(()=>f.V.setInfo('car-1',{gear:'CVT'}));assert.equal(f.data.get('spire_garage'),before);
  let saves=0;f.window.CendonGarageData={append:async()=>{saves++;throw Error('offline')}};
  await assert.rejects(()=>f.V.logAdd('car-1','fuel',{amount:1200,litres:30,km:50000}));assert.equal(saves,1);assert.equal(f.data.get('spire_carlab_log_car-1'),undefined);
  await assert.rejects(()=>f.V.logAdd('car-1','trip',{title:'x'.repeat(61),km:100}));assert.equal(saves,1);
});
test('cost tool contains an explicit real save form, and no-cost opens it without leaving Chat',()=>{
  const s=read('feature-ai.js');assert.match(s,/id='faCostEntry'/);assert.match(s,/await V\.logAdd\(/);
  assert.match(read('chat.html'),/CendonFeatureAI\?\.openEntry/);
});

test('logbook keeps exact decimal amounts and distance; malformed numbers are never rounded into plausible facts',async()=>{
  const f=core(async()=>Response.json({ok:true}));let entry;
  f.window.CendonGarageData={append:async(_c,kind,e,log)=>{entry=e;log[kind].push(e);return {entry:{id:'test-1'},log}}};
  await f.V.logAdd('car-1','fuel',{amount:'1,234.56',litres:'32.45',km:50000});assert.equal(entry.amount,1234.56);assert.equal(entry.litres,32.45);
  await f.V.logAdd('car-1','trip',{title:'Bangkok to Hua Hin',km:'195.25'});assert.equal(entry.km,195.25);
  await assert.rejects(()=>f.V.logAdd('car-1','fuel',{amount:'1,,234',km:50000}));
});

test('voice car details are prepared without saving and require an explicit confirmation; parking is read-only',async()=>{
  for(const answer of ['ไม่ใช่ครับ','วันนี้ฝนตก','ใช่ครับ']){
    let saves=0,clock=1000;const window={CendonValetCore:{on:()=>true,T:(_th,en)=>en,findCar:()=>({id:'car-1'}),carLabel:()=> 'My car',infoDraft:x=>({gear:x.gear}),setInfo:async()=>{saves++;return {fields:['gear']}},parking:async()=>({saved:true,note:'B2'})}};
    vm.runInNewContext(read('call-agent.js'),{window,Date:class extends Date{static now(){return clock}}});
    const agent=window.CendonCallAgent.create({}),ctx={signal:new AbortController().signal,isCurrent:()=>true};
    const pending=await agent.execute('valet',{do:'car_info',car:'car-1',gear:'CVT'},ctx);assert.equal(saves,0);
    clock+=1000;agent.heard(clock,answer);const result=await agent.execute('valet_confirm',{pending_id:pending.pending_id},ctx);
    assert.equal(saves,answer==='ใช่ครับ'?1:0);assert.equal(!!result.done,answer==='ใช่ครับ');
    assert.equal((await agent.execute('get_parking',{},ctx)).note,'B2');
  }
});
