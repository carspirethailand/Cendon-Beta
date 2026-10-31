/* Real page startup, synthetic identity/API. No production writes or GPS. */
import assert from 'node:assert/strict';import {spawn} from 'node:child_process';import {pathToFileURL} from 'node:url';import {resolve,join} from 'node:path';
const root=resolve(import.meta.dirname,'..'),pkg=process.env.CENDON_NODE_PACKAGES||'C:/Users/Porsche/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules',{chromium}=await import(pathToFileURL(join(pkg,'playwright/index.mjs')));
const server=spawn(process.execPath,['test/app-fixture-server.mjs',process.env.CENDON_QA_DIST||'.','0','0'],{cwd:root,stdio:['ignore','pipe','pipe']}),base=await new Promise((ok,fail)=>{server.stdout.once('data',b=>ok(JSON.parse(b.toString()).url));server.once('error',fail)}),browser=await chromium.launch({headless:true,channel:'chrome'}),page=await browser.newPage({viewport:{width:393,height:852},serviceWorkers:'block'}),errors=[];page.on('pageerror',e=>errors.push(e.message));
try{
 await page.addInitScript(()=>{
  window.__startupChecks={worker:[],earlySkyDraws:0,skyDraws:0};
  sessionStorage.setItem('spire_heroAi','1');
  const original=CanvasRenderingContext2D.prototype.clearRect;
  CanvasRenderingContext2D.prototype.clearRect=function(...args){if(this.canvas.closest('#hSky')){__startupChecks.skyDraws++;const opening=parent.document.getElementById('appOpening');if(document.documentElement.dataset.gate==='1'||opening&&!opening.hidden)__startupChecks.earlySkyDraws++}return original.apply(this,args)};
  Object.defineProperty(navigator,'serviceWorker',{configurable:true,value:{controller:null,ready:Promise.resolve({}),getRegistration:async()=>({}),register:async path=>{__startupChecks.worker.push({path,ready:document.getElementById('appOpening')?.hidden===true,loaded:document.readyState==='complete'});return {}}}});
 });
 await page.goto(base,{waitUntil:'commit'});await page.waitForFunction(()=>window.CendonApp&&document.getElementById('appOpening').hidden);const f=page.frames().find(f=>f!==page.mainFrame());
 await page.waitForFunction(()=>__startupChecks.worker.length>0);const registration=await page.evaluate(()=>__startupChecks.worker);assert.equal(registration.length,1);assert.deepEqual(registration[0],{path:'/sw.js',ready:true,loaded:true});
 await f.waitForFunction(()=>__startupChecks.skyDraws>0);assert.equal(await f.evaluate(()=>__startupChecks.earlySkyDraws),0,'decoration cannot compete with initial readiness');
 assert.equal(await f.evaluate(()=>localStorage.getItem('spire___owner')),'performance-fixture');assert.ok(await f.evaluate(()=>JSON.parse(localStorage.getItem('spire_garage')).some(c=>c.id==='fixture-car')));
 await f.waitForFunction(()=>window.L?.version==='1.9.4');await f.evaluate(()=>{const host=document.createElement('div');host.id='qaMap';host.style.cssText='position:fixed;inset:100px 20px auto;height:200px;z-index:100000';document.body.append(host);window.__qaMap=L.map(host).setView([13.75,100.5],12);L.marker([13.75,100.5]).addTo(__qaMap)});
 await f.waitForFunction(()=>{const img=document.querySelector('#qaMap .leaflet-marker-icon');return img?.complete&&img.naturalWidth>0});assert.ok((await f.locator('#qaMap .leaflet-marker-icon').getAttribute('src')).includes('/vendor/leaflet-1.9.4/images/'));await f.evaluate(()=>{__qaMap.remove();document.getElementById('qaMap').remove()});
 await f.evaluate(()=>{window.__pickerMaps=[];window.__nativeMap=L.map;L.map=function(...args){const map=__nativeMap.apply(this,args);if(map.getContainer().closest('#bMap'))__pickerMaps.push(map);return map}});
 await page.evaluate(()=>CendonApp.go('/urgent/breakdown'));await f.locator('#bMap').waitFor({state:'attached'});await f.waitForFunction(()=>__pickerMaps.length===1);
 await page.evaluate(()=>CendonApp.go('/'));await f.waitForFunction(()=>!document.getElementById('bMap'));
 await page.evaluate(()=>CendonApp.go('/urgent/breakdown'));await f.locator('#bMap').waitFor({state:'attached'});await f.waitForFunction(()=>__pickerMaps.length===2);
 await f.evaluate(()=>{__pickerMaps[0].fire('moveend');window.__newPicker=__pickerMaps[1]});
 await page.waitForTimeout(650);assert.equal(await f.evaluate(()=>__newPicker.getContainer().isConnected),true,'closing an old map must not dispose the new form');
 await page.evaluate(()=>CendonApp.go('/'));await f.evaluate(()=>{L.map=__nativeMap});
 await page.evaluate(()=>CendonApp.go('/work/find'));await f.locator('#fMap.leaflet-container').waitFor({state:'visible'});await f.locator('#fMap .leaflet-pane').first().waitFor({state:'attached'});assert.equal(await f.evaluate(()=>FMAP.getContainer().isConnected),true);assert.ok((await f.locator('#fList').innerText()).length>0);await page.evaluate(()=>CendonApp.go('/'));
 await f.evaluate(()=>{window.__savedL=window.L;window.__savedShow=showMap;window.L=undefined;window.showMap=()=>window.__mapRouteOpened=true});
 await page.evaluate(()=>CendonApp.go('/map'));await f.waitForFunction(()=>window.__mapRouteOpened,undefined,{timeout:1500});await f.evaluate(()=>{window.L=__savedL;window.showMap=__savedShow});await page.evaluate(()=>CendonApp.go('/'));
 assert.deepEqual(errors,[]);console.log(JSON.stringify({pass:true,workerAfterReadyAndLoad:true,noEarlyDecorativeDraw:true,localLeafletAndMarkers:true,closedMapCallbacksIsolated:true,validNearbyMap:true,mapRouteDoesNotWaitForFallback:true,garagePreserved:true,productionWrites:0}));
}finally{await browser.close();server.kill()}
