// Isolated component QA: no production login, real customer, paid model or mechanic message.
import assert from 'node:assert/strict';
import {readFile,mkdir} from 'node:fs/promises';
import {createServer} from 'node:http';
import {resolve,join} from 'node:path';
import {pathToFileURL} from 'node:url';
const {chromium}=await import(pathToFileURL(join(process.env.CENDON_NODE_PACKAGES,'playwright','index.mjs')).href);
const root=resolve(import.meta.dirname,'..'),out=join(root,'.qa');await mkdir(out,{recursive:true});
const source=await readFile(join(root,'chat.html'),'utf8'),styles=[...source.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)].map(m=>m[1]).join('\n');
const files=new Set(['feature-ai.js','feature-ai.css','calm-ui.css','chat-garage.js','chat-render.js']);
const server=createServer(async(req,res)=>{
  const name=new URL(req.url,'http://localhost').pathname.slice(1);
  if(files.has(name)){res.setHeader('Content-Type',name.endsWith('.js')?'text/javascript':'text/css');res.end(await readFile(join(root,name)));return;}
  res.setHeader('Content-Type','text/html; charset=utf-8');
  res.end(`<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>${styles}</style><link rel="stylesheet" href="feature-ai.css"><link rel="stylesheet" href="calm-ui.css"><style>body{display:block!important;overflow:auto!important;padding:28px 16px;background:#111!important;color:#eee;font:15px system-ui}main{max-width:740px;margin:auto}#composer{position:static!important;width:100%!important;transform:none!important;height:auto!important}#v-quote{display:block!important;position:static!important;height:auto!important}#faInline{max-height:none!important;overflow:visible!important}.fixture{font-size:12px;color:#999;padding:10px 0}</style></head><body data-phase="thread"><main><p class="fixture">Isolated QA · sample vehicle · no production data</p><div id="wCarTag"></div><div id="messages"></div><div id="composer"><textarea id="inp" placeholder="Ask about your car"></textarea></div><div id="v-quote"><div id="lgQuote"></div></div></main></body></html>`);
}).listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));
const browser=await chromium.launch({headless:true,channel:'msedge'});
try{
  const page=await browser.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
  for(const width of [1280,390]){
    await page.setViewportSize({width,height:1000});await page.goto('http://127.0.0.1:'+server.address().port);
    await page.evaluate(()=>{
      window.lang='en';window.selected={id:'fixture-car',make:'Toyota',model:'Corolla',year:'2020',name:'Toyota Corolla',mileage:'42000'};
      window.calls=[];window.failSave=false;window.setPhase=p=>document.body.dataset.phase=p;
      window.CendonValetCore={curCar:()=>window.selected,carLabel:c=>c.name+' '+c.year,today:()=> '2026-10-17',SVC:{oil:['น้ำมันเครื่อง','Engine oil']},parking:async()=>({saved:false}),parkingText:()=> 'No saved parking spot',
        logAdd:async(...args)=>{window.calls.push(args);if(window.failSave)throw Error('Offline — not saved');return {id:'fixture-entry'}}};
    });
    for(const file of ['chat-render.js','feature-ai.js','chat-garage.js'])await page.addScriptTag({url:'/'+file});
    await page.evaluate(()=>CendonFeatureAI.register({stop(){},open:key=>CendonFeatureAI.mount(key),current:()=> 'own'}));
    await page.waitForSelector('#faToolbar',{state:'attached'});await page.evaluate(()=>CendonFeatureAI.openEntry());
    await page.locator('#faCostEntry [name="amount"]').fill('1200');await page.locator('#faCostEntry [name="km"]').fill('42000');
    await page.locator('#faCostEntry button[type="submit"]').click();await page.waitForFunction(()=>document.querySelector('[data-entry-result]').textContent==='Saved to your account');
    assert.equal(await page.evaluate(()=>calls.length),1);
    await page.evaluate(()=>window.failSave=true);await page.locator('#faCostEntry button[type="submit"]').click();
    await page.waitForFunction(()=>document.querySelector('[data-entry-result]').textContent.includes('not saved'));
    assert.equal(await page.locator('#faCostEntry [name="amount"]').inputValue(),'1200','failed submission preserves editable input');
    await page.screenshot({path:join(out,'feedback-'+width+'.png'),fullPage:true});
    const result=await page.evaluate(()=>{
      const host=document.getElementById('messages'),render=(m)=>'<div data-m="'+m+'"><input value="'+m+'"></div>';
      CendonChatRender.paint(host,['one','two'],render,'');const first=host.firstChild,input=first.firstChild;input.value='unsent draft';input.focus();
      CendonChatRender.paint(host,['one','two','three'],render,'');const stable=host.firstChild===first&&input.value==='unsent draft'&&document.activeElement===input;
      CendonChatRender.paint(host,['one','updated'],render,'<span>signature</span>');
      return {stable,same:host.firstChild===first,count:host.childNodes.length,text:host.children[1].dataset.m,overflow:document.documentElement.scrollWidth>innerWidth};
    });
    assert.deepEqual(result,{stable:true,same:true,count:3,text:'updated',overflow:false});
  }
  assert.deepEqual(errors,[]);console.log('Desktop/mobile component QA passed: real form interaction, failure state, stable message nodes, no horizontal overflow.');
}finally{await browser.close();server.close()}
