/* Actual Home/category loaders and renderers, served locally with synthetic data. */
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile,mkdir} from 'node:fs/promises';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
const root=resolve(import.meta.dirname,'..'),home=await readFile(resolve(root,'index.html'),'utf8');
const part=(a,b)=>home.slice(home.indexOf(a),home.indexOf(b,home.indexOf(a)));
const {chromium}=await import(pathToFileURL('C:/Users/Porsche/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs'));
let published=false,offline=false;const shop={id:'fixture-shop',shop:'Fixture mechanic',cats:['air','eng'],test:false,verified:true,online:true};
const service={id:1,tech:shop,cats:['air','oil'],title:'Fixture multi-category service',body:'Fixture only',price:800,photos:[],brands:[],createdAt:Date.now()};
const ids=['hQuick','hTools','myCar','hRail','sugList','catN','catSym','catGigs','catShopsH','catSubs','catList','catMap'];
const html=`<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{font:16px system-ui;background:#111;color:#fff;padding:20px}button{font:inherit;padding:12px}.lx-gsec{padding:12px;border:1px solid #555;margin:12px 0}.lx-gch,.lx-gcf,.lx-gct{display:block}.lx-gc{background:#eee}.note{padding:16px;border:1px solid orange}</style><body>${ids.map(id=>'<div id="'+id+'">'+(id==='hQuick'?'ready':'')+'</div>').join('')}<div class="lx-top"><div id="active"></div></div><div id="vCat" hidden></div><select id="catSort"></select><button id="catMapT"><i></i><span></span></button><script>
const $=id=>document.getElementById(id),T=(th,en)=>th,esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])),tr=s=>s;
const API=location.origin;let U=null,ME=null,TECHS=[],LOADED=false,SERVER=null,CATK='all',CATSUB='',CATQ='',CATSORT='best',CATMAP=false,HERE=null;
const RAIL=[{id:'all',th:'ทั้งหมด'},{id:'air',th:'แอร์'},{id:'eng',th:'เครื่องยนต์'},{id:'oil',th:'น้ำมันเครื่อง',base:'eng'}],OTHER_CAT={id:'other',th:'อื่นๆ'},SYM={},GIG_MAX=2;
const roamPos=t=>t,km=()=>null,initial=()=> 'F',money=n=>String(n),isMine=()=>false,img=()=>'',topOf=k=>k==='oil'?'eng':k,gigCats=g=>g.cats||[],railIc=()=>'',rankGigs=l=>l,sortShops=l=>l,CAT_SORTS=()=>[['best','แนะนำ']],profCard=t=>'<button class="lx-pc" data-id="'+t.id+'">'+esc(t.shop)+'</button>',shown=o=>TECHS.filter(t=>o.cat==='all'||t.cats.includes(o.cat));
const drawMyCar=()=>{},drawQuick=()=>{},callPlus=()=>{},drawPartner=()=>{},drawJobsBtn=()=>{},railNav=()=>{},openCat=()=>{},setView=()=>{},renderUsed=()=>{},diag=()=>{},ccDone=()=>{},render=()=>drawHome(),drawCatMap=()=>{},wireCards=()=>{},openRes=()=>{},wireGigRows=()=>{};
const READY={gigs:{done(){}},techs:{done(){}}},errBar=(text,id)=>'<p>'+text+'</p><button id="'+id+'">ลองใหม่</button>',busy=async(b,f)=>f();
${part('async function api(path,o){','function needLogin(){')}
${part('let GIGS=null;','function myCarText(){')}
${part('function gigCard(g,i,o){','/* ═══ สปอนเซอร์บริการ')}
${part('function drawHome(){','function wireGigRows(host){')}
${part('function drawCat(){','function closeCat(){')}
${part('async function load(){','/* ปิดหน้าโหลด:')}
window.category=k=>{CATK=k;$('vCat').hidden=false;drawCat()};window.owner=t=>{ME={technician:t};$('ownerNotice')?.remove();const e=document.createElement('div');e.id='ownerNotice';e.innerHTML=ownServiceNotice();document.body.appendChild(e)};
load();</script>`;
const server=createServer((req,res)=>{const p=new URL(req.url,'http://localhost').pathname;res.setHeader('Cache-Control','no-store');
  if(p==='/'){res.setHeader('Content-Type','text/html;charset=utf-8');res.end(html);return}
  res.setHeader('Content-Type','application/json');if(offline){res.writeHead(503);res.end('{"error":"fixture offline"}');return}
  res.end(JSON.stringify(p.endsWith('/gigs')?{gigs:published?[service]:[]}:{techs:published?[shop]:[]}));
});
await new Promise(r=>server.listen(0,'127.0.0.1',r));const browser=await chromium.launch({headless:true,channel:'chrome'}),errors=[];
try{for(const width of [390,1280]){
  published=false;offline=false;const page=await browser.newPage({viewport:{width,height:844}});page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://127.0.0.1:'+server.address().port);await page.waitForFunction(()=>document.getElementById('sugList').textContent.includes('ยังไม่มีบริการ'),undefined,{timeout:5000}).catch(async e=>{console.error(JSON.stringify({errors,state:await page.evaluate(()=>({text:document.getElementById('sugList').textContent,gigs:GIGS,error:GIG_ERR,loaded:LOADED,server:SERVER}))}));throw e});
  published=true;await page.evaluate(()=>load());assert.equal(await page.locator('#sugList [data-g="1"]').count(),2,'one service is discoverable under both categories');
  for(const key of ['air','eng','oil']){await page.evaluate(k=>category(k),key);assert.equal(await page.locator('#catGigs [data-g="1"]').count(),1);assert.equal(await page.locator('#catList [data-id="fixture-shop"]').count(),1)}
  offline=true;await page.evaluate(()=>loadGigs());assert.equal(await page.locator('#homeGigRetry').count(),1);assert.equal(await page.locator('#catGigRetry').count(),1);assert.equal(await page.locator('#sugList [data-g="1"]').count(),2);
  offline=false;await page.locator('#homeGigRetry').click();await page.waitForFunction(()=>!document.getElementById('homeGigRetry'));
  await page.evaluate(()=>owner({test:true,suspended:true,verified:false}));assert.match(await page.locator('#ownerNotice').innerText(),/ระงับ/);assert.match(await page.locator('#ownerNotice').innerText(),/ทดลอง/);
  published=false;await page.evaluate(()=>load());assert.equal(await page.locator('#sugList [data-g]').count(),0);assert.equal(await page.locator('#catList [data-id]').count(),0);
  await mkdir(resolve(root,'.qa/public-directory'),{recursive:true});await page.screenshot({path:resolve(root,'.qa/public-directory/hidden-'+width+'.png')});await page.close();
}assert.deepEqual(errors,[]);console.log(JSON.stringify({ok:true,viewports:[390,1280],checks:['Home refresh after publication','multi-category services','category shop discovery','retry without false empty','all visibility blockers','unpublish refresh'],productionWrites:0,pageErrors:errors}));
}finally{await browser.close();server.closeAllConnections();await new Promise(r=>server.close(r))}
