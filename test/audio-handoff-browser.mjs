/* Real Home -> IndexedDB -> Chat tool bridge, with synthetic audio and no provider calls. */
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {resolve,extname} from 'node:path';
import {pathToFileURL} from 'node:url';
const root=resolve(import.meta.dirname,'..'),home=await readFile(resolve(root,'index.html'),'utf8'),chat=await readFile(resolve(root,'chat.html'),'utf8');
const section=(s,a,b)=>{const i=s.indexOf(a),j=s.indexOf(b,i);assert.ok(i>=0&&j>i);return s.slice(i,j)};
const handoff=section(home,'async function featureHandoff(o){','const dataBlob='),entry=section(chat,'function featureJob(){','window.runFeatureJob=runFeatureJob;'),ledger=chat.match(/<script id="ledgerjs">([\s\S]*?)<\/script>/)[1];
const head=`<meta charset="utf-8"><script>window.BACKEND_URL=location.origin;window.lang='en';window.carValue={id:'one',make:'Toyota',model:'Fortuner',name:'Toyota Fortuner',year:2013,info:{engine:'3.0L D-4D',engine_code:'1KD-FTV'}};window.selCar=()=>carValue;window.garage=()=>[carValue];window.spireAuth={currentUser:{uid:'one',getIdToken:async()=> 'fixture'}};window.auth=spireAuth;window.spireT=(th,en)=>en;</script><script src="/vehicle-audio.js"></script><script src="/media-store.js"></script>`;
const homeFixture=head+`<button id="send">Send</button><script>const U=spireAuth.currentUser,READY={user:Promise.resolve()},T=(th,en)=>en,ls={set:(k,v)=>localStorage.setItem(k,JSON.stringify(v))},needLogin=()=>{throw Error('unexpected auth')};${handoff}
document.getElementById('send').onclick=async()=>{const bytes=new Uint8Array(160044);bytes.set(new TextEncoder().encode('RIFF'));const v=CendonVehicleAudio.defaultChoice(carValue);await featureHandoff({tool:'listen',car:'one',text:'Synthetic sound',audioVehicle:CendonVehicleAudio.payload(v),recording:{source:'dedicated_microphone',durationSeconds:5,sampleRate:16000,processing:{}},files:[{kind:'audio',mime:'audio/wav',blob:new Blob([bytes],{type:'audio/wav'})}]})};</script>`;
const chatFixture=head+`<body data-phase="thread"><main class="main"><section id="v-thread"></section></main><div id="composer"><textarea id="inp"></textarea></div><script>const $=id=>document.getElementById(id);let messages=[],pending=[],sending=false;const newSession=()=>{},enterThread=()=>{},renderAtts=()=>{},autoSize=()=>{},updateSend=()=>{},toast=m=>{window.error=m};window.spireHasFeature=()=>true;window.switchView=()=>{};window.CendonValetCore={curCar:selCar,cars:garage};
async function sendMsg(){const job=await CendonFeatureAI.prepare(pending,$('inp').value),body=await CendonFeatureAI.payload(job);const r=await fetch('/fixture-result',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});if(r.ok)document.body.dataset.sent='yes'}
${entry}</script><script src="/feature-ai.js"></script><script>${ledger}</script><script>document.addEventListener('DOMContentLoaded',()=>setTimeout(()=>runFeatureJob().catch(e=>window.error=e.message),0));</script></body>`;
let sent;const server=createServer(async(req,res)=>{try{const p=new URL(req.url,'http://unit.test').pathname;
  if(p==='/'||p==='/chat'){res.setHeader('Content-Type','text/html; charset=utf-8');res.end(p==='/'?homeFixture:chatFixture);return}
  if(p==='/fixture-result'){let raw='';for await(const b of req)raw+=b;sent=JSON.parse(raw);res.setHeader('Content-Type','application/json');res.end('{}');return}
  if(!/^\/[\w.-]+$/.test(p))throw Error('path');res.setHeader('Content-Type',({'.js':'text/javascript','.css':'text/css'})[extname(p)]||'text/plain');res.end(await readFile(resolve(root,p.slice(1))));
}catch{res.writeHead(404);res.end()}});await new Promise(r=>server.listen(0,'127.0.0.1',r));
const {chromium}=await import(pathToFileURL('C:/Users/Porsche/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs'));
const browser=await chromium.launch({channel:'chrome',headless:true}),page=await browser.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
try{
  await page.goto('http://127.0.0.1:'+server.address().port+'/');await page.locator('#send').click();await page.waitForURL('**/chat?car=one');await page.waitForFunction(()=>document.body.dataset.sent==='yes');
  assert.equal(sent.tool,'listen');assert.equal(sent.context.audioVehicle.vehicle.model,'Fortuner');assert.equal(sent.context.car.engine_code,'1KD-FTV');assert.equal(sent.context.recording.source,'dedicated_microphone');assert.equal(Buffer.from(sent.attachments[0].b64,'base64').subarray(0,4).toString(),'RIFF');
  assert.equal(await page.evaluate(()=>sessionStorage.getItem('spire_featureJob')),null);assert.deepEqual(errors,[]);console.log('PASS actual Home media handoff -> persistent blob -> Chat bridge/payload, vehicle details and recording settings retained');
}finally{await browser.close();server.closeAllConnections();await new Promise(r=>server.close(r))}
