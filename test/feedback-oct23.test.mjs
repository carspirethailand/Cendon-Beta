import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
const read=f=>readFileSync(new URL('../'+f,import.meta.url),'utf8');
const c={window:{},URL};vm.createContext(c);vm.runInContext(read('garage-rules.js'),c);vm.runInContext(read('car-info-review.js'),c);
const rules=c.window.CendonGarageRules,review=c.window.CendonCarInfoReview;
test('additional car details reject the impossible year and malformed engine/code/plate/province/tyre/enum independently',()=>{
  for(const info of [{model_year:'1234321'},{engine:'fsfastdsxz'},{engine_code:'qwdfwfwdsvew'},{plate:'wfweqqev'},{province:'svf'},{tire:'hello'},{drive:'sideways'},{gear:'spaceship'},{fuel:'anything'},{market:'ZZ'}])assert.throws(()=>rules.infoPatch(info),JSON.stringify(info));
  for(const info of [{engine:'3.0L D-4D',engine_code:'1KD-FTV',province:'กรุงเทพมหานคร',plate:'กข 1234',tire:'265/60 R18'},{engine:'2.0 Turbo',engine_code:'EA888',gear:'DCT'},{market:'DE',plate:'B AB 1234',province:'Berlin'}])assert.doesNotThrow(()=>rules.infoPatch(info));
});
test('reference checks warn, not certify or silently change a user vehicle; unknown coverage is not a negative diagnosis',()=>{
  const s={status:'ready',sources:[{url:'https://manufacturer.example/spec'}],data:{variants:[{name:'720S',engine:{v:'4.0 V8'},gearbox:{v:'7-speed SSG'},drive:{v:'RWD'},fuel:'petrol'}]}};
  const info={trim:'wedwf',drive:'FWD',gear:'CVT',fuel:'ปลั๊กอินไฮบริด'};
  assert.deepEqual(Array.from(review.compare(info,s).warnings,w=>w.field),['trim','drive','fuel','gear']);assert.equal(info.drive,'FWD');
  assert.equal(review.compare(info,{...s,sources:[]}).status,'unconfirmed');assert.equal(review.compare(info,{status:'failed'}).warnings.length,0);
});
test('AI reference lookup receives only public make/model/year/market; never VIN, plate, private notes or account identifiers',async()=>{
  let sent;c.window.CarSpec={ensure:async q=>{sent=q;return {status:'failed'}}};
  await review.check({id:'private-car',uid:'private-owner',make:'Toyota',model:'Fortuner',year:2013},{vin:'JH4KA8260MC000000',plate:'กข 1234',note:'ข้อมูลส่วนตัว',engine:'3.0L'});
  const raw=JSON.stringify(sent);assert.ok(!/JH4|1234|ส่วนตัว|private/.test(raw));assert.equal(sent.model,'Fortuner');
});
const bell=read('bell.js'),start=bell.indexOf('const money='),end=bell.indexOf('/* ── หน้าตา:',start);
function events(){const map=new Map(),scope={localStorage:{getItem:k=>map.get(k)||null,setItem:(k,v)=>map.set(k,v)},T:(th,en)=>en};vm.createContext(scope);vm.runInContext(bell.slice(start,end),scope);return scope.jobEvents}
test('new already-quoted jobs and first-load pending quotes appear once, while completed history does not replay',()=>{
  const run=events(),quote={id:'q',side:'customer',status:'quoted',quoteAt:10,total:100,updatedAt:10};
  assert.equal(run([quote,{id:'old',status:'completed',side:'customer'}],'one').length,1);assert.equal(run([quote],'one').length,0);
  assert.equal(run([quote,{...quote,id:'q2'}],'one').length,1);assert.equal(run([{...quote,quoteAt:12,total:200,updatedAt:12}],'one')[0].kind,'quote');
  assert.equal(run([{...quote,status:'completed'}],'one').length,0);
});
test('notification snapshots are account-bound and old two-field snapshots upgrade without a spurious revised-quote alert',()=>{
  const run=events(),q={id:'q',side:'customer',status:'quoted',total:100};assert.equal(run([q],'one').length,1);assert.equal(run([], 'two').length,0);assert.equal(run([q],'two').length,1);
});
