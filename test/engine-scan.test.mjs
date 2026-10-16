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
  return{tools,voice,nodes,document,requests,sent,ticks,timers,events,settle,respond:async d=>{fetchResolve(Response.json({data:d}));await settle()}};
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
  for(const page of ['index.html','chat.html']){const s=await read(page);assert.ok(s.indexOf('<script src="engine-scan.js?')<s.indexOf('<script src="call-tools.js?'));assert.match(s,/call-tools\.js\?v=2026-10-16-r5/);assert.ok(s.indexOf('<script src="call-chat.js?')<s.indexOf('<script src="call-surface.js?'));}
  const sw=await read('sw.js'),css=await read('call-ui.css');assert.match(sw,/cendon-v283-ambient-chat/);assert.match(sw,/engine-scan\.js\?v=2026-10-16-r2/);assert.match(css,/\.lv-boxes\.stale\{visibility:hidden;pointer-events:none\}/);assert.match(css,/\.lv-chips\[hidden\]\{display:none\}/);
});
