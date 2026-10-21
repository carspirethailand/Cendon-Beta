/* A view, not a second call. Mode changes never acquire a mic or a Live token.
   หน้าแรก: แถบ AI ละลายเป็นแท่งคลื่นสีดำล้วน — ไม่มีพื้น ไม่มีปุ่ม ไม่มีข้อความ
     ปัดซ้าย/ขวา = วางสาย (คลื่นปลิวออก แถบเลื่อนกลับมาเอง) · แตะ = ปิด/เปิดไมค์
     กดค้าง 1 วิ = แท่งรวมตัวเป็นจุดดำ → ลากเข้ากลางจอ = จุดแผ่เต็มจอ (โทรเต็มจอ)
   เต็มจอ (หน้าแรก + แชต): วงกลมของเหลวขยับเป็นคลื่นตามเสียง AI และเสียงผู้ใช้ · เปิดกล้อง = คลื่นขอบจอ */
(() => {
  'use strict';
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v)),mix=(a,b,k)=>a+(b-a)*k;
  const out3=k=>1-Math.pow(1-clamp(k,0,1),3);
  const inOut=k=>{k=clamp(k,0,1);return k<.5?4*k*k*k:1-Math.pow(-2*k+2,3)/2};
  const outBack=k=>{k=clamp(k,0,1);const c=1.45;return 1+(c+1)*Math.pow(k-1,3)+c*Math.pow(k-1,2)};
  const EASE='cubic-bezier(.32,.72,0,1)';
  function gesture({onHold=()=>{},onDrag=()=>{},onMove=()=>{},onSwipe=()=>{},onDrop=()=>{},onCancel=()=>{},onTap=()=>{},onPress=()=>{},onUnpress=()=>{},later=setTimeout,cancel=clearTimeout}){
    let start=null,timer=0,held=false;
    function reset(){if(timer)onUnpress();cancel(timer);timer=0;start=null;held=false;}
    return{
      down(p){reset();start=p;onPress(p);timer=later(()=>{if(!start)return;timer=0;held=true;onHold(start);},1000);},
      move(p){if(!start)return;const dx=p.x-start.x,dy=p.y-start.y;if(held){onDrag(p,start);return;}if(Math.hypot(dx,dy)>12&&timer){cancel(timer);timer=0;onUnpress();}if(Math.abs(dx)>Math.abs(dy)*1.25)onMove(dx);},
      up(p,width=320){if(!start)return;const dx=p.x-start.x,dy=p.y-start.y,dt=Math.max(1,p.time-start.time),wasHeld=held,tap=!held&&Math.hypot(dx,dy)<12&&dt<450;reset();if(wasHeld){onDrop(p);return;}if(Math.abs(dx)>Math.abs(dy)*1.25&&(Math.abs(dx)>Math.min(100,width*.26)||(Math.abs(dx)>45&&Math.abs(dx)/dt>.7)))onSwipe(Math.sign(dx));else{if(tap)onTap(p);onCancel();}},
      cancel(){reset();onCancel();},dispose:reset,
    };
  }
  /* สีใด ๆ ของ CSS → [r,g,b,a] */
  let probe=null;
  function rgbOf(str,fb){try{probe=probe||document.createElement('canvas').getContext('2d');probe.fillStyle='#000';probe.fillStyle=String(str||'').trim()||'#000';const v=probe.fillStyle;
    if(v[0]==='#')return [parseInt(v.slice(1,3),16),parseInt(v.slice(3,5),16),parseInt(v.slice(5,7),16),1];
    const m=v.match(/[\d.]+/g);return m?[+m[0],+m[1],+m[2],m[3]==null?1:+m[3]]:fb;}catch{return fb;}}
  function rr(g,x,y,w,h,r){r=Math.max(0,Math.min(r,w/2,h/2));g.moveTo(x+r,y);g.arcTo(x+w,y,x+w,y+h,r);g.arcTo(x+w,y+h,x,y+h,r);g.arcTo(x,y+h,x,y,r);g.arcTo(x,y,x+w,y,r);g.closePath();}
  function create({anchor=null,language='th',onSelectShop}={}){
    const en=language!=='th',T=(th,eng)=>en?eng:th;
    let root=document.getElementById('callUI');
    if(!root){
      root=document.createElement('section');root.id='callUI';root.className='hearth';root.setAttribute('aria-hidden','true');
      root.innerHTML=`<video class="hh-cam" id="callCam" muted playsinline></video><canvas id="camCanvas" hidden></canvas><header class="hh-top"><span class="hh-name"><i id="hhDot"></i>Cendon</span><span class="hh-time" id="callTimer">00:00</span></header><div class="hh-stage"><canvas id="hhOrb" aria-hidden="true"></canvas></div><p class="hh-state" id="heardTag"></p><p class="hh-cap" id="callCaption"></p><span id="callStatus" hidden></span><label class="hh-zoom" id="callZoomBox" hidden><span id="callZoomLabel">1×</span><input id="callZoom" type="range" min="1" max="4" step="0.05" value="1" aria-label="${T('ซูมกล้อง','Camera zoom')}"></label><footer class="hh-ctrl"><button class="hh-btn" id="callCamBtn" type="button" aria-label="${T('กล้อง','Camera')}"><i class="ti ti-video"></i></button><button class="hh-btn" id="callFlipBtn" type="button" aria-label="${T('สลับกล้อง','Switch camera')}" hidden><i class="ti ti-camera-rotate"></i></button><button class="hh-btn" id="callMuteBtn" type="button" aria-label="${T('ปิดไมค์','Mute microphone')}"><i class="ti ti-microphone"></i></button><button class="hh-btn end" type="button" aria-label="${T('วางสาย','End call')}"><i class="ti ti-phone-off"></i></button></footer>`;
      document.body.append(root);
    }
    root.setAttribute('role','dialog');root.setAttribute('aria-label',T('โทรคุยกับ Cendon','Call Cendon'));
    const capability=document.createElement('p');capability.className='cv-capability';capability.hidden=true;capability.textContent=T('โทรคุยได้ · เครื่องมือยังไม่เปิดในเซิร์ฟเวอร์รุ่นนี้','Voice available · this server has not enabled tools yet');root.append(capability);
    const byId=id=>document.getElementById(id),canvas=byId('hhOrb');
    let session=null,mode=anchor?'inline':'full',active=false,run=0,direction=0,ghost=null,target=null,expanding=false,priorFocus=null,results=null,toolsReady=null;
    let wave=null,caption=null,stateText=null,dock=null,mute=null,observed=true,lastMuted=null,connecting=false;
    const reduced=window.matchMedia?.('(prefers-reduced-motion:reduce)').matches||false;
    const original=anchor?[...anchor.children]:[],savedInert=new Map();
    const animations=new Set();
    /* ตัวที่เลื่อนกลับมาหลังวางสาย (หน้าแรก: กล่องพลิกค้นหา/AI ทั้งกล่อง ไม่หมุนตามหน้า) */
    const slideEl=anchor?(anchor.closest('[data-cv-slide]')||anchor):null;
    /* ระดับเสียงล่าสุดจากสาย — วาดเองทุกเฟรมด้วย rAF ของหน้านี้ (ไม่หยุดตอนสายจบกลางแอนิเมชัน) */
    const lv={ai:0,user:0,time:0,camera:false,muted:false,waiting:false};
    let raf=0,clockAt=0,time=0;
    /* คลื่นแท่ง */
    let bars=[],barFrom=[17,18,20,1],barTo=[11,11,12,1],barR=16,introAt=0,outroAt=0,outroDone=null,holdFrom=0,gatherK=0,ungatherAt=0;
    let bead=null,beadPos={x:0,y:0},beadGoal={x:0,y:0},beadBorn=0,beadBack=0;
    /* วงกลมเต็มจอ */
    const O={bloomAt:0,closingAt:0};
    const minimize=document.createElement('button');minimize.className='cv-min';minimize.type='button';minimize.setAttribute('aria-label',T('ย่อสาย กลับหน้าหลัก','Minimize call'));minimize.innerHTML='<i class="ti ti-chevron-down"></i>';minimize.hidden=false;root.querySelector('.hh-top').prepend(minimize);
    /* ส่งรูปให้ AI ดูระหว่างโทร (คลังรูปหรือถ่ายใหม่) — ไม่ต้องวางสาย */
    if(!byId('callPhotoBtn')){const b=document.createElement('button');b.className='hh-btn';b.id='callPhotoBtn';b.type='button';b.innerHTML='<i class="ti ti-photo-plus"></i>';const inp=document.createElement('input');inp.type='file';inp.accept='image/*';inp.hidden=true;inp.id='callPhotoIn';inp.setAttribute('data-nocrop','');byId('callMuteBtn').before(b);root.append(inp);}
    byId('callPhotoBtn').setAttribute('aria-label',T('ส่งรูปให้ AI ดู','Show the AI a photo'));
    {
      if(anchor)anchor.classList.add('cv-host');dock=document.createElement('div');dock.className='cv-dock'+(anchor?'':' cv-floating');dock.hidden=true;
      dock.innerHTML=`<div class="cv-wave-touch" tabindex="0" role="button" aria-label="${T('สายกับ Cendon: ปัดซ้ายหรือขวาเพื่อวางสาย · แตะเพื่อปิดหรือเปิดไมค์ · กดค้างหนึ่งวินาทีแล้วลากมากลางจอเพื่อคุยเต็มจอ','Call with Cendon: swipe left or right to hang up · tap to mute or unmute · hold one second and drag to the centre for full screen')}"><canvas class="cv-wave" aria-hidden="true"></canvas></div><button class="cv-pmic" data-cv="pmute" type="button" aria-label="${T('ปิดไมค์','Mute microphone')}"><i class="ti ti-microphone"></i></button><p class="cv-sr" aria-live="polite"><span class="cv-label">Cendon</span> <span class="cv-caption">${T('กำลังต่อสาย','Connecting')}</span></p><div class="cv-actions"><button class="cv-control" data-cv="mute" type="button" aria-label="${T('ปิดไมค์','Mute microphone')}"><i class="ti ti-microphone"></i></button><button class="cv-control" data-cv="expand" type="button" aria-label="${T('ขยายสายเต็มจอ','Expand call')}"><i class="ti ti-arrows-maximize"></i></button><button class="cv-control cv-end" data-cv="end" type="button" aria-label="${T('วางสาย','End call')}"><i class="ti ti-phone-off"></i></button></div>`;
      (anchor||document.body).append(dock);wave=dock.querySelector('canvas');caption=dock.querySelector('.cv-caption');stateText=dock.querySelector('.cv-label');mute=dock.querySelector('[data-cv="mute"]');
    }
    const animate=(el,frames,options)=>{if(reduced||!el.animate)return Promise.resolve();try{const animation=el.animate(frames,options);animations.add(animation);return animation.finished.catch(()=>{}).finally(()=>animations.delete(animation));}catch{return Promise.resolve();}};
    function originals(on){for(const el of original){if(on){if(!savedInert.has(el))savedInert.set(el,el.inert);el.inert=true;}else{el.inert=savedInert.get(el)||false;savedInert.delete(el);}}}
    function kick(){if(!raf)raf=requestAnimationFrame(loop);}
    const floating=()=>!!dock&&dock.classList.contains('cv-floating');
    function readColors(){if(!dock)return;const cs=getComputedStyle(dock);barTo=rgbOf(cs.getPropertyValue('--cv-bar'),[11,11,12,1]);}
    /* สีพื้นของแถบเดิม (ก่อนละลาย) — แถบไล่สีใช้ตัวแปร --surface */
    function surfaceRGB(){const cs=getComputedStyle(anchor);let c=rgbOf(cs.backgroundColor,null);if(!c||c[3]<.5)c=rgbOf(cs.getPropertyValue('--surface'),null);return c&&c[3]>=.5?c:[17,18,20,1];}
    const shelled=()=>document.documentElement.classList.contains('cv-shelled');
    function placeDock(floating){
      if(!dock)return;floating=floating||!anchor||shelled();
      const parent=floating?document.body:anchor;
      if(dock.parentNode!==parent)parent.append(dock);
      dock.classList.toggle('cv-floating',floating);readColors();bars=[];
      requestAnimationFrame(resize);
    }
    function setMode(next,{floating=false}={}){
      mode=next;
      root.classList.toggle('cv-inline-call',mode==='inline');root.setAttribute('aria-hidden',mode==='inline'?'true':'false');
      if(mode==='full')root.setAttribute('aria-modal','true');else root.removeAttribute('aria-modal');
      if(dock){dock.hidden=!active||mode!=='inline';placeDock(floating||!observed);}
      if(results)placeResults();
      resize();if(mode==='full'&&active)root.querySelector('.hh-btn.end')?.focus({preventScroll:true});
      kick();
    }
    /* ศูนย์กลางวงกลมเต็มจอ = จุดวางเป้า = จุดที่จุดดำแผ่ออก (ตรงกันทั้งสามอย่าง) */
    function orbCenter(){const r=canvas.getBoundingClientRect();return r.width&&r.height?{x:r.left+r.width/2,y:r.top+r.height/2}:{x:innerWidth/2,y:innerHeight*.46};}
    /* การ์ดผลลัพธ์/Valet: เต็มจอ = ในจอโทร · คลื่นในแถบ = ใต้แถบ · เม็ดยาลอย = ลอยเหนือหน้า */
    function placeResults(){if(!results)return;const fl=mode!=='full'&&(floating()||!anchor);
      // Results are not a face of the rotating search/AI card. Keep readable
      // content outside its preserve-3d subtree (also while the card flips).
      const inlineHost=slideEl&&slideEl!==anchor?slideEl:anchor?.parentNode;
      (mode==='full'?root:fl?document.body:inlineHost||document.body).append(results);results.classList.toggle('cv-float',fl);}
    function resetRootStyle(){root.style.transform='';root.style.opacity='';root.style.borderRadius='';root.style.transition='';root.style.clipPath='';}
    const pillCenter=()=>({x:innerWidth/2,y:innerHeight-118});
    const center=el=>{const r=el.getBoundingClientRect();return{x:r.left+r.width/2,y:r.top+r.height/2,w:r.width,h:r.height};};
    function originOf(el){if(!el||el===document.body||!el.getBoundingClientRect)return null;const c=center(el);return c.w&&c.y>0&&c.y<innerHeight?c:null;}
    /* จุดแผ่เต็มจอ: เปิดหน้าโทรเป็นวงกลมจากจุดนั้นจนเต็มจอ */
    function reveal(pt,from=28,dur=700){
      if(reduced||!root.animate||!pt){animate(root,[{opacity:0},{opacity:1}],{duration:260,easing:'ease-out'});return Promise.resolve();}
      const R=Math.hypot(Math.max(pt.x,innerWidth-pt.x),Math.max(pt.y,innerHeight-pt.y))+12,a=`circle(${from}px at ${pt.x}px ${pt.y}px)`;
      root.style.clipPath=a;
      return animate(root,[{clipPath:a},{clipPath:`circle(${R}px at ${pt.x}px ${pt.y}px)`}],{duration:dur,easing:'cubic-bezier(.62,0,.18,1)'}).then(()=>{root.style.clipPath='';});
    }
    function open(){
      for(const animation of animations)animation.cancel();animations.clear();
      run++;active=true;document.documentElement.classList.add('cv-calling');direction=0;expanding=false;connecting=true;holdFrom=gatherK=ungatherAt=outroAt=0;outroDone=null;priorFocus=document.activeElement;root.classList.remove('cv-ending');clearDrag();root.style.clipPath='';
      O.bloomAt=performance.now()+(anchor?0:200);O.closingAt=0;
      if(anchor){
        barFrom=surfaceRGB();barR=parseFloat(getComputedStyle(anchor).borderTopLeftRadius)||16;
        originals(true);anchor.classList.add('cv-active');dock.getAnimations?.().forEach(a=>a.cancel());dock.style.transform='';dock.style.opacity='';dock.style.transition='';
        bars=[];introAt=reduced?0:performance.now();
      }
      setMode(anchor?'inline':'full');resize();
      if(!anchor)reveal(originOf(priorFocus),20,620);
      clockAt=0;kick();
    }
    /* วางสายแบบปัด: คลื่นปลิวออกตามแรงนิ้ว */
    function flyOut(d){const w=Math.max(dock.clientWidth,300),m=/translateX\(([-\d.]+)px\)/.exec(dock.style.transform||''),x=m?+m[1]:0;dock.style.transition='none';
      return animate(dock,[{transform:`translateX(${x}px)`,opacity:+(dock.style.opacity||1)},{transform:`translateX(${d*(w+80)}px) rotate(${d*2.5}deg)`,opacity:0}],{duration:320,easing:'cubic-bezier(.3,.1,.7,.2)',fill:'forwards'});}
    /* แถบเดิมกลับมา: ปัดทิ้ง = เลื่อนเข้าจากอีกฝั่ง · วางสายวิธีอื่น = แท่งรวมกลับเป็นแถบแล้ว */
    function restoreBar(dir){
      if(!dock)return;dock.getAnimations?.().forEach(a=>a.cancel());dock.hidden=true;dock.style.transform='';dock.style.opacity='';dock.style.transition='';bars=[];outroAt=0;
      if(!anchor)return;placeDock(false);
      anchor.classList.remove('cv-active');originals(false);
      if(dir&&slideEl&&!reduced&&!shelled())animate(slideEl,[{translate:`${dir*64}px 0`,opacity:0,filter:'blur(8px)'},{translate:'0 0',opacity:1,filter:'blur(0px)'}],{duration:640,easing:EASE});
    }
    function close(){
      const closing=++run,wasFull=mode==='full';active=false;document.documentElement.classList.remove('cv-calling');press?.dispose();clearDrag();expanding=false;results?.remove();results=null;
      resetRootStyle();
      if(dock){
        if(!wasFull&&direction&&!reduced&&!dock.hidden)flyOut(direction).then(()=>{if(run===closing)restoreBar(-direction);});
        else if(anchor&&!wasFull&&!reduced&&!dock.hidden&&!floating()){outroAt=performance.now();outroDone=()=>{if(run===closing)restoreBar(0);};kick();}
        else if(!wasFull&&!reduced&&!dock.hidden)animate(dock,[{opacity:1,transform:'scale(1)'},{opacity:0,transform:'scale(.9)'}],{duration:220,easing:'ease-in',fill:'forwards'}).then(()=>{if(run===closing)restoreBar(0);});
        else restoreBar(0);
      }
      if(wasFull){
        root.classList.add('cv-ending');O.closingAt=performance.now();kick();
        animate(root,[{opacity:1},{opacity:0}],{duration:300,delay:160,easing:'ease-in',fill:'forwards'}).then(()=>{if(run===closing){root.classList.remove('cv-ending');root.getAnimations?.().forEach(a=>a.cancel());}});
        if(reduced)root.classList.remove('cv-ending');
      }
      if(priorFocus?.isConnected)priorFocus.focus?.({preventScroll:true});
    }
    /* ── กดค้าง → จุดดำ → ลากเข้ากลางจอ ── */
    function waveCenter(){if(!wave)return{x:innerWidth/2,y:innerHeight/2};const c=center(wave);return{x:c.x,y:c.y};}
    function clearDrag(){bead?.remove();target?.remove();bead=target=ghost=null;beadBack=0;}
    function hold(){
      if(!active||mode!=='inline'||expanding)return;
      const c=waveCenter();beadPos={...c};beadGoal={...c};beadBorn=performance.now();beadBack=0;holdFrom=0;
      bead=ghost=document.createElement('div');bead.className='cv-bead';bead.setAttribute('aria-hidden','true');
      target=document.createElement('div');target.className='cv-drop';target.innerHTML=`<span></span><p>${T('ลากมาตรงกลาง เพื่อคุยเต็มจอ','Drag to the centre for full screen')}</p>`;
      target.style.paddingTop=Math.max(20,orbCenter().y-56)+'px';
      document.body.append(target,bead);try{navigator.vibrate?.(12);}catch{}
      kick();
    }
    function drag(p,start){
      if(!bead||expanding)return;beadGoal={x:p.x,y:p.y};
      const oc=orbCenter(),ring=Math.min(70,innerWidth*.2),atCentre=Math.hypot(p.x-oc.x,p.y-oc.y)<ring,moved=Math.hypot(p.x-start.x,p.y-start.y)>44;
      target?.classList.toggle('cv-ready',atCentre&&moved);if(atCentre&&moved)full(true);
    }
    /* ปล่อยนอกกลางจอ: จุดลอยกลับ แล้วแตกกลับเป็นแท่ง */
    function dropBack(){
      if(expanding||!bead)return;beadGoal=waveCenter();beadBack=performance.now();target?.classList.add('cv-leave');
      const b=bead,t=target,r=run;setTimeout(()=>{if(r!==run||bead!==b)return;b.remove();t?.remove();bead=ghost=target=null;beadBack=0;ungatherAt=performance.now();kick();},360);
    }
    function full(wipe=false){
      if(!active||expanding||mode==='full')return;
      expanding=true;const currentRun=run;
      const go=(pt,from)=>{if(run!==currentRun)return;target?.classList.add('cv-leave');const t=target;setTimeout(()=>t?.remove(),260);bead?.remove();bead=ghost=target=null;
        O.bloomAt=performance.now()+(pt?240:0);setMode('full');reveal(pt,from,720).then(()=>{if(run===currentRun)expanding=false;});};
      if(wipe&&bead&&!reduced){const c=orbCenter();beadGoal=c;bead.classList.toggle('cv-bead-light',root.classList.contains('light'));try{navigator.vibrate?.(8);}catch{}setTimeout(()=>go(c,28),150);}
      else go(wipe&&bead?beadPos:mode==='inline'&&dock&&!dock.hidden?waveCenter():null,14);
    }
    /* เต็มจอ → ย่อ (ปัดลงหรือปุ่ม ⌄): ทั้งจอหดลงไปที่แถบ (หน้าแรก) หรือเม็ดยาลอย แล้วแท่งแตกออกจากกลาง · สายยังคุยต่อ */
    function collapse(){
      if(!active||mode!=='full')return;
      if(session?.cameraOn)session.camera();
      const pt=anchor&&observed&&!shelled()?center(anchor):pillCenter(),r=run;
      if(reduced||!root.animate){resetRootStyle();gatherK=0;setMode('inline');return;}
      const cur=root.style.transform||'translateY(0px) scale(1)',op=+(root.style.opacity||1),br=root.style.borderRadius||'0px';root.style.transition='none';
      animate(root,[{transform:cur,opacity:op,borderRadius:br},{transform:`translate(${pt.x-innerWidth/2}px,${pt.y-innerHeight/2}px) scale(.06)`,opacity:0,borderRadius:'60px'}],{duration:440,easing:'cubic-bezier(.5,0,.7,.4)',fill:'forwards'}).then(()=>{
        if(r!==run)return;root.getAnimations?.().forEach(a=>a.cancel());resetRootStyle();gatherK=1;ungatherAt=performance.now();setMode('inline');});
    }
    /* ปัดลงที่จอโทร = ย่อ (จอตามนิ้ว ปล่อยไม่ถึงก็เด้งกลับ) */
    let sd=null;
    const noSwipe='button,input,a,label,select,textarea,.cv-results,.ct-layer,.ct-tools,.hh-zoom,.lv-box,.lv-det,.lv-stat';
    root.addEventListener('pointerdown',e=>{if(!active||mode!=='full'||expanding||e.button!==0||root.classList.contains('ct-on')||e.target.closest(noSwipe))return;sd={x:e.clientX,y:e.clientY,t:e.timeStamp,id:e.pointerId,on:false};});
    root.addEventListener('pointermove',e=>{if(!sd||e.pointerId!==sd.id)return;const dx=e.clientX-sd.x,dy=e.clientY-sd.y;
      if(!sd.on){if(dy>10&&dy>Math.abs(dx)*1.2){sd.on=true;try{root.setPointerCapture(e.pointerId);}catch{}}else{if(Math.hypot(dx,dy)>16)sd=null;return;}}
      const k=Math.max(0,dy);root.style.transition='none';root.style.transform=`translateY(${(k*.86).toFixed(1)}px) scale(${(1-Math.min(.14,k/2200)).toFixed(4)})`;root.style.borderRadius=Math.min(40,k/5).toFixed(1)+'px';root.style.opacity=String(1-Math.min(.3,k/1400));});
    const sdEnd=e=>{if(!sd||e.pointerId!==sd.id)return;const s1=sd;sd=null;if(!s1.on)return;const dy=e.clientY-s1.y,v=dy/Math.max(1,e.timeStamp-s1.t);
      if(e.type!=='pointercancel'&&(dy>120||(dy>40&&v>.6))){try{navigator.vibrate?.(8);}catch{}collapse();}
      else{root.style.transition='transform .32s cubic-bezier(.32,.72,0,1),border-radius .32s,opacity .25s';root.style.transform='';root.style.borderRadius='';root.style.opacity='';}};
    root.addEventListener('pointerup',sdEnd);root.addEventListener('pointercancel',sdEnd);
    const press=gesture({
      onPress:()=>{if(active&&mode==='inline')holdFrom=performance.now();kick();},
      onUnpress:()=>{holdFrom=0;},
      onHold:hold,onDrag:drag,
      onMove:dx=>{if(!dock||!active||bead)return;holdFrom=0;dock.style.transition='none';dock.style.transform=`translateX(${dx*.86}px) rotate(${dx*.006}deg)`;dock.style.opacity=String(1-Math.min(.75,Math.abs(dx)/380));},
      onSwipe:d=>{direction=d;try{navigator.vibrate?.(10);}catch{}session?.end();},
      onDrop:()=>{if(!expanding)dropBack();},
      onCancel:()=>{if(bead&&!expanding){dropBack();return;}if(expanding||bead||!dock)return;dock.style.transition='transform .32s cubic-bezier(.32,.72,0,1),opacity .25s';dock.style.transform='';dock.style.opacity='';},
      onTap:()=>{if(!active||bead)return;if(floating())full();else session?.mute();}});
    if(dock){
      dock.addEventListener('pointerdown',()=>session?.wake?.());
      const touch=dock.querySelector('.cv-wave-touch'),point=e=>({x:e.clientX,y:e.clientY,time:e.timeStamp});
      touch.addEventListener('pointerdown',e=>{if(e.button!==0||!active)return;try{touch.setPointerCapture(e.pointerId);}catch{}press.down(point(e));});
      touch.addEventListener('pointermove',e=>press.move(point(e)));touch.addEventListener('pointerup',e=>press.up(point(e),dock.clientWidth));touch.addEventListener('pointercancel',()=>press.cancel());touch.addEventListener('lostpointercapture',()=>{if(!expanding&&!bead)press.cancel();});
      /* จุดดำขึ้นแล้ว: นิ้วเป็นของการลาก — ห้ามเบราว์เซอร์เอาไปเลื่อนหน้า/ดึงรีเฟรช (ไม่งั้นสายลากหลุดกลางทาง) */
      touch.addEventListener('touchmove',e=>{if(bead&&e.cancelable)e.preventDefault();},{passive:false});
      touch.addEventListener('contextmenu',e=>e.preventDefault());touch.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();full();}else if(e.key===' '){e.preventDefault();session?.mute();}});
      dock.querySelector('[data-cv="end"]').onclick=()=>session?.end();mute.onclick=()=>session?.mute();dock.querySelector('[data-cv="expand"]').onclick=()=>full();dock.querySelector('[data-cv="pmute"]').onclick=e=>{e.stopPropagation();session?.mute();};
    }
    minimize.onclick=()=>{if(session?.cameraOn)session.camera();collapse();};
    byId('callPhotoBtn').onclick=()=>byId('callPhotoIn').click();
    byId('callPhotoIn').onchange=async e=>{const f=e.target.files&&e.target.files[0];e.target.value='';if(!f||!session?.sendImage)return;const url=URL.createObjectURL(f);photoFly(url);
      try{await session.sendImage(f);}catch(err){byId('callCaption').textContent=T('ส่งรูปไม่สำเร็จ ลองอีกครั้ง','Couldn\'t send the photo — try again');}finally{setTimeout(()=>URL.revokeObjectURL(url),4000);}};
    function photoFly(url){if(mode!=='full')return;const im=document.createElement('img');im.className='cv-photo';im.src=url;im.alt='';root.append(im);const c=orbCenter();
      animate(im,[{opacity:0,transform:'translate(-50%,0) scale(.7)'},{opacity:1,transform:'translate(-50%,-8px) scale(1)',offset:.35},{opacity:1,transform:'translate(-50%,-8px) scale(1)',offset:.7},{opacity:0,transform:`translate(-50%,${Math.round(c.y-(innerHeight-260))}px) scale(.2)`}],{duration:1600,easing:'cubic-bezier(.32,.72,0,1)'}).then(()=>im.remove());if(reduced)setTimeout(()=>im.remove(),1200);}
    root.querySelector('.hh-btn.end').onclick=()=>session?.end();byId('callMuteBtn').onclick=()=>session?.mute();byId('callCamBtn').onclick=()=>{full();session?.camera();};byId('callFlipBtn').onclick=()=>session?.flip();byId('callZoom').oninput=e=>session?.zoom(e.target.value);
    const keydown=e=>{if(!active||mode!=='full')return;if(e.key==='Escape'){e.preventDefault();e.stopImmediatePropagation();minimize.click();}if(e.key==='Tab'){const buttons=[...root.querySelectorAll('button,input')].filter(e=>!e.disabled&&e.getClientRects().length);if(!buttons.length)return;const i=buttons.indexOf(document.activeElement);if((e.shiftKey&&i<=0)||(!e.shiftKey&&i===buttons.length-1)){e.preventDefault();buttons[e.shiftKey?buttons.length-1:0].focus();}}};
    document.addEventListener('keydown',keydown,true);
    const observe=window.IntersectionObserver&&anchor?new IntersectionObserver(entries=>{observed=entries[0].isIntersecting;if(active&&mode==='inline')placeDock(!observed);}):null;observe?.observe(anchor);
    function resize(){
      for(const c of [canvas,wave]){if(!c)continue;const dpr=Math.min(2,window.devicePixelRatio||1),w=c.clientWidth||(c===wave?220:320),h=c.clientHeight||(c===wave?60:320),budget=Math.min(dpr,Math.sqrt((c===wave?900000:1700000)/(w*h)));const W=Math.round(w*budget),H=Math.round(h*budget);if(c.width!==W||c.height!==H){c.width=W;c.height=H;}}
    }
    const ro=window.ResizeObserver?new ResizeObserver(resize):null;ro?.observe(root);ro?.observe(canvas);if(anchor)ro?.observe(anchor);if(dock)ro?.observe(dock);window.addEventListener('resize',resize);
    /* ── วาดทุกเฟรม ── */
    function loop(now){
      raf=0;const dt=clockAt?clamp((now-clockAt)/1000,.001,.05):1/60;clockAt=now;time+=dt;let more=false;
      if(dock&&!dock.hidden&&mode==='inline')more=drawWave(now,dt)||more;
      if(bead)more=moveBead(now,dt)||more;
      if(mode==='full'&&(active||root.classList.contains('cv-ending')))more=drawStage(now)||more;
      if(active||more)raf=requestAnimationFrame(loop);else clockAt=0;
    }
    /* แถบ AI → แท่งคลื่นสีดำ: แท่งติดกันเต็มแถบก่อน แล้วแยกตัวจากตรงกลางออกไป · สปริงทุกแท่งให้ลื่นเหมือนของเหลว */
    function drawWave(now,dt){
      const c=wave,W=c.width,H=c.height;if(!W||!H)return false;const g=c.getContext('2d');
      const dpr=W/Math.max(1,c.clientWidth),fl=floating(),n=clamp(Math.round(c.clientWidth/(fl?9.5:10.5)),14,46);
      if(bars.length!==n)bars=Array.from({length:n},(_,i)=>bars[i]||{h:0,v:0});
      const gap=W/n,bw=clamp(gap*.46,3*dpr,7*dpr),cy=H/2,maxH=H*(fl?.6:.8);
      const kIn=introAt?clamp((now-introAt)/900,0,1):1;if(kIn>=1)introAt=0;
      const kOut=outroAt?clamp((now-outroAt)/560,0,1):0;
      if(bead)gatherK=1;else if(ungatherAt){gatherK=1-out3((now-ungatherAt)/560);if(gatherK<=0){gatherK=0;ungatherAt=0;}}
      else if(holdFrom)gatherK=Math.max(gatherK,clamp((now-holdFrom-220)/780,0,1)*.9);else gatherK=Math.max(0,gatherK-dt*5);
      const muted=lv.muted,a=muted?0:lv.ai,u=muted?0:lv.user,idle=a+u<.05;
      g.clearRect(0,0,W,H);
      const intro=kIn<1||kOut>0;
      if(intro){g.save();g.beginPath();const k=kIn<1?out3(clamp((kIn-.1)/.6,0,1)):1-inOut(kOut);rr(g,0,0,W,H,barR*dpr*(1-k*.0));g.clip();}
      for(let i=0;i<n;i++){
        const b=bars[i],x=(i+.5)*gap,d=Math.abs(i-(n-1)/2)/Math.max(1,(n-1)/2);
        const env=Math.pow(Math.sin((i+.5)/n*Math.PI),.7);
        const texA=.56+.27*Math.sin(i*.74+time*4.6)+.17*Math.cos(i*.31-time*3.1);
        const texU=.5+.3*Math.sin(i*.93-time*8.2)+.2*Math.sin(i*.41+time*5.3);
        let target=bw+maxH*clamp(a*1.2*env*texA+u*1.05*env*texU,0,1);
        if(idle&&!muted)target+=(connecting||lv.waiting)?dpr*10*Math.pow(Math.max(0,Math.sin(time*5.2-i*.42)),6):dpr*2.4*(.5+.5*Math.sin(time*1.7-i*.36));
        if(reduced){b.h=target;b.v=0;}else{const acc=340*(target-b.h)-27*b.v;b.v+=acc*dt;b.h=Math.max(bw*.7,b.h+b.v*dt);}
        let h=b.h,w=bw,xx=x,r=bw/2,col=barTo,alpha=muted?.34:1;
        if(gatherK>0){const gk=inOut(gatherK);xx=mix(x,W/2,gk);h=mix(h,bw*(1+gk*.4),gk);w=mix(bw,bw*(1+gk*.4),gk);r=w/2;if(bead)alpha=0;}
        if(kIn<1){const lk=out3(clamp((kIn-.1-d*.24)/.62,0,1));w=mix(gap+1.5,bw,lk);h=mix(H+2,h,lk);r=mix(0,bw/2,lk);col=barFrom.map((v,j)=>mix(v,barTo[j],lk));}
        if(kOut>0){const lk=inOut(clamp((kOut-(1-d)*.25)/.75,0,1));w=mix(w,gap+1.5,lk);h=mix(h,H+2,lk);r=mix(r,0,lk);col=barTo.map((v,j)=>mix(v,barFrom[j],lk));alpha=mix(alpha,1,lk);}
        if(alpha<=0)continue;
        g.fillStyle=`rgba(${col[0]|0},${col[1]|0},${col[2]|0},${alpha*(col[3]??1)})`;g.beginPath();rr(g,xx-w/2,cy-h/2,w,h,r);g.fill();
      }
      if(intro)g.restore();
      if(kOut>=1&&outroDone){const f=outroDone;outroDone=null;f();}
      return kIn<1||kOut>0||gatherK>0||active;
    }
    /* จุดดำตามนิ้วแบบสปริง · เต้นตามเสียง */
    function moveBead(now,dt){
      if(!bead)return false;const k=1-Math.exp(-dt*(beadBack?14:26));beadPos.x+=(beadGoal.x-beadPos.x)*k;beadPos.y+=(beadGoal.y-beadPos.y)*k;
      const pop=reduced?1:outBack((now-beadBorn)/460),lvl=Math.max(lv.ai,lv.user),back=beadBack?1-out3((now-beadBack)/360)*.55:1;
      bead.style.transform=`translate3d(${beadPos.x-28}px,${beadPos.y-28}px,0) scale(${(mix(.3,1,pop)*(1+lvl*.28)*back).toFixed(3)})`;
      return true;
    }
    /* เต็มจอ: วงกลมส้มพีชแบบเดิม (ชั้นโปร่งซ้อน + แกนครีม) ขยับเป็นคลื่นตามเสียง AI และเสียงผู้ใช้ — ห้ามเปลี่ยนหน้าตา
       เพิ่มแค่จังหวะบานออกตอนเข้า และหดลงตอนวางสาย · เปิดกล้อง = คลื่นขอบจอแบบเดิม */
    function drawStage(now){
      const g=canvas.getContext('2d'),w=canvas.width,h=canvas.height;if(!w||!h||document.hidden)return true;g.clearRect(0,0,w,h);
      const level=clamp(Math.max(lv.ai,lv.user*.82),0,1),time=reduced?0:lv.time;
      if(lv.camera){
        if(level<.01)return true;const depth=(5+48*level)*w/Math.max(1,canvas.clientWidth);
        for(let l=0;l<3;l++){g.fillStyle=l===0?'rgba(255,173,93,.18)':l===1?'rgba(255,151,84,.28)':'rgba(255,206,151,.42)';for(const side of [0,1]){g.beginPath();g.moveTo(side?w:0,0);for(let y=0;y<=h;y+=12){const d=depth*(1-l*.22)*(.55+.22*Math.sin(y/h*14+time*3+l)+.15*Math.sin(y/h*29-time*2));g.lineTo(side?w-d:d,y);}g.lineTo(side?w:0,h);g.closePath();g.fill();}for(const top of [false,true]){g.beginPath();g.moveTo(0,top?0:h);for(let x=0;x<=w;x+=12){const d=depth*(1-l*.22)*(.55+.24*Math.sin(x/w*12+time*3+l));g.lineTo(x,top?d:h-d);}g.lineTo(w,top?0:h);g.closePath();g.fill();}}return true;
      }
      const grow=(reduced?1:outBack((now-O.bloomAt)/900))*(O.closingAt?1-inOut((now-O.closingAt)/380):1);if(grow<=.002)return true;
      const cx=w*.5,cy=h*.5,r=Math.min(w,h)*(.39+.025*level+.002*Math.sin(time*1.2))*grow;
      for(let layer=3;layer>=0;layer--){
        const radius=r*(1+layer*.055),gradient=g.createRadialGradient(cx-radius*.2,cy-radius*.23,0,cx,cy,radius);
        gradient.addColorStop(0,'#fff4d2');gradient.addColorStop(.25,'#ffd19a');gradient.addColorStop(.61,'#ffa360');gradient.addColorStop(.85,'#ff893c');gradient.addColorStop(1,layer?'rgba(255,135,57,0)':'rgba(255,130,49,.86)');g.fillStyle=gradient;g.globalAlpha=layer?.2:1;
        const pts=[];for(let i=0;i<64;i++){const a=i/64*Math.PI*2,d=radius*(1+(.005+level*.038)*(Math.sin(a*3+time*1.7+layer)+.4*Math.sin(a*5-time*2.2)));pts.push([cx+Math.cos(a)*d,cy+Math.sin(a)*d]);}
        g.beginPath();for(let i=0;i<pts.length;i++){const p=pts[i],n=pts[(i+1)%pts.length],m=[(p[0]+n[0])/2,(p[1]+n[1])/2];if(!i)g.moveTo(m[0],m[1]);else g.quadraticCurveTo(p[0],p[1],m[0],m[1]);}g.closePath();g.fill();
      }g.globalAlpha=1;
      g.save();g.clip();
      for(let i=0;i<3;i++){
        const drift=reduced?0:Math.sin(time*.42+i*1.8),x=cx+r*(-.1+i*.07+drift*.05),y=cy+r*(-.09+i*.12),size=r*(.76-i*.16);
        const glow=g.createRadialGradient(x,y,0,x,y,size);glow.addColorStop(0,i===2?'rgba(255,244,202,.48)':'rgba(255,220,166,.3)');glow.addColorStop(.66,'rgba(255,212,152,.12)');glow.addColorStop(1,'rgba(255,200,140,0)');
        g.fillStyle=glow;g.fillRect(cx-r*1.2,cy-r*1.2,r*2.4,r*2.4);
      }g.restore();
      return true;
    }
    function render({ai=0,user=0,time=0,camera=false,muted=false,waiting=false}){
      lv.time=time;lv.ai=clamp(ai,0,1);lv.user=clamp(user,0,1);lv.camera=camera;lv.muted=muted;lv.waiting=waiting;
      if(lastMuted!==muted){lastMuted=muted;if(mute){mute.setAttribute('aria-pressed',String(muted));mute.setAttribute('aria-label',muted?T('เปิดไมค์','Unmute microphone'):T('ปิดไมค์','Mute microphone'));mute.classList.toggle('cv-muted',muted);mute.querySelector('i').className='ti '+(muted?'ti-microphone-off':'ti-microphone');}byId('callMuteBtn').setAttribute('aria-pressed',String(muted));dock?.classList.toggle('cv-is-muted',muted);const pm=dock?.querySelector('.cv-pmic');if(pm){pm.setAttribute('aria-pressed',String(muted));pm.querySelector('i').className='ti '+(muted?'ti-microphone-off':'ti-microphone');}}
      kick();
    }
    function showResults(cards){
      results?.remove();results=document.createElement('section');results.className='cv-results';results.setAttribute('aria-label',T('ร้านจากการค้นหาในสาย','Shops found during your call'));
      const heading=document.createElement('div');heading.className='cv-result-head';heading.textContent=T('ช่างที่ค้นพบ','Mechanics found');const close=document.createElement('button');close.type='button';close.textContent='×';close.setAttribute('aria-label',T('ปิดผลค้นหา','Close results'));close.onclick=()=>{results?.remove();results=null;};heading.append(close);results.append(heading);
      if(!cards.length){const p=document.createElement('p');p.textContent=T('ยังไม่พบร้านที่ตรง ลองระบุพื้นที่หรือหมวดงานครับ','No matching shop. Try an area or category.');results.append(p);}
      for(const card of cards.slice(0,5)){const button=document.createElement(onSelectShop?'button':'a');button.className='cv-result';if(onSelectShop){button.type='button';button.onclick=()=>onSelectShop(card.id);}else{button.href='/tech/'+encodeURIComponent(card.id);button.target='_blank';button.rel='noopener';}const name=document.createElement('b'),detail=document.createElement('small');name.textContent=card.name;detail.textContent=[card.area,card.distanceKm!=null?card.distanceKm+' '+T('กม. โดยประมาณ','km approx.'):null,card.startingPrice?T('เริ่ม ฿','from ฿')+card.startingPrice:null].filter(Boolean).join(' · ');button.append(name,detail);results.append(button);}
      placeResults();
    }
    function showResearch(r){
      results?.remove();results=document.createElement('section');results.className='cv-results';results.setAttribute('role','status');results.setAttribute('aria-live','polite');
      const head=document.createElement('div');head.className='cv-result-head';head.textContent=T('ค้นอินเทอร์เน็ต','Internet research');
      const close=document.createElement('button');close.type='button';close.textContent='×';close.setAttribute('aria-label',T('ปิดผลค้นหา','Close results'));close.onclick=()=>{results?.remove();results=null};head.append(close);results.append(head);
      const p=document.createElement('p');p.textContent=r.status==='searching'?T('กำลังค้นเอกสารสาธารณะ…','Searching public documents…'):r.status==='found'?T('พบเอกสาร ยังไม่ใช่การยืนยันอาการเสีย','Documents found — not a confirmed diagnosis'):r.status==='links_only'?T('พบลิงก์ แต่ยังอ่านเนื้อหาไม่ได้','Links found; content not read'):T('ยังค้นเอกสารไม่ได้ ไม่ใช้ข้อมูลที่เดาขึ้น','Research unavailable; no invented sources');results.append(p);
      for(const s of (r.sources||[]).slice(0,3)){try{const u=new URL(s.url);if(u.protocol!=='https:'||u.username||u.password)continue;const a=document.createElement('a');a.className='cv-result';a.href=u.href;a.target='_blank';a.rel='noopener noreferrer';const b=document.createElement('b'),small=document.createElement('small');b.textContent=s.title||u.hostname;small.textContent=s.status==='read'?T('อ่านหน้าเว็บแล้ว • ตรวจความตรงรุ่นก่อนใช้','Page read • check model applicability'):T('ลิงก์เท่านั้น ยังไม่ได้อ่าน','Link only; not read');a.append(b,small);results.append(a)}catch{}}
      for(const s of (r.manufacturerEvidence?.records||[]).slice(0,3)){try{const u=new URL(s.url);if(u.protocol!=='https:'||u.hostname!=='static.nhtsa.gov'||u.username||u.password)continue;const a=document.createElement('a');a.className='cv-result';a.href=u.href;a.target='_blank';a.rel='noopener noreferrer';const b=document.createElement('b'),small=document.createElement('small');b.textContent=s.title;small.textContent=T('เอกสารที่ตรวจไว้ • ตลาด ','Previously reviewed • market ')+(s.markets||[]).join(', ')+T(' • ไม่ใช่ผลวินิจฉัย ยังต้องเทียบรถคันนี้',' • not a diagnosis; applicability unconfirmed');a.append(b,small);results.append(a)}catch{}}
      placeResults();
    }
    function showDraft(symptom){showResults([]);results.replaceChildren();const p=document.createElement('p');p.textContent=T('ร่างงานด่วน ยังไม่ได้ส่ง: ','Urgent draft, not submitted: ')+symptom;const a=document.createElement('a');a.className='cv-result';a.textContent=T('ตรวจรายละเอียดและเลือกช่าง','Review details and choose a mechanic');a.href='/?q='+encodeURIComponent(symptom);a.target='_blank';a.rel='noopener';results.append(p,a);}
    /* การ์ด Cendon Valet ในสาย: สรุปสิ่งที่จะทำ · ยังขาดอะไร · ปุ่มยืนยัน/ยกเลิก (ผู้ใช้พูดยืนยันแทนการกดก็ได้) · ผลจริงหลังทำ */
    function showValet(v){
      results?.remove();results=null;if(!v)return;
      results=document.createElement('section');results.className='cv-results cv-valet'+(v.red?' cv-red':'');results.setAttribute('role','status');results.setAttribute('aria-live','polite');
      const head=document.createElement('div');head.className='cv-result-head';const ttl=document.createElement('span');ttl.innerHTML='<i class="ti ti-heart-handshake"></i>';const tt=document.createElement('b');tt.textContent='Cendon Valet · '+v.title;ttl.append(tt);
      const x=document.createElement('button');x.type='button';x.textContent='×';x.setAttribute('aria-label',T('ปิด','Close'));x.onclick=()=>{if(v.state==='ready'||v.state==='missing'||v.state==='allow')v.onCancel?.();else{results?.remove();results=null;}};head.append(ttl,x);results.append(head);
      const list=document.createElement('ul');for(const l of v.lines||[]){const li=document.createElement('li');li.textContent=l;list.append(li);}if(list.childNodes.length)results.append(list);
      if(v.missing?.length&&v.state==='missing'){const m=document.createElement('p');m.className='cv-miss';m.textContent=T('ยังขาด: ','Still needed: ')+v.missing.join(' · ');results.append(m);}
      if(v.text){const m=document.createElement('p');m.className=v.state==='error'?'cv-miss':'cv-ok';m.textContent=v.text;results.append(m);}
      const acts=document.createElement('div');acts.className='cv-acts';
      const btn=(label,cls,fn)=>{const b=document.createElement('button');b.type='button';b.className='cv-vb '+cls;b.textContent=label;b.onclick=fn;acts.append(b);return b;};
      if(v.state==='ready'||v.state==='error')btn(v.state==='error'?T('ลองอีกครั้ง','Try again'):T('ยืนยัน','Confirm'),v.red?'red':'',e=>{e.currentTarget.disabled=true;v.onConfirm?.();});
      if(v.state==='allow')btn(T('อนุญาต Valet','Allow Valet'),'',e=>{e.currentTarget.disabled=true;v.onConfirm?.();});
      if(v.state==='ready'||v.state==='missing'||v.state==='allow'||v.state==='error')btn(T('ยกเลิก','Cancel'),'gh',()=>v.onCancel?.());
      if(v.state==='busy'){const p=document.createElement('p');p.className='cv-ok';p.textContent=T('กำลังทำให้…','Working on it…');results.append(p);}
      if(v.state==='done'&&v.url){const a=document.createElement('a');a.className='cv-vb gh';a.textContent=T('เปิดดู','Open');a.href=v.url;a.target='_blank';a.rel='noopener';acts.append(a);}
      if(v.state==='ready'){const h=document.createElement('p');h.className='cv-hint';h.textContent=T('พูดว่า “ยืนยัน” หรือกดปุ่ม — ยังไม่มีอะไรถูกส่งจนกว่าคุณยืนยัน','Say “confirm” or tap — nothing is sent until you confirm');results.append(h);}
      if(acts.childNodes.length)results.append(acts);
      placeResults();
    }
    return Object.freeze({byId,open,close,render,resize,showResults,showDraft,showValet,showResearch,bind(value){session=value;},
      state(state,text){connecting=state!=='link';if(caption&&text)caption.textContent=text;if(stateText)stateText.textContent=toolsReady===false?T('โหมดเสียง · เครื่องมือยังไม่เปิด','Voice · tools unavailable'):state==='link'?T('Cendon · ต่อสายแล้ว','Cendon · connected'):'Cendon';byId('callCamBtn').disabled=state!=='link'&&!session?.cameraOn;},
      caption(who,text){if(caption)caption.textContent=text;const el=byId('callCaption');if(el.textContent!==text)el.textContent=text;},
      agentAvailable(ok){toolsReady=ok;capability.hidden=ok;if(!ok&&stateText)stateText.textContent=T('โหมดเสียง · เครื่องมือยังไม่เปิด','Voice · tools unavailable');},
      minimize(){if(!active)return;if(mode==='full')collapse();else placeDock(true),placeResults();},refresh(){if(active&&mode==='inline'){placeDock(!observed);placeResults();}},expand:full,
      dispose(){run++;cancelAnimationFrame(raf);raf=0;for(const animation of animations)animation.cancel();animations.clear();root.classList.remove('cv-ending');root.style.clipPath='';press.dispose();ro?.disconnect();observe?.disconnect();document.removeEventListener('keydown',keydown,true);window.removeEventListener('resize',resize);clearDrag();results?.remove();originals(false);dock?.remove();anchor?.classList.remove('cv-host','cv-active');minimize.remove();capability.remove();}});
  }
  window.CendonCallSurface=Object.freeze({create,gesture});
})();
