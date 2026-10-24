/* Local synthetic responses only. This does not call Google or bill routing. */
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile,mkdir} from 'node:fs/promises';
import {resolve,extname} from 'node:path';
import {pathToFileURL} from 'node:url';
const root=resolve(import.meta.dirname,'..');
const html=`<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/fonts/kanit.css"><link rel="stylesheet" href="/shop-search.css"><style>body{margin:16px;background:#fbf9f5;color:#202020;--surface:#fff;--ink:#202020;--line:#ddd;--muted:#666;font-family:Kanit}*{box-sizing:border-box}</style><section id="v-shop"><div class="scroll"></div></section><script>window.lang='en';window.BACKEND_URL=location.origin;window.spireT=(th,en)=>en;window.spireAuth={currentUser:{uid:'one',getIdToken:async()=> 'fixture'}};Object.defineProperty(navigator,'geolocation',{value:{getCurrentPosition:ok=>ok({coords:{latitude:13.75,longitude:100.5,accuracy:10}})}});</script><script src="/shop-search.js" defer></script>`;
let enabled=false;const requests=[];
const shop=(id,distanceM,driving)=>({id,name:id,address:'Synthetic area',url:'https://maps.google.com/?cid='+id,distanceM,driving,lat:13.76,lng:100.51});
const server=createServer(async(req,res)=>{try{const p=new URL(req.url,'http://unit.test').pathname;res.setHeader('Cache-Control','no-store');
  if(p==='/fixture'){res.setHeader('Content-Type','text/html; charset=utf-8');res.end(html);return}
  if(p==='/api/shop/status'){res.setHeader('Content-Type','application/json');res.end(JSON.stringify({providers:[{id:'maps',name:'Google Maps',state:'ready',routingEnabled:enabled}]}));return}
  if(p==='/api/shop/search'){let raw='';for await(const b of req)raw+=b;const body=JSON.parse(raw);requests.push(body);const routed=enabled&&body.routeLocationConsent===true;
    const places=routed?[shop('Fast by road',2200,{mode:'DRIVE',distanceM:3300,durationS:480,detour:false}),shop('Across river',800,{mode:'DRIVE',distanceM:14000,durationS:1800,detour:true}),shop('Route unknown',1000,null)]:[shop('Across river',800,null)];
    res.setHeader('Content-Type','application/json');res.end(JSON.stringify({providers:[{id:'maps',state:'ready',routing:{status:routed?'partial':'disabled',ranking:routed?'driving_time':'straight_line'}}],places,items:[]}));return}
  if(!/^\/[\w/.-]+$/.test(p)||p.includes('..'))throw Error('path');res.setHeader('Content-Type',({'.js':'text/javascript','.css':'text/css','.woff2':'font/woff2'})[extname(p)]||'text/plain');res.end(await readFile(resolve(root,p.slice(1))));
}catch{res.writeHead(404);res.end()}});await new Promise(r=>server.listen(0,'127.0.0.1',r));
const {chromium}=await import(pathToFileURL('C:/Users/Porsche/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs'));
const browser=await chromium.launch({channel:'chrome',headless:true}),page=await browser.newPage(),base='http://127.0.0.1:'+server.address().port,errors=[];page.on('pageerror',e=>errors.push(e.message));
try{
  await page.goto(base+'/fixture');await page.locator('[data-provider="maps"]').click();await page.locator('#ssQuery').fill('brakes');await page.locator('#ssGo').click();await page.waitForSelector('.ss-place');
  assert.equal(requests.at(-1).routeLocationConsent,false);assert.equal(await page.locator('#ssRouteOpt').isVisible(),false);assert.match(await page.locator('.ss-travel').innerText(),/Straight-line 800 m/);assert.match(await page.locator('.ss-travel').innerText(),/Road distance unavailable/);assert.match(await page.locator('#ssHeading').innerText(),/straight-line/);assert.equal(await page.locator('.ss-travel strong').count(),0);
  enabled=true;await page.reload();await page.locator('[data-provider="maps"]').click();await page.locator('#ssRouteOpt').waitFor({state:'visible'});assert.equal(await page.locator('#ssRouteConsent').isChecked(),false);
  await page.locator('#ssQuery').fill('brakes');await page.locator('#ssGo').click();await page.waitForSelector('.ss-place');assert.equal(requests.at(-1).routeLocationConsent,false,'backend readiness is not user consent');
  await page.locator('#ssRouteConsent').check();await page.locator('#ssGo').click();await page.waitForFunction(()=>document.querySelectorAll('.ss-place').length===3);assert.equal(requests.at(-1).routeLocationConsent,true);
  const rows=page.locator('.ss-place');assert.match(await rows.nth(0).innerText(),/Fast by road.*\n.*3.3 km · 8 min/);assert.match(await rows.nth(1).innerText(),/14 km · 30 min/);assert.match(await rows.nth(1).innerText(),/Close in a straight line, longer by road/);assert.equal(await rows.nth(2).locator('.ss-travel strong').count(),0);assert.match(await page.locator('#ssHeading').innerText(),/driving time/);
  await mkdir(resolve(root,'.qa/roads'),{recursive:true});for(const width of [320,390,1280]){await page.setViewportSize({width,height:900});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),String(width));await page.screenshot({path:resolve(root,'.qa/roads/routing-'+width+'.png'),fullPage:true})}
  await page.evaluate(()=>{spireAuth.currentUser={uid:'two',getIdToken:async()=> 'fixture-two'};dispatchEvent(new Event('cendon:auth-ready'))});assert.equal(await page.locator('#ssRouteConsent').isChecked(),false);assert.equal(await page.locator('.ss-place').count(),0);assert.deepEqual(errors,[]);
  console.log('PASS routing OFF/explicit opt-in/straight-line labels/river detour/time ranking/partial routes/account isolation/320–1280px; no live routing requests');
}finally{await browser.close();server.closeAllConnections();await new Promise(r=>server.close(r))}
