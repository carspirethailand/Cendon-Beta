/* Full app documents, real Barba, synthetic account/API only. No live writes. */
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {resolve,extname} from 'node:path';
import {gzipSync} from 'node:zlib';
import {pathToFileURL} from 'node:url';
import {shouldShell,shellResponse} from '../lib/app-shell.mjs';
import {namespace} from '../app-routes.js';
const root=resolve(import.meta.dirname,'..'),serveRoot=process.env.CENDON_PROBE_ROOT||root;
const firebase=`window.firebase=window.firebase||(()=>{const u={uid:'perf-fixture',displayName:'Performance fixture',getIdToken:async()=> 'synthetic',getIdTokenResult:async()=>({claims:{}})};const a={currentUser:u,onAuthStateChanged(f){setTimeout(()=>f(u),100);return()=>{}},onIdTokenChanged(f){setTimeout(()=>f(u),100);return()=>{}},setPersistence:async()=>{},getRedirectResult:async()=>({user:null})};function auth(){return a}auth.Auth={Persistence:{LOCAL:'local'}};auth.GoogleAuthProvider=function(){};auth.OAuthProvider=function(){};return {apps:[],initializeApp(){this.apps.push({})},auth}})();`;
let classic=false,documents=0;const server=createServer(async(req,res)=>{try{
 const url=new URL(req.url,'http://'+req.headers.host);if(req.headers['sec-fetch-dest']==='document')documents++;
 const request=new Request(url,{headers:req.headers});if(!classic&&shouldShell(request)){const r=shellResponse(request);res.writeHead(r.status,Object.fromEntries(r.headers));res.end(await r.text());return;}
 let name=url.pathname==='/'?'index.html':url.pathname.slice(1);if(!extname(name)){const ns=namespace(url.href,url.origin);name=(ns==='home'?'index':ns||name)+'.html';}
 if(!/^[\w./-]+$/.test(name)||name.includes('..'))throw Error('path');const data=await readFile(resolve(serveRoot,name));
 res.setHeader('Content-Type',({'.js':'text/javascript','.css':'text/css','.html':'text/html; charset=utf-8','.woff2':'font/woff2','.svg':'image/svg+xml','.webp':'image/webp'})[extname(name)]||'application/octet-stream');if(/\.(js|css|html)$/.test(name)){res.setHeader('Content-Encoding','gzip');res.end(gzipSync(data));}else res.end(data);
 }catch{res.writeHead(404);res.end();}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+server.address().port;
const {chromium}=await import(pathToFileURL('C:/Users/Porsche/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs'));
const browser=await chromium.launch({headless:true,channel:'chrome'}),results=[];
try{for(const mode of ['classic','barba']){
 classic=mode==='classic';documents=0;const context=await browser.newContext({viewport:{width:393,height:852},serviceWorkers:'block'}),page=await context.newPage(),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 await context.route('**/*',async route=>{const u=new URL(route.request().url());if(u.origin===base)return route.continue();if(u.hostname==='www.gstatic.com'&&u.pathname.includes('firebase'))return route.fulfill({contentType:'text/javascript',body:firebase});if(u.pathname==='/api/onboarding')return route.fulfill({json:{status:'completed',completed:true,profile:{uid:'perf-fixture',name:'Fixture',lang:'en',distance:'km',currency:'THB',level:'enthusiast'}}});if(u.pathname.startsWith('/api/'))return route.fulfill({json:u.pathname==='/api/config'?{launch:null,features:{},now:Date.now()}:{cars:[],techs:[],gigs:[],posts:[],jobs:[],items:[],saved:[],user:{uid:'perf-fixture'}}});return route.abort();});
 await page.addInitScript(()=>{const uid='perf-fixture';localStorage.setItem('cendon_signed','1');localStorage.setItem('spire___owner',uid);localStorage.setItem('spire_theme','"light"');localStorage.setItem('spire_lang','"en"');localStorage.setItem('cendon_cfg',JSON.stringify({launch:null,got:Date.now()}));localStorage.setItem('spire_setup',JSON.stringify({uid,v:3,level:'enthusiast',lang:'en',distance:'km',currency:'THB'}));localStorage.setItem('spire___account_'+uid+'_status',JSON.stringify({status:'completed',completed:true,profile:{uid}}));localStorage.setItem('spire_cachedUser',JSON.stringify({uid,displayName:'Fixture'}));localStorage.setItem('cendon_paint_identity',JSON.stringify({uid,generation:'fixture'}));});
 const cdp=await context.newCDPSession(page);await cdp.send('Network.enable');await cdp.send('Network.emulateNetworkConditions',{offline:false,latency:80,downloadThroughput:1_500_000/8,uploadThroughput:750_000/8});await cdp.send('Emulation.setCPUThrottlingRate',{rate:4});
 const times={};let start=Date.now();await page.goto(base+'/',{waitUntil:'domcontentloaded',timeout:60000});
 if(!classic)await page.waitForFunction(()=>window.CendonApp&&document.getElementById('appOpening').hidden,{timeout:60000});
 else await page.waitForFunction(()=>document.readyState!=='loading'&&document.documentElement.dataset.gate!=='1'&&document.documentElement.dataset.level!=='pending');times.homeMs=Date.now()-start;
 for(const [label,path,ns]of [['firstGarageMs','/garage','garage'],['backHomeMs','/','home'],['revisitGarageMs','/garage','garage'],['firstChatMs','/chat','chat'],['returnHomeMs','/','home'],['revisitChatMs','/chat','chat']]){
  start=Date.now();if(classic){await page.evaluate(p=>{window.CendonPaint?.prepare(p);location.href=p;},path);await page.waitForURL(base+path);await page.waitForFunction(()=>document.readyState!=='loading'&&document.documentElement.dataset.gate!=='1'&&document.documentElement.dataset.level!=='pending');}
  else{await page.evaluate(p=>CendonApp.go(p),path);await page.waitForFunction(n=>CendonApp.current().namespace===n&&!barba.transitions.isRunning,ns,{timeout:60000});}
  times[label]=Date.now()-start;
 }
 if(!classic){assert.equal(documents,1);assert.equal(await page.locator('iframe[data-cendon-view=chat]').count(),1);assert.equal(await page.evaluate(()=>barba.version),'2.10.3');}
 results.push({mode,times,outerDocuments:documents,pageErrors:[...new Set(errors)]});await context.close();
 }
 const extra=results[1].pageErrors.filter(e=>!results[0].pageErrors.includes(e));assert.deepEqual(extra,[],'Barba must not introduce app runtime errors');console.log(JSON.stringify({synthetic:true,productionWrites:0,networkMbps:1.5,latencyMs:80,cpuSlowdown:4,results}));
}finally{await browser.close();server.closeAllConnections();await new Promise(r=>server.close(r));}
