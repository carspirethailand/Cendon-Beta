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
const fixture=`<meta charset="utf-8"><button id="open">Open</button><div id="bs"><main id="body"></main><footer id="foot"></footer></div><script>
const $=id=>document.getElementById(id),T=(th,en)=>en,esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
window.sent=[];window.failSend=false;const SH={},myCars=()=>[[{id:'one',name:'Toyota Fortuner',year:2013}],'one'];
const toast=message=>{window.error=message},formPop=()=>{},fieldOf=()=>'';
const sheet=o=>{$('body').innerHTML=o.body;$('foot').innerHTML=o.foot;o.mount($('body'),$('foot'),o)};
const featureHandoff=async o=>{if(failSend)throw Error('Synthetic offline');sent.push({tool:o.tool,text:o.text,car:o.car,files:await Promise.all(o.files.map(async f=>({kind:f.kind,mime:f.mime,size:f.blob.size,head:new TextDecoder().decode((await f.blob.arrayBuffer()).slice(0,4))})))})};
${busy}\n${listening}\ndocument.getElementById('open').onclick=listenPage;</script>`;
const server=createServer(async(req,res)=>{try{const path=new URL(req.url,'http://unit.test').pathname;if(path==='/fixture'){res.setHeader('Content-Type','text/html; charset=utf-8');res.end(fixture);return}res.setHeader('Content-Type',({'.js':'text/javascript','.css':'text/css'})[extname(path)]||'text/plain');res.end(await readFile(resolve(root,path.slice(1))))}catch{res.writeHead(404);res.end()}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const {chromium}=await import(pathToFileURL('C:/Users/Porsche/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs'));
const browser=await chromium.launch({channel:'chrome',headless:true,args:['--use-fake-device-for-media-stream','--use-fake-ui-for-media-stream']});
const context=await browser.newContext({permissions:['microphone']}),page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
function wav(){const rate=16000,n=rate*5,b=Buffer.alloc(44+n*2);b.write('RIFF');b.writeUInt32LE(b.length-8,4);b.write('WAVEfmt ',8);b.writeUInt32LE(16,16);b.writeUInt16LE(1,20);b.writeUInt16LE(1,22);b.writeUInt32LE(rate,24);b.writeUInt32LE(rate*2,28);b.writeUInt16LE(2,32);b.writeUInt16LE(16,34);b.write('data',36);b.writeUInt32LE(n*2,40);for(let i=0;i<n;i++)b.writeInt16LE(Math.round(Math.sin(i/rate*440*Math.PI*2)*15000),44+i*2);return b}
try{
  await page.goto('http://127.0.0.1:'+server.address().port+'/fixture');await page.locator('#open').click();assert.equal(await page.locator('#lpGo').isDisabled(),true);
  await page.locator('#lpFile').setInputFiles({name:'synthetic.wav',mimeType:'audio/wav',buffer:wav()});await page.waitForFunction(()=>document.querySelector('#lpGo')?.disabled===false);
  await page.locator('.lp2-note summary').click();await page.locator('#lpNote').fill('Synthetic recording');await page.locator('#lpGo').click();await page.waitForFunction(()=>sent.length===1);
  const sent=await page.evaluate(()=>window.sent[0]);assert.equal(sent.files[0].head,'RIFF');assert.equal(sent.car,'one');assert.equal(sent.tool,'listen');
  await page.evaluate(()=>failSend=true);await page.locator('#lpGo').click();await page.waitForFunction(()=>document.querySelector('#lpErr').textContent==='Synthetic offline');assert.equal(await page.locator('#lpGo').isDisabled(),false);assert.equal(await page.locator('audio').count(),1);
  await page.evaluate(()=>failSend=false);await page.locator('#lpRedo').click();await page.locator('#lpRec').click();await page.waitForTimeout(5300);await page.locator('#lpStop').click();await page.waitForFunction(()=>document.querySelector('#lpGo')?.disabled===false);await page.locator('[data-k="engine"]').first().click();await page.locator('#lpGo').click();await page.waitForFunction(()=>sent.length===2);
  assert.deepEqual(errors,[]);console.log('PASS Home upload/record/optional location/send/retry/clip retention');
}finally{await browser.close();server.closeAllConnections();await new Promise(r=>server.close(r))}
