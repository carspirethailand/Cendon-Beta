import {pathToFileURL} from 'node:url';
const {chromium}=await import(pathToFileURL('C:/Users/Porsche/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs'));
import assert from 'node:assert/strict';
import {resolve} from 'node:path';
const root=resolve(import.meta.dirname,'..'),browser=await chromium.launch({headless:true,channel:'chrome'}),page=await browser.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
await page.route('https://fixture.test/api/display-rates',r=>r.fulfill({json:{result:'success',base_code:'THB',rates:{THB:1,USD:.03},time_last_update_unix:Math.floor(Date.now()/1000)}}));
await page.route('https://fixture.test/',r=>r.fulfill({contentType:'text/html; charset=utf-8',body:'<meta charset="utf-8"><body><b id="whole">1,609.344 km</b><b id="split">1,609.344 <em>km</em></b><b id="cost">฿1,000</b><form><label>1,000 km<input id="canonical" value="1000"></label></form><div class="msg">฿1,000 1,000 km</div><label class="cx-rem"><div><b>Show maintenance expenses on Car Passport</b><small>Only share these amounts when you explicitly choose to do so.</small></div><input id="cxCost" type="checkbox"><i class="sw"></i></label></body>'}));
try{
 await page.goto('https://fixture.test/');await page.evaluate(()=>{window.BACKEND_URL=location.origin;window.spireAuth={currentUser:{uid:'one'}};window.preference={uid:'one',currency:'USD',distance:'mi'};window.spireSetupRead=()=>preference;window.spireLang=()=> 'en'});
 await page.addScriptTag({path:resolve(root,'display-prefs.js')});
 try{await page.waitForFunction(()=>document.getElementById('cost').textContent.includes('USD'),{},{timeout:12000})}catch(e){console.log(JSON.stringify({errors,diagnostic:await page.evaluate(()=>({prefs:window.CendonDisplayPrefs?.prefs(),money:window.CendonDisplayPrefs?.money(1000),note:document.getElementById('displayRatesNote')?.textContent,cost:document.getElementById('cost').textContent,fx:localStorage.getItem('cendon_fx_thb_v2')}))}));throw e}
 assert.match(await page.locator('#whole').innerText(),/^1,000 mi$/);assert.match(await page.locator('#split').innerText(),/^1,000\s*mi$/);assert.match(await page.locator('#cost').innerText(),/30/);
 await page.waitForTimeout(100);assert.match(await page.locator('#split').innerText(),/mi$/,'observer must not undo its own conversion');assert.equal(await page.locator('#canonical').inputValue(),'1000');assert.equal(await page.locator('.msg').innerText(),'฿1,000 1,000 km');
 await page.evaluate(()=>{preference={uid:'one',currency:'THB',distance:'km'};dispatchEvent(new CustomEvent('cendon:preferences'))});await page.waitForFunction(()=>document.getElementById('whole').textContent.includes('km'));
 assert.equal(await page.locator('#cost').innerText(),'฿1,000');assert.match(await page.locator('#split').innerText(),/^1,609.344\s*km$/);
 await page.addStyleTag({path:resolve(root,'garage-extras.css')});
 for(const width of [320,390,1280]){await page.setViewportSize({width,height:850});const boxes=await page.locator('.cx-rem').evaluate(el=>({text:el.querySelector('div').getBoundingClientRect().toJSON(),toggle:el.querySelector('.sw').getBoundingClientRect().toJSON(),width:document.documentElement.scrollWidth}));assert.ok(boxes.text.right<=boxes.toggle.x);assert.ok(boxes.width<=width)}
 assert.deepEqual(errors,[]);console.log(JSON.stringify({ok:true,checks:['distance conversion','split unit','currency conversion','reversal','no observer loop','canonical input unchanged','chat untouched','passport 320/390/1280'],pageErrors:errors}));
}finally{await browser.close()}
