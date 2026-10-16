/* เครื่องมือระหว่างโทรคุยกับ Cendon (chat.html)
   1) ฟังเสียงเครื่อง: ไมค์ปกติของการโทรเปิดตัวกรองเสียงรบกวนไว้ (ให้ได้ยินคำพูดชัด) เสียงเครื่องยนต์จึงถูกตัดทิ้งก่อนถึง AI
      โหมดนี้ปิดตัวกรองทั้งหมด อัดเสียงดิบ 10 วินาที แสดงภาพคลื่นความถี่สด แล้วส่งให้ AI ฟังจริง ผลกลับเข้าไปในสายให้ผู้ช่วยพูดต่อ
   2) สแกนห้องเครื่อง: ถ่ายภาพคมจากกล้องหลัง AI ตีกรอบชิ้นส่วนที่เห็นจริงบนภาพ แตะดูว่าคืออะไร เช็กเองยังไง
   ผู้ช่วยเสียงเรียกสองอย่างนี้เองได้ (พูดว่า "ฟังเสียงเครื่องหน่อย" / "ดูห้องเครื่องให้หน่อย") หรือกดปุ่มบนจอ
   ใช้ตัวแปรของหน้าโทรใน chat.html (callWS, callCtx, callMicStream, camOn …) ซึ่งอยู่ใน global scope เดียวกัน */
(function(){
'use strict';
const D=document,$=id=>D.getElementById(id);
const T=(th,en)=>(typeof lang!=='undefined'&&lang==='en')?en:th;
const esc=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const REC_SEC=10;
const S={mode:'',holdMic:false,muteAi:false,tool:null,abort:null,raf:0,run:0};

/* ── ส่งผลกลับเข้าไปในสาย ── ถ้า AI เป็นคนเรียกเครื่องมือ ตอบเป็น toolResponse · ถ้าผู้ใช้กดเอง ส่งเป็นข้อมูลจากระบบให้ AI สรุปให้ฟัง */
function tellLive(text,tool){
  try{
    if(typeof callWS==='undefined'||!callWS||callWS.readyState!==1)return;
    if(tool&&tool.id)callWS.send(JSON.stringify({toolResponse:{functionResponses:[{id:tool.id,name:tool.name,response:{result:text}}]}}));
    else callWS.send(JSON.stringify({clientContent:{turns:[{role:'user',parts:[{text:'[ข้อมูลจากระบบ ไม่ใช่คำพูดของผู้ใช้] '+text+'\nสรุปให้ผู้ใช้ฟังสั้น ๆ เป็นภาษาพูด แล้วถามว่าอยากให้ช่วยอะไรต่อ'}]}],turnComplete:true}}));
  }catch(e){}
}
function remember(text){
  try{if(typeof messages!=='undefined'){messages.push({role:'ai',text});if(typeof saveSession==='function')saveSession()}}catch(e){}
}
function carCtx(){
  try{const c=(typeof selCar==='function'&&selCar())||{};return {make:c.make||c.name||'',model:c.model||'',year:c.year||'',mileage:c.mileage||'',fuel:c.fuel||c.fuelType||''}}catch(e){return {}}
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
    body:JSON.stringify({tool,attachments,context,question,lang:T('th','en')})});
  const d=await r.json().catch(()=>null);
  if(!r.ok){
    if(d&&d.error==='feature_quota')throw Error(T(`ใช้เครื่องมือนี้ครบ ${d.limit} ครั้งของวันนี้แล้ว พรุ่งนี้ใช้ได้อีกครับ`,`You've used this ${d.limit} times today. Try again tomorrow.`));
    if(r.status===429)throw Error(T('โควตา AI วันนี้หมดแล้ว','Daily AI quota reached'));
    throw Error(T('วิเคราะห์ไม่ได้ชั่วคราว ลองอีกครั้งนะครับ','Analysis is unavailable right now. Please try again.'));
  }
  if(!d||!d.data)throw Error(T('ยังไม่ได้ผลจาก AI ลองอีกครั้งนะครับ','No result yet. Please try again.'));
  return d.data;
}

/* ── ชั้นเต็มจอบนหน้าโทร ── */
function layer(){
  let el=$('ctLayer');
  if(!el){el=D.createElement('section');el.id='ctLayer';el.className='ct-layer';el.setAttribute('role','dialog');el.setAttribute('aria-modal','true');$('callUI').appendChild(el)}
  el.hidden=false;el.className='ct-layer';$('callUI').classList.add('ct-on');return el;
}
function closeLayer(){
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
  const t=callMicStream&&callMicStream.getAudioTracks()[0];
  if(t&&t.readyState==='live'&&t.applyConstraints){
    try{
      await t.applyConstraints({echoCancellation:false,noiseSuppression:false,autoGainControl:false});
      const st=t.getSettings?t.getSettings():{};
      if(st.noiseSuppression===false&&st.echoCancellation===false)
        return {stream:callMicStream,restore:()=>t.applyConstraints({echoCancellation:true,noiseSuppression:true,autoGainControl:true}).catch(()=>{})};
    }catch(e){}
  }
  const s=await navigator.mediaDevices.getUserMedia({audio:{channelCount:1,echoCancellation:false,noiseSuppression:false,autoGainControl:false}});
  return {stream:s,restore:async()=>{s.getTracks().forEach(x=>x.stop());await reviveMic()}};
}
/* บางเครื่อง (iPhone) เปิดไมค์ที่สองแล้วตัดไมค์แรก → ต่อไมค์ของสายกลับให้เอง */
async function reviveMic(){
  try{
    const t=callMicStream&&callMicStream.getAudioTracks()[0];
    if(!callActive||(t&&t.readyState==='live'))return;
    const s=await navigator.mediaDevices.getUserMedia({audio:{channelCount:1,echoCancellation:true,noiseSuppression:true,autoGainControl:true}});
    try{callMicNode&&callMicNode.disconnect()}catch(e){}callMicNode=null;
    try{callMicSrc&&callMicSrc.disconnect()}catch(e){}callMicSrc=null;
    if(callMicStream)callMicStream.getTracks().forEach(x=>x.stop());
    callMicStream=s;await startMicStream(callSession);
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
  return {b64:b64FromBytes(new Uint8Array(b)),peak};
}
/* สีคลื่นความถี่: ดำ → แดงเข้ม → ส้ม Cendon → ครีม */
const EMBER=(()=>{const st=[[0,[14,9,8]],[.3,[92,22,18]],[.55,[214,72,40]],[.78,[255,150,70]],[1,[255,240,214]]],o=new Uint8ClampedArray(256*3);
  for(let i=0;i<256;i++){const x=i/255;let k=0;while(k<st.length-2&&x>st[k+1][0])k++;const [a,ca]=st[k],[b,cb]=st[k+1],f=(x-a)/(b-a||1);
    for(let j=0;j<3;j++)o[i*3+j]=ca[j]+(cb[j]-ca[j])*f}return o})();

async function listenEngine(tool){
  if(!callActive)return;
  if(S.mode)closeLayer();
  const run=++S.run,args=(tool&&tool.args)||{};
  S.mode='ear';S.tool=tool||null;
  const el=layer();el.classList.add('ct-ear');
  el.innerHTML=`<header class="ct-hd"><div><b>${T('ฟังเสียงเครื่อง','Engine listening')}</b><small>${T('เสียงดิบ ไม่ผ่านตัวกรองเสียงรบกวน · AI ได้ยินทุกเสียง','Raw audio, no noise filter — the AI hears every sound')}</small></div><button type="button" class="ct-x" id="ctClose" aria-label="${T('ปิด','Close')}"><i class="ti ti-x"></i></button></header>
    <div class="ct-scope"><canvas id="ctSpec"></canvas><div class="ct-axis"><span>8k</span><span>2k</span><span>500</span><span>100 Hz</span></div>
      <div class="ct-ring" id="ctRing"><svg viewBox="0 0 120 120"><circle cx="60" cy="60" r="54" class="bg"/><circle cx="60" cy="60" r="54" class="fg" id="ctArc"/></svg><b id="ctSec">3</b><small id="ctRingL">${T('เตรียมตัว','Get ready')}</small></div></div>
    <div class="ct-meter"><i id="ctLvl"></i></div>
    <ol class="ct-steps" id="ctSteps"><li class="on"><i class="ti ti-device-mobile"></i>${T('จ่อมือถือห่างจุดที่มีเสียง 20–50 ซม.','Hold the phone 20–50 cm from the sound')}</li><li><i class="ti ti-engine"></i>${T('ปล่อยเครื่องเดินเบา','Let it idle')}</li><li><i class="ti ti-gauge"></i>${T('เร่งเบา ๆ 2–3 ครั้ง (เกียร์ P หรือ N)','Rev gently 2–3 times (in P or N)')}</li></ol>
    <div class="ct-out" id="ctOut" hidden></div>`;
  $('ctClose').onclick=()=>{finishEar(null,T('ยกเลิกการฟังเสียง','Listening cancelled'));};
  /* หยุดเสียง AI ที่ค้างอยู่ ไม่ให้เสียงพูดของ AI ถูกอัดปนไปด้วย */
  S.holdMic=true;S.muteAi=true;
  try{callWS&&callWS.readyState===1&&callWS.send(JSON.stringify({realtimeInput:{audioStreamEnd:true}}))}catch(e){}
  const wait=Date.now();while(playSrcs.length&&Date.now()-wait<5000){await new Promise(r=>setTimeout(r,120));if(run!==S.run)return}
  flushPlayback();
  let mic=null,src=null,an=null,node=null;const chunks=[];let rate=callCtx?callCtx.sampleRate:48000,maxLv=0;
  const cleanup=async()=>{try{src&&src.disconnect();an&&an.disconnect();node&&node.disconnect()}catch(e){}if(mic){const m=mic;mic=null;await m.restore()}};
  try{
    mic=await rawMic();if(run!==S.run){await cleanup();return}
    const ctx=callCtx;rate=ctx.sampleRate;
    src=ctx.createMediaStreamSource(mic.stream);an=ctx.createAnalyser();an.fftSize=2048;an.smoothingTimeConstant=0.2;src.connect(an);
    const sink=ctx.createGain();sink.gain.value=0;sink.connect(ctx.destination);
    try{const url=URL.createObjectURL(new Blob([RAW_WORKLET],{type:'application/javascript'}));try{await ctx.audioWorklet.addModule(url)}finally{URL.revokeObjectURL(url)}
      node=new AudioWorkletNode(ctx,'cendon-raw');}
    catch(e){node=ctx.createScriptProcessor(4096,1,1);node.onaudioprocess=ev=>{if(S.rec)chunks.push(new Float32Array(ev.inputBuffer.getChannelData(0)))}}
    if(node.port)node.port.onmessage=ev=>{if(S.rec)chunks.push(ev.data)};
    src.connect(node);node.connect(sink);
    /* วาดคลื่นความถี่สด (แกนตั้งแบบลอการิทึม 60Hz–8kHz) */
    const cv=$('ctSpec'),g=cv.getContext('2d'),dpr=Math.min(2,devicePixelRatio||1);
    const fit=()=>{cv.width=Math.round(cv.clientWidth*dpr)||600;cv.height=Math.round(cv.clientHeight*dpr)||300;g.fillStyle='rgb(14,9,8)';g.fillRect(0,0,cv.width,cv.height)};fit();
    const bins=new Uint8Array(an.frequencyBinCount),td=new Float32Array(an.fftSize),hz=rate/an.fftSize;
    const map=[];const H=()=>cv.height;
    const buildMap=()=>{map.length=0;for(let y=0;y<H();y++){const f=Math.exp(Math.log(60)+(1-y/H())*(Math.log(8000)-Math.log(60)));map.push(Math.min(bins.length-1,Math.round(f/hz)))}};buildMap();
    const col=g.createImageData(1,H());
    const t0=performance.now(),PRE=3000,REC=REC_SEC*1000;
    S.rec=false;
    await new Promise(resolve=>{
      const loop=()=>{
        if(run!==S.run){resolve();return}
        const el2=performance.now()-t0;
        an.getByteFrequencyData(bins);an.getFloatTimeDomainData(td);
        let s=0;for(let i=0;i<td.length;i++)s+=td[i]*td[i];const lv=Math.sqrt(s/td.length);
        if(S.rec)maxLv=Math.max(maxLv,lv);
        $('ctLvl').style.transform=`scaleX(${Math.min(1,lv*9).toFixed(3)})`;
        const step=Math.max(1,Math.round(dpr*1.5));
        g.drawImage(cv,-step,0);
        for(let y=0;y<H();y++){const v=bins[map[y]],k=v*3;col.data[y*4]=EMBER[k];col.data[y*4+1]=EMBER[k+1];col.data[y*4+2]=EMBER[k+2];col.data[y*4+3]=255}
        for(let x=0;x<step;x++)g.putImageData(col,cv.width-step+x,0);
        if(el2<PRE){$('ctSec').textContent=Math.ceil((PRE-el2)/1000);$('ctRingL').textContent=T('เตรียมตัว','Get ready');$('ctArc').style.strokeDashoffset=339}
        else{
          if(!S.rec){S.rec=true;$('ctRing').classList.add('rec');try{navigator.vibrate&&navigator.vibrate(30)}catch(e){}}
          const r=el2-PRE;if(r>=REC){S.rec=false;resolve();return}
          $('ctSec').textContent=Math.ceil((REC-r)/1000);$('ctRingL').textContent=T('กำลังอัด','Recording');
          $('ctArc').style.strokeDashoffset=(339*(1-r/REC)).toFixed(1);
          const steps=$('ctSteps').children,idx=r<4500?1:2;[...steps].forEach((li,i)=>li.classList.toggle('on',i===idx));
        }
        S.raf=requestAnimationFrame(loop);
      };loop();
    });
    if(run!==S.run){await cleanup();return}
    await cleanup();
    $('ctRing').classList.remove('rec');$('ctRing').classList.add('busy');$('ctSec').innerHTML='<i class="ti ti-sparkles"></i>';$('ctRingL').textContent=T('AI กำลังฟัง','AI listening');
    $('ctSteps').hidden=true;el.classList.add('thinking');
    const wav=await toWav(chunks,rate);
    if(maxLv<0.004){showEar({quality:'too_quiet',hear:'',causes:[],urgency:'soon',next:[T('ขยับมือถือเข้าใกล้จุดที่มีเสียงมากขึ้น แล้วลองใหม่','Move the phone closer to the sound and try again')],speak:''},true);return}
    S.abort=new AbortController();
    const area=args.area||'',when=args.when||'';
    const data=await analyze('ear',[{mime:'audio/wav',b64:wav.b64}],{car:carCtx(),phoneAt:area,soundWhen:when,callSoFar:recentTalk()},
      T('ฟังเสียงจากรถคันนี้ระหว่างโทร','Listening to this car during a call')+(area?' · '+area:'')+(when?' · '+when:''),S.abort.signal);
    if(run!==S.run)return;
    showEar(data);
  }catch(e){
    await cleanup();
    if(run!==S.run)return;
    const msg=e&&e.name==='NotAllowedError'?T('ต้องอนุญาตไมค์ก่อนนะครับ','Microphone permission is needed'):(e&&e.message)||T('ฟังเสียงไม่สำเร็จ','Listening failed');
    finishEar(null,msg);toast(msg,'ti-alert-triangle');
  }
}
const URG={ok:['#22a06b',T('ขับต่อได้','OK to drive')],soon:['#d6a13a',T('ควรให้ช่างดูเร็ว ๆ นี้','Get it checked soon')],stop:['#dc2626',T('หยุดขับ เรียกช่าง','Stop driving — get help')]};
const QUAL={good:T('เสียงชัด','Clear recording'),noisy:T('มีเสียงอื่นปน','Noisy recording'),too_quiet:T('เสียงเบาเกินไป','Too quiet'),no_engine:T('ไม่ได้ยินเสียงรถ','No engine sound')};
const LIKE={likely:[88,T('น่าจะใช่','Likely')],possible:[55,T('เป็นไปได้','Possible')],'less likely':[25,T('น้อยกว่า','Less likely')]};
function showEar(d,local){
  const el=$('ctLayer');if(!el)return;el.classList.remove('thinking');
  const u=URG[d.urgency]||URG.soon,good=d.quality==='good';
  $('ctRing').classList.remove('busy');$('ctRing').classList.add('done');
  $('ctSec').innerHTML=`<i class="ti ti-${good?'ear':'ear-off'}"></i>`;$('ctRingL').textContent=QUAL[d.quality]||'';
  const out=$('ctOut');out.hidden=false;
  out.innerHTML=`${good?`<span class="ct-badge" style="--c:${u[0]}"><i class="ti ti-${d.urgency==='stop'?'urgent':d.urgency==='ok'?'circle-check':'alert-circle'}"></i>${esc(u[1])}</span>`:`<span class="ct-badge" style="--c:#d6a13a"><i class="ti ti-microphone-2"></i>${esc(QUAL[d.quality]||'')}</span>`}
    ${d.hear?`<p class="ct-lead">${esc(d.hear)}</p>`:''}${d.normal?`<p class="ct-note">${esc(d.normal)}</p>`:''}
    ${(d.causes||[]).length?`<div class="ct-causes">${d.causes.map((c,i)=>{const L=LIKE[c.likelihood]||LIKE.possible;return `<div class="ct-cause" style="animation-delay:${i*90}ms"><b>${esc(c.name)}<small>${esc(L[1])}</small></b><div class="ct-bar"><i style="--w:${L[0]}%"></i></div>${c.clue?`<small>${esc(c.clue)}</small>`:''}</div>`}).join('')}</div>`:''}
    ${(d.next||[]).length?`<ul class="ct-next">${d.next.map(x=>`<li>${esc(x)}</li>`).join('')}</ul>`:''}
    <p class="ct-fine">${T('ประเมินจากเสียงเท่านั้น ไม่ใช่การวินิจฉัยแน่นอน — ให้ช่างตรวจจริงก่อนซ่อม','Based on sound only, not a definite diagnosis — have a mechanic confirm it')}</p>
    <div class="ct-acts"><button type="button" class="ct-b" id="ctAgain"><i class="ti ti-refresh"></i>${T('ฟังอีกครั้ง','Listen again')}</button>
      ${d.urgency!=='ok'&&good?`<a class="ct-b" href="/${d.urgency==='stop'?'urgent':'post'}" id="ctHelp"><i class="ti ti-${d.urgency==='stop'?'urgent':'tool'}"></i>${d.urgency==='stop'?T('เรียกช่างด่วน','Call help now'):T('หาช่าง','Find a mechanic')}</a>`:''}
      <button type="button" class="ct-b p" id="ctBack"><i class="ti ti-phone"></i>${T('คุยต่อ','Back to call')}</button></div>`;
  $('ctAgain').onclick=()=>listenEngine(null);
  $('ctBack').onclick=()=>finishEar(d);
  const help=$('ctHelp');if(help)help.onclick=()=>{try{endCall()}catch(e){}};
  /* ส่งผลให้ AI พูดสรุปทันที (ผู้ใช้ไม่ต้องกดกลับก่อน) */
  const summary=local?T('อัดเสียงได้เบามากจนฟังไม่ออก ให้ผู้ใช้ขยับมือถือเข้าใกล้แล้วลองใหม่','The recording was too quiet to hear — ask the user to move closer and try again')
    :`ผลฟังเสียงเครื่องยนต์ ${REC_SEC} วินาที (เสียงดิบ): คุณภาพเสียง ${d.quality} · ได้ยิน: ${d.hear} · ${d.normal||''} · สาเหตุ: ${(d.causes||[]).map(c=>c.name+' ('+c.likelihood+')').join(', ')||'-'} · ความด่วน: ${d.urgency} · ทำต่อ: ${(d.next||[]).join(' / ')}${d.speak?' · ประโยคที่ควรพูด: '+d.speak:''}`;
  S.holdMic=false;S.muteAi=false;
  tellLive(summary,S.tool);S.tool=null;
  if(!local&&d.hear)remember(T('ผลฟังเสียงเครื่อง','Engine sound check')+` (${REC_SEC} ${T('วินาที','s')}) — ${URG[d.urgency]?URG[d.urgency][1]:''}\n${d.hear}${(d.causes||[]).length?'\n'+d.causes.map(c=>'• '+c.name+' — '+(LIKE[c.likelihood]||LIKE.possible)[1]).join('\n'):''}${(d.next||[]).length?'\n'+d.next.map(x=>'→ '+x).join('\n'):''}`);
}
function finishEar(d,why){
  const tool=S.tool;S.tool=null;
  closeLayer();
  if(tool&&!d)tellLive(why||T('ผู้ใช้ยกเลิกการฟังเสียง','The user cancelled the recording'),tool);
}

/* ═════════ 2) สแกนห้องเครื่อง ═════════ */
async function scanBay(tool){
  if(!callActive)return;
  if(S.mode)closeLayer();
  const run=++S.run;S.mode='bay';S.tool=tool||null;
  if(!camOn){try{await toggleCamera()}catch(e){}}
  if(run!==S.run)return;
  if(!camOn){const why=T('เปิดกล้องไม่ได้ — ต้องอนุญาตกล้องก่อน','Camera unavailable — allow camera access');toast(why,'ti-video-off');finishBay(null,why);return}
  const el=layer();el.classList.add('ct-bay','aim');
  el.innerHTML=`<header class="ct-hd"><div><b>${T('สแกนห้องเครื่อง','Engine bay scan')}</b><small>${T('เปิดฝากระโปรง เล็งให้เห็นห้องเครื่องทั้งหมด','Open the bonnet and fit the whole engine bay in view')}</small></div><button type="button" class="ct-x" id="ctClose" aria-label="${T('ปิด','Close')}"><i class="ti ti-x"></i></button></header>
    <div class="ct-aim" id="ctAim"><i></i><i></i><i></i><i></i></div>
    <div class="ct-shot"><button type="button" class="ct-shutter" id="ctShot" aria-label="${T('สแกน','Scan')}"><span id="ctCount"></span></button><small>${T('แตะเพื่อสแกน','Tap to scan')}</small></div>`;
  $('ctClose').onclick=()=>finishBay(null,T('ผู้ใช้ปิดการสแกน','The user closed the scan'));
  const go=()=>capture(run);
  $('ctShot').onclick=go;
  /* AI เป็นคนสั่ง: นับถอยหลังให้ผู้ใช้เล็งก่อน แล้วถ่ายเอง */
  if(tool){for(let n=3;n>0;n--){if(run!==S.run)return;$('ctCount').textContent=n;await new Promise(r=>setTimeout(r,900))}if(run===S.run&&S.mode==='bay'&&$('ctShot'))go()}
}
function grab(){
  const v=$('callCam');if(!v||!v.videoWidth)return null;
  const z=(typeof camZoom==='number'&&camZoom>1)?camZoom:1,sw=v.videoWidth/z,sh=v.videoHeight/z,max=1280,w=Math.round(Math.min(max,sw)),h=Math.round(sh/sw*w);
  const c=D.createElement('canvas');c.width=w;c.height=h;
  const g=c.getContext('2d');
  if(camFacing==='user'){g.translate(w,0);g.scale(-1,1)}
  g.drawImage(v,(v.videoWidth-sw)/2,(v.videoHeight-sh)/2,sw,sh,0,0,w,h);
  return {url:c.toDataURL('image/jpeg',0.86),w,h};
}
async function capture(run){
  const shot=grab();
  if(!shot){toast(T('กล้องยังไม่พร้อม ลองอีกครั้ง','Camera not ready — try again'),'ti-camera');return}
  try{navigator.vibrate&&navigator.vibrate(18)}catch(e){}
  const el=$('ctLayer');el.classList.remove('aim');el.classList.add('scanning');
  el.querySelector('.ct-aim')&&el.querySelector('.ct-aim').remove();el.querySelector('.ct-shot')&&el.querySelector('.ct-shot').remove();
  el.insertAdjacentHTML('beforeend',`<div class="ct-frame"><div class="ct-pic" id="ctPic" style="aspect-ratio:${shot.w}/${shot.h}"><img src="${shot.url}" alt=""><div class="ct-sweep"></div><div class="ct-grid"></div></div></div>
    <div class="ct-status" id="ctStat"><span class="ct-dots"><i></i><i></i><i></i></span>${T('AI กำลังมองหาชิ้นส่วน…','Finding parts…')}</div><div class="ct-list" id="ctList" hidden></div>`);
  S.abort=new AbortController();
  try{
    const data=await analyze('bay',[{mime:'image/jpeg',b64:shot.url.split(',')[1]}],{car:carCtx()},T('สแกนห้องเครื่องระหว่างโทร','Engine bay scan during a call'),S.abort.signal);
    if(run!==S.run)return;
    showBay(data);
  }catch(e){
    if(run!==S.run)return;
    el.classList.remove('scanning');
    $('ctStat').innerHTML=`<i class="ti ti-alert-triangle"></i>${esc(e.message)}`;
    $('ctList').hidden=false;$('ctList').innerHTML=`<div class="ct-acts"><button type="button" class="ct-b" id="ctRe"><i class="ti ti-scan"></i>${T('สแกนใหม่','Scan again')}</button><button type="button" class="ct-b p" id="ctBack"><i class="ti ti-phone"></i>${T('คุยต่อ','Back to call')}</button></div>`;
    $('ctRe').onclick=()=>scanBay(null);$('ctBack').onclick=()=>finishBay(null,e.message);
  }
}
function showBay(d){
  const el=$('ctLayer');if(!el)return;el.classList.remove('scanning');el.classList.add('found');
  const pic=$('ctPic'),items=d.items||[];
  pic.querySelector('.ct-sweep')&&pic.querySelector('.ct-sweep').remove();
  pic.insertAdjacentHTML('beforeend',items.map((x,i)=>{const [y0,x0,y1,x1]=x.box;
    return `<button type="button" class="ct-box" data-i="${i}" style="top:${y0/10}%;left:${x0/10}%;height:${(y1-y0)/10}%;width:${(x1-x0)/10}%;animation-delay:${200+i*110}ms" aria-label="${esc(x.name)}"><span>${i+1}</span></button>`}).join(''));
  $('ctStat').innerHTML=items.length?`<i class="ti ti-circle-check"></i>${T(`เจอ ${items.length} ชิ้นส่วน — แตะเพื่อดูวิธีเช็ก`,`Found ${items.length} parts — tap one to see how to check it`)}`
    :`<i class="ti ti-info-circle"></i>${esc(d.speak||T('ภาพนี้ยังไม่เห็นห้องเครื่องชัด ลองถอยออกมาให้เห็นทั้งหมด','No engine bay found — step back so it fits in view'))}`;
  const list=$('ctList');list.hidden=false;
  list.innerHTML=`${(d.notes||[]).length?`<div class="ct-warn">${d.notes.map(n=>`<p><i class="ti ti-alert-triangle"></i>${esc(n)}</p>`).join('')}</div>`:''}
    <div class="ct-parts">${items.map((x,i)=>`<button type="button" class="ct-part" data-i="${i}" style="animation-delay:${300+i*80}ms"><span>${i+1}</span><b>${esc(x.name)}</b>${x.look?`<small>${esc(x.look)}</small>`:''}</button>`).join('')}</div>
    <div class="ct-detail" id="ctDet" hidden></div>
    <p class="ct-fine">${T('ดับเครื่องและรอให้เย็นก่อนจับ · อย่าเปิดฝาหม้อน้ำตอนร้อน · สายสีส้มในรถไฟฟ้า/ไฮบริดห้ามแตะ','Engine off and cool before touching · never open a hot radiator cap · never touch orange high-voltage cables')}</p>
    <div class="ct-acts"><button type="button" class="ct-b" id="ctRe"><i class="ti ti-scan"></i>${T('สแกนใหม่','Scan again')}</button><button type="button" class="ct-b p" id="ctBack"><i class="ti ti-phone"></i>${T('คุยต่อ','Back to call')}</button></div>`;
  const pickPart=i=>{
    const x=items[i];if(!x)return;
    el.querySelectorAll('.ct-box,.ct-part').forEach(b=>b.classList.toggle('on',+b.dataset.i===i));
    const det=$('ctDet');det.hidden=false;
    det.innerHTML=`<b><span>${i+1}</span>${esc(x.name)}</b>${x.what?`<p><em>${T('คืออะไร','What it is')}</em>${esc(x.what)}</p>`:''}${x.check?`<p><em>${T('เช็กเอง','Check it')}</em>${esc(x.check)}</p>`:''}${x.look?`<p><em>${T('ในภาพนี้','In this photo')}</em>${esc(x.look)}</p>`:''}`;
    det.scrollIntoView({block:'nearest',behavior:'smooth'});
  };
  el.querySelectorAll('.ct-box,.ct-part').forEach(b=>b.onclick=()=>pickPart(+b.dataset.i));
  $('ctRe').onclick=()=>scanBay(null);
  $('ctBack').onclick=()=>finishBay(d);
  const summary=items.length?`ผลสแกนห้องเครื่องจากกล้อง: เห็น ${items.map((x,i)=>(i+1)+'. '+x.name+(x.look?' ('+x.look+')':'')).join(', ')}${(d.notes||[]).length?' · สิ่งที่ควรระวัง: '+d.notes.join(' / '):''} · บนจอผู้ใช้มีป้ายชื่อชิ้นส่วนตามหมายเลขแล้ว${d.speak?' · ประโยคที่ควรพูด: '+d.speak:''}`
    :`ผลสแกน: ภาพยังไม่เห็นห้องเครื่องชัด (${d.scene}) ${d.speak||''}`;
  tellLive(summary,S.tool);S.tool=null;
  if(items.length)remember(T('ผลสแกนห้องเครื่อง','Engine bay scan')+'\n'+items.map((x,i)=>`${i+1}. ${x.name}${x.look?' — '+x.look:''}`).join('\n')+((d.notes||[]).length?'\n'+d.notes.map(n=>'⚠ '+n).join('\n'):''));
}
function finishBay(d,why){
  const tool=S.tool;S.tool=null;
  closeLayer();
  if(tool&&!d)tellLive(why||T('ผู้ใช้ปิดการสแกน','The user closed the scan'),tool);
}

/* ── AI เรียกเครื่องมือเอง ── */
function onToolCall(tc){
  const calls=(tc&&tc.functionCalls)||[];
  for(const c of calls){
    if(c.name==='listen_engine'){listenEngine(c);return}
    if(c.name==='scan_engine_bay'){scanBay(c);return}
    try{callWS.send(JSON.stringify({toolResponse:{functionResponses:[{id:c.id,name:c.name,response:{error:'unknown tool'}}]}}))}catch(e){}
  }
}
function onCancel(){ if(S.tool){S.tool=null;closeLayer()} }

/* ── ปุ่มบนหน้าโทร ── */
function mountButtons(){
  const ui=$('callUI');if(!ui||$('ctTools'))return;
  const bar=D.createElement('div');bar.id='ctTools';bar.className='ct-tools';
  bar.innerHTML=`<button type="button" id="ctEarBtn"><i class="ti ti-ear"></i><span>${T('ฟังเสียงเครื่อง','Listen to engine')}</span></button><button type="button" id="ctBayBtn"><i class="ti ti-scan"></i><span>${T('สแกนห้องเครื่อง','Scan engine bay')}</span></button>`;
  ui.querySelector('.hh-top').after(bar);
  $('ctEarBtn').onclick=()=>{if(!callActive)return toast(T('รอต่อสายให้ติดก่อนนะครับ','Wait for the call to connect'),'ti-phone');listenEngine(null)};
  $('ctBayBtn').onclick=()=>{if(!callActive)return toast(T('รอต่อสายให้ติดก่อนนะครับ','Wait for the call to connect'),'ti-phone');scanBay(null)};
}
if(D.readyState==='loading')D.addEventListener('DOMContentLoaded',mountButtons);else mountButtons();

window.CallTools={
  get holdMic(){return S.holdMic},get muteAi(){return S.muteAi},get busy(){return !!S.mode},
  onToolCall,onCancel,reset:closeLayer,listen:listenEngine,scan:scanBay,
  /* บอกผู้ช่วยเสียงว่ามีเครื่องมืออะไร (ต่อท้าย system prompt ของการโทร) */
  prompt:()=>'\nเครื่องมือระหว่างโทร: ถ้าผู้ใช้ให้ฟังเสียงเครื่องหรือเสียงแปลก ๆ ให้เรียก listen_engine (ระบบอัดเสียงดิบ 10 วินาทีแล้ววิเคราะห์ให้) ก่อนเรียกให้บอกผู้ใช้สั้น ๆ ให้จ่อมือถือใกล้จุดที่มีเสียง · ถ้าผู้ใช้ให้ดูหรืออธิบายห้องเครื่อง ให้เรียก scan_engine_bay (ระบบถ่ายภาพแล้วติดป้ายชื่อชิ้นส่วนบนจอ) · เมื่อได้ผลกลับมา ให้สรุปเป็นภาษาพูดสั้น ๆ เริ่มจากเรื่องที่ต้องระวังก่อน ห้ามอ้างว่าได้ยินหรือเห็นสิ่งที่ผลไม่ได้บอก'
};
})();
