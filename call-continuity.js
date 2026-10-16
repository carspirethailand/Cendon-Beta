/* Keep the original call-owning document alive. Customer screens navigate in
   a same-origin content frame; neither microphone nor socket is transferred. */
(() => {
 'use strict';
 const pages=new Set(['','index','chat','garage','news','spares','profile','plan','handbook','passport','tech','service','category','search','map','jobs','messages','quote','listen','line','photo','work','trip','quotes','compare','urgent','diagnose','post']);
 function safe(value){try{const u=new URL(value,location.href),p=u.pathname.replace(/\.html$/,'').split('/').filter(Boolean);if(u.origin!==location.origin||u.username||u.password||!pages.has(p[0]||'')||/\/(?:admin|staff|backyard|login|join|api)(?:\/|$)/i.test(u.pathname)||/%(?:2f|5c|2e)/i.test(u.pathname)||u.pathname.includes('\\'))return null;return u.pathname+u.search+u.hash;}catch{return null}}
 let owner=null,view=null,frame=null,home='',homeState=null,returning=false;const covered=new Map();
 function cover(on){if(on){for(const el of document.body.children){if(el===frame||el.id==='callUI'||el.matches?.('.cc-roam,.cc-ambient,.cc-panel,.cc-activity,.cv-dock,.ct-layer,[data-cc-test-control]')||['SCRIPT','STYLE','LINK'].includes(el.tagName))continue;if(!covered.has(el))covered.set(el,el.inert);el.inert=true;}}else{for(const [el,prior]of covered)el.inert=prior;covered.clear();}}
 const active=()=>!!owner?.active;
 function parentHost(){try{const p=parent!==window&&parent.CendonCallContinuity;return p?.owns(window)&&p.active?p:null}catch{return null}}
 function mirror(href){if(!safe(href)||!active())return;try{if(location.pathname+location.search+location.hash!==href)history.replaceState({cendonCallRoute:true,href},'',href)}catch{}}
 function bindChild(){
  if(!frame||!active())return;
  try{
   const w=frame.contentWindow,href=safe(w.location.href);if(!href){owner.end();return}mirror(href);
   const u=new URL(w.location.href);if(u.pathname==='/urgent'&&u.searchParams.has('draft')){const fill=()=>{const field=w.document.getElementById('uSym');if(field&&!field.value){field.value=u.searchParams.get('draft').slice(0,1000);return true}return !!field};if(!fill()){const observer=new w.MutationObserver(()=>{if(fill())observer.disconnect()});observer.observe(w.document.body,{childList:true,subtree:true});w.setTimeout(()=>observer.disconnect(),3000)}}
   if(!w.__cendonHistoryBound){w.__cendonHistoryBound=true;for(const name of ['pushState','replaceState']){const original=w.history[name];w.history[name]=function(...args){const r=original.apply(this,args);mirror(safe(w.location.href));return r;}}w.addEventListener('popstate',()=>mirror(safe(w.location.href)));}
  }catch{/* Cross-origin/blocked document is never inspected or given tools. */}
 }
 function go(value){
  const p=parentHost();if(p)return p.go(value);
  const href=safe(value);if(!active()||!href)return false;
  owner.suspendVisuals?.();view?.roam?.();
  if(!frame){home=location.pathname+location.search+location.hash;homeState=history.state;frame=document.createElement('iframe');frame.className='cc-app-frame';frame.title='Cendon';frame.allow='camera \'self\'; microphone \'self\'; geolocation \'self\'';frame.referrerPolicy='same-origin';frame.onload=bindChild;frame.src=href;document.body.append(frame);cover(true);frame.focus?.();}
  else try{frame.contentWindow.location.replace(href)}catch{frame.src=href}
  if(location.pathname+location.search+location.hash!==href)history.pushState({cendonCallRoute:true,href},'',href);
  return true;
 }
 function borrowed(){const p=parentHost();return p?p.controls():null}
 function controls(){if(!active())return null;return Object.freeze({start(){view?.expand?.();owner.wake?.()},end(){owner?.end()},mute(){owner?.mute()},camera(){view?.expand?.();owner?.camera()},flip(){owner?.flip()},zoom(v){owner?.zoom(v)},wake(){owner?.wake()},get active(){return active()}})}
 function ended(){
  if(!frame||returning)return;returning=true;
  let href;try{href=safe(frame.contentWindow.location.href)}catch{}href=href||home||'/';
  frame.remove();frame=null;cover(false);owner=null;view=null;
  // Release the old owner only AFTER hangup. Auth/account state reloads normally.
  location.replace(href);
 }
 addEventListener('popstate',e=>{if(!active()||!frame)return;e.stopImmediatePropagation();const href=safe(location.href);if(!href)return;if(href===home){frame.remove();frame=null;cover(false);view?.roam?.();history.replaceState(homeState,'',home);}else try{frame.contentWindow.location.replace(href)}catch{frame.src=href}},true);
 document.addEventListener('click',e=>{
  if(e.defaultPrevented||e.button||e.metaKey||e.ctrlKey||e.shiftKey||e.altKey)return;
  const a=e.target.closest?.('a[href]');if(!a||a.hasAttribute('download')||(a.target&&a.target!=='_self'))return;
  const href=safe(a.href);if(!href)return;
  const current=location.pathname+location.search;
  if(href.split('#')[0]===current&&href.includes('#'))return;
  // Let the current screen's own Nav handle in-page layers.
  if(window.Nav?.started&&window.Nav.owns(href)&&!parentHost())return;
  if(go(href)){e.preventDefault();e.stopImmediatePropagation()}
 },true);
 navigator.serviceWorker?.addEventListener('message',e=>{if(e.source!==navigator.serviceWorker.controller||e.data?.type!=='cendon:call-navigation')return;const ok=go(e.data.url);e.ports?.[0]?.postMessage({keptCall:ok})});
 function leave(value){const p=parentHost();if(p)return p.leave(value);let u;try{u=new URL(value,location.href)}catch{return}if(!['https:','http:'].includes(u.protocol))return;returning=true;owner?.end();location.assign(u.href)}
 window.CendonNavigate=value=>{if(!go(value))leave(value)};
 window.CendonCallContinuity=Object.freeze({go,safe,borrowed,controls,ended,
  register(session,surface){if(parentHost())return;owner=session;view=surface;returning=false},
  owns(w){return !!frame&&frame.contentWindow===w},get active(){return active()},get roaming(){return !!frame},
  leave
 });
})();
