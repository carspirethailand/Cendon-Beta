// Actual packaged documents + live primary controls; synthetic auth/API only.
// Optional footer code is deliberately held back. Readiness must not be a timer.
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile,copyFile,mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {resolve,join,extname} from 'node:path';
import {pathToFileURL} from 'node:url';
import {gzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {buildPageRuntime} from '../tools/build-page-runtime.mjs';
import {shellResponse,shouldShell} from '../lib/app-shell.mjs';
import {namespace} from '../app-routes.js';
const root=resolve(import.meta.dirname,'..'),dist=await mkdtemp(join(tmpdir(),'cendon-first-navigation-'));
for(const n of ['index','garage','chat','profile','spares','news'])await copyFile(join(root,n+'.html'),join(dist,n+'.html'));
await buildPageRuntime(dist);
const garageHtml=await readFile(join(dist,'garage.html'),'utf8'),footer=garageHtml.match(/<script id="leveljs" src="([^"]+)"/)[1];
let base,footerSent=false;const writes=[],errors=[],files=new Map();
const firebase=`window.firebase=window.firebase||(()=>{const u={uid:'core-fixture',displayName:'Fixture',getIdToken:async()=> 'synthetic',getIdTokenResult:async()=>({claims:{}})};const a={currentUser:u,onAuthStateChanged(f){setTimeout(()=>f(u),40);return()=>{}},onIdTokenChanged(f){setTimeout(()=>f(u),40);return()=>{}},setPersistence:async()=>{},getRedirectResult:async()=>({user:null})};function auth(){return a}auth.Auth={Persistence:{LOCAL:'local'}};auth.GoogleAuthProvider=function(){};auth.OAuthProvider=function(){};return {apps:[],initializeApp(){this.apps.push({})},auth}})();`;
const server=createServer(async(req,res)=>{try{
 const url=new URL(req.url,base);if(url.pathname.startsWith('/fixture/firebase/')){res.setHeader('Content-Type','text/javascript');res.end(firebase);return;}
 if(url.pathname.startsWith('/api/')){if(req.method!=='GET')writes.push(url.pathname);res.setHeader('Content-Type','application/json');res.setHeader('Cache-Control','no-store');
  const car={id:'fixture-car',make:'Toyota',model:'Fortuner',year:2013,color:'#778899',type:'suv',body:'suv',mileage:'10000'};
  res.end(JSON.stringify(url.pathname==='/api/config'?{launch:null,features:{},now:Date.now()}:url.pathname==='/api/onboarding'?{status:'completed',completed:true,profile:{uid:'core-fixture',lang:'th'}}:{cars:[car],techs:[],gigs:[],posts:[],jobs:[],items:[],saved:[],threads:[],user:{uid:'core-fixture'}}));return;}
 if(shouldShell(new Request(url,{headers:req.headers}))){const r=shellResponse(new Request(url));res.writeHead(r.status,Object.fromEntries(r.headers));res.end(await r.text());return;}
 let f=url.pathname==='/'?'index.html':url.pathname.slice(1);if(!extname(f)){const ns=namespace(url.href,url.origin);f=(ns==='home'?'index':ns||f)+'.html';}if(!/^[\w./-]+$/.test(f)||f.includes('..'))throw Error('path');
 if(url.pathname===footer){await new Promise(r=>setTimeout(r,3000));footerSent=true;}
 let body=files.get(f);if(!body){body=await readFile(join(/\.html$/.test(f)||f.startsWith('runtime/')?dist:root,f));if(/\.(html|js|css)$/.test(f))body=Buffer.from(body.toString().replaceAll('https://spireonebackend.carspirethailand.workers.dev',base).replaceAll('https://www.gstatic.com/firebasejs/',base+'/fixture/firebase/'));files.set(f,body);}
 res.setHeader('Content-Type',({'.html':'text/html','.js':'text/javascript','.css':'text/css','.woff2':'font/woff2','.webp':'image/webp','.svg':'image/svg+xml'})[extname(f)]||'application/octet-stream');res.setHeader('Cache-Control',f.startsWith('runtime/')?'public,max-age=31536000,immutable':'public,max-age=0,must-revalidate');const etag='"'+createHash('sha256').update(body).digest('hex').slice(0,24)+'"';res.setHeader('ETag',etag);if(req.headers['if-none-match']===etag){res.writeHead(304);res.end();return;}if(/\.(html|js|css)$/.test(f)){res.setHeader('Content-Encoding','gzip');body=gzipSync(body);}res.end(body);
 }catch{res.writeHead(404);res.end();}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));base='http://127.0.0.1:'+server.address().port;
const {chromium}=await import(pathToFileURL('C:/Users/Porsche/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs'));
const browser=await chromium.launch({headless:true,channel:'chrome',args:['--host-resolver-rules=MAP * ~NOTFOUND, EXCLUDE 127.0.0.1, EXCLUDE localhost']}),context=await browser.newContext({viewport:{width:393,height:852},serviceWorkers:'allow'}),page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
await page.addInitScript(()=>{const uid='core-fixture',car={id:'fixture-car',make:'Toyota',model:'Fortuner',year:2013,color:'#778899',type:'suv',body:'suv',mileage:'10000'};for(const [k,v]of Object.entries({cendon_signed:'1',spire___owner:uid,spire_theme:'"light"',spire_lang:'"th"',cendon_cfg:JSON.stringify({launch:null,got:Date.now()}),spire_setup:JSON.stringify({uid,v:3,level:'enthusiast',lang:'th',distance:'km',currency:'THB'}),['spire___account_'+uid+'_status']:JSON.stringify({status:'completed',completed:true,profile:{uid}}),spire_cachedUser:JSON.stringify({uid,displayName:'Fixture'}),spire_garage:JSON.stringify([car]),spire_selCar:JSON.stringify(car.id)}))localStorage.setItem(k,v);});
try{
 await page.goto(base+'/');await page.waitForFunction(()=>window.CendonApp&&document.getElementById('appOpening').hidden,undefined,{timeout:30000});
 const began=Date.now();await page.evaluate(()=>CendonApp.go('/garage'));await page.waitForSelector('#appPending:not([hidden])');const chromeMs=Date.now()-began;assert.ok(chromeMs<500);
 await page.waitForFunction(()=>CendonApp.current().namespace==='garage'&&!barba.transitions.isRunning);const foregroundMs=Date.now()-began;
 const garage=page.frames().find(f=>f!==page.mainFrame()&&new URL(f.url()).pathname==='/garage');assert.ok(garage);if(footerSent)console.error(JSON.stringify({foregroundMs,state:await garage.evaluate(()=>({core:CendonPageCore.ready(),owner:CendonScope.owner(),uid:spireAuth?.currentUser?.uid,gate:document.documentElement.dataset.gate,level:document.documentElement.dataset.level,rs:document.readyState}))}));assert.equal(footerSent,false,'primary controls work before optional footer arrives');
 assert.equal(await garage.evaluate(()=>CendonPageCore.ready()),true);assert.equal(await garage.evaluate(()=>document.readyState),'loading');
 await garage.locator('[data-gx-open]').first().click();assert.equal(await garage.locator('#gxPop').getAttribute('aria-hidden'),'false');
 const before=writes.length;await garage.locator('#gAdd').click();assert.equal(writes.length,before,'incomplete form cannot submit early');assert.equal(await garage.evaluate(()=>!!spireGuard&&!!CendonGarageRules&&!!CendonGarageData),true);await garage.locator('#gxPop [data-gx-close]').last().click();
 await garage.locator('#garageList [data-paint]').first().click();assert.equal(await garage.locator('#gxPaint').getAttribute('aria-hidden'),'false','early card adapter must not swallow the colour button');await garage.locator('#gxPaint [data-gx-close]').last().click();
 // The card is usable while its optional detail module is still on the wire.
 await garage.locator('#garageList .gx-car[data-open]').first().click();assert.equal(await garage.locator('#garageList .gx-car').first().getAttribute('aria-busy'),'true');
 await garage.waitForFunction(()=>typeof openCarDetail==='function',undefined,{timeout:20000});await garage.waitForFunction(()=>!document.querySelector('#garageList [aria-busy=true]'));assert.equal(await garage.evaluate(()=>document.querySelectorAll('#garageList [data-core-waiting]').length),0);
 await page.evaluate(()=>CendonApp.go('/'));await page.waitForFunction(()=>CendonApp.current().namespace==='home'&&!barba.transitions.isRunning);await page.reload();await page.waitForFunction(()=>window.CendonApp&&document.getElementById('appOpening').hidden);
 const refreshAt=Date.now();await page.evaluate(()=>CendonApp.go('/garage'));await page.waitForFunction(()=>CendonApp.current().namespace==='garage'&&!barba.transitions.isRunning);const afterRefreshMs=Date.now()-refreshAt,reopened=page.frames().find(f=>f!==page.mainFrame()&&new URL(f.url()).pathname==='/garage');await reopened.locator('[data-gx-open]').first().click();assert.equal(await reopened.locator('#gxPop').getAttribute('aria-hidden'),'false');
 assert.deepEqual(errors,[]);console.log(JSON.stringify({pass:true,synthetic:true,productionWrites:0,chromeMs,foregroundMs,afterRefreshMs,optionalFooterDelayMs:3000,checks:['early live auth','primary Add car works','early validation','queued detail click','real refresh with service worker']}));
}finally{await browser.close();server.closeAllConnections();await new Promise(r=>server.close(r));const relative=resolve(dist).slice(resolve(tmpdir()).length+1);assert.ok(relative.startsWith('cendon-first-navigation-')&&!relative.includes('..'));await rm(dist,{recursive:true,force:true});}
