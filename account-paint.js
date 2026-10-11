/* Same-tab first-paint handoff: UI context, never authentication or completion
 * authority. No token, email, birthday or account role is stored. */
(function(W,D){
  'use strict';if(W.CendonPaint)return;
  const PRIVATE=new Set(['garage','news','spares','profile','chat']);
  const IDENTITY='cendon_paint_identity',HANDOFF='cendon_paint_handoff',TTL=10000;
  const root=D.documentElement;let paintedUid=null,paintedGeneration=null,paintedAt=0;
  const shell=path=>{const s=String(path).replace(/\.html$/,'').replace(/\/index$/,'/').split('/')[1]||'';return PRIVATE.has(s)?'/'+s:s===''?'/':null};
  const page=shell(location.pathname),privatePage=page&&PRIVATE.has(page.slice(1));
  const read=(storage,key)=>{try{return JSON.parse(storage.getItem(key)||'null')}catch(_){return null}};
  const drop=key=>{try{sessionStorage.removeItem(key)}catch(_){}};
  function projection(uid){
    if(typeof uid!=='string'||!uid||uid.length>200)return null;
    const status=read(localStorage,'spire___account_'+uid+'_status'),setup=read(localStorage,'spire_setup'),cachedUser=read(localStorage,'spire_cachedUser');
    if(!status||status.status!=='completed'||status.completed!==true||status.profile?.uid!==uid||setup?.uid!==uid||setup.v!==3||!['basic','advance','enthusiast'].includes(setup.level))return null;
    if(cachedUser?.uid&&cachedUser.uid!==uid)return null;return setup;
  }
  function user(){try{const a=W.auth||W.spireAuth,u=a&&a.currentUser;return u&&typeof u.getIdToken==='function'?u:null}catch(_){return null}}
  function block(){paintedUid=null;paintedGeneration=null;paintedAt=0;delete root.dataset.accountPaint;if(privatePage){root.dataset.gate='1';root.dataset.level='pending'}}
  function checkIdentity(){const id=read(localStorage,IDENTITY);if(paintedUid&&(id?.uid!==paintedUid||id.generation!==paintedGeneration))block()}
  function observed(uid){
    if(paintedUid&&paintedUid!==uid)block();const previous=read(localStorage,IDENTITY);
    if(previous?.uid===uid&&previous.generation)return;
    const generation=String(Date.now())+'-'+Math.random().toString(36).slice(2);
    try{localStorage.setItem(IDENTITY,JSON.stringify({uid:uid||null,generation}))}catch(_){}drop(HANDOFF);
  }
  function invalidate(uid){
    drop(HANDOFF);const id=read(localStorage,IDENTITY);
    if(!uid||id?.uid===uid)try{localStorage.removeItem(IDENTITY)}catch(_){}block();
  }
  function prepare(raw){
    try{const url=new URL(raw,location.href),target=shell(url.pathname),u=user();checkIdentity();
      const elapsed=Date.now()-paintedAt,uid=u?.uid||(!u&&paintedUid&&elapsed>=0&&elapsed<=TTL?paintedUid:null);
      if(url.origin!==location.origin||!target||!uid||!projection(uid))return false;
      const id=read(localStorage,IDENTITY);if(id?.uid!==uid||typeof id.generation!=='string')return false;
      // Fast consecutive taps may outrun the destination SDK. Forward only the
      // already-consumed UI context, without extending its original deadline.
      sessionStorage.setItem(HANDOFF,JSON.stringify({uid,generation:id.generation,target,at:u?Date.now():paintedAt}));return true;
    }catch(_){return false}
  }
  function consume(){
    if(privatePage)root.dataset.gate='1';const h=read(sessionStorage,HANDOFF);drop(HANDOFF);
    const id=read(localStorage,IDENTITY),elapsed=h?Date.now()-h.at:-1;
    if(!privatePage||!h||h.target!==page||elapsed<0||elapsed>TTL||id?.uid!==h.uid||id.generation!==h.generation)return;
    const p=projection(h.uid);if(!p)return;
    paintedUid=h.uid;paintedGeneration=h.generation;paintedAt=h.at;root.dataset.gate='0';root.dataset.level=p.level;root.dataset.accountPaint='handoff';
  }
  function level(){
    const u=user();if(u){if(paintedUid&&paintedUid!==u.uid)block();return projection(u.uid)?.level||''}
    checkIdentity();return paintedUid?projection(paintedUid)?.level||'':'';
  }
  W.CendonPaint={observed,invalidate,prepare,level};consume();
  D.addEventListener('click',e=>{
    if(e.isTrusted===false||e.defaultPrevented||e.button||e.ctrlKey||e.metaKey||e.shiftKey||e.altKey)return;
    const a=e.target?.closest?.('a[href]');if(!a||a.hasAttribute('download')||a.target&&a.target!=='_self')return;
    try{const url=new URL(a.href,location.href);if(shell(url.pathname)!==page)prepare(url.href)}catch(_){}
  },true);
  W.addEventListener('beforeunload',()=>{
    checkIdentity();const h=read(sessionStorage,HANDOFF),u=user(),id=read(localStorage,IDENTITY);
    const sameSource=h&&(u?h.uid===u.uid:paintedUid&&h.uid===paintedUid&&h.at===paintedAt);
    if(sameSource&&h.generation===id?.generation&&Date.now()-h.at>=0&&Date.now()-h.at<=TTL)return;
    drop(HANDOFF);prepare(location.href);
  });
  W.addEventListener('storage',e=>{
    if(e.key!==IDENTITY&&e.key!==null)return;checkIdentity();
  });
  W.addEventListener('pageshow',checkIdentity);
})(window,document);
