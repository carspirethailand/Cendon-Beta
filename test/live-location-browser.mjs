// Actual location controllers + inline job-control markup in an isolated Chrome
// harness. GPS/API are synthetic; this does not measure real GPS accuracy.
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
const home=await readFile(new URL('../index.html',import.meta.url),'utf8');
const part=(a,b)=>{const i=home.indexOf(a),j=home.indexOf(b,i);assert.ok(i>=0&&j>i,a);return home.slice(i,j);};
const live=part('const LiveShare={','addEventListener("visibilitychange",()=>{if(!document.hidden&&LiveShare'),roam=part('const RoamShare={','/* หัว Studio อาจวาด');
const control=home.match(/<button class="jw-row" type="button" id="jobLiveShare"[\s\S]*?<\/button>/)[0].replace('${esc(j.id)}','fixture-job');
const css=home.match(/\.jw-row\{[^}]+\}/)[0]+home.match(/#jobLiveShare\[hidden\]\{[^}]+\}/)[0];
const {chromium}=await import(pathToFileURL('C:/Users/Porsche/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs'));
const browser=await chromium.launch({headless:true,channel:'chrome'}),context=await browser.newContext({viewport:{width:393,height:800}}),page=await context.newPage(),errors=[];
page.on('pageerror',e=>errors.push(e.message));await context.route('**/*',r=>r.abort());
try{
 await page.setContent(`<!doctype html><meta charset="utf-8"><style>body{font:16px system-ui;margin:24px}button,input{font:inherit}main{padding:24px;background:#eee}${css}</style><main id="home"><h1>Fixture Home</h1><input id="search" aria-label="Search"></main><section id="job" hidden>${control}</section><script>
 const $=id=>document.getElementById(id),T=(th,en)=>en,esc=String,U={uid:'fixture'},DSTATS=null,JOBS=[],calls=[],watchers=new Map(),cleared=[],store=new Map();
 const myShop=()=>({mobile:true,roam:true,online:true}),km=()=>0,ls={get:(k,d)=>store.has(k)?store.get(k):d,set:(k,v)=>store.set(k,v)},api=async(path,o)=>{calls.push({path,...o});return {}};
 Object.defineProperty(navigator,'geolocation',{value:{watchPosition(ok,error){const id=watchers.size;watchers.set(id,{ok,error});return id},clearWatch(id){cleared.push(id)}}});
 ${live}${roam}
 window.start=()=>{RoamShare.sync();LiveShare.start('fixture-job')};
 window.emit=async()=>{for(const [id,w]of watchers)if(!cleared.includes(id))await w.ok({coords:{latitude:0,longitude:0,accuracy:12,heading:0,speed:0}})};
 window.showJob=()=>{$('home').hidden=true;$('job').hidden=false;LiveShare.paint()};
 window.state=()=>({roam:RoamShare.watch,job:LiveShare.watch,paths:calls.map(c=>c.path),cleared:[...cleared],off:store.get('spire_live_off')});
 </script>`);
 await page.evaluate(()=>start());await page.evaluate(()=>emit());assert.equal(await page.locator('#liveBar,.live-bar').count(),0);await page.locator('#search').fill('still usable');
 const started=await page.evaluate(()=>state());assert.equal(started.roam,0);assert.equal(started.job,1);assert.deepEqual(started.paths,['/api/tech/here','/api/tech/jobs/fixture-job/live']);
 await page.evaluate(()=>showJob());await page.locator('#jobLiveShare').waitFor({state:'visible'});assert.notEqual(await page.locator('#jobLiveShare').evaluate(e=>getComputedStyle(e).position),'fixed');
 page.once('dialog',d=>d.accept());await page.locator('#jobLiveShare').click();await page.locator('#jobLiveShare').waitFor({state:'hidden'});
 const stopped=await page.evaluate(()=>state());assert.equal(stopped.job,null);assert.equal(stopped.roam,0,'stopping one job does not disable roaming');assert.equal(stopped.off,'fixture-job');assert.deepEqual(stopped.cleared,[1]);assert.equal(await page.locator('#liveBar,.live-bar').count(),0);assert.deepEqual(errors,[]);
 console.log(JSON.stringify({pass:true,synthetic:true,productionWrites:0,checks:['no floating badge during either sender','Home stays usable','both location endpoints still receive fixture updates','inline job Stop remains accessible','job stop does not stop roaming'],pageErrors:errors}));
}finally{await browser.close();}
