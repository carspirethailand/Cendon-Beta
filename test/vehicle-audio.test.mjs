import {test} from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
const source=readFileSync(new URL('../vehicle-audio.js',import.meta.url),'utf8');
const window={};vm.runInNewContext(source,{window,URL});const A=window.CendonVehicleAudio;
const saved={id:'car-1',name:'Toyota Fortuner',year:2013,engine:'3.0L D-4D',fuel:'diesel',vin:'private-vin',plate:'private-plate'};
const json=v=>JSON.parse(JSON.stringify(v));
test('normalise saved name and explicit metadata without guessing engine, dropping zero mileage or exposing personal fields',()=>{
  const c=A.car({...saved,mileage:0});assert.equal(c.make,'Toyota');assert.equal(c.model,'Fortuner');assert.equal(c.engine,'3.0L D-4D');assert.equal(c.mileage,'0');assert.ok(!JSON.stringify(c).includes('private'));assert.equal(A.car({make:'Honda',model:'City',name:'My nickname'}).make,'Honda');
});
test('a recording choice is explicit, temporary and separate from Garage',()=>{
  assert.throws(()=>A.choice('',saved));const unknown=A.choice('unknown',saved);assert.deepEqual(json(unknown.vehicle),{});
  const other=A.choice('other_confirmed',saved,{make:'Honda',model:'HR-V'});assert.equal(other.vehicle.model,'HR-V');assert.equal(other.vehicle.year,undefined);assert.equal(saved.name,'Toyota Fortuner');
});
test('Garage confirmation is invalidated by car or metadata changes; unknown and other never inherit new Garage selection',()=>{
  const v=A.choice('garage_confirmed',saved);assert.equal(A.current(v,saved),true);assert.equal(A.current(v,{...saved,id:'car-2'}),false);assert.equal(A.current(v,{...saved,engine:'2.8'}),false);
  assert.equal(A.current(A.choice('unknown',saved),{id:'car-2'}),true);assert.equal(A.payload(v).garageKey,undefined);
});
test('picker escapes untrusted names, has no pre-selected Garage option and remains usable without a Garage car',()=>{
  const s=A.picker('test',{name:'<img src=x> "Honda"'},null);assert.ok(!s.includes('<img'));assert.ok(!s.includes('garage_confirmed" selected'));assert.match(s,/other_confirmed/);assert.match(s,/unknown/);assert.ok(!A.picker('test',null,null).includes('value="garage_confirmed"'));
});
test('Home, Chat and SW load paired helper, styles and updated tools',()=>{
  for(const f of ['index.html','chat.html']){const s=readFileSync(new URL('../'+f,import.meta.url),'utf8');const helper=s.indexOf('<script src="vehicle-audio.js?v=3"');assert.ok(helper>=0&&helper<s.indexOf('<script src="call-tools.js?'));assert.match(s,/vehicle-audio\.css\?v=2/);assert.match(s,/call-session\.js\?v=2026-10-19-loud1/);assert.match(s,/call-surface\.js\?v=2026-10-18-web2/);}
  assert.ok(+(readFileSync(new URL('../sw.js',import.meta.url),'utf8').match(/cendon-v(\d+)/)||[])[1]>=319);
});
test('curated manufacturer sources are separate from live results, scoped by market and safely escaped',()=>{
  const r={status:'unavailable',sources:[],manufacturerEvidence:{records:[{url:'https://static.nhtsa.gov/odi/tsbs/2022/MC-10212106-0001.pdf',title:'<img src=x> Ford',markets:['US']},{url:'https://evil.test/a',title:'bad',markets:['TH']}]}};
  const html=A.researchMarkup(r);assert.match(html,/เอกสารผู้ผลิตที่ตรวจไว้แยก/);assert.match(html,/ตลาด US/);assert.match(html,/ยังไม่ยืนยันใช้กับรถคันนี้/);assert.match(html,/ไม่ใช่ตัวอย่างเสียงที่ใช้ฝึก/);assert.ok(!html.includes('<img')&&!html.includes('evil.test'));
  assert.equal(A.car({...saved,market:'TH',kind:'car'}).market,'TH');
});
test('actual live tool opens vehicle confirmation without accessing any microphone or provider; cancelling settles it',async()=>{
  const nodes=new Map();let resources=0;
  const classes=()=>({add(){},remove(){},toggle(){}});
  function el(){let html='';return {hidden:false,classList:classes(),appendChild(n){nodes.set(n.id,n)},querySelector(){return{after(){}}},remove(){},setAttribute(){},getContext(){return{}},get innerHTML(){return html},set innerHTML(v){html=v;for(const m of v.matchAll(/\bid="([^"]+)"/g))nodes.set(m[1],el());}};}
  nodes.set('callUI',el());
  const document={getElementById:id=>nodes.get(id)||null,createElement:el,addEventListener(){},removeEventListener(){}};
  const w={addEventListener(){},removeEventListener(){}};const ctx=vm.createContext({window:w,document,Uint8ClampedArray,cancelAnimationFrame(){},navigator:{mediaDevices:{getUserMedia(){resources++;throw Error('unexpected')}}},fetch(){resources++;throw Error('unexpected')}});
  vm.runInContext(source,ctx);vm.runInContext(readFileSync(new URL('../call-tools.js',import.meta.url),'utf8'),ctx);
  const sent=[],voice={callActive:true,callSession:1,callWS:{readyState:1,send:v=>sent.push(v)}};
  const tools=w.CallTools.create({voice,language:'th',getCar:()=>saved,getUser:()=>({uid:'fixture'})});
  const pending=tools.listen({id:'tool1',name:'listen_engine'});assert.equal(resources,0);assert.match(nodes.get('ctLayer').innerHTML,/Toyota Fortuner 2013 3.0L D-4D/);assert.equal(tools.busy,true);
  nodes.get('ctStartEar').onclick();assert.match(nodes.get('ctChooseError').textContent,/เลือกรถ/);assert.equal(resources,0);
  tools.dispose();await pending;assert.equal(tools.busy,false);assert.equal(resources,0);assert.match(sent[0],/toolResponse/);
});
