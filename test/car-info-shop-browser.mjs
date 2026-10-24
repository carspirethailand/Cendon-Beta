/* Production handlers with synthetic account, geolocation, references and server failures. */
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {resolve,extname} from 'node:path';
import {pathToFileURL} from 'node:url';
const root=resolve(import.meta.dirname,'..'),garage=await readFile(resolve(root,'garage.html'),'utf8');
const part=(a,b)=>{const i=garage.indexOf(a),j=garage.indexOf(b,i);assert.ok(i>=0&&j>i);return garage.slice(i,j)};
const form=part('const INFO_F=[','/* ถอดเลขตัวถังทันที'),save=part('async function saveInfo(){','/* แท็บสเปกยืนยัน');
const auth="window.lang='en';window.BACKEND_URL=location.origin;window.spireAuth={currentUser:{uid:'one',getIdToken:async()=> 'fixture'}};window.auth=spireAuth;window.spireT=(th,en)=>en;";
const carFixture=`<meta charset="utf-8"><script>${auth}</script><script src="/garage-rules.js"></script><script src="/car-info-review.js"></script><main id="gxIForm" data-info-form></main><button id="gxISave">Save</button><div id="status"></div><script>
const $=id=>document.getElementById(id),esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])),gxT=(th,en)=>en;
let infoId='car-one',rows=[{id:'car-one',make:'McLaren',model:'720S',year:'2017',info:{}}],writes=0,closed=false,failSave=true;
const garage=()=>structuredClone(rows),carsAreRemote=()=>true,pushCar=async()=>{if(failSave)throw Error('Synthetic save rejected')},saveGarage=g=>{rows=g;writes++},renderGarage=()=>{},gxCloseAll=()=>{closed=true},toast=t=>$('status').textContent=t,openInfo=()=>{},vinCheck=()=>{};
window.CarSpec={ensure:async()=>({status:'ready',sources:[{title:'Fixture source',url:'https://manufacturer.example/spec'}],data:{variants:[{name:'720S',gearbox:{v:'7-speed SSG'},drive:{v:'RWD'},fuel:'petrol'}]}})};
${form}\n${save}\n$('gxISave').onclick=saveInfo;</script>`;
const shopFixture=`<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/shop-search.css"><script>${auth}
window.geoMode='ok';window.geoCalls=[];Object.defineProperty(navigator,'geolocation',{value:{getCurrentPosition(ok,fail,options){geoCalls.push(options);setTimeout(()=>geoMode==='deny'?fail({code:1}):geoMode==='coarse'?ok({coords:{latitude:13.75,longitude:100.5,accuracy:5000}}):ok({coords:{latitude:13.75,longitude:100.5,accuracy:15}}),40)}}});</script><section id="v-shop"><div class="scroll"></div></section><script src="/shop-search.js" defer></script>`;
const requests=[],server=createServer(async(req,res)=>{try{const p=new URL(req.url,'http://unit.test').pathname;res.setHeader('Cache-Control','no-store');
  if(['/car','/shop'].includes(p)){res.setHeader('Content-Type','text/html; charset=utf-8');res.end(p==='/car'?carFixture:shopFixture);return}
  if(p==='/api/shop/status'){res.setHeader('Content-Type','application/json');res.end(JSON.stringify({providers:[{id:'maps',name:'Google Maps',state:'ready'}]}));return}
  if(p==='/api/shop/search'){let raw='';for await(const b of req)raw+=b;requests.push(JSON.parse(raw));res.setHeader('Content-Type','application/json');res.end(JSON.stringify({providers:[{id:'maps',state:'ready'}],places:[{id:'fixture',name:'Nearby fixture shop',address:'Synthetic area',url:'https://maps.google.com/?cid=1',distanceM:120}],items:[]}));return}
  if(!/^\/[\w.-]+$/.test(p))throw Error('path');res.setHeader('Content-Type',({'.js':'text/javascript','.css':'text/css'})[extname(p)]||'text/plain');res.end(await readFile(resolve(root,p.slice(1))));
}catch{res.writeHead(404);res.end()}});await new Promise(r=>server.listen(0,'127.0.0.1',r));
const {chromium}=await import(pathToFileURL('C:/Users/Porsche/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs'));
const browser=await chromium.launch({channel:'chrome',headless:true}),page=await browser.newPage(),base='http://127.0.0.1:'+server.address().port,errors=[];page.on('pageerror',e=>errors.push(e.message));
try{
  await page.goto(base+'/car');await page.locator('[data-info="model_year"]').fill('1234321');await page.locator('#gxISave').click();assert.equal(await page.evaluate(()=>writes),0);assert.match(await page.locator('#status').innerText(),/year/i);
  await page.locator('[data-info="model_year"]').fill('2017');await page.locator('[data-info="engine"]').fill('fsfastdsxz');await page.locator('#gxISave').click();assert.equal(await page.evaluate(()=>writes),0);
  await page.locator('[data-info="engine"]').fill('4.0L V8');await page.locator('[data-info="drive"]').selectOption('FWD');await page.locator('[data-info="gear"]').selectOption('CVT');await page.locator('[data-info-review]').click();await page.waitForFunction(()=>document.querySelector('[data-info-review-result]').textContent.includes('RWD'));assert.match(await page.locator('[data-info-review-result]').innerText(),/Not matched/);
  await page.locator('#gxISave').click();assert.match(await page.locator('#status').innerText(),/Synthetic save rejected/);assert.equal(await page.evaluate(()=>writes),0);assert.equal(await page.evaluate(()=>closed),false);assert.equal(await page.locator('[data-info="engine"]').inputValue(),'4.0L V8');
  await page.evaluate(()=>failSave=false);await page.locator('#gxISave').click();assert.equal(await page.evaluate(()=>writes),1);assert.equal(await page.evaluate(()=>rows[0].info.engine),'4.0L V8');
  await page.goto(base+'/shop');await page.locator('[data-provider="maps"]').click();await page.locator('#ssQuery').fill('brake pads');await page.locator('#ssGo').click();await page.waitForSelector('.ss-place');assert.equal(requests.at(-1).locationConsent,true);assert.equal(requests.at(-1).lat,13.75);assert.equal(await page.evaluate(()=>geoCalls[0].enableHighAccuracy),true);assert.equal(await page.evaluate(()=>geoCalls[0].maximumAge),0);
  const before=requests.length;await page.reload();await page.evaluate(()=>geoMode='deny');await page.locator('[data-provider="maps"]').click();await page.locator('#ssQuery').fill('filter');await page.locator('#ssGo').click();await page.waitForFunction(()=>document.querySelector('#ssStatus').textContent.includes('blocks location'));assert.equal(requests.length,before);assert.equal(await page.locator('.ss-place').count(),0);
  await page.evaluate(()=>geoMode='coarse');await page.locator('#ssLocation').click();await page.waitForFunction(()=>document.querySelector('#ssStatus').textContent.includes('accuracy is too low'));assert.equal(requests.length,before);
  await page.evaluate(()=>geoMode='ok');await page.locator('#ssLocation').click();await page.waitForSelector('.ss-place');assert.equal(requests.length,before+1);
  assert.deepEqual(errors,[]);console.log('PASS actual car form limits/source comparison/failed save retains draft + current precise location/blocked permission/coarse GPS/retry/no nationwide fallback');
}finally{await browser.close();server.closeAllConnections();await new Promise(r=>server.close(r))}
