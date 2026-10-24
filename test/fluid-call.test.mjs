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
const shell=await read('call-shell.js'),headers=await read('_headers'),session=await read('call-session.js'),core=await read('valet-core.js');
test('call keeps going across pages: same-site frames only, navigations intercepted, child pages reuse the live call',()=>{
  assert.match(headers,/X-Frame-Options: SAMEORIGIN/);assert.match(headers,/frame-ancestors 'self'/);assert.ok(!/frame-ancestors 'none'|X-Frame-Options: DENY/.test(headers),'own pages may frame each other, other sites still cannot');
  assert.match(shell,/navigation\.addEventListener\('navigate',onNavigate\)/);assert.match(shell,/e\.intercept\(/);assert.match(shell,/destination\.sameDocument\)return/,'page-internal pushState routes are left alone');
  assert.match(shell,/location\.replace\(h\)/,'after the call the visible page becomes a real page');
  assert.match(session,/P\.CendonCallShell\.active\(\)\)\{P\.CendonCallShell\.expand\(\);return\}/,'a call button inside the frame opens the existing call');
  assert.match(session,/CendonCallShell\?\.started\(api\)/);assert.match(session,/CendonCallShell\?\.ended\(api\)/);
  for(const page of [home,chat])assert.match(page,/call-shell\.js\?v=\d+/);
});
test('call shell contract: inactive until a call starts, ignores foreign end signals',()=>{
  const nav={l:null,addEventListener(n,f){this.l=f}},W={navigation:nav,addEventListener(){},location:{href:'https://x.test/',origin:'https://x.test',search:''}};W.parent=W;
  const D={documentElement:{classList:{add(){},remove(){},contains:()=>false}},title:'t',addEventListener(){}};
  vm.runInNewContext(shell,{window:W,document:D,history:{replaceState(){}},location:W.location,URL,setTimeout,clearTimeout});
  const S=W.CendonCallShell,a={},b={};assert.equal(S.active(),false);S.started(a);assert.equal(S.active(),true);S.ended(b);assert.equal(S.active(),true,'another session cannot end this call');S.ended(a);assert.equal(S.active(),false);
  let caught=false;nav.l({canIntercept:true,destination:{url:'https://x.test/garage',sameDocument:false},navigationType:'push',intercept(){caught=true}});assert.equal(caught,false,'no call, no interception');
});
test('swipe down minimizes the full call; the floating pill reopens it; photos can be sent mid-call',()=>{
  assert.match(surface,/root\.addEventListener\('pointerdown'/);assert.match(surface,/dy>120\|\|\(dy>40&&v>\.6\)/);assert.match(surface,/function collapse\(\)/);
  assert.match(surface,/onTap:\(\)=>\{if\(!active\|\|bead\)return;if\(floating\(\)\)full\(\);else session\?\.mute\(\);\}/);
  assert.match(surface,/data-cv="pmute"/);assert.match(surface,/inp\.setAttribute\('data-nocrop',''\)/);assert.match(session,/async function sendImage\(file\)/);assert.match(session,/realtimeInput:\{video:\{data,mimeType:"image\/jpeg"\}\}/);
  assert.match(home,/const CALLMEM="spire_callnotes",CALLMEM_MS=30\*60e3/,'home call memory lasts 30 minutes on this device');assert.match(home,/k==="spire_callnotes"/,'cleared on sign-out');
});
test('voice agent: own-account actions, fixed page list, nothing for other people or staff',async()=>{
  const window={},calls=[];vm.runInNewContext(agent,{window,setTimeout:(f)=>f(),location:{assign:u=>calls.push(['nav',u])},encodeURIComponent});
  const cars=[{id:'c1',name:'City',year:'2019',mileage:'85000',vin:'SECRET',plate:'SECRET'}];
  window.CendonValetCore={on:()=>true,T:(th)=>th,PAGES:{garage:1,news:1},pageOf:k=>k==='garage'?{label:'การาจ',url:'/garage'}:null,cars:()=>cars,curCar:()=>cars[0],carName:c=>c.name,findCar:r=>cars.find(c=>c.id===r||c.name===r)||null,
    pickCar:id=>(calls.push(['pick',id]),{label:'City 2019'}),setSetting:async(key,value)=>(calls.push([key,value]),{done:true,applied:true,key,value,theme:key==='theme'?value:undefined}),threads:async()=>({threads:[{shop:'A',last:'hi'}],shopUnread:2})};
  const a=window.CendonCallAgent.create({minimize:()=>calls.push(['min'])}),ctx={signal:new AbortController().signal,isCurrent:()=>true};
  const go=await a.execute('valet',{do:'go',to:'garage'},ctx);assert.equal(go.done,true);assert.deepEqual(calls.slice(0,2),[['min'],['nav','/garage']]);
  assert.match((await a.execute('valet',{do:'go',to:'admin'},ctx)).error,/Unknown page/);
  assert.equal((await a.execute('valet',{do:'setting',key:'theme',value:'dark'},ctx)).theme,'dark');
  assert.equal((await a.execute('valet',{do:'pick_car',car:'City'},ctx)).selected,'City 2019');
  const list=await a.execute('valet',{do:'cars'},ctx);assert.equal(list.cars[0].km,85000);assert.ok(!JSON.stringify(list).includes('SECRET'));
  for(const bad of ['admin','delete_account','users','pay'])assert.match((await a.execute('valet',{do:bad},ctx)).error,/Unsupported/);
  /* การ์ดบนจอเขียนภาษาคน — ชื่อเครื่องมือภายในไปอยู่ในคำแนะนำถึง AI เท่านั้น */
  const shown=[];const b2=window.CendonCallAgent.create({showValet:v=>shown.push(v)});
  const m=await b2.execute('valet',{do:'msg_shop',text:'สวัสดีครับ'},ctx);
  assert.equal(JSON.stringify(m.missing),'["ร้านที่จะติดต่อ"]');assert.match(m.next,/find_mechanics/);
  assert.ok(shown.length&&!/find_mechanics|_/.test(JSON.stringify(shown.at(-1).missing)),'no tool names on the card');
  assert.match(core,/role!=="technician"/,'shop-side customer chats are never read out');assert.ok(!/admin|handbook/.test(core.slice(core.indexOf('const PAGES='),core.indexOf('function pageOf'))),'no staff pages');
});
const valetJs=await read('valet.js');
test('chat Valet: commands are recognised, Valet-off asks once with an allow card, shop names match loosely',()=>{
  const store={};const window={localStorage:{getItem:k=>store[k]??null,setItem:(k,v)=>{store[k]=v}}};const document={readyState:'complete',addEventListener(){},querySelector:()=>null,querySelectorAll:()=>[],getElementById:()=>null};
  window.MutationObserver=function(){return{observe(){}}};
  vm.runInNewContext(valetJs,{window,document,localStorage:window.localStorage,MutationObserver:window.MutationObserver,setTimeout:()=>0,JSON,encodeURIComponent});
  const V=window.CendonValet;
  for(const t of ['ช่วยทักไปหาช่างนนท์การช่างและบอกว่า รถสตาร์ทไม่ติด','ขอราคาจากร้านนนท์แอร์','เรียกช่างด่วน ยางแตก','เพิ่มรถ Civic 2020','อัปเดตเลขไมล์เป็น 90000','message the shop about Saturday'])assert.ok(V.wantsAct(t),t);
  for(const t of ['แอร์ไม่เย็นเกิดจากอะไร','ร้านไหนซ่อมแอร์ดีแถวบางนา','บอกหน่อยว่าน้ำมันเครื่องควรเปลี่ยนเมื่อไร'])assert.ok(!V.wantsAct(t),t);
  /* Valet ปิด: หลังบ้านใหม่ส่ง enable · หลังบ้านเก่าบอกทางเปิด → ทั้งสองแบบได้การ์ดอนุญาต ไม่มีคำสั่งอื่นหลุดมา */
  const J=x=>JSON.stringify(x);
  assert.equal(J(V.cut('ทำให้ได้ครับ\n[[ACT]]{"do":"enable"}[[/ACT]]').acts),'[{"do":"enable"}]');
  assert.equal(J(V.cut('ได้ [[ACT]]{"do":"post_job","symptom":"x"}[[/ACT]]').acts),'[]','no real actions while Valet is off');
  const old=V.cut('เปิด Cendon Valet ได้ที่ปุ่มรูปจับมือข้างช่องพิมพ์ แล้วสั่งใหม่');assert.equal(J(old.acts),'[{"do":"enable"}]');assert.equal(old.text,'');
  assert.match(chat,/CendonValet\.wantsAct\(text\)\)\{\s*messages\.push\(\{role:"ai",text:"",acts:\[\{do:"enable",text\}\]\}\)/,'Valet off + a command → allow card without asking the AI');
  assert.match(chat,/const svcMode=!!\(SV&&SV\.wants\(text\)\)&&!\(window\.CendonValet&&CendonValet\.wantsAct\(text\)\)/,'commands skip the shop pre-search');
  assert.match(chat,/#wAsk,#inp\{border:0!important/,'no inner box in the chat field');
  assert.match(core,/การช่าง\|ช่าง\|อู่\|ร้าน/,'"นนท์การช่าง" matches "นนท์แอร์ แอนด์ เซอร์วิส" by its core name');
});
test('dragging the dot owns the finger: no page scroll or pull-to-refresh mid-drag, a cancelled drag never leaves the dot stuck',()=>{
  assert.match(surface,/touch\.addEventListener\('touchmove',e=>\{if\(bead&&e\.cancelable\)e\.preventDefault\(\);\},\{passive:false\}\)/,'touchmove is blocked only while the dot exists, so a plain swipe on the wave still scrolls the page');
  assert.match(surface,/onCancel:\(\)=>\{if\(bead&&!expanding\)\{dropBack\(\);return;\}/,'a browser cancel mid-drag returns the dot to the wave');
  assert.match(surface,/active=true;document\.documentElement\.classList\.add\('cv-calling'\)/);assert.match(surface,/active=false;document\.documentElement\.classList\.remove\('cv-calling'\)/);
  assert.match(css,/html\.cv-calling,html\.cv-calling body\{overscroll-behavior-y:none\}/,'pull-to-refresh (which would drop the call) is off only during a call');
});
