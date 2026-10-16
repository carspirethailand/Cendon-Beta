/* A view, not a second call. Mode changes never acquire a mic or a Live token. */
(() => {
  'use strict';
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  function gesture({onHold=()=>{},onDrag=()=>{},onMove=()=>{},onSwipe=()=>{},onDrop=()=>{},onCancel=()=>{},later=setTimeout,cancel=clearTimeout}){
    let start=null,timer=0,held=false;
    function reset(){cancel(timer);timer=0;start=null;held=false;}
    return{
      down(p){reset();start=p;timer=later(()=>{if(!start)return;held=true;onHold(start);},1000);},
      move(p){if(!start)return;const dx=p.x-start.x,dy=p.y-start.y;if(held){onDrag(p,start);return;}if(Math.hypot(dx,dy)>12){cancel(timer);timer=0;}if(Math.abs(dx)>Math.abs(dy)*1.25)onMove(dx);},
      up(p,width=320){if(!start)return;const dx=p.x-start.x,dy=p.y-start.y,dt=Math.max(1,p.time-start.time),wasHeld=held;reset();if(wasHeld){onDrop(p);return;}if(Math.abs(dx)>Math.abs(dy)*1.25&&(Math.abs(dx)>Math.min(100,width*.26)||(Math.abs(dx)>45&&Math.abs(dx)/dt>.7)))onSwipe(Math.sign(dx));else onCancel();},
      cancel(){reset();onCancel();},dispose:reset,
    };
  }
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
    let session=null,mode=anchor?'inline':'full',active=false,run=0,direction=0,ghost=null,target=null,expanding=false,bead=0,beadTarget=0,lastAt=0,priorFocus=null,results=null,toolsReady=null;
    let wave=null,caption=null,stateText=null,dock=null,mute=null,observed=true,lastMuted=null;
    const reduced=window.matchMedia?.('(prefers-reduced-motion:reduce)').matches||false;
    const original=anchor?[...anchor.children]:[],savedInert=new Map();
    const animations=new Set();
    const minimize=document.createElement('button');minimize.className='cv-min';minimize.type='button';minimize.setAttribute('aria-label',T('ย่อสาย กลับหน้าหลัก','Minimize call'));minimize.innerHTML='<i class="ti ti-chevron-down"></i>';minimize.hidden=!anchor;root.querySelector('.hh-top').prepend(minimize);
    if(anchor){
      anchor.classList.add('cv-host');dock=document.createElement('div');dock.className='cv-dock';dock.hidden=true;
      dock.innerHTML=`<div class="cv-wave-touch" tabindex="0" role="button" aria-label="${T('คลื่นเสียง ปัดซ้ายหรือขวาเพื่อวางสาย กดค้างหนึ่งวินาทีแล้วลากกลางจอเพื่อขยาย','Voice wave. Swipe to end. Hold one second and drag to the centre to expand.')}"><canvas class="cv-wave" aria-hidden="true"></canvas><div class="cv-copy"><span class="cv-label">Cendon</span><span class="cv-caption">${T('กำลังต่อสาย','Connecting')}</span></div></div><div class="cv-actions"><button class="cv-control" data-cv="mute" type="button" aria-label="${T('ปิดไมค์','Mute microphone')}"><i class="ti ti-microphone"></i></button><button class="cv-control" data-cv="expand" type="button" aria-label="${T('ขยายสายเต็มจอ','Expand call')}"><i class="ti ti-arrows-maximize"></i></button><button class="cv-control cv-end" data-cv="end" type="button" aria-label="${T('วางสาย','End call')}"><i class="ti ti-phone-off"></i></button></div>`;
      anchor.append(dock);wave=dock.querySelector('canvas');caption=dock.querySelector('.cv-caption');stateText=dock.querySelector('.cv-label');mute=dock.querySelector('[data-cv="mute"]');
    }
    const animate=(el,frames,options)=>{if(reduced||!el.animate)return Promise.resolve();try{const animation=el.animate(frames,options);animations.add(animation);return animation.finished.catch(()=>{}).finally(()=>animations.delete(animation));}catch{return Promise.resolve();}};
    function originals(on){for(const el of original){if(on){if(!savedInert.has(el))savedInert.set(el,el.inert);el.inert=true;}else{el.inert=savedInert.get(el)||false;savedInert.delete(el);}}}
    function clearDrag(){ghost?.remove();target?.remove();ghost=target=null;beadTarget=0;}
    function placeDock(floating){
      if(!dock)return;
      const parent=floating?document.body:anchor;
      if(dock.parentNode!==parent)parent.append(dock);
      dock.classList.toggle('cv-floating',floating);
    }
    function setMode(next,{floating=false}={}){
      if(next==='inline'&&!anchor)return;mode=next;
      root.classList.toggle('cv-inline-call',mode==='inline');root.setAttribute('aria-hidden',mode==='inline'?'true':'false');
      if(mode==='full')root.setAttribute('aria-modal','true');else root.removeAttribute('aria-modal');
      if(dock){dock.hidden=!active||mode!=='inline';placeDock(floating||!observed);}
      if(results)(mode==='full'?root:anchor.parentNode).append(results);
      if(mode==='full'){resize();if(active)root.querySelector('.hh-btn.end')?.focus({preventScroll:true});}
    }
    function open(){
      for(const animation of animations)animation.cancel();animations.clear();
      run++;active=true;direction=0;expanding=false;bead=beadTarget=0;lastMuted=null;priorFocus=document.activeElement;root.classList.remove('cv-ending');clearDrag();
      if(anchor){originals(true);anchor.classList.add('cv-active');dock.style.transform='';dock.style.opacity='';}
      setMode(anchor?'inline':'full');resize();
      if(!anchor)animate(root,[{opacity:0},{opacity:1}],{duration:300,easing:'ease-out'});
    }
    function close(){
      const closing=++run;active=false;press?.dispose();clearDrag();expanding=false;results?.remove();results=null;
      if(anchor){
        const dx=(direction||1)*(Math.max(360,anchor.clientWidth)+40);
        const finish=()=>{if(run!==closing)return;dock.hidden=true;dock.style.transform='';dock.style.opacity='';placeDock(false);};
        animate(dock,[{transform:dock.style.transform||'translateX(0)',opacity:1},{transform:`translateX(${dx||24}px)`,opacity:0}],{duration:reduced?0:240,easing:'cubic-bezier(.3,0,.7,1)'}).then(finish);
        anchor.classList.remove('cv-active');originals(false);
      }
      if(mode==='full'){
        root.classList.add('cv-ending');animate(root,[{opacity:1},{opacity:0}],{duration:180,easing:'ease-out'}).then(()=>{if(run===closing)root.classList.remove('cv-ending');});
      }
      if(priorFocus?.isConnected)priorFocus.focus?.({preventScroll:true});
    }
    function full(wipe=false){
      if(!active||expanding)return;
      if(!wipe||reduced){clearDrag();setMode('full');return;}
      expanding=true;const currentRun=run,dot=ghost;
      if(!dot){expanding=false;setMode('full');return;}
      target?.remove();target=null;setMode('full');
      const radius=Math.hypot(innerWidth,innerHeight)/48;
      animate(dot,[{transform:dot.style.transform,opacity:1},{transform:`translate3d(${innerWidth/2-28}px,${innerHeight/2-28}px,0) scale(${radius})`,opacity:1},{transform:`translate3d(${innerWidth/2-28}px,${innerHeight/2-28}px,0) scale(${radius})`,opacity:0}],{duration:650,easing:'cubic-bezier(.18,.8,.22,1)',fill:'forwards'}).then(()=>{if(run!==currentRun)return;clearDrag();expanding=false;});
    }
    function hold(){
      if(!active||mode!=='inline')return;
      beadTarget=1;const r=wave.getBoundingClientRect();ghost=document.createElement('div');ghost.className='cv-bead';ghost.setAttribute('aria-hidden','true');ghost.style.transform=`translate3d(${r.left+r.width/2-28}px,${r.top+r.height/2-28}px,0)`;
      target=document.createElement('div');target.className='cv-drop';target.innerHTML=`<span></span><p>${T('ลากมาที่นี่ เพื่อคุยเต็มจอ','Drag here to open your call')}</p>`;document.body.append(target,ghost);
      animate(ghost,[{opacity:0,scale:.5},{opacity:1,scale:1}],{duration:240,easing:'cubic-bezier(.16,1,.3,1)'});
    }
    function drag(p,start){
      if(!ghost||expanding)return;ghost.style.transform=`translate3d(${p.x-28}px,${p.y-28}px,0)`;
      const atCentre=Math.hypot(p.x-innerWidth/2,p.y-innerHeight/2)<Math.min(120,innerWidth*.25),moved=Math.hypot(p.x-start.x,p.y-start.y)>44;
      target?.classList.toggle('cv-ready',atCentre&&moved);if(atCentre&&moved)full(true);
    }
    function cancelDrag(){if(expanding)return;clearDrag();if(dock){dock.style.transform='';dock.style.opacity='';}}
    const press=gesture({onHold:hold,onDrag:drag,onMove:dx=>{if(!dock||!active)return;dock.style.transform=`translate3d(${dx*.72}px,0,0)`;dock.style.opacity=String(1-Math.min(.65,Math.abs(dx)/340));},onSwipe:d=>{direction=d;session?.end();},onDrop:()=>{if(!expanding)cancelDrag();},onCancel:cancelDrag});
    if(dock){
      dock.addEventListener('pointerdown',()=>session?.wake?.());
      const touch=dock.querySelector('.cv-wave-touch'),point=e=>({x:e.clientX,y:e.clientY,time:e.timeStamp});
      touch.addEventListener('pointerdown',e=>{if(e.button!==0||!active)return;try{touch.setPointerCapture(e.pointerId);}catch{}press.down(point(e));});
      touch.addEventListener('pointermove',e=>press.move(point(e)));touch.addEventListener('pointerup',e=>press.up(point(e),dock.clientWidth));touch.addEventListener('pointercancel',()=>press.cancel());touch.addEventListener('lostpointercapture',()=>{if(!expanding)press.cancel();});
      touch.addEventListener('contextmenu',e=>e.preventDefault());touch.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();full();}});
      dock.querySelector('[data-cv="end"]').onclick=()=>session?.end();mute.onclick=()=>session?.mute();dock.querySelector('[data-cv="expand"]').onclick=()=>full();
    }
    minimize.onclick=()=>{if(session?.cameraOn)session.camera();setMode('inline');};
    root.querySelector('.hh-btn.end').onclick=()=>session?.end();byId('callMuteBtn').onclick=()=>session?.mute();byId('callCamBtn').onclick=()=>{full();session?.camera();};byId('callFlipBtn').onclick=()=>session?.flip();byId('callZoom').oninput=e=>session?.zoom(e.target.value);
    const keydown=e=>{if(!active||mode!=='full')return;if(e.key==='Escape'){e.preventDefault();e.stopImmediatePropagation();if(anchor)minimize.click();else session?.end();}if(e.key==='Tab'){const buttons=[...root.querySelectorAll('button,input')].filter(e=>!e.disabled&&e.getClientRects().length);if(!buttons.length)return;const i=buttons.indexOf(document.activeElement);if((e.shiftKey&&i<=0)||(!e.shiftKey&&i===buttons.length-1)){e.preventDefault();buttons[e.shiftKey?buttons.length-1:0].focus();}}};
    document.addEventListener('keydown',keydown,true);
    const observe=window.IntersectionObserver&&anchor?new IntersectionObserver(entries=>{observed=entries[0].isIntersecting;if(active&&mode==='inline')placeDock(!observed);}):null;observe?.observe(anchor);
    function resize(){
      for(const c of [canvas,wave]){if(!c)continue;const dpr=Math.min(1.5,window.devicePixelRatio||1),w=c.clientWidth||(c===wave?220:320),h=c.clientHeight||(c===wave?60:320),budget=Math.min(dpr,Math.sqrt(1600000/(w*h)));c.width=Math.round(w*budget);c.height=Math.round(h*budget);}
    }
    const ro=window.ResizeObserver?new ResizeObserver(resize):null;ro?.observe(root);ro?.observe(canvas);if(anchor)ro?.observe(anchor);if(dock)ro?.observe(dock);window.addEventListener('resize',resize);
    function rounded(g,x,y,w,h){const r=Math.min(w/2,h/2);g.beginPath();g.moveTo(x+r,y);g.arcTo(x+w,y,x+w,y+h,r);g.arcTo(x+w,y+h,x,y+h,r);g.arcTo(x,y+h,x,y,r);g.arcTo(x,y,x+w,y,r);g.closePath();g.fill();}
    function render({ai=0,user=0,time=0,camera=false,muted=false}){
      const now=performance.now();if(document.hidden||now-lastAt<(reduced?32:14))return;lastAt=now;
      const level=clamp(Math.max(ai,user*.82),0,1);if(reduced)time=0;bead+=(beadTarget-bead)*.18;
      if(lastMuted!==muted){lastMuted=muted;if(mute){mute.setAttribute('aria-pressed',String(muted));mute.setAttribute('aria-label',muted?T('เปิดไมค์','Unmute microphone'):T('ปิดไมค์','Mute microphone'));mute.classList.toggle('cv-muted',muted);mute.querySelector('i').className='ti '+(muted?'ti-microphone-off':'ti-microphone');}byId('callMuteBtn').setAttribute('aria-pressed',String(muted));}
      if(mode==='inline'&&wave){
        const g=wave.getContext('2d'),w=wave.width,h=wave.height;g.clearRect(0,0,w,h);g.fillStyle='#151515';
        const n=clamp(Math.round(w/7),17,37),gap=w/n,bw=Math.max(2,gap*.4),cx=w/2,cy=h/2;
        for(let i=0;i<n;i++){const envelope=Math.sin((i+.5)/n*Math.PI),texture=.48+.25*Math.sin(i*.74+time*4.6)+.2*Math.cos(i*.31-time*3),height=4+level*envelope*texture*h*.9,x=(i+.5)*gap;const x2=x+(cx-x)*bead,h2=height+(42-height)*bead,b2=bw+(42-bw)*bead;g.globalAlpha=1-bead*.9;rounded(g,x2-b2/2,cy-h2/2,b2,h2);}g.globalAlpha=1;return;
      }
      if(mode!=='full')return;
      const g=canvas.getContext('2d'),w=canvas.width,h=canvas.height;g.clearRect(0,0,w,h);
      if(camera){
        if(level<.01)return;const depth=(5+48*level)*w/Math.max(1,canvas.clientWidth);
        for(let l=0;l<3;l++){g.fillStyle=l===0?'rgba(255,173,93,.18)':l===1?'rgba(255,151,84,.28)':'rgba(255,206,151,.42)';for(const side of [0,1]){g.beginPath();g.moveTo(side?w:0,0);for(let y=0;y<=h;y+=12){const d=depth*(1-l*.22)*(.55+.22*Math.sin(y/h*14+time*3+l)+.15*Math.sin(y/h*29-time*2));g.lineTo(side?w-d:d,y);}g.lineTo(side?w:0,h);g.closePath();g.fill();}for(const top of [false,true]){g.beginPath();g.moveTo(0,top?0:h);for(let x=0;x<=w;x+=12){const d=depth*(1-l*.22)*(.55+.24*Math.sin(x/w*12+time*3+l));g.lineTo(x,top?d:h-d);}g.lineTo(w,top?0:h);g.closePath();g.fill();}}return;
      }
      const cx=w*.5,cy=h*.5,r=Math.min(w,h)*(.39+.025*level+.002*Math.sin(time*1.2));
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
    }
    function showResults(cards){
      results?.remove();results=document.createElement('section');results.className='cv-results';results.setAttribute('aria-label',T('ร้านจากการค้นหาในสาย','Shops found during your call'));
      const heading=document.createElement('div');heading.className='cv-result-head';heading.textContent=T('ช่างที่ค้นพบ','Mechanics found');const close=document.createElement('button');close.type='button';close.textContent='×';close.setAttribute('aria-label',T('ปิดผลค้นหา','Close results'));close.onclick=()=>{results?.remove();results=null;};heading.append(close);results.append(heading);
      if(!cards.length){const p=document.createElement('p');p.textContent=T('ยังไม่พบร้านที่ตรง ลองระบุพื้นที่หรือหมวดงานครับ','No matching shop. Try an area or category.');results.append(p);}
      for(const card of cards.slice(0,5)){const button=document.createElement(onSelectShop?'button':'a');button.className='cv-result';if(onSelectShop){button.type='button';button.onclick=()=>onSelectShop(card.id);}else{button.href='/tech/'+encodeURIComponent(card.id);button.target='_blank';button.rel='noopener';}const name=document.createElement('b'),detail=document.createElement('small');name.textContent=card.name;detail.textContent=[card.area,card.distanceKm!=null?card.distanceKm+' '+T('กม. โดยประมาณ','km approx.'):null,card.startingPrice?T('เริ่ม ฿','from ฿')+card.startingPrice:null].filter(Boolean).join(' · ');button.append(name,detail);results.append(button);}
      (mode==='inline'?anchor.parentNode:root).append(results);
    }
    function showDraft(symptom){showResults([]);results.replaceChildren();const p=document.createElement('p');p.textContent=T('ร่างงานด่วน ยังไม่ได้ส่ง: ','Urgent draft, not submitted: ')+symptom;const a=document.createElement('a');a.className='cv-result';a.textContent=T('ตรวจรายละเอียดและเลือกช่าง','Review details and choose a mechanic');a.href='/?q='+encodeURIComponent(symptom);a.target='_blank';a.rel='noopener';results.append(p,a);}
    return Object.freeze({byId,open,close,render,resize,showResults,showDraft,bind(value){session=value;},state(state,text){if(caption&&text)caption.textContent=text;if(stateText)stateText.textContent=toolsReady===false?T('โหมดเสียง · เครื่องมือยังไม่เปิด','Voice · tools unavailable'):state==='link'?T('Cendon · ต่อสายแล้ว','Cendon · connected'):'Cendon';byId('callCamBtn').disabled=state!=='link'&&!session?.cameraOn;},caption(who,text){if(caption)caption.textContent=text;const el=byId('callCaption');if(el.textContent!==text)el.textContent=text;},agentAvailable(ok){toolsReady=ok;capability.hidden=ok;if(!ok&&stateText)stateText.textContent=T('โหมดเสียง · เครื่องมือยังไม่เปิด','Voice · tools unavailable');},minimize(){if(session?.cameraOn)session.camera();setMode('inline',{floating:true});},expand:full,dispose(){run++;for(const animation of animations)animation.cancel();animations.clear();root.classList.remove('cv-ending');press.dispose();ro?.disconnect();observe?.disconnect();document.removeEventListener('keydown',keydown,true);window.removeEventListener('resize',resize);clearDrag();results?.remove();originals(false);dock?.remove();minimize.remove();capability.remove();}});
  }
  window.CendonCallSurface=Object.freeze({create,gesture});
})();
