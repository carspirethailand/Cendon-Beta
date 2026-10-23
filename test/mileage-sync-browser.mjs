/* Real Chrome with the actual garage odometer engine + shared mileage bridge.
   All accounts, readings and HTTP responses are synthetic; no LINE traffic. */
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
const root=resolve(import.meta.dirname,'..');
const garage=await readFile(resolve(root,'garage.html'),'utf8');
const odo=garage.match(/<script id="odo-js">([\s\S]*?)<\/script>/)[1];
const core=odo.slice(odo.indexOf('const DAY=864e5'),odo.indexOf('function addReading('));
const sync=garage.match(/<script id="odosyncjs">([\s\S]*?)<\/script>/)[1];
const stateCore=sync.slice(sync.indexOf('let state=null,stateOwner='),sync.indexOf('/* ─────────── แสดงผล'));
const html=`<!doctype html><meta charset="utf-8"><script>
  window.BACKEND_URL=location.origin;window.auth={currentUser:{uid:'me',getIdToken:async()=> 'fixture-me'}};window.spireAuth=window.auth;
  const hash=s=>{let h=5381;for(let i=0;i<s.length;i++)h=((h*33)^s.charCodeAt(i))>>>0;return s.length+':'+h.toString(36)};
  if(!localStorage.getItem('spire___owner')){
    localStorage.setItem('spire___owner',JSON.stringify('me'));
    const g=JSON.stringify([{id:'one',mileage:'50000',color:'blue'}]);localStorage.setItem('spire_garage',g);
    localStorage.setItem('spire___meta',JSON.stringify({garage:100}));localStorage.setItem('spire___seen',JSON.stringify({garage:hash(g)}));localStorage.setItem('spire___synced',JSON.stringify({garage:{t:100,h:hash(g)}}));
    localStorage.setItem('spire_odo_one',JSON.stringify({readings:[{value:50000,source:'manual',at:Date.now()-3*864e5}]}));
  }
  window.CendonScope={mine:uid=>JSON.parse(localStorage.getItem('spire___owner'))===uid};
  const LG=(k,d)=>JSON.parse(localStorage.getItem('spire_'+k))??d,LSt=(k,v)=>localStorage.setItem('spire_'+k,JSON.stringify(v)),T=(th,en)=>en;
  window.paintCount=0;window.renderGarage=()=>{paintCount++;document.getElementById('km').textContent=SpireODO.value({id:'one',mileage:'50000'})};
  ${core}
</script><b id="km"></b><b id="estimated"></b><textarea id="draft"></textarea><button id="blur">Done</button><script>renderGarage();
  (function(){const api=path=>fetch(path).then(r=>r.json()),LS=(k,v)=>localStorage.setItem('spire_'+k,JSON.stringify(v));
    function paint(){document.getElementById('estimated').textContent=window.spireOdoFor('one')?.km||''}
    ${stateCore}
    window.spireOdoRefresh();
  })();
</script><script src="/mileage-sync.js"></script>`;
let km=50420,failure=false,delay=0,stateCalls=0;const methods=[],errors=[];
const server=createServer(async(req,res)=>{
  res.setHeader('Cache-Control','no-store');
  if(req.url==='/mileage-sync.js'){res.setHeader('Content-Type','text/javascript');res.end(await readFile(resolve(root,'mileage-sync.js')));return}
  if(req.url==='/api/odo/readings'){
    methods.push(req.method);const value=km,wait=delay;
    if(wait)await new Promise(r=>setTimeout(r,wait));
    res.setHeader('Content-Type','application/json');if(failure)res.statusCode=503;
    res.end(JSON.stringify({cars:[{carId:'one',km:value,observedAt:Date.now(),updatedAt:Date.now(),source:'manual'}]}));return;
  }
  if(req.url==='/api/odo/state'){
    const first=++stateCalls===1,value=first?50000:km;if(first)await new Promise(r=>setTimeout(r,350));
    res.setHeader('Content-Type','application/json');res.end(JSON.stringify({cars:[{carId:'one',known:true,km:value}]}));return;
  }
  res.setHeader('Content-Type','text/html; charset=utf-8');res.end(html);
});
await new Promise(r=>server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+server.address().port;
const {chromium}=await import(pathToFileURL('C:/Users/Porsche/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs'));
const browser=await chromium.launch({headless:true,channel:'chrome'}),page=await browser.newPage();
page.on('pageerror',e=>errors.push(e.message));
try{
  await page.goto(base);await page.waitForFunction(()=>document.getElementById('km').textContent==='50420');
  await page.waitForFunction(()=>document.getElementById('estimated').textContent==='50420');
  await page.waitForTimeout(400);assert.equal(await page.locator('#estimated').innerText(),'50420','stale in-flight maintenance state cannot undo the refresh');
  assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('spire_garage'))[0].color),'blue');
  assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('spire_odo_one')).readings.length),1,'server imports never create local duplicate readings');
  km=50500;await page.evaluate(()=>dispatchEvent(new Event('focus')));await page.waitForFunction(()=>document.getElementById('km').textContent==='50500');
  await page.reload();await page.waitForFunction(()=>document.getElementById('km').textContent==='50500');
  failure=true;await page.evaluate(()=>CendonMileageSync.refresh());assert.equal(await page.locator('#km').innerText(),'50500');failure=false;
  await page.locator('#draft').fill('Preserve my repair note');km=50600;const count=await page.evaluate(()=>paintCount);
  await page.evaluate(()=>CendonMileageSync.refresh());assert.equal(await page.locator('#draft').inputValue(),'Preserve my repair note');assert.equal(await page.evaluate(()=>paintCount),count);
  await page.locator('#blur').click();await page.waitForFunction(()=>document.getElementById('km').textContent==='50600');
  delay=200;km=99999;await page.evaluate(()=>{window.late=CendonMileageSync.refresh()});
  await page.evaluate(()=>{auth.currentUser={uid:'other',getIdToken:async()=> 'fixture-other'};localStorage.setItem('spire___owner',JSON.stringify('other'));localStorage.setItem('spire_garage',JSON.stringify([{id:'one',mileage:'10'}]))});
  await page.evaluate(()=>window.late);assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('spire_garage'))[0].mileage),'10');assert.equal(await page.evaluate(()=>CendonMileageSync.forCar('one')),null);
  assert.equal(await page.evaluate(()=>spireOdoFor('one')),null,'maintenance state is account-scoped too');
  assert.ok(methods.every(x=>x==='GET'));assert.deepEqual(errors,[]);
  console.log('PASS: real garage engine replaces stale local anchor; focus/reload; offline retention; no duplicate anchors; editing draft preservation; account isolation (8 scenarios)');
}finally{await browser.close();server.closeAllConnections();await new Promise(r=>server.close(r))}
