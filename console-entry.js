/* Narrow, allowlisted handoff from /console. Never sends AI requests or starts devices. */
(function(W,D){
  'use strict';
  const TOOLS=new Set(['quote','listen','shake','park','own']);
  const TABS=new Set(['odo','spec','equip','health','plan','parts','cost','trip','cal','pass']);
  function readIntent(search,path){
    const q=new URLSearchParams(search),page=String(path).replace(/\.html$/,'').replace(/\/$/,'');
    if(page==='/chat'){
      if(TOOLS.has(q.get('consoleTool')))return {type:'tool',key:q.get('consoleTool')};
      if(['scan','call','entry'].includes(q.get('consoleAction')))return {type:'action',key:q.get('consoleAction')};
    }
    if(page==='/garage'&&TABS.has(q.get('consoleTab')))return {type:'garage',key:q.get('consoleTab')};
    return null;
  }
  W.CendonConsoleEntry=Object.freeze({readIntent});
  const intent=readIntent(W.location.search,W.location.pathname);if(!intent)return;
  let done=false,owner=null,observer=null,timer=0,tries=0;
  const en=()=>W.lang==='en',T=(th,eng)=>en()?eng:th;
  function cleanup(){if(observer)observer.disconnect();observer=null;if(timer)W.clearTimeout(timer);timer=0;}
  function addReturn(){
    if(D.getElementById('ceReturn'))return;
    const host=D.getElementById('composer')||D.querySelector('main');if(!host)return;
    const a=D.createElement('a');a.id='ceReturn';a.className='ce-return';a.href='/console';a.textContent=T('กลับไป Cendon Console','Back to Cendon Console');host.prepend(a);
  }
  function launchNote(scan){
    const view=D.getElementById('v-thread');if(!view)return false;
    const card=D.createElement('section');card.className='ce-intro';card.setAttribute('aria-label',T('เตรียมเริ่มโทร','Prepare a call'));
    const title=D.createElement('h2');title.textContent=scan?T('สแกนห้องเครื่องระหว่างโทร','Scan the engine bay during a call'):T('คุยกับ Cendon ด้วยเสียง','Talk to Cendon');
    const copy=D.createElement('p');copy.textContent=scan?T('เริ่มโทร แล้วเปิดกล้องและแตะสแกนห้องเครื่อง ระบบจะแสดงชื่อและกรอบเฉพาะชิ้นส่วนที่มองเห็นชัด ไม่ต้องถอดฝาครอบเพื่อเริ่มใช้งาน','Start a call, turn on the camera, then tap Engine scan. Boxes identify clearly visible parts only. Keep covers in place.'):T('ไมค์จะเริ่มเมื่อกดปุ่มด้านล่าง เปิดหรือปิดกล้องเองได้ และคุยต่อขณะดูแชตได้','Your microphone starts only after pressing below. You control the camera and can keep talking while reading chat.');
    const safety=D.createElement('p');safety.className='ce-hint';safety.textContent=T('จอดรถให้ปลอดภัยก่อนใช้งาน หากตรวจห้องเครื่อง ให้ดับเครื่องและรอให้เย็น ไม่แตะหรือเปิดฝาถังของเหลว','Park safely first. For an engine-bay inspection, switch the engine off and let it cool. Do not touch parts or open fluid caps.');
    const start=D.createElement('button');start.type='button';start.textContent=T('เริ่มโทรกับ AI','Start an AI call');start.addEventListener('click',()=>{if(typeof W.startCall!=='function')return;card.remove();view.classList.remove('ce-launch-view');W.startCall();});
    const close=D.createElement('button');close.type='button';close.className='ce-dismiss';close.textContent=T('คุยด้วยข้อความแทน','Use text instead');close.addEventListener('click',()=>{card.remove();view.classList.remove('ce-launch-view');D.getElementById('inp')?.focus();});
    card.append(title,copy,safety,start,close);view.prepend(card);view.classList.add('ce-launch-view');return true;
  }
  function tryOpen(){
    if(done)return;
    const user=(W.spireAuth||W.auth)?.currentUser;
    if(!user||!W.CendonAccount?.completed?.())return;
    if(owner&&owner!==user.uid){done=true;cleanup();return;}owner=user.uid;
    if(intent.type==='garage'){
      const core=W.CendonValetCore,car=core?.curCar?.();
      if(!car||!core.cars().some(c=>String(c.id)===String(car.id))||typeof W.openCarDetail!=='function')return;
      W.openCarDetail(car.id);
      const tab=D.querySelector('#clTabs [data-tab="'+intent.key+'"]');if(!tab)return;tab.click();
    }else{
      if(['login','gate'].includes(D.body.dataset.phase)||!W.selCar?.()||typeof W.enterThread!=='function')return;
      const feature=intent.type==='tool'?intent.key:intent.key==='entry'?'own':null;
      if(feature){
        if(!W.CendonFeatureAI||!D.getElementById('faPrepare'))return;
        if(W.spireHasFeature&&!W.spireHasFeature(feature)){W.toast?.(T('เครื่องมือนี้ยังไม่เปิดในบัญชีของคุณ','This tool is not available on this account'));done=true;cleanup();return;}
        W.enterThread();W.CendonFeatureAI.select(feature);
        if(intent.key==='entry')W.CendonFeatureAI.openEntry();
        else if(D.getElementById('faInline')?.hidden)D.getElementById('faPrepare').click();
      }else{
        W.enterThread();if(!launchNote(intent.key==='scan'))return;
      }
    }
    done=true;cleanup();addReturn();
    // Remove only handoff parameters; never expose a car ID or token in a new URL.
    const u=new URL(W.location.href);for(const key of ['consoleTool','consoleAction','consoleTab'])u.searchParams.delete(key);
    try{W.history.replaceState(W.history.state,'',u.pathname+u.search+u.hash);}catch(_){}
  }
  function boot(){
    if(done)return;cleanup();tries=0;
    if(!D.getElementById('ceStyles')){const css=D.createElement('link');css.id='ceStyles';css.rel='stylesheet';css.href='/console-entry.css?v=1';D.head.append(css);}
    observer=new MutationObserver(tryOpen);observer.observe(D.body,{attributes:true,attributeFilter:['data-phase']});observer.observe(D.documentElement,{attributes:true,attributeFilter:['data-gate','data-level']});
    const poll=()=>{tryOpen();if(!done&&++tries<120)timer=W.setTimeout(poll,200);};poll();
  }
  if(D.readyState==='loading')D.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
  W.addEventListener('pagehide',cleanup);
  W.addEventListener('pageshow',event=>{if(event.persisted&&!done)boot();});
})(window,document);
