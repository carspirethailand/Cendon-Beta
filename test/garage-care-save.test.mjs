import {test} from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
const source=readFileSync(new URL('../valet-core.js',import.meta.url),'utf8');
function rig(fetcher){
  const store=new Map([['spire_garage',JSON.stringify([{id:'c1',make:'Honda',model:'Civic',mileage:'50000'}])],['spire_reg_c1',JSON.stringify({act:'2027-01-01'})]]),calls=[];
  const user={uid:'owner',getIdToken:async()=> 'test-token'},window={auth:{currentUser:user},BACKEND_URL:'https://unit.test',dispatchEvent(){}};
  const storage={getItem:k=>store.get(k)??null,setItem:(k,v)=>store.set(k,v)};
  vm.runInNewContext(source,{window,localStorage:storage,CustomEvent:class{},fetch:async(url,init)=>{calls.push({url,init});return fetcher(url,init,window)},Date});
  return{window,store,calls,V:window.CendonValetCore};
}
test('renewal date is cloud-saved before success/local update and merges existing server fields',async()=>{
  const f=rig(async(url,init)=>url.includes('?keys=')?Response.json({state:{reg_c1:{v:{tax:'2027-02-01'},t:1}}}):Response.json({saved:['reg_c1']}));
  const result=await f.V.dueSet('c1','ins','2027-03-01');assert.equal(result.date,'2027-03-01');
  assert.deepEqual(JSON.parse(f.store.get('spire_reg_c1')),{act:'2027-01-01',tax:'2027-02-01',ins:'2027-03-01'});
  assert.equal(f.calls[1].init.method,'PUT');assert.equal(f.calls[1].init.headers.Authorization,'Bearer test-token');
});
test('failed cloud save cannot report success or mutate the local mileage/date',async()=>{
  for(const method of ['mileage','date']){const f=rig(async()=>Response.json({error:'offline'},{status:503}));
    const before=f.store.get(method==='mileage'?'spire_garage':'spire_reg_c1');
    await assert.rejects(()=>method==='mileage'?f.V.setKm('c1',51000):f.V.dueSet('c1','ins','2027-03-01'));
    assert.equal(f.store.get(method==='mileage'?'spire_garage':'spire_reg_c1'),before);
  }
});
test('account switch during cloud request cannot write old Garage data into the new account/local cache',async()=>{
  const f=rig(async(_url,_init,window)=>{window.auth.currentUser={uid:'other',getIdToken:async()=> 'other-token'};return Response.json({state:{}})});
  await assert.rejects(()=>f.V.dueSet('c1','ins','2027-03-01'),/Account changed|บัญชีเปลี่ยน/);
  assert.equal(f.calls.length,1);assert.deepEqual(JSON.parse(f.store.get('spire_reg_c1')),{act:'2027-01-01'});
});

test('invalid calendar dates cannot be saved as garage facts',async()=>{
  const f=rig(async()=>{throw Error('Must not call API')});
  for(const date of ['2026-02-30','2026-13-01','tomorrow']){assert.equal(f.V.okDate(date),false);await assert.rejects(()=>f.V.dueSet('c1','ins',date));}
  assert.equal(f.calls.length,0);assert.equal(f.V.okDate('2028-02-29'),true);
});

test('explicit zero odometer is supported; empty, negative or ambiguous text is not silently converted',async()=>{
  const f=rig(async()=>Response.json({ok:true}));
  for(const km of ['',null,'-500','about 50000','unknown'])await assert.rejects(()=>f.V.setKm('c1',km));
  assert.equal(f.calls.length,0);await f.V.setKm('c1',0);assert.equal(JSON.parse(f.store.get('spire_garage'))[0].mileage,'0');
});
