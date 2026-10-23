/* เครื่องมือระหว่างโทรคุยกับ Cendon (chat.html)
   1) ฟังเสียงเครื่อง: ไมค์ปกติของการโทรเปิดตัวกรองเสียงรบกวนไว้ (ให้ได้ยินคำพูดชัด) เสียงเครื่องยนต์จึงถูกตัดทิ้งก่อนถึง AI
      โหมดนี้ปิดตัวกรองทั้งหมด อัดเสียงดิบ 10 วินาที แสดงภาพคลื่นความถี่สด แล้วส่งให้ AI ฟังจริง ผลกลับเข้าไปในสายให้ผู้ช่วยพูดต่อ
   2) สแกนห้องเครื่อง: ถ่ายภาพคมจากกล้องหลัง AI ตีกรอบชิ้นส่วนที่เห็นจริงบนภาพ แตะดูว่าคืออะไร เช็กเองยังไง
   ผู้ช่วยเสียงเรียกสองอย่างนี้เองได้ (พูดว่า "ฟังเสียงเครื่องหน่อย" / "ดูห้องเครื่องให้หน่อย") หรือกดปุ่มบนจอ
   รับ state ผ่าน bridge ของสายที่เป็นเจ้าของ ใช้ได้ทั้ง Home/Chat โดยไม่พึ่ง global state ของหน้า */
(function(){
'use strict';
function create(host){
const voice=host.voice,lang=host.language||'th',BACKEND_URL=host.backendUrl;
const auth={get currentUser(){return host.getUser()}};
const messages={push:m=>host.appendMessage?.(m),filter:fn=>(host.getMessages?.()||[]).filter(fn)};
const saveSession=()=>host.save?.(),selCar=()=>host.getCar?.(),toast=(...a)=>host.toast?.(...a),b64FromBytes=voice.b64FromBytes;
'use strict';
const D=document,$=id=>D.getElementById(id);
const T=(th,en)=>lang!=='th'?en:th;
const esc=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const REC_SEC=10;
const S={mode:'',holdMic:false,muteAi:false,tool:null,abort:null,raf:0,run:0};

/* ── ส่งผลกลับเข้าไปในสาย ── ถ้า AI เป็นคนเรียกเครื่องมือ ตอบเป็น toolResponse · ถ้าผู้ใช้กดเอง ส่งเป็นข้อมูลจากระบบให้ AI สรุปให้ฟัง */
/* quiet = แค่ให้ AI รู้ (เช่น กรอบเปลี่ยนตอนขยับกล้อง) ไม่ต้องพูดแทรก */
function tellLive(text,tool,quiet){
  try{
    if(typeof voice.callWS==='undefined'||!voice.callWS||voice.callWS.readyState!==1)return;
    if(tool&&tool.id)voice.callWS.send(JSON.stringify({toolResponse:{functionResponses:[{id:tool.id,name:tool.name,response:{result:text}}]}}));
    else voice.callWS.send(JSON.stringify({clientContent:{turns:[{role:'user',parts:[{text:'[ข้อมูลจากระบบ ไม่ใช่คำพูดของผู้ใช้] '+text+(quiet?'\n(ข้อมูลอัปเดต ไม่ต้องพูดตอนนี้ ใช้ตอบเมื่อผู้ใช้ถาม)':'\nสรุปให้ผู้ใช้ฟังสั้น ๆ เป็นภาษาพูด แล้วถามว่าอยากให้ช่วยอะไรต่อ')}]}],turnComplete:!quiet}}));
    if(!quiet&&typeof voice.livePendingAt!=='undefined')voice.livePendingAt=Date.now();
  }catch(e){}
}
function remember(text){
  try{if(typeof messages!=='undefined'){messages.push({role:'ai',text});if(typeof saveSession==='function')saveSession()}}catch(e){}
}
function carCtx(){
  try{return window.CendonVehicleAudio?.car(selCar())||{}}catch(e){return {}}
}
function recentTalk(){
  try{return (messages||[]).filter(m=>m.role==='user'||m.role==='ai').slice(-4).map(m=>(m.role==='user'?'ผู้ใช้: ':'Cendon: ')+String(m.text||'').slice(0,240)).join('\n')}catch(e){return ''}
}
/* เรียก AI เครื่องมือ (ตอบเป็น JSON) — ข้อผิดพลาดบอกผู้ใช้เป็นภาษาคน ไม่บอกเรื่องระบบหลังบ้าน */
async function analyze(tool,attachments,context,question,signal){
  const u=typeof auth!=='undefined'&&auth&&auth.currentUser;
  if(!u)throw Error(T('กรุณาเข้าสู่ระบบก่อน','Please sign in first'));
  const tok=await u.getIdToken();
  const r=await fetch(BACKEND_URL+'/api/features/analyze',{method:'POST',signal,headers:{'Content-Type':'application/json',Authorization:'Bearer '+tok},
    body:JSON.stringify({tool,attachments,context,question,lang:window.spireLang?.()||lang,...(['bay','baylive'].includes(tool)?{scanVersion:2}:{})})});
  const d=await r.json().catch(()=>null);
  if(!r.ok){
    const tag=e=>Object.assign(e,{status:r.status,code:d&&d.error});
    if(d&&d.error==='feature_quota')throw tag(Error(T(`ใช้เครื่องมือนี้ครบ ${d.limit} ครั้งของวันนี้แล้ว พรุ่งนี้ใช้ได้อีกครับ`,`You've used this ${d.limit} times today. Try again tomorrow.`)));
    if(['bay','baylive'].includes(tool)&&window.CendonEngineScan?.failure)throw tag(Error(window.CendonEngineScan.failure(r.status,d,lang)));
    if(r.status===429)throw tag(Error(T('โควตา AI วันนี้หมดแล้ว','Daily AI quota reached')));
    throw tag(Error(T('วิเคราะห์ไม่ได้ชั่วคราว ลองอีกครั้งนะครับ','Analysis is unavailable right now. Please try again.')));
  }
  if(!d||!d.data)throw Error(T('ยังไม่ได้ผลจาก AI ลองอีกครั้งนะครับ','No result yet. Please try again.'));
  if(tool==='ear'&&d.data.audioVersion!==2)throw Error(T('ต้องอัปเดตระบบฟังเสียงให้ตรงกับแอปก่อนครับ','The audio service must be updated to match the app'));
  return d.data;
}

/* ── ชั้นเต็มจอบนหน้าโทร ── */
function layer(){
  let el=$('ctLayer');
  if(!el){el=D.createElement('section');el.id='ctLayer';el.className='ct-layer';el.setAttribute('role','dialog');el.setAttribute('aria-modal','true');$('callUI').appendChild(el)}
  el.hidden=false;el.className='ct-layer';$('callUI').classList.add('ct-on');return el;
}
function closeLayer(){
  if(S.mode==='bay')stopLive();
  if(S.tool){const t=S.tool;S.tool=null;tellLive(T('ผู้ใช้เปลี่ยนไปทำอย่างอื่นแล้ว','The user switched to something else'),t)}
  S.run++;cancelAnimationFrame(S.raf);S.raf=0;
  try{S.abort&&S.abort.abort()}catch(e){}S.abort=null;
  const el=$('ctLayer');if(el){el.hidden=true;el.innerHTML=''}
  const ui=$('callUI');if(ui)ui.classList.remove('ct-on');
  S.mode='';S.holdMic=false;S.muteAi=false;
}

/* ═════════ 1) ฟังเสียงเครื่อง ═════════ */
const RAW_WORKLET=`class R extends AudioWorkletProcessor{constructor(){super();this.b=new Float32Array(4096);this.n=0}
process(i){const c=i[0]&&i[0][0];if(!c)return true;for(let k=0;k<c.length;k++){this.b[this.n++]=c[k];if(this.n===4096){this.port.postMessage(this.b.slice(0));this.n=0}}return true}}
registerProcessor("cendon-raw",R);`;
/* ไมค์ดิบ: ลองปิดตัวกรองบนสายเดิมก่อน (ไม่ต้องขอสิทธิ์ใหม่) · เครื่องที่เปลี่ยนไม่ได้ ขอไมค์ดิบแยกอีกสาย */
async function rawMic(){
  const t=voice.callMicStream&&voice.callMicStream.getAudioTracks()[0];
  if(t&&t.readyState==='live'&&t.applyConstraints){
    try{
      await t.applyConstraints({echoCancellation:false,noiseSuppression:false,autoGainControl:false});
      const st=t.getSettings?t.getSettings():{};
      if(st.noiseSuppression===false&&st.echoCancellation===false)
        return {stream:voice.callMicStream,recording:window.CendonVehicleAudio.recording(voice.callMicStream),restore:()=>t.applyConstraints({echoCancellation:true,noiseSuppression:true,autoGainControl:true}).catch(()=>{})};
    }catch(e){}
  }
  const owner=voice.callSession;
  const s=await navigator.mediaDevices.getUserMedia({audio:{channelCount:1,echoCancellation:false,noiseSuppression:false,autoGainControl:false}});
  return {stream:s,recording:window.CendonVehicleAudio.recording(s),restore:async()=>{s.getTracks().forEach(x=>x.stop());await reviveMic(owner)}};
}
/* บางเครื่อง (iPhone) เปิดไมค์ที่สองแล้วตัดไมค์แรก → ต่อไมค์ของสายกลับให้เอง */
async function reviveMic(owner){
  try{
    const t=voice.callMicStream&&voice.callMicStream.getAudioTracks()[0];
    if(owner!==voice.callSession||!voice.callActive||(t&&t.readyState==='live'))return;
    const s=await navigator.mediaDevices.getUserMedia({audio:{channelCount:1,echoCancellation:true,noiseSuppression:true,autoGainControl:true}});
    if(owner!==voice.callSession||!voice.callActive){s.getTracks().forEach(x=>x.stop());return;}
    try{voice.callMicNode&&voice.callMicNode.disconnect()}catch(e){}voice.callMicNode=null;
    try{voice.callMicSrc&&voice.callMicSrc.disconnect()}catch(e){}voice.callMicSrc=null;
    if(voice.callMicStream)voice.callMicStream.getTracks().forEach(x=>x.stop());
    voice.callMicStream=s;await voice.startMicStream(voice.callSession);
  }catch(e){toast(T('ไมค์หลุด แตะปุ่มไมค์อีกครั้ง','Mic lost — tap the mic button'),'ti-microphone-off')}
}
/* WAV 16kHz mono — ย่อด้วย OfflineAudioContext (มีตัวกรองกันเสียงเพี้ยน ไม่ใช่หยิบทีละตัวอย่าง) */
async function toWav(chunks,rate){
  let n=0;chunks.forEach(c=>n+=c.length);
  const all=new Float32Array(n);let o=0;chunks.forEach(c=>{all.set(c,o);o+=c.length});
  const out=16000,len=Math.max(1,Math.round(n*out/rate));
  let data=all;
  try{
    const OC=window.OfflineAudioContext||window.webkitOfflineAudioContext;
    const oc=new OC(1,len,out),buf=oc.createBuffer(1,n,rate);buf.getChannelData(0).set(all);
    const src=oc.createBufferSource();src.buffer=buf;src.connect(oc.destination);src.start();
    data=(await oc.startRendering()).getChannelData(0);
  }catch(e){const r=rate/out;data=new Float32Array(len);for(let i=0;i<len;i++)data[i]=all[Math.min(n-1,Math.floor(i*r))]}
  /* ปรับระดับให้ดังพอฟัง (ไม่บีบเสียง) — เสียงเบามากจาก AGC ที่ปิดไป */
  let peak=0;for(let i=0;i<data.length;i++)peak=Math.max(peak,Math.abs(data[i]));
  const g=peak>0.001?Math.min(8,0.9/peak):1;
  const b=new ArrayBuffer(44+data.length*2),v=new DataView(b);
  const w=(p,s)=>{for(let i=0;i<s.length;i++)v.setUint8(p+i,s.charCodeAt(i))};
  w(0,'RIFF');v.setUint32(4,36+data.length*2,true);w(8,'WAVE');w(12,'fmt ');v.setUint32(16,16,true);v.setUint16(20,1,true);v.setUint16(22,1,true);
  v.setUint32(24,out,true);v.setUint32(28,out*2,true);v.setUint16(32,2,true);v.setUint16(34,16,true);w(36,'data');v.setUint32(40,data.length*2,true);
  for(let i=0;i<data.length;i++){const s=Math.max(-1,Math.min(1,data[i]*g));v.setInt16(44+i*2,s<0?s*32768:s*32767,true)}
  return {b64:b64FromBytes(new Uint8Array(b)),peak,gain:g,sampleRate:out,durationSeconds:n/rate};
}
/* หน้าปัดเสียง (sound-lens.js ใช้ร่วมกับหน้าฟังเสียงรถ) */
const LENS=window.CendonLens;
const isLight=()=>!!$('callUI')?.classList.contains('light');
const EAR_TIPS=[
  ['ti-device-mobile',T('ถือมือถือห่างชิ้นส่วนร้อนหรือกำลังหมุน','Keep clear of hot or moving parts'),T('ไม่ยื่นมือเข้าไปในห้องเครื่อง','Never reach into the engine bay')],
  ['ti-engine',T('ปล่อยเดินเบา ไม่ต้องเร่งเครื่อง','Let it idle — no need to rev'),T('มีไฟเตือนแรงดันน้ำมันหรือความร้อน ให้ดับเครื่องแล้วเรียกช่าง','Oil-pressure or overheat light on? Switch off and call a mechanic')],
  ['ti-volume-3',T('ไม่พูดหรือเปิดเพลงระหว่างอัด','No talking or music while recording'),T('เสียงอื่นปนทำให้ AI ฟังยากขึ้น','Other sounds make it harder to hear')]];
function earTip(i){
  const el=$('ctTip');if(!el||el.dataset.i===String(i))return;el.dataset.i=i;const [ic,b,s]=EAR_TIPS[i];
  el.innerHTML=`<span class="ct-tip-ic"><i class="ti ${ic}"></i></span><span class="ct-tip-tx"><b>${esc(b)}</b><small>${esc(s)}</small><span class="ct-dots3">${EAR_TIPS.map((x,j)=>`<i class="${j===i?'on':''}"></i>`).join('')}</span></span>`;
}
function earPhase(i){const ol=$('ctPhase');if(ol)[...ol.children].forEach((li,j)=>{li.classList.toggle('on',j===i);li.classList.toggle('done',j<i)})}

/* ไม่ถามก่อนฟัง: ใช้รถที่เลือกอยู่ในการาจ (ป้ายบนจอ แตะเปลี่ยนได้ระหว่างนับถอยหลัง — นับหยุดรอ) */
async function listenEngine(tool){
  if(!voice.callActive)return;
  if(S.mode)closeLayer();
  const run=++S.run,args=(tool&&tool.args)||{};
  S.mode='ear';S.tool=tool||null;
  const VA=window.CendonVehicleAudio,owner=auth.currentUser,session=voice.callSession,saved=selCar();
  if(!VA){finishEar(null,T('ระบบฟังเสียงยังโหลดไม่ครบ ลองเปิดหน้าใหม่','Audio tools have not loaded. Reload and try again'));return}
  let selected=null,paused=false;
  const el=layer();el.classList.add('ct-ear');
  el.innerHTML=`<header class="ct-hd ct-ehd" id="ctWho">${VA.picker('ctVehicle',saved,null,lang)}<button type="button" class="ct-x" id="ctClose" aria-label="${T('ปิด','Close')}"><i class="ti ti-x"></i></button></header>
    <div class="ct-run" id="ctRun">
      <div class="ct-ttl"><b>${T('ฟังเสียงเครื่อง','Engine listening')}</b><small>${T('ไมค์แบบไม่กรองเสียง · ได้ยินเสียงเครื่องครบ','Unfiltered microphone · keeps every engine sound')}</small></div>
      <div class="ct-lens" id="ctLens"><canvas id="ctSpec" aria-hidden="true"></canvas><i class="ct-hand" id="ctHand" aria-hidden="true"></i>
        <div class="ct-core" role="status" aria-live="polite"><b id="ctSec">3</b><small id="ctRingL">${T('เตรียมตัว','Get ready')}</small></div></div>
      <div class="ct-meter"><span>${T('ระดับเสียง','Level')}</span><span class="ct-mbar"><i id="ctLvl"></i></span><em id="ctLvlT"></em></div>
      <ol class="ct-phase" id="ctPhase"><li class="on">${T('เตรียม','Ready')}</li><li>${T(`ฟัง ${REC_SEC} วิ`,`Listen ${REC_SEC}s`)}</li><li>${T('AI วิเคราะห์','AI analysis')}</li></ol>
      <div class="ct-tip" id="ctTip"></div>
      <button type="button" class="ct-cancel" id="ctCancel">${T('ยกเลิก','Cancel')}</button>
    </div>
    <div class="ct-out" id="ctOut" hidden></div>`;
  earTip(0);
  VA.bind('ctVehicle',saved,v=>{selected=v},{cars:host.getCars?.()||[],lang,host:el,onOpen:()=>{paused=true},onClose:()=>{paused=false}});
  const cancel=()=>finishEar(null,T('ยกเลิกการฟังเสียง','Listening cancelled'));
  $('ctClose').onclick=cancel;$('ctCancel').onclick=cancel;
  const isCurrent=()=>run===S.run&&voice.callActive&&session===voice.callSession&&auth.currentUser?.uid===owner?.uid&&VA.current(selected,selCar());
  /* หยุดเสียง AI ที่ค้างอยู่ ไม่ให้เสียงพูดของ AI ถูกอัดปนไปด้วย */
  S.holdMic=true;S.muteAi=true;
  try{voice.callWS&&voice.callWS.readyState===1&&voice.callWS.send(JSON.stringify({realtimeInput:{audioStreamEnd:true}}))}catch(e){}
  const wait=Date.now();while((voice.playSrcs||[]).length&&Date.now()-wait<5000){await new Promise(r=>setTimeout(r,120));if(run!==S.run)return}
  voice.flushPlayback?.();
  let mic=null,recording={},src=null,an=null,node=null;const chunks=[];let rate=voice.callCtx?voice.callCtx.sampleRate:48000,maxLv=0;
  const cleanup=async()=>{try{src&&src.disconnect();an&&an.disconnect();node&&node.disconnect()}catch(e){}if(mic){const m=mic;mic=null;await m.restore()}};
  try{
    mic=await rawMic();recording=mic.recording;if(run!==S.run){await cleanup();return}
    const ctx=voice.callCtx;rate=ctx.sampleRate;
    src=ctx.createMediaStreamSource(mic.stream);an=ctx.createAnalyser();an.fftSize=2048;an.smoothingTimeConstant=0.2;src.connect(an);
    const sink=ctx.createGain();sink.gain.value=0;sink.connect(ctx.destination);
    try{const url=URL.createObjectURL(new Blob([RAW_WORKLET],{type:'application/javascript'}));try{await ctx.audioWorklet.addModule(url)}finally{URL.revokeObjectURL(url)}
      node=new AudioWorkletNode(ctx,'cendon-raw');}
    catch(e){node=ctx.createScriptProcessor(4096,1,1);node.onaudioprocess=ev=>{if(S.rec)chunks.push(new Float32Array(ev.inputBuffer.getChannelData(0)))}}
    if(node.port)node.port.onmessage=ev=>{if(S.rec)chunks.push(ev.data)};
    src.connect(node);node.connect(sink);
    const G=LENS?LENS.base($('ctSpec'),{light:isLight()}):null,bins=new Uint8Array(an.frequencyBinCount),td=new Float32Array(an.fftSize),hz=rate/an.fftSize;
    const PRE=3000,REC=REC_SEC*1000;let pre=0,last=performance.now(),recAt=0,lastP=0;
    S.rec=false;
    await new Promise(resolve=>{
      const loop=()=>{
        if(run!==S.run){resolve();return}
        const now=performance.now(),dt=now-last;last=now;
        an.getByteFrequencyData(bins);an.getFloatTimeDomainData(td);
        let s=0;for(let i=0;i<td.length;i++)s+=td[i]*td[i];const lv=Math.sqrt(s/td.length);
        if(S.rec)maxLv=Math.max(maxLv,lv);
        $('ctLvl').style.transform=`scaleX(${Math.min(1,lv*9).toFixed(3)})`;
        $('ctLvlT').textContent=lv<.004?T('เบาไป','Too quiet'):lv>.09?T('ดังมาก','Very loud'):T('ดังพอ','Good');
        if(!S.rec){
          if(!paused)pre+=dt;
          $('ctSec').textContent=Math.max(1,Math.ceil((PRE-pre)/1000));$('ctRingL').textContent=paused?T('พักไว้ก่อน','Paused'):T('เตรียมตัว','Get ready');
          if(pre>=PRE){S.rec=true;recAt=now;earPhase(1);earTip(1);$('ctLens').classList.add('rec');try{navigator.vibrate&&navigator.vibrate(30)}catch(e){}}
        }else{
          const r=now-recAt,p=Math.min(1,r/REC);
          if(G)LENS.slice(G,bins,hz,lastP,p);lastP=p;
          $('ctHand').style.transform=`rotate(${(p*360).toFixed(2)}deg)`;
          $('ctSec').textContent=String(Math.max(0,Math.ceil((REC-r)/1000))).padStart(2,'0');$('ctRingL').textContent=T('กำลังฟัง','Listening');
          earTip(r<4500?1:2);
          if(r>=REC){S.rec=false;resolve();return}
        }
        S.raf=requestAnimationFrame(loop);
      };loop();
    });
    if(run!==S.run){await cleanup();return}
    await cleanup();
    const pick=$('ctVehiclePicker');if(pick)pick.disabled=true;
    earPhase(2);$('ctLens').classList.remove('rec');$('ctLens').classList.add('busy');$('ctSec').innerHTML='<i class="ti ti-sparkles"></i>';$('ctRingL').textContent=T('AI กำลังฟัง','AI listening');
    const tip=$('ctTip');if(tip){tip.dataset.i='';tip.innerHTML=`<span class="ct-tip-ic"><span class="ct-dots"><i></i><i></i><i></i></span></span><span class="ct-tip-tx"><b>${T('กำลังวิเคราะห์เสียง','Analysing the sound')}</b><small>${T('ไม่เกินครึ่งนาที คุยต่อได้หลังจากนี้','Under half a minute — then back to the call')}</small></span>`}
    el.classList.add('thinking');
    const wav=await toWav(chunks,rate);
    if(!isCurrent()){finishEar(null,T('รถหรือบัญชีเปลี่ยนแล้ว ผลเก่าถูกยกเลิก','Vehicle or account changed; the old analysis was discarded'));return}
    if(maxLv<0.004){showEar({quality:'too_quiet',hear:'',causes:[],urgency:'soon',next:[T('ขยับมือถือเข้าใกล้จุดที่มีเสียงมากขึ้น แล้วลองใหม่','Move the phone closer to the sound and try again')],speak:''},true,selected);return}
    S.abort=new AbortController();
    const requestAbort=S.abort,requestTimer=setTimeout(()=>requestAbort.abort(),38000);
    const area=args.area||'',when=args.when||'';
    let data;
    try{data=await analyze('ear',[{mime:'audio/wav',b64:wav.b64}],{car:selected.vehicle,audioVehicle:VA.payload(selected),recording:{...recording,durationSeconds:wav.durationSeconds,sampleRate:wav.sampleRate,gain:wav.gain},phoneAt:area,soundWhen:when},
      T('ฟังเสียงจากรถคันนี้ระหว่างโทร','Listening to this car during a call')+(area?' · '+area:'')+(when?' · '+when:''),requestAbort.signal)}finally{clearTimeout(requestTimer)}
    if(!isCurrent()){if(run===S.run)finishEar(null,T('ข้อมูลรถเปลี่ยนแล้ว กรุณาเริ่มใหม่','Vehicle context changed. Please start again'));return;}
    showEar(data,false,selected);
  }catch(e){
    await cleanup();
    if(run!==S.run)return;
    const msg=e&&e.name==='NotAllowedError'?T('ต้องอนุญาตไมค์ก่อนนะครับ','Microphone permission is needed'):e?.name==='AbortError'?T('วิเคราะห์เสียงใช้เวลานานเกินไป ลองใหม่ภายหลังครับ','Audio analysis timed out. Please try again later'):(e&&e.message)||T('ฟังเสียงไม่สำเร็จ','Listening failed');
    finishEar(null,msg);toast(msg,'ti-alert-triangle');
  }
}
const URG={ok:['warn',T('ยังยืนยันความปลอดภัยไม่ได้','Safety is not established')],unassessed:['warn',T('ยังสรุปความผิดปกติไม่ได้','Not enough evidence for a verdict')],soon:['soon',T('ควรให้ช่างดูเร็ว ๆ นี้','Get it checked soon')],stop:['stop',T('หยุดขับ เรียกช่าง','Stop driving — get help')]};
const QUAL={good:T('เสียงชัด','Clear recording'),noisy:T('มีเสียงอื่นปน','Noisy recording'),too_quiet:T('เสียงเบาเกินไป','Too quiet'),no_engine:T('ไม่ได้ยินเสียงรถ','No engine sound')};
const LIKE={likely:[84,T('น่าจะใช่','Likely'),'hi'],possible:[54,T('เป็นไปได้','Possible'),'mid'],'less likely':[24,T('น้อยกว่า','Less likely'),'lo']};
/* ผลฟังเสียง: ลายเซ็นเสียง (ภาพหน้าปัดที่อัด) + ความด่วน + สิ่งที่ได้ยิน → น่าจะเป็นอะไร → ทำต่อ → คุยต่อ */
function showEar(d,local,sel){
  const el=$('ctLayer');if(!el)return;el.classList.remove('thinking');el.classList.add('done');
  const VA=window.CendonVehicleAudio,u=URG[d.urgency]||URG.soon,good=d.quality==='good';
  let sig='';try{sig=$('ctSpec').toDataURL('image/png')}catch(e){}
  const who=$('ctWho'),nm=(d.identity&&d.identity.label)||(sel&&VA?.label(sel.vehicle))||T('ไม่ระบุรุ่น','Vehicle not specified');
  if(who)who.innerHTML=`<div class="ct-who"><i class="ti ti-car"></i><b>${esc(nm)}</b><small>· ${T('ตามที่เลือก ไม่ได้ระบุจากเสียง','as selected, not identified from sound')}</small></div><button type="button" class="ct-x" id="ctClose" aria-label="${T('ปิด','Close')}"><i class="ti ti-x"></i></button>`;
  $('ctRun').hidden=true;
  const out=$('ctOut');out.hidden=false;
  out.innerHTML=`<div class="ct-rhero">${sig?`<img class="ct-sig" src="${sig}" alt="${T('ลายเซ็นเสียงของการอัดครั้งนี้','Sound signature of this recording')}">`:''}<div class="ct-rh">
      ${good?`<span class="ct-badge ${u[0]}"><i></i>${esc(u[1])}</span>`:`<span class="ct-badge warn"><i></i>${esc(QUAL[d.quality]||'')}</span>`}
      ${d.hear?`<p class="ct-lead">${esc(d.hear)}</p>`:`<p class="ct-lead">${esc(QUAL[d.quality]||'')}</p>`}
      ${d.normal?`<p class="ct-note">${esc(d.normal)}</p>`:''}</div></div>
    ${d.assessment&&VA?`<p class="ct-note ct-assess">${esc(VA.assessmentLabel(d.assessment,lang))}</p>`:''}
    ${(d.causes||[]).length?`<div class="ct-sec">${T('น่าจะเป็นอะไร','What it might be')}</div><div class="ct-causes">${d.causes.map(c=>{const L=LIKE[c.likelihood]||LIKE.possible;return `<div class="ct-cause"><b><span>${esc(c.name)}</span><em class="${L[2]}">${esc(L[1])}</em></b><span class="ct-bar ${L[2]}"><i style="--w:${L[0]}%"></i></span>${c.clue?`<small>${esc(c.clue)}</small>`:''}</div>`}).join('')}</div>`:''}
    <p class="ct-fine"><i class="ti ti-info-circle"></i>${T('ประเมินจากเสียงอย่างเดียว เป็นข้อสันนิษฐาน — ให้ช่างตรวจยืนยันก่อนซ่อม','Based on sound only, a hypothesis — have a mechanic confirm before any repair')}</p>
    ${(d.next||[]).length?`<div class="ct-sec">${T('ทำต่อ','Next')}</div><ol class="ct-todo">${d.next.map((x,i)=>`<li><span>${String(i+1).padStart(2,'0')}</span>${esc(x)}</li>`).join('')}</ol>`:''}
    ${VA?.researchMarkup(d.research,lang)||''}
    <div class="ct-acts"><button type="button" class="ct-b p" id="ctBack"><i class="ti cd-wv"></i>${T('คุยต่อกับ Cendon','Back to the call')}</button>
      <div class="ct-acts2">${d.urgency!=='ok'&&good?`<a class="ct-b" href="/${d.urgency==='stop'?'urgent':'post'}" id="ctHelp">${d.urgency==='stop'?T('เรียกช่างด่วน','Call help now'):T('หาช่างใกล้ฉัน','Find a mechanic')}</a>`:''}<button type="button" class="ct-b" id="ctAgain">${T('ฟังใหม่','Listen again')}</button></div></div>`;
  $('ctAgain').onclick=()=>listenEngine(null);
  $('ctBack').onclick=()=>finishEar(d);
  $('ctClose').onclick=()=>finishEar(d);
  const help=$('ctHelp');if(help)help.onclick=()=>{try{endCall()}catch(e){}};
  /* ส่งผลให้ AI พูดสรุปทันที (ผู้ใช้ไม่ต้องกดกลับก่อน) */
  const summary=local?T('อัดเสียงได้เบามากจนฟังไม่ออก ให้ผู้ใช้ขยับมือถือเข้าใกล้แล้วลองใหม่','The recording was too quiet to hear — ask the user to move closer and try again')
    :`ผลฟังเสียงเครื่องยนต์ ${REC_SEC} วินาที: รถที่ผู้ใช้ยืนยัน (ห้ามเดารุ่นจากเสียง) ${JSON.stringify(d.identity||{})} · คุณภาพเสียง ${d.quality} · ได้ยิน: ${d.hear} · ${d.normal||''} · สาเหตุที่ยังไม่ยืนยัน: ${(d.causes||[]).map(c=>c.name).join(', ')||'-'} · ความด่วน: ${d.urgency} ไม่ใช่การยืนยันว่าขับปลอดภัย · ทำต่อ: ${(d.next||[]).join(' / ')}${d.speak?' · ประโยคที่ควรพูด: '+d.speak:''}`;
  S.holdMic=false;S.muteAi=false;
  tellLive(summary,S.tool);S.tool=null;
  if(!local&&d.hear)remember(T('ผลฟังเสียงเครื่อง','Engine sound check')+` (${REC_SEC} ${T('วินาที','s')}) — ${URG[d.urgency]?URG[d.urgency][1]:''}\n${d.hear}${(d.causes||[]).length?'\n'+d.causes.map(c=>'• '+c.name+' — '+(LIKE[c.likelihood]||LIKE.possible)[1]).join('\n'):''}${(d.next||[]).length?'\n'+d.next.map(x=>'→ '+x).join('\n'):''}`);
}
function finishEar(d,why){
  const tool=S.tool;S.tool=null;
  closeLayer();
  if(tool&&!d)tellLive(why||T('ผู้ใช้ยกเลิกการฟังเสียง','The user cancelled the recording'),tool);
}

/* ═════════ 2) สแกนห้องเครื่องแบบสด (หมุดบนภาพกล้อง) ═════════
   เปิดกล้องหลัง → ส่งเฟรมที่ "เห็นบนจอจริง" ให้ AI ระบุตำแหน่งชิ้นส่วน → ปักหมุดตัวเลข+ป้ายชื่อทับภาพสด ไม่ต้องหยุดภาพ
   ขยับมือถือ หมุดเลื่อนตาม (เทียบภาพย่อ 96px ระหว่างเฟรมในเครื่อง ไม่ส่งอะไรเพิ่ม) · ภาพเปลี่ยนไปมากค่อยส่งเฟรมใหม่ให้ AI
   AI ในสายรู้ว่ากรอบไหนคืออะไร อยู่ตรงไหนบนจอ และแตะกรอบไหน AI อธิบายชิ้นนั้นให้ฟัง */
const scan=window.CendonEngineScan;
const LV={on:false,run:0,items:[],tr:null,pend:null,bw:96,bh:0,busy:false,lastAt:0,timer:0,frozen:false,told:'',toldAt:0,pick:-1,frames:0,noMore:false,scene:'',notes:[],quality:'',uncertain:0,frame:'',fails:0,vehicleKind:'unknown',guide:null};
/* ตัวติดตามภาพ: เทียบกับ "เฟรมอ้างอิง" ล่าสุด เลื่อนเกิน 5px ค่อยย้ายเฟรมอ้างอิง (สะสมระยะ) — แพนช้าไม่หาย แพนเร็วก็ไม่หลุด */
const mkTrack=g=>({ref:g,cx:0,cy:0,dx:0,dy:0,lost:0});
function step(tr,cur){
  const r=shiftOf(tr.ref,cur,LV.bw,LV.bh);
  if(r.err>34||Math.abs(r.dx)>=13||Math.abs(r.dy)>=13){tr.lost++;return false}
  tr.lost=0;tr.dx=tr.cx+r.dx;tr.dy=tr.cy+r.dy;
  if(Math.abs(r.dx)>=5||Math.abs(r.dy)>=5){tr.cx+=r.dx;tr.cy+=r.dy;tr.ref=cur}
  return true;
}
/* ส่วนของภาพกล้องที่ผู้ใช้เห็นจริงบนจอ (กล้องเต็มจอแบบ cover + ซูม) */
function view(){
  const v=$('callCam');if(!v||!v.videoWidth)return null;
  const W=v.clientWidth||innerWidth,H=v.clientHeight||innerHeight,vw=v.videoWidth,vh=v.videoHeight;
  const z=(typeof voice.camZoom==='number'&&voice.camZoom>1)?voice.camZoom:1,sc=Math.max(W/vw,H/vh)*z;
  const sw=Math.min(vw,W/sc),sh=Math.min(vh,H/sc);
  return {v,W,H,sx:(vw-sw)/2,sy:(vh-sh)/2,sw,sh,mirror:voice.camFacing==='user'};
}
function drawRegion(c,w,h,R){
  c.width=w;c.height=h;const g=c.getContext('2d',{willReadFrequently:true});g.save();
  if(R.mirror){g.translate(w,0);g.scale(-1,1)}
  g.drawImage(R.v,R.sx,R.sy,R.sw,R.sh,0,0,w,h);g.restore();return g;
}
const tiny=D.createElement('canvas');
function gray(R){
  const w=LV.bw,h=Math.max(24,Math.round(w*R.H/R.W));LV.bh=h;
  const d=drawRegion(tiny,w,h,R).getImageData(0,0,w,h).data,o=new Uint8Array(w*h);
  for(let i=0,j=0;i<o.length;i++,j+=4)o[i]=(d[j]*77+d[j+1]*150+d[j+2]*29)>>8;
  return o;
}
/* ภาพเลื่อนไปเท่าไรเทียบกับเฟรมที่ AI วิเคราะห์ — เทียบความต่างทีละตำแหน่ง แบบหยาบแล้วละเอียด */
function shiftOf(a,b,w,h){
  const R=14,m=R+2;let best=1e9,bx=0,by=0;
  const sad=(dx,dy,st)=>{let s=0,n=0;for(let y=m;y<h-m;y+=st)for(let x=m;x<w-m;x+=st){s+=Math.abs(a[y*w+x]-b[(y+dy)*w+x+dx]);n++}return n?s/n:1e9};
  for(let dy=-R;dy<=R;dy+=2)for(let dx=-R;dx<=R;dx+=2){const v=sad(dx,dy,3);if(v<best){best=v;bx=dx;by=dy}}
  const cx=bx,cy=by;
  for(let dy=cy-1;dy<=cy+1;dy++)for(let dx=cx-1;dx<=cx+1;dx++){if(Math.abs(dx)>R||Math.abs(dy)>R)continue;const v=sad(dx,dy,2);if(v<best){best=v;bx=dx;by=dy}}
  return {dx:bx,dy:by,err:best};
}
const where=b=>{const cx=(b[1]+b[3])/2000,cy=(b[0]+b[2])/2000;
  const h=cx<.34?'ซ้าย':cx>.66?'ขวา':'กลาง',v=cy<.34?'บน':cy>.66?'ล่าง':'กลาง';return h==='กลาง'&&v==='กลาง'?'กลางจอ':v==='กลาง'?'ฝั่ง'+h:h==='กลาง'?'ด้าน'+v:'มุม'+v+h};
function colorOf(){return scan?.color||'#FF514B'}
function setStat(kind,msg){
  const el=$('lvStat');if(!el)return;
  const n=LV.items.length;
  const txt={scan:n?T('ภาพเปลี่ยน กำลังสแกนใหม่…','View changed — rescanning…'):T('AI กำลังมองหาชิ้นส่วน…','Finding parts…'),
    found:T(`เจอ ${n} ชิ้น${LV.uncertain?' · จุดไม่ชัดยังไม่ปักหมุด':''}`,`${n} found${LV.uncertain?' · unclear parts omitted':''}`),
    none:LV.quality==='dark'?T('ภาพมืดเกินไป — เพิ่มแสงแล้วสแกนใหม่','Too dark — improve lighting and rescan'):LV.quality==='blurred'?T('ภาพไม่คม — ถือกล้องให้นิ่งแล้วสแกนใหม่','Blurred — hold steady and rescan'):LV.quality==='blocked'?T('ภาพถูกบัง — ขยับกล้องแล้วสแกนใหม่','View blocked — reposition and rescan'):T('ยังระบุไม่ได้ชัด — จอดให้ปลอดภัยแล้วเล็งภาพใหม่','No clear identification — park safely and reframe'),
    moved:T('ภาพเปลี่ยน — ซ่อนหมุดเดิมจนกว่าจะตรวจใหม่','View changed — hiding old pins until checked'),
    frozen:T('หยุดภาพไว้ · แตะหมุดเพื่อดูรายละเอียด','Paused · tap a pin for details'),err:msg||''}[kind]||'';
  el.className='lv-stat '+kind;el.innerHTML=(kind==='scan'?'<span class="ct-dots"><i></i><i></i><i></i></span>':kind==='err'?'<i class="ti ti-alert-triangle"></i>':kind==='frozen'?'<i class="ti ti-player-pause"></i>':'<i class="ti ti-scan"></i>')+esc(txt);
  const L2=$('ctLayer');if(L2)L2.classList.toggle('lv-searching',kind==='scan'&&!n);
}
/* หมุดตัวเลขกลางชิ้นส่วน + ป้ายชื่อเล็ก (ไม่มีกล่องทึบบังภาพ) · ชิ้นที่ต้องระวัง = หมุดสีอำพัน · เลือกอยู่ = มุมกรอบบาง ๆ */
const HZ={high_voltage:T('ไฟฟ้าแรงสูง ห้ามแตะ','High voltage — do not touch'),keep_clear:T('ร้อนหรือหมุนได้ อย่าเข้าใกล้','Hot or moving — keep clear')};
const num=i=>String(i+1).padStart(2,'0');
function paintBoxes(){
  const box=$('lvBoxes'),chips=$('lvChips');if(!box)return;
  const keep={};box.querySelectorAll('.lv-box').forEach(b=>keep[b.dataset.k]=b);
  LV.items.forEach((x,i)=>{
    const [y0,x0,y1,x1]=x.box,c=colorOf(),k=x.key;
    let el=keep[k];delete keep[k];
    if(!el){el=D.createElement('button');el.type='button';el.className='lv-box new';el.dataset.k=k;el.innerHTML='<span class="lv-pin"><b></b></span><span class="lv-tag"><em></em></span>';box.appendChild(el);setTimeout(()=>el.classList.remove('new'),500)}
    el.dataset.i=i;el.style.setProperty('--c',c);
    Object.assign(el.style,{left:x0/10+'%',top:y0/10+'%',width:(x1-x0)/10+'%',height:(y1-y0)/10+'%'});
    el.classList.toggle('right',(x0+x1)/2>560);el.classList.toggle('on',LV.pick===i);el.classList.toggle('warn',x.hazard!=='observe');el.classList.toggle('dim',LV.pick>=0&&LV.pick!==i);
    el.querySelector('b').textContent=num(i);el.querySelector('em').textContent=x.name;el.setAttribute('aria-label',num(i)+' '+x.name+(HZ[x.hazard]?' — '+HZ[x.hazard]:''));
    el.onclick=()=>pickPart(i);
  });
  Object.values(keep).forEach(b=>{b.classList.add('gone');setTimeout(()=>b.remove(),300)});
  if(chips)chips.innerHTML=LV.items.map((x,i)=>`<button type="button" class="lv-chip${LV.pick===i?' on':''}${x.hazard!=='observe'?' warn':''}" data-i="${i}"><b>${num(i)}</b><span><em>${esc(x.name)}</em><small>${esc(HZ[x.hazard]||x.what||x.evidence)}</small></span><i class="ti ti-chevron-right"></i></button>`).join('');
  if(chips)chips.querySelectorAll('[data-i]').forEach(b=>b.onclick=()=>pickPart(+b.dataset.i));
}
function closeDet(){LV.pick=-1;const det=$('lvDet');if(det)det.hidden=true;const ch=$('lvChips');if(ch)ch.hidden=false;paintBoxes()}
function pickPart(i){
  const x=LV.items[i],R=view();if(!x||!R||!scan.fresh({frame:LV.frame,current:scan.frameKey(R),track:LV.tr,hidden:D.hidden}))return;LV.pick=i;paintBoxes();
  const det=$('lvDet'),n=LV.items.length;det.hidden=false;det.style.setProperty('--c',colorOf(x.name));
  const ch=$('lvChips');if(ch)ch.hidden=true;
  det.innerHTML=`<div class="lv-dh"><span class="lv-n">${num(i)} / ${String(n).padStart(2,'0')}</span><span class="lv-nav">${n>1?`<button type="button" class="lv-nb" id="lvPrev" aria-label="${T('ชิ้นก่อนหน้า','Previous part')}"><i class="ti ti-chevron-left"></i></button><button type="button" class="lv-nb" id="lvNext" aria-label="${T('ชิ้นถัดไป','Next part')}"><i class="ti ti-chevron-right"></i></button>`:''}<button type="button" class="ct-x" id="lvDetX" aria-label="${T('ปิด','Close')}"><i class="ti ti-x"></i></button></span></div>
    <h3 class="lv-dt">${esc(x.name)}</h3>${HZ[x.hazard]?`<span class="lv-hz"><i class="ti ti-alert-triangle"></i>${esc(HZ[x.hazard])}</span>`:''}
    <dl class="lv-dl">${x.what?`<div><dt>${T('คืออะไร','What it is')}</dt><dd>${esc(x.what)}</dd></div>`:''}<div><dt>${T('AI ดูจาก','Identified by')}</dt><dd>${esc(x.evidence)}</dd></div>${x.check?`<div class="warn"><dt>${T('ความปลอดภัย','Safety')}</dt><dd>${esc(x.check)}</dd></div>`:''}</dl>
    <small>${T('AI อาจระบุผิด หมุดไม่ได้แปลว่าชำรุด · Cendon กำลังอธิบายชิ้นนี้ในสาย','AI may be wrong; a pin does not mean damage · Cendon is explaining this part on the call')}</small>`;
  $('lvDetX').onclick=closeDet;
  if(n>1){$('lvPrev').onclick=()=>pickPart((i-1+n)%n);$('lvNext').onclick=()=>pickPart((i+1)%n)}
  /* แตะหมุด = ให้ AI ในสายอธิบายชิ้นนี้ด้วยเสียง */
  tellLive(`ผู้ใช้แตะหมุดหมายเลข ${i+1} "${x.name}" (${where(x.box)}) · สิ่งที่ใช้ระบุ: ${x.evidence} · หน้าที่: ${x.what} · ข้อควรระวัง: ${x.check} · เป็นการระบุจากภาพที่อาจผิด ไม่ใช่ผลวินิจฉัย ห้ามเพิ่มคำแนะนำให้สัมผัส เปิดฝา ถอดสาย หรือซ่อม อธิบายสั้น ๆ เท่านั้น`);
}
function tellScan(force){
  const names=LV.items.map(x=>x.name+':'+where(x.box)).join('|');
  if(!force&&(names===LV.told||Date.now()-LV.toldAt<12000))return;
  /* ครั้งแรกให้ AI พูดสรุป · ครั้งต่อ ๆ ไป (ขยับกล้องแล้วกรอบเปลี่ยน) แค่อัปเดตให้ AI รู้ ไม่พูดแทรกทุกครั้ง */
  const quiet=!force&&!!LV.told;
  LV.told=names;LV.toldAt=Date.now();
  const msg=LV.items.length?`ผลสแกนชิ้นส่วนรถ (${LV.vehicleKind==='motorcycle'?'ภาพมอเตอร์ไซค์':LV.vehicleKind==='car'?'ภาพรถยนต์':'ยังไม่ยืนยันประเภทพาหนะ'} อาจไม่ใช่รถที่เลือกไว้ใน garage): หมุดหมายเลขบอกตำแหน่ง ไม่ได้แปลว่าชำรุด AI อาจระบุผิด พบ ${LV.items.map((x,i)=>`${i+1}. ${x.name} (${where(x.box)}) — ${x.evidence}`).join(' · ')} · ยังไม่ยืนยัน ${LV.uncertain} จุด ห้ามเดาจุดที่ไม่เห็น ห้ามสอนให้แตะ เปิดฝา หรือถอดสาย จอด ดับเครื่องและปล่อยให้เย็นก่อนดูใกล้ ๆ`
    :`ผลสแกน: ยังระบุไม่ได้ชัด (${LV.scene||'unclear'}, ${LV.quality||'unclear'}) ไม่มีหมุดที่ยืนยันได้ ห้ามเดาจากรุ่นรถ ให้ผู้ใช้จอดให้ปลอดภัยแล้วถ่ายให้ชัดขึ้น`;
  tellLive(msg+(LV.guide?' · ข้อจำกัดภาพจากระบบ: '+LV.guide.message+' · ห้ามให้ถอดฝา แฟริ่ง เบาะ หรือถังเพื่อสแกนให้ครบ':''),S.tool,quiet);S.tool=null;
}
async function detect(){
  if(LV.busy||!LV.on||LV.frozen||LV.noMore||D.hidden)return;
  const R=view();if(!R)return;
  const run=LV.run,frame=scan.frameKey(R);LV.busy=true;setStat('scan');
  $('lvBoxes')?.classList.add('stale');$('lvChips').hidden=true;$('lvDet').hidden=true;LV.pick=-1;
  const {w,h}=scan.captureSize(R),c=D.createElement('canvas');
  drawRegion(c,w,h,R);const base=gray(R),b64=c.toDataURL('image/jpeg',0.8).split(',')[1];
  /* ติดตามภาพตั้งแต่ตอนถ่ายเฟรมนี้ — ระหว่างรอ AI ตอบ กล้องขยับไปเท่าไรก็รู้ กรอบใหม่จึงวางตรงทันที */
  LV.pend=mkTrack(base);
  const controller=new AbortController();S.abort=controller;const timeout=setTimeout(()=>controller.abort(),20000);
  try{
    const d=scan.read(await analyze('baylive',[{mime:'image/jpeg',b64}],{car:carCtx(),live:true},T('ระบุชิ้นส่วนที่เห็นจริงในห้องเครื่อง','Identify visible engine-bay components'),controller.signal));
    if(run!==LV.run||!LV.on)return;
    const current=view();if(!current||!scan.fresh({frame,current:scan.frameKey(current),track:LV.pend,hidden:D.hidden})){LV.tr=null;LV.lastAt=Date.now();setStat('moved');return;}
    LV.frames++;LV.lastAt=Date.now();LV.tr=LV.pend;LV.pend=null;LV.frame=frame;LV.fails=0;
    LV.scene=d.scene;LV.quality=d.quality;LV.uncertain=d.uncertain;LV.notes=[];LV.items=d.items;LV.vehicleKind=d.vehicleKind;LV.guide=d.coverGuidance;
    const title=$('lvTitle');if(title)title.textContent=LV.vehicleKind==='motorcycle'?T('รู้จักชิ้นส่วนมอเตอร์ไซค์','Know your motorcycle'):T('สแกนห้องเครื่อง','Engine-bay scan');
    const guide=$('lvCover');if(guide){guide.hidden=!LV.guide?.coverVisible;guide.textContent=LV.guide?.message||'';}
    const bx=$('lvBoxes');if(bx){bx.style.transition='none';bx.style.transform=`translate(${(LV.tr.dx*R.W/LV.bw).toFixed(1)}px,${(LV.tr.dy*R.H/LV.bh).toFixed(1)}px)`;bx.classList.remove('stale')}
    paintBoxes();$('lvChips').hidden=false;setStat(LV.items.length?'found':'none');
    if(LV.items.length&&LV.frames===1)try{navigator.vibrate&&navigator.vibrate([12,40,12])}catch(e){}
    tellScan(!!S.tool);
  }catch(e){
    if(run!==LV.run||!LV.on)return;
    LV.lastAt=Date.now();LV.fails++;LV.tr=null;
    if(e.code==='feature_quota'||e.code==='quota'||e.status===429||e.status===401||e.status===403)LV.noMore=true;
    if(LV.fails>=3)LV.noMore=true;
    const msg=e.name==='AbortError'?T('ใช้เวลานานเกินไป — แตะสแกนใหม่','Scan timed out — tap Rescan'):e.message==='scan_version'?T('ระบบสแกนสองฝั่งยังเป็นคนละรุ่น กรุณาอัปเดต backend และเว็บพร้อมกัน','Scanner versions differ. Update the backend and website together.'):e.message;
    setStat('err',msg);
    if(S.tool){tellLive(msg,S.tool);S.tool=null}
  }finally{clearTimeout(timeout);if(S.abort===controller)S.abort=null;if(run===LV.run){LV.busy=false;LV.pend=null}}
}
function track(){
  if(!LV.on||LV.frozen||D.hidden)return;
  const R=view();if(!R)return;
  const cur=gray(R);
  if(LV.pend){if(cur.length===LV.pend.ref.length)step(LV.pend,cur);else LV.pend.lost++;}
  const bx=$('lvBoxes');
  if(LV.tr&&(cur.length!==LV.tr.ref.length||scan.frameKey(R)!==LV.frame)){LV.tr=null;$('lvChips').hidden=true;$('lvDet').hidden=true;LV.pick=-1;setStat('moved');}
  if(!LV.tr){if(bx)bx.classList.add('stale');if(!LV.busy&&!LV.noMore&&Date.now()-LV.lastAt>Math.min(30000,2500*2**LV.fails))detect();return}
  const tr=LV.tr,ok=step(tr,cur);
  if(ok&&bx){bx.style.transition='transform .12s linear';bx.style.transform=`translate(${(tr.dx*R.W/LV.bw).toFixed(1)}px,${(tr.dy*R.H/LV.bh).toFixed(1)}px)`}
  if(bx)bx.classList.toggle('stale',tr.lost>0||LV.busy);
  if(tr.lost>0){$('lvChips').hidden=true;$('lvDet').hidden=true;LV.pick=-1;setStat('moved');}
  else if(!LV.busy&&LV.pick<0){$('lvChips').hidden=false;}
  /* ภาพเปลี่ยนไปมาก หรือเลื่อนไปไกลจนกรอบเริ่มหลุดขอบ → ให้ AI ดูเฟรมใหม่ (ไม่ถี่กว่า 2.5 วิ) */
  const moved=Math.hypot(tr.dx,tr.dy)>LV.bw*.18&&Date.now()-LV.lastAt>3000;
  if((tr.lost>2||moved||Date.now()-LV.lastAt>15000)&&!LV.busy&&!LV.noMore&&Date.now()-LV.lastAt>2500)detect();
}
function stopLive(){
  LV.on=false;LV.run++;clearInterval(LV.timer);LV.timer=0;LV.busy=false;
  if(S.abort){S.abort.abort();S.abort=null;}
  const v=$('callCam');if(LV.frozen&&v)v.play().catch(()=>{});LV.frozen=false;
}
function invalidateFrame(){
  if(!LV.on)return;
  LV.tr=null;LV.pend=null;LV.lastAt=0;LV.pick=-1;
  $('lvBoxes')?.classList.add('stale');if($('lvChips'))$('lvChips').hidden=true;if($('lvDet'))$('lvDet').hidden=true;setStat('moved');
}
async function scanBay(tool){
  if(!voice.callActive)return;
  if(!scan){toast(T('ระบบสแกนยังโหลดไม่ครบ กรุณาโหลดหน้าใหม่','Scanner assets unavailable. Reload the page.'),'ti-alert-circle');if(tool)tellLive('Scanner unavailable',tool);return;}
  if(S.mode)closeLayer();
  const run=++S.run;S.mode='bay';S.tool=tool||null;
  /* สแกนต้องใช้กล้องหลัง */
  try{if(voice.camOn&&voice.camFacing==='user')await voice.flipCamera();else if(!voice.camOn){if(voice.camFacing!=='environment')voice.camFacing='environment';await voice.toggleCamera()}}catch(e){}
  if(run!==S.run)return;
  if(!voice.camOn){const why=T('เปิดกล้องไม่ได้ — ต้องอนุญาตกล้องก่อน','Camera unavailable — allow camera access');toast(why,'ti-video-off');finishBay(why);return}
  const el=layer();el.classList.add('ct-live');
  el.innerHTML=`<div class="lv-boxes" id="lvBoxes"></div><div class="lv-sweep"></div><div class="lv-frame" aria-hidden="true"><i></i><i></i><i></i><i></i></div>
    <header class="ct-hd lv-hd"><div><b id="lvTitle">${T('สแกนห้องเครื่อง','Engine-bay scan')}</b><small>${T('ชี้กล้องไปที่ห้องเครื่อง · AI ปักหมุดชิ้นส่วนให้เอง','Point at the engine bay · AI pins the parts')}</small></div><button type="button" class="ct-x" id="ctClose" aria-label="${T('ปิด','Close')}"><i class="ti ti-x"></i></button></header>
    <div class="lv-top"><p class="lv-stat" id="lvStat" role="status" aria-live="polite"></p><p class="lv-safety"><i class="ti ti-alert-triangle"></i>${T('จอด · ดับเครื่อง · มองอย่างเดียว','Park · engine off · look only')}</p></div>
    <div class="lv-dock"><p class="lv-cover" id="lvCover" hidden></p><div class="lv-det" id="lvDet" hidden></div><div class="lv-chips" id="lvChips" aria-label="${T('ชิ้นส่วนที่ระบุได้','Identified components')}"></div><small class="lv-legend">${T('หมุด = ตำแหน่งที่ AI เห็น ไม่ได้แปลว่าชำรุด · AI อาจระบุผิด','A pin marks what the AI sees, not damage · AI may be wrong')}</small>
      <div class="lv-acts"><button type="button" class="lv-b" id="lvRe"><i class="ti ti-refresh"></i>${T('สแกนใหม่','Rescan')}</button><button type="button" class="lv-b" id="lvFreeze"><i class="ti ti-player-pause"></i>${T('หยุดภาพ','Pause')}</button><button type="button" class="lv-b p" id="lvDone">${T('เสร็จ','Done')}</button></div></div>`;
  Object.assign(LV,{on:true,run:LV.run+1,items:[],tr:null,pend:null,busy:false,lastAt:0,frozen:false,told:'',toldAt:0,pick:-1,frames:0,noMore:false,scene:'',notes:[],quality:'',uncertain:0,frame:'',fails:0,vehicleKind:'unknown',guide:null});
  setStat('scan');
  $('ctClose').onclick=()=>finishBay();
  $('lvDone').onclick=()=>finishBay();
  $('lvRe').onclick=()=>{LV.noMore=false;LV.fails=0;LV.lastAt=0;if(LV.frozen)$('lvFreeze').click();detect()};
  $('lvFreeze').onclick=()=>{const v=$('callCam');LV.frozen=!LV.frozen;
    if(LV.frozen){v.pause();setStat('frozen')}else{v.play().catch(()=>{});LV.tr=null;LV.lastAt=0;$('lvBoxes').classList.add('stale');$('lvChips').hidden=true;$('lvDet').hidden=true;setStat('scan')}
    $('lvFreeze').innerHTML=LV.frozen?`<i class="ti ti-player-play"></i>${T('เล่นต่อ','Resume')}`:`<i class="ti ti-player-pause"></i>${T('หยุดภาพ','Pause')}`};
  /* รอภาพกล้องพร้อม แล้วสแกนทันที — จากนั้นติดตามภาพ ~9 ครั้ง/วิ */
  const t0=Date.now();while(!view()&&Date.now()-t0<4000){await new Promise(r=>setTimeout(r,100));if(run!==S.run)return}
  if(run!==S.run)return;
  if(!view()){LV.noMore=true;setStat('err',T('ยังไม่ได้ภาพจากกล้อง ตรวจสิทธิ์กล้องแล้วแตะสแกนใหม่','No camera frame yet. Check camera permission and tap Rescan.'));return;}
  await new Promise(r=>setTimeout(r,350));
  detect();
  LV.timer=setInterval(track,110);
}
function finishBay(why){
  const tool=S.tool;S.tool=null;
  const R=view(),current=R&&scan?.fresh({frame:LV.frame,current:scan.frameKey(R),track:LV.tr,hidden:D.hidden});
  const items=current?LV.items.slice():[];stopLive();
  closeLayer();
  if(tool)tellLive(why||T('ผู้ใช้ปิดการสแกนก่อนได้ผล','The user closed the scan before a result'),tool);
  if(items.length)remember(T('AI ระบุชิ้นส่วนจากภาพ (อาจผิด ไม่ใช่การตรวจสภาพ)','AI visual identification (may be wrong, not an inspection)')+'\n'+items.map((x,i)=>`${i+1}. ${x.name}`).join('\n'));
}

/* ── AI เรียกเครื่องมือเอง ── */
function onToolCall(tc){
  const calls=(tc&&tc.functionCalls)||[];
  for(const c of calls){
    if(c.name==='listen_engine'){listenEngine(c);return}
    if(c.name==='scan_engine_bay'){scanBay(c);return}
    try{voice.callWS.send(JSON.stringify({toolResponse:{functionResponses:[{id:c.id,name:c.name,response:{error:'unknown tool'}}]}}))}catch(e){}
  }
}
function onCancel(ids){ if(S.tool&&(!ids||ids.includes(S.tool.id))){S.tool=null;if(S.mode==='bay')finishBay();else closeLayer()} }

/* ── ปุ่มบนหน้าโทร ── */
function mountButtons(){
  const ui=$('callUI');if(!ui||$('ctTools'))return;
  const bar=D.createElement('div');bar.id='ctTools';bar.className='ct-tools';
  bar.innerHTML=`<button type="button" id="ctEarBtn"><span class="ct-tic"><i class="ti ti-wave-sine"></i></span><span class="ct-tt"><b>${T('ฟังเสียงเครื่อง','Listen to engine')}</b><small>${T(`${REC_SEC} วินาที`,`${REC_SEC} seconds`)}</small></span></button><button type="button" id="ctBayBtn"><span class="ct-tic"><i class="ti ti-scan"></i></span><span class="ct-tt"><b>${T('สแกนห้องเครื่อง','Scan the engine bay')}</b><small>${T('ชี้กล้อง','Point the camera')}</small></span></button>`;
  ui.querySelector('.hh-top').after(bar);
  $('ctEarBtn').onclick=()=>{if(!voice.callActive)return toast(T('รอต่อสายให้ติดก่อนนะครับ','Wait for the call to connect'),'ti-phone');listenEngine(null)};
  $('ctBayBtn').onclick=()=>{if(!voice.callActive)return toast(T('รอต่อสายให้ติดก่อนนะครับ','Wait for the call to connect'),'ti-phone');scanBay(null)};
}
mountButtons();
D.addEventListener?.('visibilitychange',invalidateFrame);
window.addEventListener?.('resize',invalidateFrame);

return Object.freeze({
  get holdMic(){return S.holdMic},get muteAi(){return S.muteAi},get busy(){return !!S.mode},
  onToolCall,onCancel,reset:closeLayer,listen:listenEngine,scan:scanBay,dispose(){closeLayer();$('ctTools')?.remove();D.removeEventListener?.('visibilitychange',invalidateFrame);window.removeEventListener?.('resize',invalidateFrame);},
  /* บอกผู้ช่วยเสียงว่ามีเครื่องมืออะไร (ต่อท้าย system prompt ของการโทร) */
  prompt:()=>'\nเครื่องมือระหว่างโทร: เสียงเครื่องให้เรียก listen_engine · หากผู้ใช้ให้ดู ระบุ สแกน หรืออธิบายห้องเครื่อง ชิ้นส่วนรถยนต์ มอเตอร์ไซค์ หรือสกู๊ตเตอร์ ให้เรียก scan_engine_bay ซึ่งระบุชิ้นส่วนจากภาพจริงพร้อมหมุดหมายเลขและชื่อบนภาพ แตะหมุดเพื่อฟังคำอธิบาย หมุดไม่ได้แปลว่าชำรุด เป็นเพียงการระบุที่อาจผิด ไม่ใช่การตรวจสภาพ ห้ามอ้างว่ารู้ทุกจุดหรือเห็นชิ้นส่วนที่ถูกบัง ห้ามแนะนำให้สัมผัส เปิดฝา ถอดสาย ซ่อมเอง หรือเข้าใกล้สายไฟแรงดันสูง ให้จอด ดับเครื่องและรอให้เย็นก่อนดูใกล้ ๆ ห้ามให้ถอดฝาครอบ แฟริ่ง เบาะ หรือถังน้ำมันเพื่อสแกนให้ครบ อธิบายเฉพาะผลเครื่องมือล่าสุด'
});
}
window.CallTools=Object.freeze({create});
})();
