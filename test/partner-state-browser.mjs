/* Real Chrome with the actual shared settings/state code and /join gate.
   Synthetic identities and local read-only endpoints only; no real submissions. */
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile,mkdir} from 'node:fs/promises';
import {resolve,extname} from 'node:path';
import {pathToFileURL} from 'node:url';
const root=resolve(import.meta.dirname,'..');
const {chromium}=await import(pathToFileURL('C:/Users/Porsche/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs'));
const home=await readFile(resolve(root,'index.html'),'utf8');
const join=home.slice(home.indexOf('async function openJoin(){'),home.indexOf('/* ใบสมัครช่างเป็นขั้น',home.indexOf('async function openJoin(){')));
const landing=home.slice(home.indexOf('function landing('),home.indexOf('function terms(){',home.indexOf('function landing(')));
let offline=false,delay=500,technician={id:'existing-shop',test:true,verified:false},application=null;
const requests=[],errors=[],results=[];
const head=`<!doctype html><html lang="th"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/fonts/kanit.css"><link rel="stylesheet" href="/settings.css"><link rel="stylesheet" href="/partner-entry.css"><style>body{margin:0;font-family:Kanit,system-ui;background:#121315;color:#eee}#bs{padding:24px}#bs:not(.on){display:none}.jx-gl,.jx-mark{display:none}button{padding:16px}#bsB,#bsF{max-width:720px;margin:auto}</style>
<script>
window.BACKEND_URL=location.origin;window.__SPIRE_PAGE__='fixture';window.spireT=a=>a;window.lang='th';
const authListeners=[];window.currentUser={uid:'one',name:'Fixture'};
window.spireAuth={currentUser:{uid:'one',getIdToken:async()=> 'fixture-one'},onAuthStateChanged(fn){authListeners.push(fn);queueMicrotask(()=>fn(this.currentUser))}};
window.switchFixture=uid=>{window.currentUser={uid,name:'Fixture'};spireAuth.currentUser=uid?{uid,getIdToken:async()=> 'fixture-'+uid}:null;authListeners.forEach(fn=>fn(spireAuth.currentUser))};
window.cardStates=[];new MutationObserver(()=>{const a=document.querySelector('[data-partner]');if(a)cardStates.push(a.className)}).observe(document.documentElement,{childList:true,subtree:true});
</script><script src="/partner-state.js"></script><script src="/partner-entry.js"></script></head>`;
const profile=head+`<body><script src="/settings.js"></script><script>document.addEventListener('DOMContentLoaded',()=>CendonSettings.open());</script></body></html>`;
const applicationPage=head+`<body><section id="vTech" hidden>UNEXPECTED STUDIO</section><div id="bs"><div id="bsB"></div><div id="bsF"></div></div><script>
const $=id=>document.getElementById(id),U=spireAuth.currentUser,SH={cur:null,stack:[]},LOGO='',TH=true,ls={get:k=>JSON.parse(localStorage.getItem(k)||'null')};
let BOOT_TECH=true,ME=null;const T=a=>a,esc=s=>String(s),DIDIT=()=>false,dk=()=>[],wizBack=()=>false;
function sheet(o){SH.cur=o;$('bs').className='on';$('bsB').innerHTML=(o.body||'')+'<p id="err"></p>';$('bsF').innerHTML=o.foot||'';o.mount?.()}
const refreshMe=async()=>{try{ME=await CendonPartnerState.refresh(true);return true}catch{return false}},techPolicy=async()=>({ok:true}),fx3d=()=>{},terms=()=>{},decided=()=>false;
const openStudio=()=>{CendonPartnerEntry.hide();sheet({body:'<h1 id="existingShop">Existing shop '+ME.technician.id+'</h1>'})},statusPage=()=>{CendonPartnerEntry.hide();sheet({body:'<h1 id="existingApplication">Existing application</h1>'})};
${landing}\n${join}\nopenJoin();</script></body></html>`;
const server=createServer(async(req,res)=>{try{
  const p=new URL(req.url,'http://localhost').pathname;requests.push({method:req.method,path:p});res.setHeader('Cache-Control','no-store');
  if(p==='/api/tech/me'){
    const uid=req.headers.authorization==='Bearer fixture-two'?'two':'one',t=technician,a=application,fail=offline;
    await new Promise(r=>setTimeout(r,delay));res.setHeader('Content-Type','application/json');
    if(fail){res.writeHead(503);res.end('{"error":"fixture offline"}');return}
    res.end(JSON.stringify({uid,technician:uid==='two'?null:t,application:uid==='two'?null:a}));return;
  }
  if(p==='/api/quota'){res.setHeader('Content-Type','application/json');res.end('{}');return}
  if(['/profile','/garage','/chat','/news','/spares'].includes(p)){res.setHeader('Content-Type','text/html; charset=utf-8');res.end(profile);return}
  if(p==='/join'||p==='/studio'){res.setHeader('Content-Type','text/html; charset=utf-8');res.end(applicationPage);return}
  if(!/^\/[\w/.-]+$/.test(p))throw Error('path');res.setHeader('Content-Type',({'.js':'text/javascript','.css':'text/css','.woff2':'font/woff2'})[extname(p)]||'text/plain');res.end(await readFile(resolve(root,p.slice(1))));
}catch{res.writeHead(404);res.end()}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+server.address().port;
const browser=await chromium.launch({headless:true,channel:'chrome'}),ctx=await browser.newContext({viewport:{width:390,height:844},isMobile:true,locale:'th-TH'}),page=await ctx.newPage();
page.on('pageerror',e=>errors.push(e.message));
try{
  for(const origin of ['/profile','/garage','/chat','/news','/spares']){
    await page.goto(base+origin);await page.evaluate(()=>localStorage.clear());await page.reload();
    await page.waitForFunction(()=>document.querySelector('[data-partner]')?.classList.contains('st-p-shop'));
    assert.equal(await page.locator('[data-partner]').getAttribute('href'),'/studio');
    assert.equal(await page.evaluate(()=>cardStates.some(s=>s.includes('st-p-none'))),false,'new-device restoration must not flash Apply');
    await page.locator('[data-partner]').click();await page.locator('#existingShop').waitFor();assert.equal(await page.locator('#lGo').count(),0);results.push('empty-cache '+origin);
  }
  await page.goto(base+'/profile');await page.evaluate(()=>localStorage.setItem('spire_partner',JSON.stringify({uid:'one',s:'none'})));await page.reload();
  await page.waitForFunction(()=>document.querySelector('[data-partner]')?.classList.contains('st-p-shop'));
  assert.equal(await page.evaluate(()=>cardStates.some(s=>s.includes('st-p-none'))),false);results.push('stale negative cache');
  await page.goto(base+'/profile');await page.evaluate(()=>localStorage.setItem('spire_partner',JSON.stringify({uid:'one',s:'shop',registered:false})));await page.reload();
  assert.equal(await page.locator('[data-partner]').getAttribute('href'),'/studio');results.push('legacy/trial cache');

  technician={id:'existing-shop',test:true,verified:false,suspended:true,identityHold:false};
  await page.goto(base+'/profile');await page.evaluate(()=>localStorage.clear());await page.reload();
  await page.waitForFunction(()=>CendonPartnerState.peek('one').suspended===true);
  assert.equal(await page.locator('[data-partner]').getAttribute('href'),'/studio');
  assert.match(await page.locator('[data-partner]').innerText(),/ร้านถูกพักใช้งาน/);
  assert.equal(await page.evaluate(()=>cardStates.some(s=>s.includes('st-p-none'))),false);
  await page.locator('[data-partner]').click();await page.locator('#existingShop').waitFor();
  assert.equal(await page.locator('#lGo').count(),0);results.push('suspended trial shop keeps Studio after cache clear');
  technician={id:'existing-shop',test:true,verified:false};

  offline=true;await page.goto(base+'/profile');await page.waitForFunction(()=>CendonPartnerState.peek('one').phase==='offline');
  assert.equal(await page.locator('[data-partner]').getAttribute('href'),'/studio');await page.locator('[data-partner]').click();
  await page.locator('#jRetry').waitFor();assert.equal(await page.locator('#lGo').count(),0);results.push('offline existing shop');
  await page.goto(base+'/profile');await page.evaluate(()=>localStorage.clear());await page.reload();await page.waitForFunction(()=>CendonPartnerState.peek('one').phase==='offline');
  assert.match(await page.locator('[data-partner]').innerText(),/ไม่ต้องสมัครซ้ำ/);await page.locator('[data-partner]').click();await page.locator('#jRetry').waitFor();results.push('offline empty cache');

  offline=false;delay=1500;await page.goto(base+'/profile');await page.evaluate(()=>switchFixture('two'));
  await page.waitForFunction(()=>CendonPartnerState.peek('two').phase==='ready');await page.waitForTimeout(200);
  assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('spire_partner')).uid),'two');assert.equal(await page.locator('[data-partner]').getAttribute('href'),'/join');results.push('account switch in flight');

  delay=50;technician=null;application={status:'pending'};await page.goto(base+'/profile');await page.waitForFunction(()=>document.querySelector('[data-partner]')?.classList.contains('st-p-pending'));
  await page.locator('[data-partner]').click();await page.locator('#existingApplication').waitFor();results.push('existing application');
  application=null;await page.goto(base+'/profile');await page.waitForFunction(()=>document.querySelector('[data-partner]')?.classList.contains('st-p-none'));
  await page.locator('[data-partner]').click();await page.waitForFunction(()=>document.getElementById('lGo')&&!document.getElementById('lGo').disabled);results.push('confirmed new applicant');
  await mkdir(resolve(root,'.qa/partner-state'),{recursive:true});await page.screenshot({path:resolve(root,'.qa/partner-state/new-applicant.png')});
  assert.ok(requests.every(r=>r.method==='GET'));assert.ok(!requests.some(r=>r.path==='/api/tech/apply'));assert.deepEqual(errors,[]);
  console.log(JSON.stringify({ok:true,scenarios:results,applicationWrites:0,pageErrors:errors}));
}finally{await browser.close();server.closeAllConnections();await new Promise(r=>server.close(r))}
