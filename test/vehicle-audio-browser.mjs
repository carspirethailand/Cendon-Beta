/* Isolated browser regression: synthetic account/car/provider and fake browser microphone only.
   This checks transport/selection/lifecycle, NOT real automotive diagnostic accuracy. */
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile,mkdir} from 'node:fs/promises';
import {resolve,join,extname} from 'node:path';
import {pathToFileURL} from 'node:url';
const root=resolve(import.meta.dirname,'..');
const source=await readFile(join(root,'chat.html'),'utf8'),ledger=source.match(/<script id="ledgerjs">([\s\S]*?)<\/script>/)[1];
const {chromium}=await import(pathToFileURL('C:/Users/Porsche/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs'));
const requests=[];
const fixture=kind=>`<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/fonts/kanit.css"><link rel="stylesheet" href="/call-ui.css"><link rel="stylesheet" href="/feature-ai.css"><link rel="stylesheet" href="/vehicle-audio.css"><style>html{--c-ink:#282521;--ink:#282521;--card:#fff;--c-compose:#fff;--c-line:#d7d2ca}body{margin:0;padding:16px;box-sizing:border-box;font-family:Kanit,system-ui,sans-serif;background:#f8f5ef;color:#282521}*{box-sizing:border-box}.hearth{background:#12100e}button{min-height:44px}.va-pick{max-width:640px;margin:16px auto}.ct-choose>p{max-width:640px;margin:16px auto}.ct-choose>#ctStartEar{display:block;margin:auto}#composer{max-width:700px;margin:auto}.fa-toolbar{display:block}#v-quote{max-width:700px;margin:auto}.lg-card{padding:16px;border:1px solid #ccc;border-radius:12px;margin:12px 0}.lg-takes{display:flex;flex-wrap:wrap}.lg-acts{display:flex;flex-wrap:wrap;gap:8px}</style><script>
window.lang='th';window.BACKEND_URL=location.origin;window.calls=[];window.carValue={id:'fixture-car',name:'Toyota Fortuner',year:2013,engine:'3.0L D-4D',fuel:'diesel'};window.selCar=()=>carValue;window.garage=()=>carValue?[carValue]:[];window.spireAuth={currentUser:{uid:'synthetic-owner',getIdToken:async()=> 'synthetic-token'}};window.spireHasFeature=()=>true;window.switchView=()=>{};window.CendonValetCore={curCar:()=>carValue,cars:()=>garage(),carLabel:()=>carValue.name};
</script><script src="/vehicle-audio.js"></script></head><body data-phase="thread">${kind==='live'?`<button id="openAudio">Open engine tool</button><section id="callUI" class="hearth show"><header class="hh-top"></header></section><script src="/call-tools.js"></script><script>
window.voice={callActive:true,callSession:1,playSrcs:[],flushPlayback(){},callWS:{readyState:1,send:v=>calls.push(JSON.parse(v))},b64FromBytes(bytes){let s='';for(let i=0;i<bytes.length;i++)s+=String.fromCharCode(bytes[i]);return btoa(s)},startMicStream:async()=>{}};window.tools=CallTools.create({voice,language:'th',backendUrl:location.origin,getCar:()=>carValue,getUser:()=>spireAuth.currentUser});document.getElementById('openAudio').onclick=()=>{voice.callCtx=new AudioContext();voice.callCtx.resume();window.pending=tools.listen()};
</script>`:`<main class="main"><section id="v-thread"></section></main><div id="composer"><textarea id="inp"></textarea></div><script src="/feature-ai.js"></script><script>${ledger}</script>`}</body></html>`;
const server=createServer(async(req,res)=>{
  try{const u=new URL(req.url,'http://localhost');
    if(u.pathname==='/fixture'){res.setHeader('Content-Type','text/html; charset=utf-8');res.end(fixture(u.searchParams.get('kind')));return;}
    if(u.pathname==='/api/features/analyze'){
      const chunks=[];for await(const b of req)chunks.push(b);const body=JSON.parse(Buffer.concat(chunks));requests.push(body);
      const identity={source:body.context.audioVehicle.source,vehicle:body.context.audioVehicle.vehicle,label:'Synthetic confirmed vehicle',identifiedFromAudio:false};
      res.setHeader('Content-Type','application/json');res.end(JSON.stringify({source:'ai',text:'Synthetic transport result',data:{audioVersion:2,identity,quality:'good',hear:'Synthetic sound observation, not a real diagnosis',normal:'Unconfirmed',causes:[],urgency:'unassessed',next:['Synthetic next question'],speak:'Synthetic result'}}));return;
    }
    const file=resolve(root,u.pathname.slice(1));if(!file.startsWith(root+ '/')&&!file.startsWith(root+'\\')){res.writeHead(403);res.end();return;}
    res.setHeader('Content-Type',({'.js':'text/javascript','.css':'text/css','.woff2':'font/woff2'})[extname(file)]||'application/octet-stream');res.end(await readFile(file));
  }catch{res.writeHead(404);res.end();}
}).listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));
let browser;const checks=[];
try{
  browser=await chromium.launch({channel:'msedge',headless:true,args:['--use-fake-device-for-media-stream','--use-fake-ui-for-media-stream']});
  const context=await browser.newContext({permissions:['microphone'],serviceWorkers:'block'}),origin='http://127.0.0.1:'+server.address().port;
  await context.route('**/*',route=>new URL(route.request().url()).origin===origin?route.continue():route.abort());
  await mkdir(join(root,'.qa'),{recursive:true});
  for(const width of [1280,390,320]){
    const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));await page.setViewportSize({width,height:844});await page.goto(origin+'/fixture');
    await page.evaluate(()=>CendonFeatureAI.select('listen'));await page.locator('#lgVehicleScope').waitFor();
    assert.equal(await page.locator('#lgVehicleScope').inputValue(),'');
    await page.locator('#lgVehicleScope').selectOption('other_confirmed');await page.locator('#lgVehicle_make').fill('Honda');await page.locator('#lgVehicle_model').fill('HR-V');
    const job=await page.evaluate(()=>CendonFeatureAI.prepare([{mime:'audio/wav',b64:'UklGRg=='}],'Synthetic question'));
    assert.equal(job.context.car.model,'HR-V');assert.equal(job.context.car.year,undefined);assert.equal(await page.evaluate(()=>carValue.name),'Toyota Fortuner');
    await page.screenshot({path:join(root,'.qa','audio-chat-'+width+'.png'),fullPage:true});
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);assert.deepEqual(errors,[]);checks.push({width,otherCarWithoutGarageWrite:true,overflow:false});await page.close();
  }
  const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));await page.setViewportSize({width:390,height:844});await page.goto(origin+'/fixture?kind=live');
  await page.evaluate(()=>document.getElementById('openAudio').click());await page.locator('#ctVehicleScope').waitFor();assert.equal(requests.length,0);
  await page.locator('#ctStartEar').click();assert.match(await page.locator('#ctChooseError').textContent(),/เลือกรถ/);assert.equal(requests.length,0);
  await page.locator('#ctVehicleScope').selectOption('garage_confirmed');await page.screenshot({path:join(root,'.qa','audio-call-confirm.png'),fullPage:true});
  await page.locator('#ctStartEar').click();await page.locator('#ctOut').waitFor({state:'visible',timeout:30000});
  assert.equal(requests.length,1);assert.equal(requests[0].tool,'ear');assert.equal(requests[0].context.audioVehicle.vehicle.engine,'3.0L D-4D');assert.equal(requests[0].context.audioVehicle.vehicle.year,'2013');assert.ok(requests[0].attachments[0].b64.length>10000);assert.equal(Buffer.from(requests[0].attachments[0].b64,'base64').subarray(0,4).toString(),'RIFF');
  await page.screenshot({path:join(root,'.qa','audio-call-result.png'),fullPage:true});
  assert.deepEqual(errors,[]);assert.ok((await page.evaluate(()=>calls)).some(c=>c.clientContent));await page.evaluate(()=>{tools.dispose();voice.callActive=false;voice.callMicStream?.getTracks().forEach(t=>t.stop());voice.callCtx.close()});
  checks.push({liveVehicleConfirmation:true,rawWavFromFakeMic:true,spokenToolResult:true});
  console.log(JSON.stringify({checks,realAIInvocations:0,realDeviceRequests:0,realAccountWrites:0,syntheticProviderRequests:requests.length},null,2));
}finally{await browser?.close();server.close();}
