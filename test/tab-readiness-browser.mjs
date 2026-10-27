import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createServer} from 'node:http';
import {pathToFileURL} from 'node:url';
const source=await readFile(new URL('../tab-shell.js',import.meta.url),'utf8');
const meta='<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">';
const server=createServer((req,res)=>{res.setHeader('Content-Type','text/html; charset=utf-8');const p=new URL(req.url,'http://fixture').pathname;
 if(p==='/tab-shell.js'){res.setHeader('Content-Type','text/javascript');res.end(source);return}
 res.end(meta+'<script>window.CendonPaint={prepare:()=>true};</script><script src="/tab-shell.js"></script><body><main id="screen" style="height:400px;background:#eee">'+(p==='/'?'Home':'Garage')+'</main><div></div><div></div><div></div>'+(p==='/garage'?'<script>document.documentElement.dataset.gate="1";document.documentElement.dataset.level="pending";setTimeout(()=>{document.documentElement.dataset.gate="0";document.documentElement.dataset.level="enthusiast"},5200)</script>':'')+'</body>');
});await new Promise(r=>server.listen(0,'127.0.0.1',r));
const {chromium}=await import(pathToFileURL('C:/Users/Porsche/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs'));
const browser=await chromium.launch({headless:true,channel:'chrome'}),page=await browser.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
try{await page.addInitScript(()=>{localStorage.setItem('cendon_tabs','1');Object.defineProperty(navigator,'deviceMemory',{value:2})});await page.goto('http://127.0.0.1:'+server.address().port+'/');
 await page.evaluate(()=>CendonTabs.go('/garage'));await page.waitForTimeout(4400);assert.equal(await page.locator('html').evaluate(x=>x.classList.contains('cdn-covered')),false,'4-second timer must not hide the previous screen');assert.equal(await page.locator('iframe.on').count(),0);
 await page.waitForFunction(()=>CendonTabs.current()==='garage');assert.equal(await page.locator('iframe.on').count(),1);
 await page.evaluate(()=>CendonTabs.go('/'));await page.evaluate(()=>{localStorage.setItem('spire_selCar','"changed"');CendonTabs.go('/garage')});await page.waitForTimeout(500);assert.equal(await page.locator('iframe.on').count(),0,'stale retained tab must reload before reveal');assert.equal(await page.locator('html').evaluate(x=>x.classList.contains('cdn-covered')),false);
 await page.evaluate(()=>CendonTabs.go('/'));await page.waitForTimeout(5600);assert.equal(await page.evaluate(()=>CendonTabs.current()),'home','cancelled destination must not appear later');assert.equal(new URL(page.url()).pathname,'/','address follows the visible page after cancellation');assert.equal(await page.locator('#cdnTabBar').count(),0);assert.deepEqual(errors,[]);
 console.log('PASS slow first tab >4s, stale-tab reload before reveal, cancellation preserves current screen; no real APIs');
}finally{await browser.close();server.closeAllConnections();await new Promise(r=>server.close(r))}
