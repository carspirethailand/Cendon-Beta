import {test} from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';
const read=name=>readFile(new URL('../'+name,import.meta.url),'utf8');
const surface=await read('call-surface.js'),composer=await read('call-composer.js'),agent=await read('call-agent.js'),home=await read('index.html'),chat=await read('chat.html'),css=await read('call-ui.css');
function element(value=''){
  const events=new Map(),icon={},label={};return{value,dataset:{},disabled:true,attributes:{},addEventListener:(n,f)=>events.set(n,f),removeEventListener:n=>events.delete(n),setAttribute(k,v){this.attributes[k]=v},querySelector:s=>s==='i'?icon:label,fire(n,e={}){events.get(n)?.(e)},icon,label};
}
test('primary button switches call/send immediately, reads the actual input at tap and handles attachment-only sends',()=>{
  const window={};vm.runInNewContext(composer,{window});const input=element(),button=element(),form={},events=[];let attached=false;
  const bound=window.CendonCallComposer.bind({input,button,form,hasAttachment:()=>attached,onCall:()=>events.push('call'),onSend:v=>events.push(v)});
  assert.equal(button.dataset.mode,'call');button.onclick({preventDefault(){}});input.value=' แอร์ไม่เย็น ';input.fire('input');assert.equal(button.dataset.mode,'send');assert.match(button.icon.className,/arrow-up/);button.onclick({preventDefault(){}});assert.deepEqual(events,['call','แอร์ไม่เย็น']);
  input.value=' ';input.fire('input');assert.equal(button.dataset.mode,'call');attached=true;bound.sync();assert.equal(button.dataset.mode,'send');form.onsubmit({preventDefault(){}});assert.equal(events.at(-1),'');bound.dispose();
});
test('IME and empty Enter do not accidentally dial; Enter with text sends once',()=>{
  const window={};vm.runInNewContext(composer,{window});const input=element(),button=element();let count=0;window.CendonCallComposer.bind({input,button,onCall:()=>count++,onSend:()=>count++});
  input.fire('keydown',{key:'Enter',preventDefault(){}});assert.equal(count,0);input.value='ทดสอบ';input.fire('keydown',{key:'Enter',isComposing:true,preventDefault(){}});assert.equal(count,0);input.fire('keydown',{key:'Enter',preventDefault(){}});assert.equal(count,1);
});
test('native empty-input submit is suppressed and composing a word cannot dial or send',()=>{
  const window={};vm.runInNewContext(composer,{window});const input=element(),button=element();let actions=0,prevented=false;
  window.CendonCallComposer.bind({input,button,onCall:()=>actions++,onSend:()=>actions++});
  input.fire('keydown',{key:'Enter',preventDefault(){prevented=true}});assert.equal(prevented,true);assert.equal(actions,0);
  input.fire('compositionstart');input.value='ทด';button.onclick({preventDefault(){}});assert.equal(actions,0);
  input.fire('compositionend');button.onclick({preventDefault(){}});assert.equal(actions,1);
});
function rig(){
  const window={};vm.runInNewContext(surface,{window});const timers=new Map(),events=[];let id=0;
  const p=window.CendonCallSurface.gesture({later(fn,ms){timers.set(++id,{fn,ms});return id},cancel:id=>timers.delete(id),onHold:()=>events.push('hold'),onDrag:()=>events.push('drag'),onSwipe:d=>events.push(d),onDrop:()=>events.push('drop'),onCancel:()=>events.push('cancel')});return{p,timers,events};
}
test('one-second hold is separate from swipe; short taps and vertical scroll do not hang up',()=>{
  const r=rig();r.p.down({x:40,y:90,time:0});assert.equal([...r.timers.values()][0].ms,1000);r.p.up({x:42,y:92,time:200});assert.deepEqual(r.events,['cancel']);
  r.p.down({x:50,y:50,time:500});r.p.move({x:52,y:150,time:700});assert.equal(r.timers.size,0);r.p.up({x:52,y:200,time:900});assert.equal(r.events.at(-1),'cancel');
});
test('swipe dismisses in either direction, hold-drag uses drop rather than hangup and cancellation resets',()=>{
  for(const direction of [-1,1]){const r=rig();r.p.down({x:160,y:10,time:0});r.p.move({x:160+direction*130,y:12,time:200});r.p.up({x:160+direction*130,y:12,time:220},320);assert.equal(r.events.at(-1),direction);}
  const r=rig();r.p.down({x:20,y:200,time:0});[...r.timers.values()][0].fn();r.p.move({x:180,y:400,time:1300});r.p.up({x:180,y:400,time:1400});assert.deepEqual(r.events,['hold','drag','drop']);r.p.cancel();assert.equal(r.events.at(-1),'cancel');
});
function agentFixture(shops=[]){
  const window={},seen=[],mutations=[];vm.runInNewContext(agent,{window});const abort=new AbortController();let active=true;
  const a=window.CendonCallAgent.create({api:async(path,o)=>{seen.push(path);return{techs:shops}},showResults:cards=>seen.push(cards),getLocation:()=>null,getCar:()=>({name:'User car',year:2020,vin:'MUST NOT LEAK',plate:'MUST NOT LEAK',phone:'MUST NOT LEAK'}),prepareUrgent:async s=>mutations.push(s)});
  return{a,seen,mutations,ctx:{signal:abort.signal,isCurrent:()=>active},abort,stop(){active=false}};
}
test('voice search uses the real backend, excludes demo/unapproved/suspended/paused shops and never exposes contact/pin',async()=>{
  const f=agentFixture([{id:'real',shop:'Approved <script>shop</script>',area:'Bangkok',verified:true,cats:['eng'],mobile:true,phone:'SECRET',lat:13.7,lng:100.5},{id:'demo',test:true,verified:true},{id:'pending'},{id:'suspended',verified:true,suspended:true},{id:'paused',verified:true,vacation:{until:1}}]);
  const r=await f.a.execute('find_mechanics',{category:'eng'},f.ctx);assert.equal(f.seen[0],'/api/tech');assert.equal(r.shops.length,1);assert.equal(r.shops[0].id,'real');assert.equal(r.locationKnown,false);assert.ok(!JSON.stringify(r).includes('SECRET'));assert.ok(!('lat' in r.shops[0]));
});
test('empty search is honest, unsupported actions cannot post/pay/delete, and drafts require user submission',async()=>{
  const f=agentFixture();assert.equal((await f.a.execute('find_mechanics',{},f.ctx)).shops.length,0);assert.match((await f.a.execute('submit_job',{},f.ctx)).error,/Unsupported/);assert.equal((await f.a.execute('show_mechanic',{shop_id:'forged'},f.ctx)).displayed,undefined);
  const draft=await f.a.execute('prepare_urgent_request',{symptom:'Engine will not start this morning'},f.ctx);assert.equal(draft.submitted,false);assert.equal(draft.requiresUserConfirmation,true);assert.equal(f.mutations.length,1);assert.deepEqual(f.seen.filter(x=>typeof x==='string'),['/api/tech']);
});
test('cancelled calls do not run tools or display late results; current car excludes VIN/plate/private fields',async()=>{
  const f=agentFixture();const c=await f.a.execute('get_my_car',{},f.ctx);assert.ok(!JSON.stringify(c).includes('MUST NOT LEAK'));f.abort.abort();await assert.rejects(f.a.execute('find_mechanics',{},f.ctx));assert.equal(f.seen.length,0);
});
test('home and chat share the transport; home has no iframe/navigation for a call, account switches dispose it',()=>{
  assert.match(home,/onCall:startHomeCall/);assert.match(home,/homeVoice\.dispose\(\);homeVoice=null/);assert.match(chat,/cendonCall\.dispose\(\);cendonCall=null/);assert.match(home,/CendonCallSession\.create/);assert.match(chat,/CendonCallSession\.create/);assert.ok(!home.includes('href="/chat?attach=mic" title="อัดเสียงเครื่อง"'));assert.match(css,/prefers-reduced-motion/);assert.match(css,/focus-visible/);assert.match(surface,/contextmenu/);assert.match(surface,/aria-modal/);
});
test('a floating call is portalled above sheets; camera fills its containing screen, and there is no legacy empty-Enter dial handler',()=>{
  assert.match(surface,/const parent=floating\?document\.body:anchor/);assert.match(surface,/placeDock\(floating\|\|!observed\)/);assert.match(css,/\.hh-cam\{position:absolute;inset:0!important/);assert.ok(!home.includes('$("hForm").requestSubmit()'));assert.match(surface,/lastMuted!==muted/);
});
test('all modified inline scripts parse, excluding browser JSON/import maps',()=>{
  for(const html of [home,chat])for(const m of html.matchAll(/<script([^>]*)>([\s\S]*?)<\/script>/g)){if(/speculationrules|application\/|importmap/.test(m[1]))continue;assert.doesNotThrow(()=>new vm.Script(m[2]));}
});
test('tap mutes (no hang-up), the hold shows progress and a horizontal drag cancels it',()=>{
  const window={};vm.runInNewContext(surface,{window});const timers=new Map(),events=[];let id=0;
  const p=window.CendonCallSurface.gesture({later(fn,ms){timers.set(++id,{fn,ms});return id},cancel:id=>timers.delete(id),onTap:()=>events.push('tap'),onPress:()=>events.push('press'),onUnpress:()=>events.push('unpress'),onSwipe:d=>events.push(d),onCancel:()=>events.push('cancel'),onHold:()=>events.push('hold')});
  p.down({x:100,y:40,time:0});p.up({x:103,y:41,time:180});assert.deepEqual(events,['press','unpress','tap','cancel']);
  events.length=0;p.down({x:100,y:40,time:500});p.move({x:160,y:42,time:560});assert.deepEqual(events,['press','unpress']);assert.equal(timers.size,0);
  events.length=0;p.down({x:100,y:40,time:900});[...timers.values()].at(-1).fn();p.up({x:100,y:40,time:2000});assert.ok(!events.includes('tap'),'a completed hold is never a tap');
});
test('home call: AI bar dissolves into bars only (no card, no visible buttons), dot spreads from the orb centre, original orb kept',()=>{
  assert.match(css,/\.cv-host\.cv-active\{background:transparent!important/);
  assert.match(css,/\.cv-sr,\.cv-actions\{position:absolute!important;width:1px/);
  assert.match(surface,/function orbCenter\(\)/);assert.ok(surface.includes("circle(${from}px at"),"dot spreads as a growing circle");
  /* วงกลมเต็มจอแบบเดิมที่ผู้ใช้เลือก: ชั้นโปร่ง 4 ชั้น สีส้มพีช แกนครีม */
  for(const c of ["'#fff4d2'","'#ffd19a'","'#ffa360'","'#ff893c'","rgba(255,244,202,.48)"])assert.ok(surface.includes(c),c);
  assert.match(home,/id="hFlip" data-cv-slide/);
});
