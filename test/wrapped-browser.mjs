// Isolated real component QA. Sample records and a local fake model, never production data.
import assert from 'node:assert/strict';import {createServer} from 'node:http';import {readFile,mkdir} from 'node:fs/promises';import {join,resolve} from 'node:path';import {pathToFileURL} from 'node:url';
const {chromium}=await import(pathToFileURL(join(process.env.CENDON_NODE_PACKAGES,'playwright','index.mjs')).href),root=resolve(import.meta.dirname,'..');
await mkdir(join(root,'.qa'),{recursive:true});
const server=createServer(async(req,res)=>{const p=new URL(req.url,'http://localhost').pathname;
  if(['/garage-extras.js','/garage-extras.css'].includes(p)){res.setHeader('Content-Type',p.endsWith('.js')?'text/javascript':'text/css');res.end(await readFile(join(root,p.slice(1))));return;}
  res.setHeader('Content-Type','text/html; charset=utf-8');res.end('<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="theme-color" content="#e00000"><link rel="stylesheet" href="/garage-extras.css"><style>body{margin:0;background:#eee;font:16px system-ui}#garageList{height:700px;background:red}</style><button id="open">Open sample Wrapped</button><main id="garageList">Red fixture background must never bleed through</main>');
}).listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));
const browser=await chromium.launch({channel:'msedge',headless:true});
try{
  for(const width of [1280,390]){
    const page=await browser.newPage({viewport:{width,height:844}}),pending=[],errors=[];page.on('pageerror',e=>errors.push(e.message));
    await page.route('**/api/features/analyze',route=>new Promise(resolve=>pending.push(async nickname=>{await route.fulfill({json:{data:{nickname,line:'Local fixture only'}}});resolve()})));
    await page.goto('http://127.0.0.1:'+server.address().port);await page.evaluate(()=>{
      window.lang='en';window.BACKEND_URL=location.origin;window.spireAuth={currentUser:{uid:'qa-user',getIdToken:async()=> 'fake-local-test-token'}};
      window.garage=()=>[{id:'qa-car',make:'Test',model:'Fixture',year:'2020'}];
      window.SpireCarLab={getLog:()=>({fuel:[{km:10000,amount:1200,litres:30,date:'2026-02-01'},{km:11000,amount:1300,litres:32,date:'2026-04-01'}],services:[{km:11000,amount:1600,k:'oil',date:'2026-04-01'}],trips:[{title:'Sample trip',km:200,date:'2026-02-15'}]})};
    });await page.addScriptTag({url:'/garage-extras.js'});await page.locator('#open').focus();await page.evaluate(()=>CarExtras.wrapped());
    for(let i=0;i<50&&pending.length<1;i++)await page.waitForTimeout(10);assert.equal(pending.length,1);
    await page.locator('.wr-x').click();await page.evaluate(()=>CarExtras.wrapped());for(let i=0;i<50&&pending.length<2;i++)await page.waitForTimeout(10);assert.equal(pending.length,2);
    await pending[0]('OLD RESPONSE');assert.notEqual(await page.locator('#wrName').textContent(),'OLD RESPONSE','late closed-session response cannot repaint new session');await pending[1]('CURRENT RESPONSE');
    await page.waitForFunction(()=>document.getElementById('wrName').textContent==='CURRENT RESPONSE');
    await page.locator('.wr-tap.r').click();await page.locator('.wr-tap.r').click();
    const state=await page.evaluate(()=>({visible:[...document.querySelectorAll('.wr-s')].filter(x=>x.getClientRects().length).length,redHidden:document.getElementById('garageList').getClientRects().length===0,canvas:document.querySelectorAll('.wr canvas').length,overflow:document.documentElement.scrollWidth>innerWidth,theme:document.querySelector('meta[name="theme-color"]').content}));
    assert.deepEqual(state,{visible:1,redHidden:true,canvas:0,overflow:false,theme:'#0b0b0d'});
    await page.screenshot({path:join(root,'.qa','wrapped-'+width+'.png')});
    await page.locator('.wr-x').click();assert.equal(await page.locator('.wr').count(),0);assert.equal(await page.locator('meta[name="theme-color"]').getAttribute('content'),'#e00000');
    assert.equal(await page.evaluate(()=>document.activeElement.id),'open');assert.deepEqual(errors,[]);await page.close();
  }
  console.log('Wrapped desktop/mobile browser QA passed: no red bleed-through, one active slide, no perpetual canvas, closed-session response ignored, focus/theme restored.');
}finally{await browser.close();server.close()}
