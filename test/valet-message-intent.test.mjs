import {test} from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
const read=f=>readFileSync(new URL('../'+f,import.meta.url),'utf8');
const source=read('valet.js'),chat=read('chat.html');
const request='ช่วยทักไปหาช่างนนทการช่างและบอกว่า รถมีปัญหา start ไม่ติด รุ่น porsche 911';
function rig(on=false){
  const store={spire_valet:JSON.stringify({on,uid:'owner'})},input={value:''},sent=[];
  const window={localStorage:{getItem:k=>store[k]??null,setItem:(k,v)=>{store[k]=v}},spireAuth:{currentUser:{uid:'owner'}}};
  const document={readyState:'complete',addEventListener(){},querySelector:()=>null,querySelectorAll:()=>[],getElementById:id=>id==='inp'?input:null};
  const sandbox={window,document,localStorage:window.localStorage,MutationObserver:class{observe(){}},setTimeout:()=>0,JSON,encodeURIComponent,messages:[],sending:false,featureJob:null,atts:[],text:request,lang:'th',renderMessages(){},saveSession(){},updateSend(){},renderChips(){},sendMsg(){sent.push(input.value);},toast(){}};
  vm.createContext(sandbox);vm.runInContext(source,sandbox);sandbox.CendonValet=window.CendonValet;
  return{...sandbox,sandbox,input,sent,store,V:window.CendonValet,run:code=>vm.runInContext(code,sandbox)};
}
test('exact screenshot command separates recipient from literal message; no search or inferred car details',()=>{
  const f=rig(),intent=f.V.intent(request);
  assert.equal(JSON.stringify(intent),JSON.stringify({do:'msg_shop',shop:'นนทการช่าง',text:'รถมีปัญหา start ไม่ติด รุ่น porsche 911'}));
  assert.ok(f.V.wantsAct(request));assert.equal(f.sent.length,0);
});
test('explicit supported Thai/English variants work, but questions, negation and unknown recipients are not direct sends',()=>{
  const f=rig();
  for(const text of ['รบกวนส่งข้อความถึงร้านนนท์แอร์และบอกว่า พรุ่งนี้เปิดไหม','please message Nont Garage saying My Porsche 911 will not start'])assert.equal(f.V.intent(text)?.do,'msg_shop');
  for(const text of ['อย่าทักไปหาช่างนนทการช่างและบอกว่า รถเสีย','ไม่ต้องส่งข้อความหาอู่ A และบอกว่า รถเสีย','ช่วยหาช่างซ่อม Porsche 911','ร้านไหนชื่อ นนทการช่าง','ช่วยทักไปหาใครก็ได้และบอกว่า รถเสีย'])assert.equal(f.V.intent(text),null,text);
});
test('actual chat routing: Valet-off shows allow-and-continue; Valet-on shows a draft before any AI/search call',()=>{
  const begin=chat.indexOf('  if(!featureJob&&!atts.length&&window.CendonValet&&!CendonValet.on()&&CendonValet.wantsAct(text))');
  const end=chat.indexOf('  messages.push({role:"ai",typing:true});',begin);
  assert.ok(begin>0&&end>begin);const block='function route(){'+chat.slice(begin,end)+'}route();';
  for(const on of [false,true]){const f=rig(on);f.sandbox.messages.push({role:'user',text:request});f.run(block);
    const ai=f.sandbox.messages.at(-1);assert.equal(ai.acts[0].do,on?'msg_shop':'enable');assert.equal(f.sent.length,0);
    if(on){assert.equal(ai.acts[0].shop,'นนทการช่าง');assert.match(ai.text,/ยังไม่ได้ส่ง/);}else assert.equal(ai.acts[0].text,request);
  }
});
test('actual Allow handler resumes the original request once, without typing it again or contacting a shop',()=>{
  const f=rig();f.sandbox.messages.push({role:'user',text:request},{role:'ai',acts:[{do:'enable',text:request}]});
  const begin=source.indexOf('  if(k==="enable"){'),end=source.indexOf('  if(k==="urgfull")',begin);
  f.run('function resume(){const KEY="spire_valet",D=document,paintBtns=()=>{},uidNow=()=>window.spireAuth.currentUser.uid,T=(th,en)=>th,k="enable",m=messages[1],a=m.acts[0];'+source.slice(begin,end)+'}resume();');
  assert.equal(f.V.on(),true);assert.deepEqual(f.sent,[request]);assert.equal(f.sandbox.messages.length,0);
});
test('action requests cannot be turned into the model-generated search marker from the screenshot',()=>{
  const begin=chat.indexOf('function attachSvc(pre){'),end=chat.indexOf('/* ตารางแบบ markdown',begin),f=rig(true);
  let searches=0;f.window.CendonSearch={takeMarker:()=>request,find:()=>{searches++;return Promise.resolve({})}};
  f.sandbox.messages.push({role:'user',text:request},{role:'ai',text:'Enable Valet and ask again',acts:[]});
  f.run(chat.slice(begin,end)+'attachSvc(null);');assert.equal(searches,0);
  assert.match(source,/go1\.disabled=!chosen/);assert.match(source,/ตรวจและเลือกร้านผู้รับ/);
});

test('Valet permission belongs to the current account; legacy browser-wide permission does not silently enable another account',()=>{
  const f=rig(true);assert.equal(f.V.on(),true);
  f.window.spireAuth.currentUser={uid:'other'};assert.equal(f.V.on(),false);
  f.store.spire_valet=JSON.stringify({on:true});assert.equal(f.V.on(),false);
});
