import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
const source=readFileSync(new URL('../bell.js',import.meta.url),'utf8');
function fixture(saved=new Map()){
  let now=Date.now(),writes=0;const document={readyState:'loading',hidden:false,addEventListener(){},querySelector:()=>({})};
  const window={spireAuth:{currentUser:{uid:'one'}},CendonChatJobs:{},addEventListener(){}};
  const context={window,document,navigator:{},localStorage:{getItem:k=>saved.get(k)??null,setItem:(k,v)=>{writes++;saved.set(k,v)},removeItem:k=>saved.delete(k)},Date:class extends Date{static now(){return now}},Set,setTimeout,clearTimeout};
  vm.runInNewContext(source,context);
  return {bell:window.CendonBell,window,saved,get writes(){return writes},advance:ms=>{now+=ms}};
}
const notice=id=>({id,title:'A mechanic has replied',body:'Private fixture body',kind:'quote',url:'/jobs'});
test('read-all clears the unread count without deleting notices and is idempotent',()=>{
  const f=fixture(),b=f.bell;b.add(notice('a'));b.add(notice('b'));assert.equal(b.unread(),2);
  b.read('a');assert.equal(b.unread(),1);assert.equal(b.list().length,2);
  b.read();assert.equal(b.unread(),0);assert.ok(b.list().every(x=>x.read));
  const writes=f.writes;b.read();assert.equal(f.writes,writes,'no save/subscriber loop on a second read');
  const reload=fixture(f.saved);assert.equal(reload.bell.unread(),0);assert.equal(reload.bell.list().length,2);
});
test('clear persists, suppresses replay of dismissed IDs, and still accepts new notices',()=>{
  const f=fixture();f.bell.add(notice('ai-job:one'));f.bell.add(notice('quote:two'));f.bell.clear();
  assert.equal(f.bell.list().length,0);assert.equal(f.bell.unread(),0);
  const state=JSON.parse(f.saved.get('spire_inbox'));assert.equal(state.uid,'one');assert.equal(state.cleared.length,2);
  assert.ok(state.cleared.every(x=>Object.keys(x).sort().join(',')==='at,id'),'receipts contain only IDs and timestamps');
  assert.ok(!JSON.stringify(state).includes('Private fixture'));
  const r=fixture(f.saved);assert.equal(r.bell.add(notice('ai-job:one')),null);assert.equal(r.bell.list().length,0);
  r.bell.add(notice('quote:three'));assert.equal(r.bell.unread(),1);assert.equal(r.bell.list()[0].id,'quote:three');
});
test('clear/read do not alter jobs, chats, Garage, push opt-in or mileage reminders',()=>{
  const values={spire_jobs:'job fixture',spire_msgs:'chat fixture',spire_garage:'car fixture',spire_notifOn:'true',spire_pushSub:'true',spire_pushOwner:'one',spire_km_remind:'reminder fixture'};
  const f=fixture(new Map(Object.entries(values)));f.bell.add(notice('a'));f.bell.read();f.bell.clear();
  for(const [key,value] of Object.entries(values))assert.equal(f.saved.get(key),value,key);
});
test('legacy inbox data is preserved when read or cleared',()=>{
  const saved=new Map([['spire_inbox',JSON.stringify({uid:'one',items:[{...notice('legacy'),read:false,at:Date.now()}]})]]),f=fixture(saved);
  assert.equal(f.bell.unread(),1);f.bell.read();assert.equal(f.bell.list().length,1);f.bell.clear();
  assert.equal(f.bell.add(notice('legacy')),null);
});
test('another account cannot list, read or clear the stored owner inbox',()=>{
  const f=fixture();f.bell.add(notice('private-one'));const before=f.saved.get('spire_inbox');
  f.window.spireAuth.currentUser={uid:'two'};assert.equal(f.bell.list().length,0);assert.equal(f.bell.unread(),0);
  f.bell.read();f.bell.clear();assert.equal(f.saved.get('spire_inbox'),before);
  f.bell.add(notice('private-two'));assert.equal(f.bell.list()[0].id,'private-two');
  f.window.spireAuth.currentUser={uid:'one'};assert.equal(f.bell.list().length,0,'new active account does not expose old-user notices');
});
test('dismissal receipts are bounded and expire after 30 days',()=>{
  const f=fixture();for(let i=0;i<280;i++){f.bell.add(notice('n-'+i));if(i%40===39)f.bell.clear()}
  assert.equal(JSON.parse(f.saved.get('spire_inbox')).cleared.length,250);assert.equal(f.bell.add(notice('n-279')),null);
  f.advance(31*86400000);assert.ok(f.bell.add(notice('n-279')));assert.equal(f.bell.unread(),1);
});
test('malformed local state cannot break the inbox',()=>{
  for(const data of ['not JSON',JSON.stringify({uid:'one',items:[null,2],cleared:[null,{id:4,at:1}]})]){
    const f=fixture(new Map([['spire_inbox',data]]));assert.equal(f.bell.list().length,0);f.bell.add(notice('safe'));assert.equal(f.bell.unread(),1);
  }
});
