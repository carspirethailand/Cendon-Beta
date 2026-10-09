import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

const source=readFileSync(new URL('../car-sync.js',import.meta.url),'utf8');
const initialCars=[
  {id:'car-A',name:'Deleted fixture',color:'white',history:[{question:'retain archived history'}]},
  {id:'car-B',name:'Retained fixture',color:'silver',mileage:42000,history:[{question:'keep this history'}]},
];
const clone=value=>JSON.parse(JSON.stringify(value));
function deferred(){let resolve,reject;const promise=new Promise((a,b)=>{resolve=a;reject=b;});return {promise,resolve,reject};}
async function settle(){for(let i=0;i<12;i++)await Promise.resolve();}
function fixture({uid='owner-A',store=new Map(),response,token,online=true}={}){
  if(!store.has('spire_garage'))store.set('spire_garage',JSON.stringify(initialCars));
  const calls=[],marks=[],listeners=new Map(),timers=new Map();let timerId=0;
  const storage={
    getItem:key=>store.has(key)?store.get(key):null,
    setItem:(key,value)=>store.set(key,String(value)),removeItem:key=>store.delete(key),
    key:index=>[...store.keys()][index]??null,get length(){return store.size;},
  };
  const user=id=>id?{uid:id,getIdToken:()=>token?.promise||Promise.resolve('test-only-identity')}:null;
  const auth={currentUser:user(uid)};
  const window={auth,spireAuth:auth,BACKEND_URL:'https://unit-test.invalid',
    cloudMark:key=>marks.push(key),localStorage:storage,
    addEventListener:(name,fn)=>listeners.set(name,fn),dispatchEvent(){}};
  const sandbox={window,localStorage:storage,navigator:{onLine:online},
    location:{protocol:'https:'},document:{addEventListener(){}},AbortController,
    URL,Headers,CustomEvent:class{constructor(name,detail){this.type=name;this.detail=detail;}},
    Date,console,
    setTimeout(fn,ms){const id=++timerId;timers.set(id,{fn,ms});return id;},
    clearTimeout:id=>timers.delete(id),
    fetch:async(url,options)=>{
      calls.push({url,options});
      if(typeof response==='function')return response(url,options);
      if(response)return response;
      return {ok:true,status:200,json:async()=>({success:true})};
    },
  };
  vm.runInNewContext(source,sandbox);
  return {api:window.CendonCars,window,sandbox,auth,store,calls,marks,timers,
    cars:()=>JSON.parse(store.get('spire_garage')),
    selected:()=>JSON.parse(store.get('spire_selCar')||'null'),
    switchOwner(id){auth.currentUser=user(id);},
  };
}

function syncFixture(name,options={}){
  const f=fixture(options),page=readFileSync(new URL(`../${name}.html`,import.meta.url),'utf8');
  const oneLine=name=>page.match(new RegExp(`(?:async )?function ${name}\\([^\\n]*\\{[^\\n]*\\}`))?.[0];
  const multiLine=name=>page.match(new RegExp(`async function ${name}\\([^\\n]*\\{[\\s\\S]*?\\n\\}`))?.[0];
  const functions=['garage','saveGarage','carsAreRemote'].map(oneLine);
  if(name==='garage')functions.push(oneLine('carTok'));
  functions.push(multiLine('pushCar'),multiLine('syncCars'));
  assert.ok(functions.every(Boolean),`${name} retains its executable car-sync functions`);
  Object.assign(f.sandbox,{
    auth:f.auth,useFb:true,currentUser:f.auth.currentUser,BACKEND_URL:f.window.BACKEND_URL,CendonCars:f.api,
    LS:{get:(key,fallback)=>{try{return JSON.parse(f.store.get('spire_'+key))??fallback;}catch{return fallback;}},
      set:(key,value)=>f.store.set('spire_'+key,JSON.stringify(value)),
      del:key=>f.store.delete('spire_'+key)},
    console:{warn(){}},$:()=>null,getBodyStyle:()=>'sedan',
    renderGarage(){},renderDashboard(){},renderCarSel(){},renderCarUI(){},
  });
  vm.runInNewContext(functions.join('\n'),f.sandbox);
  return {...f,sync:()=>f.sandbox.syncCars()};
}

function cloudFixture(name,options={}){
  const f=fixture(options),page=readFileSync(new URL(`../${name}.html`,import.meta.url),'utf8');
  const cloud=page.slice(page.indexOf('const META="spire___meta"'));
  const helpers=cloud.slice(0,cloud.indexOf('let dirty='));
  const req=cloud.match(/async function req\(path,opt\)\{[\s\S]*?\n\}/)?.[0];
  const pull=cloud.match(/async function pull\(\)\{[\s\S]*?\n\}/)?.[0];
  assert.ok(helpers&&req&&pull,`${name} exposes its actual cloud-state pull function`);
  const applied=[];
  Object.assign(f.sandbox,{CendonCars:f.api,St:{},apply:keys=>applied.push(clone(keys))});
  vm.runInNewContext([helpers,req,pull].join('\n'),f.sandbox);
  return {...f,applied,pull:()=>f.sandbox.pull()};
}

test('confirmed deletion survives six reloads and repeated stale car pulls',async()=>{
  const f=fixture();await f.api.remove('car-A');
  assert.equal(f.calls.length,1);
  assert.equal(f.calls[0].options.method,'DELETE');
  assert.equal(f.calls[0].url,'https://unit-test.invalid/api/cars/car-A');
  assert.equal(f.calls[0].options.headers.Authorization,'Bearer test-only-identity');
  assert.deepEqual(f.cars(),[initialCars[1]]);
  for(let reload=0;reload<6;reload++){
    const next=fixture({store:f.store});
    assert.equal(next.api.isDeleted('car-A'),true,`reload ${reload+1} retains the deletion`);
    assert.deepEqual(clone(next.api.filter(initialCars)),[initialCars[1]],'stale cloud snapshots cannot resurrect the car');
    assert.deepEqual(next.cars(),[initialCars[1]]);
  }
});

test('unsuccessful authenticated deletes never report success or hide the car',async()=>{
  for(const status of [401,403,500]){
    const f=fixture({response:{ok:false,status,json:async()=>({success:false,error:'test failure'})}});
    await assert.rejects(f.api.remove('car-A'));
    assert.deepEqual(f.cars(),initialCars);assert.equal(f.api.isDeleted('car-A'),false);
    assert.deepEqual(f.marks,[]);
  }
  for(const data of [{success:false},{},null]){
    const f=fixture({response:{ok:true,status:200,json:async()=>data}});
    await assert.rejects(f.api.remove('car-A'));
    assert.deepEqual(f.cars(),initialCars);assert.equal(f.api.isDeleted('car-A'),false);
  }
  const malformed=fixture({response:{ok:true,status:200,json:async()=>{throw new Error('invalid JSON');}}});
  await assert.rejects(malformed.api.remove('car-A'));assert.deepEqual(malformed.cars(),initialCars);
  const rejected=fixture({response:async()=>{throw new Error('network unavailable');}});
  await assert.rejects(rejected.api.remove('car-A'));assert.deepEqual(rejected.cars(),initialCars);
});

test('offline authenticated removal preserves the car while guest deletion works locally',async()=>{
  const remote=fixture({online:false});await assert.rejects(remote.api.remove('car-A'));
  assert.equal(remote.calls.length,0);assert.deepEqual(remote.cars(),initialCars);
  const guest=fixture({uid:null,online:false});assert.equal(guest.api.owner(),'guest');
  await guest.api.remove('car-A');assert.equal(guest.calls.length,0);
  assert.deepEqual(guest.cars(),[initialCars[1]]);assert.equal(guest.api.isDeleted('car-A'),true);
});

test('restoring an existing sign-in cannot be mistaken for guest deletion',async()=>{
  for(const hint of ['cached','window','both']){
    const f=fixture({uid:null});f.store.set('spire_selCar',JSON.stringify('car-A'));
    if(hint!=='window')f.store.set('spire_cachedUser',JSON.stringify({uid:'owner-A'}));
    if(hint!=='cached')f.window.currentUser={uid:'owner-A'};
    await assert.rejects(f.api.remove('car-A'),/Sign-in is still loading/);
    assert.deepEqual(f.cars(),initialCars);assert.equal(f.selected(),'car-A');
    assert.equal(f.calls.length,0);assert.deepEqual(f.marks,[]);
    assert.equal(f.store.has('spire___carDeletes'),false,'pending auth creates no guest tombstone');
    assert.equal(f.api.isDeleted('car-A'),false);
    f.switchOwner('owner-A');await f.api.remove('car-A');
    assert.equal(f.calls.length,1);assert.equal(f.calls[0].options.method,'DELETE');
    assert.deepEqual(f.cars(),[initialCars[1]]);assert.ok(!f.selected());
    assert.deepEqual(JSON.parse(f.store.get('spire___carDeletes')),{'owner-A':['car-A']});
  }
});

test('deletion clears only the deleted selection and keeps archived history and other metadata',async()=>{
  const f=fixture();
  f.store.set('spire_selCar',JSON.stringify('car-A'));
  f.store.set('spire_sess_car-A',JSON.stringify([{id:'archived',messages:[{text:'keep me'}]}]));
  f.store.set('spire_cursess_car-A',JSON.stringify('archived'));
  f.store.set('spire_cost_car-A',JSON.stringify([{amount:1500}]));
  const retainedKeys=['spire_sess_car-A','spire_cursess_car-A','spire_cost_car-A'];
  const before=retainedKeys.map(key=>f.store.get(key));
  await f.api.remove('car-A');assert.ok(!f.selected());
  assert.deepEqual(f.cars(),[initialCars[1]]);
  assert.deepEqual(retainedKeys.map(key=>f.store.get(key)),before);
  assert.deepEqual([...new Set(f.marks)].sort(),['garage','selCar']);
  const other=fixture();other.store.set('spire_selCar',JSON.stringify('car-B'));
  await other.api.remove('car-A');assert.equal(other.selected(),'car-B');
  assert.deepEqual([...new Set(other.marks)],['garage']);
});

test('server deletion IDs purge stale local rows and are scoped to their account',()=>{
  const f=fixture();f.store.set('spire_selCar',JSON.stringify('car-A'));
  const revision=f.api.revision();f.api.acceptDeleted(['car-A'],'owner-A');
  assert.ok(f.api.revision()>revision);assert.deepEqual(f.cars(),[initialCars[1]]);
  assert.ok(!f.selected());assert.equal(f.api.isDeleted('car-A'),true);
  const other=fixture({uid:'owner-B',store:f.store});
  assert.equal(other.api.owner(),'owner-B');assert.equal(other.api.isDeleted('car-A'),false);
  assert.deepEqual(clone(other.api.filter(initialCars)),initialCars);
  other.store.set('spire_garage',JSON.stringify(initialCars));
  other.api.acceptDeleted(['car-A'],'owner-A');
  assert.deepEqual(other.cars(),initialCars,'a late snapshot from another account cannot purge the active garage');
  assert.equal(other.api.isDeleted('car-A'),false);
});

test('repeated server tombstones do not mark unchanged garage or selection as new edits',()=>{
  const f=fixture();f.store.set('spire_selCar',JSON.stringify('car-B'));
  f.api.acceptDeleted(['car-A'],'owner-A');assert.deepEqual(f.marks,['garage']);
  f.marks.length=0;const revision=f.api.revision();
  f.api.acceptDeleted(['car-A'],'owner-A');
  assert.deepEqual(f.marks,[]);assert.equal(f.api.revision(),revision);
  assert.equal(f.selected(),'car-B');
});

test('auth switch during token acquisition cannot issue a deletion for the new account',async()=>{
  const token=deferred(),f=fixture({token});
  const pending=f.api.remove('car-A');await settle();
  f.switchOwner('owner-B');token.resolve('old-owner-token');
  await assert.rejects(pending);
  assert.equal(f.calls.length,0);assert.deepEqual(f.cars(),initialCars);
  assert.equal(f.api.isDeleted('car-A'),false);
});

test('auth switch during the HTTP response cannot change the active garage',async()=>{
  const http=deferred(),f=fixture({response:()=>http.promise});
  const pending=f.api.remove('car-A');await settle();assert.equal(f.calls.length,1);
  f.switchOwner('owner-B');http.resolve({ok:true,status:200,json:async()=>({success:true})});
  await assert.rejects(pending);
  assert.deepEqual(f.cars(),initialCars);assert.equal(f.api.isDeleted('car-A'),false);
  assert.deepEqual(f.marks,[]);
});

test('duplicate delete taps share one request and a failed request can be retried',async()=>{
  const http=deferred(),f=fixture({response:()=>http.promise});
  const first=f.api.remove('car-A'),second=f.api.remove('car-A');
  assert.equal(first,second,'duplicate taps share the same pending promise');
  await settle();assert.equal(f.calls.length,1);
  http.resolve({ok:false,status:500,json:async()=>({success:false})});
  const results=await Promise.allSettled([first,second]);
  assert.ok(results.every(result=>result.status==='rejected'));assert.deepEqual(f.cars(),initialCars);
  f.sandbox.fetch=async(url,options)=>{f.calls.push({url,options});return {ok:true,status:200,json:async()=>({success:true})};};
  await f.api.remove('car-A');assert.equal(f.calls.length,2);assert.deepEqual(f.cars(),[initialCars[1]]);
});

test('a stalled delete is aborted after ten seconds and leaves the car available',async()=>{
  const f=fixture({response:(_url,options)=>new Promise((_resolve,reject)=>{
    options.signal.addEventListener('abort',()=>reject(new Error('test timeout')),{once:true});
  })});
  const pending=f.api.remove('car-A');await settle();assert.equal(f.calls.length,1);
  const deadline=[...f.timers.values()].find(timer=>timer.ms===10000);
  assert.ok(deadline,'deletion has a bounded ten-second deadline');deadline.fn();
  await assert.rejects(pending);assert.equal(f.calls[0].options.signal.aborted,true);
  assert.deepEqual(f.cars(),initialCars);assert.equal(f.api.isDeleted('car-A'),false);
});

test('the ten-second deadline also bounds stalled authentication and ignores a late token',async()=>{
  const token=deferred(),f=fixture({token});
  const pending=f.api.remove('car-A');await settle();assert.equal(f.calls.length,0);
  const deadline=[...f.timers.values()].find(timer=>timer.ms===10000);
  assert.ok(deadline,'token acquisition shares the deletion deadline');deadline.fn();
  await assert.rejects(pending);assert.deepEqual(f.cars(),initialCars);
  token.resolve('late-token');await settle();
  assert.equal(f.calls.length,0,'timed-out authentication cannot send a late deletion');
  assert.equal(f.api.isDeleted('car-A'),false);
});

test('an old garage or chat car fetch cannot resurrect a car deleted while it was loading',async()=>{
  for(const name of ['garage','chat']){
    const http=deferred(),f=syncFixture(name,{response:(_url,options)=>options.method==='DELETE'
      ?{ok:true,status:200,json:async()=>({success:true})}:http.promise});
    const pending=f.sync();await settle();assert.equal(f.calls.length,1,`${name} begins one car pull`);
    await f.api.remove('car-A');assert.deepEqual(f.cars(),[initialCars[1]]);
    http.resolve({ok:true,status:200,json:async()=>initialCars.map(car=>({...car,make:'Fixture',model:car.name}))});
    await pending;
    assert.deepEqual(f.cars().map(car=>car.id),['car-B'],`${name} cannot resurrect the deleted row from an old response`);
    assert.deepEqual(f.cars()[0].history,initialCars[1].history);assert.equal(f.cars()[0].color,'silver');
    assert.equal(f.calls.filter(call=>call.options.method==='POST').length,0,'stale response never posts a deleted car back');
  }
});

test('an old garage or chat car fetch cannot change the garage after an account switch',async()=>{
  for(const name of ['garage','chat']){
    const http=deferred(),f=syncFixture(name,{response:()=>http.promise});
    const pending=f.sync();await settle();assert.equal(f.calls.length,1);
    f.switchOwner('owner-B');f.sandbox.currentUser=f.auth.currentUser;
    http.resolve({ok:true,status:200,json:async()=>[{id:'foreign-car',make:'Other owner',model:'Do not import'}]});
    await pending;
    assert.deepEqual(f.cars(),initialCars,`${name} cannot import another owner's late car response`);
    assert.equal(f.calls.filter(call=>call.options.method==='POST').length,0);
  }
});

test('garage and chat accept server tombstones before merging or uploading local cars',async()=>{
  for(const name of ['garage','chat']){
    const f=syncFixture(name,{response:async(_url,options)=>{
      assert.notEqual(options.method,'POST','a server-deleted local car must not be uploaded again');
      return {ok:true,status:200,json:async()=>({cars:[{id:'car-B',make:'Fixture',model:'Retained'}],deleted:['car-A']})};
    }});
    await f.sync();assert.equal(f.calls[0].url,'https://unit-test.invalid/api/cars?sync=1');
    assert.deepEqual(f.cars().map(car=>car.id),['car-B']);assert.equal(f.api.isDeleted('car-A'),true);
    assert.equal(f.cars()[0].color,'silver');assert.deepEqual(f.cars()[0].history,initialCars[1].history);
  }
});

test('legacy array car responses remain compatible without reviving remembered deletions',async()=>{
  for(const name of ['garage','chat']){
    const f=syncFixture(name,{response:async(_url,options)=>{
      assert.notEqual(options.method,'POST');
      return {ok:true,status:200,json:async()=>initialCars.map(car=>({id:car.id,make:'Fixture',model:car.name}))};
    }});
    f.api.acceptDeleted(['car-A'],'owner-A');await f.sync();
    assert.deepEqual(f.cars().map(car=>car.id),['car-B']);assert.equal(f.api.isDeleted('car-A'),true);
  }
});

test('an upload rejected with HTTP 410 removes a stale local car instead of retrying its resurrection',async()=>{
  for(const name of ['garage','chat']){
    const f=syncFixture(name,{response:async(_url,options)=>{
      if(options.method!=='POST')return {ok:true,status:200,json:async()=>({cars:[],deleted:[]})};
      const car=JSON.parse(options.body);
      return car.id==='car-A'
        ?{ok:false,status:410,json:async()=>({error:'car_deleted'})}
        :{ok:true,status:200,json:async()=>({id:car.id})};
    }});
    await f.sync();assert.equal(f.api.isDeleted('car-A'),true);
    assert.deepEqual(f.cars().map(car=>car.id),['car-B']);
  }
});

test('a stale cloud-state response after deletion filters both garage and selected car',async()=>{
  for(const name of ['garage','chat']){
    const http=deferred(),f=cloudFixture(name,{response:(url,options)=>options.method==='DELETE'
      ?{ok:true,status:200,json:async()=>({success:true})}:http.promise});
    f.store.set('spire_selCar',JSON.stringify('car-A'));
    f.store.set('spire_sess_car-A',JSON.stringify([{id:'archive',messages:[{text:'keep archived history'}]}]));
    const archived=f.store.get('spire_sess_car-A');
    const pending=f.pull();await settle();assert.equal(f.calls[0].url,'https://unit-test.invalid/api/state');
    await f.api.remove('car-A');
    const time=Date.now()+100000;
    http.resolve({ok:true,status:200,json:async()=>({state:{
      garage:{v:clone(initialCars),t:time},selCar:{v:'car-A',t:time},theme:{v:'dark',t:time},
    }})});
    const touched=await pending;
    assert.deepEqual(f.cars(),[initialCars[1]],`${name} cannot re-import a deleted car from cloud state`);
    assert.ok(!f.selected(),`${name} cannot select a cloud-restored deleted car`);
    assert.equal(f.store.get('spire_sess_car-A'),archived,'archived sessions survive the cloud merge');
    assert.equal(JSON.parse(f.store.get('spire_theme')),'dark','unrelated valid cloud settings still sync');
    assert.ok(clone(touched).includes('garage'));assert.equal(f.applied.length,1);
  }
});

test('cloud-state pull preserves a valid selected car while filtering a deleted row',async()=>{
  for(const name of ['garage','chat']){
    const time=Date.now()+100000,f=cloudFixture(name,{response:async()=>({ok:true,status:200,json:async()=>({state:{
      garage:{v:clone(initialCars),t:time},selCar:{v:'car-B',t:time},
    }})})});
    f.api.acceptDeleted(['car-A'],'owner-A');await f.pull();
    assert.deepEqual(f.cars(),[initialCars[1]]);assert.equal(f.selected(),'car-B');
  }
});

test('cloud-state responses from a previous account do not change the active account storage',async()=>{
  for(const name of ['garage','chat']){
    const http=deferred(),f=cloudFixture(name,{response:()=>http.promise});
    f.store.set('spire_selCar',JSON.stringify('car-B'));f.store.set('spire_theme',JSON.stringify('light'));
    const before=[...f.store.entries()];
    const pending=f.pull();await settle();assert.equal(f.calls.length,1);f.switchOwner('owner-B');
    const time=Date.now()+100000;
    http.resolve({ok:true,status:200,json:async()=>({state:{
      garage:{v:[{id:'foreign-car',name:'other owner'}],t:time},selCar:{v:'foreign-car',t:time},theme:{v:'dark',t:time},
    }})});
    assert.deepEqual(clone(await pending),[]);assert.deepEqual([...f.store.entries()],before);
    assert.equal(f.applied.length,0,`${name} does not render foreign-account cloud state`);
  }
});

test('all garage reader pages load the deletion guard and deletion buttons use its remote-aware method',()=>{
  for(const name of ['index','garage','news','spares','profile','chat']){
    const page=readFileSync(new URL(`../${name}.html`,import.meta.url),'utf8');
    assert.ok(/<script\s+src="car-sync\.js"><\/script>/.test(page),`${name} loads the shared deletion guard`);
    assert.ok(/CendonCars\??\.filter\(/.test(page),`${name} filters remembered deletions`);
  }
  const garage=readFileSync(new URL('../garage.html',import.meta.url),'utf8');
  assert.ok(/await\s+(?:window\.)?CendonCars\.remove\(id\)/.test(garage),'garage list deletion uses the shared guard');
  for(const name of ['garage','news','spares','profile']){
    const page=readFileSync(new URL(`../${name}.html`,import.meta.url),'utf8');
    assert.ok(/await\s+(?:window\.)?CendonCars\.remove\(id\)/.test(page),`${name} list deletion uses the shared guard`);
    if(page.includes('Remove this car from your garage?')){
      assert.ok(/await\s+(?:window\.)?CendonCars\.remove\(c\.id\)/.test(page),`${name} car detail deletion uses the shared guard`);
    }
    assert.ok(!/if\(k==="del"\)[\s\S]{0,300}garage\(\)\.filter/.test(page),`${name} car detail deletion is no longer local-only`);
  }
});
