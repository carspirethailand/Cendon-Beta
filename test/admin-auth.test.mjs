import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

const source=readFileSync(new URL('../cendon-admin.js',import.meta.url),'utf8');
const flush=async()=>{for(let i=0;i<40;i++)await Promise.resolve();};
const deferred=()=>{let resolve,reject;const promise=new Promise((a,b)=>{resolve=a;reject=b;});return {promise,resolve,reject};};
const regular={uid:'fixture-user',role:'user'};
const owner={uid:'fixture-owner',role:'owner'};
const live={keys:{gemini:true},stats:{hour:0,fail:0},parked:[]};

function fixture({cached=regular,cache,authUser=null,awaitUser,fetcher,blockedStorage=false,noAbort=false}={}){
  let now=1000000,id=0,authReads=0,storageReads=0;
  const storage=new Map(),timers=new Map(),nodes=new Map(),requests=[];
  if(cached)storage.set('spire_cachedUser',JSON.stringify(cached));
  if(cache)storage.set('spire_isAdminChk',JSON.stringify({at:now,...cache}));
  const auth={currentUser:authUser},win={};
  Object.defineProperty(win,'spireAuth',{get(){authReads++;return auth;}});
  if(awaitUser)win.spireAwaitUser=awaitUser;
  class Clock extends Date{static now(){return now;}}
  function node(){return {style:{},querySelector:()=>null,addEventListener(){},remove(){nodes.delete(this.id);}};}
  const append=n=>nodes.set(n.id,n);
  const sandbox={window:win,document:{readyState:'complete',head:{appendChild:append},body:{appendChild:append},
    getElementById:key=>nodes.get(key)||null,querySelector:()=>null,createElement:node},
    localStorage:{getItem(key){
      // Safety fuse lets a reintroduced hot loop fail an assertion, not hang the test runner.
      if(++storageReads>4000&&key==='spire_cachedUser')return null;
      return storage.get(key)||null;
    },setItem(key,value){if(blockedStorage)throw Error('Storage blocked');storage.set(key,value);}},
    Promise,Date:Clock,AbortController:noAbort?undefined:AbortController,
    setTimeout(fn,ms){const key=++id;timers.set(key,{fn,at:now+ms});return key;},
    setInterval(fn,ms){const key=++id;timers.set(key,{fn,at:now+ms,interval:ms});return key;},
    clearTimeout:key=>timers.delete(key),clearInterval:key=>timers.delete(key),
    fetch:async(url,options)=>{requests.push({url,options});return fetcher?fetcher(url,options):response(403);}};
  vm.runInNewContext(source,sandbox,{timeout:2000});
  return {auth,storage,timers,nodes,requests,get authReads(){return authReads;},get storageReads(){return storageReads;},
    cachedResult:()=>JSON.parse(storage.get('spire_isAdminChk')||'null'),
    switchUser(user){storage.set('spire_cachedUser',JSON.stringify(user));auth.currentUser=user?userWithToken(user.uid):null;},
    async advance(ms){
      await flush();const target=now+ms;let count=0;
      while(true){
        const next=[...timers].filter(([,t])=>t.at<=target).sort((a,b)=>a[1].at-b[1].at)[0];
        if(!next)break;
        assert.ok(++count<1000,'bounded timer work');
        const [key,t]=next;now=t.at;if(t.interval)t.at+=t.interval;else timers.delete(key);
        t.fn();await flush();
      }
      now=target;await flush();
    }};
}
function userWithToken(uid='fixture-user',getIdToken=()=>Promise.resolve('fixture-only-token')){return {uid,getIdToken};}
function response(status,data=status===200?live:{error:'fixture denial'}){return {ok:status===200,status,json:async()=>data};}

test('signed-out page does not request admin data',async()=>{
  const f=fixture({cached:null});await f.advance(10000);
  assert.equal(f.requests.length,0);assert.equal(f.nodes.has('cxa-fab'),false);
});

for(const mode of ['without auth helper','helper resolves null'])test(`pending ordinary login yields instead of looping: ${mode}`,async()=>{
  const f=fixture({awaitUser:mode==='helper resolves null'?()=>Promise.resolve(null):undefined});
  await flush();assert.ok(f.authReads<10);assert.ok(f.storageReads<30);
  assert.equal(f.requests.length,0);assert.equal(f.cachedResult(),null);
  await f.advance(10000);assert.ok(f.authReads<40);assert.equal(f.requests.length,0);
});

test('restored ordinary login is checked once and a real 403 is cached',async()=>{
  const f=fixture();await flush();f.auth.currentUser=userWithToken();await f.advance(2000);
  assert.equal(f.requests.length,1);assert.equal(f.cachedResult().ok,false);
  await f.advance(30000);assert.equal(f.requests.length,1);assert.equal(f.nodes.has('cxa-fab'),false);
});

test('server-confirmed owner still gets the existing panel',async()=>{
  const f=fixture({cached:owner,authUser:userWithToken(owner.uid),fetcher:async()=>response(200)});
  await flush();assert.equal(f.cachedResult().uid,owner.uid);assert.equal(f.cachedResult().ok,true);
  await f.advance(2000);assert.equal(f.nodes.has('cxa-fab'),true);
});

test('existing positive and negative role caches remain account-specific',async()=>{
  const f=fixture({cache:{uid:owner.uid,ok:true},authUser:userWithToken()});
  await flush();assert.equal(f.requests.length,1);assert.equal(f.cachedResult().uid,regular.uid);
  assert.equal(f.cachedResult().ok,false);assert.equal(f.nodes.has('cxa-fab'),false);
  const cachedOwner=fixture({cached:owner,cache:{uid:owner.uid,ok:true},authUser:userWithToken(owner.uid),fetcher:async()=>response(200)});
  await flush();assert.equal(cachedOwner.nodes.has('cxa-fab'),true);
});

for(const status of [401,429,500])test(`HTTP ${status} is transient, not a cached permission denial`,async()=>{
  let unavailable=true;
  const f=fixture({authUser:userWithToken(),fetcher:async()=>response(unavailable?status:403)});
  await flush();assert.equal(f.cachedResult(),null);
  await f.advance(8000);assert.equal(f.requests.length,1);
  unavailable=false;await f.advance(2000);assert.equal(f.requests.length,2);assert.equal(f.cachedResult().ok,false);
});

test('offline checks wait before retry and do not cache denial',async()=>{
  const f=fixture({authUser:userWithToken(),fetcher:async()=>{throw Error('Offline');}});
  await flush();assert.equal(f.cachedResult(),null);
  await f.advance(8000);assert.equal(f.requests.length,1);
  await f.advance(2000);assert.equal(f.requests.length,2);
});

test('late admin response cannot be attached to another signed-in account',async()=>{
  const pending=deferred();
  const f=fixture({authUser:userWithToken(),fetcher:async()=>f.requests.length===1?pending.promise:response(403)});
  await flush();f.switchUser({uid:'fixture-other',role:'user'});pending.resolve(response(200));await flush();
  assert.equal(f.cachedResult(),null);
  await f.advance(2000);assert.equal(f.cachedResult().uid,'fixture-other');assert.equal(f.cachedResult().ok,false);
});

test('cached identity cannot request a role using a different user token',async()=>{
  const f=fixture({authUser:userWithToken('fixture-other')});await flush();
  assert.equal(f.requests.length,0);assert.equal(f.cachedResult(),null);
});

test('hanging token times out and its late resolution never sends a request',async()=>{
  const pending=deferred();const f=fixture({authUser:userWithToken(regular.uid,()=>pending.promise)});
  await f.advance(15000);assert.equal(f.cachedResult(),null);
  pending.resolve('fixture-only-token');await flush();assert.equal(f.requests.length,0);
  f.auth.currentUser=userWithToken();await f.advance(11000);assert.equal(f.requests.length,1);
});

test('hanging auth helper is bounded too',async()=>{
  const pending=deferred();const f=fixture({awaitUser:()=>pending.promise});
  await f.advance(15000);assert.ok(f.authReads<40);assert.equal(f.requests.length,0);
  f.auth.currentUser=userWithToken();await f.advance(11000);assert.equal(f.requests.length,1);
});

for(const phase of ['fetch','JSON'])test(`hanging ${phase} is aborted without blocking subsequent checks`,async()=>{
  const pending=deferred();let hanging=true;
  const f=fixture({authUser:userWithToken(),fetcher:async()=>{
    if(!hanging)return response(403);
    return phase==='fetch'?pending.promise:{ok:true,status:200,json:()=>pending.promise};
  }});
  await f.advance(15000);assert.equal(f.requests[0].options.signal.aborted,true);assert.equal(f.cachedResult(),null);
  hanging=false;await f.advance(11000);assert.equal(f.requests.length,2);assert.equal(f.cachedResult().ok,false);
  pending.resolve(phase==='fetch'?response(200):live);await flush();assert.equal(f.cachedResult().ok,false);
});

test('blocked storage never restarts checks in a promise loop',async()=>{
  const f=fixture({authUser:userWithToken(),blockedStorage:true});await flush();
  assert.equal(f.requests.length,1);assert.ok(f.storageReads<30);
  await f.advance(8000);assert.equal(f.requests.length,1);
  await f.advance(2000);assert.equal(f.requests.length,2);
});

test('request deadline works even without AbortController',async()=>{
  const pending=deferred();const f=fixture({authUser:userWithToken(),noAbort:true,fetcher:()=>pending.promise});
  await f.advance(26000);assert.equal(f.requests.length,2);assert.equal(f.cachedResult(),null);
});
