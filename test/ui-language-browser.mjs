/* Local language packs; no network translation or user data leaves the fixture. */
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import vm from 'node:vm';
const root=resolve(import.meta.dirname,'..'),codes=['th','en','zh','ja','ko','id','vi','ms','de','fr','es','pt'],packs={};
for(const code of codes.filter(c=>!['th','en'].includes(c))){const ctx={window:{}};vm.runInNewContext(await readFile(resolve(root,'i18n/home-'+code+'.js'),'utf8'),ctx);packs[code]=ctx.window.CENDON_L10N.t}
const html=`<!doctype html><meta charset="utf-8"><script>let current='en';window.spireLang=()=>current;window.spireOnLang=()=>{};window.setLanguage=code=>{current=code;localStorage.setItem('spire_lang',JSON.stringify(code));dispatchEvent(new CustomEvent('cendon:preferences',{detail:{lang:code}}))};</script>
<h1 id="heading">ร้านของฉัน</h1><button id="edit">แก้ไขร้าน</button><div id="dynamic"></div><input id="field" value="แก้ไขร้าน" placeholder="ชื่อร้าน"><div class="nt" id="name">แก้ไขร้าน</div><div class="msg" id="message">ร้านของฉัน</div><div class="about" id="description">ตั้งค่า</div><script src="/i18n/ui-en.js"></script><script src="/ui-language.js"></script>`;
const server=createServer(async(req,res)=>{const u=new URL(req.url,'http://fixture');try{
  res.setHeader('Cache-Control','no-store');res.setHeader('Content-Type',u.pathname==='/'?'text/html; charset=utf-8':'text/javascript; charset=utf-8');
  if(u.pathname==='/'){res.end(html);return}
  if(!/^\/(?:ui-language\.js|i18n\/(?:ui-en|home-[a-z]{2})\.js)$/.test(u.pathname))throw Error('path');res.end(await readFile(resolve(root,u.pathname.slice(1))));
}catch{res.writeHead(404);res.end()}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+server.address().port;
const {chromium}=await import(pathToFileURL('C:/Users/Porsche/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs'));
const browser=await chromium.launch({headless:true,channel:'chrome'}),page=await browser.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
try{
  await page.goto(base);await page.waitForFunction(()=>document.getElementById('edit').textContent==='Edit shop');
  for(const code of codes){
    await page.evaluate(code=>setLanguage(code),code);
    const want=code==='th'?'แก้ไขร้าน':code==='en'?'Edit shop':packs[code]['Edit shop'];assert.ok(want,code);
    await page.waitForFunction(want=>document.getElementById('edit').textContent===want,want,{timeout:4000});
    assert.equal(await page.evaluate(()=>spireT('แก้ไขร้าน','Edit shop')),want,code+' uses the same translator in shared components');
    assert.equal(await page.locator('#field').inputValue(),'แก้ไขร้าน');assert.equal(await page.locator('#name').innerText(),'แก้ไขร้าน');assert.equal(await page.locator('#message').innerText(),'ร้านของฉัน');assert.equal(await page.locator('#description').innerText(),'ตั้งค่า');
  }
  await page.evaluate(()=>{setLanguage('en');document.getElementById('dynamic').innerHTML='<button id="later">แก้ไขร้าน</button>'});await page.waitForFunction(()=>document.getElementById('later')?.textContent==='Edit shop');
  await page.evaluate(()=>{document.getElementById('later').textContent='ร้านของฉัน'});await page.waitForFunction(()=>document.getElementById('later')?.textContent==='My shop');
  await page.evaluate(()=>setLanguage('th'));await page.waitForFunction(()=>document.getElementById('later')?.textContent==='ร้านของฉัน');
  let changes=await page.evaluate(()=>{window.changes=0;new MutationObserver(m=>changes+=m.length).observe(document.body,{subtree:true,childList:true,characterData:true});return changes});await page.waitForTimeout(300);changes=await page.evaluate(()=>changes);assert.ok(changes<10,'localization does not loop over its own writes');
  assert.deepEqual(errors,[]);console.log('PASS: 12 UI languages + live switching + late panels + changed labels + Thai restoration + user names/messages/descriptions/input preserved + no repaint loop');
}finally{await browser.close();server.closeAllConnections();await new Promise(r=>server.close(r))}
