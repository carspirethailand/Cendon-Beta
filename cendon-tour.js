(function(global){
  'use strict';
  const clamp=(value,min,max)=>Math.min(Math.max(value,min),Math.max(min,max));
  function geometry(rect,viewport,card,padding=9){
    const width=Math.max(1,viewport.width),height=Math.max(1,viewport.height);
    const ox=viewport.left||0,oy=viewport.top||0;
    const left=clamp(rect.left-ox-padding,0,width),top=clamp(rect.top-oy-padding,0,height);
    const right=clamp(rect.right-ox+padding,left,width),bottom=clamp(rect.bottom-oy+padding,top,height);
    const hole={left,top,width:right-left,height:bottom-top,right,bottom};
    const cw=Math.max(1,Math.min(card.width,width-32)),ch=Math.max(1,Math.min(card.height,height-32)),gap=34;
    const fitsBelow=bottom+gap+ch<=height-16,fitsAbove=top-gap-ch>=16;
    const below=fitsBelow||(!fitsAbove&&height-bottom>=top);
    const cx=clamp((left+right-cw)/2,16,width-cw-16);
    const cy=clamp(below?bottom+gap:top-gap-ch,16,height-ch-16);
    return{hole,card:{left:cx,top:cy,width:cw,height:ch},below,overlap:cy<bottom&&cy+ch>top,
      scrims:[{left:0,top:0,width,height:top},{left:0,top:bottom,width,height:height-bottom},
        {left:0,top,width:left,height:bottom-top},{left:right,top,width:width-right,height:bottom-top}]};
  }
  const defaultSteps=[
    {selector:'#hForm, #hq',th:['เล่าอาการรถได้ตรงนี้','พิมพ์สิ่งที่คุณสังเกตได้ Cendon จะช่วยทำความเข้าใจและแนะนำขั้นตอนถัดไป'],en:['Start with what you notice','Tell Cendon what is happening with your car. We will help you understand what to do next.']},
    {selector:'#hQuick',th:['เครื่องมือที่ใช้ได้ทุกวัน','ตรวจใบเสนอราคา ฟังเสียงรถ และใช้เครื่องมือดูแลรถจากตรงนี้'],en:['Your everyday car tools','Check a quote, listen to a car sound and open your everyday car-care tools here.']},
    {selector:'#hRail',th:['หาความช่วยเหลือให้ตรงจุด','เลือกหมวดงานที่ต้องการ แล้วดูข้อมูลช่างก่อนตัดสินใจ'],en:['Find the right help','Choose the kind of work you need and review technician information before deciding.']},
    {selector:'#myCar',th:['รถของคุณอยู่ตรงนี้','เพิ่มรถและเลือกคันที่คุณใช้อยู่ เพื่อให้คำแนะนำเหมาะกับรถคันนั้น'],en:['Make it about your car','Add your car and choose the one you are using for more relevant guidance.']},
    {selector:'#mnav, #avatarBtn',th:['กลับมาหาทุกอย่างได้ง่าย','เปิดการาจ แชต และบัญชีของคุณได้จากเมนู เปลี่ยนภาษาและหน่วยต่าง ๆ ได้ภายหลัง'],en:['Everything has its place','Your garage, chat and account are in the navigation. You can change language and units later.']}
  ];
  let generation=0,active=null;
  const timers=new Map();
  function delay(ms){return new Promise(resolve=>{const id=setTimeout(()=>{timers.delete(id);resolve(true);},ms);timers.set(id,resolve);});}
  function visible(node){
    if(!node||!node.isConnected||node.hidden)return false;
    const style=getComputedStyle(node),rect=node.getBoundingClientRect();
    return style.display!=='none'&&style.visibility!=='hidden'&&Number(style.opacity)!==0&&rect.width>2&&rect.height>2;
  }
  function find(step){
    try{return Array.from(document.querySelectorAll(step.selector)).find(visible)||null;}catch(_){return null;}
  }
  function viewport(){const vv=global.visualViewport;return{left:vv?.offsetLeft||0,top:vv?.offsetTop||0,width:vv?.width||global.innerWidth,height:vv?.height||global.innerHeight};}
  function box(node,rect){Object.assign(node.style,{left:rect.left+'px',top:rect.top+'px',width:rect.width+'px',height:rect.height+'px'});}
  function removeListener(target,name,handler,options){target.removeEventListener(name,handler,options);}
  function stop(){
    generation++;
    for(const [id,resolve] of timers){clearTimeout(id);resolve(false);}timers.clear();
    const state=active;active=null;if(!state)return;
    if(state.frame)cancelAnimationFrame(state.frame);
    state.listeners.forEach(args=>removeListener(...args));
    state.observer?.disconnect();
    state.inert.forEach(([node,previous])=>{if(node.isConnected)node.inert=previous;});
    state.root.remove();
    if(state.previousFocus?.isConnected&&!state.previousFocus.inert){try{state.previousFocus.focus({preventScroll:true});}catch(_){}}
  }
  function listen(state,target,name,handler,options){target.addEventListener(name,handler,options);state.listeners.push([target,name,handler,options]);}
  function chooseLanguage(options){return options.language||document.documentElement.lang||'th';}
  function makeNode(tag,className,parent){const node=document.createElement(tag);node.className=className;parent?.appendChild(node);return node;}
  function arrowPath(layout){
    const h=layout.hole,c=layout.card;
    const sx=clamp(c.left+c.width*.72,20,c.left+c.width-20),sy=layout.below?c.top-8:c.top+c.height+8;
    const ex=clamp(h.left+h.width*.65,12,h.right-12),ey=layout.below?h.bottom+5:h.top-5;
    const bend=layout.below?-1:1,mid=(sy+ey)/2;
    const d=`M${sx} ${sy}C${sx+18} ${mid} ${ex+14} ${mid} ${ex} ${ey}`;
    return d+`M${ex-5} ${ey-bend*7}L${ex} ${ey}L${ex+7} ${ey-bend*4}`;
  }
  function schedule(state){
    if(active!==state||state.frame)return;
    state.frame=requestAnimationFrame(()=>{state.frame=0;layout(state);});
  }
  function layout(state){
    if(active!==state)return;
    let target=find(state.steps[state.index]);
    if(!target){
      const next=state.steps.findIndex((step,index)=>index>state.index&&find(step));
      if(next<0){finish(state,'completed');return;}
      show(state,next);return;
    }
    const v=viewport();box(state.root,{left:v.left,top:v.top,width:v.width,height:v.height});
    state.root.style.right='auto';state.root.style.bottom='auto';
    let result=geometry(target.getBoundingClientRect(),v,{width:Math.min(400,v.width-32),height:state.card.offsetHeight});
    if(result.overlap&&!state.scrollAdjusted&&target!==document.getElementById('mnav')){
      state.scrollAdjusted=true;
      const desired=24+v.top,current=target.getBoundingClientRect().top;
      const adjustment=current-desired;
      if(Math.abs(adjustment)>1){global.scrollBy({top:adjustment,behavior:'instant'});result=geometry(target.getBoundingClientRect(),v,{width:Math.min(400,v.width-32),height:state.card.offsetHeight});}
    }
    state.scrims.forEach((node,index)=>box(node,result.scrims[index]));box(state.hole,result.hole);
    Object.assign(state.card.style,{left:result.card.left+'px',top:result.card.top+'px'});
    state.arrow.setAttribute('viewBox',`0 0 ${v.width} ${v.height}`);
    state.arrow.setAttribute('width',v.width);state.arrow.setAttribute('height',v.height);
    state.path.setAttribute('d',result.overlap?'':arrowPath(result));
  }
  function show(state,index){
    if(active!==state||state.busy)return;
    state.index=clamp(index,0,state.steps.length-1);state.scrollAdjusted=false;
    const step=state.steps[state.index],target=find(step),copy=step[state.english?'en':'th']||step.th||step.en;
    state.title.textContent=step.title||copy?.[0]||'';state.copy.textContent=step.text||copy?.[1]||'';
    state.count.textContent=state.english?`${state.index+1} of ${state.steps.length}`:`${state.index+1} จาก ${state.steps.length}`;
    state.back.hidden=state.index===0;
    state.next.textContent=state.index===state.steps.length-1?(state.english?'Start using Cendon':'เริ่มใช้ Cendon'):(state.english?'Next':'ถัดไป');
    state.error.hidden=true;
    if(target&&target!==document.getElementById('mnav')&&target!==document.getElementById('avatarBtn'))target.scrollIntoView({block:'center',inline:'nearest',behavior:'instant'});
    layout(state);state.next.focus({preventScroll:true});
  }
  async function finish(state,status){
    if(active!==state||state.busy)return;
    state.busy=true;state.finishStatus=status;state.error.hidden=true;
    [state.next,state.back,state.skip].forEach(button=>button.disabled=true);
    state.next.textContent=state.english?'Saving…':'กำลังบันทึก…';
    try{
      const result=await state.finish(status);
      if(active!==state||state.generation!==generation)return;
      if(result===false)throw new Error('Not saved');
      stop();
    }catch(_){
      if(active!==state||state.generation!==generation)return;
      state.busy=false;state.error.textContent=state.english?'We could not save this step. Please try again.':'ยังบันทึกไม่ได้ กรุณาลองอีกครั้ง';state.error.hidden=false;
      [state.next,state.back,state.skip].forEach(button=>button.disabled=false);
      state.next.textContent=state.english?'Try again':'ลองอีกครั้ง';state.next.focus({preventScroll:true});schedule(state);
    }
  }
  async function start(options={}){
    stop();const token=generation;
    const requested=Array.isArray(options.targets)?options.targets.slice(0,5).map(step=>typeof step==='string'?{selector:step,title:'Cendon',text:''}:step):defaultSteps;
    let steps=[],previous='',stable=0;
    // Existing home content may appear just after authenticated hydration.
    for(let attempt=0;attempt<11;attempt++){
      if(token!==generation)return false;
      steps=requested.filter(step=>step&&typeof step.selector==='string'&&find(step));
      const signature=steps.map(step=>step.selector).join('|');
      stable=signature===previous?stable+1:0;previous=signature;
      if(steps.length===requested.length||(steps.length&&attempt>=3&&stable>=2)||attempt===10)break;
      await delay(200);
    }
    if(token!==generation||!steps.length)return false;
    const root=makeNode('section','ct-root');root.setAttribute('role','dialog');root.setAttribute('aria-modal','true');root.setAttribute('aria-labelledby','ct-title');root.setAttribute('aria-describedby','ct-copy');
    const state={root,steps,index:0,english:chooseLanguage(options).startsWith('en'),finish:typeof options.finish==='function'?options.finish:async()=>{},generation:token,listeners:[],inert:[],previousFocus:document.activeElement,frame:0,busy:false,finishStatus:null,scrollAdjusted:false};
    state.scrims=Array.from({length:4},()=>makeNode('div','ct-scrim',root));state.hole=makeNode('div','ct-hole',root);
    state.arrow=document.createElementNS('http://www.w3.org/2000/svg','svg');state.arrow.setAttribute('class','ct-arrow');state.arrow.setAttribute('aria-hidden','true');
    state.path=document.createElementNS('http://www.w3.org/2000/svg','path');state.arrow.appendChild(state.path);root.appendChild(state.arrow);
    state.card=makeNode('div','ct-card',root);state.count=makeNode('p','ct-count',state.card);state.count.setAttribute('aria-live','polite');
    state.title=makeNode('h2','ct-title',state.card);state.title.id='ct-title';state.copy=makeNode('p','ct-copy',state.card);state.copy.id='ct-copy';
    state.error=makeNode('p','ct-error',state.card);state.error.setAttribute('role','alert');state.error.hidden=true;
    const actions=makeNode('div','ct-actions',state.card);
    state.skip=makeNode('button','ct-skip',actions);state.skip.type='button';state.skip.textContent=state.english?'Skip':'ข้ามได้เลย';
    state.back=makeNode('button','ct-back',actions);state.back.type='button';state.back.textContent=state.english?'Back':'ย้อนกลับ';
    state.next=makeNode('button','ct-next',actions);state.next.type='button';
    document.body.appendChild(root);active=state;
    function makeInert(node){if(node===root||state.inert.some(([previous])=>previous===node))return;state.inert.push([node,Boolean(node.inert)]);node.inert=true;}
    Array.from(document.body.children).forEach(makeInert);
    if(typeof MutationObserver!=='undefined'){state.observer=new MutationObserver(records=>{records.forEach(record=>Array.from(record.addedNodes).filter(node=>node.nodeType===1).forEach(makeInert));});state.observer.observe(document.body,{childList:true});}
    listen(state,state.skip,'click',()=>finish(state,'skipped'));
    listen(state,state.back,'click',()=>{state.finishStatus=null;show(state,state.index-1);});
    listen(state,state.next,'click',()=>{if(state.finishStatus){finish(state,state.finishStatus);return;}if(state.index===steps.length-1)finish(state,'completed');else show(state,state.index+1);});
    listen(state,document,'keydown',event=>{
      if(active!==state)return;
      if(event.key==='Escape'){event.preventDefault();finish(state,'skipped');return;}
      if(event.key!=='Tab')return;
      const controls=[state.skip,state.back,state.next].filter(button=>!button.hidden&&!button.disabled);
      event.preventDefault();if(!controls.length)return;
      const current=controls.indexOf(document.activeElement),index=(current+(event.shiftKey?-1:1)+controls.length)%controls.length;controls[index].focus({preventScroll:true});
    },true);
    listen(state,document,'focusin',event=>{if(active===state&&!root.contains(event.target))state.next.focus({preventScroll:true});},true);
    listen(state,global,'resize',()=>schedule(state));listen(state,global,'scroll',()=>schedule(state),{capture:true,passive:true});
    if(global.visualViewport){listen(state,global.visualViewport,'resize',()=>schedule(state));listen(state,global.visualViewport,'scroll',()=>schedule(state));}
    show(state,0);return true;
  }
  global.CendonTour=Object.freeze({start,stop,geometry});
})(window);
