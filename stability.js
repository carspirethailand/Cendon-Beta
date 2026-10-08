/* Navigation intent: warm only public HTML, never execute hidden app copies. */
(function(){
  'use strict';
  var D=document,seen=new Set(),pending=0;
  var paths=new Set(['/','/index','/garage','/news','/spares','/profile','/chat','/dashboard','/plan','/handbook']);
  function path(p){return p.replace(/\.html$/,'').replace(/\/index$/,'/')}
  function target(e){
    var a=e.target&&e.target.closest&&e.target.closest('#mnav a[href],.nav-links a[href]');
    if(!a||a.hasAttribute('download')||a.getAttribute('aria-disabled')==='true'||(a.target&&a.target!=='_self'))return null;
    try{var u=new URL(a.href,location.href);return u.origin===location.origin&&paths.has(path(u.pathname))&&!u.hash?{a:a,u:u}:null}catch(_){return null}
  }
  function warm(e){
    var c=navigator.connection;
    if(D.hidden||D.prerendering||(c&&(c.saveData||/^(slow-)?2g$/.test(c.effectiveType))))return;
    var t=target(e);if(!t||path(t.u.pathname)===path(location.pathname)||seen.has(t.u.href)||pending>=2)return;
    // Query parameters can carry personal/share context; warm only the static shell.
    var url=t.u.origin+t.u.pathname;if(seen.has(url))return;
    seen.add(url);pending++;
    var l=D.createElement('link');l.rel='prefetch';l.href=url;
    l.onload=l.onerror=function(){pending=Math.max(0,pending-1)};
    D.head.appendChild(l);
  }
  D.addEventListener('pointerover',warm,{passive:true});
  D.addEventListener('pointerdown',warm,{passive:true});
  D.addEventListener('focusin',warm);
  D.addEventListener('click',function(e){
    if(e.isTrusted===false||e.defaultPrevented||e.button||e.metaKey||e.ctrlKey||e.shiftKey||e.altKey)return;
    var t=target(e);if(!t||path(t.u.pathname)===path(location.pathname))return;
    // Native links should not wait for unrelated images/auth or the legacy 1.2s boot gate.
    e.preventDefault();e.stopImmediatePropagation();location.assign(t.u.href);
  },true);
})();
