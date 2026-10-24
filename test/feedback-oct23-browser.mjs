/* Synthetic recordings and accounts only: exercises production Home handlers. */
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createServer} from 'node:http';
import {resolve,extname} from 'node:path';
import {pathToFileURL} from 'node:url';
const root=resolve(import.meta.dirname,'..'),home=await readFile(resolve(root,'index.html'),'utf8');
function part(source,a,b){const i=source.indexOf(a),j=source.indexOf(b,i);assert.ok(i>=0&&j>i,a);return source.slice(i,j)}
const listening=part(home,'const LP_MAX=60;','/* ═══ ส่งรูปให้ AI ดู');
const busy=part(home,'async function busy(btn,fn){','/* ═══ กล่องเตือน');
const partner=part(home,'function drawPartner(){',"window.addEventListener('cendon:partner-state'");
const fixture=`<meta charset="utf-8"><button id="open">Open</button><div id="hPartner"></div><div id="bs"><main id="body"></main><footer id="foot"></footer></div><script>
const $=id=>document.getElementById(id),T=(th,en)=>en,esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
window.sent=[];window.failSend=false;window.handoffDelay=0;const SH={},myCars=()=>[[{id:'one',name:'Toyota Fortuner',year:2013}],'one'];
const U={uid:'one'},LOGO='',ls={get:()=>null},fx3d=()=>{};window.partnerClicks=0;window.fixturePartner='shop';window.CendonPartnerState={peek:()=>({uid:'one',s:fixturePartner})};const openStudio=()=>{partnerClicks++},openJoin=openStudio,needLogin=()=>{throw Error('Unexpected sign-in')};
const toast=message=>{window.error=message},formPop=()=>{},fieldOf=()=>'';
const sheet=o=>{$('body').innerHTML=o.body;$('foot').innerHTML=o.foot;o.mount($('body'),$('foot'),o)};
const featureHandoff=async o=>{if(failSend)throw Error('Synthetic offline');await new Promise(r=>setTimeout(r,handoffDelay));sent.push({tool:o.tool,text:o.text,car:o.car,files:await Promise.all(o.files.map(async f=>({kind:f.kind,mime:f.mime,size:f.blob.size,head:new TextDecoder().decode((await f.blob.arrayBuffer()).slice(0,4))})))})};
${busy}\n${partner}\n${listening}\ndrawPartner();document.getElementById('open').onclick=listenPage;</script>`;
const server=createServer(async(req,res)=>{try{const path=new URL(req.url,'http://unit.test').pathname;if(path==='/fixture'){res.setHeader('Content-Type','text/html; charset=utf-8');res.end(fixture);return}res.setHeader('Content-Type',({'.js':'text/javascript','.css':'text/css'})[extname(path)]||'text/plain');res.end(await readFile(resolve(root,path.slice(1))))}catch{res.writeHead(404);res.end()}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const {chromium}=await import(pathToFileURL('C:/Users/Porsche/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs'));
const browser=await chromium.launch({channel:'chrome',headless:true,args:['--use-fake-device-for-media-stream','--use-fake-ui-for-media-stream']});
const context=await browser.newContext({permissions:['microphone']}),page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
function wav(){const rate=16000,n=rate*5,b=Buffer.alloc(44+n*2);b.write('RIFF');b.writeUInt32LE(b.length-8,4);b.write('WAVEfmt ',8);b.writeUInt32LE(16,16);b.writeUInt16LE(1,20);b.writeUInt16LE(1,22);b.writeUInt32LE(rate,24);b.writeUInt32LE(rate*2,28);b.writeUInt16LE(2,32);b.writeUInt16LE(16,34);b.write('data',36);b.writeUInt32LE(n*2,40);for(let i=0;i<n;i++)b.writeInt16LE(Math.round(Math.sin(i/rate*440*Math.PI*2)*15000),44+i*2);return b}
try{
  page.setDefaultTimeout(10000);await page.goto('http://127.0.0.1:'+server.address().port+'/fixture');await page.locator('#open').click();const submit=page.locator('#foot #lpGo');assert.equal(await submit.isDisabled(),true,'the real sheet submit must wait for a clip, not change the Home partner card');
  await page.locator('#lpFile').setInputFiles({name:'synthetic.wav',mimeType:'audio/wav',buffer:wav()});await page.waitForFunction(()=>document.querySelector('#foot #lpGo')?.disabled===false);
  await page.locator('.lp2-zones [data-k="exhaust"]').click();await page.locator('#lpWhen [data-k="idle"]').click();
  await page.evaluate(()=>{fixturePartner='pending';drawPartner()});assert.equal(await page.locator('#hPartner button').isDisabled(),false);
  await page.locator('.lp2-note summary').click();await page.locator('#lpNote').fill('Synthetic recording');await page.evaluate(()=>handoffDelay=400);await submit.click();assert.equal(await submit.isDisabled(),true);assert.equal(await submit.getAttribute('aria-busy'),'true');assert.equal(await submit.innerText(),'Sending…');
  await page.evaluate(()=>{fixturePartner='approved';drawPartner();document.querySelector('#foot #lpGo').click()});await page.waitForFunction(()=>sent.length===1);assert.equal(await page.evaluate(()=>sent.length),1,'double taps do not submit twice');await page.waitForFunction(()=>document.querySelector('#foot #lpGo')?.disabled===false);await page.evaluate(()=>handoffDelay=0);
  const sent=await page.evaluate(()=>window.sent[0]);assert.equal(sent.files[0].head,'RIFF');assert.equal(sent.car,'one');assert.equal(sent.tool,'listen');assert.match(sent.text,/Exhaust/);assert.match(sent.text,/Idling/);
  await page.evaluate(()=>failSend=true);await submit.click();await page.waitForFunction(()=>document.querySelector('#lpErr').textContent==='Synthetic offline');assert.equal(await submit.isDisabled(),false);assert.equal(await page.locator('audio').count(),1);
  await page.evaluate(()=>failSend=false);await page.locator('#lpRedo').click();await page.locator('#lpRec').click();await page.waitForTimeout(5300);await page.locator('#lpStop').click();await page.waitForFunction(()=>document.querySelector('#foot #lpGo')?.disabled===false);await page.locator('[data-k="engine"]').first().click();await submit.click();await page.waitForFunction(()=>sent.length===2);
  await page.locator('#hPartner button').click();assert.equal(await page.evaluate(()=>partnerClicks),1,'the partner card keeps its own action');
  await page.locator('#open').click();await page.evaluate(()=>{window.stoppedLateTracks=0;navigator.mediaDevices.getUserMedia=()=>new Promise(resolve=>{window.releaseLateMic=()=>resolve({getTracks:()=>[{stop(){stoppedLateTracks++}}]})})});
  await page.locator('#lpRec').click();await page.evaluate(()=>{SH.onClose();document.getElementById('body').innerHTML='';document.getElementById('foot').innerHTML='';releaseLateMic()});await page.waitForFunction(()=>stoppedLateTracks===1);
  assert.deepEqual(errors,[]);console.log('PASS real Home partner card + upload/record/exhaust/idling/send/retry/clip retention, independent controls after background redraw');
}finally{await browser.close();server.closeAllConnections();await new Promise(r=>server.close(r))}
