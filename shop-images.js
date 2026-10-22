/* Owner-only previews for a hidden shop. No tokens in URLs or persistent storage. */
(function(W,D){
'use strict';if(W.CendonShopImages)return;
let uid=null,ids=new Set(),epoch=0,scheduled=false;
const urls=new Map(),pending=new Map(),targets=new Map();
const user=()=>{try{return (W.spireAuth||W.auth||W.firebase?.auth())?.currentUser}catch{return null}};
const api=()=>String(W.BACKEND_URL||'https://spireonebackend.carspirethailand.workers.dev').replace(/\/+$/,'');
function clear(){epoch++;uid=null;ids.clear();for(const c of pending.values())c.abort();pending.clear();
  for(const [el,x] of targets){if(el.tagName==='IMG'&&el.getAttribute('src')===x.blob)el.removeAttribute('src');else if(x.blob&&el.style.backgroundImage.includes(x.blob))el.style.backgroundImage='none'}
  targets.clear();for(const u of urls.values())URL.revokeObjectURL(u);urls.clear();
}
function setScope(owner,values){
  if(owner!==user()?.uid){clear();return}if(uid!==owner){clear();uid=owner}
  ids=new Set(values.map(Number).filter(n=>Number.isSafeInteger(n)&&n>0));schedule();
}
function source(el){const s=el.tagName==='IMG'?el.getAttribute('src'):el.style?.backgroundImage?.match(/url\(["']?([^"')]+)["']?\)/)?.[1];
  if(!s)return null;try{const u=new URL(s,D.baseURI),base=new URL(api()),m=u.pathname.match(/^\/api\/tech\/img\/(\d+)$/);return u.origin===base.origin&&m&&ids.has(+m[1])?{id:+m[1],url:u.href}:null}catch{return null}
}
function apply(el,x,blob){if(!el.isConnected||uid!==user()?.uid||!ids.has(x.id))return;
  const current=source(el);if(!current||current.id!==x.id)return;
  targets.set(el,{...x,blob});if(el.tagName==='IMG')el.src=blob;else el.style.backgroundImage=`url("${blob}")`;
}
async function load(el,x){
  if(uid!==user()?.uid||!ids.has(x.id))return;const version=epoch;
  if(urls.has(x.id)){apply(el,x,urls.get(x.id));return}
  if(pending.has(x.id)){pending.get(x.id).task.then(blob=>{if(blob)apply(el,x,blob)});return}
  const ac=new AbortController(),timer=setTimeout(()=>ac.abort(),10000);pending.set(x.id,ac);
  ac.task=(async()=>{try{
    const u=user();if(!u||u.uid!==uid)return null;const token=await u.getIdToken();if(version!==epoch||u.uid!==user()?.uid)return null;
    const r=await fetch(api()+'/api/tech/img/'+x.id+'?owner=1',{headers:{Authorization:'Bearer '+token},credentials:'omit',referrerPolicy:'no-referrer',cache:'no-store',signal:ac.signal});
    const mime=r.headers.get('Content-Type')||'';if(!r.ok||!/^image\/(png|jpeg|webp)$/.test(mime))return null;
    const reader=r.body.getReader(),chunks=[];let size=0;
    try{for(;;){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>2500000){await reader.cancel();return null}chunks.push(value)}}finally{reader.releaseLock()}
    if(version!==epoch||uid!==user()?.uid||!ids.has(x.id))return null;
    const blob=URL.createObjectURL(new Blob(chunks,{type:mime}));urls.set(x.id,blob);return blob;
  }catch{return null}finally{clearTimeout(timer);if(pending.get(x.id)===ac)pending.delete(x.id)}})();
  const blob=await ac.task;if(blob)apply(el,x,blob);
}
const observer=W.IntersectionObserver?new IntersectionObserver(entries=>{for(const e of entries)if(e.isIntersecting){observer.unobserve(e.target);const x=source(e.target);if(x)load(e.target,x)}},{rootMargin:'180px'}):null;
function scan(){scheduled=false;if(!D.body||uid!==user()?.uid)return;
  for(const el of D.querySelectorAll('img[src*="/api/tech/img/"],[style*="/api/tech/img/"]')){const x=source(el);if(!x)continue;
    if(urls.has(x.id))apply(el,x,urls.get(x.id));else if(observer)observer.observe(el);else load(el,x)}
}
function schedule(){if(!scheduled){scheduled=true;requestAnimationFrame(scan)}}
function boot(){new MutationObserver(changes=>{
  if(changes.some(m=>m.type==='attributes'?!!source(m.target):[...m.addedNodes].some(n=>n.nodeType===1&&(source(n)||n.querySelector?.('img[src*="/api/tech/img/"],[style*="/api/tech/img/"]')))))schedule();
}).observe(D.body,{childList:true,subtree:true,attributes:true,attributeFilter:['src','style']});schedule()}
W.CendonShopImages=Object.freeze({setScope,clear});
if(D.readyState==='loading')D.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})(window,document);
