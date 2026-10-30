import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
const home=readFileSync(new URL('../index.html',import.meta.url),'utf8');
const part=(a,b)=>home.slice(home.indexOf(a),home.indexOf(b,home.indexOf(a)));
const live=part('const LiveShare={','addEventListener("visibilitychange",()=>{if(!document.hidden&&LiveShare'),roam=part('const RoamShare={','/* หัว Studio อาจวาด');
function fixture({control=false}={}){
 let now=100000,confirm=true,shop={mobile:true,roam:true,online:true},uid={uid:'fixture'},stats=null,reject=0;
 const nodes=new Map(),watches=new Map(),cleared=[],calls=[],saved=new Map(),fields={'[data-live-label]':{textContent:''},'[data-live-action]':{textContent:''}};
 const b={dataset:{job:'job-fixture'},hidden:true,querySelector:s=>fields[s]};if(control)nodes.set('jobLiveShare',b);
 const ctx={Date:{now:()=>now},$:id=>nodes.get(id),JOBS:[],navigator:{geolocation:{watchPosition(ok,error,options){const id=watches.size;watches.set(id,{ok,error,options});return id;},clearWatch:id=>cleared.push(id)},wakeLock:{request:async()=>({release(){}})}},ls:{get:(k,d)=>saved.has(k)?saved.get(k):d,set:(k,v)=>saved.set(k,v)},T:(th,en)=>en,esc:String,confirm:()=>confirm,api:async(path,o)=>{calls.push({path,...o});if(reject)throw {status:reject};return{};},myShop:()=>shop,km:(a,b)=>Math.abs(a.lat-b.lat)*111};
 Object.defineProperty(ctx,'U',{get:()=>uid});Object.defineProperty(ctx,'DSTATS',{get:()=>stats});
 vm.runInNewContext(live+roam+';globalThis.live=LiveShare;globalThis.roam=RoamShare;',ctx);
 return {live:ctx.live,roam:ctx.roam,b,fields,nodes,watches,cleared,calls,saved,ctx,advance:ms=>now+=ms,confirm:v=>confirm=v,shop:v=>shop={...shop,...v},uid:v=>uid=v,stats:v=>stats=v,reject:v=>reject=v,position:(lat=0)=>({coords:{latitude:lat,longitude:0,accuracy:12,heading:0,speed:0}})};
}
test('job sharing works without any visible page control and removes an old floating badge',async()=>{
 const f=fixture();let removed=0;f.nodes.set('liveBar',{remove(){removed++;f.nodes.delete('liveBar')}});f.live.start('job-fixture');assert.equal(removed,1);assert.equal(f.live.watch,0);
 await f.watches.get(0).ok(f.position());assert.equal(f.calls[0].path,'/api/tech/jobs/job-fixture/live');assert.equal(f.nodes.has('liveBar'),false);assert.equal(f.cleared.length,0);
 f.advance(1000);await f.live.push(f.position());assert.equal(f.calls.length,1);f.advance(3000);await f.live.push(f.position());assert.equal(f.calls.length,2,'the existing four-second sender is unchanged');
});
test('only the current job has an inline status/stop control; errors are text, not HTML',()=>{
 const f=fixture({control:true});f.live.start('job-fixture');assert.equal(f.b.hidden,false);assert.match(f.fields['[data-live-label]'].textContent,/customer can see/i);assert.equal(typeof f.b.onclick,'function');
 f.live.err='<img onerror=unsafe>';f.live.paint();assert.equal(f.fields['[data-live-label]'].textContent,'<img onerror=unsafe>');f.b.dataset.job='another-job';f.live.paint();assert.equal(f.b.hidden,true);
});
test('explicit inline stop keeps the existing confirmation and saved opt-out, without cancelling the job',()=>{
 const f=fixture({control:true});f.live.start('job-fixture');f.confirm(false);f.b.onclick();assert.equal(f.live.watch,0);f.confirm(true);f.b.onclick();assert.equal(f.live.watch,null);assert.equal(f.live.id,null);assert.deepEqual(f.cleared,[0]);assert.equal(f.saved.get('spire_live_off'),'job-fixture');assert.equal(f.b.hidden,true);assert.deepEqual(f.calls,[]);
 f.ctx.JOBS=[{id:'job-fixture',side:'technician',status:'enroute'}];f.live.sync();assert.equal(f.live.watch,null,'sync respects the existing manual opt-out');
});
test('an old inline button cannot stop a different job that started later',()=>{
 const f=fixture({control:true});f.live.start('job-fixture');const click=f.b.onclick;f.live.start('new-job');const n=f.cleared.length;click();assert.equal(f.live.id,'new-job');assert.equal(f.cleared.length,n);
});
test('server denial still stops a job sender and never creates an overlay',async()=>{
 const f=fixture();f.live.start('job-fixture');f.reject(403);await f.live.push(f.position());assert.equal(f.live.watch,null);assert.deepEqual(f.cleared,[0]);assert.equal(f.nodes.has('liveBar'),false);
});
test('mobile mechanic still sends location at the existing one-minute / 200 m thresholds',async()=>{
 const f=fixture();f.roam.sync();assert.equal(f.roam.watch,0);await f.watches.get(0).ok(f.position());assert.equal(f.calls[0].path,'/api/tech/here');
 f.advance(1000);await f.roam.push(f.position(.003));assert.equal(f.calls.length,1);f.advance(19000);await f.roam.push(f.position(.003));assert.equal(f.calls.length,2);f.advance(59000);await f.roam.push(f.position(.003));assert.equal(f.calls.length,2);f.advance(1000);await f.roam.push(f.position(.003));assert.equal(f.calls.length,3);assert.equal(f.nodes.has('liveBar'),false);
});
test('mobile mechanic permission, accepting-jobs, vacation and suspension gates remain intact',()=>{
 for(const change of [{mobile:false},{roam:false},{online:false},{vacation:true},{suspended:true}]){const f=fixture();f.roam.sync();f.shop(change);f.roam.sync();assert.equal(f.roam.watch,null);assert.deepEqual(f.cleared,[0]);}
 const f=fixture();f.uid(null);f.roam.sync();assert.equal(f.roam.watch,null);assert.equal(f.watches.size,0);
});
test('mobile mechanic denied by the server still stops, and Studio keeps its settings control',async()=>{
 const f=fixture();f.roam.sync();f.reject(409);await f.roam.push(f.position());assert.equal(f.roam.watch,null);assert.deepEqual(f.cleared,[0]);assert.match(home,/\$\("stuRoam"\)\?\.addEventListener\("click",\(\)=>studioSettings\(\)\)/);
});
test('no floating location element/CSS/timer remains; the inline control mounts only for the job technician',()=>{
 assert.doesNotMatch(live,/createElement|appendChild|className="live-bar"/);assert.doesNotMatch(home,/\.live-bar\s*\{|setInterval\(\(\)=>\{if\(LiveShare\.watch!=null\)LiveShare\.paint/);
 assert.match(home,/liveCard&&tech&&!cust\?`<button[^`]+id="jobLiveShare"/);assert.match(home,/#jobLiveShare\[hidden\]\{display:none!important\}/);assert.match(home,/if\(tech&&!cust\)LiveShare\.paint\(\);/);
});
