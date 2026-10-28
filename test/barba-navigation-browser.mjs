import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {resolve,extname} from 'node:path';
import {pathToFileURL} from 'node:url';
import {shouldShell,shellResponse} from '../lib/app-shell.mjs';
const root=resolve(import.meta.dirname,'..'),boots={},requests=[];let delay=0,offline=false;
function legacy(ns){return `<!doctype html><html data-gate="0"><head><meta name="viewport" content="width=device-width,initial-scale=1"><script src="/app-navigation-bridge.js?v=2"></script><script src="/nav.js?v=2"></script><script src="/call-shell.js?v=1"></script></head><body style="background:#f5f2ed;color:#111;font:22px system-ui"><main style="height:2000px"><h1>${ns}</h1><input id="draft"><a id="garage" href="/garage">Garage</a><a id="chat" href="/chat">AI</a><a id="home" href="/">Home</a><button id="program" onclick="location.href='/news'">News</button></main><script>window.boot=crypto.randomUUID();Nav.route({path:'detail',open(){document.body.dataset.detail='1';Nav.push({slug:'detail',close(){delete document.body.dataset.detail}})}});Nav.route({path:'review',parent:'detail',open(){document.body.dataset.review='1';Nav.push({slug:'review',close(){delete document.body.dataset.review}})}});Nav.start({base:location.pathname});window.startCall=()=>CendonCallShell.started({expand(){window.expanded=true}});window.endCall=()=>CendonCallShell.ended();</script></body></html>`;}
const server=createServer(async(req,res)=>{try{
 const url=new URL(req.url,'http://'+req.headers.host);requests.push({path:url.pathname,dest:req.headers['sec-fetch-dest']});
 if(offline&&req.headers['sec-fetch-dest']!=='iframe'&&['/profile','/news'].includes(url.pathname)){res.writeHead(503);res.end('offline');return;}
 const request=new Request(url,{headers:req.headers});if(shouldShell(request)){const r=shellResponse(request);res.writeHead(r.status,Object.fromEntries(r.headers));res.end(await r.text());return;}
 if(extname(url.pathname)==='.js'||extname(url.pathname)==='.css'){const f=resolve(root,'.'+url.pathname);if(!f.startsWith(root))throw Error('path');res.setHeader('Content-Type',extname(f)==='.js'?'text/javascript':'text/css');res.end(await readFile(f));return;}
 const ns=url.pathname.split('/')[1]||'home';boots[ns]=(boots[ns]||0)+1;if(ns==='garage'&&delay)await new Promise(r=>setTimeout(r,delay));res.setHeader('Content-Type','text/html');res.end(legacy(ns));
 }catch(e){res.writeHead(404);res.end();}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const {chromium}=await import(pathToFileURL('C:/Users/Porsche/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs'));
const browser=await chromium.launch({headless:true,channel:'chrome'}),page=await browser.newPage({viewport:{width:393,height:852},serviceWorkers:'block'}),errors=[];
page.on('pageerror',e=>errors.push(e.message));
const base='http://127.0.0.1:'+server.address().port;
const view=n=>page.frames().find(f=>f!==page.mainFrame()&&new URL(f.url()).pathname===(n==='home'?'/':'/'+n));
const current=n=>page.waitForFunction(n=>CendonApp?.current().namespace===n&&document.querySelector('iframe.is-active')?.dataset.cendonView===n,n);
async function navigate(path,n){await page.evaluate(p=>CendonApp.go(p),path);await current(n);await page.waitForFunction(()=>!barba.transitions.isRunning);}
try{
 await page.addInitScript(()=>{localStorage.setItem('cendon_signed','1');localStorage.setItem('spire___owner','fixture');});
 await page.goto(base+'/');await page.waitForFunction(()=>window.barba?.version==='2.10.3'&&window.CendonApp);await current('home');
 const home=view('home'),boot=await home.evaluate(()=>window.boot);await home.locator('#draft').fill('Do not lose this form');
 delay=850;await page.evaluate(()=>CendonApp.go('/garage'));await page.waitForTimeout(300);assert.equal(await page.locator('iframe.is-active').getAttribute('data-cendon-view'),'home','previous screen stays visible while new data gates settle');
 await current('garage');await page.waitForFunction(()=>!barba.transitions.isRunning);const garage=view('garage'),garageBoot=await garage.evaluate(()=>window.boot);await garage.locator('#draft').fill('garage draft');
 await navigate('/','home');assert.equal(await home.evaluate(()=>window.boot),boot);assert.equal(await home.locator('#draft').inputValue(),'Do not lose this form');
 const start=Date.now();await navigate('/garage','garage');const retainedMs=Date.now()-start;assert.ok(retainedMs<500,'retained tab should not wait for another document load');assert.equal(await garage.evaluate(()=>window.boot),garageBoot);
 await page.goBack();await current('home');await page.goForward();await current('garage');
 await garage.evaluate(()=>Nav.go('/garage/detail'));await page.waitForURL(base+'/garage/detail');assert.equal(await garage.locator('body').getAttribute('data-detail'),'1');
 await page.goBack();await page.waitForURL(base+'/garage');await page.waitForFunction(()=>!barba.transitions.isRunning);assert.equal(await garage.locator('body').getAttribute('data-detail'),null);
 await page.goForward();await page.waitForURL(base+'/garage/detail');await page.waitForFunction(()=>!barba.transitions.isRunning);assert.equal(await garage.locator('body').getAttribute('data-detail'),'1');
 await navigate('/','home');await navigate('/garage','garage');assert.equal(await garage.locator('body').getAttribute('data-detail'),null,'returning to a base tab must not traverse another tab history');
 await garage.locator('#program').click();await current('news');await page.waitForFunction(()=>!barba.transitions.isRunning);
 await navigate('/garage/detail/review','garage');assert.equal(await garage.locator('body').getAttribute('data-review'),'1');await garage.evaluate(()=>Nav.home());await current('news');await page.waitForFunction(()=>!barba.transitions.isRunning);assert.equal(new URL(page.url()).pathname,'/news','closing a deep-link panel chain consumes only its actual host entries');
 await navigate('/chat','chat');const chat=view('chat');await chat.evaluate(()=>{startCall();window.callIdentity={id:crypto.randomUUID()};});const callId=await chat.evaluate(()=>callIdentity.id);
 await navigate('/','home');assert.equal(await page.evaluate(()=>CendonCallShell.active()),true);assert.equal(await chat.evaluate(()=>callIdentity.id),callId);assert.equal(await chat.evaluate(()=>document.hidden),false);assert.equal(await page.locator('#appCall').isVisible(),true);
 await page.locator('#appCall').click();await current('chat');await page.waitForFunction(()=>!barba.transitions.isRunning);await chat.evaluate(()=>endCall());
 // A failed Barba request must not unload the current page or discard a draft.
 await page.evaluate(()=>barba.cache.delete(location.origin+'/profile'));offline=true;await page.evaluate(()=>CendonApp.go('/profile'));await page.waitForSelector('#appNotice:not([hidden])');assert.equal(await page.locator('iframe.is-active').getAttribute('data-cendon-view'),'chat');offline=false;
 await page.locator('#appRetry').click();await current('profile');await page.waitForFunction(()=>!barba.transitions.isRunning);
 await page.evaluate(()=>{CendonApp.go('/garage');CendonApp.go('/news');CendonApp.go('/chat');});await current('chat');await page.waitForFunction(()=>!barba.transitions.isRunning);assert.equal(new URL(page.url()).pathname,'/chat');
 assert.equal(boots.home,1);assert.equal(boots.garage,1);assert.equal(boots.chat,1);assert.equal(requests.filter(r=>r.dest==='document').length,1,'one outer document across all tabs and history');assert.deepEqual(errors,[]);
 // Sign-out must discard every retained user view, not leave an old account in
 // a hidden frame. Trigger a real same-origin storage event from a child view.
 await view('chat').evaluate(()=>localStorage.removeItem('cendon_signed'));await page.waitForURL(base+'/login');assert.equal(await page.locator('iframe[data-cendon-view]').count(),0);
 console.log(JSON.stringify({pass:true,barba:'2.10.3',retainedMs,documentLoads:1,fixtures:'drafts, history, slow view, programmatic links, call identity, offline retry, rapid taps'}));
}catch(e){console.error(JSON.stringify({errors,boots,requests,state:await page.evaluate(()=>({url:location.href,view:window.CendonApp?.current(),running:window.barba?.transitions.isRunning,notice:document.getElementById('appNotice')?.hidden,frames:[...document.querySelectorAll('iframe')].map(f=>({src:f.src,cls:f.className,bridge:!!f.contentWindow.CendonView,rs:f.contentDocument?.readyState}))}))}));throw e;}finally{await browser.close();server.closeAllConnections();await new Promise(r=>server.close(r));}
