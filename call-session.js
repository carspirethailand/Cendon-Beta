/* Shared Live transport, extracted from chat.html; one session survives UI mode changes. */
(function(global){
"use strict";
function create(host){
  const $=host.byId;
  const BACKEND_URL=host.backendUrl,lang=host.language||"th",useFb=true;
  const auth={get currentUser(){return host.getUser()}};
  const LS=host.storage||{get:(_key,fallback)=>fallback,set(){},del(){}};
  const toast=(text,icon)=>host.toast?.(text,icon),tr=()=>lang==="en"?"Please sign in to call":"เข้าสู่ระบบก่อนโทรครับ";
  const sysPrompt=()=>host.systemPrompt?.()||"";
  const messages={filter:fn=>(host.getMessages?.()||[]).filter(fn),push:m=>host.appendMessage?.(m)};
  const saveSession=()=>host.save?.(),renderMessages=()=>host.onEnd?.(),updateHint=()=>{},renderChips=()=>{},setPhase=()=>{};
/* ===== LIVE CALL — Gemini Live API (ephemeral token) · หน้าจอ "Hearth"
 * สร้างและปลุก audio contexts ในจังหวะกดปุ่ม · เสียงปุ่มแยกจากเสียงสนทนา
 * ไมค์: AudioWorklet ย่อเหลือ 16kHz เอง ไม่พึ่ง sampleRate ที่บางเครื่องไม่ยอมทำตาม
 * คลื่นขอบจอตามเสียง AI จริง · แสดงสถานะไมค์และการเชื่อมต่อ */
const getTools=()=>host.getTools?.()||null;
let callActive=false,callMuted=false,callTimerInt=null,callT0=0;
let callConnecting=false,callSession=0,callAbort=null;
let callOwner=null,toolPending=0;
const toolRequests=new Map(),toolResults=new Map(),cancelledTools=new Set();
let callWS=null,callMicStream=null,callCtx=null,callMicSrc=null,callMicNode=null,callSink=null;
let playCtx=null,playGain=null,playAnalyser=null,playTime=0,playSrcs=[];
let camStream=null,camTimer=null,camOn=false,camFacing="environment";
let liveUserText="",liveAiText="",micLevel=0,aiLevel=0,heardAt=0,callRaf=0;
let livePendingAt=0,liveGeneratingAt=0,liveTurnAudio=false,liveRecovering=false,camZoom=1,camOpening=false;
let waveSamples=null;
let callFrameAt=0;
let liveGarageCare=false;
async function garageCareRequest(body,signal){
  const user=auth.currentUser,owner=callOwner,session=callSession;
  if(!user||user.uid!==owner)throw Error('Call owner changed');
  const token=await user.getIdToken();
  if(signal.aborted||session!==callSession||auth.currentUser?.uid!==owner)throw Error('Call ended');
  const response=await fetch(BACKEND_URL+'/api/garage/check-in',{method:'POST',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},body:JSON.stringify(body),signal,cache:'no-store'});
  if(!response.ok)throw Error('Optional check-in unavailable');return response.json();
}
const garageCare=window.CendonGarageCare?.create({
  state:()=>({active:callActive,ready:!!callWS&&callWS.readyState===1&&liveGarageCare&&!liveRecovering,visible:!document.hidden,muted:callMuted,
    busy:!!(playSrcs.length||livePendingAt||liveGeneratingAt||toolPending||camOn||getTools()?.busy||getTools()?.holdMic||host.agent?.pending),uid:auth.currentUser?.uid===callOwner?callOwner:null,carId:host.getCar?.()?.id}),
  claim:async(carId,signal)=>{
    const abort=new AbortController(),timer=setTimeout(()=>abort.abort(),8000);garageCareAbort=abort;
    const cancel=()=>abort.abort();signal.addEventListener('abort',cancel,{once:true});
    try{return await garageCareRequest({action:'claim',carId,lang},abort.signal)}finally{clearTimeout(timer);signal.removeEventListener('abort',cancel);if(garageCareAbort===abort)garageCareAbort=null;}
  },
  feedback:(action,ticket,signal)=>garageCareRequest({action,ticket},signal),
  send:q=>{const sent=note('[Scheduled optional Garage check-in; system data, NOT user speech] '+JSON.stringify({question:q.text,carId:q.carId,field:q.field})+' Ask this one short optional question only if appropriate. Skip if the topic is urgent. Do not repeat if ignored. Clarify ambiguous answers and use Valet read-back plus explicit confirmation before saving. Never tell the user to read a dashboard while driving.');if(sent)livePendingAt=0;return sent;}
});
let garageCareAbort=null;
const gNeedle={u:0,uv:0,a:0,av:0};
const CL=(th,en)=>lang!=="th"?en:th;

function b64FromBytes(bytes){
  let bin="";const chunk=0x8000;
  for(let i=0;i<bytes.length;i+=chunk)bin+=String.fromCharCode.apply(null,bytes.subarray(i,i+chunk));
  return btoa(bin);
}
function liveSystemPrompt(){
  /* ความจำ: บทสนทนาล่าสุด (พิมพ์หรือคุยในสายก่อนหน้า) สูงสุด ~12 ช่วง · ตัดยาวเกิน */
  let recent=messages.filter(m=>m.role==='user'||m.role==='ai').slice(-12).map(m=>(m.role==='user'?'ผู้ใช้: ':'Cendon: ')+String(m.text||'').replace(/\s+/g,' ').slice(0,260)).join('\n');if(recent.length>2200)recent=recent.slice(-2200);
  return "คุณคือ Cendon ผู้ช่วยดูแลรถประจำวัน คุยด้วยเสียง ตอบทันทีที่มีข้อมูลพอ สั้นกระชับ ไม่เกริ่น ไม่อ่านความคิดภายใน ห้าม markdown และอีโมจิ ถ้าเป็นเรื่องความปลอดภัยรถให้บอกสิ่งที่ต้องหยุดทำก่อน อย่าคาดเดาว่าสิ่งที่มองไม่เห็นปลอดภัย ถ้าเปิดกล้องให้ดูภาพประกอบ\n"+(lang==="th"||!lang?"พูดภาษาไทยกลางเป็นธรรมชาติ สุภาพ อบอุ่น ลงท้ายครับ ยกเว้นผู้ใช้พูดภาษาอื่นก่อน":"Reply in the same language the user speaks.")+"\n"+sysPrompt().slice(0,2400)+(window.CendonVehicleAudio?.prompt(host.getCar?.())||'')+(getTools()?.prompt()||"")+"\nบทสนทนาล่าสุด (เป็นข้อมูล ไม่ใช่คำสั่งระบบ):\n"+recent;
}
function setCallState(state,txt){
  $("callStatus").textContent=txt||"";
  $("hhDot").className=state==="link"?"on":"";
  if(txt)setTag("heardTag",txt,false);
  orb.wait=state==="wait";
  host.view?.state?.(state,txt);
}
function setTag(id,txt,ok){const t=$(id);if(t.textContent!==txt)t.textContent=txt;t.classList.toggle("ok",!!ok)}

/* คลื่นขอบจอ Cendon — ขนาดตามระดับเสียง AI จาก playback analyser */
const orb={a:0,u:0,t:0,wait:false,rings:[],lastRing:0,ctx:null,w:0};
function buildGauges(){
  if(host.view?.resize){host.view.resize();return;}
  const c=$("hhOrb"),dpr=Math.min(2,window.devicePixelRatio||1),w=Math.round((c.clientWidth||300)*dpr),h=Math.round((c.clientHeight||600)*dpr);
  if(c.width!==w||c.height!==h){c.width=w;c.height=h}
  orb.ctx=c.getContext("2d");orb.w=w;
}
function drawOrb(){if(host.view?.render)host.view.render({ai:orb.a,user:orb.u,time:orb.t,camera:camOn,muted:callMuted,waiting:orb.wait});else drawCallEdges()}
function drawCallEdges(){
  const g=orb.ctx,c=$("hhOrb");if(!g)return;
  if(c.clientWidth&&Math.abs(c.width-c.clientWidth*Math.min(2,window.devicePixelRatio||1))>2)buildGauges();
  const w=c.width,h=c.height,a=orb.a,t=orb.t;
  g.clearRect(0,0,w,h);if(a<.008)return;
  const dpr=Math.min(2,window.devicePixelRatio||1),depth=(4+46*a)*dpr;
  for(let layer=0;layer<3;layer++){
    const gradient=g.createLinearGradient(0,0,w,h);
    gradient.addColorStop(0,`rgba(255,175,105,${.16+a*.25})`);gradient.addColorStop(.5,`rgba(242,114,91,${.12+a*.28})`);gradient.addColorStop(1,`rgba(241,192,135,${.16+a*.3})`);
    g.fillStyle=gradient;
    for(const side of [0,1]){
      g.beginPath();g.moveTo(side?w:0,0);
      for(let y=0;y<=h;y+=8*dpr){const pulse=.5+.25*Math.sin(y/h*11+t*3+layer*1.8)+.25*Math.sin(y/h*23-t*2+layer);const inset=depth*(1-layer*.22)*pulse;g.lineTo(side?w-inset:inset,y);}
      g.lineTo(side?w:0,h);g.closePath();g.fill();
    }
    g.beginPath();g.moveTo(0,h);
    for(let x=0;x<=w;x+=8*dpr)g.lineTo(x,h-depth*(1-layer*.22)*(.6+.25*Math.sin(x/w*9+t*3+layer)));
    g.lineTo(w,h);g.closePath();g.fill();
  }
}
function callHealth(){
  if(!callActive||liveRecovering)return;
  if(callOwner&&auth.currentUser?.uid!==callOwner){endCall();return;}
  for(const c of [callCtx,playCtx])if(c&&c.state!=='running'&&c.state!=='closed')c.resume().catch(()=>setTag('heardTag',CL('แตะหน้าจอเพื่อเปิดเสียงอีกครั้ง','Tap the screen to restore audio')));
  const pending=toolPending?0:liveGeneratingAt||livePendingAt;
  if(pending&&Date.now()-pending>12000&&playSrcs.length===0&&!getTools()?.busy){livePendingAt=liveGeneratingAt=0;liveNudge=true;liveRecover(0,'response stalled',true).catch(()=>{});}
  void garageCare?.tick();
}
function gaugeLoop(){
  const frameNow=performance.now(),dt=Math.min(.05,Math.max(.008,callFrameAt?(frameNow-callFrameAt)/1000:1/60));callFrameAt=frameNow;
  orb.light=$("callUI").classList.contains("light");
  if(!$("callUI").classList.contains("show")){callRaf=0;return}
  if(playAnalyser){
    const buf=waveSamples||(waveSamples=new Float32Array(playAnalyser.fftSize));playAnalyser.getFloatTimeDomainData(buf);
    let s=0;for(let i=0;i<buf.length;i++)s+=buf[i]*buf[i];
    aiLevel=Math.min(1,Math.sqrt(s/buf.length)*5);
  }
  const mu=callMuted?0:Math.min(1,micLevel*6);micLevel*=Math.pow(.86,dt*60);
  orb.a+=(Math.min(1,aiLevel*1.4)-orb.a)*(1-Math.pow(1-(aiLevel>orb.a?.35:.14),dt*60));
  orb.u+=(mu-orb.u)*(1-Math.pow(1-(mu>orb.u?.4:.1),dt*60));
  orb.t+=(1+orb.a*1.1)*dt;
  if(!host.view?.render)$("callUI").style.setProperty("--glow",(.14+orb.a*.22).toFixed(3));
  drawOrb();
  if(callActive){
    if(playCtx&&playCtx.state==='suspended'&&playSrcs.length)setTag("heardTag",CL("แตะหน้าจอเพื่อเปิดเสียงอีกครั้ง","Tap the screen to restore audio"));
    else if(callMuted)setTag("heardTag",CL("ปิดไมค์อยู่ — แตะไมค์เพื่อคุยต่อ","Muted — tap mic to talk"));
    else if(orb.a>.05)setTag("heardTag","");
    else if(Date.now()-heardAt<1800)setTag("heardTag",CL("ได้ยินแล้วครับ ✓","Got it ✓"),true);
    else if(orb.u>.08)setTag("heardTag",CL("กำลังฟังคุณอยู่…","Listening to you…"));
    else setTag("heardTag",CL("เล่าอาการรถให้ฟังได้เลยครับ","Tell me what's up with your car"));
  }
  callRaf=requestAnimationFrame(gaugeLoop);
}

/* โมดูล worklet: ย่อเสียงจากอัตราจริงของเครื่อง → 16kHz Int16 ส่งออกทีละ ~40ms พร้อมระดับเสียง */
const MIC_WORKLET=`class P extends AudioWorkletProcessor{constructor(){super();this.r=sampleRate/16000;this.p=0;this.b=new Int16Array(640);this.n=0;this.e=0}
process(i){const c=i[0]&&i[0][0];if(!c)return true;let e=0;for(let k=0;k<c.length;k++)e+=c[k]*c[k];this.e=Math.max(this.e,Math.sqrt(e/c.length));
for(;this.p<c.length;this.p+=this.r){const s=Math.max(-1,Math.min(1,c[this.p|0]));this.b[this.n++]=s<0?s*32768:s*32767;
if(this.n===640){this.port.postMessage({pcm:this.b.slice(0).buffer,lv:this.e},[]);this.n=0;this.e=0}}this.p-=c.length;return true}}
registerProcessor("cendon-mic",P);`;
/* กันเสียง AI สะท้อนเข้าไมค์ (ลำโพงมือถือ): ระหว่าง AI พูด ส่งเฉพาะเสียงที่ดังกว่าเสียงสะท้อนชัด ๆ (คนพูดแทรกจริง)
   ที่เบากว่าส่งเป็นความเงียบแทน — ไม่งั้น AI ได้ยินเสียงตัวเองแล้วหยุดพูดกลางคันเอง (ต้นเหตุ "อยู่ ๆ AI เงียบ")
   เกณฑ์ขั้นต่ำ 0.06 (เดิม 0.045) เพราะเสียง AI ดังขึ้นแล้ว (loudChain) เสียงสะท้อนที่หลุดตัวกรองของเครื่องก็ดังตาม */
let echoLv=0;
function sendPcm(buf,lv){
  /* ระหว่างฟังเสียงเครื่อง (call-tools.js) ไม่ส่งไมค์ปกติเข้าสาย — เสียงเครื่องยนต์จะไปปลุกให้ AI พูดแทรก */
  if(!callActive||callMuted||!callWS||callWS.readyState!==1||getTools()?.holdMic)return;
  if(lv!=null&&(playSrcs.length>0||aiLevel>0.02)){
    const th=Math.max(0.06,echoLv*2.4);
    if(lv<th){echoLv=echoLv*0.92+lv*0.08;buf=new ArrayBuffer(buf.byteLength)}
  }else if(lv!=null)echoLv*=0.98;
  if(lv>.025)garageCare?.activity();
  try{callWS.send(JSON.stringify({realtimeInput:{audio:{data:b64FromBytes(new Uint8Array(buf)),mimeType:"audio/pcm;rate=16000"}}}))}catch(e){}
}
async function startMicStream(session=callSession){
  const ctx=callCtx,stream=callMicStream;
  if(!ctx||!stream||session!==callSession)return;
  const source=ctx.createMediaStreamSource(stream),sink=ctx.createGain();
  let node;
  sink.gain.value=0;sink.connect(ctx.destination); // keep processing without microphone echo
  const stale=()=>session!==callSession||ctx!==callCtx;
  const discard=()=>{try{source.disconnect();sink.disconnect();node&&node.disconnect();}catch{}};
  try{
    const url=URL.createObjectURL(new Blob([MIC_WORKLET],{type:"application/javascript"}));
    try{await ctx.audioWorklet.addModule(url)}finally{URL.revokeObjectURL(url)}
    if(stale()){discard();return;}
    node=new AudioWorkletNode(ctx,"cendon-mic");
    node.port.onmessage=e=>{if(stale())return;micLevel=Math.max(micLevel,e.data.lv);sendPcm(e.data.pcm,e.data.lv)};
  }catch(err){
    if(stale()){discard();return;}
    /* เครื่องเก่าไม่มี worklet → ScriptProcessor แต่ย่อเสียงแบบเดียวกัน */
    const r=ctx.sampleRate/16000;let p=0;
    node=ctx.createScriptProcessor(2048,1,1);
    node.onaudioprocess=e=>{
      if(stale())return;
      const c=e.inputBuffer.getChannelData(0);let en=0;for(let k=0;k<c.length;k++)en+=c[k]*c[k];
      micLevel=Math.max(micLevel,Math.sqrt(en/c.length));
      const out=new Int16Array(Math.ceil((c.length-p)/r));let n=0;
      for(;p<c.length;p+=r){const s=Math.max(-1,Math.min(1,c[p|0]));out[n++]=s<0?s*32768:s*32767}
      p-=c.length;sendPcm(out.slice(0,n).buffer,Math.sqrt(en/c.length));
    };
  }
  if(stale()){discard();return;}
  callMicSrc=source;callSink=sink;callMicNode=node;
  source.connect(node);node.connect(sink);
}

async function startCall(){
  try{const P=global.parent;if(P&&P!==global&&P.CendonCallShell&&P.CendonCallShell.active()){P.CendonCallShell.expand();return}}catch(e){}
  try{if(global.CendonCallShell&&global.CendonCallShell.active()&&!(callActive||callConnecting)){global.CendonCallShell.expand();return}}catch(e){}
  if(!(useFb&&auth&&auth.currentUser)){toast(tr("login.title"),"ti-lock");return}
  const AC=window.AudioContext||window.webkitAudioContext;
  if(!(navigator.mediaDevices&&AC&&window.WebSocket)){toast(CL("เบราว์เซอร์นี้ไม่รองรับโหมดโทร","Browser not supported"),"ti-phone-off");return}
  if(callActive||callWS||callConnecting)return;
  const session=++callSession;
  garageCare?.reset();liveGarageCare=false;
  callOwner=auth.currentUser.uid||null;toolResults.clear();cancelledTools.clear();host.agent?.clear?.();
  callFrameAt=0;
  callConnecting=true;callAbort=new AbortController();
  /* iPhone: เลือกเส้นทางเสียงก่อนเล่นเสียงปุ่มและเปิดไมค์ */
  try{if(navigator.audioSession)navigator.audioSession.type="play-and-record"}catch(e){}
  /* สร้าง+ปลุก AudioContext ทันทีในจังหวะที่กด (ก่อน await ใดๆ) — ต้นเหตุ "เดี๋ยวได้ยินเดี๋ยวไม่ได้ยิน" บนมือถือ */
  callChime(null,true);
  try{callCtx=new AC();callCtx.resume().catch(()=>{})}catch(e){endCall();toast(e.message,"ti-phone-off");return}
  /* เสียง AI แยก context 24kHz ของตัวเอง (แบบเดิมที่เคยได้ยินชัวร์) สร้างในจังหวะกดเหมือนกัน
   * ไม่รอเสียงปุ่มจบก่อนเริ่มต่อสาย */
  try{try{playCtx=new AC({sampleRate:24000})}catch(e){playCtx=new AC()}}
  catch(e){endCall();toast(e.message,"ti-phone-off");return;}
  playCtx.resume().catch(()=>{});
  playGain=playCtx.createGain();playAnalyser=playCtx.createAnalyser();playAnalyser.fftSize=512;
  playGain.connect(playAnalyser);loudChain(playCtx,playAnalyser).connect(playCtx.destination);
  playTime=0;
  /* ธีมของหน้า: แชตมี spireTheme() · หน้าอื่นอ่านจาก <html data-theme> */
  $("callUI").classList.toggle("light",((window.spireTheme&&window.spireTheme())||document.documentElement.getAttribute("data-theme")||"dark")==="light");
  $("callUI").classList.add("show");$("callUI").setAttribute("aria-hidden","false");
  host.view?.open?.();
  try{global.CendonCallShell?.started(api)}catch(e){}
  buildGauges();
  $("callCaption").textContent="";
  setCallState("wait",CL("กำลังต่อสายหา Cendon...","Calling Cendon..."));
  callT0=Date.now();clearInterval(callTimerInt);$("callTimer").textContent="00:00";
  callTimerInt=setInterval(()=>{const s=Math.floor((Date.now()-callT0)/1000);
    $("callTimer").textContent=String(Math.floor(s/60)).padStart(2,"0")+":"+String(s%60).padStart(2,"0");callHealth()},1000);
  if(!callRaf)callRaf=requestAnimationFrame(gaugeLoop);
  try{
    // Prepare auth while asking for the mic. No fixed pause for the UI cue,
    // and no metered Live token request until microphone access succeeds.
    const identity=auth.currentUser.getIdToken();identity.catch(()=>{});
    const stream=await navigator.mediaDevices.getUserMedia({audio:{channelCount:1,echoCancellation:true,noiseSuppression:true,autoGainControl:true}});
    if(session!==callSession){stream.getTracks().forEach(t=>t.stop());return;}
    callMicStream=stream;
    liveRetries=0;liveHandle="";liveNudge=false;echoLv=0;
    await liveConnect(session,identity);
  }catch(e){
    if(session!==callSession)return;
    endCall();
    toast(CL("โทรไม่สำเร็จ: ","Call failed: ")+e.message,"ti-phone-off");
  }
}

/* รุ่นที่ทำสายหลุดโดยยังไม่ทันพูด จำไว้ 6 ชม. แล้วขอรุ่นอื่นแทน */
let liveRetries=0,liveModel="",liveGotAudio=false,liveTools=false;
/* liveHandle = รหัสต่อสายต่อจาก Google (จำบทสนทนาเดิมเมื่อต่อใหม่) · liveNudge = ต่อใหม่เพราะ AI ค้าง ให้ตอบคำถามล่าสุดต่อ */
let liveHandle="",liveNudge=false,liveSoft=[];
function liveBad(){const now=Date.now(),b=LS.get("live_bad",{});for(const k in b)if(now-b[k]>6*3600e3)delete b[k];return b}
async function liveConnect(session=callSession,identity){
  const tok=await (identity||auth.currentUser.getIdToken());
  if(session!==callSession)return;
  const requestAbort=callAbort;
  const requestTimer=setTimeout(()=>requestAbort&&requestAbort.abort(),15000);
  let r,d;
  try{
    r=await fetch(`${BACKEND_URL}/api/ai/live-token`,{method:"POST",
      headers:{"Content-Type":"application/json","Authorization":"Bearer "+tok},
      signal:requestAbort&&requestAbort.signal,
      body:JSON.stringify({system:liveSystemPrompt(),skip:Object.keys(liveBad()),handle:liveHandle||undefined,webResearch:true,garageCare:!!garageCare,garageAssist:!!window.CendonGarageData,agent:!!host.agent&&!(Date.now()-LS.get("live_notools",0)<86400e3),tools:!!getTools()&&!(Date.now()-LS.get("live_notools",0)<86400e3)})});
    d=await r.json().catch(()=>({}));
  }catch(e){
    if(session!==callSession)return;
    if(e.name==="AbortError")throw new Error(CL("เชื่อมต่อนานเกินไป ลองโทรใหม่อีกครั้งครับ","Connection timed out. Please try again"));
    throw e;
  }finally{clearTimeout(requestTimer)}
  if(session!==callSession)return;
  if(!r.ok){
    const err=(d&&d.error)||"";
    if(r.status===429||err==="quota")throw new Error(CL("โควตา AI วันนี้หมดแล้ว","Daily AI quota reached"));
    if(r.status===503||err==="maintenance")throw new Error(CL("ระบบกำลังปิดปรับปรุง","System under maintenance"));
    if(/no working live model/.test(err)){LS.del("live_bad")}
    throw new Error(err||("token error "+r.status));
  }
  liveModel=d.model||"";liveGotAudio=false;liveTools=!!(d.tools||d.agent);liveGarageCare=d.garageCare===true&&d.agent===true;garageCare?.activity();
  host.view?.agentAvailable?.(d.agent===true);
  await openLiveWS(d.token,d.model,session);
}
/* สายหลุดผิดปกติ → ต่อใหม่เองเงียบๆ (ถ้ายังไม่ได้ยินเสียง AI เลย = รุ่นนี้มีปัญหา เปลี่ยนรุ่น) */
async function liveRecover(code,why,soft){
  if(liveRecovering)return;
  liveRecovering=true;
  const session=callSession;
  /* soft = Google หมุนสาย/AI ค้าง ไม่ใช่รุ่นเสีย — ห้ามโทษรุ่นหรือปิดเครื่องมือ (เดิมเงียบนาน ๆ แล้วถูกนับว่ารุ่นเสีย)
     ต่อใหม่แบบนี้ถี่เกิน 3 ครั้งใน 90 วิ = มีปัญหาจริง → ใช้ทางเดิม (นับครั้ง ลองรุ่นอื่น) กันวนต่อสายไม่จบ */
  if(soft){liveSoft=liveSoft.filter(t=>Date.now()-t<90000);liveSoft.push(Date.now());if(liveSoft.length>3)soft=false}
  if(soft){const old=callWS;callWS=null;try{old&&old.close()}catch{}callActive=false;flushPlayback();
    setCallState("wait",CL("กำลังต่อสายใหม่ (จำบทสนทนาเดิม)...","Reconnecting (keeping the conversation)..."));
    try{await liveConnect(session)}catch(e){if(session!==callSession)return;liveHandle="";try{await liveConnect(session)}catch(e2){if(session!==callSession)return;endCall();toast(CL("โทรไม่สำเร็จ: ","Call failed: ")+e2.message,"ti-phone-off")}}
    finally{if(session===callSession)liveRecovering=false}
    return}
  /* สายหลุดก่อนได้ยิน AI: ถ้าเปิดเครื่องมือไว้ ลองปิดเครื่องมือก่อน (1 วัน) ค่อยโทษรุ่น — ปุ่มบนจอยังใช้ได้ครบ */
  if(!liveGotAudio&&liveModel){if(liveTools&&!(Date.now()-LS.get("live_notools",0)<86400e3))LS.set("live_notools",Date.now());else{const b=liveBad();b[liveModel]=Date.now();LS.set("live_bad",b)}}
  if(liveRetries>=3){liveRecovering=false;endCall();toast(CL("สายหลุด ","Call dropped ")+why,"ti-phone-off");return}
  const old=callWS;callWS=null;try{old&&old.close()}catch{}
  liveRetries++;callActive=false;flushPlayback();
  setCallState("wait",CL("สายสะดุด กำลังต่อใหม่...","Reconnecting..."));
  try{await liveConnect(session)}catch(e){if(session!==callSession)return;endCall();toast(CL("โทรไม่สำเร็จ: ","Call failed: ")+e.message,"ti-phone-off")}finally{if(session===callSession)liveRecovering=false}
}
function openLiveWS(token,model,session=callSession){
  return new Promise((resolve,reject)=>{
    if(session!==callSession){resolve();return;}
    callWS=new WebSocket("wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1alpha.GenerativeService.BidiGenerateContentConstrained?access_token="+encodeURIComponent(token));
    let settled=false;const ws=callWS;
    const connectTimer=setTimeout(()=>{
      if(settled)return;settled=true;
      reject(new Error(CL("เชื่อมต่อนานเกินไป ลองโทรใหม่อีกครั้งครับ","Connection timed out. Please try again")));
      try{ws.close()}catch{}
    },12000);
    callWS.onopen=()=>{if(session!==callSession||ws!==callWS)return;try{ws.send(JSON.stringify({setup:model?{model:"models/"+model}:{}}))}catch(e){}};
    callWS.onmessage=async ev=>{
      let txt=ev.data;if(txt instanceof Blob)txt=await txt.text();
      if(session!==callSession||ws!==callWS)return;
      let msg;try{msg=JSON.parse(txt)}catch(e){return}
      if(msg.setupComplete){
        if(!settled){settled=true;clearTimeout(connectTimer);callActive=true;
          try{if(!callMicNode)await startMicStream(session)}catch(e){reject(e);return}
          if(session!==callSession||ws!==callWS){resolve();return;}
          callConnecting=false;
          if(callCtx&&callCtx.state!=="running")callCtx.resume();
          if(playCtx&&playCtx.state!=="running")playCtx.resume();
          setCallState("link",CL("ต่อสายแล้ว พูดได้เลยครับ","Connected — just talk"));
          /* ต่อใหม่เพราะ AI ค้าง: ให้ตอบคำถามล่าสุดต่อทันที ผู้ใช้ไม่ต้องพูดซ้ำ */
          if(liveNudge){liveNudge=false;try{ws.send(JSON.stringify({clientContent:{turns:[{role:"user",parts:[{text:"[ข้อมูลจากระบบ] สายสะดุดไปครู่หนึ่ง ผู้ใช้ยังรอคำตอบของเรื่องล่าสุดอยู่ ตอบต่อได้เลยสั้น ๆ"}]}],turnComplete:true}}))}catch(e){}}
          resolve()}
        return;
      }
      /* Google แจ้งว่าจะตัดสายนี้ในอีกไม่กี่วินาที (หมุนเวียนการเชื่อมต่อตามปกติ):
         เดิมตัดทันทีกลางประโยค = AI เงียบไปเฉย ๆ · ตอนนี้รอให้พูดประโยคนี้จบก่อน แล้วต่อใหม่โดยจำบทสนทนาเดิม */
      if(msg.goAway){
        const left=(parseFloat(String(msg.goAway.timeLeft||"5s"))||5)*1000,until=Date.now()+Math.max(0,left-1200);
        const wait=()=>{if(ws!==callWS||session!==callSession)return;
          if((playSrcs.length===0&&!liveGeneratingAt)||Date.now()>=until)liveRecover(0,'session rotation',true).catch(()=>{});else setTimeout(wait,250)};
        wait();return;
      }
      handleLiveMsg(msg);
    };
    callWS.onerror=()=>{if(!settled){settled=true;clearTimeout(connectTimer);reject(new Error(CL("เชื่อมต่อไม่สำเร็จ","connection failed")))}};
    callWS.onclose=e=>{
      clearTimeout(connectTimer);
      const why=(e.reason||"")+" ("+e.code+")";
      if(ws!==callWS||session!==callSession){settled=true;resolve();return;}
      if(!settled&&liveHandle)liveHandle="";
      if(!settled){settled=true;
        if(e.code===1011&&liveRetries<3){liveRecover(e.code,why).then(resolve,reject)}
        else reject(new Error(CL("การเชื่อมต่อถูกปิด ","connection closed ")+why))}
      else if(callActive){
        if(e.code===1000){endCall();toast(CL("จบการสนทนา","Call ended"),"ti-phone-off")}
        else liveRecover(e.code,why)}
    };
  });
}

function setCaption(who,txt){
  const el=$("callCaption");
  el.className="hh-cap nt "+who;
  el.textContent=(txt||"").replace(/\s+/g," ").trim();
  el.scrollTop=el.scrollHeight;
  host.view?.caption?.(who,el.textContent);
}
function handleLiveMsg(msg){
  if(msg.toolCall?.functionCalls)garageCare?.activity();
  if(msg.sessionResumptionUpdate){const u=msg.sessionResumptionUpdate;if(u.newHandle&&u.resumable!==false)liveHandle=String(u.newHandle);}
  if(Array.isArray(msg.toolCallCancellation?.ids)){for(const id of msg.toolCallCancellation.ids.slice(0,64)){if(typeof id!=='string'||id.length>160)continue;cancelledTools.add(id);if(cancelledTools.size>64)cancelledTools.delete(cancelledTools.values().next().value);toolRequests.get(id)?.abort();toolRequests.delete(id);}getTools()?.onCancel(msg.toolCallCancellation.ids);}
  if(msg.toolCall?.functionCalls){const calls=msg.toolCall.functionCalls;const legacy=calls.filter(c=>c.name==='listen_engine'||c.name==='scan_engine_bay');if(legacy.length&&getTools()){host.view?.expand?.();getTools().onToolCall({functionCalls:legacy});}void handleTools(calls.filter(c=>!legacy.includes(c)||!getTools()));}
  const sc=msg.serverContent;if(!sc)return;
  if(sc.interrupted){flushPlayback();orb.wait=false;livePendingAt=liveGeneratingAt=0;liveAiText="";}
  if(sc.inputTranscription&&sc.inputTranscription.text){
    if(!orb.wait)liveTurnAudio=false;
    heardAt=Date.now();livePendingAt=heardAt;orb.wait=true;
    liveUserText+=sc.inputTranscription.text;
    try{host.agent?.heard?.(heardAt,liveUserText);}catch{}
    garageCare?.heard(liveUserText);
    setCaption("user",liveUserText);
  }
  if(sc.outputTranscription&&sc.outputTranscription.text){
    garageCare?.activity();
    liveAiText+=sc.outputTranscription.text;
    setCaption("ai",liveAiText);
  }
  if(sc.modelTurn&&sc.modelTurn.parts)
    for(const p of sc.modelTurn.parts)if(!p.thought&&p.inlineData&&p.inlineData.data){liveGotAudio=liveTurnAudio=true;liveRetries=0;liveGeneratingAt=Date.now();livePendingAt=0;orb.wait=false;queuePcm(p.inlineData.data)}
  if(sc.turnComplete||sc.interrupted)orb.wait=false;
  if(sc.turnComplete){
    garageCare?.turnComplete();
    liveGeneratingAt=0;
    if(liveTurnAudio)livePendingAt=0;
    if(liveUserText.trim())messages.push({role:"user",text:liveUserText.trim()});
    if(liveAiText.trim())messages.push({role:"ai",text:liveAiText.trim()});
    if(liveUserText.trim()||liveAiText.trim())saveSession();
    liveUserText="";liveAiText="";
  }
}

async function handleTools(calls){
  if(!callActive||!callWS||!Array.isArray(calls))return;
  const session=callSession,ws=callWS;
  if(calls.length>16){endCall();toast(CL('คำขอเครื่องมือผิดปกติ กรุณาโทรใหม่','Unexpected tool request. Please call again.'));return;}
  for(const call of calls){
    if(session!==callSession||ws!==callWS||!callActive)return;
    if(typeof call.id!=='string'||call.id.length>160||typeof call.name!=='string')continue;
    if(cancelledTools.has(call.id)||toolRequests.has(call.id))continue;
    let response=toolResults.get(call.id);
    if(!response){
      const abort=new AbortController();toolRequests.set(call.id,abort);toolPending++;
      const timer=setTimeout(()=>abort.abort(),/^valet/.test(call.name)?30000:call.name==='web_search'?15000:10000);
      const isCurrent=()=>session===callSession&&ws===callWS&&callActive&&!abort.signal.aborted;
      try{
        if(!host.agent)throw Error('Tools not available');
        response=await Promise.race([host.agent.execute(call.name,call.args||{},{signal:abort.signal,isCurrent}),new Promise((_,reject)=>abort.signal.addEventListener('abort',()=>reject(Error('Tool interrupted')),{once:true}))]);
      }catch{response={error:'Tool unavailable, cancelled or timed out. No request was submitted. Ask the user to retry or use the normal controls.'};}
      finally{clearTimeout(timer);if(toolRequests.get(call.id)===abort)toolRequests.delete(call.id);if(session===callSession)toolPending=Math.max(0,toolPending-1);}
      if(session!==callSession||ws!==callWS||!callActive)return;
      if(cancelledTools.has(call.id))continue;
      toolResults.set(call.id,response);if(toolResults.size>64)toolResults.delete(toolResults.keys().next().value);
    }
    try{ws.send(JSON.stringify({toolResponse:{functionResponses:[{id:call.id,name:call.name,response}]}}));livePendingAt=Date.now();}catch{}
  }
}

/* เสียง AI ดังชัดบนลำโพงมือถือ
 * เปิดไมค์ปุ๊บ มือถือเข้าโหมดโทรเอง (iPhone = วิดีโอคอล · Android = โหมดสื่อสาร) แล้วลดระดับเสียงลง ทั้งที่เสียงออกลำโพงใหญ่อยู่แล้ว
 * (iPhone ตั้งออกลำโพงเป็นค่าเริ่มต้น · Android เลือกลำโพงเมื่อไม่มีหูฟัง/บลูทูธ — ไม่มีเบราว์เซอร์ไหนเลือกหูฟังสนทนาเองถ้าหน้าเว็บไม่ขอ)
 * → บีบช่วงเสียง (ท่อนเบายกขึ้น ท่อนดังไม่พุ่ง) + ขยายอีกชั้น + กันเสียงแตกแบบนุ่ม
 *   ต้นทางเบา -30/-24/-20 dBFS ออกมาราว -16/-14/-13 dBFS (ดังขึ้น ~14/10/7 dB) ต้นทางดังอยู่แล้วก็ไม่แตก
 * มิเตอร์วงกลม (playAnalyser) อยู่ก่อนขยาย ภาพกับตัวกันเสียงสะท้อนอ่านระดับเดิม · เครื่องที่สร้างโหนดไม่ได้ = ต่อตรงแบบเดิม */
const AI_BOOST=2.7,CLIP_RANGE=2;
let softClip=null;
function loudChain(ctx,input){
  try{
    const comp=ctx.createDynamicsCompressor(),boost=ctx.createGain(),clip=ctx.createWaveShaper();
    comp.threshold.value=-38;comp.knee.value=10;comp.ratio.value=6;comp.attack.value=.003;comp.release.value=.15;
    /* เส้นกันแตก: ตรงเป๊ะจนถึง 0.8 แล้วโค้งนุ่มเข้าหา 0.98 (ช่วงขาเข้า ±2 จึงย่อด้วย boost/2 ก่อนเข้า) */
    if(!softClip){softClip=new Float32Array(4097);for(let i=0;i<softClip.length;i++){const r=(i/2048-1)*CLIP_RANGE,a=Math.abs(r);softClip[i]=Math.sign(r)*(a<=.8?a:.8+.18*Math.tanh((a-.8)/.18))}}
    boost.gain.value=AI_BOOST/CLIP_RANGE;clip.curve=softClip;clip.oversample="2x";
    input.connect(comp);comp.connect(boost);boost.connect(clip);return clip;
  }catch(e){return input}
}
/* เสียง AI 24kHz เล่นต่อกันใน playback context แยกจากไมค์และเสียงปุ่ม */
function queuePcm(b64){
  /* กำลังอัดเสียงเครื่อง: ไม่เล่นเสียง AI ไม่งั้นเสียงพูดถูกอัดปนเข้าไป */
  if(!callActive||!playCtx||getTools()?.muteAi)return;
  try{
    if(playCtx.state!=="running")playCtx.resume().catch(()=>setTag('heardTag',CL('แตะหน้าจอเพื่อเปิดเสียง','Tap to restore audio')));
    const bin=atob(b64),len=bin.length>>1,f32=new Float32Array(len);
    for(let i=0;i<len;i++){let v=bin.charCodeAt(2*i)|(bin.charCodeAt(2*i+1)<<8);if(v>=0x8000)v-=0x10000;f32[i]=v/0x8000}
    const buf=playCtx.createBuffer(1,len,24000);buf.getChannelData(0).set(f32);
    const src=playCtx.createBufferSource();src.buffer=buf;src.connect(playGain);
    const t=Math.max(playCtx.currentTime+0.02,playTime);
    src.start(t);playTime=t+buf.duration;
    playSrcs.push(src);src.onended=()=>{playSrcs=playSrcs.filter(s=>s!==src)};
  }catch(e){}
}
function flushPlayback(){
  playSrcs.forEach(s=>{try{s.stop()}catch(e){}});playSrcs=[];
  playTime=playCtx?playCtx.currentTime:0;
  aiLevel=0;orb.a=0;
}

/* กล้อง: เต็มจอเหมือนกล้องถอยหลัง มีเส้นกะระยะ ส่งภาพให้ AI 1 เฟรม/วินาที */
async function toggleCamera(){
  if(camOn){stopCamera();return}
  if(!callActive||camOpening)return;
  const session=callSession;camOpening=true;
  try{
    const stream=await navigator.mediaDevices.getUserMedia({video:{facingMode:camFacing,width:{ideal:1280}}});
    if(session!==callSession||!callActive){stream.getTracks().forEach(t=>t.stop());return;}
    camStream=stream;
    const v=$("callCam");v.srcObject=camStream;setCallZoom(1);v.play().catch(()=>{});
    $("callUI").classList.add("cam");$("callCamBtn").classList.add("on");$("callFlipBtn").hidden=false;
    host.view?.resize?.();
    $("callZoomBox").hidden=false;
    camOn=true;
    camTimer=setInterval(()=>{
      if(!callActive||!callWS||callWS.readyState!==1)return;
      const vd=$("callCam");if(!vd.videoWidth)return;
      const c=$("camCanvas"),w=640,h=Math.round(vd.videoHeight/vd.videoWidth*640)||480;
      c.width=w;c.height=h;const sw=vd.videoWidth/camZoom,sh=vd.videoHeight/camZoom;
      c.getContext("2d").drawImage(vd,(vd.videoWidth-sw)/2,(vd.videoHeight-sh)/2,sw,sh,0,0,w,h);
      const data=c.toDataURL("image/jpeg",0.6).split(",")[1];
      try{callWS.send(JSON.stringify({realtimeInput:{video:{data,mimeType:"image/jpeg"}}}))}catch(e){}
    },1000);
    toast(CL("AI มองเห็นภาพจากกล้องแล้ว ส่องให้ดูได้เลย","AI can see your camera now"),"ti-video");
  }catch(e){if(session===callSession)toast(CL("เปิดกล้องไม่ได้: ","Camera unavailable: ")+e.message,"ti-video-off")}finally{if(session===callSession)camOpening=false}
}
function setCallZoom(value){
  camZoom=Math.max(1,Math.min(4,Number(value)||1));
  $("callCam").style.transform=`scale(${camFacing==='user'?-camZoom:camZoom},${camZoom})`;
  $("callZoom").value=camZoom;$("callZoomLabel").textContent=camZoom.toFixed(1)+'×';
}
function stopCamera(){
  camOn=false;clearInterval(camTimer);camTimer=null;
  if(camStream){camStream.getTracks().forEach(t=>t.stop());camStream=null}
  const v=$("callCam");if(v)v.srcObject=null;
  $("callUI").classList.remove("cam");$("callCamBtn").classList.remove("on");$("callFlipBtn").hidden=true;
  $("callZoomBox").hidden=true;camZoom=1;
  host.view?.resize?.();
}
async function flipCamera(){
  camFacing=camFacing==="environment"?"user":"environment";
  if(camOn){stopCamera();await toggleCamera()}
}

function toggleCallMute(){
  callMuted=!callMuted;
  if(callMuted&&callWS&&callWS.readyState===1)try{callWS.send(JSON.stringify({realtimeInput:{audioStreamEnd:true}}))}catch{}
  const b=$("callMuteBtn");b.classList.toggle("muted",callMuted);
  b.querySelector(".ti").className="ti "+(callMuted?"ti-microphone-off":"ti-microphone");
}
/* Sound is a separate, reusable player: tap feedback never blocks the Live connection. */
function callChime(_ctx,up){
  try{window.CendonCallSounds&&window.CendonCallSounds.play(up?"start":"end")}catch(e){}
}
function endCall(){
  garageCare?.reset();garageCareAbort?.abort();garageCareAbort=null;liveGarageCare=false;
  const hadCall=callConnecting||callActive||callWS||$("callUI").classList.contains("show");
  // Invalidate pending permissions/token requests before any stale callback can reopen a call.
  callSession++;callConnecting=false;
  for(const abort of toolRequests.values())abort.abort();toolRequests.clear();toolResults.clear();toolPending=0;callOwner=null;
  livePendingAt=liveGeneratingAt=0;liveTurnAudio=false;liveRecovering=false;camOpening=false;waveSamples=null;
  try{callAbort&&callAbort.abort()}catch(e){}callAbort=null;
  if(hadCall)callChime(null,false);
  /* iPhone: คืนโหมดเสียงปกติหลังเสียงวางสายเล่นจบ — ไม่งั้นเสียงอื่นในหน้ายังเบาแบบโหมดโทรต่อ */
  try{if(hadCall&&navigator.audioSession&&navigator.audioSession.type==="play-and-record")setTimeout(()=>{try{if(!callActive&&!callConnecting)navigator.audioSession.type="auto"}catch(e){}},1200)}catch(e){}
  try{getTools()?.reset()}catch(e){}
  callActive=false;
  clearInterval(callTimerInt);callTimerInt=null;
  stopCamera();
  const oldWS=callWS;callWS=null;try{oldWS&&oldWS.close()}catch(e){}
  try{callMicNode&&callMicNode.disconnect()}catch(e){}callMicNode=null;
  try{callMicSrc&&callMicSrc.disconnect()}catch(e){}callMicSrc=null;
  if(callMicStream){callMicStream.getTracks().forEach(t=>t.stop());callMicStream=null}
  flushPlayback();
  for(const ctx of [callCtx,playCtx])try{ctx&&ctx.close().catch(()=>{})}catch(e){}
  callCtx=null;playCtx=null;playGain=null;playAnalyser=null;callSink=null;
  liveUserText="";liveAiText="";callMuted=false;micLevel=0;aiLevel=0;heardAt=0;liveHandle="";liveNudge=false;
  $("callMuteBtn").classList.remove("muted");$("callMuteBtn").querySelector(".ti").className="ti ti-microphone";
  host.view?.close?.();
  $("callUI").classList.remove("show");$("callUI").setAttribute("aria-hidden","true");
  host.agent?.clear?.();renderMessages();updateHint();renderChips();setPhase("thread");
  try{global.CendonCallShell?.ended(api)}catch(e){}
}
/* แตะตรงไหนก็ได้ = ปลุกเสียงอีกรอบ (iOS บางทีพักเสียงเองตอนสลับแอป) */
function wakeCall(){[callCtx,playCtx].forEach(c=>{if(c&&c.state!=="running"&&c.state!=="closed")c.resume().catch(()=>{})})}
$("callUI")&&$("callUI").addEventListener("pointerdown",wakeCall);


  function dispose(){endCall();$("callUI")?.removeEventListener?.("pointerdown",wakeCall);global.removeEventListener?.("pagehide",pageExit);getTools()?.dispose?.();host.view?.dispose?.();}
  function pageExit(){if(callActive||callConnecting)endCall();}
  global.addEventListener?.("pagehide",pageExit);
  /* ส่งรูปให้ AI ดูระหว่างโทร: ย่อเป็น JPEG ไม่เกิน 1280px ส่งเป็นภาพในสาย แล้วบอกให้ดูรูป */
  async function sendImage(file){
    if(!callActive||!callWS||callWS.readyState!==1)throw new Error(CL("ยังไม่ได้ต่อสาย","Not connected"));
    const url=URL.createObjectURL(file);
    try{
      const im=await new Promise((ok,no)=>{const i=new Image();i.onload=()=>ok(i);i.onerror=()=>no(new Error(CL("เปิดรูปนี้ไม่ได้","Couldn't open this image")));i.src=url});
      const k=Math.min(1,1280/Math.max(im.naturalWidth||1,im.naturalHeight||1)),c=document.createElement("canvas");c.width=Math.round(im.naturalWidth*k);c.height=Math.round(im.naturalHeight*k);
      c.getContext("2d").drawImage(im,0,0,c.width,c.height);const data=c.toDataURL("image/jpeg",.82).split(",")[1];
      callWS.send(JSON.stringify({realtimeInput:{video:{data,mimeType:"image/jpeg"}}}));
      callWS.send(JSON.stringify({clientContent:{turns:[{role:"user",parts:[{text:"[ข้อมูลจากระบบ] ผู้ใช้ส่งรูปให้ดู 1 รูป (ภาพล่าสุดที่เห็น) — ดูรูปแล้วตอบสั้น ๆ ว่าเห็นอะไรและควรทำอะไรต่อ"}]}],turnComplete:true}}));
      livePendingAt=Date.now();messages.push({role:"user",text:CL("[ส่งรูปให้ดู]","[sent a photo]")});return true;
    }finally{URL.revokeObjectURL(url)}
  }
  /* ข้อความจากระบบเข้าสาย (เช่น ผู้ใช้กดยืนยันการ์ด Valet บนจอ) — โมเดลรู้ผลจริงแล้วพูดต่อ ไม่ต้องทำซ้ำ */
  function note(text){if(!callActive||!callWS||callWS.readyState!==1)return false;try{callWS.send(JSON.stringify({clientContent:{turns:[{role:"user",parts:[{text:String(text||"").slice(0,1200)}]}],turnComplete:true}}));livePendingAt=Date.now();return true}catch(e){return false}}
  const api=Object.freeze({garageCareControl:(action,ctx)=>garageCare?.control(action,ctx)||Promise.resolve({error:'Check-ins unavailable'}),note,sendImage,expand:()=>host.view?.expand?.(),minimize:()=>host.view?.minimize?.(),refresh:()=>host.view?.refresh?.(),start:startCall,end:endCall,mute:toggleCallMute,camera:toggleCamera,flip:flipCamera,zoom:setCallZoom,wake:wakeCall,dispose,bridge:Object.freeze({get callWS(){return callWS},get callCtx(){return callCtx},get callActive(){return callActive},get callSession(){return callSession},get callMicStream(){return callMicStream},set callMicStream(v){callMicStream=v},get callMicNode(){return callMicNode},set callMicNode(v){callMicNode=v},get callMicSrc(){return callMicSrc},set callMicSrc(v){callMicSrc=v},get camZoom(){return camZoom},get camOn(){return camOn},get camFacing(){return camFacing},set camFacing(v){camFacing=v},get playSrcs(){return playSrcs},get livePendingAt(){return livePendingAt},set livePendingAt(v){livePendingAt=v},startMicStream,flushPlayback,b64FromBytes,toggleCamera,flipCamera}),
    get active(){return callActive||callConnecting},get muted(){return callMuted},get cameraOn(){return camOn}});
  try{host.agent?.bind?.(api);}catch{}
  return api;
}
global.CendonCallSession=Object.freeze({create});
})(window);
