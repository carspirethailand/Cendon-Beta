/* หน้าหลัก ↔ แชต ในโหมด Barba: แอปต้องไม่ค้างที่ "เห็นหน้าหลักแต่แถบล่างไฮไลต์แชต และกดหน้าหลักไม่ไปไหน"
   เอกสารจริงของแอป + Barba จริง · บัญชี/API จำลองทั้งหมด ไม่เขียนข้อมูลจริง
   รัน: CENDON_NODE_PACKAGES=<โฟลเดอร์ node_modules ที่มี playwright> node test/home-chat-barba-browser.mjs */
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {resolve,extname,join} from 'node:path';
import {gzipSync} from 'node:zlib';
import {pathToFileURL} from 'node:url';
import {shouldShell,shellResponse} from '../lib/app-shell.mjs';
import {namespace} from '../app-routes.js';
const root=resolve(import.meta.dirname,'..');
const firebase=`window.firebase=window.firebase||(()=>{const u={uid:'nav-fixture',displayName:'Nav fixture',getIdToken:async()=> 'synthetic',getIdTokenResult:async()=>({claims:{}})};const a={currentUser:u,onAuthStateChanged(f){setTimeout(()=>f(u),100);return()=>{}},onIdTokenChanged(f){setTimeout(()=>f(u),100);return()=>{}},setPersistence:async()=>{},getRedirectResult:async()=>({user:null})};function auth(){return a}auth.Auth={Persistence:{LOCAL:'local'}};auth.GoogleAuthProvider=function(){};auth.OAuthProvider=function(){};return {apps:[],initializeApp(){this.apps.push({})},auth}})();`;
const server=createServer(async(req,res)=>{try{
  const url=new URL(req.url,'http://'+req.headers.host),request=new Request(url,{headers:req.headers});
  if(shouldShell(request)){const r=shellResponse(request);res.writeHead(r.status,Object.fromEntries(r.headers));res.end(await r.text());return;}
  let name=url.pathname==='/'?'index.html':url.pathname.slice(1);if(!extname(name)){const ns=namespace(url.href,url.origin);name=(ns==='home'?'index':ns||name)+'.html';}
  if(!/^[\w./-]+$/.test(name)||name.includes('..'))throw Error('path');const data=await readFile(resolve(root,name));
  res.setHeader('Content-Type',({'.js':'text/javascript','.css':'text/css','.html':'text/html; charset=utf-8','.woff2':'font/woff2','.svg':'image/svg+xml','.webp':'image/webp'})[extname(name)]||'application/octet-stream');
  if(/\.(js|css|html)$/.test(name)){res.setHeader('Content-Encoding','gzip');res.end(gzipSync(data));}else res.end(data);
}catch{res.writeHead(404);res.end();}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+server.address().port;
const pkg=process.env.CENDON_NODE_PACKAGES;if(!pkg)throw Error('Set CENDON_NODE_PACKAGES to a node_modules folder that contains playwright');
const {chromium}=await import(pathToFileURL(join(pkg,'playwright','index.mjs')).href);
const browser=await chromium.launch({headless:true}),context=await browser.newContext({viewport:{width:393,height:852},hasTouch:true,isMobile:true,serviceWorkers:'block'});
const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
await context.route('**/*',async route=>{const u=new URL(route.request().url());if(u.origin===base)return route.continue();
  if(u.hostname==='www.gstatic.com'&&u.pathname.includes('firebase'))return route.fulfill({contentType:'text/javascript',body:firebase});
  if(u.pathname==='/api/onboarding')return route.fulfill({json:{status:'completed',completed:true,profile:{uid:'nav-fixture',name:'Fixture',lang:'th'}}});
  if(u.pathname.startsWith('/api/'))return route.fulfill({json:u.pathname==='/api/config'?{launch:null,features:{},now:Date.now()}:{cars:[],techs:[],gigs:[],posts:[],jobs:[],threads:[],items:[],saved:[],user:{uid:'nav-fixture'}}});
  return route.abort();});
await page.addInitScript(()=>{const uid='nav-fixture';localStorage.setItem('cendon_signed','1');localStorage.setItem('spire___owner',uid);localStorage.setItem('spire_theme','"light"');localStorage.setItem('spire_lang','"th"');localStorage.setItem('cendon_cfg',JSON.stringify({launch:null,got:Date.now()}));localStorage.setItem('spire_setup',JSON.stringify({uid,v:3,level:'enthusiast',lang:'th',distance:'km',currency:'THB'}));localStorage.setItem('spire___account_'+uid+'_status',JSON.stringify({status:'completed',completed:true,profile:{uid}}));localStorage.setItem('spire_cachedUser',JSON.stringify({uid,displayName:'Fixture'}));});
async function view(ns){for(const f of page.frames()){if(f===page.mainFrame())continue;const el=await f.frameElement().catch(()=>null);if(el&&await el.getAttribute('data-cendon-view')===ns)return f;}return null;}
const active=async()=>view(await page.evaluate(()=>CendonApp.current().namespace));
const settle=()=>page.waitForFunction(()=>!barba.transitions.isRunning,null,{timeout:20000}).then(()=>page.waitForTimeout(700));
async function tab(k){await (await active()).locator(`#mnav [data-mnav="${k}"]`).tap({timeout:15000});}
/* สิ่งที่เห็น = ที่อยู่ของหน้าแม่ = ที่อยู่ของกรอบ = แท็บที่ไฮไลต์ */
async function expect(want,label){
  await settle();const f=await active();
  const s=await f.evaluate(()=>{const bs=document.getElementById('bs'),tabs=[...document.querySelectorAll('#mnav .mtab')],plain=getComputedStyle(tabs.find(t=>!t.classList.contains('on'))||tabs[0]).color;
    return {path:location.pathname,home:!!document.getElementById('vMenu'),inbox:!!bs&&bs.classList.contains('on')&&bs.classList.contains('inbox'),sheet:!!bs&&bs.classList.contains('on'),lit:tabs.filter(t=>getComputedStyle(t).color!==plain).map(t=>t.dataset.mnav)};});
  const host=await page.evaluate(()=>location.pathname);
  const exp={home:{path:'/',lit:['home'],inbox:false},inbox:{path:'/messages',lit:['chat'],inbox:true},garage:{path:'/garage',lit:['garage']}}[want];
  assert.equal(s.path,exp.path,label+': view URL');assert.equal(host,exp.path,label+': address bar');assert.deepEqual(s.lit,exp.lit,label+': highlighted tab');
  if(want==='home'){assert.equal(s.home,true,label+': Home document');assert.equal(s.sheet,false,label+': no sheet left open');}
  if(want==='inbox')assert.equal(s.inbox,true,label+': inbox open');
}
try{
  await page.goto(base+'/');await page.waitForFunction(()=>window.CendonApp&&document.getElementById('appOpening').hidden,null,{timeout:60000});await settle();
  await tab('chat');await expect('inbox','Home → Chat tab');
  await tab('home');await expect('home','Chat → Home tab');
  await tab('garage');await expect('garage','Home → Garage');
  await tab('chat');await expect('inbox','Garage → Chat tab');
  /* เดิม: กดหน้าหลัก = ถอยประวัติ → กลับไปโผล่การาจ */
  await tab('home');await expect('home','Chat (opened from Garage) → Home tab goes Home, not back to Garage');
  await tab('chat');await expect('inbox','Chat again');await tab('garage');await expect('garage','Chat → Garage');
  /* เดิม: กดแชตแล้วรีบกดหน้าหลัก → ค้างที่ /messages ทั้งที่เห็นหน้าหลัก กดหน้าหลักซ้ำไม่ไปไหน */
  await tab('chat');await page.waitForTimeout(120);await tab('home');await settle();
  await page.goBack();await settle();
  const f=await active(),stuck=await f.evaluate(()=>!!document.getElementById('vMenu')&&location.pathname==='/messages'&&!document.getElementById('bs').classList.contains('on'));
  assert.equal(stuck,false,'Home is never shown while its URL still says /messages');
  await tab('home');await expect('home','Home tab always reaches Home');
  console.log(JSON.stringify({pass:true,synthetic:true,productionWrites:0,checks:['inbox↔home','garage→inbox→home','rapid chat+home','back then home'],pageErrors:[...new Set(errors)]}));
}finally{await browser.close();server.closeAllConnections();await new Promise(r=>server.close(r));}
