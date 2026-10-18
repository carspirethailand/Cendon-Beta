/* Local browser QA. Auth/car/device/AI handoffs below are synthetic, not real accounts or model results. */
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile,mkdir} from 'node:fs/promises';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {join,resolve,extname} from 'node:path';
const base=fileURLToPath(new URL('../',import.meta.url));
const chatSource=await readFile(join(base,'chat.html'),'utf8'),ledger=chatSource.match(/<script id="ledgerjs">([\s\S]*?)<\/script>/)[1];
const {chromium}=await import(pathToFileURL('C:/Users/Porsche/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs'));
const fixture=(page,real=false)=>`<!doctype html><html><head><meta charset="utf-8"><script>
window.events=[];window.accountReady=false;window.hasCar=false;window.spireAuth={currentUser:null};window.CendonAccount={completed:()=>window.accountReady};
window.selCar=()=>window.hasCar?{id:'fixture-car'}:null;window.enterThread=()=>{document.body.dataset.phase='thread';events.push('thread')};
${real?'':"window.CendonFeatureAI={select:k=>events.push('select:'+k),openEntry:()=>events.push('entry')};"}window.spireHasFeature=()=>true;window.startCall=()=>events.push('call');window.lang='th';window.garage=()=>window.hasCar?[window.selCar()]:[];window.switchView=()=>{};window.BACKEND_URL='https://test.invalid';
window.CendonValetCore={curCar:()=>window.selCar(),cars:()=>window.hasCar?[window.selCar()]:[],carLabel:()=> 'Synthetic fixture car'};window.openCarDetail=id=>events.push('car:'+id);
</script><script src="/console-entry.js?v=1"></script></head><body data-phase="login"><main class="main"><section id="v-thread"><div id="centerHint">Fixture</div></section><div id="clTabs"><button data-tab="spec" onclick="events.push('tab:spec')">Spec</button><button data-tab="cost" onclick="events.push('tab:cost')">Cost</button></div></main><div id="composer">${real?'':'<button id="faPrepare" onclick="events.push(\'prepare\');document.getElementById(\'faInline\').hidden=false">Prepare</button><div id="faInline" hidden></div>'}<textarea id="inp"></textarea></div>${real?'<script src="/valet-core.js?v=7"></script><script src="/feature-ai.js?v=5"></script><script>'+ledger+'</script>':''}</body></html>`;
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript','.css':'text/css','.ttf':'font/ttf','.svg':'image/svg+xml','.png':'image/png'};
const server=createServer(async(req,res)=>{try{const u=new URL(req.url,'http://localhost');if(['/chat','/garage'].includes(u.pathname)){res.setHeader('Content-Type',types['.html']);res.end(fixture(u.pathname,u.searchParams.has('integration')));return;}
 const name=u.pathname==='/console'?'console.html':u.pathname.slice(1),file=resolve(base,name);if(!file.startsWith(base)||name.includes('..')){res.writeHead(403);res.end();return;}
 const data=await readFile(file);res.setHeader('Content-Type',types[extname(file)]||'application/octet-stream');res.end(data);
}catch{res.writeHead(404);res.end();}}).listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));
let browser;const checks=[];
try{
 browser=await chromium.launch({channel:'msedge',headless:true});const context=await browser.newContext();
 await context.route('**/*',route=>new URL(route.request().url()).hostname==='127.0.0.1'?route.continue():route.abort());
 const origin='http://127.0.0.1:'+server.address().port;
 await mkdir(join(base,'.qa'),{recursive:true});
 for(const width of [1280,390,320]){
  const page=await context.newPage(),errors=[];await page.setViewportSize({width,height:850});page.on('pageerror',e=>errors.push(e.message));await page.goto(origin+'/console');await page.evaluate(()=>document.fonts.ready);assert.equal(await page.evaluate(()=>innerWidth),width);
  assert.equal(await page.locator('.tool:visible').count(),38);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  await page.getByRole('button',{name:'ตรวจรถ AI',exact:true}).click();assert.equal(await page.locator('.tool:visible').count(),9);
  await page.locator('#toolSearch').fill('เสียง');assert.equal(await page.locator('.tool:visible').count(),3);
  await page.locator('#toolSearch').fill('<script>broken-search</script>');assert.equal(await page.locator('.tool:visible').count(),0);assert.equal(await page.locator('#emptyTools').isVisible(),true);
  await page.locator('#resetTools').click();assert.equal(await page.locator('.tool:visible').count(),38);
  await page.locator('body').click({position:{x:width-8,y:100}});await page.keyboard.press('/');assert.equal(await page.locator('#toolSearch').evaluate(e=>e===document.activeElement),true);
  await page.keyboard.press('Tab');await page.evaluate(()=>{document.activeElement?.blur();scrollTo(0,0)});await page.screenshot({path:join(base,'.qa','console-'+width+'.png'),fullPage:true});await page.evaluate(()=>scrollTo(0,0));await page.screenshot({path:join(base,'.qa','console-'+width+'-top.png')});assert.deepEqual(errors,[]);checks.push({width,cards:38,overflow:false,search:true,keyboard:true});await page.close();
 }
 for(const [path,event] of [['/chat?consoleTool=quote','select:quote'],['/chat?consoleTool=shake','select:shake'],['/chat?consoleAction=entry','entry'],['/garage?consoleTab=spec','tab:spec']]){
  const page=await context.newPage();await page.goto(origin+path);await page.waitForTimeout(230);assert.deepEqual(await page.evaluate(()=>events),[]);
  await page.evaluate(()=>{spireAuth.currentUser={uid:'synthetic-owner'};accountReady=true;document.body.dataset.phase='gate'});await page.waitForTimeout(240);assert.deepEqual(await page.evaluate(()=>events),[]);
  await page.evaluate(()=>{hasCar=true;document.body.dataset.phase='welcome'});await page.waitForFunction(e=>events.includes(e),event);assert.equal((await page.evaluate(()=>events)).filter(e=>e===event).length,1);checks.push({path,deferredUntilAuthAndCar:true,event});await page.close();
 }
 {const page=await context.newPage();await page.goto(origin+'/chat?consoleTool=shake');await page.evaluate(()=>{spireAuth.currentUser={uid:'synthetic-owner'};accountReady=true;hasCar=true;spireHasFeature=()=>false;document.body.dataset.phase='welcome'});await page.waitForTimeout(300);assert.deepEqual(await page.evaluate(()=>events),[]);checks.push({planGateRespected:true});await page.close();}
 {const page=await context.newPage();await page.goto(origin+'/chat?consoleTool=quote');await page.evaluate(()=>{spireAuth.currentUser={uid:'synthetic-owner-a'};accountReady=true;document.body.dataset.phase='gate'});await page.waitForTimeout(300);await page.evaluate(()=>{spireAuth.currentUser={uid:'synthetic-owner-b'};hasCar=true;document.body.dataset.phase='welcome'});await page.waitForTimeout(300);assert.deepEqual(await page.evaluate(()=>events),[]);checks.push({accountSwitchCancelsPendingHandoff:true});await page.close();}
 for(const action of ['scan','call']){const page=await context.newPage();await page.goto(origin+'/chat?consoleAction='+action);await page.evaluate(()=>{spireAuth.currentUser={uid:'synthetic-owner'};accountReady=true;hasCar=true;document.body.dataset.phase='welcome'});await page.locator('.ce-intro').waitFor();assert.equal((await page.evaluate(()=>events)).includes('call'),false);await page.getByRole('button',{name:'เริ่มโทรกับ AI'}).click();assert.equal((await page.evaluate(()=>events)).filter(e=>e==='call').length,1);checks.push({action,microphoneRequiresExplicitClick:true});await page.close();}
 for(const key of ['quote','listen','shake','park','own']){
  const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto(origin+'/chat?consoleTool='+key+'&integration=1');
  await page.evaluate(()=>{spireAuth.currentUser={uid:'synthetic-owner'};accountReady=true;hasCar=true;document.body.dataset.phase='welcome'});
  await page.waitForFunction(key=>document.querySelector('[data-fa-tool="'+key+'"]')?.getAttribute('aria-pressed')==='true'&&!document.getElementById('faInline').hidden,key);
  assert.equal(await page.locator('#v-quote').count(),1);assert.deepEqual(errors,[]);checks.push({realLedger:key,openedInline:true});await page.close();
 }
 console.log(JSON.stringify({checks,realAIInvocations:0,realDeviceRequests:0,realAccountWrites:0},null,2));
}finally{if(browser)await browser.close();server.close();}
