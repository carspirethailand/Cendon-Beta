/* Local fixtures only: no real AI requests, messages, credentials or account edits. */
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile,mkdir} from 'node:fs/promises';
import {resolve,extname} from 'node:path';
import {pathToFileURL} from 'node:url';
const root=resolve(import.meta.dirname,'..'),chat=await readFile(resolve(root,'chat.html'),'utf8');
const section=(a,b)=>{const i=chat.indexOf(a),j=chat.indexOf(b,i);assert.ok(i>=0&&j>i,a);return chat.slice(i,j)};
const edit=section('function editMsg(i,el){','function msgHTML(m){');
const jobs=section('function currentSessionId(){','function loadSession(){');
const head='<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/fonts/kanit.css"><link rel="stylesheet" href="/icons/ti.css"><link rel="stylesheet" href="/stability.css"><link rel="stylesheet" href="/primary-material.css">';
const auth="window.BACKEND_URL=location.origin;window.spireAuth={currentUser:{uid:'one',getIdToken:async()=> 'fixture-one'}};window.auth=spireAuth;window.lang='en';";
const shopHtml=head+`<link rel="stylesheet" href="/shop-search.css"><style>:root{--surface:#fff;--ink:#1b1b1b;--muted:#666;--line:#ddd;--grad:linear-gradient(140deg,#ef8a3d,#d35b2e)}body{background:#f8f6f2;margin:20px;font-family:Kanit}.btn.primary{background:var(--grad);color:#fff;border:0;display:flex;align-items:center}.scroll{max-width:1160px;margin:auto}</style><section id="v-shop"><div class="scroll"></div></section><script>${auth}
localStorage.setItem('spire_garage',JSON.stringify([{id:'one',make:'Honda',model:'Civic',year:2020},{id:'two',make:'Toyota',model:'Fortuner',year:2013}]));localStorage.setItem('spire_selCar',JSON.stringify('one'));
window.locationRequests=0;Object.defineProperty(navigator,'geolocation',{value:{getCurrentPosition(){locationRequests++}}});</script><script src="/car-menu.js"></script><script src="/shop-search.js" defer></script>`;
const shopPage=(await readFile(resolve(root,'spares.html'),'utf8')).replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,'').replace('</body>',`<script>${auth}localStorage.setItem('spire_garage',JSON.stringify([{id:'one',make:'Honda',model:'Civic',year:2020}]));localStorage.setItem('spire_selCar',JSON.stringify('one'));</script><script src="/car-menu.js"></script><script src="/shop-search.js" defer></script></body>`);
const chatHtml=head+`<script src="/chat-render.js"></script><script src="/chat-jobs.js" defer></script><div id="messages"></div><input id="inp"><script>${auth}
const $=id=>document.getElementById(id),TT=(th,en)=>en,esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));let messages=[],sending=false;
const LS={get(k,d){try{return JSON.parse(localStorage.getItem(auth.currentUser.uid+':'+k))??d}catch{return d}},set(k,v){localStorage.setItem(auth.currentUser.uid+':'+k,JSON.stringify(v))}};
const selCar=()=>({id:'car-one'}),sessKey=()=> 'sess_car-one',curKey=()=> 'cursess_car-one',noTools=x=>x,parseAsk=x=>({text:x}),attHTML=()=>'',updateSend=()=>{},renderChips=()=>{},bellAi=()=>{},toast=()=>{};
function saveSession(){const list=LS.get(sessKey(),[]),s=list.find(x=>x.id===currentSessionId());if(s){s.msgs=structuredClone(messages);LS.set(sessKey(),list)}}
function renderMessages(){CendonChatRender.paint($('messages'),messages,m=>'<article class="msg '+(m.role==='user'?'me':'ai')+'"><div class="bubble">'+esc(m.text||'Thinking')+'</div></article>')}
${jobs}
${edit}
window.seed=()=>{const id='s1792720000000';LS.set(sessKey(),[{id,msgs:[{role:'user',text:'Original question'}]}]);LS.set(curKey(),id);messages=LS.get(sessKey(),[])[0].msgs;renderMessages()};
window.start=()=>{const b={jobId:crypto.randomUUID(),sessionId:currentSessionId(),carId:'car-one',contents:[{role:'user',parts:[{text:'Synthetic question'}]}]};messages.push({role:'ai',text:'',jobId:b.jobId,streaming:true});saveSession();renderMessages();CendonChatJobs.run(b,auth.currentUser.uid,applyChatJob).catch(()=>{});return b.jobId};
window.editFirst=()=>editMsg(0,$('messages').firstElementChild);
window.openOther=()=>{LS.set(curKey(),'s1792720000001');const list=LS.get(sessKey(),[]);list.push({id:'s1792720000001',msgs:[{role:'user',text:'Other conversation'}]});LS.set(sessKey(),list);messages=list.at(-1).msgs;renderMessages()};
const list=LS.get(sessKey(),[]);messages=list.find(s=>s.id===currentSessionId())?.msgs||[];renderMessages();</script>`;
const navHtml=head+`<style>.nav-links{display:flex;gap:12px;background:white}.nav-links a{padding:16px;color:#555}.nav-ind{position:absolute;width:0}.btn{padding:14px;background:#e77b31;color:white}</style><div class="nav-links"><i class="nav-ind"></i><a href="/garage">Garage</a><a href="/spares" class="active">Shop</a></div><script src="/stability.js"></script><button class="btn primary" id="primary">Primary</button><button class="btn p" id="legacy">Legacy</button><style>.btn.p::after{left:-60%;width:40%;transform:skewX(-20deg);animation:sweep 3s infinite}</style>`;
let mode='setup',delay=false;const requests=[],jobRows=new Map(),errors=[];
const server=createServer(async(req,res)=>{try{const u=new URL(req.url,'http://fixture.test');res.setHeader('Cache-Control','no-store');
  if(['/shop-page','/shop-fixture','/chat-fixture','/garage','/spares'].includes(u.pathname)){res.setHeader('Content-Type','text/html; charset=utf-8');res.end(u.pathname==='/shop-page'?shopPage:u.pathname==='/shop-fixture'?shopHtml:u.pathname==='/chat-fixture'?chatHtml:navHtml);return}
  if(u.pathname==='/api/shop/status'){res.setHeader('Content-Type','application/json');res.end(JSON.stringify({providers:['shopee','amazon','aliexpress','ebay','maps'].map(id=>({id,name:id,state:mode==='ready'&&id==='ebay'?'ready':'setup_required'}))}));return}
  if(u.pathname==='/api/shop/search'){let raw='';for await(const x of req)raw+=x;const b=JSON.parse(raw);requests.push(b);if(delay)await new Promise(r=>setTimeout(r,500));
    res.setHeader('Content-Type','application/json');res.end(JSON.stringify({providers:b.providers.map(id=>({id,name:id,state:mode==='ready'&&id==='ebay'?'ready':'setup_required'})),items:mode==='ready'&&b.providers.includes('ebay')?[{provider:'ebay',title:'Fixture brake pads',url:'https://www.ebay.com/itm/1',price:23.5,currency:'USD'}]:[],places:[]}));return}
  if(u.pathname.startsWith('/api/ai/jobs')){const uid=(req.headers.authorization||'').replace('Bearer fixture-',''),id=u.pathname.split('/')[4];let output;
    if(req.method==='POST'){let raw='';for await(const x of req)raw+=x;const b=JSON.parse(raw),row={id:b.jobId,sessionId:b.sessionId,carId:b.carId,status:'running',uid};jobRows.set(row.id,row);setTimeout(()=>{row.status='complete';row.text='Completed while page was away'},1100);output={job:row}}
    else if(id){const row=jobRows.get(id);output=row?.uid===uid?{job:row}:{error:'not found'}}else output={jobs:[...jobRows.values()].filter(x=>x.uid===uid)};
    res.setHeader('Content-Type','application/json');res.end(JSON.stringify(output));return}
  if(!/^\/[\w/.-]+$/.test(u.pathname)||u.pathname.includes('..'))throw Error('path');res.setHeader('Content-Type',({'.js':'text/javascript','.css':'text/css','.woff2':'font/woff2'})[extname(u.pathname)]||'text/plain');res.end(await readFile(resolve(root,u.pathname.slice(1))));
}catch{res.writeHead(404);res.end()}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+server.address().port;
const {chromium}=await import(pathToFileURL('C:/Users/Porsche/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs'));
const browser=await chromium.launch({headless:true,channel:'chrome'}),context=await browser.newContext(),page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
try{
  await page.goto(base+'/shop-fixture');await page.waitForSelector('.ss-setup');assert.equal(await page.locator('.ss-product').count(),0);
  await page.locator('#ssCar').click();await page.locator('.cm-pop [data-c="two"]').click();assert.match(await page.locator('#ssCar').innerText(),/Fortuner/);assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('spire_selCar'))),'two');
  await page.locator('[data-provider="maps"]').click();await page.locator('#ssLocation').click();assert.equal(await page.evaluate(()=>locationRequests),0);assert.match(await page.locator('#ssStatus').innerText(),/not connected/);
  mode='ready';await page.reload();await page.locator('[data-provider="ebay"]').click();await page.locator('#ssQuery').fill('brake pads');await page.locator('#ssGo').click();await page.waitForSelector('.ss-product');assert.match(await page.locator('.ss-product strong').innerText(),/USD/);assert.equal(requests.at(-1).query,'Honda Civic 2020 brake pads');
  delay=true;await page.locator('#ssQuery').fill('filter');await page.locator('#ssGo').click();await page.locator('[data-provider="amazon"]').click();await page.waitForTimeout(650);assert.equal(await page.locator('.ss-product').count(),0,'old eBay response cannot overwrite Amazon');delay=false;
  for(const width of [320,390,1280]){await page.setViewportSize({width,height:900});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),String(width))}
  await mkdir(resolve(root,'.qa/feedback'),{recursive:true});await page.screenshot({path:resolve(root,'.qa/feedback/shop-desktop.png'),fullPage:true});
  await page.goto(base+'/chat-fixture');await page.evaluate(()=>seed());await page.evaluate(()=>editFirst());await page.locator('.m-edit').fill('discard me');await page.locator('.m-cancel').click();assert.equal(await page.locator('.m-edit').count(),0);assert.match(await page.locator('.bubble').innerText(),/Original question/);
  await page.evaluate(()=>editFirst());await page.locator('.m-edit').fill('discard Escape');await page.locator('.m-edit').press('Escape');assert.equal(await page.locator('.m-edit').count(),0);
  const id=await page.evaluate(()=>start());await page.waitForFunction(()=>document.querySelectorAll('.msg.ai').length===1);while(!jobRows.has(id))await new Promise(r=>setTimeout(r,20));
  await page.goto(base+'/garage');await new Promise(r=>setTimeout(r,1250));await page.goto(base+'/chat-fixture');await page.waitForFunction(()=>document.getElementById('messages').textContent.includes('Completed while page was away'));
  assert.equal(await page.locator('.msg.ai').count(),1,'one answer after re-entry');
  await page.evaluate(()=>seed());const second=await page.evaluate(()=>start());await page.evaluate(()=>openOther());while(!jobRows.has(second))await new Promise(r=>setTimeout(r,20));await page.waitForTimeout(1600);await page.evaluate(()=>CendonChatJobs.resume());
  assert.equal(await page.locator('#messages').innerText(),'Other conversation');assert.equal(await page.evaluate(()=>LS.get('sess_car-one',[])[0].msgs.at(-1).text),'Completed while page was away');
  await page.evaluate(()=>{auth.currentUser={uid:'two',getIdToken:async()=> 'fixture-two'};dispatchEvent(new Event('cendon:auth-ready'))});assert.equal(await page.evaluate(()=>LS.get('sess_car-one',[]).length),0);
  await page.goto(base+'/garage');assert.equal(await page.locator('.nav-links .active').innerText(),'Garage');await page.locator('.nav-links a[href="/spares"]').click();await page.waitForURL('**/spares');await page.goBack();assert.equal(await page.locator('.nav-links .active').innerText(),'Garage');assert.equal(await page.locator('.nav-ind').isVisible(),false);
  for(const id of ['primary','legacy']){const style=await page.locator('#'+id).evaluate(el=>{const s=getComputedStyle(el,'::after');return {image:s.backgroundImage,pointer:s.pointerEvents,left:s.left,animation:s.animationName}});assert.notEqual(style.image,'none');assert.equal(style.pointer,'none');assert.equal(style.left,'0px');assert.equal(style.animation,'none')}
  await page.goto(base+'/shop-page');await page.waitForSelector('#ssCar');
  const activeBackground=await page.locator('.nav-links a.active').evaluate(el=>getComputedStyle(el).backgroundColor);assert.notEqual(activeBackground,'rgba(0, 0, 0, 0)');assert.notEqual(activeBackground,'rgb(255, 255, 255)');
  for(const width of [390,1280]){await page.setViewportSize({width,height:900});assert.ok(await page.locator('#shopSearch').isVisible());assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await page.screenshot({path:resolve(root,'.qa/feedback/shop-shell-'+width+'.png'),fullPage:true})}
  assert.deepEqual(errors,[]);console.log('PASS: shop states/real prices/car picker/stale results/location consent/320–1280px + edit Cancel/Escape + background return/original conversation/account isolation + Back navbar + shared primary material (17 checks)');
}finally{await browser.close();server.closeAllConnections();await new Promise(r=>server.close(r))}
