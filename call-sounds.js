/* Cendon call cues: warm, quiet, finite. No network, devices or call-state ownership.
   PCM is prepared synchronously so even the first tap needs no render/download wait. */
(function(scope){
  "use strict";
  const RATE=44100;
  const CUES={
    start:{duration:.36,notes:[[0,293.665,.285,.066],[.065,440,.275,.047]]},
    end:{duration:.26,notes:[[0,293.665,.24,.052],[.05,246.942,.19,.022]]}
  };
  function renderCue(kind){
    const cue=CUES[kind];if(!cue)throw new Error("Unknown call cue");
    const pcm=new Float32Array(Math.ceil(RATE*cue.duration));
    for(const [offset,hz,duration,volume] of cue.notes){
      const first=Math.round(offset*RATE),count=Math.floor(duration*RATE);
      for(let index=0;index<count&&first+index<pcm.length;index++){
        const t=index/RATE;
        const attack=Math.min(1,t/.022),release=Math.min(1,(duration-t)/.065);
        const envelope=(.5-.5*Math.cos(Math.PI*attack))*(.5-.5*Math.cos(Math.PI*release))*Math.exp(-t/.16);
        // Almost pure, felt-like sine. A very quiet octave adds warmth, not a glass ping.
        pcm[first+index]+=volume*envelope*(Math.sin(2*Math.PI*hz*t)+.055*Math.sin(4*Math.PI*hz*t));
      }
    }
    return pcm;
  }
  function wavBytes(pcm){
    const bytes=new Uint8Array(44+pcm.length*2),view=new DataView(bytes.buffer);
    const text=(at,value)=>{for(let i=0;i<value.length;i++)view.setUint8(at+i,value.charCodeAt(i));};
    text(0,"RIFF");view.setUint32(4,36+pcm.length*2,true);text(8,"WAVE");text(12,"fmt ");
    view.setUint32(16,16,true);view.setUint16(20,1,true);view.setUint16(22,1,true);
    view.setUint32(24,RATE,true);view.setUint32(28,RATE*2,true);view.setUint16(32,2,true);view.setUint16(34,16,true);
    text(36,"data");view.setUint32(40,pcm.length*2,true);
    for(let i=0;i<pcm.length;i++){const sample=Math.max(-1,Math.min(1,pcm[i]));view.setInt16(44+i*2,Math.round(sample*(sample<0?32768:32767)),true);}
    return bytes;
  }
  function createPlayer(host){
    const pcm={start:renderCue("start"),end:renderCue("end")};
    let context=null,generation=0,media=null;
    const buffers=new Map(),voices=new Set(),fallbacks=new Map();
    const now=()=>host.performance?.now?.()??Date.now();
    function safeResume(){try{const result=context.resume();if(result?.catch)result.catch(()=>{});return result;}catch{return null;}}
    function release(voice){
      host.clearTimeout(voice.watchdog);voices.delete(voice);
      try{voice.source.disconnect();voice.gain.disconnect();}catch{}
    }
    function cancel(){
      generation++;
      if(media){try{media.pause();media.currentTime=0;}catch{}media=null;}
      for(const voice of [...voices]){
        host.clearTimeout(voice.watchdog);
        try{
          const at=context.currentTime;
          voice.gain.gain.cancelScheduledValues(at);
          voice.gain.gain.setValueAtTime(voice.gain.gain.value,at);
          voice.gain.gain.linearRampToValueAtTime(0,at+.012);
          voice.source.stop(context.state==="running"?at+.013:at);
          if(context.state!=="running")release(voice);
        }catch{release(voice);}
      }
    }
    function fallback(kind,request,started){
      if(request!==generation||now()-started>160||typeof host.Audio!=="function")return false;
      try{
        let entry=fallbacks.get(kind);
        if(!entry){const url=host.URL.createObjectURL(new host.Blob([wavBytes(pcm[kind])],{type:"audio/wav"}));
          entry={audio:new host.Audio(url),url};entry.audio.preload="auto";fallbacks.set(kind,entry);}
        media=entry.audio;media.currentTime=0;media.volume=.75;
        const result=media.play();if(result?.catch)result.catch(()=>{});
        return true;
      }catch{return false;}
    }
    function play(kind){
      if(!CUES[kind])return false;
      cancel();const request=generation,started=now();
      try{
        const AC=host.AudioContext||host.webkitAudioContext;
        if(!AC)return fallback(kind,request,started);
        if(!context||context.state==="closed"){
          context=new AC({latencyHint:"interactive"});buffers.clear();
        }
        // resume() is invoked inside the tap, before any network/permission await.
        const resumed=context.state!=="running"?safeResume():null;
        let buffer=buffers.get(kind);
        if(!buffer){buffer=context.createBuffer(1,pcm[kind].length,RATE);buffer.getChannelData(0).set(pcm[kind]);buffers.set(kind,buffer);}
        const source=context.createBufferSource(),gain=context.createGain();
        source.buffer=buffer;gain.gain.value=.75;source.connect(gain);gain.connect(context.destination);
        const voice={source,gain,watchdog:0};voices.add(voice);source.onended=()=>release(voice);
        try{source.start(context.currentTime+.008)}catch(error){release(voice);throw error;}
        // Suppressed mobile audio must not turn into a surprise delayed chime.
        voice.watchdog=host.setTimeout(()=>{
          if(context?.state!=="running"&&voices.has(voice)){try{source.stop();}catch{}release(voice);}
        },220);
        if(resumed?.catch)resumed.catch(()=>{
          try{source.stop();}catch{}release(voice);fallback(kind,request,started);
        });
        return true;
      }catch{return fallback(kind,request,started);}
    }
    function dispose(){
      cancel();for(const voice of [...voices])release(voice);
      try{const closing=context?.close();closing?.catch?.(()=>{});}catch{}
      context=null;buffers.clear();
      for(const entry of fallbacks.values())try{host.URL.revokeObjectURL(entry.url);}catch{}
      fallbacks.clear();
    }
    host.addEventListener?.("pagehide",event=>{if(event.persisted)cancel();else dispose();});
    return {play,cancel,dispose};
  }
  if(typeof module!=="undefined"&&module.exports)module.exports={RATE,CUES,renderCue,wavBytes,createPlayer};
  else scope.CendonCallSounds=createPlayer(scope);
})(typeof window!=="undefined"?window:globalThis);
