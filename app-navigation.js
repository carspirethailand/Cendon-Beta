import {namespace,appUrl,ROOTS} from './app-routes.js';
// Barba owns document navigation/history. Legacy page scripts remain isolated in
// retained same-origin views: no eval, duplicate globals, or media reparenting.
const W=window,D=document,frames=new Map(),calls=new Set(),cached=new Set();
const origin=location.origin,initial=D.getElementById('appInitial');
let active=initial.dataset.cendonView,current=location.href,queued=null,busy=false,failed=null,barba=null;
const progress=D.getElementById('appProgress'),notice=D.getElementById('appNotice'),callButton=D.getElementById('appCall');
const limit=(navigator.deviceMemory&&navigator.deviceMemory<4)?3:6;
function record(el,url){const r={el,url,ready:false,used:Date.now()};frames.set(el.dataset.cendonView,r);return r;}
record(initial,current);
function native(url){location.assign(url);}
function callOwner(){return [...calls].find(n=>frames.has(n));}
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
  r.ready=true;r.el.classList.remove('is-preparing');if(ns===active)D.getElementById('appOpening').hidden=true;
}}
function layer(ns,url,action){
  if(!barba||busy||ns!==active||namespace(url,origin)!==ns)return;
  current=url;frames.get(ns).url=url;barba.history.add(url,'barba',action);
  barba.data.current.url={href:url,...barba.url.parse(url)};
  const marker=D.querySelector('[data-barba="container"]');if(marker)marker.dataset.route=new URL(url).pathname;
}
function track(ns,url){const r=frames.get(ns);if(r)r.url=url;}
function call(ns,on){if(!frames.has(ns))return;on?calls.add(ns):calls.delete(ns);callUI();}
function showError(url){failed=url;notice.hidden=false;progress.hidden=true;}
function go(raw,trigger='barba',event){
  const u=appUrl(raw,origin);if(!u){native(raw);return false;}
  notice.hidden=true;
  if(busy||!barba||barba.transitions.isRunning){queued={url:u.href,trigger,event};drain();return true;}
  if(u.href===current){frames.get(active)?.el.contentWindow.CendonView?.navigate(u.href);return true;}
  busy=true;progress.hidden=false;
  // Calling Barba while a transition is running forces a full reload. Serialize
  // rapid taps instead; keep only the user's latest destination.
  (async()=>{
    // Resolve Barba's cached request before starting its transition. Its default
    // failed-click path forces a document load; never take that path with a call.
    if(!barba.cache.has(u.href))barba.prefetch(u.href);
    const response=await barba.cache.get(u.href)?.request;
    if(!response?.html||!new DOMParser().parseFromString(response.html,'text/html').querySelector('[data-barba="container"]'))throw Error('shell-unavailable');
    await barba.go(u.href,trigger,event);
  })().catch(()=>recover(current,u.href));
  return true;
}
function recover(previous,target){
  barba.history.add(previous,'barba','replace');
  const marker=D.querySelector('[data-barba="container"]');
  if(marker){marker.dataset.barbaNamespace=active;marker.dataset.route=new URL(previous).pathname;}
  showError(target);busy=false;drain();
}
function drain(){if(queued&&!busy&&barba){if(barba.transitions.isRunning){setTimeout(drain,16);return;}const q=queued;queued=null;queueMicrotask(()=>go(q.url,q.trigger,q.event));}}
function waitReady(r){return new Promise((resolve,reject)=>{const start=Date.now();function check(){
  if(r.ready)return resolve(r);
  if(!r.el.isConnected||Date.now()-start>18000)return reject(Error('view-unavailable'));
  setTimeout(check,40);
}check();});}
async function prepare(url){
  const ns=namespace(url,origin);let r=frames.get(ns);
  if(!r){frames.get(active)?.el.contentWindow.CendonPaint?.prepare(url);const el=D.createElement('iframe');el.className='app-view is-preparing';el.dataset.cendonView=ns;el.title='Cendon';el.allow='camera; microphone; geolocation; autoplay; clipboard-write; fullscreen';r=record(el,url);el.src=url;D.getElementById('appViews').append(el);}
  await waitReady(r);
  // Compare the view's real location too: a stale record would reveal it on the wrong layer.
  let at=r.url;try{at=r.el.contentWindow.location.href;}catch{}
  if(r.url!==url||at!==url){const bridge=r.el.contentWindow.CendonView;if(!bridge)throw Error('view-not-registered');await bridge.navigate(url);r.url=url;}
  return r;
}
function activate(r,url){
  const ns=r.el.dataset.cendonView,was=frames.get(active);
  // Crossfade: the previous view stays painted underneath while the next fades in.
  // The bottom bar sits in the same place in both, so it reads as staying put.
  r.el.classList.remove('is-leaving');
  if(was&&was!==r&&was.el.isConnected){
    was.el.classList.add('is-leaving');r.el.classList.remove('is-entering');void r.el.offsetWidth;r.el.classList.add('is-entering');
    clearTimeout(r.fade);r.fade=setTimeout(()=>{r.el.classList.remove('is-entering');for(const f of frames.values())if(f!==frames.get(active))f.el.classList.remove('is-leaving');},240);
  }
  // Never move a live iframe to another node: moving it restarts its document.
  for(const [name,f]of frames){const on=name===ns;f.el.classList.toggle('is-active',on);f.el.classList.remove('is-preparing');f.el.inert=!on;f.el.contentWindow.CendonView?.setHidden(!on);}
  active=ns;current=url;r.used=Date.now();D.getElementById('appOpening').hidden=true;
  D.title=r.el.contentDocument?.title||'Cendon';callUI();evict();
}
function evict(){
  for(const [name,r]of [...frames].sort((a,b)=>a[1].used-b[1].used)){
    if(frames.size<=limit)break;
    if(name===active||calls.has(name)||r.el.contentWindow.CendonView?.dirty)continue;
    // A background AI response must finish even on memory-constrained devices.
    if(name==='chat')continue;
    r.el.remove();frames.delete(name);
  }
}
function forget(){for(const r of frames.values())r.el.remove();frames.clear();calls.clear();for(const u of cached)barba?.cache.delete(u);cached.clear();native('/login');}
const boot=W.CendonAppBoot;
W.CendonApp={go,ready,call,layer,track,namespace:u=>namespace(u,origin),current:()=>({namespace:active,url:current}),forget};
W.CendonCallShell={active:()=>!!callOwner(),expand:()=>{const n=callOwner();if(n){go(ROOTS[n]);frames.get(n)?.el.contentWindow.CendonView?.expandCall();}},open:go};
callButton.addEventListener('click',()=>W.CendonCallShell.expand());
D.getElementById('appRetry').addEventListener('click',()=>{if(failed){barba?.cache.delete(failed);const ns=namespace(failed,origin),r=frames.get(ns);if(r&&!r.ready&&!calls.has(ns)){r.el.remove();frames.delete(ns);}go(failed);}});
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
  let prepared=null,previous=current,target=current,transitionFailed=false;
  barba.init({preventRunning:true,cacheFirstPage:true,prefetchIgnore:true,timeout:12000,
    prevent:({href})=>!appUrl(href,origin),
    requestError:()=>false,
    transitions:[{name:'cendon-retained-views',
      async leave(data){busy=true;progress.hidden=false;previous=current;target=data.next.url.href;transitionFailed=false;prepared=null;
        try{prepared=await prepare(target);}catch{transitionFailed=true;}
      },
      enter(){if(prepared)activate(prepared,target);},
      after(){progress.hidden=true;busy=false;if(transitionFailed)recover(previous,target);else{notice.hidden=true;drain();}}
    }]
  });
  for(const item of boot.queue.splice(0)){if(item[0]==='go')queued={url:item[1]};else if(item[0]==='ready')ready(item[1],item[2]);else if(item[0]==='call')call(item[1],item[2]);}
  // Only lightweight HTML shells are prefetched; never instantiate Chat in the
  // background (opening it may consume a pending user-initiated AI job).
  const connection=navigator.connection;
  if(!connection?.saveData&&!/2g/.test(connection?.effectiveType||'')){
    const preload=()=>{for(const path of Object.values(ROOTS)){const u=new URL(path,origin).href;if(u!==current){cached.add(u);barba.prefetch(u);}}};
    if('requestIdleCallback'in W)requestIdleCallback(preload,{timeout:4000});else setTimeout(preload,1600);
  }
  if('serviceWorker'in navigator)navigator.serviceWorker.register('/sw.js').catch(()=>{});
  // One idle static-code warmup on capable devices. Never load an invisible
  // document or execute its scripts; the worker fetches no personal data.
  if(navigator.deviceMemory>=4&&!connection?.saveData&&!/2g/.test(connection?.effectiveType||'')){
    const warm=()=>{if(busy||active!=='home')return;const worker=navigator.serviceWorker?.controller;if(worker)worker.postMessage({type:'cendon:warm-garage'});};
    navigator.serviceWorker?.ready.then(()=>{if('requestIdleCallback'in W)requestIdleCallback(warm,{timeout:6000});else setTimeout(warm,2000);}).catch(()=>{});
  }
  drain();
}
start();
