// Actual Home document/styles/handlers. Synthetic identity/API; no production writes.
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile,mkdir} from 'node:fs/promises';
import {resolve,join,extname} from 'node:path';
import {pathToFileURL} from 'node:url';
import {gzipSync} from 'node:zlib';
import {shouldShell,shellResponse} from '../lib/app-shell.mjs';
import {namespace} from '../app-routes.js';
const root=resolve(import.meta.dirname,'..'),pkg=process.env.CENDON_NODE_PACKAGES;
if(!pkg)throw Error('Set CENDON_NODE_PACKAGES to the installed Playwright node_modules folder');
const uid='layout-fixture',car={id:'layout-car',name:'AION Aion Y Plus',make:'AION',model:'Aion Y Plus',year:2026,type:'suv',body:'suv',color:'#778899',mileage:121404};
const firebase=`window.firebase=window.firebase||(()=>{const u={uid:'${uid}',displayName:'Layout fixture',getIdToken:async()=> 'synthetic',getIdTokenResult:async()=>({claims:{}})};const a={currentUser:u,onAuthStateChanged(f){setTimeout(()=>f(u),40);return()=>{}},onIdTokenChanged(f){setTimeout(()=>f(u),40);return()=>{}},setPersistence:async()=>{},getRedirectResult:async()=>({user:null})};function auth(){return a}auth.Auth={Persistence:{LOCAL:'local'}};auth.GoogleAuthProvider=function(){};auth.OAuthProvider=function(){};return {apps:[],initializeApp(options){this.apps.push({name:'[DEFAULT]',options})},auth}})();`;
const server=createServer(async(req,res)=>{try{
 const url=new URL(req.url,'http://'+req.headers.host);
 if(shouldShell(new Request(url,{headers:req.headers}))){const r=shellResponse(new Request(url));res.writeHead(r.status,Object.fromEntries(r.headers));res.end(await r.text());return;}
 let name=url.pathname==='/'?'index.html':url.pathname.slice(1);if(!extname(name)){const ns=namespace(url.href,url.origin);name=(ns==='home'?'index':ns||name)+'.html';}
 if(!/^[\w./-]+$/.test(name)||name.includes('..'))throw Error('path');
 const data=await readFile(resolve(root,name));res.setHeader('Content-Type',({'.js':'text/javascript','.css':'text/css','.html':'text/html; charset=utf-8','.woff2':'font/woff2','.svg':'image/svg+xml','.webp':'image/webp'})[extname(name)]||'application/octet-stream');
 if(/\.(js|css|html)$/.test(name)){res.setHeader('Content-Encoding','gzip');res.end(gzipSync(data));}else res.end(data);
 }catch{res.writeHead(404);res.end();}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+server.address().port;
const {chromium}=await import(pathToFileURL(join(pkg,'playwright/index.mjs')).href),browser=await chromium.launch({headless:true,channel:process.env.CENDON_CHROME_CHANNEL||undefined}),results=[];
const cases=[{w:393,h:800},{w:360,h:640},{w:320,h:568},{w:412,h:915},{w:768,h:1024},{w:1440,h:900},{w:1440,h:650},{w:393,h:800,lang:'en'},{w:393,h:800,partner:true}];
function geometry(){
 const rect=s=>{const e=document.querySelector(s),r=e?.getBoundingClientRect();return r&&getComputedStyle(e).display!=='none'?{x:r.x,y:r.y,width:r.width,height:r.height,bottom:r.bottom,right:r.right}:null;};
 const children=[...document.querySelector('.hm-core').children].filter(e=>!e.hidden&&getComputedStyle(e).display!=='none').map(e=>e.getBoundingClientRect());
 const top=Math.min(...children.map(r=>r.top)),bottom=Math.max(...children.map(r=>r.bottom)),core=rect('.hm-core'),cue=rect('#hmNext'),nav=rect('#mnav');
 return {core,cue,nav,logo:rect('#hmAi>.lx-logo'),content:{top,bottom,center:(top+bottom)/2},centerError:Math.abs((top+bottom)/2-(core.y+core.height/2)),viewport:innerHeight,scrollHeight:document.documentElement.scrollHeight,live:rect('#liveBar'),cueText:document.getElementById('hmNext').textContent.trim(),cueName:document.getElementById('hmNext').getAttribute('aria-label')};
}
try{
 for(const c of cases){
  const context=await browser.newContext({viewport:{width:c.w,height:c.h},isMobile:c.w<761,hasTouch:c.w<761,reducedMotion:'reduce',serviceWorkers:'block'}),page=await context.newPage(),errors=[],writes=[];page.on('pageerror',e=>errors.push(e.message));
  let releaseStatus;const statusGate=new Promise(r=>releaseStatus=r);
  await context.route('**/*',async route=>{const req=route.request(),u=new URL(req.url());if(u.origin===base)return route.continue();
   if(u.hostname==='www.gstatic.com'&&u.pathname.includes('/firebasejs/'))return route.fulfill({contentType:'text/javascript',body:firebase});
   if(u.pathname==='/api/tech/me'){if(c.partner)await statusGate;return route.fulfill({json:{uid,technician:c.partner?{id:'fixture-shop',test:false,verified:true}:null,application:null}});}
   if(u.pathname.startsWith('/api/')){if(req.method()!=='GET')writes.push(u.pathname);return route.fulfill({json:u.pathname==='/api/config'?{launch:null,features:{},now:Date.now()}:u.pathname==='/api/onboarding'?{status:'completed',completed:true,profile:{uid,name:'Layout fixture',lang:c.lang||'th'}}:{cars:[car],techs:[],gigs:[],posts:[],jobs:[],threads:[],items:[],saved:[],user:{uid}}});}
   return route.abort();});
  await page.addInitScript(({uid,car,lang})=>{for(const[k,v]of Object.entries({cendon_signed:'1',spire___owner:uid,spire_theme:'"light"',spire_lang:JSON.stringify(lang),cendon_cfg:JSON.stringify({launch:null,got:Date.now()}),spire_setup:JSON.stringify({uid,v:3,level:'enthusiast',lang,distance:'mi',currency:'THB'}),['spire___account_'+uid+'_status']:JSON.stringify({status:'completed',completed:true,profile:{uid}}),spire_cachedUser:JSON.stringify({uid,displayName:'Layout fixture'}),spire_garage:JSON.stringify([car]),spire_selCar:JSON.stringify(car.id)}))localStorage.setItem(k,v);},{uid,car,lang:c.lang||'th'});
  await page.goto(base);await page.waitForFunction(()=>window.CendonApp&&document.getElementById('appOpening').hidden);
  let frame=page.frames().find(f=>f!==page.mainFrame()&&new URL(f.url()).pathname==='/');await frame.waitForFunction(()=>window.CendonHomeStages&&document.getElementById('myCar').children.length);await frame.evaluate(()=>document.fonts.ready);await page.waitForTimeout(450);
  const g=await frame.evaluate(geometry);results.push({case:c,...g});
   assert.ok(g.centerError<2,JSON.stringify({case:c,centerError:g.centerError}));assert.equal(g.cueText,'','arrow only, no visible text block');assert.ok(g.cueName);assert.ok(g.cue.width>=44&&g.cue.height>=44,'small icon keeps a real touch target');
   assert.ok(g.content.bottom<=g.cue.y-2,'cue never overlaps the content');assert.ok(!g.logo||g.logo.bottom<=g.core.y,'logo stays in its own top row');
   if(g.scrollHeight<=g.viewport+1){const boundary=g.nav?g.nav.y-2:g.viewport;assert.ok(Math.abs(g.content.center-(g.core.y+boundary)/2)<2,'content is centred in the actual visible area, not above duplicate footer padding');}
  if(c.partner){
   const go=async ns=>{await page.evaluate(p=>CendonApp.go(p),ns==='home'?'/':'/'+ns);await page.waitForFunction(n=>CendonApp.current().namespace===n&&!barba.transitions.isRunning,ns);return page.frames().find(f=>f!==page.mainFrame()&&new URL(f.url()).pathname===(ns==='home'?'/':'/'+ns));};
   let profile=await go('profile');await profile.locator('[data-partner-status]').waitFor();assert.equal(await profile.locator('[data-partner]').count(),0,'pending status has no actionable signup/Studio button');
   await profile.evaluate(()=>{const a=document.createElement('a');a.href='/join';a.dataset.partner='';a.className='st-partner st-p-none';a.textContent='stale cached action';document.body.append(a);a.click();a.remove();});assert.equal(new URL(page.url()).pathname,'/profile','even a stale fast click cannot open registration');
   releaseStatus();await profile.waitForFunction(()=>CendonPartnerState.peek().phase==='ready');await profile.locator('[data-partner][href="/studio"]').waitFor();
   if(process.env.CENDON_LAYOUT_SCREENSHOTS){await mkdir(resolve(root,'.qa/partner-card'),{recursive:true});await page.screenshot({path:resolve(root,'.qa/partner-card/settings.png')});}
   frame=await go('home');await frame.evaluate(()=>CendonHomeStages.go('call'));await frame.waitForFunction(()=>CendonHomeStages.stage==='call'&&!CendonHomeStages.busy);
   if(process.env.CENDON_LAYOUT_SCREENSHOTS){await frame.locator('#hPartner').scrollIntoViewIfNeeded();await page.screenshot({path:resolve(root,'.qa/partner-card/home.png')});}
   await frame.locator('#hPartnerDismiss').click();assert.equal(await frame.locator('#hPartner').getAttribute('hidden'),'');assert.equal(await frame.evaluate(()=>CendonPartnerState.peek().s),'shop','hiding the card never changes membership');
   profile=await go('profile');const toggle=profile.locator('[data-st="partner-card"]');await profile.waitForFunction(()=>document.querySelector('[data-st="partner-card"]').getAttribute('aria-checked')==='false');await profile.locator('[data-partner][href="/studio"]').waitFor();await toggle.click();await profile.waitForFunction(()=>CendonPartnerState.cardVisible()===true);
   frame=await go('home');await frame.locator('#hPartnerDismiss').waitFor();await frame.locator('#hPartnerDismiss').click();await page.reload();await page.waitForFunction(()=>window.CendonApp&&document.getElementById('appOpening').hidden);frame=page.frames().find(f=>f!==page.mainFrame()&&new URL(f.url()).pathname==='/');await frame.waitForFunction(()=>window.CendonPartnerState&&document.getElementById('hPartner').hidden&&CendonPartnerState.cardVisible()===false);await frame.evaluate(()=>CendonHomeStages.go('ai'));await frame.waitForFunction(()=>CendonHomeStages.stage==='ai'&&!CendonHomeStages.busy);console.log(JSON.stringify({partnerCard:true,pendingActionHidden:true,staleLinkBlocked:true,dismissed:true,restoredAcrossViews:true,hiddenAfterReload:true,membership:'shop',productionWrites:0}));
  }
  await frame.locator('#hmNext').scrollIntoViewIfNeeded();await frame.evaluate(()=>scrollTo(0,Math.max(0,document.documentElement.scrollHeight-innerHeight)));const visible=await frame.evaluate(geometry),overlap=(a,b)=>a&&b&&Math.min(a.right,b.right)>Math.max(a.x,b.x)&&Math.min(a.bottom,b.bottom)>Math.max(a.y,b.y);
  assert.ok(!overlap(visible.cue,visible.nav),'cue clears the bottom navigation');assert.equal(visible.live,null,'no floating location badge');
  await frame.locator('#hmNext').click();await frame.waitForFunction(()=>CendonHomeStages.stage==='call'&&!CendonHomeStages.busy);assert.equal(await frame.locator('#hmAi').getAttribute('hidden'),'');await frame.locator('#hmBack').click();await frame.waitForFunction(()=>CendonHomeStages.stage==='ai'&&!CendonHomeStages.busy);
  assert.deepEqual(errors,[]);if(process.env.CENDON_LAYOUT_SCREENSHOTS){await mkdir(resolve(root,'.qa/home-stage-layout'),{recursive:true});await page.screenshot({path:resolve(root,'.qa/home-stage-layout/'+c.w+'x'+c.h+(c.lang||'th')+(c.live?'-live':'')+'.png')});}
  await context.close();
 }
 console.log(JSON.stringify({pass:true,synthetic:true,productionWrites:0,checks:['centred in visible area','header stays above the content','arrow-only 44px target','no content/nav/location-badge overlap','arrow and back still switch stages'],results:results.map(({case:c,centerError,scrollHeight,viewport})=>({case:c,centerError,scrolls:scrollHeight>viewport+1}))}));
}finally{await browser.close();server.closeAllConnections();await new Promise(r=>server.close(r));}
