import test from 'node:test';import assert from 'node:assert/strict';import vm from 'node:vm';import {readFileSync,readdirSync} from 'node:fs';import {createHash} from 'node:crypto';
const read=f=>readFileSync(new URL('../'+f,import.meta.url),'utf8'),app=read('app-navigation.js');
test('public-code installation waits for real initial readiness, page load and idle, and is scheduled only once',async()=>{
 const events={},idle=[],calls=[],W={addEventListener:(name,fn)=>(events[name]??=[]).push(fn),requestIdleCallback:fn=>idle.push(fn)},D={readyState:'loading'},context={W,D,navigator:{serviceWorker:{register:async path=>calls.push(path)}}};
 vm.runInNewContext(app.slice(app.indexOf('let workerScheduled='),app.indexOf('const progress='))+';globalThis.schedule=scheduleWorker;',context);
 assert.deepEqual(calls,[]);assert.ok(app.includes('if(r.el===initial)scheduleWorker()'));assert.ok(app.indexOf('r.ready=true')<app.indexOf('if(r.el===initial)scheduleWorker()'));
 context.schedule();context.schedule();assert.equal(events.load.length,1);assert.deepEqual(calls,[]);events.load[0]();assert.equal(idle.length,1);assert.deepEqual(calls,[]);idle[0]();assert.deepEqual(calls,['/sw.js']);
});
test('mobile startup never measures the hidden desktop nav; desktop still gets its original first-frame position',()=>{
 for(const file of ['index.html','garage.html','news.html','spares.html'])for(const mobile of [true,false]){
  const source=read(file),script=source.match(/<script>\/\* Place the desktop tab indicator[\s\S]*?<\/script>/)[0].replace(/^<script>|<\/script>$/g,''),events={},frames=[];let reads=0;
  const active={get offsetWidth(){reads++;return 120},get offsetLeft(){reads++;return 10}},indicator={style:{}};
  vm.runInNewContext(script,{document:{readyState:'loading',getElementById:()=>indicator,querySelector:()=>active,addEventListener:(name,fn)=>events[name]=fn},matchMedia:()=>({matches:mobile}),requestAnimationFrame:fn=>frames.push(fn)});
  assert.equal(reads,mobile?0:3,file);assert.equal(frames.length,0);if(!mobile){assert.equal(indicator.style.transition,'none');assert.equal(indicator.style.width,'120px');assert.equal(indicator.style.transform,'translate(10px,-50%)')}
 }
});
test('the map library is the original pinned version with official integrity and all marker assets, not a disabled feature',()=>{
 const root=new URL('../vendor/leaflet-1.9.4/',import.meta.url),meta=JSON.parse(read('vendor/leaflet-1.9.4/provenance.json'));
 assert.equal(meta.version,'1.9.4');for(const row of meta.assets){const bytes=readFileSync(new URL(row.file,root));assert.equal(bytes.length,row.bytes);assert.equal(createHash('sha256').update(bytes).digest('hex'),row.sha256,row.file)}
 assert.equal(createHash('sha256').update(readFileSync(new URL('leaflet.js',root))).digest('base64'),'20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo=');
 assert.equal(createHash('sha256').update(readFileSync(new URL('leaflet.css',root))).digest('base64'),'p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY=');
 const html=read('index.html');assert.ok(html.includes('/vendor/leaflet-1.9.4/leaflet.js'));assert.ok(html.includes('/vendor/leaflet-1.9.4/leaflet.css'));assert.ok(html.includes('Nav.route({path:"map",open:()=>setView("map")})'));assert.doesNotMatch(html,/if\(window\.L\|\|\+\+mt>60\)/);
});
test('decorative drawing does not race the opening gate, and hidden category geometry is deferred',()=>{
 const html=read('index.html'),sky=html.slice(html.indexOf('const HSKY='),html.indexOf('const HERO='));assert.ok(sky.includes('opening.hidden'));assert.ok(sky.includes('animationReady'));assert.ok(sky.includes('document.addEventListener("cendon:view-ready",kick)'));assert.ok(sky.includes('document.readyState==="loading"'));assert.ok(sky.includes('requestIdleCallback(allow'));
 const pages=read('category-pages.js');assert.ok(pages.includes("rail.closest('[hidden]')"));assert.ok(pages.includes('new MutationObserver(schedule)'));assert.ok(read('home-stages.js').includes('getPropertyValue("--hm-h")!==height'));
});
