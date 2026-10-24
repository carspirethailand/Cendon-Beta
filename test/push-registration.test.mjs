import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
const source=readFileSync(new URL('../bell.js',import.meta.url),'utf8');
const settle=()=>new Promise(r=>setTimeout(r,20));
function fixture(){const saved=new Map(),events=new Map(),sent=[];let unsubscribe=0;
  const sub={toJSON:()=>({endpoint:'https://fcm.googleapis.com/fixture',keys:{}}),unsubscribe:async()=>{unsubscribe++}},reg={pushManager:{getSubscription:async()=>sub}};
  const document={readyState:'loading',hidden:false,addEventListener:(k,v)=>events.set('d:'+k,v),querySelector:()=>({}),createElement:()=>({})};
  const window={Notification:{permission:'granted'},spireAuth:{currentUser:{uid:'one',getIdToken:async()=> 'fixture'}},addEventListener:(k,v)=>events.set(k,v)};
  const scope={window,document,localStorage:{getItem:k=>saved.get(k)||null,setItem:(k,v)=>saved.set(k,v),removeItem:k=>saved.delete(k)},navigator:{serviceWorker:{ready:Promise.resolve(reg)}},Notification:window.Notification,Uint8Array,atob,URL,Set,setTimeout,clearTimeout,MutationObserver:class{observe(){}}};
  vm.createContext(scope);vm.runInContext(source,scope);window.CendonBell.setApi({get:async()=>({enabled:true,key:'AA'}),post:async(p,b)=>{sent.push({path:p,body:b});return {ok:true}}});return {window,saved,events,sent,get unsubscribe(){return unsubscribe}};
}
test('push registration needs explicit account opt-in, resumes only that owner, and revokes browser delivery on account changes',async()=>{
  const f=fixture(),b=f.window.CendonBell;assert.equal(b.pushOn(),false);
  assert.equal(await b.enable(),'granted');await settle();assert.equal(b.pushOn(),true);assert.equal(f.sent.length,1);assert.equal(f.saved.get('spire_pushOwner'),'one');
  f.window.spireAuth.currentUser={uid:'two',getIdToken:async()=> 'fixture-two'};assert.equal(b.pushOn(),false);await f.events.get('cendon:auth-ready')();assert.equal(f.unsubscribe,1);assert.equal(f.sent.length,1,'no permission inherited or registration under a new account');
  await b.enable();await settle();assert.equal(f.saved.get('spire_pushOwner'),'two');assert.equal(f.sent.length,2);
  await b.disable();assert.equal(b.pushOn(),false);assert.equal(f.saved.has('spire_pushOwner'),false);
});
