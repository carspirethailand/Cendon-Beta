/* Actual shared Bell UI in Chrome. Synthetic identities/local storage only; no production requests. */
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile,mkdir} from 'node:fs/promises';
import {resolve,extname} from 'node:path';
import {pathToFileURL} from 'node:url';
const root=resolve(import.meta.dirname,'..');
const {chromium}=await import(pathToFileURL('C:/Users/Porsche/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs'));
const html=`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/fonts/kanit.css"><link rel="stylesheet" href="/icons/ti.css"><style>body{margin:0;background:#f6f5f2;font-family:Kanit,system-ui;color:#151515}.navwrap{margin:16px 24px;padding:12px;display:flex;justify-content:flex-end}.nav-right{display:flex}.page{padding:80px 24px}.cb-m{background:white}@media(max-width:760px){.navwrap{display:none}}</style><script>
window.lang='en';window.spireT=(th,en)=>en||th;window.spireAuth={currentUser:{uid:'one',getIdToken:async()=> 'fixture'}};
window.CendonScope={mine:owner=>owner===spireAuth.currentUser?.uid};window.CendonChatJobs={};window.CendonBellOwnPoll=true;
window.fixtureHidden=false;Object.defineProperty(document,'hidden',{configurable:true,get:()=>window.fixtureHidden});
window.fixtureWrites=[];window.switchUser=uid=>{spireAuth.currentUser=uid?{uid}:null;dispatchEvent(new Event('cendon:auth-ready'))};
window.addNotice=id=>CendonBell.add({id,title:'Quote '+id,body:'A local fixture notification',url:'/jobs',kind:'quote'});
window.stableKeys=['spire_jobs','spire_msgs','spire_garage','spire_notifOn','spire_pushSub','spire_pushOwner','spire_km_remind'];
window.stableState=()=>Object.fromEntries(stableKeys.map(k=>[k,localStorage.getItem(k)]));
window.seed=()=>{localStorage.clear();localStorage.setItem('spire_jobs','fixture jobs');localStorage.setItem('spire_msgs','fixture chat');localStorage.setItem('spire_garage','[]');localStorage.setItem('spire_notifOn','true');localStorage.setItem('spire_pushSub','false');localStorage.setItem('spire_pushOwner','one');localStorage.setItem('spire_km_remind',JSON.stringify({uid:'one',on:true}));addNotice('first');addNotice('second')};
</script><script src="/bell.js" defer></script></head><body><nav class="navwrap"><div class="nav-right"><button class="cb-bell cb-d"><i class="ti ti-bell"></i><em hidden></em></button><span id="avatarBtn"></span></div></nav><button class="cb-bell cb-m cb-pre"><i class="ti ti-bell"></i><em hidden></em></button><main class="page"><h1>Notification inbox</h1><p>Local read and clear fixtures</p><button id="outside">Outside</button></main><script>addEventListener('DOMContentLoaded',()=>CendonBell.setApi({get:async()=>({on:true,line:true}),post:async(p,b)=>{fixtureWrites.push({p,b});return {ok:true}}}));</script></body></html>`;
const requests=[],errors=[],results=[];
const server=createServer(async(req,res)=>{try{
  const p=new URL(req.url,'http://localhost').pathname;requests.push({method:req.method,path:p});res.setHeader('Cache-Control','no-store');
  if(p==='/fixture'){res.setHeader('Content-Type','text/html; charset=utf-8');res.end(html);return}
  if(!/^\/[\w/.-]+$/.test(p))throw Error('path');res.setHeader('Content-Type',({'.js':'text/javascript','.css':'text/css','.woff2':'font/woff2'})[extname(p)]||'text/plain');res.end(await readFile(resolve(root,p.slice(1))));
}catch{res.writeHead(404);res.end()}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+server.address().port;
const browser=await chromium.launch({headless:true,channel:'chrome'});
try{
  for(const width of [320,390,1280]){
    const ctx=await browser.newContext({viewport:{width,height:844},locale:'en-US'}),page=await ctx.newPage();page.setDefaultTimeout(10000);page.on('pageerror',e=>errors.push(e.message));
    await page.goto(base+'/fixture');await page.waitForFunction(()=>window.CendonBell?.buttons().length===2);await page.evaluate(()=>seed());
    const selector=width>760?'.cb-d':'.cb-m',bell=page.locator(selector);
    assert.equal(await page.evaluate(()=>CendonBell.unread()),2);assert.equal(await bell.locator('em').innerText(),'2');
    const stable=await page.evaluate(()=>stableState());await bell.click();
    assert.equal(await page.evaluate(()=>CendonBell.unread()),0);assert.equal(await page.locator('.cb-bell em:not([hidden])').count(),0);assert.equal(await page.locator('.nb-it').count(),2);assert.equal(await page.locator('.nb-it.new').count(),0);
    await page.evaluate(()=>addNotice('live'));assert.equal(await page.locator('.nb-it').count(),3);assert.equal(await page.evaluate(()=>CendonBell.unread()),0);
    await page.evaluate(()=>{fixtureHidden=true;addNotice('hidden')});assert.equal(await page.evaluate(()=>CendonBell.unread()),1);
    await page.evaluate(()=>{fixtureHidden=false;document.dispatchEvent(new Event('visibilitychange'))});assert.equal(await page.evaluate(()=>CendonBell.unread()),0);
    await page.keyboard.press('Escape');assert.equal(await page.locator('.nb-pop').count(),0);assert.equal(await bell.getAttribute('aria-expanded'),'false');
    await page.evaluate(()=>addNotice('closed'));assert.equal(await page.evaluate(()=>CendonBell.unread()),1);await page.reload();await bell.click();
    assert.equal(await page.evaluate(()=>CendonBell.unread()),0);assert.equal(await page.locator('.nb-it').count(),5);
    await page.locator('[data-a="clear"]').click();assert.equal(await page.locator('.nb-it').count(),0);assert.equal(await page.locator('[data-a="clear"]').isDisabled(),true);assert.match(await page.locator('[role="status"]').innerText(),/jobs and chats are unchanged/);
    assert.deepEqual(await page.evaluate(()=>stableState()),stable);assert.deepEqual(await page.evaluate(()=>fixtureWrites),[]);
    await mkdir(resolve(root,'.qa/notifications'),{recursive:true});await page.screenshot({path:resolve(root,'.qa/notifications/clear-'+width+'.png')});
    const bounds=await page.locator('.nb-pop').boundingBox();assert.ok(bounds.x>=0&&bounds.x+bounds.width<=width+1);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
    await page.reload();await page.evaluate(()=>{addNotice('first');addNotice('live');addNotice('closed')});assert.equal(await page.evaluate(()=>CendonBell.list().length),0,'dismissed IDs do not return on replay/reload');
    await page.evaluate(()=>addNotice('new-after-clear'));assert.equal(await page.evaluate(()=>CendonBell.unread()),1);await bell.click();assert.equal(await page.locator('.nb-it').count(),1);
    const oldClear=await page.locator('[data-a="clear"]').elementHandle();await page.evaluate(()=>{switchUser('two');addNotice('private-two')});assert.equal(await page.locator('.nb-pop').count(),0);await oldClear.evaluate(el=>el.onclick());assert.equal(await page.evaluate(()=>CendonBell.list()[0].id),'private-two');
    await bell.click();assert.equal(await page.locator('.nb-it').count(),1);assert.equal(await page.evaluate(()=>CendonBell.unread()),0);await page.keyboard.press('Escape');
    for(let i=0;i<12;i++){await bell.click();await page.keyboard.press('Escape')}
    await bell.click();await page.mouse.click(4,820);assert.equal(await page.locator('.nb-pop').count(),0);assert.equal(await bell.getAttribute('aria-expanded'),'false');
    results.push({width,openReads:true,clearPersists:true,hiddenArrivalUnread:true,accountIsolation:true,openCloseCycles:12});await ctx.close();
  }
  const ctx=await browser.newContext(),a=await ctx.newPage(),b=await ctx.newPage();for(const p of [a,b])p.on('pageerror',e=>errors.push(e.message));
  await a.goto(base+'/fixture');await b.goto(base+'/fixture');await a.evaluate(()=>seed());await b.waitForFunction(()=>CendonBell.unread()===2);await b.waitForFunction(()=>document.querySelector('.cb-d em').textContent==='2');
  await a.locator('.cb-d').click();await b.waitForFunction(()=>document.querySelector('.cb-d em').hidden);assert.equal(await b.evaluate(()=>CendonBell.list().length),2);
  await a.locator('[data-a="clear"]').click();await b.waitForFunction(()=>CendonBell.list().length===0);results.push({crossTabReadAndClear:true});await ctx.close();
  assert.deepEqual(errors,[]);assert.ok(requests.every(x=>x.method==='GET'));assert.ok(!requests.some(x=>x.path.startsWith('/api/')));
  console.log(JSON.stringify({ok:true,scenarios:results,pageErrors:errors,productionRequests:0}));
}finally{await browser.close();server.closeAllConnections();await new Promise(r=>server.close(r))}
