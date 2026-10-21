/* Real Chrome, all-public local fixtures and delayed synthetic status only.
   Uses the shipped settings card, entry module, openJoin and landing functions. */
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile,mkdir} from 'node:fs/promises';
import {resolve,extname} from 'node:path';
import {pathToFileURL} from 'node:url';
const root=resolve(import.meta.dirname,'..'),read=f=>readFile(resolve(root,f),'utf8');
const {chromium}=await import(pathToFileURL('C:/Users/Porsche/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs'));
const home=await read('index.html'),settings=await read('settings.js');
const card=settings.slice(settings.indexOf('function partnerHTML(){'),settings.indexOf('const chev='));
const join=home.slice(home.indexOf('async function openJoin(){'),home.indexOf('/* ใบสมัครช่างเป็นขั้น',home.indexOf('async function openJoin(){')));
const landing=home.slice(home.indexOf('function landing('),home.indexOf('function terms(){',home.indexOf('function landing(')));
const common=`<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/fonts/kanit.css"><link rel="stylesheet" href="/partner-entry.css"><script>localStorage.setItem('spire_lang','"th"');</script><script src="/partner-entry.js"></script><style>body{margin:0;background:#111214;color:#f5f3ef;font:15px/1.6 Kanit,system-ui}*{box-sizing:border-box}button,a{font:inherit}#profile{padding:24px}#profile a{display:block;color:inherit;padding:20px;border:1px solid #555;border-radius:16px}#profile small,#profile b{display:block}#bs{position:fixed;inset:0;z-index:2000;overflow:auto;background:#111214;padding:20px}#bs:not(.on){display:none}#bsB,#bsF{max-width:760px;margin:auto}#bsF button{width:100%;padding:16px;background:#c89960;border:0;border-radius:14px}h2{font-size:30px;line-height:1.2}h2 em{display:block;color:#efb36e}.jx-hero{padding:28px;border-radius:20px;background:#31231b}.jx-gl,.jx-mark{display:none}.jx-ben{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin:16px 0}.jx-ben>div{padding:12px;border:1px solid #ffffff24;border-radius:14px}.jx-ben small,.jx-ben b{display:block}.jx-get>div,.rule{padding:12px;border-bottom:1px solid #ffffff24}.jx-get small,.rule small{display:block}.err{color:#ffb4a9}button:disabled{opacity:.5}</style>`;
const profile=common+`<body><main id="profile"><h1>Profile &amp; Settings</h1><div id="partnerCard"></div></main><script>
  localStorage.setItem('spire_partner',JSON.stringify({uid:'fixture',s:'none'}));
  const W=window,me=()=>({uid:'fixture'}),fbUser=()=>({uid:'fixture'}),t=a=>a;
  ${card}\ndocument.getElementById('partnerCard').innerHTML=partnerHTML();
  </script>`;
const application=common+`<body><section class="view" id="vTech" hidden>STUDIO SHOULD NEVER APPEAR</section><div id="bs"><div id="bsB"></div><div id="bsF"></div></div><script>
  const $=id=>document.getElementById(id),U={uid:'fixture'},SH={cur:null,stack:[]},LOGO='',TH=true,ls={get:()=>null};
  let BOOT_TECH=true,ME=null,TP=null;const T=a=>a,esc=s=>String(s),DIDIT=()=>!!TP?.didit,dk=()=>[],wizBack=()=>false;
  function sheet(o){SH.cur=o;$('bs').className='on '+(o.cls||'');$('bsB').innerHTML=(o.body||'')+'<p id="err" role="alert"></p>';$('bsF').innerHTML=o.foot||'';o.mount?.();}
  const fx3d=()=>{},terms=()=>{},needLogin=()=>{throw Error('Unexpected sign-in')},openStudio=()=>{window.studioCalls=(window.studioCalls||0)+1},statusPage=()=>{},decided=()=>false;
  const refreshMe=async()=>{await fetch('/fixture/status');ME={technician:null,application:null};return true};
  const techPolicy=async()=>{await fetch('/fixture/policy');TP={ok:true,didit:true,ver:'fixture-only'};return TP};
  ${landing}\n${join}\nopenJoin();
  </script>`;
const routes=[],requests=[];let delayPage=true;
const server=createServer(async(req,res)=>{try{const p=new URL(req.url,'http://localhost').pathname;requests.push(p);res.setHeader('Cache-Control','no-store');
  if(['/profile','/garage','/chat','/news','/spares'].includes(p)){res.setHeader('Content-Type','text/html; charset=utf-8');res.end(profile);return}
  if(p==='/join'){if(delayPage)await new Promise(r=>setTimeout(r,1200));res.setHeader('Content-Type','text/html; charset=utf-8');res.end(application);return}
  if(p.startsWith('/fixture/')){await new Promise(r=>setTimeout(r,1200));res.setHeader('Content-Type','application/json');res.end('{}');return}
  if(!/^\/[\w/.-]+$/.test(p))throw Error('path');res.setHeader('Content-Type',({'.js':'text/javascript','.css':'text/css','.woff2':'font/woff2'})[extname(p)]||'text/plain');res.end(await readFile(resolve(root,p.slice(1))));
}catch{res.writeHead(404);res.end()}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+server.address().port;
const browser=await chromium.launch({headless:true,channel:'chrome'}),ctx=await browser.newContext({viewport:{width:390,height:844},isMobile:true,locale:'th-TH'}),page=await ctx.newPage(),errors=[];
const paints=[];let paintResolve=null;
await page.exposeFunction('recordEntryPaint',p=>{paints.push(p);paintResolve?.(p);paintResolve=null});
await page.addInitScript(()=>{document.addEventListener('click',()=>{requestAnimationFrame(()=>{const el=document.getElementById('partnerEntryTitle');if(el){const box=el.getBoundingClientRect();window.recordEntryPaint({path:location.pathname,text:el.textContent,visible:box.width>0&&box.height>0})}})},true)});
page.on('pageerror',e=>errors.push(e.message));page.on('framenavigated',f=>{if(f===page.mainFrame())routes.push(new URL(f.url()).pathname)});
try{
  for(const origin of ['/profile','/garage','/chat','/news','/spares']){
    await page.goto(base+origin);const a=page.locator('[data-partner]');assert.equal(await a.getAttribute('href'),'/join','a known new applicant must not enter Studio');
    const box=await a.boundingBox(),next=page.waitForURL(base+'/join'),painted=new Promise(r=>paintResolve=r);await page.mouse.click(box.x+box.width/2,box.y+box.height/2);
    const paintedEntry=await Promise.race([painted,new Promise((_,reject)=>setTimeout(()=>reject(Error('No immediate entry paint from '+origin)),5000))]);assert.equal(paintedEntry.path,origin);assert.equal(paintedEntry.visible,true);assert.match(paintedEntry.text,/ร่วมเป็นพาร์ทเนอร์ช่าง/);
    await next;await page.locator('#bs .jx-hero').waitFor({state:'visible'});assert.equal(await page.locator('#partnerEntry').count(),0);assert.equal(await page.locator('#lGo').isDisabled(),true);
    await page.waitForFunction(()=>document.getElementById('lGo')&&!document.getElementById('lGo').disabled);assert.equal(await page.evaluate(()=>window.studioCalls||0),0);
  }
  delayPage=false;await page.goto(base+'/join');await page.locator('#bs .jx-hero').waitFor({state:'visible'});await mkdir(resolve(root,'.qa/partner-entry'),{recursive:true});await page.screenshot({path:resolve(root,'.qa/partner-entry/join-mobile.png')});
  assert.ok(!routes.includes('/studio'));assert.ok(!requests.some(p=>p==='/api/tech/apply'));assert.deepEqual(errors,[]);
  console.log(JSON.stringify({ok:true,origins:5,immediateEntryPaints:paints.length,destinationDelayMs:1200,statusDelayMs:1200,studioNavigations:0,studioCalls:0,applicationSubmissions:0,pageErrors:errors}));
}finally{await browser.close();server.closeAllConnections();await new Promise(r=>server.close(r))}
