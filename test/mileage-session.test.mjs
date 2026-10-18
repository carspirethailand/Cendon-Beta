import test from 'node:test';import assert from 'node:assert/strict';import vm from 'node:vm';import {readFileSync} from 'node:fs';
const read=f=>readFileSync(new URL('../'+f,import.meta.url),'utf8').replace(/\r\n/g,'\n');
function rig(){const values=new Map(),window={};vm.runInNewContext(read('mileage-session.js'),{window,Date,localStorage:{getItem:k=>values.get(k)||null,setItem:(k,v)=>values.set(k,v),removeItem:k=>values.delete(k)}});return {M:window.CendonMileage,values}}
const p=(meters,t=1000,acc=5)=>({lat:13.7+meters/111200,lng:100.5,acc,t});
test('GPS counts plausible foreground movement but never bridges missing samples or impossible jumps',()=>{
  const {M}=rig(),s=M.create('me','car-1');s.push(p(0),1000);s.push(p(50,6000),6000);assert.ok(s.summary().metres>=49&&s.summary().metres<=51);
  s.push(p(2000,50000),50000);assert.equal(s.summary().metres,50);assert.equal(s.summary().incomplete,true);
  assert.equal(s.push(p(10000,51000),51000).reason,'jump');assert.equal(s.summary().metres,50);
  for(const q of [{...p(10),lat:100},{...p(10),acc:100},{...p(10),t:999999}])assert.equal(s.push(q,52000).accepted,false);
});
test('stationary jitter does not accumulate; slow movement is counted against an anchored baseline',()=>{
  const {M}=rig(),s=M.create('me','car-1');for(let i=0;i<20;i++)s.push(p(i%2?3:0,1000+i*1000),1000+i*1000);assert.equal(s.summary().metres,0);
  for(let i=0;i<12;i++)s.push(p(i*2,30000+i*1000),30000+i*1000);assert.ok(s.summary().metres>=16);
});
test('pause/resume, account/car binding and saved drafts retain only aggregates, never GPS coordinates',()=>{
  const {M,values}=rig(),s=M.create('me','car-1');s.push(p(0),1000);s.push(p(50,6000),6000);s.pause();assert.equal(s.push(p(1000,10000),10000).reason,'paused');s.resume();s.push(p(2000,20000),20000);assert.equal(s.summary().metres,50);
  M.save(s);const raw=[...values.values()][0];assert.doesNotMatch(raw,/lat|lng|coords|longitude|latitude/);
  assert.equal(M.load('other','car-1'),null);assert.equal(M.load('me','car-2'),null);assert.equal(M.load('me','car-1').metres,50);const second=M.create('me','car-2');M.save(second);M.clear('me','car-1');assert.equal(values.size,1);assert.equal(M.load('me','car-2').carId,'car-2');
});
test('both pages pause on hide, require resume, bind queued readings to UID and never auto-save a traffic stop',()=>{
  for(const f of ['garage.html','chat.html']){const s=read(f);assert.match(s,/document\.hidden&&dv\.on/);assert.match(s,/id="dvResume"/);assert.doesNotMatch(s,/if\(st\.stopped\)finishDrive\(true\)/);assert.match(s,/q\.filter\(x=>x\.uid===owner&&!x\.needsReview\)/);assert.match(s,/needsReview:true/);assert.match(s,/else if\(canPark\)/);}
});
