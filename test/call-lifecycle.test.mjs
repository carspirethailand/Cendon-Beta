import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const page=readFileSync(new URL('../chat.html',import.meta.url),'utf8');
const begin=page.indexOf('/* ===== LIVE CALL — Gemini Live API (ephemeral token)');
const end=page.indexOf('/* ===== INIT ===== */',begin);
const source=page.slice(begin,end);
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
  const sandbox={window,navigator,auth,useFb:true,lang:'th',BACKEND_URL:'https://unit-test.invalid',
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
  assert.match(css,/\.hh-ctrl\{position:absolute;bottom:/);assert.match(css,/\.think-box\{display:none!important\}/);
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
