import {test} from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
const source=readFileSync(new URL('../garage-care.js',import.meta.url),'utf8');
function rig({claim}={}){
  let clock=1000;const sent=[],calls=[],controls=[],window={};vm.runInNewContext(source,{window,AbortController});
  const state={active:true,ready:true,visible:true,busy:false,muted:false,uid:'owner',carId:'c1'};
  const q={ticket:'ticket1',carId:'c1',field:'mileage',text:'One optional question'};
  const care=window.CendonGarageCare.create({now:()=>clock,state:()=>state,claim:async(car,signal)=>{calls.push({car,signal});return claim?claim(signal):{question:q}},send:x=>sent.push(x),feedback:async(action,ticket)=>{controls.push({action,ticket});return{ok:true,enabled:action==='enable',skipped:action==='skip'}}});
  return{care,state,sent,calls,controls,q,advance:ms=>clock+=ms,ready(){care.heard('เรื่องรถ');care.turnComplete();clock+=60000;}};
}
test('no prompt at startup or mere silence; need user speech, completed turn, warmup and long quiet',async()=>{
  const f=rig();f.advance(70000);await f.care.tick();assert.equal(f.calls.length,0);
  f.care.heard('สวัสดี');await f.care.tick();assert.equal(f.calls.length,0);
  f.care.turnComplete();f.advance(24999);await f.care.tick();assert.equal(f.calls.length,0);
  f.advance(1);await f.care.tick();assert.equal(f.sent.length,1);
});
test('recent mic/user activity restarts quiet timer; only one claim per call, no nagging on unanswered question',async()=>{
  const f=rig();f.ready();f.care.activity();f.advance(24999);await f.care.tick();assert.equal(f.calls.length,0);
  f.advance(1);await f.care.tick();for(let i=0;i<5;i++){f.advance(300000);await f.care.tick();}
  assert.equal(f.calls.length,1);assert.equal(f.sent.length,1);
});
test('never prompt during speech/generation/tool work, muted mic, hidden tab, reconnect or missing car/account',async()=>{
  for(const [key,value] of [['busy',true],['muted',true],['visible',false],['ready',false],['active',false],['uid',null],['carId',null]]){
    const f=rig();f.ready();f.state[key]=value;await f.care.tick();assert.equal(f.calls.length,0,key);
  }
});
test('safety/driving topic suppresses check-ins for the entire call',async()=>{
  for(const text of ['ตอนนี้กำลังขับรถ','รถมีควัน','เกิดอุบัติเหตุ','I am driving','brake failure','ขอคิดก่อน','ไม่ต้องถาม','let me think']){const f=rig();f.ready();f.care.heard(text);f.care.turnComplete();f.advance(120000);await f.care.tick();assert.equal(f.calls.length,0,text);}
});

test('Garage edits require an explicit yes after read-back; refusal/irrelevant/silent answers never save',async()=>{
  const agentSource=readFileSync(new URL('../call-agent.js',import.meta.url),'utf8');
  for(const [answer,allow]of [['',false],['ไม่ใช่ครับ',false],['รอก่อน',false],['วันนี้ฝนตก',false],['yes but wait',false],['ใช่ครับ',true],['บันทึกเลยครับ',true],['yes',true]]){
    let clock=1000,saves=0;const window={CendonValetCore:{on:()=>true,findCar:()=>({id:'c1',mileage:'50000'}),carLabel:()=> 'My car',T:(th,en)=>en,setKm:async()=>{saves++;return{label:'My car',km:51000}}}};
    vm.runInNewContext(agentSource,{window,Date:class extends Date{static now(){return clock}}});
    const agent=window.CendonCallAgent.create({}),ctx={signal:new AbortController().signal,isCurrent:()=>true};
    const pending=await agent.execute('valet',{do:'car_km',car:'c1',km:51000},ctx);assert.equal(saves,0);
    clock+=1000;if(answer)agent.heard(clock,answer);
    const r=await agent.execute('valet_confirm',{pending_id:pending.pending_id},ctx);
    assert.equal(saves,allow?1:0,answer);assert.equal(!!r.done,allow,answer);
  }
});
test('late claim cannot interrupt new user speech, car/account change, busy state or hangup',async()=>{
  for(const change of ['speech','car','owner','busy','hangup']){
    let done;const f=rig({claim:()=>new Promise(resolve=>done=resolve)});f.ready();const tick=f.care.tick();
    if(change==='speech'){f.advance(1);f.care.heard('มีเรื่องใหม่');}if(change==='car')f.state.carId='c2';if(change==='owner')f.state.uid='other';if(change==='busy')f.state.busy=true;if(change==='hangup')f.care.reset();
    done({question:f.q});await tick;assert.equal(f.sent.length,0,change);if(change==='hangup')assert.equal(f.calls[0].signal.aborted,true);
  }
});
test('no candidate, provider/network failure or malformed response never loops or reconnects',async()=>{
  for(const response of [null,{question:null},{question:{carId:'other'}},'throw']){const f=rig({claim:async()=>{if(response==='throw')throw Error('unavailable');return response}});f.ready();await f.care.tick();f.advance(120000);await f.care.tick();assert.equal(f.calls.length,1);assert.equal(f.sent.length,0);}
});
test('skip/disable/enable preferences are real authenticated requests, not fabricated saves',async()=>{
  const f=rig(),ctx={signal:new AbortController().signal,isCurrent:()=>true};f.ready();await f.care.tick();
  assert.equal((await f.care.control('skip',ctx)).done,true);assert.deepEqual(f.controls[0],{action:'skip',ticket:'ticket1'});
  assert.equal((await f.care.control('disable',ctx)).enabled,false);assert.equal((await f.care.control('enable',ctx)).enabled,true);
  assert.ok((await f.care.control('pay',ctx)).error);assert.equal(f.controls.length,3);
});
test('paired assets load before transport on Home/Chat and selected car is passed to the scheduler',()=>{
  for(const page of ['index.html','chat.html']){const s=readFileSync(new URL('../'+page,import.meta.url),'utf8');assert.ok(s.indexOf('<script src="garage-care.js?v=1"')<s.indexOf('<script src="call-session.js?'));assert.match(s,/getUser:[^\n]+getCar:/);}
  const sw=readFileSync(new URL('../sw.js',import.meta.url),'utf8');/* รุ่นแคชต้องไม่ต่ำกว่ารุ่นที่ออก Garage care (v303) — รุ่นหลังจากนี้ bump ต่อได้โดยเทสต์ไม่พัง */assert.ok(+(sw.match(/const CACHE = 'cendon-v(\d+)/)||[])[1]>=303);assert.match(sw,/garage-care\.js\?v=1/);
});
