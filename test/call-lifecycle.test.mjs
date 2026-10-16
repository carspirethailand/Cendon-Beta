import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const page=readFileSync(new URL('../chat.html',import.meta.url),'utf8');
const transport=readFileSync(new URL('../call-session.js',import.meta.url),'utf8');
const begin=transport.indexOf('/* ===== LIVE CALL — Gemini Live API (ephemeral token)');
const end=transport.indexOf('  function dispose(){',begin);
const source=transport.slice(begin,end);
function deferred(){let resolve,reject;const promise=new Promise((a,b)=>{resolve=a;reject=b;});return {promise,resolve,reject};}
async function settle(){for(let i=0;i<12;i++)await Promise.resolve();}
function fixture({permission,identity,token,worklet}={}){
  const elements=new Map(),contexts=[],sockets=[],cues=[],requests=[],toasts=[],timers=new Map();let timerId=0,micRequests=0;
  const track={stopped:0,stop(){this.stopped++;}},stream={getTracks:()=>[track]};
  const element=id=>{
    if(elements.has(id))return elements.get(id);
    const classes=new Set(),icon={className:''};
    const node={textContent:'',clientWidth:300,className:'',srcObject:null,width:0,height:0,
      classList:{add:c=>classes.add(c),remove:c=>classes.delete(c),contains:c=>classes.has(c),toggle(c,force){const on=force??!classes.has(c);if(on)classes.add(c);else classes.delete(c);}},
      style:{setProperty(){}},setAttribute(){},querySelector:()=>icon,addEventListener(){},getContext:()=>({}),play:()=>Promise.resolve()};
    elements.set(id,node);return node;
  };
  const audioNode=()=>({connect(){},disconnect(){},gain:{value:1},port:{},stop(){this.stopped=true;}});
  class Context{
    constructor(){this.currentTime=0;this.sampleRate=48000;this.state='running';this.destination={};this.audioWorklet={addModule:()=>worklet?.promise||Promise.resolve()};contexts.push(this);}
    resume(){this.state='running';return Promise.resolve();}close(){this.state='closed';return Promise.resolve();}
    createMediaStreamSource(){return audioNode();}createGain(){return audioNode();}
    createAnalyser(){return audioNode();}createScriptProcessor(){return audioNode();}
  }
  class Socket{
    constructor(){this.readyState=0;sockets.push(this);}send(value){this.sent=value;}
    close(){this.readyState=3;this.onclose?.({code:1000,reason:''});}
    async setup(){this.readyState=1;this.onopen?.();await this.onmessage?.({data:JSON.stringify({setupComplete:{}})});}
  }
  const auth={currentUser:{getIdToken:()=>identity?.promise||Promise.resolve('unit-test-identity')}};
  const navigator={mediaDevices:{getUserMedia(){micRequests++;return permission?.promise||Promise.resolve(stream);}}};
  const window={AudioContext:Context,WebSocket:Socket,CendonCallSounds:{play:kind=>cues.push(kind)},spireTheme:()=>'dark'};
  const sandbox={window,navigator,auth,host:{},useFb:true,lang:'th',BACKEND_URL:'https://unit-test.invalid',
    $:element,Image:class{},WebSocket:Socket,AudioWorkletNode:class{constructor(ctx){Object.assign(this,audioNode());this.context=ctx;}},Blob,AbortController,
    URL:{createObjectURL:()=> 'blob:unit-test-worklet',revokeObjectURL(){}},Date,performance:{now:()=>0},
    requestAnimationFrame:()=>1,sysPrompt:()=>'',tr:k=>k,toast:message=>toasts.push(message),
    LS:{get:(_k,fallback)=>fallback,set(){},del(){}},messages:[],saveSession(){},renderMessages(){},updateHint(){},renderChips(){},setPhase(){},
    setTimeout(fn,ms){const id=++timerId;timers.set(id,{fn,ms});return id;},clearTimeout:id=>timers.delete(id),
    setInterval:()=>++timerId,clearInterval(){},
    fetch:async(_url,options)=>{requests.push(options);return token?.promise||{ok:true,json:async()=>({token:'unit-test-ephemeral',model:'test-live-model'})};}};
  vm.createContext(sandbox);vm.runInContext(source,sandbox);
  return {sandbox,element,stream,track,contexts,sockets,cues,requests,toasts,timers,get micRequests(){return micRequests;},run:code=>vm.runInContext(code,sandbox)};
}
test('dial begins microphone/auth immediately with no 450ms chime delay',async()=>{
  const p=deferred(),f=fixture({permission:p});const dial=f.run('startCall()');
  assert.deepEqual(f.cues,['start']);assert.equal(f.micRequests,1);
  assert.equal(f.requests.length,0,'No metered request before permission');
  assert.ok(![...f.timers.values()].some(timer=>timer.ms===450||timer.ms===1500));
  f.run('endCall()');p.resolve(f.stream);await dial;
});
test('double tap while asking for permission starts only one call and cue',async()=>{
  const p=deferred(),f=fixture({permission:p});const first=f.run('startCall()');await f.run('startCall()');
  assert.equal(f.micRequests,1);assert.deepEqual(f.cues,['start']);
  f.run('endCall()');p.resolve(f.stream);await first;
});
test('hangup during permission stops a late stream and never opens a socket',async()=>{
  const p=deferred(),f=fixture({permission:p});const dial=f.run('startCall()');f.run('endCall()');
  p.resolve(f.stream);await dial;
  assert.equal(f.track.stopped,1);assert.equal(f.sockets.length,0);assert.equal(f.requests.length,0);
  assert.deepEqual(f.cues,['start','end']);assert.equal(f.run('callConnecting'),false);
});
test('hangup aborts the pending token request and ignores a late successful response',async()=>{
  const token=deferred(),f=fixture({token});const dial=f.run('startCall()');await settle();
  assert.equal(f.requests.length,1);f.run('endCall()');assert.equal(f.requests[0].signal.aborted,true);
  token.resolve({ok:true,json:async()=>({token:'late',model:'late-model'})});await dial;
  assert.equal(f.sockets.length,0);assert.equal(f.track.stopped,1);assert.equal(f.toasts.length,0);
});
test('hangup during WebSocket setup settles the call without reconnecting',async()=>{
  const f=fixture(),dial=f.run('startCall()');await settle();assert.equal(f.sockets.length,1);
  f.run('endCall()');await dial;
  assert.equal(f.run('callActive'),false);assert.equal(f.run('callConnecting'),false);
  assert.deepEqual(f.cues,['start','end']);assert.equal(f.timers.size,0);
});
test('successful call preserves the selected Live model, mic, captions and quiet hangup',async()=>{
  const f=fixture(),dial=f.run('startCall()');await settle();await f.sockets[0].setup();await dial;
  assert.equal(JSON.parse(f.sockets[0].sent).setup.model,'models/test-live-model');
  assert.equal(f.run('callActive'),true);assert.equal(f.run('callConnecting'),false);
  f.run(`handleLiveMsg({serverContent:{inputTranscription:{text:'เสียงรถ'}}})`);
  assert.equal(f.element('callCaption').textContent,'เสียงรถ');
  f.run('endCall()');f.run('endCall()');assert.deepEqual(f.cues,['start','end']);
  assert.equal(f.track.stopped,1);assert.ok(f.contexts.every(context=>context.state==='closed'));
});
test('cancelled worklet preparation cannot attach its mic to a new call',async()=>{
  const worklet=deferred(),f=fixture({worklet}),dial=f.run('startCall()');await settle();
  const setup=f.sockets[0].setup();await settle();f.run('endCall()');await dial;
  const next=f.run('startCall()');await settle();const nextSetup=f.sockets[1].setup();await settle();
  worklet.resolve();await setup;await nextSetup;await next;
  assert.equal(f.run('callMicNode.context'),f.contexts[2]);assert.equal(f.run('callActive'),true);
  assert.equal(f.toasts.length,0);f.run('endCall()');
});

test('hangup while auth is pending does not request a token after auth completes',async()=>{
  const identity=deferred(),f=fixture({identity}),dial=f.run('startCall()');await settle();
  f.run('endCall()');identity.resolve('late-identity');await dial;
  assert.equal(f.requests.length,0);assert.equal(f.track.stopped,1);assert.equal(f.sockets.length,0);
});

test('a stalled token request aborts with an actionable timeout',async()=>{
  const token=deferred(),f=fixture({token}),dial=f.run('startCall()');await settle();
  f.requests[0].signal.addEventListener('abort',()=>token.reject(Object.assign(Error('Aborted'),{name:'AbortError'})));
  const timer=[...f.timers.values()].find(timer=>timer.ms===15000);assert.ok(timer);timer.fn();await dial;
  assert.equal(f.run('callConnecting'),false);assert.equal(f.track.stopped,1);
  assert.ok(f.toasts.some(message=>message.includes('เชื่อมต่อนานเกินไป')));
});

test('hangup clears queued AI speech without stopping the independent end cue',async()=>{
  const f=fixture(),dial=f.run('startCall()');await settle();await f.sockets[0].setup();await dial;
  f.run('playSrcs=[{stop(){window.speechStopped=true}}]');f.run('endCall()');
  assert.equal(f.sandbox.window.speechStopped,true);assert.equal(f.run('playSrcs.length'),0);
  assert.deepEqual(f.cues,['start','end']);assert.equal(f.run('playCtx'),null);
});
test('a stalled WebSocket reports timeout instead of waiting indefinitely',async()=>{
  const f=fixture(),dial=f.run('startCall()');await settle();
  const timer=[...f.timers.values()].find(timer=>timer.ms===12000);assert.ok(timer);timer.fn();await dial;
  assert.equal(f.run('callActive'),false);assert.equal(f.run('callConnecting'),false);
  assert.ok(f.toasts.some(message=>message.includes('เชื่อมต่อนานเกินไป')));
});
test('microphone denial consumes no Live token request and resets the next attempt',async()=>{
  const p=deferred(),f=fixture({permission:p}),dial=f.run('startCall()');
  p.reject(Object.assign(Error('Microphone denied'),{name:'NotAllowedError'}));await dial;
  assert.equal(f.requests.length,0);assert.equal(f.run('callConnecting'),false);
  assert.ok(!f.element('callUI').classList.contains('show'));
});
test('production registers the cue module and caches it with a valid service worker',()=>{
  const sw=readFileSync(new URL('../sw.js',import.meta.url),'utf8');
  assert.ok(page.includes('<script src="call-sounds.js?v=1" defer></script>'));
  assert.ok(sw.includes('./call-sounds.js?v=1'));assert.ok(!sw.includes('<<<<<<<'));
  new vm.Script(sw);assert.ok(!page.includes('setTimeout(prepChimes,1500)'));
});
test('interruption clears wait state but still processes the new user transcript in the same packet',()=>{
  const f=fixture();f.run('orb.wait=true;liveAiText="old answer";livePendingAt=123');
  f.run(`handleLiveMsg({serverContent:{interrupted:true,inputTranscription:{text:'ถามใหม่'}}})`);
  assert.equal(f.element('callCaption').textContent,'ถามใหม่');assert.equal(f.run('liveAiText'),'');
  assert.equal(f.run('playSrcs.length'),0);
});
test('idle silence alone never triggers reconnect; pending stalled responses do',async()=>{
  const f=fixture();f.run('callActive=true;liveModel="test";callHealth()');assert.equal(f.requests.length,0);
  f.run('livePendingAt=Date.now()-21000;liveGotAudio=true;callHealth();callHealth()');await settle();
  assert.equal(f.requests.length,1);f.run('endCall()');
});
test('camera permission resolved after hangup cannot turn the camera back on',async()=>{
  const p=deferred(),f=fixture({permission:p});f.run('callActive=true');const opening=f.run('toggleCamera()');
  f.run('endCall()');p.resolve(f.stream);await opening;
  assert.equal(f.track.stopped,1);assert.equal(f.run('camOn'),false);assert.equal(f.element('callCam').srcObject,null);
});
test('digital zoom clamps values, mirrors front camera, and resets controls on stop',()=>{
  const f=fixture();f.run('camFacing="user";setCallZoom(10)');
  assert.equal(f.run('camZoom'),4);assert.equal(f.element('callCam').style.transform,'scale(-4,4)');
  f.run('stopCamera()');assert.equal(f.run('camZoom'),1);assert.equal(f.element('callZoomBox').hidden,true);
});
test('voice UI uses full-frame camera, bottom controls and waveform instead of orb assets',()=>{
  const css=readFileSync(new URL('../call-ui.css',import.meta.url),'utf8');
  assert.match(css,/width:100%!important;height:100%!important;border-radius:0/);
  assert.match(css,/\.hh-ctrl\{[^}]*position:absolute;[^}]*bottom:/);assert.match(css,/\.hh-ctrl\{[^}]*display:flex/);assert.match(css,/\.think-box\{display:none!important\}/);
  assert.ok(!source.includes('im.src="call-orb.png"'));assert.match(source,/getFloatTimeDomainData/);
  assert.match(source,/\.drawImage\(vd,\(vd.videoWidth-sw\)\/2/);
});
test('muting signals end of input audio instead of leaving a pending turn open',()=>{
  const f=fixture();f.run('callWS=new WebSocket("fixture");callWS.readyState=1;toggleCallMute()');
  assert.equal(JSON.parse(f.sockets[0].sent).realtimeInput.audioStreamEnd,true);
});
test('a later text-only response remains eligible for recovery even after earlier audio',()=>{
  const f=fixture();f.run('liveGotAudio=true;orb.wait=false');
  f.run(`handleLiveMsg({serverContent:{inputTranscription:{text:'คำถามใหม่'}}});handleLiveMsg({serverContent:{turnComplete:true,outputTranscription:{text:'ไม่มีเสียง'}}})`);
  assert.ok(f.run('livePendingAt')>0);assert.equal(f.run('liveTurnAudio'),false);
});
test('Live function response uses toolResponse envelope, runs each ID once, never restarts the call',async()=>{
  const f=fixture();let count=0;f.sandbox.host.agent={execute:async()=>{count++;return{shops:[],note:'No matches'}}};
  f.run('callActive=true;callWS=new WebSocket("fixture");callWS.readyState=1;window.toolSent=[];callWS.send=v=>window.toolSent.push(JSON.parse(v))');
  f.run('handleLiveMsg({toolCall:{functionCalls:[{id:"one",name:"find_mechanics",args:{}}]}})');await settle();
  assert.equal(f.sandbox.window.toolSent[0].toolResponse.functionResponses[0].id,'one');assert.equal(count,1);
  f.run('handleLiveMsg({toolCall:{functionCalls:[{id:"one",name:"find_mechanics",args:{}}]}})');await settle();assert.equal(count,1);assert.equal(f.micRequests,0);
});
test('tool timeout and cancellation do not leave Live waiting forever or publish late results after hangup',async()=>{
  const f=fixture(),d=deferred();f.sandbox.host.agent={execute:()=>d.promise};
  f.run('callActive=true;callWS=new WebSocket("fixture");callWS.readyState=1;window.toolSent=[];callWS.send=v=>window.toolSent.push(JSON.parse(v))');
  f.run('handleLiveMsg({toolCall:{functionCalls:[{id:"one",name:"find_mechanics",args:{}}]}})');await settle();
  const timer=[...f.timers.values()].find(t=>t.ms===10000);assert.ok(timer);timer.fn();await settle();assert.match(f.sandbox.window.toolSent[0].toolResponse.functionResponses[0].response.error,/timed out/);
  f.run('handleLiveMsg({toolCall:{functionCalls:[{id:"two",name:"find_mechanics",args:{}}]}});endCall()');d.resolve({shops:[{name:'late'}]});await settle();assert.equal(f.sandbox.window.toolSent.length,1);
});
test('camera can be switched off during reconnect even while callActive is false',async()=>{
  const f=fixture();f.run('camOn=true;callActive=false');await f.run('toggleCamera()');assert.equal(f.run('camOn'),false);assert.equal(f.element('callCam').srcObject,null);
});
test('the real shared factory creates no mic/token until tapped and uses one transport for home and chat adapters',async()=>{
  const f=fixture(),notes=[];vm.runInContext(transport,f.sandbox);
  const shared=f.sandbox.window.CendonCallSession.create({byId:f.element,backendUrl:'https://unit-test.invalid',getUser:()=>f.sandbox.auth.currentUser,agent:{},getMessages:()=>notes,appendMessage:m=>notes.push(m)});
  assert.equal(f.micRequests,0);assert.equal(f.requests.length,0);const dial=shared.start();await settle();assert.equal(f.micRequests,1);assert.equal(JSON.parse(f.requests[0].body).agent,true);
  await f.sockets[0].setup();await dial;assert.equal(shared.active,true);shared.end();assert.equal(shared.active,false);assert.equal(f.track.stopped,1);
});
test('upstream engine tools and agent tools dispatch separately without a second transport',async()=>{
  const f=fixture();let expanded=0,agent=0,legacy=[],cancelled=[];
  f.sandbox.host.view={expand(){expanded++}};f.sandbox.host.getTools=()=>({onToolCall:v=>legacy.push(v),onCancel:ids=>cancelled.push(ids)});
  f.sandbox.host.agent={execute:async()=>{agent++;return{shops:[]}}};
  f.run('callActive=true;callWS=new WebSocket("fixture");callWS.readyState=1');
  f.run('handleLiveMsg({toolCall:{functionCalls:[{id:"scan",name:"scan_engine_bay"},{id:"find",name:"find_mechanics"}]}})');await settle();
  assert.equal(expanded,1);assert.equal(legacy[0].functionCalls.length,1);assert.equal(agent,1);assert.equal(f.micRequests,0);
  f.run('handleLiveMsg({toolCallCancellation:{ids:["scan"]}})');assert.equal(cancelled[0][0],'scan');
});
test('resumption handles are retained without discarding transcripts in the same packet',()=>{
  const f=fixture();f.run('handleLiveMsg({sessionResumptionUpdate:{newHandle:"unit_resume_123",resumable:true},serverContent:{inputTranscription:{text:"คำถามใหม่"}}})');
  assert.equal(f.run('liveHandle'),'unit_resume_123');assert.equal(f.run('liveUserText'),'คำถามใหม่');
});

function connectedChat(){
  const f=fixture();f.run('auth.currentUser.uid="call-owner";callOwner="call-owner";callActive=true;callWS=new WebSocket("fixture");callWS.readyState=1;window.chatPackets=[];callWS.send=v=>window.chatPackets.push(JSON.parse(v));');return f;
}
test('typed chat stays on the exact existing socket, keeps prior conversation and never requests another mic or token',async()=>{
  const f=connectedChat();f.run('messages.push({role:"user",text:"เสียงดังตรงล้อ"});handleLiveMsg({serverContent:{outputTranscription:{text:"จอดก่อนครับ"}}});');
  await f.run('sendChat({text:"ส่งรูปเพิ่มได้ไหม"})');
  assert.equal(f.sockets.length,1);assert.equal(f.micRequests,0);assert.equal(f.requests.length,0);
  assert.equal(f.sandbox.window.chatPackets[0].clientContent.turnComplete,true);assert.equal(f.run('messages[0].text'),'เสียงดังตรงล้อ');assert.equal(f.run('messages[1].text'),'จอดก่อนครับ');assert.equal(f.run('messages[2].text'),'ส่งรูปเพิ่มได้ไหม');
});
test('attachment analysis uses the authenticated pipeline then adds an untrusted summary to the same Live conversation, not raw file history',async()=>{
  const f=connectedChat(),calls=[];f.sandbox.fetch=async(url,init)=>{calls.push({url,init});return{ok:true,json:async()=>({data:{summary:'Only the cover is visible',limitations:['Hidden coil not identified']}})}};
  await f.run('sendChat({text:"ตรงไหนครับ",attachments:[{mime:"application/pdf",b64:"JVBERi0xLjc="}],names:[{name:"manual.pdf"}]})');
  assert.equal(calls[0].url,'https://unit-test.invalid/api/features/analyze');assert.equal(JSON.parse(calls[0].init.body).tool,'call_context');assert.match(calls[0].init.headers.Authorization,/Bearer /);
  const packet=f.sandbox.window.chatPackets[0];assert.match(packet.clientContent.turns[0].parts[0].text,/untrusted data/);assert.match(packet.clientContent.turns[0].parts[0].text,/Hidden coil/);
  assert.ok(!f.run('JSON.stringify(messages)').includes('JVBERi0xLjc='));assert.match(f.run('messages[0].referenceSummary'),/Only the cover/);assert.equal(f.sockets.length,1);assert.equal(f.micRequests,0);
});
test('hangup aborts attachment extraction and ignores a late result; account changes cannot send a previous owner reference',async()=>{
  const f=connectedChat(),p=deferred();let signal;f.sandbox.fetch=async(_u,o)=>{signal=o.signal;return p.promise};const sending=f.run('sendChat({attachments:[{mime:"image/jpeg",b64:"aGVsbG8="}]})');await settle();f.run('endCall()');assert.equal(signal.aborted,true);
  p.resolve({ok:true,json:async()=>({data:{summary:'LATE PRIVATE CONTENT',limitations:[]}})});await assert.rejects(sending);assert.equal(f.sandbox.window.chatPackets.length,0);assert.ok(!f.run('JSON.stringify(messages)').includes('PRIVATE'));
  const g=connectedChat();g.run('auth.currentUser.uid="other-owner"');await assert.rejects(g.run('sendChat({text:"wrong owner"})'));assert.equal(g.sandbox.window.chatPackets.length,0);
});
test('a stalled reference identity request times out without sending file bytes or opening a second call',async()=>{
  const f=connectedChat(),p=deferred();f.sandbox.auth.currentUser.getIdToken=()=>p.promise;const sending=f.run('sendChat({attachments:[{mime:"image/jpeg",b64:"aGVsbG8="}]})');await settle();const timer=[...f.timers.values()].find(x=>x.ms===20000);assert.ok(timer);timer.fn();await assert.rejects(sending,/cancelled/);assert.equal(f.requests.length,0);assert.equal(f.sockets.length,1);
});
test('unsafe files are rejected before network access and an interrupted speech turn is committed only once',async()=>{
  const f=connectedChat();await assert.rejects(f.run('sendChat({attachments:[{mime:"text/html",b64:"aGVsbG8="}]})'),/Invalid/);assert.equal(f.requests.length,0);
  f.run('handleLiveMsg({serverContent:{inputTranscription:{text:"คำถาม"},outputTranscription:{text:"คำตอบบางส่วน"}}});handleLiveMsg({serverContent:{interrupted:true}});handleLiveMsg({serverContent:{turnComplete:true}});');
  assert.equal(f.run('messages.length'),2);assert.equal(f.run('messages[1].interrupted'),true);f.run('endCall()');assert.equal(f.run('messages.length'),2);
});
