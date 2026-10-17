import {test} from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';
const read=n=>readFile(new URL('../'+n,import.meta.url),'utf8');
const helper=await read('engine-scan.js'),source=await read('call-tools.js');
const window={};vm.runInNewContext(helper,{window});const scan=window.CendonEngineScan;
const item=(x={})=>({part:'battery',name:'แบตเตอรี่',box:[100,100,350,450],certainty:'high',evidence:'ตัวถังและขั้วสองจุด',what:'จ่ายไฟแรงดันต่ำ',check:'มองเท่านั้น ไม่สัมผัส',hazard:'observe',...x});
const data=(items=[item()],x={})=>({scanVersion:2,scene:'engine_bay',quality:'clear',items,...x});
test('read requires paired scanner version, high certainty and evidence; missing or legacy results cannot get fake boxes',()=>{
  assert.throws(()=>scan.read({scene:'engine_bay',items:[item()]}),/scan_version/);
  assert.equal(scan.read(data([item(),item({certainty:'medium'}),item({evidence:''}),item({box:[0,0,2000,500]})])).items.length,1);
  assert.equal(scan.read(data([item()],{quality:'dark'})).items.length,0);
  assert.equal(scan.color,'#FF514B');assert.equal(scan.version,2);
});
test('two visible parts of the same type have separate selectable keys; no innerHTML or predicted fault fields survive',()=>{
  const d=scan.read(data([item({part:'radiator_hose',name:'<img onerror=x>',look:'Fault invented'}),item({part:'radiator_hose'})]));
  assert.equal(d.items.length,2);assert.notEqual(d.items[0].key,d.items[1].key);assert.ok(!d.items[0].name.includes('<'));assert.equal(d.items[0].look,'');
});
test('motorcycle metadata and cover guidance stay bounded; clients cannot authorise cover removal',()=>{
  const d=scan.read(data([item({part:'cvt_cover',name:'ฝาครอบ CVT'})],{vehicleKind:'motorcycle',coverGuidance:{action:'change_view',coverVisible:true,maySuggestRemoval:true,message:'<b>คงฝาไว้</b>'}}));
  assert.equal(d.vehicleKind,'motorcycle');assert.equal(d.coverGuidance.maySuggestRemoval,false);assert.equal(d.coverGuidance.coverVisible,true);assert.ok(!d.coverGuidance.message.includes('<'));
  assert.equal(scan.read(data([],{vehicleKind:'<script>',coverGuidance:{action:'remove'}})).vehicleKind,'unknown');
  assert.equal(scan.read(data([],{coverGuidance:{action:'remove'}})).coverGuidance,null);
});
test('actual motorcycle scanner shows red component boxes and cover guidance in the same call',async()=>{
  const f=rig();await f.tools.scan();await f.settle();await f.respond(data([item({part:'cvt_cover',name:'ฝาครอบ CVT'})],{vehicleKind:'motorcycle',coverGuidance:{action:'leave_on',coverVisible:true,maySuggestRemoval:false,message:'คงฝาครอบไว้ ไม่ต้องถอด'}}));
  assert.equal(f.nodes.get('lvBoxes').children.length,1);assert.equal(f.nodes.get('lvBoxes').children[0].style['--c'],'#FF514B');
  assert.equal(f.nodes.get('lvTitle').textContent,'รู้จักชิ้นส่วนมอเตอร์ไซค์');assert.equal(f.nodes.get('lvCover').hidden,false);assert.match(f.nodes.get('lvCover').textContent,/ไม่ต้องถอด/);
  assert.match(JSON.stringify(f.sent),/ภาพมอเตอร์ไซค์/);assert.equal(f.voice.callActive,true);f.tools.dispose();
});

test('safe scanner errors distinguish temporary provider capacity from daily allowance; never echo provider text',()=>{
  assert.match(scan.failure(503,{error:'scan_provider_busy'},'th'),/ชั่วคราว/);
  assert.match(scan.failure(504,{error:'scan_timeout'},'en'),/without ending the call/);
  assert.match(scan.failure(502,{error:'scan_invalid_result'},'th'),/ตำแหน่งไม่ครบ/);
  assert.match(scan.failure(429,{error:'quota'},'en'),/Today/);
  assert.ok(!scan.failure(500,{error:'private-provider-payload'},'en').includes('private-provider-payload'));
});

test('actual scanner reports a provider failure without fake boxes and rescan can recover in the same call',async()=>{
  const f=rig();await f.tools.scan();await f.settle();await f.fail(503,'scan_provider_busy');
  assert.match(f.nodes.get('lvStat').innerHTML,/ชั่วคราว/);assert.equal(f.nodes.get('lvBoxes').children.length,0);
  f.nodes.get('lvRe').onclick();await f.settle();assert.equal(f.requests.length,2);await f.respond(data());
  assert.equal(f.nodes.get('lvBoxes').children.length,1);assert.equal(f.voice.callActive,true);f.tools.dispose();
});
const view=()=>({W:390,H:844,v:{videoWidth:1920,videoHeight:1080},sx:710.5,sy:0,sw:499,sh:1080,mirror:false});
test('camera zoom, rotation, mirror, dimensions and backgrounding invalidate old coordinates',()=>{
  const r=view(),frame=scan.frameKey(r);assert.equal(scan.fresh({frame,current:frame,track:{lost:0}}),true);
  for(const change of [{sw:250},{W:844,H:390},{mirror:true},{sx:100}])assert.equal(scan.fresh({frame,current:scan.frameKey({...r,...change}),track:{lost:0}}),false);
  assert.equal(scan.fresh({frame,current:frame,track:{lost:1}}),false);assert.equal(scan.fresh({frame,current:frame,track:{lost:0},hidden:true}),false);
});
test('capture keeps the displayed crop/aspect ratio and caps longest edge at 1280 without upscaling',()=>{
  for(const [w,h]of [[499,1080],[2160,3840],[1920,1080],[320,240]]){const s=scan.captureSize({...view(),sw:w,sh:h});assert.ok(Math.max(s.w,s.h)<=1280);assert.ok(Math.abs(s.w/s.h-w/h)<.005);assert.ok(s.w<=w&&s.h<=h);}
});
function rig(){
  const nodes=new Map(),ticks=[],sent=[],requests=[],timers=new Map(),events=new Map();let serial=0,fetchResolve;
  const classes=()=>{const set=new Set();return{add:(...a)=>a.forEach(x=>set.add(x)),remove:(...a)=>a.forEach(x=>set.delete(x)),contains:x=>set.has(x),toggle(x,on){if(on??!set.has(x))set.add(x);else set.delete(x)}}};
  function el(){
    const e={children:[],hidden:false,dataset:{},classList:classes(),style:{setProperty(k,v){this[k]=v}},clientWidth:390,clientHeight:844,videoWidth:1920,videoHeight:1080,
      appendChild(n){this.children.push(n);return n},after(){},setAttribute(){},remove(){this.removed=true},pause(){},play:()=>Promise.resolve(),
      querySelector(s){return this.children.find(n=>n.selector===s)||Object.assign(el(),{selector:s})},querySelectorAll(s){return this.children.filter(n=>s==='.lv-box'?n.className.includes('lv-box'):s==='[data-i]'?n.dataset.i!==undefined:false)},
      getContext(){return{save(){},restore(){},translate(){},scale(){},drawImage(){},getImageData(x,y,w,h){const a=new Uint8ClampedArray(w*h*4);for(let i=0;i<w*h;i++){const n=((i*31337)^(i>>>3)*17131)&255;a[i*4]=a[i*4+1]=a[i*4+2]=n;a[i*4+3]=255}return{data:a}}}},toDataURL:()=> 'data:image/jpeg;base64,aGVsbG8='};
    let id='',html='',cls='';Object.defineProperties(e,{id:{get:()=>id,set:v=>{id=v;nodes.set(v,e)}},className:{get:()=>cls,set:v=>{cls=v;v.split(' ').forEach(x=>e.classList.add(x))}},innerHTML:{get:()=>html,set:v=>{html=v;e.children=[];for(const m of v.matchAll(/\bid="([^"]+)"/g)){const n=el();n.id=m[1];e.children.push(n)}}}});return e;
  }
  for(const id of ['callUI','callCam']){const e=el();e.id=id;}
  const document={hidden:false,getElementById:id=>nodes.get(id)||null,createElement:el,addEventListener:(n,f)=>events.set(n,f),removeEventListener:n=>events.delete(n)};
  const win={addEventListener:(n,f)=>events.set(n,f),removeEventListener:n=>events.delete(n)};const sandbox={window:win,document,navigator:{},innerWidth:390,innerHeight:844,Uint8Array,Uint8ClampedArray,AbortController,Date,Math,console,
    cancelAnimationFrame(){},setInterval:fn=>{ticks.push(fn);return ticks.length},clearInterval(){},setTimeout(fn,ms){if(ms===350)return setTimeout(fn,1);timers.set(++serial,{fn,ms});return serial},clearTimeout:id=>timers.delete(id),
    fetch:async(url,init)=>{requests.push({url,init,body:JSON.parse(init.body)});return await new Promise(resolve=>{fetchResolve=resolve})}};
  const ctx=vm.createContext(sandbox);vm.runInContext(helper,ctx);vm.runInContext(source,ctx);
  const voice={callActive:true,camOn:true,camFacing:'environment',camZoom:1,callSession:1,callWS:{readyState:1,send:s=>sent.push(JSON.parse(s))}};
  const tools=win.CallTools.create({voice,language:'th',getUser:()=>({getIdToken:async()=>'unit-test-only'}),backendUrl:'https://unit.test'});
  const settle=async()=>{for(let i=0;i<10;i++)await Promise.resolve()};
  return{tools,voice,nodes,document,requests,sent,ticks,timers,events,settle,respond:async d=>{fetchResolve(Response.json({data:d}));await settle()},fail:async(status,error)=>{fetchResolve(Response.json({error},{status}));await settle()}};
}
test('real scanner sends the current image and version; renders red identified boxes, including two hoses, without a second call',async()=>{
  const f=rig();await f.tools.scan();await f.settle();assert.equal(f.requests.length,1);assert.equal(f.requests[0].body.scanVersion,2);assert.equal(f.requests[0].body.attachments[0].b64,'aGVsbG8=');
  await f.respond(data([item({part:'radiator_hose'}),item({part:'radiator_hose',box:[400,100,600,500]})]));
  const boxes=f.nodes.get('lvBoxes').children;assert.equal(boxes.length,2);assert.equal(boxes[0].style['--c'],'#FF514B');assert.notEqual(boxes[0].dataset.k,boxes[1].dataset.k);
  assert.ok(f.sent.length);f.tools.dispose();assert.equal(f.tools.busy,false);
});
test('hangup aborts the pending scan; even a non-cooperative late response cannot reopen or annotate the call',async()=>{
  const f=rig();await f.tools.scan();await f.settle();const signal=f.requests[0].init.signal;f.tools.dispose();assert.equal(signal.aborted,true);
  const n=f.sent.length;await f.respond(data());assert.equal(f.nodes.get('lvBoxes').children.length,0);assert.equal(f.sent.length,n);
});
test('a result captured before camera zoom cannot annotate the new view',async()=>{
  const f=rig();await f.tools.scan();await f.settle();f.voice.camZoom=2;await f.respond(data());assert.equal(f.nodes.get('lvBoxes').children.length,0);assert.ok(f.nodes.get('lvStat').innerHTML.includes('ภาพเปลี่ยน'));f.tools.dispose();
});
test('background and resize hide boxes and detail immediately; pending pre-change images cannot be accepted',async()=>{
  const f=rig();await f.tools.scan();await f.settle();await f.respond(data());
  f.nodes.get('lvBoxes').children[0].onclick();assert.equal(f.nodes.get('lvDet').hidden,false);
  f.document.hidden=true;f.events.get('visibilitychange')();assert.equal(f.nodes.get('lvChips').hidden,true);assert.equal(f.nodes.get('lvDet').hidden,true);assert.equal(f.nodes.get('lvBoxes').classList.contains('stale'),true);
  f.tools.dispose();assert.equal(f.events.size,0);
  const r=rig();await r.tools.scan();await r.settle();r.events.get('resize')();await r.respond(data());assert.equal(r.nodes.get('lvBoxes').children.length,0);r.tools.dispose();
});
test('tap explains the actual selected part with the safety restriction; legacy server fails visibly rather than drawing guesses',async()=>{
  const f=rig();await f.tools.scan();await f.settle();await f.respond(data());f.nodes.get('lvBoxes').children[0].onclick();
  const text=JSON.stringify(f.sent.at(-1));assert.match(text,/แบตเตอรี่/);assert.match(text,/ห้ามเพิ่มคำแนะนำ/);f.tools.dispose();
  const r=rig();await r.tools.scan();await r.settle();await r.respond({scene:'engine_bay',items:[item()]});assert.equal(r.nodes.get('lvBoxes').children.length,0);assert.match(r.nodes.get('lvStat').innerHTML,/คนละรุ่น/);r.tools.dispose();
});
test('paired assets load in order on Home and Chat and the service worker caches the new release',async()=>{
  for(const page of ['index.html','chat.html']){const s=await read(page);assert.ok(s.indexOf('<script src="engine-scan.js?')<s.indexOf('<script src="call-tools.js?'));assert.match(s,/call-tools\.js\?v=2026-10-17-r8/);}
  const sw=await read('sw.js'),css=await read('call-ui.css');/* เลขรุ่นแคชต้องไม่ต่ำกว่ารุ่นที่ออกสแกนห้องเครื่อง (v282) — รุ่นหลังจากนี้ bump ต่อได้โดยเทสต์ไม่พัง */assert.ok(+(sw.match(/const CACHE = 'cendon-v(\d+)/)||[])[1]>=282,'sw CACHE >= v282');assert.match(sw,/engine-scan\.js\?v=2026-10-17-r4/);assert.match(css,/\.lv-boxes\.stale\{visibility:hidden;pointer-events:none\}/);assert.match(css,/\.lv-chips\[hidden\]\{display:none\}/);
});
