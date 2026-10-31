import {namespace,appUrl,ROOTS} from './app-routes.js';
// Barba owns document navigation/history. Legacy page scripts remain isolated in
// retained same-origin views: no eval, duplicate globals, or media reparenting.
const W=window,D=document,frames=new Map(),calls=new Set(),cached=new Set(),authOwners=new Set(),traversals=new Set();
const origin=location.origin,initial=D.getElementById('appInitial');
let active=initial.dataset.cendonView,current=location.href,queued=null,busy=false,failed=null,barba=null,incoming=null;
let workerScheduled=false;
function scheduleWorker(){
  if(workerScheduled||!('serviceWorker'in navigator))return;workerScheduled=true;
  // Installing/updating the worker prefetches public code. Never compete with
  // the initial view's real controls, authentication or first network requests.
  const afterLoad=()=>{const gate=D.getElementById('appOpening');if(gate&&!gate.hidden){setTimeout(afterLoad,50);return;}const register=()=>navigator.serviceWorker.register('/sw.js').catch(()=>{});if('requestIdleCallback'in W)W.requestIdleCallback(register,{timeout:4000});else setTimeout(register,0);};
  if(D.readyState==='complete')afterLoad();else W.addEventListener('load',afterLoad,{once:true});
}
const progress=D.getElementById('appProgress'),notice=D.getElementById('appNotice'),callButton=D.getElementById('appCall');
const limit=(navigator.deviceMemory&&navigator.deviceMemory<4)?3:6;
function record(el,url){const r={el,url,ready:false,waiters:new Set(),used:Date.now()};frames.set(el.dataset.cendonView,r);return r;}
record(initial,current);
function native(url){location.assign(url);}
function callOwner(){return [...calls].find(n=>frames.has(n));}
function resume(){frames.get(active)?.el.contentWindow.CendonView?.setHidden(false);}
function settleTraversals(){
  if(!traversals.size)return;if(barba?.transitions.isRunning){setTimeout(settleTraversals,16);return;}
  for(const ns of traversals){traversals.delete(ns);const w=frames.get(ns)?.el.contentWindow;if(w)w.dispatchEvent(new w.PopStateEvent('popstate',{state:w.history.state}));}
}
function callUI(){callButton.hidden=!callOwner()||calls.has(active);}
// A history traversal can make the browser restore a stale child URL into the
// initial view by frame position (e.g. Home inside the Garage view). Never reveal it.
function wrongDocument(r){try{const w=r.el.contentWindow,u=w.location.href;if(u==='about:blank')return false;
  if(namespace(u,origin)===r.el.dataset.cendonView)return false;w.__cendonHostNav=true;w.location.replace(r===frames.get(initial.dataset.cendonView)&&r.el===initial?routeOf():r.url);return true;}catch{return false;}}
function routeOf(){return new URL(D.querySelector('[data-barba="container"]')?.dataset.route||location.pathname+location.search,origin).href;}
initial.addEventListener('load',()=>{const r=[...frames.values()].find(x=>x.el===initial);if(r&&wrongDocument(r))r.ready=false;});
function ready(ns,localHistory){const r=frames.get(ns);if(r&&wrongDocument(r)){r.ready=false;return;}if(r){
  if(!r.ready&&localHistory?.layers.length){
    if(r.el===initial&&!busy&&barba){barba.history.add(localHistory.root,'barba','replace');for(const u of localHistory.layers)barba.history.add(u,'barba','push');current=localHistory.layers.at(-1);}
    else if(busy)r.el.contentWindow.CendonView?.adoptSingleEntry();
  }
  r.ready=true;r.el.classList.remove('is-preparing');if(ns===active){openingDone();tint();schedulePrewarm();}for(const wake of [...r.waiters])wake();r.el.contentDocument?.dispatchEvent(new Event('cendon:view-ready'));if(r.el===initial)scheduleWorker();
}}
function layer(ns,url,action){
  if(!barba||busy||ns!==active||namespace(url,origin)!==ns)return;
  current=url;frames.get(ns).url=url;barba.history.add(url,'barba',action);
  barba.data.current.url={href:url,...barba.url.parse(url)};
  const marker=D.querySelector('[data-barba="container"]');if(marker)marker.dataset.route=new URL(url).pathname;
}
function track(ns,url){const r=frames.get(ns);if(r)r.url=url;}
function call(ns,on){if(!frames.has(ns))return;on?calls.add(ns):calls.delete(ns);callUI();}
function shareFirebase(project){
  // One actual SDK/session for this same-origin app, including its in-flight
  // restoration. A pending SDK is NOT a signed-in user: existing gates still
  // wait for the real callback. Never copy a cached UID or an auth proxy.
  if(typeof project!=='string'||!/^[a-z0-9.-]{3,63}$/.test(project))return null;
  for(const [ns,r]of frames)try{const w=r.el.contentWindow,sdk=w.firebase,a=w.spireAuth||w.auth,u=a?.currentUser;
    if(!r.ready||!r.el.isConnected||!w.CendonScope||w.CendonScope.frozen?.())continue;
    if(u&&(typeof u.getIdToken!=='function'||w.CendonScope.owner()!==u.uid))continue;
    if(!sdk?.apps?.some(x=>x.name==='[DEFAULT]'&&x.options?.projectId===project)||sdk.auth()!==a)continue;
    authOwners.add(ns);return sdk;
  }catch{}
  return null;
}
function showError(url){failed=url;notice.hidden=false;progress.hidden=true;}
function cacheRoute(u){
  if(barba.cache.has(u.href))return;
  // This host's Barba container is routing metadata only; the real authenticated
  // document is prepared separately. Do not download this same empty host again.
  const doc=D.implementation.createHTMLDocument('Cendon'),wrap=doc.createElement('div'),view=doc.createElement('main');
  wrap.dataset.barba='wrapper';view.dataset.barba='container';view.dataset.barbaNamespace=namespace(u.href,origin);view.dataset.route=u.pathname+u.search+u.hash;wrap.append(view);doc.body.append(wrap);
  barba.cache.set(u.href,Promise.resolve({html:doc.documentElement.outerHTML,url:{href:u.href,...barba.url.parse(u.href)}}),'prefetch','fulfilled');cached.add(u.href);
}
function go(raw,trigger='barba',event){
  const u=appUrl(raw,origin);if(!u){native(raw);return false;}
  notice.hidden=true;
  if(busy||!barba||barba.transitions.isRunning){queued={url:u.href,trigger,event};drain();return true;}
  if(u.href===current){frames.get(active)?.el.contentWindow.CendonView?.navigate(u.href);return true;}
  busy=true;progress.hidden=false;
  // Start the real requested document alongside Barba's metadata request.
  // Previously they were serial: one full network round trip was wasted.
  incoming=!frames.get(namespace(u.href,origin))?.ready?{url:u.href,result:prepare(u.href).then(value=>({value}),error=>({error}))}:null;
  frames.get(active)?.el.contentDocument?.dispatchEvent(new Event('visibilitychange'));
  navigator.serviceWorker?.controller?.postMessage({type:'cendon:stop-warm'});
  // Calling Barba while a transition is running forces a full reload. Serialize
  // rapid taps instead; keep only the user's latest destination.
  (async()=>{
    // Use Barba's normal cache/history/transition lifecycle, without an extra
    // network request for an empty metadata wrapper. Real view failures still fail.
    cacheRoute(u);
    const response=await barba.cache.get(u.href)?.request;
    if(!response?.html||!new DOMParser().parseFromString(response.html,'text/html').querySelector('[data-barba="container"]'))throw Error('shell-unavailable');
    if(queued&&queued.url!==u.href){busy=false;incoming=null;progress.hidden=true;resume();drain();return;}
    await barba.go(u.href,trigger,event);
  })().catch(()=>recover(current,u.href));
  return true;
}
function recover(previous,target){
  barba.history.add(previous,'barba','replace');
  const marker=D.querySelector('[data-barba="container"]');
  if(marker){marker.dataset.barbaNamespace=active;marker.dataset.route=new URL(previous).pathname;}
  incoming=null;showError(target);busy=false;resume();drain();
}
function drain(){if(queued&&!busy&&barba){if(barba.transitions.isRunning){setTimeout(drain,16);return;}const q=queued;queued=null;queueMicrotask(()=>go(q.url,q.trigger,q.event));}}
function waitReady(r,url){return new Promise((resolve,reject)=>{const start=Date.now();let timer=0;function done(error){clearTimeout(timer);r.waiters.delete(check);error?reject(error):resolve(r);}function check(){
  clearTimeout(timer);if(queued&&queued.url!==url)return done(Error('view-superseded'));
  if(r.ready)return done();
  if(!r.el.isConnected||r.failed||Date.now()-start>18000)return done(Error('view-unavailable'));
  timer=setTimeout(check,40);
}r.waiters.add(check);check();});}
async function prepare(url,background=false){
  const ns=namespace(url,origin);let r=frames.get(ns);
  if(!r){frames.get(active)?.el.contentWindow.CendonPaint?.prepare(url);const el=D.createElement('iframe');el.className='app-view is-preparing';el.inert=background;el.dataset.cendonView=ns;el.title='Cendon';el.allow='camera; microphone; geolocation; autoplay; clipboard-write; fullscreen';r=record(el,url);el.addEventListener('load',()=>{if(!el.isConnected)return;let registered=false;try{registered=!!el.contentWindow?.CendonView;}catch{}if(!registered){r.failed=true;for(const wake of [...r.waiters])wake();}});el.src=url;D.getElementById('appViews').append(el);}
  await waitReady(r,url);
  // Compare the view's real location too: a stale record would reveal it on the wrong layer.
  let at=r.url;try{at=r.el.contentWindow.location.href;}catch{}
  if(r.url!==url||at!==url){const bridge=r.el.contentWindow.CendonView;if(!bridge)throw Error('view-not-registered');await bridge.navigate(url);r.url=url;}
  return r;
}
function activate(r,url){
  const immediate=incoming?.url===url;
  const ns=r.el.dataset.cendonView,was=frames.get(active);
  // Crossfade: the previous view stays painted underneath while the next fades in.
  // The bottom bar sits in the same place in both, so it reads as staying put.
  r.el.classList.remove('is-leaving');
  // A cold view becomes visible only when its real primary controls are wired.
  // Keep the original screen until then; never insert an intermediate screen.
  if(immediate)for(const f of frames.values())f.el.classList.remove('is-leaving','is-entering');
  if(was&&was!==r&&was.el.isConnected&&!immediate){
    was.el.classList.add('is-leaving');r.el.classList.remove('is-entering');void r.el.offsetWidth;r.el.classList.add('is-entering');
    clearTimeout(r.fade);r.fade=setTimeout(()=>{r.el.classList.remove('is-entering');for(const f of frames.values())if(f!==frames.get(active))f.el.classList.remove('is-leaving');},240);
  }
  // ตัวเลือกแท็บล่าง: อ่านตำแหน่งในหน้าที่กำลังจะออก แล้วให้หน้าใหม่เลื่อนต่อจากตรงนั้นระหว่างจางเข้า (ดูเป็นชิ้นเดียวที่ไหลไป)
  let navFrom=null;if(was&&was!==r)try{navFrom=was.el.contentWindow.CendonNav?.x();}catch{}
  // Never move a live iframe to another node: moving it restarts its document.
  for(const [name,f]of frames){const on=name===ns;f.el.classList.toggle('is-active',on);f.el.classList.remove('is-preparing');f.el.inert=!on;f.el.contentWindow.CendonView?.setHidden(!on);}
  if(typeof navFrom==='number')try{r.el.contentWindow.CendonNav?.slideFrom(navFrom);}catch{}
  active=ns;current=url;r.used=Date.now();openingDone();
  D.title=r.el.contentDocument?.title||'Cendon';tint();callUI();evict();
}
// แท็บหลักเตรียมไว้ล่วงหน้า: แท็บที่ยังไม่เคยเปิดต้องโหลดและรันสคริปต์ทั้งหน้าตอนกด (วัดได้ 0.6–1.3 วิเมื่อ CPU ช้าแบบมือถือ) ส่วนครั้งที่สองแค่ ~0.1 วิ
// จึงเตรียม การาจ · แชต AI · นิตยสาร · บัญชี ทีละหน้าเบื้องหลัง (ซ่อน กดไม่ได้) หลังหน้าแรกพร้อมและเครื่องว่าง · ข้ามเมื่อ: เครื่องแรมน้อย ประหยัดเน็ต/2G
// แอปอยู่เบื้องหลัง หรือผู้ใช้กำลังเปลี่ยนหน้า · หน้าที่เตรียมไว้ไม่ขอตำแหน่ง (พยากรณ์อากาศ) จนกว่าจะเปิดจริง — ดู loadWx ในหน้านั้น ป๊อปอัปจึงไม่โผล่บนหน้าแรก
// แชต AI: หน้าที่เตรียมไว้ไม่หยิบงาน AI ที่หน้าแรกฝากไว้จนกว่าจะเปิดจริง (runFeatureJob เช็ก inert) และถ้ามีงานค้างตอนจะเตรียม ก็ข้ามแชตไปเลย
// เตรียมไม่สำเร็จ = ทิ้งเฟรมนั้น แล้วกดจริงค่อยโหลดแบบเดิม
const PREWARM=['garage','chat','news','profile'];let prewarmPlanned=false;
const idle=ms=>new Promise(r=>setTimeout(()=>'requestIdleCallback'in W?requestIdleCallback(r,{timeout:2000}):r(),ms));
function schedulePrewarm(){if(prewarmPlanned)return;prewarmPlanned=true;prewarm().catch(()=>{});}
async function prewarm(){
  const c=navigator.connection;
  if(limit<6||c?.saveData||/2g/.test(c?.effectiveType||''))return;
  for(const ns of PREWARM){
    await idle(800);
    if(frames.has(ns))continue;
    // งาน AI จากหน้าแรก (รูป/เสียง/ใบเสนอราคา) รอส่งอยู่ = ไม่เตรียมแชตตอนนี้ ให้หน้าแชตเปิดจริงแล้วหยิบเอง
    if(ns==='chat'){let job=null;try{job=sessionStorage.getItem('spire_featureJob')||sessionStorage.getItem('spire_quoteJob');}catch{}if(job)continue;}
    if(busy||queued||D.hidden||frames.size>=limit)return;
    try{const r=await prepare(new URL(ROOTS[ns],origin).href,true);if(ns!==active)r.el.contentWindow.CendonView?.setHidden(true);}
    catch{const r=frames.get(ns);if(r&&!r.ready&&ns!==active&&!calls.has(ns)&&!authOwners.has(ns)){try{r.el.contentWindow.CendonView?.disposeAuth?.();}catch{}r.el.remove();frames.delete(ns);}return;}
  }
}
// หน้าเปิดแอป (#appOpening อยู่บนสุด) = ภาพเดียวกับหน้าเปิดของ Android ต่อเนื่องจนหน้าแรกพร้อม แล้วจางออกทันที (ไม่มีจังหวะเล่นของตัวเอง)
// ปล่อยการกดผ่านตั้งแต่เริ่มจาง · ซ่อนจริงหลังจาง (hidden คือสัญญาณ "เปิดเสร็จ")
const opening=D.getElementById('appOpening');let openingGone=false;
function openingDone(){
  if(openingGone||!opening)return;openingGone=true;
  opening.classList.add('is-ready','is-out');setTimeout(()=>{opening.hidden=true;for(const r of frames.values())if(r.ready)r.el.contentDocument?.dispatchEvent(new Event('cendon:view-ready'));},300);
}
// หน้าแรกไม่ส่งสัญญาณพร้อม (หลุดไปหน้าอื่น สคริปต์หน้าเสีย) ก็ไม่ค้างหน้าเปิด: 6 วิแล้วเผยสิ่งที่อยู่ข้างใต้ (CSS มีกันค้างอีกชั้นที่ 10 วิ)
setTimeout(openingDone,6000);
// ธีมเปลี่ยนจากหน้าไหนก็ตาม: พื้นของ shell (สีหลังเฟรมตอนหน้ากำลังโหลด) เปลี่ยนตามทันที ไม่งั้นธีมสว่างจะเห็นพื้นมืดแวบตอนเปิดแท็บใหม่
W.addEventListener('storage',e=>{if(e.key!=='spire_theme')return;try{D.documentElement.dataset.theme=/^(?:light|warm|pearl|emerald|plant|moss)$/.test(JSON.parse(e.newValue||'"light"'))?'light':'dark';}catch{}});
// สีแถบสถานะของมือถือ: มือถืออ่าน theme-color จากเอกสารชั้นนอกสุดนี้เท่านั้น ส่วนแต่ละหน้าตั้งของตัวเองตามธีม (theme.js)
// คัดลอกสีของหน้าที่เปิดอยู่ขึ้นมา และตามเมื่อหน้านั้นเปลี่ยนธีม — แถบบนจึงกลืนกับหัวหน้าทั้งธีมสว่างและมืด
const shellTint=D.querySelector('meta[name="theme-color"]');let tintWatch=null;
function tint(){
  tintWatch?.disconnect();tintWatch=null;let m=null;
  try{m=frames.get(active)?.el.contentDocument?.querySelector('meta[name="theme-color"]');}catch{}
  if(!m||!shellTint)return;
  const copy=()=>{const c=m.getAttribute('content');if(c&&shellTint.getAttribute('content')!==c)shellTint.setAttribute('content',c);};copy();
  try{tintWatch=new MutationObserver(copy);tintWatch.observe(m,{attributes:true,attributeFilter:['content']});}catch{}
}
function evict(){
  for(const [name,r]of [...frames].sort((a,b)=>a[1].used-b[1].used)){
    if(frames.size<=limit)break;
    if(name===active||calls.has(name)||authOwners.has(name)||r.el.contentWindow.CendonView?.dirty)continue;
    // A background AI response must finish even on memory-constrained devices.
    if(name==='chat')continue;
    r.el.contentWindow.CendonView?.disposeAuth?.();r.el.remove();frames.delete(name);
  }
}
function forget(){incoming=null;queued=null;for(const r of frames.values()){r.el.contentWindow.CendonView?.disposeAuth?.();r.el.remove();}frames.clear();calls.clear();authOwners.clear();traversals.clear();for(const u of cached)barba?.cache.delete(u);cached.clear();native('/login');}
const boot=W.CendonAppBoot;
W.CendonApp={go,ready,call,layer,track,shareFirebase,traversal:ns=>traversals.add(ns),get loading(){return busy;},namespace:u=>namespace(u,origin),current:()=>({namespace:active,url:current}),forget};
W.CendonCallShell={active:()=>!!callOwner(),expand:()=>{const n=callOwner();if(n){go(ROOTS[n]);frames.get(n)?.el.contentWindow.CendonView?.expandCall();}},open:go};
callButton.addEventListener('click',()=>W.CendonCallShell.expand());
D.getElementById('appRetry').addEventListener('click',()=>{if(failed){barba?.cache.delete(failed);const ns=namespace(failed,origin),r=frames.get(ns);if(r&&!r.ready&&!calls.has(ns)&&!authOwners.has(ns)){r.el.contentWindow.CendonView?.disposeAuth?.();r.el.remove();frames.delete(ns);}go(failed);}});
D.getElementById('appStay').addEventListener('click',()=>{notice.hidden=true;failed=null;});
// Auth changes invalidate every isolated view, not merely the visible page.
W.addEventListener('storage',e=>{if((e.key==='cendon_signed'&&e.newValue!=='1')||(e.key==='spire___owner'&&e.oldValue&&e.newValue!==e.oldValue))forget();});
// Capture popstate before Barba's listener: its default is a hard reload when busy.
W.addEventListener('popstate',e=>{if(!barba)return;e.stopImmediatePropagation();go(location.href,'popstate',e);});
async function start(){
  if(!W.barba){await new Promise(resolve=>W.addEventListener('load',resolve,{once:true}));}
  if(!W.barba){W.CendonApp.go=u=>{native(u);return true;};for(const item of boot.queue)if(item[0]==='go')native(item[1]);return;}
  barba=W.barba;
  const force=barba.force.bind(barba);
  barba.force=u=>{if(appUrl(u,origin)){recover(current,u);return;}force(u);};
  let prepared=null,previous=current,target=current,transitionFailed=false,superseded=false;
  barba.init({preventRunning:true,cacheFirstPage:true,prefetchIgnore:true,timeout:12000,
    prevent:({href})=>!appUrl(href,origin),
    requestError:()=>false,
    transitions:[{name:'cendon-retained-views',
      async leave(data){busy=true;progress.hidden=false;previous=current;target=data.next.url.href;transitionFailed=false;superseded=false;prepared=null;
        try{if(incoming?.url===target){const r=await incoming.result;if(r.error)throw r.error;prepared=r.value;}else prepared=await prepare(target);}catch{transitionFailed=true;}
      },
      enter(){superseded=!!queued&&queued.url!==target;if(prepared&&!superseded)activate(prepared,target);},
      after(){progress.hidden=true;busy=false;incoming=null;resume();settleTraversals();if(superseded){barba.history.add(previous,'barba','replace');const marker=D.querySelector('[data-barba="container"]');if(marker){marker.dataset.barbaNamespace=active;marker.dataset.route=new URL(previous).pathname;}drain();}else if(transitionFailed)recover(previous,target);else{notice.hidden=true;drain();}}
    }]
  });
  for(const item of boot.queue.splice(0)){if(item[0]==='go')queued={url:item[1]};else if(item[0]==='ready')ready(item[1],item[2]);else if(item[0]==='call')call(item[1],item[2]);}
  // No metadata prefetch loop: each allowed host marker is local. Never boot
  // Chat in the background (that could consume a pending user-initiated AI job).
  const connection=navigator.connection;
  // One idle static-code warmup on capable devices. Never load an invisible
  // document or execute its scripts; the worker fetches no personal data.
  if(navigator.deviceMemory>=4&&!connection?.saveData&&!/2g/.test(connection?.effectiveType||'')){
    const warm=()=>{if(busy||active!=='home')return;const view=frames.get(active)?.el.contentDocument;if(view?.readyState!=='complete'){setTimeout(warm,400);return;}const worker=navigator.serviceWorker?.controller;if(worker)worker.postMessage({type:'cendon:warm-garage'});};
    navigator.serviceWorker?.ready.then(()=>{if('requestIdleCallback'in W)requestIdleCallback(warm,{timeout:6000});else setTimeout(warm,2000);}).catch(()=>{});
  }
  drain();
}
start();
