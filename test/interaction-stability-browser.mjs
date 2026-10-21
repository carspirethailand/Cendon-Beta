/* Real Chromium/Android-sized DOM; synthetic auth and endpoints only. No real
   application, LINE link or mechanic message is sent by this regression. */
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile,mkdir} from 'node:fs/promises';
import {resolve,extname} from 'node:path';
import {pathToFileURL} from 'node:url';
const root=resolve(import.meta.dirname,'..'),read=f=>readFile(resolve(root,f),'utf8');
const {chromium}=await import(pathToFileURL('C:/Users/Porsche/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs'));
const index=await read('index.html'),surface=await read('call-surface.js');
const handler=index.slice(index.indexOf('      const consentPolicy='),index.indexOf('      })}});}',index.indexOf('      const consentPolicy=')))+'      });';
const busy=index.slice(index.indexOf('async function busy('),index.indexOf('/* ═══ กล่องเตือน',index.indexOf('async function busy(')));
const intro=`<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/fonts/kanit.css"><style>body{font-family:Kanit,system-ui;background:#111;color:#fff;padding:20px}button,select,textarea{font:inherit;padding:12px;max-width:100%}button:disabled{opacity:.5}.cl-row{display:flex;gap:12px;align-items:center}.cl-ic{width:44px}.cl-tx{flex:1}.cl-tx small{display:block}</style>`;
const auth=`window.BACKEND_URL=location.origin;window.TECH_API_URL=location.origin;window.spireAuth={currentUser:{uid:'synthetic-owner',getIdToken:async()=> 'fixture-only'}};window.auth=spireAuth;window.lang='th';`;
let lineGets=0,threads=0;const sent=[];
const fixtures={
  submit:intro+`<div id="bs" class="on"><p id="err"></p><input id="dAI" type="checkbox"><button id="aGo">ยื่นใบสมัคร</button></div><script>${auth}
    const $=id=>document.getElementById(id);const U=spireAuth.currentUser;const TP={ok:true,didit:true,ver:'fixture-consent'};const DIDIT=()=>true;
    const techPolicy=()=>new Promise(r=>setTimeout(()=>r({...TP,ver:window.latestPolicyVer||TP.ver}),150));let APP={docs:{},birth:'1990-01-01',cats:['eng']};
    const ageOf=()=>36,dk=()=>[],api=async(path,opts)=>{window.posts=(window.posts||0)+1;window.lastPosted=opts.body;await new Promise(r=>setTimeout(r,80));return {ok:true}};
    const ME={application:{status:'pending'}},refreshMe=async()=>{},sheetFresh=()=>{},statusPage=()=>{window.finished=true};const toast=m=>{$('err').textContent=m};
    ${busy}\n${handler}
    </script>`,
  line:intro+`<script>${auth}</script><div data-line-connect="row"></div><div data-line-connect="row"></div><script src="/cendon-line.js"></script>`,
  valet:intro+`<div id="thread"></div><script>${auth}localStorage.setItem('spire_valet',JSON.stringify({on:true,uid:'synthetic-owner'}));
    window.messages=[];window.garage=()=>[{id:'c1',make:'Porsche',model:'911',name:'Porsche 911',year:2026}];window.selCar=()=>garage()[0];window.saveSession=()=>{};window.toast=()=>{};
    </script><script src="/garage-rules.js"></script><script src="/valet-core.js"></script><script src="/valet.js"></script><script>
    window.m={role:'ai',acts:[CendonValet.intent('ช่วยทักช่างนนทการช่างว่ารถสตาร์ตไม่ติด Porsche 911')]};messages.push(m);document.getElementById('thread').innerHTML=CendonValet.html(m);
    </script>`,
  surface:intro+`<link rel="stylesheet" href="/call-ui.css"><style>.lx-flip{position:relative;perspective:1600px}.lx-flipin{position:relative;height:118px;transform-style:preserve-3d;transform:rotateY(180deg)}.lx-fa{position:absolute;inset:0;transform:rotateY(180deg);background:#161618}</style><div id="hFlip" class="lx-flip" data-cv-slide><div class="lx-flipin"><form id="hForm" class="lx-fa"></form></div></div><script src="/call-surface.js"></script><script>
    window.view=CendonCallSurface.create({anchor:document.getElementById('hForm'),language:'th'});view.bind({});view.open();view.showValet({title:'ตรวจข้อความก่อนส่ง',state:'ready',text:'รถสตาร์ตไม่ติด · ไม่มีข้อความกลับด้าน'});
    </script>`
};
const server=createServer(async(req,res)=>{try{const path=new URL(req.url,'http://localhost').pathname;
  res.setHeader('Cache-Control','no-store');
  if(path==='/api/line/link'){lineGets++;await new Promise(r=>setTimeout(r,800));res.setHeader('Content-Type','application/json');res.end(JSON.stringify({linked:true,oa:'@fixture'}));return}
  if(path==='/api/tech'){res.setHeader('Content-Type','application/json');res.end(JSON.stringify({techs:[{id:'t1',uid:'mechanic-fixture',verified:true,shop:'นนทการช่าง',area:'กรุงเทพ'}]}));return}
  if(path==='/api/tech/threads'){threads++;let text='';for await(const x of req)text+=x;sent.push(JSON.parse(text));res.setHeader('Content-Type','application/json');res.end(JSON.stringify({thread:{id:'thread-fixture'}}));return}
  const name=path.slice(1);if(fixtures[name]){res.setHeader('Content-Type','text/html; charset=utf-8');res.end(fixtures[name]);return}
  if(!/^[\w/.-]+$/.test(name))throw Error('path');res.setHeader('Content-Type',({'.js':'text/javascript','.css':'text/css','.woff2':'font/woff2'})[extname(name)]||'application/octet-stream');res.end(await readFile(resolve(root,name)));
}catch{res.writeHead(404);res.end()}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+server.address().port;
const browser=await chromium.launch({headless:true,channel:'chrome'}),ctx=await browser.newContext({viewport:{width:390,height:844},isMobile:true,deviceScaleFactor:1,locale:'th-TH'});
const page=await ctx.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
try{
  await page.goto(base+'/submit');await page.locator('#aGo').evaluate(b=>{b.click();b.click()});await page.waitForFunction(()=>window.finished===true);assert.equal(await page.evaluate(()=>posts),1);assert.equal(await page.locator('#err').textContent(),'');assert.equal(await page.evaluate(()=>lastPosted.aiConsent),false);
  await page.goto(base+'/submit');await page.locator('#dAI').check();await page.locator('#aGo').click();await page.waitForFunction(()=>window.finished===true);assert.equal(await page.evaluate(()=>lastPosted.aiConsent),true);
  await page.goto(base+'/submit');await page.evaluate(()=>{window.latestPolicyVer='changed-version';document.getElementById('aGo').click()});await page.waitForFunction(()=>document.getElementById('err').textContent.length>0);assert.equal(await page.evaluate(()=>window.posts||0),0,'changed consent requires review, no submission');
  await page.goto(base+'/submit');await page.evaluate(()=>{document.getElementById('aGo').click();U.uid='another-account'});await page.waitForFunction(()=>!document.getElementById('aGo').disabled);assert.equal(await page.evaluate(()=>window.posts||0),0,'account change cancels submission');
  await page.goto(base+'/line');await page.waitForFunction(()=>document.querySelectorAll('.cl-row').length===2);assert.ok(await page.locator('.cl-tx').first().textContent());await page.waitForFunction(()=>document.body.textContent.includes('เชื่อมแล้ว'));assert.equal(lineGets,1,'one request shared by both LINE rows');
  await page.goto(base+'/surface');await page.locator('.cv-results').waitFor({state:'visible'});assert.equal(await page.locator('.cv-results').evaluate(el=>el.parentNode.id),'hFlip');assert.equal(await page.locator('.cv-results').evaluate(el=>{for(let p=el.parentElement;p;p=p.parentElement)if(getComputedStyle(p).transform.includes('matrix3d(-1'))return true;return false}),false);
  await mkdir(resolve(root,'.qa/interaction-stability'),{recursive:true});await page.screenshot({path:resolve(root,'.qa/interaction-stability/popup-mobile.png')});
  await page.goto(base+'/valet');const send=page.locator('[data-va="msg"]');await page.waitForFunction(()=>!document.querySelector('[data-f="shop"]').disabled);assert.equal(threads,0,'preparation never sends');await send.click();await page.waitForFunction(()=>document.body.textContent.includes('ส่งข้อความถึง นนทการช่าง แล้ว'));assert.equal(threads,1);assert.equal(sent[0].techId,'t1');assert.equal(sent[0].text,'รถสตาร์ตไม่ติด Porsche 911');
  assert.deepEqual(errors,[]);console.log(JSON.stringify({ok:true,submitClicks:1,submitPosts:1,linePanels:2,lineRequests:lineGets,reviewedMessages:threads,popup:'outside flipped layer',pageErrors:errors}));
}finally{await browser.close();server.closeAllConnections();await new Promise(r=>server.close(r))}
