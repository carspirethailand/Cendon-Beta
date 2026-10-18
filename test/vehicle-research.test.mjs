import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const helper=readFileSync(new URL('../vehicle-audio.js',import.meta.url),'utf8'),agent=readFileSync(new URL('../call-agent.js',import.meta.url),'utf8');
const window={};vm.runInNewContext(helper,{window,URL});const A=window.CendonVehicleAudio;
test('capture provenance reports actual browser settings only; missing settings never become false',()=>{
  const r=A.recording({getAudioTracks:()=>[{getSettings:()=>({noiseSuppression:false,echoCancellation:false,deviceId:'PRIVATE',sampleRate:48000})}]});
  assert.equal(r.source,'dedicated_microphone');assert.equal(r.processing.noiseSuppression,false);assert.equal(r.processing.autoGainControl,undefined);assert.ok(!JSON.stringify(r).includes('PRIVATE'));
  assert.deepEqual(JSON.parse(JSON.stringify(A.recording(null))),{source:'dedicated_microphone',processing:{}});
});
test('research links are escaped, unsafe protocols removed and unread links never look verified',()=>{
  const out=A.researchMarkup({status:'links_only',sources:[{title:'<script>alert(1)</script>',url:'javascript:alert(1)'},{title:'Honda "manual"',url:'https://www.thaihonda.co.th/manual',status:'link_only'}]});
  assert.ok(!out.includes('javascript:')&&!out.includes('<script>'));assert.match(out,/ยังไม่ได้อ่าน/);assert.match(out,/noopener noreferrer/);
  assert.match(A.researchMarkup({status:'unavailable'}),/ยังค้นเอกสารออนไลน์ไม่ได้/);
  assert.match(A.assessmentLabel('no_clear_abnormality'),/ยังไม่พบ/);
});
test('voice internet tool really POSTs research and displays realtime status without mutating Garage or opening map',async()=>{
  const window={},calls=[],shown=[];vm.runInNewContext(agent,{window});
  const a=window.CendonCallAgent.create({api:async(path,o)=>{calls.push({path,o});return {status:'found',sources:[{title:'Manual',url:'https://www.thaihonda.co.th/manual',status:'read'}]};},showResearch:r=>shown.push(r),getCar:()=>({vin:'SECRET'})});
  const ac=new AbortController(),ctx={signal:ac.signal,isCurrent:()=>true};
  const r=await a.execute('web_search',{query:'Honda Wave 110i 2023 manual'},ctx);
  assert.equal(calls.length,1);assert.equal(calls[0].path,'/api/ai/research');assert.equal(calls[0].o.method,'POST');assert.equal(calls[0].o.signal,ac.signal);assert.deepEqual(JSON.parse(JSON.stringify(calls[0].o.body)),{query:'Honda Wave 110i 2023 manual'});
  assert.equal(shown[0].status,'searching');assert.equal(shown[1].status,'found');assert.ok(!JSON.stringify(r).includes('SECRET'));assert.match(r.note,/untrusted/);
});
test('cancelled voice research does not render late results or post anything else',async()=>{
  const window={},shown=[];vm.runInNewContext(agent,{window});let done;const wait=new Promise(r=>done=r),ac=new AbortController();
  const a=window.CendonCallAgent.create({api:()=>wait,showResearch:r=>shown.push(r)});
  const p=a.execute('web_search',{query:'Yamaha NMAX manual'},{signal:ac.signal,isCurrent:()=>!ac.signal.aborted});
  ac.abort();done({status:'found',sources:[]});await assert.rejects(p);assert.equal(shown.length,1);
});
test('typed and voice capture paths forward provenance, and web research is paired on Home and Chat',()=>{
  const call=readFileSync(new URL('../call-tools.js',import.meta.url),'utf8'),chat=readFileSync(new URL('../chat.html',import.meta.url),'utf8'),home=readFileSync(new URL('../index.html',import.meta.url),'utf8');
  assert.match(call,/recording=mic.recording/);assert.match(call,/recording:\{\.\.\.recording,durationSeconds/);assert.match(chat,/recording:context.recording/);
  for(const s of [home,chat])assert.match(s,/showResearch:view.showResearch/);
});
