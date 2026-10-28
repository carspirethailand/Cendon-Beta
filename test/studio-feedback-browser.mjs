/* Production CSS and actual sheet/quote handlers. Local fixtures only. */
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {resolve,extname} from 'node:path';
import {pathToFileURL} from 'node:url';
const root=resolve(import.meta.dirname,'..'),home=await readFile(resolve(root,'index.html'),'utf8');
const part=(a,b)=>{const i=home.indexOf(a),j=home.indexOf(b,i);assert.ok(i>=0&&j>i,a);return home.slice(i,j)};
const styles=[...home.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style>/gi)].map(m=>m[1]).join('\n');
const tabStart=home.indexOf('function setTab2(t,fromNav){'),tabCode=home.slice(tabStart,home.indexOf('\n}',tabStart)+2);
const code=part('const SH={','$("bsX").onclick=')+tabCode+part('const quoteCurrencyNote=','async function change(')+part('function act(j,a,btn){','/* ═══ แชต —')+part('function openPost(p){','/* ขั้นถัดไปของใบงาน')+part('$("stuNav").querySelectorAll("[data-sp]").forEach(b=>b.onclick=()=>{','document.querySelector(".stu-side .stu-brand").onclick=');
const pageHtml=`<!doctype html><html data-theme="light"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>${styles}</style><style>body{--stu-w:216px;margin:0}#vTech{display:grid!important;min-height:100vh}.stu-side{width:216px}.stu-nav button{width:100%}#testing{padding:24px}.pn{min-height:250px}</style>
<body data-mode="tech"><section class="stu" id="vTech"><aside class="stu-side"><nav class="stu-nav" id="stuNav"><button data-sp="jobs">Jobs</button><button data-sp="shop">Shop</button></nav></aside><main id="testing">Studio</main></section>
<div class="bs" id="bs"><div class="bg" id="bsBg"></div><div class="pn"><header class="hd"><button id="bsBack">Back</button><h2 id="bsT"></h2></header><div class="bd" id="bsB"></div><footer class="ft" id="bsF"></footer></div></div><div id="chat"></div>
<script src="/nav.js?v=2"></script><script>window.BACKEND_URL=location.origin;window.spireAuth={currentUser:{uid:'fixture'}};window.spireSetupRead=()=>({});localStorage.setItem('spire_setup',JSON.stringify({uid:'fixture',distance:'mi',currency:'USD'}));window.spireLang=()=> 'en';
const $=id=>document.getElementById(id),T=(th,en)=>en||th,esc=x=>String(x??''),money=n=>String(n),SFIRST={jobs:'queue',shop:'shop'},SPAGE={queue:'jobs',shop:'shop'};let DT='queue';
const stopJob=()=>{},cxStop=()=>{},IB_FROM=null,wireSeg=()=>{},proofCtx=()=>{},toast=()=>{},refreshJobs=()=>{},tabFind=()=>{},shrink=()=>{};
const busy=async(b,fn)=>fn(),api=async()=>({}),change=()=>{},ago=()=> 'Just now',drawTab=()=>{window.chosen=DT};
const distTxt=d=>CendonDisplayPrefs.distance(d),distHTML=d=>'<span data-distance-km="'+Number(d)+'">'+distTxt(d)+'</span>';
${code}
window.openThree=()=>{sheet({url:'/studio/shop',full:true,body:'Shop'});sheet({push:true,url:'/studio/shop/edit',full:true,body:'Edit'});sheet({push:true,url:'/studio/shop/edit/details',body:'Third level'});return SH.stack.length};
window.openQuote=()=>act({id:'fixture-job',role:'technician',status:'requested',requestedTime:'Tomorrow'},'quote');
window.openOffer=()=>openPost({id:'fixture-post',car:'Private Honda',symptom:'Private symptom',dist:16.09344,requestedTime:'Tomorrow',mode:'mobile',approxKm:1,area:'Private area',createdAt:Date.now()});Nav.start({base:'/'});
</script><script src="/display-prefs.js"></script></body></html>`;
const errors=[];const server=createServer(async(req,res)=>{try{const url=new URL(req.url,'http://fixture');res.setHeader('Cache-Control','no-store');
  if(url.pathname==='/'){res.setHeader('Content-Type','text/html');res.end(pageHtml);return}
  if(url.pathname==='/api/display-rates'){res.setHeader('Content-Type','application/json');res.end(JSON.stringify({result:'success',base_code:'THB',rates:{THB:1,USD:.03},time_last_update_unix:Math.floor(Date.now()/1000)}));return}
  if(!/^\/[\w/.-]+$/.test(url.pathname)||url.pathname.includes('..'))throw Error('path');res.setHeader('Content-Type',extname(url.pathname)==='.js'?'text/javascript':'text/plain');res.end(await readFile(resolve(root,url.pathname.slice(1))));
}catch{res.writeHead(404);res.end()}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+server.address().port;
const {chromium}=await import(pathToFileURL('C:/Users/Porsche/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs'));
const browser=await chromium.launch({headless:true,channel:'chrome'}),page=await browser.newPage({viewport:{width:1280,height:900}});page.on('pageerror',e=>errors.push(e.message));
try{
  await page.goto(base);assert.equal(await page.evaluate(()=>openThree()),2);await page.locator('#stuNav [data-sp="shop"]').click({timeout:3000});assert.equal(await page.evaluate(()=>chosen),'shop');assert.equal(await page.evaluate(()=>SH.stack.length),0);assert.equal(await page.locator('#bs').evaluate(e=>e.classList.contains('on')),false);
  await page.evaluate(()=>openThree());await page.locator('#stuNav [data-sp="shop"]').click({timeout:3000});assert.equal(await page.locator('#bs').evaluate(e=>e.classList.contains('on')),false,'current tab also dismisses stacked pages');
  await page.evaluate(()=>openQuote());for(const id of ['qL','qP','qT'])assert.match(await page.locator('#'+id).locator('..').innerText(),/THB/);
  await page.locator('#qL').fill('1000');await page.locator('#qL').dispatchEvent('input');assert.match(await page.locator('#qSum').innerText(),/1000/);assert.equal(await page.locator('#qL').inputValue(),'1000');assert.match(await page.locator('#bsB').innerText(),/Quotes are converted and stored in THB/);
  await page.evaluate(()=>openOffer());assert.match(await page.locator('[data-distance-km]').innerText(),/^10 mi$/);for(const id of ['oL','oP','oT'])assert.match(await page.locator('#'+id).locator('..').innerText(),/THB/);
  await page.evaluate(()=>{const p=JSON.parse(localStorage.getItem('spire_setup'));p.distance='km';localStorage.setItem('spire_setup',JSON.stringify(p));dispatchEvent(new CustomEvent('cendon:preferences'))});await page.waitForFunction(()=>document.querySelector('[data-distance-km]').textContent.includes('km'));assert.match(await page.locator('[data-distance-km]').innerText(),/^16\.09 km$/);
  for(const width of [390,1280]){await page.setViewportSize({width,height:900});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth))}
  assert.deepEqual(errors,[]);console.log('PASS: three nested Studio pages + current/different rail tabs + real quote/offer currency labels + canonical inputs + live distance change + 390/1280px');
}finally{await browser.close();server.closeAllConnections();await new Promise(r=>server.close(r))}
