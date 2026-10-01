import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const source=readFileSync(new URL('../feature-ai.js',import.meta.url),'utf8');
function fixture({user=true,status=200}={}){
  const calls=[],input={value:'',focus(){},dispatchEvent(){}};
  const context={car:{make:'Test',model:'Fixture'},measurement:{peaks:[{hz:12}],ok:true},parking:{note:'B2 fixture',accuracyMeters:20},cost:{entryCount:1,total:100}};
  const document={body:{dataset:{phase:'thread'}},getElementById:id=>id==='inp'?input:null,querySelectorAll:()=>[]};
  const window={lang:'en',BACKEND_URL:'https://test.invalid',spireAuth:{currentUser:user?{getIdToken:async()=>'test-only-token'}:null},spireHasFeature:()=>true};
  const sandbox={window,document,location:{search:''},Event:class{},queueMicrotask,URLSearchParams,AbortController,setTimeout,clearTimeout,fetch:async(url,options)=>{calls.push({url,options});return {ok:status===200,status,json:async()=>status===200?{source:'ai',text:'Test transport response'}:{error:'quota'}}}};
  vm.runInNewContext(source,sandbox);
  const api=window.CendonFeatureAI;
  api.register({current:()=> 'quote',context:()=>context,media:async()=>[],stop(){},open(){}});
  return {api,window,calls,context,input};
}
test('normal chat has no tool job and remains on its original pipeline',async()=>{
  const f=fixture();assert.equal(await f.api.prepare([],'Hello'),null);assert.equal(f.calls.length,0);
});
test('all five selected tools dispatch authenticated requests with measured context',async()=>{
  for(const key of ['quote','listen','shake','park','own']){
    const f=fixture();f.api.select(key);
    const media=key==='quote'?[{mime:'image/jpeg',b64:'aGVsbG8='}]:key==='listen'?[{mime:'audio/webm',b64:'aGVsbG8='}]:[];
    const job=await f.api.prepare(media,'Test-only question');
    assert.equal(job.key,key);assert.equal(await f.api.analyze(job),'Test transport response');
    assert.equal(f.calls[0].url,'https://test.invalid/api/features/analyze');
    assert.equal(f.calls[0].options.headers.Authorization,'Bearer test-only-token');
    const body=JSON.parse(f.calls[0].options.body);assert.equal(body.tool,key);assert.equal(body.question,'Test-only question');
  }
});
test('missing quote/audio/measurements/history fails before network transmission',async()=>{
  for(const key of ['quote','listen','shake','own']){
    const f=fixture();f.context.measurement=null;f.context.cost=null;f.api.select(key);
    await assert.rejects(f.api.prepare([],'Test'));assert.equal(f.calls.length,0);
  }
});
test('anonymous users cannot send model requests',async()=>{
  const f=fixture({user:false});f.api.select('own');const job=await f.api.prepare([],'Test');
  await assert.rejects(f.api.analyze(job),/Sign in/);assert.equal(f.calls.length,0);
});
test('quota error is explicit and cancellation is forwarded to fetch',async()=>{
  const f=fixture({status:429});f.api.select('own');const job=await f.api.prepare([],'Test');
  const controller=new AbortController();await assert.rejects(f.api.analyze(job,controller.signal),e=>e.userQuota===true);
  assert.equal(f.calls[0].options.signal,controller.signal);
});
test('followups can reuse only evidence from the same selected tool',async()=>{
  const f=fixture();f.api.select('quote');const atts=[{mime:'image/jpeg',b64:'aGVsbG8='}];
  assert.equal((await f.api.prepare([],'Followup',{featureTool:'quote',atts})).attachments[0].b64,atts[0].b64);
  await assert.rejects(f.api.prepare([],'Followup',{featureTool:'listen',atts}));
  await assert.rejects(f.api.prepare([],'Followup',{featureTool:'quote',atts:[{kind:'image'}]}));
});
test('default chat appearance stays untouched: tool UI is opt-in and CSS is scoped',()=>{
  const css=readFileSync(new URL('../feature-ai.css',import.meta.url),'utf8');
  assert.match(css,/\.fa-toolbar\{display:none\}/);
  assert.match(css,/\.fa-toolbar\[data-active="true"\]/);
  assert.doesNotMatch(css,/(?:^|\n)body\s*\{/);
});
