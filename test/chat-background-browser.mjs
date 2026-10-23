/* Real Chrome, synthetic local backend only. No paid inference or real notifications. */
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
const root=resolve(import.meta.dirname,'..'),html=await readFile(resolve(root,'chat.html'),'utf8');
function section(a,b){const i=html.indexOf(a),j=html.indexOf(b,i);assert.ok(i>=0&&j>i);return html.slice(i,j)}
const helpers=section('function currentSessionId(){','function loadSession(){'),stream=section('async function streamJobAnswer(contents,opts){','async function streamAnswer(contents,opts){');
const bootstrap=`window.BACKEND_URL=location.origin;window.spireAuth={currentUser:{uid:sessionStorage.getItem('uid')||'one',getIdToken:async()=> 'fixture-'+spireAuth.currentUser.uid}};window.auth=spireAuth;window.lang='en';
localStorage.setItem('spire___owner',spireAuth.currentUser.uid);window.CendonScope={mine:uid=>uid===spireAuth.currentUser?.uid&&localStorage.getItem('spire___owner')===uid};
window.CendonBell={add(e){const k='notices-'+spireAuth.currentUser.uid,a=JSON.parse(localStorage.getItem(k)||'[]');if(!a.some(x=>x.id===e.id)){a.push(e);localStorage.setItem(k,JSON.stringify(a))}}};`;
const app=`<!doctype html><meta charset="utf-8"><a href="/garage">Garage</a><div id="messages"></div><script>${bootstrap}</script><script src="/chat-jobs.js"></script><script src="/feature-ai.js"></script><script>
const TT=(th,en)=>en,LS={get(k,d){try{return JSON.parse(localStorage.getItem('spire_'+k))??d}catch{return d}},set(k,v){localStorage.setItem('spire_'+k,JSON.stringify(v))}};
const useFb=true,aiUser=async()=>auth.currentUser,sysPrompt=()=>'',selCar=()=>({id:'car-one',make:'Honda',model:'Civic'}),sessKey=()=> 'sess_car-one',curKey=()=> 'cursess_car-one';
const noTools=x=>x,parseAsk=x=>({text:x}),updateSend=()=>{},renderChips=()=>{},dropTyping=()=>{};let messages=[],sending=false;
function renderMessages(){document.getElementById('messages').textContent=messages.map(m=>m.text||m.status||'Thinking').join('|')}
function saveSession(){let a=LS.get(sessKey(),[]),s=a.find(x=>x.id===currentSessionId());if(!s){s={id:currentSessionId(),msgs:[]};a.unshift(s)}s.msgs=structuredClone(messages);LS.set(sessKey(),a)}
${helpers}
${stream}
window.seed=()=>{const id='s1792720000000';LS.set(curKey(),id);messages=[{role:'user',text:'Private original question'}];LS.set(sessKey(),[{id,msgs:structuredClone(messages)}]);renderMessages()};
window.start=async(feature=false)=>{streamJobAnswer([{role:'user',parts:[{text:'Private original question'}]}],feature?{feature:{tool:'quote',attachments:[{mime:'image/jpeg',b64:'aGVsbG8='}],context:{car:selCar()},question:'Private quote'}}:{}).catch(e=>{window.failure=e.message});await Promise.resolve();return messages.at(-1).jobId};
window.other=()=>{saveSession();LS.set(curKey(),'s1792720000001');messages=[{role:'user',text:'Different conversation'}];saveSession();renderMessages()};
messages=LS.get(sessKey(),[]).find(s=>s.id===currentSessionId())?.msgs||[];renderMessages();resumeChatJobs();
</script>`;
const away=`<!doctype html><meta charset="utf-8"><h1>Garage</h1><script>${bootstrap}</script><script src="/chat-jobs.js"></script>`;
let offline=false,delayRead=false;const rows=new Map(),errors=[],requests=[];
const server=createServer(async(req,res)=>{try{const u=new URL(req.url,'http://test');res.setHeader('Cache-Control','no-store');
  if(u.pathname==='/chat'||u.pathname==='/garage'){res.setHeader('Content-Type','text/html; charset=utf-8');res.end(u.pathname==='/chat'?app:away);return}
  if(u.pathname.startsWith('/api/ai/jobs')){
    const uid=(req.headers.authorization||'').replace('Bearer fixture-',''),id=u.pathname.split('/')[4];let data;
    if(req.method==='POST'&&!id){let raw='';for await(const c of req)raw+=c;const b=JSON.parse(raw);requests.push(b);
      let r=rows.get(b.jobId);if(!r){r={id:b.jobId,sessionId:b.sessionId,carId:b.carId,uid,status:'queued',createdAt:Date.now(),expiresAt:Date.now()+86400000};rows.set(r.id,r);setTimeout(()=>{if(r.status==='cancelled')return;r.status='complete';r.text=b.kind==='feature'?'Private quote analysis completed':'Private completed answer';r.updatedAt=Date.now()},800)}data={job:r};
    }else if(req.method==='POST'&&u.pathname.endsWith('/cancel')){const r=rows.get(id);if(r?.uid===uid)r.status='cancelled';data={job:r}}
    else{if(offline){res.writeHead(503);res.end('{}');return}if(delayRead)await new Promise(r=>setTimeout(r,350));const r=rows.get(id);data=id?(r?.uid===uid?{job:r}:{error:'not found'}):{jobs:[...rows.values()].filter(x=>x.uid===uid)}}
    res.setHeader('Content-Type','application/json');res.end(JSON.stringify(data));return;
  }
  if(!['/chat-jobs.js','/feature-ai.js'].includes(u.pathname)){res.writeHead(404);res.end();return}
  res.setHeader('Content-Type','text/javascript');res.end(await readFile(resolve(root,u.pathname.slice(1))));
}catch(e){errors.push(e.message);res.writeHead(500);res.end('{}')}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+server.address().port;
const {chromium}=await import(pathToFileURL('C:/Users/Porsche/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs'));
const browser=await chromium.launch({headless:true,channel:'chrome'}),context=await browser.newContext();let page=await context.newPage();const watch=p=>p.on('pageerror',e=>errors.push(e.message));watch(page);
const accepted=async id=>{for(let n=0;n<100&&!rows.has(id);n++)await new Promise(r=>setTimeout(r,20));assert.ok(rows.has(id))};
try{
  await page.goto(base+'/chat');const payload=await page.evaluate(async()=>{CendonFeatureAI.register({context:()=>({car:selCar()}),media:async()=>[]});return CendonFeatureAI.payload({key:'quote',context:{car:selCar()},question:'Review',attachments:[{mime:'image/jpeg',b64:'aGVsbG8='}]})});assert.equal(payload.tool,'quote');assert.equal(payload.attachments[0].b64,'aGVsbG8=');
  await page.goto(base+'/chat');await page.evaluate(()=>seed());const first=await page.evaluate(()=>start());await accepted(first);
  await page.goto(base+'/garage');await page.waitForFunction(()=>JSON.parse(localStorage.getItem('notices-one')||'[]').length===1);
  assert.equal(rows.get(first).status,'complete');assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('spire_ai_results')).jobs[0].text),'Private completed answer','result collected before returning to Chat');
  assert.ok(!await page.evaluate(()=>localStorage.getItem('notices-one').includes('Private')),'no question or reply on lock screen');
  await page.evaluate(async()=>{await CendonChatJobs.resume();await CendonChatJobs.resume()});assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('notices-one')).length),1);
  await page.goto(base+'/chat');await page.waitForFunction(()=>document.getElementById('messages').textContent.includes('Private completed answer'));
  assert.equal(await page.evaluate(()=>messages.filter(m=>m.role==='ai').length),1);
  await page.evaluate(()=>seed());const second=await page.evaluate(()=>start(true));await accepted(second);assert.equal(requests.at(-1).feature.tool,'quote');assert.equal(requests.at(-1).feature.attachments[0].b64,'aGVsbG8=');
  await page.close();await new Promise(r=>setTimeout(r,1100));assert.equal(rows.get(second).status,'complete','server completed with zero tabs');
  page=await context.newPage();watch(page);await page.goto(base+'/garage');await page.waitForFunction(()=>JSON.parse(localStorage.getItem('notices-one')||'[]').length===2);
  offline=true;await page.goto(base+'/chat');await page.waitForFunction(()=>document.getElementById('messages').textContent.includes('Private quote analysis completed'));offline=false;
  assert.equal(await page.evaluate(()=>messages.filter(m=>m.jobId&&m.featureTool==='quote').length),1,'feature job restored offline from completed inbox');
  await page.evaluate(()=>seed());const third=await page.evaluate(()=>start());await accepted(third);await page.evaluate(()=>other());await page.waitForTimeout(1300);await page.evaluate(()=>CendonChatJobs.resume());
  assert.equal(await page.locator('#messages').innerText(),'Different conversation');assert.equal(await page.evaluate(()=>LS.get(sessKey(),[]).find(s=>s.id==='s1792720000000').msgs.at(-1).text),'Private completed answer');
  await page.evaluate(()=>seed());const fourth=await page.evaluate(()=>start());await accepted(fourth);await page.evaluate(async id=>{messages.at(-1).cancelledLocally=true;messages.at(-1).streaming=false;saveSession();await CendonChatJobs.cancel(id)},fourth);
  await page.goto(base+'/garage');await page.waitForTimeout(1000);assert.equal(rows.get(fourth).status,'cancelled');
  delayRead=true;await page.evaluate(()=>{CendonChatJobs.resume();spireAuth.currentUser={uid:'two',getIdToken:async()=> 'fixture-two'};sessionStorage.setItem('uid','two');localStorage.setItem('spire___owner','two')});await page.waitForTimeout(500);delayRead=false;
  assert.equal(await page.evaluate(()=>localStorage.getItem('notices-two')),null,'stale reply cannot notify a different account');
  await page.evaluate(()=>CendonChatJobs.resume());assert.equal(await page.evaluate(()=>localStorage.getItem('notices-two')),null);
  assert.deepEqual(errors,[]);console.log('PASS: away-page delivery + private deduplicated notice + original conversation + zero tabs + feature media queue + offline restoration + explicit cancellation + account-change isolation (8 scenarios)');
}finally{await browser.close();server.closeAllConnections();await new Promise(r=>server.close(r))}
