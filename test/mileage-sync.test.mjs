import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const source=readFileSync(new URL('../mileage-sync.js',import.meta.url),'utf8');
const hash=s=>{let h=5381;for(let i=0;i<s.length;i++)h=((h*33)^s.charCodeAt(i))>>>0;return s.length+':'+h.toString(36)};
const row=(km=50420,id='one')=>({carId:id,km,source:'manual',observedAt:Date.now(),updatedAt:Date.now()});
async function fixture(options={}){
  const store=new Map(),intervals=[],events=[],calls=[];
  const w=new EventTarget(),d=new EventTarget();d.hidden=false;d.activeElement=null;d.querySelectorAll=()=>[];
  const localStorage={getItem:k=>store.get(k)??null,setItem:(k,v)=>store.set(k,String(v)),removeItem:k=>store.delete(k)};
  const put=(k,v)=>localStorage.setItem(k,JSON.stringify(v)),get=k=>JSON.parse(localStorage.getItem(k));
  const cars=[{id:'one',mileage:'50000',color:'blue',custom:{keep:'draft'}},{id:'two',mileage:30000}];
  put('spire_garage',cars);put('spire___owner','me');
  const signature=hash(JSON.stringify(cars));put('spire___meta',{garage:100});put('spire___seen',{garage:signature});put('spire___synced',{garage:{t:100,h:signature}});
  w.auth={currentUser:{uid:'me',getIdToken:async()=> 'test-only-token'}};
  w.CendonScope={mine:uid=>get('spire___owner')===uid};w.CendonCars={isDeleted:id=>id==='deleted'};
  w.renderGarage=()=>events.push('paint');w.BACKEND_URL='https://fixture.test';
  const state={rows:[row()],failure:false,delay:null};
  const context=vm.createContext({window:w,document:d,localStorage,navigator:{onLine:true},Event,CustomEvent,AbortController,
    setInterval:fn=>intervals.push(fn),setTimeout,clearTimeout,fetch:async(url,init)=>{
      calls.push({url,init});if(state.delay)return state.delay;
      return {ok:!state.failure,json:async()=>({cars:structuredClone(state.rows)})};
    }});
  vm.runInContext(source,context);await w.CendonMileageSync.refresh();
  return {w,d,state,calls,events,intervals,store,put,get,cars};
}

test('confirmed LINE mileage replaces only mileage and acknowledges only clean cache hashes',async()=>{
  const f=await fixture();assert.equal(f.get('spire_garage')[0].mileage,'50420');
  assert.equal(f.get('spire_garage')[1].mileage,30000);
  assert.deepEqual(f.get('spire_garage')[0].custom,{keep:'draft'});assert.equal(f.get('spire_garage')[0].color,'blue');
  assert.equal(f.get('spire___seen').garage,hash(JSON.stringify(f.get('spire_garage'))));
  assert.equal(f.get('spire___synced').garage.t,100);assert.equal(f.get('spire___meta').garage,100,'no false fresh timestamp');
  assert.equal(f.w.CendonMileageSync.forCar('one').km,50420);
  assert.ok(f.calls.every(x=>x.url.endsWith('/api/odo/readings')&&x.init.cache==='no-store'&&!x.init.method),'imports never POST duplicate anchors');
});

test('focus refreshes; failures keep data; hidden pages do not poll; deleted/missing cars are never added',async()=>{
  const f=await fixture();f.state.rows=[row(50500),row(999,'deleted'),row(777,'missing')];
  f.w.dispatchEvent(new Event('focus'));await f.w.CendonMileageSync.refresh();
  assert.equal(f.get('spire_garage')[0].mileage,'50500');assert.equal(f.get('spire_garage').length,2);
  f.state.failure=true;await f.w.CendonMileageSync.refresh();assert.equal(f.get('spire_garage')[0].mileage,'50500');
  const count=f.calls.length;f.d.hidden=true;f.intervals[0]();await Promise.resolve();assert.equal(f.calls.length,count);
});

test('local pending readings and genuinely unsynced fields are preserved',async()=>{
  const f=await fixture(),cars=f.get('spire_garage');cars[0].mileage='50600';cars[0].color='red';
  f.put('spire_garage',cars);f.put('spire_odo_queue',[{uid:'me',carId:'one',km:50600,observedAt:Date.now()+5000}]);
  f.state.rows=[row(50500)];await f.w.CendonMileageSync.refresh();
  assert.equal(f.get('spire_garage')[0].mileage,'50600');assert.equal(f.w.CendonMileageSync.forCar('one'),null);
  f.put('spire_odo_queue',[]);await f.w.CendonMileageSync.refresh(true);
  assert.equal(f.get('spire_garage')[0].mileage,'50500');assert.equal(f.get('spire_garage')[0].color,'red');
  assert.notEqual(f.get('spire___seen').garage,hash(JSON.stringify(f.get('spire_garage'))),'do not falsely mark the color draft as synced');
});

test('late responses and own cached readings cannot cross an account boundary',async()=>{
  const f=await fixture();let finish;
  f.state.delay=new Promise(r=>finish=r);const job=f.w.CendonMileageSync.refresh();await Promise.resolve();
  f.w.auth.currentUser={uid:'other',getIdToken:async()=> 'other-token'};f.put('spire___owner','other');
  f.put('spire_garage',[{id:'one',mileage:'10'}]);
  assert.equal(f.w.CendonMileageSync.forCar('one'),null);
  finish({ok:true,json:async()=>({cars:[row(99999)]})});await job;
  assert.equal(f.get('spire_garage')[0].mileage,'10');assert.equal(f.w.CendonMileageSync.forCar('one'),null);
});

test('a new accepted local reading invalidates an older in-flight refresh',async()=>{
  const f=await fixture();let finish;
  f.state.delay=new Promise(r=>finish=r);const old=f.w.CendonMileageSync.refresh();await Promise.resolve();
  f.state.delay=null;f.state.rows=[row(50600)];
  f.w.dispatchEvent(new Event('cendon:mileage-saved'));await f.w.CendonMileageSync.refresh();
  finish({ok:true,json:async()=>({cars:[row(50420)]})});await old;
  assert.equal(f.get('spire_garage')[0].mileage,'50600');
});

test('editing defers redraw without discarding new confirmed data',async()=>{
  const f=await fixture(),before=f.events.length;f.d.activeElement={matches:()=>true};
  f.state.rows=[row(50700)];await f.w.CendonMileageSync.refresh();
  assert.equal(f.events.length,before);assert.equal(f.get('spire_garage')[0].mileage,'50700');
  f.d.activeElement=null;f.d.dispatchEvent(new Event('focusout'));await new Promise(r=>setTimeout(r,5));
  assert.ok(f.events.length>before);
});

test('every main app page and offline core load the shared mileage bridge',()=>{
  for(const file of ['index.html','garage.html','chat.html','news.html','profile.html','spares.html']){
    const html=readFileSync(new URL('../'+file,import.meta.url),'utf8');assert.match(html,/<script src="mileage-sync.js\?v=1" defer><\/script>/,file);
  }
  const garage=readFileSync(new URL('../garage.html',import.meta.url),'utf8');
  assert.match(garage,/function lastAnchor\(c\)\{\s*const verified=window.CendonMileageSync\?\.forCar\(c.id\)/);
  assert.match(readFileSync(new URL('../sw.js',import.meta.url),'utf8'),/\.\/mileage-sync.js\?v=1/);
});
