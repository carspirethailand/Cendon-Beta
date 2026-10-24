/* Shared UI-only localization. User messages, shop/car names and form values are never translated. */
(function(W,D){
'use strict';if(W.CendonLocale)return;
const CODES=['th','en','zh','ja','ko','id','vi','ms','de','fr','es','pt'],EN=W.CENDON_UI_EN||{},REV=Object.fromEntries(Object.entries(EN).map(([th,en])=>[en,th])),packs=new Map(),loading=new Set(),raw=new WeakMap(),attrs=new WeakMap();
let queued=false;
const excluded='script,style,noscript,input,textarea,option,[contenteditable],[data-no-i18n],[data-user-name],.msg,.bubble,.nt,.nm,.about,.markdown,.chat-message,.st-me,.who,.av,.shop-name,.tech-name,.car-name,#msgs';
function lang(){let code=W.spireLang?.();if(!CODES.includes(code))try{code=JSON.parse(localStorage.getItem('spire_lang'))}catch{}return CODES.includes(code)?code:'th'}
function pack(code){const p=W.CENDON_L10N;if(p?.lang===code)packs.set(code,p.t);return packs.get(code)||{}}
function translate(th,en,code=lang()){
  if(code==='th')return th;
  const dict=W.__SPIRE_DICT__||{},direct=dict[code]?.[th];if(direct)return direct;
  const english=en||EN[th]||dict.en?.[th]||th;
  if(code==='en')return english;
  const table=pack(code),hit=table[english]||dict[code]?.[english];if(hit)return hit;
  if(/\(THB\)$/.test(english)){const base=english.replace(/\s*\(THB\)$/,'');return (table[base]||base)+' (THB)'}
  return english;
}
const englishKeys=()=>{const table=pack(lang());return table};
function text(value){
  const core=String(value||'').trim();if(!core)return value;
  let hit=translate(REV[core]||core,REV[core]?core:null);if(hit===core&&lang()!=='th')hit=englishKeys()[core]||core;
  // Keep a clearly stated canonical input unit while translating its label.
  if(hit===core&&/\s*\(THB\)$/.test(core)){const base=core.replace(/\s*\(THB\)$/,'');hit=translate(base,null)+' (THB)'}
  return String(value).replace(core,hit);
}
function original(node){
  const old=raw.get(node);if(old&&node.nodeValue===old.out)return old.source;
  return node.nodeValue;
}
function paint(){
  queued=false;if(!D.body)return;
  const walker=D.createTreeWalker(D.body,NodeFilter.SHOW_TEXT);let node;
  while(node=walker.nextNode()){
    const el=node.parentElement;if(!el||el.closest(excluded))continue;
    const source=original(node),out=text(source);raw.set(node,{source,out});if(node.nodeValue!==out)node.nodeValue=out;
  }
  for(const el of D.querySelectorAll('[placeholder],[title],[aria-label]')){
    if(el.closest('[data-no-i18n],.nt,.nm,.about,.msg,.bubble,[data-user-name]'))continue;
    const old=attrs.get(el)||{};for(const key of ['placeholder','title','aria-label']){
      if(!el.hasAttribute(key))continue;const value=el.getAttribute(key),source=old[key]?.out===value?old[key].source:value,out=text(source);
      old[key]={source,out};if(value!==out)el.setAttribute(key,out);
    }attrs.set(el,old);
  }
}
function schedule(){if(!queued){queued=true;requestAnimationFrame(paint)}}
function load(){
  const code=lang();if(!['th','en'].includes(code)&&!packs.has(code)&&!loading.has(code)){
    loading.add(code);const script=D.createElement('script');script.src='/i18n/home-'+code+'.js?v=17';script.dataset.noI18n='';
    script.onload=()=>{pack(code);loading.delete(code);W.dispatchEvent(new CustomEvent('cendon:language-ready',{detail:{lang:code}}));schedule()};script.onerror=()=>{loading.delete(code)};D.head.append(script);
  }schedule();
}
function boot(){
  new MutationObserver(changes=>{if(changes.some(m=>{
    const el=m.target.nodeType===3?m.target.parentElement:m.target;if(!el||el.closest?.(excluded))return false;
    if(m.type==='characterData'){const old=raw.get(m.target);return !old||old.out!==m.target.nodeValue}
    return [...m.addedNodes].some(n=>n.nodeType===3||n.nodeType===1&&!n.matches(excluded));
  }))schedule()}).observe(D.body,{subtree:true,childList:true,characterData:true});
  W.spireOnLang?.(load);load();
}
W.CendonLocale=Object.freeze({t:translate,text,paint:load,lang});
// Shared components (including AI action cards) use the same table as page chrome.
W.spireT=(th,en)=>translate(th,en);
W.addEventListener('cendon:preferences',load);W.addEventListener('cendon:language',load);
W.addEventListener('storage',e=>{if(e.key==='spire_lang')load()});
if(D.readyState==='loading')D.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})(window,document);
