/* Real Studio queue/actions in Chrome; local synthetic accounts and server only. */
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile,mkdir} from 'node:fs/promises';
import {resolve,extname} from 'node:path';
import {pathToFileURL} from 'node:url';
const root=resolve(import.meta.dirname,'..'),home=await readFile(resolve(root,'index.html'),'utf8');
const part=(a,b)=>{const i=home.indexOf(a),j=home.indexOf(b,i);assert.ok(i>=0&&j>i,a);return home.slice(i,j)};
const {chromium}=await import(pathToFileURL('C:/Users/Porsche/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs'));
const css=part('.stu-sec{','/* ร้านของฉัน */');
const html=`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/fonts/kanit.css"><link rel="stylesheet" href="/icons/ti.css"><style>:root{--kb:Kanit,system-ui;--kd:Kanit,system-ui;--ink:#f6f6f6;--surface:#19191b;--surface-2:#242427;--line:#353538;--line-2:#2b2b2e;--muted:#b4b4bd;--faint:#8c8c96;--accent:#ed8a42}*{box-sizing:border-box}body{margin:0;background:#101012;color:var(--ink);font:14px var(--kb)}main{max-width:760px;margin:auto;padding:20px}button{font:inherit}#notice{display:block;padding:10px;color:#edb689}.stu-cards{display:grid;gap:10px}${css}</style></head><body><main><h1>Studio · My jobs</h1><section id="dBody"></section><output id="notice"></output></main><div id="bs"></div><script>
let U={uid:'mech',getIdToken:async()=> 'fixture-mech'},ME={technician:{id:'shop-mech'}},MODE='tech',DT='queue',JOBS=[],THREADS=[],POSTS=[],JOBS_OK=false,JOBS_ERR=null,NEAR=null;
const API=location.origin,$=id=>document.getElementById(id),T=(th,en)=>en,STATUS={},URGENT_MS=3*3600000;
const myShop=()=>ME.technician,esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])),money=n=>String(n),distHTML=n=>n+' km';
const toast=s=>{$('notice').textContent=s},formPop=()=>{},fieldOf=()=>'',renderActive=()=>{},renderUsed=()=>{},syncGarage=()=>{},saveSnap=()=>{},bellDiff=()=>{},LiveShare={sync(){}},setTab2=()=>{};
window.openedJobs=[];const openJob=id=>openedJobs.push(id),openPost=()=>{};
${part('async function api(path,o){','function needLogin(){')}
${part('async function busy(btn,fn){','/* ═══ กล่องเตือน')}
${part('let RJ=null','function queueDot(){')}
${part('const techJobs=','/* คำขอ/ข้อเสนอที่ยังไม่ตกลงกัน')}
${part('const JOB_TTL=','async function dash(){')}
${part('const NEXT={requested:','/* ── ข้อความ: ลูกค้าทักถาม')}
function drawTab(){tabQueue()}function queueDot(){tabQueue()}
window.switchAccount=async()=>{U={uid:'other',getIdToken:async()=> 'fixture-other'};ME={technician:{id:'shop-other'}};JOBS=[];JOBS_OK=true;tabQueue();if(RJ)await RJ;await refreshJobs()};
refreshJobs();</script></body></html>`;
let rows=[],offline=false,postDelay=0,getDelay=0;const writes=[],errors=[],results=[];
function reset(count=2){rows=['completed','cancelled','done','working','disputed','requested','quoted','accepted','enroute',...Array(Math.max(0,count-2)).fill('completed')].map((status,i)=>({id:crypto.randomUUID(),owner:'mech',side:'technician',status,revision:1,car:'Fixture car '+i,symptom:'Inspect the engine noise',updatedAt:Date.now()-i,createdAt:Date.now(),needsMe:!['completed','cancelled'].includes(status),archived:false}));rows.push({id:crypto.randomUUID(),owner:'mech',side:'customer',status:'completed',revision:1,car:'My own customer job',createdAt:Date.now(),updatedAt:Date.now(),archived:false});rows.push({id:crypto.randomUUID(),owner:'other',side:'technician',status:'completed',revision:1,car:'Other mechanic job',createdAt:Date.now(),updatedAt:Date.now(),archived:false});offline=false;postDelay=0;getDelay=0;writes.length=0}
const server=createServer(async(req,res)=>{try{
  const p=new URL(req.url,'http://localhost').pathname,owner=req.headers.authorization==='Bearer fixture-other'?'other':'mech';res.setHeader('Cache-Control','no-store');
  if(p==='/favicon.ico'){res.writeHead(204);res.end();return}
  if(p==='/'){res.setHeader('Content-Type','text/html; charset=utf-8');res.end(html);return}
  if(p==='/api/tech/jobs/archive'){
    let raw='';for await(const c of req)raw+=c;const body=JSON.parse(raw);writes.push({owner,...body});await new Promise(r=>setTimeout(r,postDelay));
    if(offline){res.writeHead(503);res.end('{"error":"Fixture connection failed"}');return}
    const selected=rows.filter(j=>body.ids.includes(j.id)&&j.owner===owner&&j.side==='technician');assert.equal(selected.length,body.ids.length);assert.ok(selected.every(j=>['completed','cancelled'].includes(j.status)));
    for(const j of selected){j.archived=body.archived;j.archiveVersion=(j.archiveVersion||0)+1}res.setHeader('Content-Type','application/json');res.end(JSON.stringify({ok:true,jobs:selected}));return;
  }
  if(p==='/api/tech/jobs'){const snapshot=structuredClone(rows.filter(j=>j.owner===owner)),delay=getDelay;await new Promise(r=>setTimeout(r,delay));res.setHeader('Content-Type','application/json');res.end(JSON.stringify({jobs:snapshot}));return}
  if(p==='/api/tech/posts'||p==='/api/tech/threads'){res.setHeader('Content-Type','application/json');res.end(JSON.stringify({posts:[],threads:[]}));return}
  if(!/^\/[\w/.-]+$/.test(p))throw Error('path');res.setHeader('Content-Type',({'.js':'text/javascript','.css':'text/css','.woff2':'font/woff2'})[extname(p)]||'text/plain');res.end(await readFile(resolve(root,p.slice(1))));
}catch(e){errors.push(e.message);res.writeHead(500);res.end('{}')}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+server.address().port,browser=await chromium.launch({headless:true,channel:'chrome'});
try{
  for(const width of [320,390,1280]){
    reset();const ctx=await browser.newContext({viewport:{width,height:900}}),page=await ctx.newPage();page.setDefaultTimeout(10000);page.on('pageerror',e=>errors.push(e.message));
    await page.goto(base);await page.locator('[data-past-list]').waitFor();await page.locator('[data-past-list] summary').click();assert.equal(await page.locator('[data-archive]').count(),2);
    const ids=rows.filter(j=>j.owner==='mech'&&j.side==='technician'&&['completed','cancelled'].includes(j.status)).map(j=>j.id),active=rows.filter(j=>j.owner==='mech'&&!['completed','cancelled'].includes(j.status)).map(j=>j.id);
    page.once('dialog',d=>d.dismiss());await page.locator('#stuClearPast').click();assert.equal(writes.length,0);
    page.once('dialog',d=>d.accept());await page.locator('[data-archive]').first().click();await page.waitForFunction(()=>!JOB_ARCHIVE_PENDING);assert.equal(await page.locator('[data-archive]').count(),1);
    await page.locator('[data-cleared-list] summary').click();assert.equal(await page.locator('[data-restore]').count(),1);await page.locator('[data-cleared-list] [data-j]').click();assert.equal((await page.evaluate(()=>openedJobs)).length,1,'cleared history still opens');
    await page.locator('[data-restore]').click();await page.waitForFunction(()=>!JOB_ARCHIVE_PENDING);assert.equal(await page.locator('[data-archive]').count(),2);
    offline=true;page.once('dialog',d=>d.accept());await page.locator('#stuClearPast').click();await page.waitForFunction(()=>!JOB_ARCHIVE_PENDING);assert.equal(await page.locator('[data-archive]').count(),2);assert.match(await page.locator('#notice').innerText(),/connection failed/);offline=false;
    getDelay=350;await page.evaluate(()=>{refreshJobs();return null});getDelay=0;
    page.once('dialog',d=>d.accept());await page.locator('#stuClearPast').click();await page.waitForFunction(()=>!JOB_ARCHIVE_PENDING);assert.equal(await page.locator('[data-past-list]').count(),0,'old in-flight reads cannot undo the clear');
    for(const id of active)assert.equal(await page.locator('[data-j="'+id+'"]').count(),1,'active jobs remain');
    const peer=await ctx.newPage();await peer.goto(base);await peer.locator('[data-cleared-list]').waitFor();assert.equal(await peer.locator('[data-past-list]').count(),0,'another device/browser read sees server clear state');await peer.close();
    await page.reload();await page.locator('[data-cleared-list] summary').click();assert.equal(await page.locator('[data-restore]').count(),2);
    await mkdir(resolve(root,'.qa/studio-job-archive'),{recursive:true});await page.screenshot({path:resolve(root,'.qa/studio-job-archive/cleared-'+width+'.png'),fullPage:true});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
    assert.ok(writes.every(w=>w.ids.every(id=>ids.includes(id))),'never clear customer or unfinished jobs');results.push({width,individualClear:true,restore:true,bulkClear:true,reloadAndPeer:true,offlinePreservesList:true,staleReadIgnored:true});await ctx.close();
  }
  reset(26);const page=await browser.newPage({viewport:{width:390,height:844}});page.setDefaultTimeout(10000);page.on('pageerror',e=>errors.push(e.message));await page.goto(base);await page.locator('[data-past-list] summary').click();assert.equal(await page.locator('[data-archive]').count(),20);page.once('dialog',d=>d.accept());await page.locator('#stuClearPast').click();await page.waitForFunction(()=>!JOB_ARCHIVE_PENDING);assert.equal(writes[0].ids.length,26);assert.equal(rows.filter(j=>j.archived).length,26);results.push({bulkIncludesAllLoadedPages:true});
  await page.locator('[data-cleared-list] summary').click();await page.evaluate(()=>{$('notice').textContent=''});postDelay=500;await page.locator('[data-restore]').first().click();await page.evaluate(()=>switchAccount());await page.waitForFunction(()=>!JOB_ARCHIVE_PENDING);assert.equal(await page.locator('[data-archive]').count(),1);assert.equal(await page.locator('[data-restore]').count(),0);assert.equal(await page.locator('#notice').innerText(),'');assert.equal(rows.find(j=>j.owner==='other').archived,false);results.push({lateOldAccountResponseIgnored:true});await page.close();
  assert.deepEqual(errors,[]);console.log(JSON.stringify({ok:true,scenarios:results,pageErrors:errors,productionWrites:0}));
}finally{await browser.close();server.closeAllConnections();await new Promise(r=>server.close(r))}
