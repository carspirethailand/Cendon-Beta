/* Real Chrome; only synthetic accounts and localhost endpoints. */
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
const {chromium}=await import(pathToFileURL('C:/Users/Porsche/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs'));
const script=await readFile(new URL('../media-store.js',import.meta.url),'utf8');
const page=`<!doctype html><meta charset="utf-8"><script>
const callbacks=[];window.BACKEND_URL=location.origin;
window.spireAuth={currentUser:{uid:'one',getIdToken:async()=> 'one'},onAuthStateChanged(fn){callbacks.push(fn);queueMicrotask(fn)}};
window.switchUser=uid=>{spireAuth.currentUser=uid?{uid,getIdToken:async()=>uid}:null;callbacks.forEach(fn=>fn())};
</script><body><div id="photos"></div><script src="/media-store.js"></script></body>`;
const requests=[],errors=[];
const server=createServer(async(req,res)=>{
  const url=new URL(req.url,'http://localhost');res.setHeader('Cache-Control','no-store');
  if(url.pathname==='/media-store.js'){res.setHeader('Content-Type','text/javascript');res.end(script);return}
  if(url.pathname.startsWith('/api/tech/media/')){
    requests.push({uid:req.headers.authorization,method:req.method,path:url.pathname});
    if(req.method!=='GET'){res.setHeader('Content-Type','application/json');res.end('{}');return}
    if(req.headers.authorization!=='Bearer one'){res.writeHead(404);res.end('{}');return}
    if(url.pathname.endsWith('slow_private'))await new Promise(r=>setTimeout(r,400));
    res.setHeader('Content-Type','audio/webm');res.end('owner-only bytes');return;
  }
  res.setHeader('Content-Type','text/html');res.end(page);
});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const browser=await chromium.launch({channel:'chrome',headless:true});
try{
  const tab=await browser.newPage();tab.on('pageerror',e=>errors.push(e.message));await tab.goto('http://127.0.0.1:'+server.address().port);
  const first=await tab.evaluate(async()=>{
    await CendonMedia.put(new Blob(['one local'],{type:'audio/webm'}),{id:'m_local_private',upload:false});
    const src=await CendonMedia.url('m_local_private');document.getElementById('photos').innerHTML='<audio data-mid="m_local_private" data-mok="1" src="'+src+'"></audio>';
    switchUser('two');return {cached:CendonMedia.cached('m_local_private'),src:document.querySelector('audio').getAttribute('src'),blob:await CendonMedia.get('m_local_private')};
  });assert.equal(first.cached,null);assert.equal(first.src,null);assert.equal(first.blob,null);
  const second=await tab.evaluate(async()=>{
    await CendonMedia.put(new Blob(['two local'],{type:'audio/webm'}),{id:'m_local_private',upload:false});
    const two=await (await CendonMedia.get('m_local_private')).text();switchUser('one');const one=await (await CendonMedia.get('m_local_private')).text();return {one,two};
  });assert.deepEqual(second,{one:'one local',two:'two local'});
  const slow=await tab.evaluate(async()=>{
    const pending=CendonMedia.get('m_slow_private');await new Promise(r=>setTimeout(r,100));switchUser('two');return {result:await pending,cached:CendonMedia.cached('m_slow_private')};
  });assert.equal(slow.result,null);assert.equal(slow.cached,null);
  const reload=await tab.reload().then(()=>tab.evaluate(async()=>{const one=await(await CendonMedia.get('m_local_private')).text();switchUser('two');return {one,two:await(await CendonMedia.get('m_local_private')).text()}}));
  assert.deepEqual(reload,{one:'one local',two:'two local'});
  await tab.evaluate(async()=>{switchUser('one');await CendonMedia.put(new Blob(['queued A'],{type:'audio/webm'}),{id:'m_queue_private',upload:false});CendonMedia.uploadSoon('m_queue_private');switchUser('two');await CendonMedia.drain()});
  await tab.waitForTimeout(800);assert.equal(requests.filter(x=>x.method==='PUT').length,0,'queued A media never uploads under B');
  const logout=await tab.evaluate(async()=>{window.currentUser={uid:'one'};switchUser(null);return CendonMedia.cached('m_local_private')});assert.equal(logout,null,'stale UI currentUser cannot override signed-out auth');
  assert.deepEqual(errors,[]);console.log(JSON.stringify({ok:true,checks:8,syntheticOnly:true,network:requests.length}));
}finally{await browser.close();await new Promise(r=>server.close(r))}
