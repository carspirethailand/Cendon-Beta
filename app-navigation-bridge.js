/* Early, same-origin lifecycle adapter for Barba's retained legacy views. */
(function(W,D){'use strict';
  const frame=W.frameElement;if(!frame?.dataset.cendonView)return;
  const P=W.parent,ns=frame.dataset.cendonView;let hidden=!frame.classList.contains('is-active'),inCall=false,callApi=null,dirty=false,sharedAuth=false;
  const authSubscriptions=new Set();let authDisposed=false,authPaused=false;
  function releaseAuth(permanent){authPaused=true;if(permanent)authDisposed=true;for(const r of authSubscriptions){r.stop?.();r.stop=null;}if(permanent)authSubscriptions.clear();}
  function reuseFirebase(project){
    const sdk=P.CendonApp?.shareFirebase?.(project);if(!sdk||authDisposed)return false;
    const real=sdk.auth(),bound=new Map();
    const scoped=new Proxy(real,{get(target,key){
      if(key==='onAuthStateChanged'||key==='onIdTokenChanged')return (...args)=>{
        if(authDisposed)return ()=>{};const r={stop:null,start:()=>target[key](...args)};authSubscriptions.add(r);if(!authPaused)r.stop=r.start();
        if(authDisposed){r.stop?.();authSubscriptions.delete(r);return ()=>{};}
        return ()=>{r.stop?.();r.stop=null;authSubscriptions.delete(r);};
      };
      const value=Reflect.get(target,key,target);if(typeof value!=='function')return value;if(!bound.has(key))bound.set(key,value.bind(target));return bound.get(key);
    }});
    // Do not mutate the donor SDK or its auth methods. Each document owns its
    // subscriptions, so evict/retry cannot leave a dead page listening forever.
    const factory=(...args)=>{const a=sdk.auth(...args);return a===real?scoped:a;};Object.setPrototypeOf(factory,sdk.auth);
    W.firebase=Object.create(sdk);Object.defineProperty(W.firebase,'auth',{value:factory});sharedAuth=true;return true;
  }
  W.addEventListener('pagehide',()=>releaseAuth(false));
  W.addEventListener('pageshow',e=>{if(!e.persisted||authDisposed)return;authPaused=false;for(const r of authSubscriptions)if(!r.stop)r.stop=r.start();});
  let initRoot=W.location.href;const initLayers=[];
  // Resolve at call time so page hooks (e.g. the bottom-nav highlight) still observe URL changes.
  const replace=(...a)=>W.history.replaceState(...a);
  // Nav layers use the parent's Barba history, not the browser's joint iframe
  // history. Otherwise Back can silently traverse a hidden page's old panels.
  const viewHistory={get state(){return W.history.state;},
    pushState(state,title,url){replace(state,title,url);if(W.Nav?.started)P.CendonApp?.layer(ns,W.location.href,'push');else initLayers.push(W.location.href);},
    replaceState(state,title,url){replace(state,title,url);if(W.Nav?.started)P.CendonApp?.layer(ns,W.location.href,'replace');else initRoot=W.location.href;},
    // Frame-only URL sync before the host traverses its own history.
    local(state,title,url){replace(state,title,url);P.CendonApp?.track?.(ns,W.location.href);},
    go(n){
      // A late sheet-close/repair timer in a hidden or outgoing view must not
      // rewind the active page's history. Intentional navigation still uses go().
      if(hidden||P.CendonApp?.loading)return;
      P.CendonApp?.traversal?.(ns);P.history.go(n);
    }
  };
  const host=()=>P.CendonApp||P.CendonAppBoot;
  const isApp=u=>P.CendonApp?.namespace(u)||/^\/(?:$|index(?:\.html)?$|garage(?:[/.?]|$)|chat(?:[/.?]|$)|news(?:[/.?]|$)|spares(?:[/.?]|$)|profile(?:[/.?]|$)|studio(?:[/?]|$)|join(?:[/?]|$)|messages(?:[/?]|$)|jobs(?:[/?]|$))/.test(new URL(u,W.location).pathname);
  function go(raw){let u;try{u=new URL(raw,W.location);}catch{return false;}if(u.origin!==W.location.origin)return false;if(!isApp(u.href))return false;return host().go(u.href);}
  W.CendonTabs={on:true,child:true,go,setHidden:b=>setHidden(b),get inCall(){return inCall;}};
  function setHidden(b){hidden=!!b;D.dispatchEvent(new Event('visibilitychange'));if(!hidden)W.dispatchEvent(new Event('cendon:view-active'));}
  // Hidden pages pause decorative work through their existing visibility hooks;
  // the page holding the microphone stays logically visible and keeps its stream.
  try{Object.defineProperty(D,'hidden',{configurable:true,get:()=>hidden&&!inCall||P.document.hidden});Object.defineProperty(D,'visibilityState',{configurable:true,get:()=>D.hidden?'hidden':'visible'});}catch{}
  async function navigate(raw){
    const u=new URL(raw,W.location),clean=p=>p.replace(/\.html$/,'').replace(/\/$/,'')||'/';
    if(clean(u.pathname)===clean(W.location.pathname)&&u.search===W.location.search&&u.hash===W.location.hash)return;
    // Query intents may be handled by the page. An unhandled path must still
    // reach Nav; otherwise every deep link into an already-open Chat was ignored.
    if(W.CendonPageEntry&&await W.CendonPageEntry(u.href)!==false)return;
    // Primary controls may already be usable while Nav's deferred feature
    // registry is still parsing. Keep a requested deep link, not a false error.
    if(W.CendonPageCore?.ready()&&!W.Nav?.started&&D.readyState==='loading'){
      const began=Date.now();while(!W.Nav?.started&&D.readyState==='loading'&&Date.now()-began<18000)await new Promise(r=>setTimeout(r,40));
    }
    if(W.Nav?.started&&W.Nav.owns(u.href)){
      await W.Nav.visit(u.href);
      W.CendonView.adoptSingleEntry();
      return;
    }
    if(clean(u.pathname)===clean(W.location.pathname)){
      if(u.searchParams.get('view')&&typeof W.switchView==='function'){W.switchView(u.searchParams.get('view'));return;}
      if(u.searchParams.get('add')==='1'&&typeof W.openAddCar==='function'){W.openAddCar();return;}
      if(u.searchParams.get('car')&&typeof W.spireOdoSheet==='function'){W.spireOdoSheet(u.searchParams.get('car'),u.searchParams.get('due')||'');return;}
    }
    // Unknown deep routes do not silently discard a draft or a live call.
    throw Error('route-not-ready');
  }
  W.CendonView={navigate,setHidden,history:viewHistory,reuseFirebase,disposeAuth:()=>releaseAuth(true),get sharedAuth(){return sharedAuth;},get visible(){return !hidden&&!P.document.hidden&&!P.CendonApp?.loading;},expandCall:()=>callApi?.expand?.(),adoptSingleEntry(){
    const layers=W.Nav?.stack||[],state=P.history.state;let i=state?.index;
    // A cross-tab deep link may represent several panels but only ONE parent
    // history entry. Count only consecutive matching entries when closing them.
    for(const l of [...layers].reverse()){const entry=state?.states?.[i];l.w=!!entry&&entry.url===new URL(l.url,W.location).href;if(l.w)i--;}
  },get dirty(){return dirty;},get inCall(){return inCall;}};
  D.addEventListener('input',()=>{dirty=true;},{capture:true});D.addEventListener('change',()=>{dirty=true;},{capture:true});
  W.addEventListener('click',e=>{
    if(e.defaultPrevented||e.button||e.metaKey||e.ctrlKey||e.shiftKey||e.altKey)return;
    const a=e.target.closest?.('a[href]');if(!a||a.download||a.hasAttribute('download')||(a.target&&a.target!=='_self')||a.hasAttribute('data-nav-full'))return;
    if(a.hasAttribute('data-partner')){
      if(!W.CendonPartnerEntry?.handleClick){e.preventDefault();e.stopImmediatePropagation();return;}
      W.CendonPartnerEntry.handleClick(e);if(e.defaultPrevented)return;
    }
    const u=new URL(a.href,W.location);if(u.origin!==W.location.origin)return;
    if(u.hash&&u.pathname===W.location.pathname&&u.search===W.location.search)return;
    if(W.Nav?.started&&W.Nav.owns(u.href))return;
    // แท็บล่าง: ตัวเลือกเริ่มไหลไปแท็บที่แตะทันที (ตัวจัดการของแถบเองไม่ได้รับคลิกนี้ เพราะตรงนี้หยุดคลิกไว้ก่อน)
    if(a.matches('#mnav [data-mnav]'))try{W.CendonNav?.press?.(a.dataset.mnav);}catch{}
    if(go(u.href)){e.preventDefault();e.stopImmediatePropagation();}
    else{e.preventDefault();P.location.assign(u.href);}
  },true);
  // Covers legacy location.href buttons as well as links. Same-document Nav
  // layers keep their own history; reload and traversal retain native semantics.
  W.navigation?.addEventListener('navigate',e=>{
    if(W.__cendonHostNav||e.destination.sameDocument||['reload','traverse'].includes(e.navigationType)||e.formData||e.downloadRequest!==null||!e.cancelable)return;
    const u=new URL(e.destination.url);if(u.origin!==W.location.origin)return;
    if(go(u.href)){e.preventDefault();}
    else{e.preventDefault();P.location.assign(u.href);}
  });
  function wrapCall(){const o=W.CendonCallShell;if(!o||o.__barba)return;
    W.CendonCallShell={...o,__barba:true,active:()=>inCall||o.active(),expand:()=>callApi?.expand?.()||o.expand(),
      started(api){o.started(api);callApi=api;inCall=true;host().call(ns,true);},
      ended(api){o.ended(api);callApi=null;inCall=false;host().call(ns,false);}
    };
  }
  let readySent=false,readyTimer=0;
  function check(){if(readySent)return;clearTimeout(readyTimer);wrapCall();const r=D.documentElement;
    // A page can prove its primary controls ready before unrelated footer tools.
    // Deep links still wait for their router; neither a timer nor markup alone
    // can bypass the live UID or existing account presentation gates.
    const path=W.location.pathname.replace(/\.html$/,'').replace(/\/$/,'')||'/';
    const base=({home:'/',garage:'/garage',profile:'/profile',news:'/news',spares:'/spares',chat:'/chat'})[ns];
    const early=path===base&&!W.location.search&&W.CendonPageCore?.ready();
    if((D.readyState!=='loading'||early)&&D.body&&r.dataset.gate!=='1'&&r.dataset.level!=='pending'&&(ns!=='home'||!W.Nav||W.Nav.started)){readySent=true;host().ready(ns,{root:initRoot,layers:initLayers});return;}
    readyTimer=setTimeout(check,40);
  }
  check();D.addEventListener('cendon:primary-ready',check);D.addEventListener('cendon:primary-routes',check);D.addEventListener('DOMContentLoaded',check,{once:true});D.addEventListener('DOMContentLoaded',wrapCall,{once:true});W.addEventListener('load',wrapCall,{once:true});
  // Auth/session changes must escape the frame, never display Login inside it.
  W.addEventListener('storage',e=>{if(e.key==='cendon_signed'&&e.newValue!=='1')P.CendonApp?.forget();});
})(window,document);
