/* Real Chrome, real chat completion/direct-command handlers and Valet adapters.
   Synthetic accounts/results only. No model, LINE or production account writes. */
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile,mkdir} from 'node:fs/promises';
import {resolve,extname} from 'node:path';
import {pathToFileURL} from 'node:url';
const root=resolve(import.meta.dirname,'..'),chat=await readFile(resolve(root,'chat.html'),'utf8');
const section=(a,b)=>{const i=chat.indexOf(a),j=chat.indexOf(b,i);assert.ok(i>=0&&j>i,a);return chat.slice(i,j)};
const jobCode=section('function currentSessionId(){','function loadSession(){');
const routeCode=section('  if(!featureJob&&!atts.length&&window.CendonValet&&!CendonValet.on()&&CendonValet.wantsAct(text))','  messages.push({role:"ai",typing:true});');
const html=`<!doctype html><html data-theme="light" data-ctheme="light"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/valet.css"><style>
  :root{--text:#222;--muted:#666;--line:#bbb;--surface:#fff;--accent:#ee8c40}body{margin:20px;background:#f6f4f0;color:var(--text);font:16px system-ui}html[data-theme=dark] body{background:#101114;color:#eee;--surface:#1c1e22;--line:#555;--text:#eee;--muted:#aaa}#thread{max-width:720px;margin:auto}article{margin:16px 0}.vl{margin:12px 0}button,input{font:inherit}#inp{padding:12px}
  </style></head><body><div id="thread"></div><input id="inp"><script>
  window.BACKEND_URL=location.origin;window.spireAuth={currentUser:{uid:'fixture-owner',getIdToken:async()=> 'fixture-token'}};window.auth=spireAuth;window.lang='th';
  const read=k=>JSON.parse(localStorage.getItem('spire_'+k)),put=(k,v)=>localStorage.setItem('spire_'+k,JSON.stringify(v));
  if(!read('theme')){put('theme','light');put('chatTheme','light');put('valet',{on:true,uid:'fixture-owner'});put('setup',{uid:'fixture-owner',lang:'th',distance:'km',currency:'THB'})}
  window.CendonScope={mine:uid=>uid===auth.currentUser?.uid};window.spireSetupRead=()=>read('setup');window.spireLang=()=>read('lang')||'th';window.spireSetLang=v=>{put('lang',v);window.lang=v};
  window.spirePrimary=()=>read('primary');window.spireSetPrimary=v=>{put('primary',v);document.documentElement.style.setProperty('--accent',v)};
  window.CendonDepth={get:()=>read('depth')??1,set:v=>put('depth',v)};window.cloudMark=()=>{};
  window.spireSavePrefs=async patch=>{const uid=auth.currentUser.uid,r=await fetch('/fixture/preferences',{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify(patch)});if(!r.ok)throw Error('fixture offline');const p=await r.json();if(auth.currentUser.uid!==uid)throw Error('account changed');put('setup',p);if(p.lang)put('lang',p.lang);return p};
  window.garage=()=>[{id:'car-one',name:'Synthetic car',year:2023,mileage:'10000'}];window.selCar=()=>garage()[0];
  const TT=(th,en)=>lang==='en'?en:th;window.messages=[];let sending=false;
  const LS={get:(k,f)=>read(k)??f,set:put},sessKey=()=> 'sess_car-one',curKey=()=> 'cursess_car-one',noTools=x=>x;
  const parseAsk=text=>CendonValet.cut(text),updateSend=()=>{},renderChips=()=>{},bellAi=()=>{},toast=()=>{};
  function renderMessages(){document.getElementById('thread').innerHTML=messages.map(m=>'<article><p>'+String(m.text||'').replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]))+'</p>'+CendonValet.html(m)+'</article>').join('')}
  function saveSession(){const list=LS.get(sessKey(),[]),s=list.find(s=>s.id===currentSessionId());if(s){s.msgs=structuredClone(messages);LS.set(sessKey(),list)}}
  ${jobCode}
  window.seed=()=>{const id='s1792800000000';messages=[];LS.set(sessKey(),[{id,msgs:[]}]);LS.set(curKey(),id);renderMessages()};
  window.command=async text=>{const featureJob=null,atts=[];messages.push({role:'user',text});${routeCode}};
  window.sendMsg=()=>{const el=document.getElementById('inp'),text=el.value;el.value='';return command(text)};
  window.startJob=async(request,text)=>{messages.push({role:'user',text:request});const id=crypto.randomUUID(),sessionId=currentSessionId();messages.push({role:'ai',text:'',streaming:true,jobId:id});saveSession();renderMessages();return CendonChatJobs.run({jobId:id,sessionId,carId:'car-one',fixtureText:text},auth.currentUser.uid,applyChatJob)};
  window.other=()=>{saveSession();const id='s1792800000001',list=LS.get(sessKey(),[]);list.push({id,msgs:[]});LS.set(sessKey(),list);LS.set(curKey(),id);messages=[];renderMessages()};
  window.original=()=>{LS.set(curKey(),'s1792800000000');messages=LS.get(sessKey(),[])[0].msgs;renderMessages()};
  </script><script src="/valet-core.js"></script><script src="/valet.js"></script><script src="/call-agent.js"></script><script src="/chat-jobs.js"></script><script>seed();resumeChatJobs()</script></body></html>`;
let failed=false,delay=0,jobDelay=0;const prefWrites=[],jobs=new Map(),errors=[];
const server=createServer(async(req,res)=>{try{const path=new URL(req.url,'http://fixture.test').pathname;res.setHeader('Cache-Control','no-store');
  if(path==='/'){res.setHeader('Content-Type','text/html; charset=utf-8');res.end(html);return}
  if(path==='/fixture/preferences'){
    let raw='';for await(const b of req)raw+=b;const patch=JSON.parse(raw);prefWrites.push(patch);if(delay)await new Promise(r=>setTimeout(r,delay));
    res.setHeader('Content-Type','application/json');if(failed)res.statusCode=503;res.end(JSON.stringify({uid:'fixture-owner',lang:'th',distance:'km',currency:'THB',...patch}));return;
  }
  if(path.startsWith('/api/ai/jobs')){
    res.setHeader('Content-Type','application/json');let output;
    if(req.method==='POST'){let raw='';for await(const b of req)raw+=b;const body=JSON.parse(raw),row={id:body.jobId,sessionId:body.sessionId,carId:body.carId,status:'complete',text:body.fixtureText};jobs.set(row.id,row);output={job:row}}
    else if(path==='/api/ai/jobs')output={jobs:[]};
    else {if(jobDelay)await new Promise(r=>setTimeout(r,jobDelay));output={job:jobs.get(path.split('/')[4])}}
    res.end(JSON.stringify(output));return;
  }
  if(!/^\/[\w.-]+$/.test(path)||path.includes('..'))throw Error('path');
  res.setHeader('Content-Type',extname(path)==='.js'?'text/javascript':'text/css');res.end(await readFile(resolve(root,path.slice(1))));
}catch{res.writeHead(404);res.end()}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+server.address().port;
const {chromium}=await import(pathToFileURL('C:/Users/Porsche/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs'));
const browser=await chromium.launch({headless:true,channel:'chrome'}),page=await browser.newPage({viewport:{width:390,height:844}});page.on('pageerror',e=>errors.push(e.message));
try{
  await page.goto(base);await page.evaluate(()=>command('ช่วยเปลี่ยนตีมเป็นสีมืดหน่อยครับ'));
  await page.waitForFunction(()=>document.documentElement.dataset.theme==='dark');assert.equal(await page.locator('body').evaluate(el=>getComputedStyle(el).backgroundColor),'rgb(16, 17, 20)');assert.equal(await page.locator('.vl-st.done').count(),1);
  await page.locator('[data-va="undo"]').click();await page.waitForFunction(()=>document.documentElement.dataset.theme==='light');
  await page.evaluate(()=>command('ช่วยเปลี่ยนตีมหน่อย'));assert.equal(await page.locator('[data-va="theme-choice"]').count(),2);assert.equal(await page.evaluate(()=>document.documentElement.dataset.theme),'light');
  await page.locator('[data-va="theme-choice"][data-value="dark"]').click();await page.waitForFunction(()=>document.documentElement.dataset.theme==='dark');
  await page.locator('[data-va="undo"]').last().click();await page.waitForFunction(()=>document.documentElement.dataset.theme==='light');
  await page.evaluate(()=>startJob('ช่วยปรับธีมให้สบายตาหน่อย','เปลี่ยนให้แล้วครับ [[ACT]]{"do":"setting","key":"theme","value":"dark"}[[/ACT]]'));
  await page.waitForFunction(()=>document.documentElement.dataset.theme==='dark');assert.ok(!(await page.locator('#thread').innerText()).includes('เปลี่ยนให้แล้วครับ'),'model completion claim replaced by actual action status');
  await page.evaluate(()=>startJob('รถสตาร์ตไม่ติดเกิดจากอะไร','ตรวจแบตเตอรี่ก่อนครับ [[ACT]]{"do":"setting","key":"theme","value":"light"}[[/ACT]]'));
  assert.equal(await page.evaluate(()=>document.documentElement.dataset.theme),'dark','unsolicited model blocks cannot auto-change a setting');
  delay=250;const n=prefWrites.length;await page.evaluate(()=>{window.work=command('เปลี่ยนสกุลเงินเป็น USD')});await page.waitForFunction(()=>messages.at(-1)?.acts?.[0]?.s==='working');
  await page.evaluate(()=>CendonValet.run(messages.at(-1)));await page.evaluate(()=>window.work);assert.equal(prefWrites.length,n+1,'one mutation even after rerender');assert.equal(prefWrites.at(-1).currency,'USD');delay=0;
  failed=true;await page.evaluate(()=>command('เปลี่ยนสกุลเงินเป็น EUR'));assert.equal(await page.evaluate(()=>messages.at(-1).acts[0].s),'err');assert.equal(await page.evaluate(()=>CendonValetCore.getSetting('currency')),'USD');failed=false;
  await page.locator('[data-va="apply"]').last().click();await page.waitForFunction(()=>CendonValetCore.getSetting('currency')==='EUR');
  await page.evaluate(()=>{put('valet',{on:false,uid:'fixture-owner'})});await page.evaluate(()=>command('เปลี่ยนตีมเป็นสีสว่าง'));assert.equal(await page.locator('[data-va="enable"]').count(),1);assert.equal(await page.evaluate(()=>document.documentElement.dataset.theme),'dark');
  await page.locator('[data-va="enable"]').click();await page.waitForFunction(()=>document.documentElement.dataset.theme==='light');
  jobDelay=250;await page.evaluate(()=>{window.background=startJob('เปลี่ยนธีมเป็นมืด','[[ACT]]{"do":"setting","key":"theme","value":"dark"}[[/ACT]]');other()});await page.evaluate(()=>window.background);
  assert.equal(await page.evaluate(()=>document.documentElement.dataset.theme),'light','background conversation must not change current preferences');await page.evaluate(()=>original());
  await page.locator('[data-va="apply"]').last().click();await page.waitForFunction(()=>document.documentElement.dataset.theme==='dark');jobDelay=0;
  const voice=await page.evaluate(async()=>{const a=CendonCallAgent.create({showValet:v=>{window.voiceCard=v}}),ctx={signal:new AbortController().signal,isCurrent:()=>true};
    const result=await a.execute('valet',{do:'setting',key:'distance',value:'mi'},ctx);const denied=await a.execute('valet',{do:'setting',key:'role',value:'admin'},ctx);return {result,denied};});
  assert.equal(voice.result.done,true);assert.equal(voice.result.value,'mi');assert.equal(voice.denied.done,false);
  delay=250;const before=await page.evaluate(()=>document.documentElement.dataset.theme);await page.evaluate(()=>{window.pending=command('เปลี่ยนสกุลเงินเป็น USD')});
  await page.waitForFunction(()=>messages.at(-1).acts[0].s==='working');await page.evaluate(()=>{auth.currentUser={uid:'other',getIdToken:async()=> 'other-token'};put('valet',{on:true,uid:'other'})});await page.evaluate(()=>window.pending);
  assert.notEqual(await page.evaluate(()=>messages.at(-1).acts[0].s),'done');assert.equal(await page.evaluate(()=>document.documentElement.dataset.theme),before);
  assert.deepEqual(errors,[]);await mkdir(resolve(root,'.qa/valet'),{recursive:true});await page.screenshot({path:resolve(root,'.qa/valet/settings-mobile.png'),fullPage:true});
  console.log(JSON.stringify({ok:true,scenarios:['direct Thai theme and computed style','Undo','durable-job completion invokes Valet','verified async save once','offline failure and retry','permission allow and continue','background history manual apply','voice settings','admin key denied','account change in flight'],productionWrites:0,liveAiRequests:0,pageErrors:errors}));
}finally{await browser.close();server.closeAllConnections();await new Promise(r=>server.close(r))}
