/* Shipped code + synthetic account/requests only; no customer writes or AI calls. */
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {resolve,extname} from 'node:path';
import {pathToFileURL} from 'node:url';
const root=resolve(import.meta.dirname,'..'),read=f=>readFile(resolve(root,f),'utf8');
const home=await read('index.html'),chat=await read('chat.html'),valet=await read('valet.js');
const part=(s,a,b)=>{const x=s.indexOf(a),y=s.indexOf(b,x);assert.ok(x>=0&&y>x,a);return s.slice(x,y)};
const meta='<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">';
const styles=[...chat.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)].map(x=>'<style>'+x[1]+'</style>').join('');
const augment=part(chat,'  const pill=D.querySelector("header.pill");','  const pc=$("pCar");');
const more=part(valet,'  const pill=D.querySelector("header.pill"),nw=','  paintBtns();');
const layout=meta+styles+'<link rel="stylesheet" href="/valet.css">'+chat.match(/<header class="pill">[\s\S]*?<\/header>/)[0]+`<script>
 const D=document,$=id=>D.getElementById(id),t=(th,en)=>en,T=t;localStorage.setItem('cendon_signed','1');
 {${augment}} {${more}}
 $('pCarName').textContent='Porsche 911 Carrera GTS 2026';
 </script>`;
const mode=meta+'<div id="catIc"></div><div id="catT"></div>'+['vMenu','vMap','vCat','vRes','vTech','dBody','staff'].map(id=>'<main id="'+id+'" hidden>'+id+'</main>').join('')+`<script>
 const $=id=>document.getElementById(id),RAIL=[{id:'eng',th:'Engine'}],railIc=()=>'',curView=()=>({}),drawCat=()=>{},stopAlerts=()=>{},ME=null;let MODE='customer',BOOT_TECH=false,VIEW='menu',CATK,CATSUB,CATQ,CATMAP;
 ${part(home,'function openCat(k,noHist){','function drawCat(){')}
 ${part(home,'function applyMode(){','/* ═══ ภาพล่าสุดของ Studio')}
 window.goCategory=()=>{MODE='customer';applyMode();openCat('eng',true)};
 window.goStudio=()=>{MODE='tech';applyMode()};
 </script>`;
const prefs=meta+`<body><nav id="mnav"><a href="/" class="active on">Home</a><a href="/messages" class="active on">Chat</a><a href="/garage">Garage</a></nav><div class="nav-links"><a href="/" class="active">Home</a><a href="/messages" class="active">Chat</a><a href="/garage">Garage</a></div><h3 id="urgent"></h3><form id="money"></form><div style="height:1400px"></div><label class="fld"><span>Engine code</span><input id="badCode"></label><script>
 window.BACKEND_URL=location.origin;window.spireAuth={currentUser:{uid:'owner'}};window.spireLang=()=> 'en';window.spireT=(th,en)=>en;
 window.preference={uid:'owner',currency:'USD',distance:'mi'};window.spireSetupRead=()=>preference;
 </script><script src="/display-prefs.js"></script><script src="/money-fields.js"></script><script src="/input-guard.js"></script><script src="/stability.js"></script></body>`;
let uploads=0;const media=new Map();
const server=createServer(async(req,res)=>{try{const p=new URL(req.url,'http://fixture').pathname;res.setHeader('Cache-Control','no-store');
 if(p==='/api/display-rates'){res.setHeader('Content-Type','application/json');res.end(JSON.stringify({result:'success',base_code:'THB',rates:{THB:1,USD:.03,JPY:4.5},time_last_update_unix:Math.floor(Date.now()/1000)}));return}
 if(p.startsWith('/api/tech/media/')){if(req.method==='PUT'){const bytes=[];for await(const x of req)bytes.push(x);media.set(p,Buffer.concat(bytes));uploads++;res.end('{}')}else if(media.has(p)){res.setHeader('Content-Type','audio/wav');res.end(media.get(p))}else{res.writeHead(404);res.end()}return}
 const body=p==='/layout'?layout:p==='/mode'?mode:p==='/prefs'?prefs:p==='/media'?meta+'<body></body>':null;
 if(body){res.setHeader('Content-Type','text/html; charset=utf-8');res.end(body);return}
 if(!/^\/[\w.-]+$/.test(p))throw Error('path');res.setHeader('Content-Type',extname(p)==='.css'?'text/css':'text/javascript');res.end(await read(p.slice(1)));
 }catch{res.writeHead(404);res.end()}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+server.address().port;
const {chromium}=await import(pathToFileURL('C:/Users/Porsche/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs'));
const browser=await chromium.launch({channel:'chrome',headless:true}),page=await browser.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
try{
 await page.goto(base+'/layout');
 for(const width of [320,360,393,430]){await page.setViewportSize({width,height:850});const b=await page.evaluate(()=>Object.fromEntries(['sideBurger','pHome','pCar','pMore'].map(id=>[id,document.getElementById(id).getBoundingClientRect().toJSON()])));
  assert.ok(b.pMore.width>=40&&b.pMore.height>=40,'menu touch target');assert.ok(b.pCar.right<=b.pMore.x+.1&&b.pHome.right<=b.pCar.x+.1,'car does not overlap controls at '+width);assert.ok(b.pMore.right<=width,'menu inside viewport');
 }
 await page.goto(base+'/mode');for(let n=0;n<8;n++){await page.evaluate(()=>goCategory());assert.equal(await page.locator('#vCat').evaluate(x=>x.hidden),false);await page.evaluate(()=>goStudio());assert.deepEqual(await page.evaluate(()=>['vMenu','vMap','vCat','vRes','vTech'].filter(id=>!document.getElementById(id).hidden)),['vTech']);}
 await page.goto(base+'/prefs');await page.waitForFunction(()=>CendonDisplayPrefs.rate('USD')===.03);
 for(const path of ['/messages','/','/messages/thread','/','/garage/car','/']){await page.evaluate(p=>{history.pushState({},'',p);dispatchEvent(new PageTransitionEvent('pageshow',{persisted:true}))},path);await page.waitForTimeout(30);assert.equal(await page.locator('#mnav a.active').count(),1);assert.equal(await page.locator('#mnav a.on').count(),1);assert.equal(await page.locator('.nav-links a.active').count(),1);assert.equal(await page.locator('#mnav [aria-current=page]').count(),1);assert.equal(await page.locator('#mnav a.active').textContent(),path.startsWith('/messages')?'Chat':path.startsWith('/garage')?'Garage':'Home');}
 await page.evaluate(()=>{document.getElementById('urgent').innerHTML='<label><b data-distance-km="16.09344">16.09344 km</b></label>'});await page.waitForFunction(()=>document.querySelector('#urgent b').textContent==='10 mi');
 await page.evaluate(()=>{preference.distance='km';dispatchEvent(new Event('cendon:preferences'))});await page.waitForFunction(()=>document.querySelector('#urgent b').textContent==='16.09 km');
 await page.evaluate(()=>{const form=document.getElementById('money');form.innerHTML=['gP','qL','qP','qT','aF','pBud'].map(id=>'<label class="fld"><span>'+id+' (THB)</span><div class="pb-in"><b>฿</b><input id="'+id+'" type="number" value="1000"></div></label>').join('');CendonMoneyFields.mount(form)});
 assert.equal(await page.locator('#gP').inputValue(),'30');assert.equal(await page.evaluate(()=>CendonMoneyFields.read('gP')),1000);assert.match(await page.locator('[data-money-note]').first().textContent(),/1 THB = 0.03 USD/);assert.equal(await page.locator('.pb-in>b').first().isVisible(),false);
 await page.locator('#qL').fill('3');assert.equal(await page.evaluate(()=>CendonMoneyFields.read('qL')),100);assert.match(await page.evaluate(()=>CendonMoneyFields.total(['qL','qP','qT'])),/63/);
 await page.evaluate(()=>{preference.currency='JPY';dispatchEvent(new Event('cendon:preferences'));const form=document.getElementById('money');form.insertAdjacentHTML('beforeend','<label class="fld"><span>Labor</span><input id="oL" type="number" value="1000"></label>');CendonMoneyFields.mount(form)});
 assert.equal(await page.locator('#qL').inputValue(),'3','edited field retains currency snapshot');assert.equal(await page.locator('#qL').getAttribute('data-money-currency'),'USD');assert.equal(await page.locator('#oL').inputValue(),'4500');assert.equal(await page.evaluate(()=>CendonMoneyFields.read('oL')),1000);assert.equal(await page.locator('#oL').getAttribute('max'),'4500000');
 await page.evaluate(()=>CendonFormIssues.show([{id:'badCode',msg:'Use the documented code'}]));assert.equal(await page.evaluate(()=>document.activeElement.id),'badCode');assert.match(await page.locator('.cdf-error').textContent(),/Engine code: Use the documented code/);await page.locator('#badCode').fill('1KD-FTV');assert.equal(await page.locator('.cdf-error').count(),0);
 assert.equal(await page.evaluate(()=>{spireAuth.currentUser={uid:'different'};try{CendonMoneyFields.read('qL');return false}catch{return true}}),true,'account change invalidates open form');
 // Storage-denied browser: a private authenticated upload is required before navigating.
 await page.goto(base+'/media');await page.evaluate(()=>{window.spireAuth={currentUser:{uid:'owner',getIdToken:async()=> 'fixture'}};window.BACKEND_URL=location.origin;Object.defineProperty(window,'indexedDB',{value:undefined})});await page.addScriptTag({path:resolve(root,'media-store.js')});
 const id=await page.evaluate(()=>CendonMedia.put(new Blob(['RIFF-synthetic'],{type:'audio/wav'}),{requirePersistent:true,upload:false}));assert.equal(uploads,1);
 await page.reload();await page.evaluate(()=>{window.spireAuth={currentUser:{uid:'owner',getIdToken:async()=> 'fixture'}};window.BACKEND_URL=location.origin;Object.defineProperty(window,'indexedDB',{value:undefined})});await page.addScriptTag({path:resolve(root,'media-store.js')});assert.equal(await page.evaluate(async id=>(await CendonMedia.get(id)).text(),id),'RIFF-synthetic','recording survives navigation without IndexedDB');
 await page.route('**/api/tech/media/**',r=>r.abort());assert.match(await page.evaluate(async()=>{try{await CendonMedia.put(new Blob(['no-store'],{type:'audio/wav'}),{requirePersistent:true,upload:false});return 'unexpected'}catch(e){return e.message}}),/Cannot preserve|เก็บเสียงข้ามหน้าไม่ได้/);
 assert.deepEqual(errors,[]);console.log('PASS mobile header 320/360/393/430; repeated category/Studio and navigation; dynamic urgent units; USD/JPY snapshots and canonical amounts; field focus; private media fallback/offline safety');
}finally{await browser.close();server.closeAllConnections();await new Promise(r=>server.close(r))}
