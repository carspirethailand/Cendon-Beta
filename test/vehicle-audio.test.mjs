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
test('no question before listening: the selected Garage car is the default pill, names are escaped, no Garage car means "not specified"',()=>{
  const s=A.picker('test',{name:'<img src=x> "Honda"'},null);assert.ok(!s.includes('<img'));assert.match(s,/id="testPill"/);assert.match(s,/เปลี่ยน/);
  assert.equal(A.defaultChoice(saved).source,'garage_confirmed');assert.equal(A.current(A.defaultChoice(saved),saved),true);
  assert.equal(A.defaultChoice(null).source,'unknown');assert.match(A.picker('test',null,null),/ไม่ระบุรุ่น/);
  assert.ok(!A.picker('test',saved,null).includes('<select'),'no dropdown and no five-field form');
});
test('another car is one free-text line: make, model and year (Buddhist years converted), nothing required',()=>{
  assert.deepEqual(json(A.parseOther('Mazda 2 ปี 2018')),{make:'Mazda',model:'2',year:'2018'});
  assert.deepEqual(json(A.parseOther('toyota vios 2561')),{make:'toyota',model:'vios',year:'2018'});
  assert.deepEqual(json(A.parseOther('')),{});
  assert.equal(A.choice('other_confirmed',saved,A.parseOther('Isuzu D-Max')).vehicle.model,'D-Max');
});
test('Home, Chat and SW load paired helper, styles and updated tools',()=>{
  for(const f of ['index.html','chat.html']){const s=readFileSync(new URL('../'+f,import.meta.url),'utf8');const helper=s.indexOf('<script src="vehicle-audio.js?v=4"'),lens=s.indexOf('<script src="sound-lens.js?v=1"');assert.ok(helper>=0&&helper<s.indexOf('<script src="call-tools.js?'));assert.ok(lens>=0&&lens<s.indexOf('<script src="call-tools.js?'));assert.match(s,/vehicle-audio\.css\?v=3/);assert.match(s,/call-session\.js\?v=2026-10-19-loud1/);assert.match(s,/call-surface\.js\?v=2026-10-21-r1/);}
  assert.ok(+(readFileSync(new URL('../sw.js',import.meta.url),'utf8').match(/cendon-v(\d+)/)||[])[1]>=319);
});
test('curated manufacturer sources are separate from live results, scoped by market and safely escaped',()=>{
  const r={status:'unavailable',sources:[],manufacturerEvidence:{records:[{url:'https://static.nhtsa.gov/odi/tsbs/2022/MC-10212106-0001.pdf',title:'<img src=x> Ford',markets:['US']},{url:'https://evil.test/a',title:'bad',markets:['TH']}]}};
  const html=A.researchMarkup(r);assert.match(html,/เอกสารผู้ผลิตที่ตรวจไว้แยก/);assert.match(html,/ตลาด US/);assert.match(html,/ยังไม่ยืนยันใช้กับรถคันนี้/);assert.match(html,/ไม่ใช่ตัวอย่างเสียงที่ใช้ฝึก/);assert.ok(!html.includes('<img')&&!html.includes('evil.test'));
  assert.equal(A.car({...saved,market:'TH',kind:'car'}).market,'TH');
});
test('actual live tool starts straight away with the Garage car on a pill (no confirmation step); a mic failure settles the AI tool call without any network',async()=>{
  const nodes=new Map();let mic=0,net=0;
  const classes=()=>({add(){},remove(){},toggle(){},contains(){return false}});
  function el(){let html='';return {hidden:false,dataset:{},style:{},classList:classes(),appendChild(n){nodes.set(n.id,n)},querySelector(){return{after(){},innerHTML:''}},remove(){},setAttribute(){},getContext(){return{}},get innerHTML(){return html},set innerHTML(v){html=v;for(const m of v.matchAll(/\bid="([^"]+)"/g))nodes.set(m[1],el());}};}
  nodes.set('callUI',el());
  const document={getElementById:id=>nodes.get(id)||null,createElement:el,addEventListener(){},removeEventListener(){}};
  const w={addEventListener(){},removeEventListener(){}};const ctx=vm.createContext({window:w,document,Uint8ClampedArray,cancelAnimationFrame(){},setTimeout,navigator:{mediaDevices:{getUserMedia(){mic++;throw Error('mic blocked')}}},fetch(){net++;throw Error('unexpected')}});
  vm.runInContext(source,ctx);vm.runInContext(readFileSync(new URL('../call-tools.js',import.meta.url),'utf8'),ctx);
  const sent=[],voice={callActive:true,callSession:1,callWS:{readyState:1,send:v=>sent.push(v)}};
  const tools=w.CallTools.create({voice,language:'th',getCar:()=>saved,getUser:()=>({uid:'fixture'})});
  const pending=tools.listen({id:'tool1',name:'listen_engine'});
  assert.match(nodes.get('ctLayer').innerHTML,/id="ctVehiclePill"/);assert.match(nodes.get('ctLayer').innerHTML,/Toyota Fortuner 2013 3.0L D-4D/);
  assert.doesNotMatch(nodes.get('ctLayer').innerHTML,/ctStartEar|<select/);
  await pending;assert.equal(mic,1);assert.equal(net,0);assert.equal(tools.busy,false);assert.ok(sent.some(x=>/toolResponse/.test(x)&&/mic blocked/.test(x)));
});
