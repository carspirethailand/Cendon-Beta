import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const {RATE,CUES,renderCue,wavBytes,createPlayer}=require('../call-sounds.js');

function fixture({suspended=false,rejected=false,unsupported=false}={}){
  const contexts=[],sources=[],media=[],timers=new Map(),events=new Map();let clock=0,id=0;
  class Context{
    constructor(options){this.state=suspended?'suspended':'running';this.currentTime=4;this.destination={};this.options=options;this.buffers=0;contexts.push(this);}
    resume(){this.resumed=true;return rejected?Promise.reject(Error('Blocked')):Promise.resolve();}
    createBuffer(_channels,length,rate){this.buffers++;const data=new Float32Array(length);return {length,sampleRate:rate,getChannelData:()=>data};}
    createGain(){return {gain:{value:1,cancelScheduledValues(){},setValueAtTime(v){this.value=v;},linearRampToValueAtTime(v){this.value=v;}},connect(){},disconnect(){}};}
    createBufferSource(){const source={connect(){},disconnect(){},start(at){this.started=at;},stop(at){this.stopped=at??0;this.onended?.();}};sources.push(source);return source;}
    close(){this.state='closed';return Promise.resolve();}
  }
  class Media{constructor(url){this.url=url;this.played=0;media.push(this);}play(){this.played++;return Promise.resolve();}pause(){this.paused=true;}}
  const host={AudioContext:unsupported?undefined:Context,Audio:Media,Blob,
    URL:{createObjectURL:()=>`blob:test-${id++}`,revokeObjectURL(){}},performance:{now:()=>clock},
    setTimeout(fn,ms){const key=++id;timers.set(key,{fn,ms});return key;},clearTimeout(key){timers.delete(key);},
    addEventListener(name,fn){events.set(name,fn);}};
  return {player:createPlayer(host),contexts,sources,media,timers,events,setClock:value=>{clock=value;},runTimers(){for(const {fn} of [...timers.values()])fn();}};
}
for(const kind of ['start','end'])test(`${kind} cue is short, quiet and click-free`,()=>{
  const pcm=renderCue(kind);let peak=0,energy=0,step=0;
  for(let i=0;i<pcm.length;i++){assert.ok(Number.isFinite(pcm[i]));peak=Math.max(peak,Math.abs(pcm[i]));energy+=pcm[i]**2;if(i)step=Math.max(step,Math.abs(pcm[i]-pcm[i-1]));}
  assert.equal(pcm.length,Math.ceil(RATE*CUES[kind].duration));
  assert.ok(peak<.1,`peak ${peak}`);assert.ok(Math.sqrt(energy/pcm.length)<.035);
  // Allow the normal derivative of two overlapping sine waves; reject discontinuities.
  assert.equal(pcm[0],0);assert.equal(pcm.at(-1),0);assert.ok(step<.005,`step ${step}`);
  assert.ok(CUES[kind].notes.every(note=>note[1]>=240&&note[1]<=440));
});
test('WAV fallback encodes the exact same mono PCM as Web Audio',()=>{
  const pcm=renderCue('start'),wav=wavBytes(pcm),view=new DataView(wav.buffer);
  assert.equal(new TextDecoder().decode(wav.slice(0,4)),'RIFF');
  assert.equal(new TextDecoder().decode(wav.slice(8,12)),'WAVE');
  assert.equal(view.getUint32(24,true),RATE);assert.equal(view.getUint16(22,true),1);
  assert.equal(view.getUint32(40,true),pcm.length*2);
  for(let i=0;i<pcm.length;i+=200)assert.ok(Math.abs(view.getInt16(44+i*2,true)/32768-pcm[i])<.00004);
});
test('first tap starts immediately without preparation timers or downloads',()=>{
  const f=fixture();assert.equal(f.player.play('start'),true);
  assert.equal(f.sources.length,1);assert.equal(f.sources[0].started,4.008);
  assert.ok([...f.timers.values()].every(timer=>timer.ms===220));assert.equal(f.media.length,0);
});
test('call and hangup reuse one independent context and cached buffers',()=>{
  const f=fixture();f.player.play('start');f.player.play('end');f.player.play('start');
  assert.equal(f.contexts.length,1);assert.equal(f.contexts[0].buffers,2);
  assert.equal(f.contexts[0].options.latencyHint,'interactive');
  assert.ok(f.sources[0].stopped>0);assert.ok(f.sources[1].stopped>0);
});
test('suppressed audio is discarded instead of playing a delayed surprise',()=>{
  const f=fixture({suspended:true});f.player.play('start');f.runTimers();
  assert.equal(f.contexts[0].resumed,true);assert.equal(f.sources[0].stopped,0);
});
test('late rejected resume cannot resurrect an obsolete start cue',async()=>{
  const f=fixture({suspended:true,rejected:true});f.player.play('start');f.player.play('end');
  await Promise.resolve();await Promise.resolve();
  assert.equal(f.media.length,1);assert.equal(f.media[0].played,1);
});
test('fallback stays quiet, finite, reusable and does not block the caller',()=>{
  const f=fixture({unsupported:true});assert.equal(f.player.play('start'),true);
  assert.equal(f.media[0].volume,.75);f.player.play('end');assert.equal(f.media[0].paused,true);
  f.player.play('start');assert.equal(f.media.length,2);assert.equal(f.media[0].played,2);
});
test('dispose stops cues and closes only the player-owned context',()=>{
  const f=fixture();f.player.play('end');f.player.dispose();
  assert.equal(f.contexts[0].state,'closed');assert.ok(f.sources[0].stopped>=0);
  assert.equal(f.timers.size,0);
});
