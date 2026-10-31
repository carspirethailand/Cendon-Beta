/* Validate real coloured SVG pixels, not only generated markup. Local fixture. */
import assert from 'node:assert/strict';import {spawn} from 'node:child_process';import {pathToFileURL} from 'node:url';import {resolve,join} from 'node:path';import {mkdir} from 'node:fs/promises';
const root=resolve(import.meta.dirname,'..'),pkg=process.env.CENDON_NODE_PACKAGES||'C:/Users/Porsche/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules', {chromium}=await import(pathToFileURL(join(pkg,'playwright/index.mjs')));
const server=spawn(process.execPath,['test/app-fixture-server.mjs',process.env.CENDON_QA_DIST||'.','0','0'],{cwd:root,stdio:['ignore','pipe','pipe']}),base=await new Promise((ok,fail)=>{server.stdout.once('data',b=>ok(JSON.parse(b.toString()).url));server.once('error',fail);server.once('exit',()=>fail(Error('Fixture stopped')))}),browser=await chromium.launch({headless:true,channel:'chrome'}),page=await browser.newPage({viewport:{width:393,height:852},serviceWorkers:'block',reducedMotion:'reduce'}),errors=[];page.on('pageerror',e=>errors.push(e.message));
try{
  await page.goto(base+'/garage');
  await page.waitForFunction(()=>window.CendonApp&&document.getElementById('appOpening').hidden);
  const frame=page.frames().find(f=>f!==page.mainFrame()&&new URL(f.url()).pathname==='/garage'),svg=frame.locator('#garageList .car-art svg').first();
  await svg.waitFor({state:'visible'});
  await frame.evaluate(async()=>{await document.fonts.ready;const img=new Image();img.src=document.querySelector('#garageList .car-art image').href.baseVal;await img.decode();await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))});
  async function assertPaint(){
    const clip=await svg.boundingBox();assert.ok(clip&&clip.width>100&&clip.height>80);
    const painted=await page.screenshot({clip,animations:'disabled'});
    await svg.evaluate(el=>el.style.visibility='hidden');const empty=await page.screenshot({clip,animations:'disabled'});
    await svg.evaluate(el=>el.style.visibility='');
    assert.notDeepEqual(painted,empty,'the car must paint visible pixels, not an empty SVG');
  }
  await assertPaint();
  await page.evaluate(()=>CendonApp.go('/garage/fixture-car'));
  await frame.locator('#clModal.show').waitFor({state:'visible'});
  // Check the old card in the same document after its URL changed, without the
  // modal covering the screenshot. Only test visibility is changed, not app data.
  await frame.locator('#clModal').evaluate(el=>el.style.visibility='hidden');
  await assertPaint();
  await frame.locator('#clModal').evaluate(el=>el.style.visibility='');
  await page.evaluate(()=>CendonApp.go('/garage'));
  await frame.locator('#clModal.show').waitFor({state:'hidden'});
  await assertPaint();
  await mkdir(join(root,'.qa/performance'),{recursive:true});
  await page.screenshot({path:join(root,'.qa/performance/car-paint-verified.png'),animations:'disabled'});
  assert.deepEqual(errors,[]);
  console.log(JSON.stringify({pass:true,svgImageDecoded:true,carPaintsVisiblePixels:true,deepHistoryKeepsPaint:true,productionWrites:0}));
}
finally{await browser.close();server.kill()}
