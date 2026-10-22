/* Actual inventory, cards, service form and private-image helper; local fixtures only. */
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile,mkdir} from 'node:fs/promises';
import {resolve,extname} from 'node:path';
import {pathToFileURL} from 'node:url';
const root=resolve(import.meta.dirname,'..'),home=await readFile(resolve(root,'index.html'),'utf8');
const part=(a,b)=>home.slice(home.indexOf(a),home.indexOf(b,home.indexOf(a)));
const {chromium}=await import(pathToFileURL('C:/Users/Porsche/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs'));
const shop={id:'shop-one',name:'Fixture mechanic',shop:'Fixture shop',test:true,suspended:true,verified:false,photos:[7]};
const gig=id=>({id,title:'บริการเดิม '+id,price:1200,body:'รายละเอียดเดิม',cats:['air'],brands:[],photos:[7],tech:shop,createdAt:100+id,visibility:'suspended',managed:true});
let services=[gig(1),gig(2)],offline=false;const writes=[],imageReads=[],errors=[];
const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aMz8AAAAASUVORK5CYII=','base64');
const pageHtml=`<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/fonts/kanit.css"><link rel="stylesheet" href="/lux.css"><style>body{font:16px Kanit,system-ui;background:#111214;color:#f7f7f7;padding:20px}button,input,textarea{font:inherit}button{cursor:pointer}.lx-gigs{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}.lx-gc{display:block;background:#222;color:inherit;width:100%;border-radius:16px;overflow:hidden}.lx-gch,.lx-gcf,.lx-gct{display:block}.lx-gcv{display:block;aspect-ratio:16/9;position:relative}.lx-gcv img{position:absolute;inset:0;width:100%;height:100%;object-fit:contain}.sp-btn{padding:8px}.lx-fb{display:none}.so-fine{line-height:1.6}.fld{display:block;margin:14px 0}.fld span,.fld input,.fld textarea{display:block;width:100%;box-sizing:border-box}#bs{background:#222;padding:16px;margin-top:16px}#bs:not(.on){display:none}.err{color:#ffabab}</style><script src="/shop-images.js"></script><body><main id="dBody"></main><section id="bs"><div id="bsB"></div><footer id="bsF"></footer></section><output id="notice"></output><script>
const API=location.origin;window.BACKEND_URL=API;let U={uid:'one',getIdToken:async()=> 'fixture-one'},ME={uid:'one',technician:${JSON.stringify(shop)}},MODE='tech',DT='posts';
window.spireAuth={get currentUser(){return U}};const $=id=>document.getElementById(id),T=(th,en)=>th,tr=x=>x,esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])),initial=()=> 'F',money=n=>String(n),LOC='th-TH',GIG_MAX=2,GIG_CATS=6;
const myShop=()=>ME.technician,isMine=t=>t?.id===ME.technician?.id,img=id=>API+'/api/tech/img/'+id,RAIL=[{id:'air',th:'แอร์'}],NOT_GCAT=[],gigAllowed=()=>true,gigCat=()=> 'air',stuUrl=()=> '/studio/post';
const toast=t=>{$('notice').textContent=t},errBar=(t,id)=>'<p class="err">'+esc(t)+'</p><button id="'+id+'">ลองใหม่</button>',setTab2=k=>{DT=k;tabPosts()},wire=()=>{},sponsorSheet=()=>{},shrink=()=>{};
let popups=0;function formPop(){popups++}function fieldOf(){return ''}
${part('async function api(path,o){','function needLogin(){')}
${part('async function busy(btn,fn){','/* ═══ กล่องเตือน')}
${part('let GIGS=null;','async function loadGigs(){')}
${part('function gigCard(g,i,o){','function sponsorSheet(g){')}
${part('const myGigs=','/* คอม: แถวหมวดยาวเกินจอ')}
function sheet(o){$('bs').className='on';$('bsB').innerHTML=o.body||'';$('bsF').innerHTML=o.foot||'';o.mount?.($('bsB'),$('bsF'))}
function closeSheet(){$('bs').className='';$('bsB').innerHTML='';$('bsF').innerHTML=''}
function openGig(id){const g=findGig(id);if(g)gigForm(g)}
async function afterGig(){closeSheet();await tabPosts()}
window.switchAccount=()=>{resetOwnGigs();U={uid:'two',getIdToken:async()=> 'fixture-two'};ME={uid:'two',technician:{id:'shop-two',test:true}};return tabPosts()};
document.addEventListener('DOMContentLoaded',()=>tabPosts());</script>`;
const server=createServer(async(req,res)=>{try{
  const u=new URL(req.url,'http://localhost');res.setHeader('Cache-Control','no-store');
  if(u.pathname==='/'){res.setHeader('Content-Type','text/html; charset=utf-8');res.end(pageHtml);return}
  if(u.pathname==='/api/tech/gigs'){
    res.setHeader('Content-Type','application/json');if(offline){res.writeHead(503);res.end('{"error":"fixture offline"}');return}
    const mine=u.searchParams.get('mine')==='1'&&req.headers.authorization==='Bearer fixture-one',rows=mine?services:[];
    res.end(JSON.stringify({gigs:rows,quota:{used:rows.length,limit:2},visibility:'suspended'}));return;
  }
  if(u.pathname==='/api/tech/gig'&&req.method==='POST'){
    let body='';for await(const chunk of req)body+=chunk;const data=JSON.parse(body);writes.push(data);res.setHeader('Content-Type','application/json');
    if(!data.id&&services.length>=2){res.writeHead(409);res.end('{"error":"มีบริการเดิมครบ 2 รายการแล้ว เปิด Studio > บริการ","code":"SERVICE_LIMIT"}');return}
    const id=data.id||3;services=services.filter(g=>g.id!==id).concat({...gig(id),...data,photos:data.keep||[]});res.end(JSON.stringify({ok:true,id,photos:data.keep||[]}));return;
  }
  if(u.pathname==='/api/tech/img/7'){
    if(u.searchParams.get('owner')==='1'&&req.headers.authorization==='Bearer fixture-one'){imageReads.push('authenticated-owner');res.setHeader('Content-Type','image/png');res.end(png);return}
    res.writeHead(404);res.end();return;
  }
  if(!/^\/[\w/.-]+$/.test(u.pathname))throw Error('path');res.setHeader('Content-Type',({'.js':'text/javascript','.css':'text/css','.woff2':'font/woff2'})[extname(u.pathname)]||'text/plain');res.end(await readFile(resolve(root,u.pathname.slice(1))));
}catch{res.writeHead(404);res.end()}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+server.address().port;
const browser=await chromium.launch({headless:true,channel:'chrome'}),page=await browser.newPage({viewport:{width:390,height:844}});page.on('pageerror',e=>errors.push(e.message));
try{
  await page.goto(base);await page.waitForFunction(()=>document.querySelectorAll('#dBody [data-g]').length===2);
  assert.equal(await page.locator('#pNew').count(),0);assert.match(await page.locator('#dBody').innerText(),/บริการเดิมยังอยู่/);assert.equal(await page.locator('[data-spon]:disabled').count(),2);
  await page.waitForFunction(()=>[...document.querySelectorAll('#dBody img')].some(x=>x.src.startsWith('blob:')));assert.ok(imageReads.length>0);
  await page.evaluate(()=>gigForm());assert.equal(await page.locator('#gSave').count(),0);assert.equal(writes.length,0,'full quota is checked before a new form');
  await page.locator('#dBody [data-g="1"]').click();await page.locator('#gT').fill('บริการเดิม แก้ไขแล้ว');await page.locator('#gSave').click();
  await page.waitForFunction(()=>!document.getElementById('bs').classList.contains('on'));assert.equal(writes[0].id,1);assert.deepEqual(writes[0].keep,[7]);assert.equal(services.length,2);
  await page.reload();await page.waitForFunction(()=>document.querySelectorAll('#dBody [data-g]').length===2);assert.match(await page.locator('#dBody').innerText(),/แก้ไขแล้ว/);
  services=services.filter(g=>g.id===1);await page.evaluate(()=>gigForm());await page.locator('#gT').fill('บริการใหม่ที่ยังไม่ได้บันทึก');await page.locator('#gP').fill('900');await page.locator('#gC [data-c="air"]').click();
  services.push(gig(2));await page.locator('#gSave').click();await page.waitForFunction(()=>document.getElementById('gErr').textContent.includes('ครบ 2'));
  assert.equal(await page.locator('#gT').inputValue(),'บริการใหม่ที่ยังไม่ได้บันทึก');assert.equal(await page.evaluate(()=>popups),0,'quota conflict must not trigger incomplete-form popup');
  await page.evaluate(()=>closeSheet());offline=true;await page.evaluate(()=>tabPosts());assert.match(await page.locator('#dBody').innerText(),/offline/);assert.doesNotMatch(await page.locator('#dBody').innerText(),/ยังไม่มีบริการ/);
  offline=false;await page.locator('#pRetry').click();await page.waitForFunction(()=>document.querySelectorAll('#dBody [data-g]').length===2);
  await mkdir(resolve(root,'.qa/studio-services'),{recursive:true});await page.screenshot({path:resolve(root,'.qa/studio-services/services-mobile.png')});
  await page.evaluate(()=>switchAccount());assert.equal(await page.locator('#dBody [data-g]').count(),0);assert.equal(await page.evaluate(()=>myGigs().length),0);
  assert.deepEqual(errors,[]);console.log(JSON.stringify({ok:true,checks:['two hidden services recovered','owner-only photos','quota preflight','edit preserves id/photos','page reload','409 preserves draft without popup','offline is not empty','account isolation'],productionWrites:0,pageErrors:errors}));
}finally{await browser.close();server.closeAllConnections();await new Promise(r=>server.close(r))}
