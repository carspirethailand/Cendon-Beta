/* Presentation only. Canonical garage data remains kilometres and THB.
   Explicit form units, public passports, chat messages and identity headings are
   not reinterpreted. No account data or amounts are sent to the rates provider. */
(function(W,D){
'use strict';if(W.CendonDisplayPrefs)return;
const KEY='cendon_fx_thb_v2',DAY=86400000,raw=new WeakMap();let fx=null,pending=null,scheduled=false;
const read=k=>{try{return JSON.parse(localStorage.getItem(k)||'null')}catch{return null}};
function prefs(){const u=W.spireAuth?.currentUser||W.auth?.currentUser,projected=W.spireSetupRead?.(),stored=read('spire_setup');
  if(typeof u?.uid!=='string'||!u.uid)return {distance:'km',currency:'THB'};
  const p=projected?.uid===u?.uid?projected:stored?.uid===u?.uid?stored:{};
  if(!u||p.uid!==u.uid)return {distance:'km',currency:'THB'};
  return {distance:p.distance==='mi'?'mi':'km',currency:/^[A-Z]{3}$/.test(p.currency||'')?p.currency:'THB'};
}
const locale=()=>W.spireLang?.()||'en';
const number=(v,digits=2)=>new Intl.NumberFormat(locale(),{maximumFractionDigits:digits}).format(v);
function valid(d){return d&&d.result==='success'&&d.base_code==='THB'&&Number(d.rates?.THB)===1&&Number(d.time_last_update_unix)*1000<=Date.now()+DAY&&Date.now()-Number(d.time_last_update_unix)*1000<7*DAY}
function rate(c){const n=Number(fx?.rates?.[c]);return valid(fx)&&n>0&&n<1e9?n:null}
function distance(km){return number(Number(km)/(prefs().distance==='mi'?1.609344:1),2)+' '+(prefs().distance==='mi'?'mi':locale()==='th'?'กม.':'km')}
function money(thb){const c=prefs().currency,r=c==='THB'?1:rate(c);if(!r)return 'THB '+number(thb);
  return (c==='THB'?'':'≈ ')+new Intl.NumberFormat(locale(),{style:'currency',currency:c,currencyDisplay:'code',maximumFractionDigits:c==='JPY'||c==='KRW'?0:2}).format(Number(thb)*r);
}
async function rates(){if(prefs().currency==='THB')return;if(pending)return pending;
  if(!fx){const cached=read(KEY);if(valid(cached))fx=cached}
  if(valid(fx)){paint();if(Date.now()-Number(fx.fetchedAt||0)<DAY)return}
  pending=(async()=>{try{const api=String(W.BACKEND_URL||'https://spireonebackend.carspirethailand.workers.dev').replace(/\/+$/,'');const r=await fetch(api+'/api/display-rates',{credentials:'omit',referrerPolicy:'no-referrer',signal:AbortSignal.timeout(10000)});if(!r.ok)throw Error('rates');const d=await r.json();if(!valid(d))throw Error('rates');fx={...d,fetchedAt:Date.now()};try{localStorage.setItem(KEY,JSON.stringify(fx))}catch{}paint()}catch{paint()}finally{pending=null}})();return pending;
}
const excluded='script,style,noscript,textarea,input,select,option,[contenteditable],form,label,h1,h2,h3,h4,h5,#accountFlow,#stSheet,[data-no-prefs],[data-distance-km],.st-me,.who,.av,[data-user-name],.shop-name,.tech-name,.car-name,.msg,.bubble,.chat-message,[data-msg],.markdown,.chat-log';
function convert(text){let out=text;
  if(prefs().distance==='mi')out=out.replace(/(?<![\d.,])(\d[\d,]*(?:\.\d+)?)(?:\s*([–-])\s*(\d[\d,]*(?:\.\d+)?))?\s*(?:กิโลเมตร|กม\.?|km\b)/g,(_,n,dash,end)=>end?distance(Number(n.replace(/,/g,''))).replace(/ mi$/,'')+dash+distance(Number(end.replace(/,/g,''))):distance(Number(n.replace(/,/g,''))));
  if(prefs().currency!=='THB'&&rate(prefs().currency)){
    out=out.replace(/฿\s*(\d[\d,]*(?:\.\d{1,2})?)(?:\s*([–-])\s*(\d[\d,]*(?:\.\d{1,2})?))?(?![\d.,])/g,(_,n,dash,end)=>end?money(Number(n.replace(/,/g,'')))+dash+money(Number(end.replace(/,/g,''))):money(Number(n.replace(/,/g,''))));
    out=out.replace(/(?<![\d.,])(\d[\d,]*(?:\.\d{1,2})?)(?:\s*([–-])\s*(\d[\d,]*(?:\.\d{1,2})?))?\s*(?:บาท|THB\b)/g,(_,n,dash,end)=>end?money(Number(n.replace(/,/g,'')))+dash+money(Number(end.replace(/,/g,''))):money(Number(n.replace(/,/g,''))));
  }return out;
}
function paint(){scheduled=false;if(!D.body)return;
  D.querySelectorAll('[data-distance-km]').forEach(el=>{const km=Number(el.dataset.distanceKm);if(!Number.isFinite(km)||km<0)return;const text=distance(km);if(el.textContent!==text)el.textContent=text});
  const walker=D.createTreeWalker(D.body,NodeFilter.SHOW_TEXT);let node;
  while(node=walker.nextNode()){
    const el=node.parentElement;if(!el||el.closest(excluded))continue;
    const old=raw.get(node),original=old&&node.nodeValue===old.out?old.original:node.nodeValue;
    let out=old?.paired?(prefs().distance==='mi'?'mi':original):convert(original);
    // Common odometer markup: a numeric text node and a separate unit <em>.
    const unit=node.nextSibling;
    const unitNode=unit?.nodeType===1&&unit.childNodes.length===1&&unit.firstChild?.nodeType===3?unit.firstChild:null;
    const unitOriginal=unitNode&&(raw.get(unitNode)?.original||unitNode.nodeValue);
    if(prefs().distance==='mi'&&/^\s*\d[\d,]*(?:\.\d+)?\s*$/.test(original)&&unitNode&&/^(กม\.?|km)$/.test(unitOriginal.trim())&&!el.closest('label')){
      out=number(Number(original.replace(/,/g,''))/1.609344,2)+' ';raw.set(unitNode,{original:unitOriginal,out:'mi',paired:true});if(unitNode.nodeValue!=='mi')unitNode.nodeValue='mi';
    }
    raw.set(node,{original,out,...(old?.paired?{paired:true}:{})});if(node.nodeValue!==out)node.nodeValue=out;
  }
  const c=prefs().currency,host=D.querySelector('#stMain [data-st="currency"]');let note=D.getElementById('displayRatesNote');
  if(c!=='THB'&&host){
    if(!note){note=D.createElement('aside');note.id='displayRatesNote';note.style.cssText='font:12px/1.5 system-ui;padding:8px 16px;color:inherit;opacity:.7';note.dataset.noPrefs='';host.insertAdjacentElement('afterend',note)}
    const text=rate(c)?(locale()==='th'?'ยอดแปลงเป็นประมาณการ · บันทึกเดิมและช่องกรอกยังใช้หน่วยที่ระบุ · ':'Converted totals are estimates · records and inputs keep their explicit units · '):'THB · '+c+' exchange rate unavailable · ';
    if(note.dataset.text!==text){note.dataset.text=text;note.textContent=text+'Frankfurter'+(fx?' · '+new Date(fx.time_last_update_unix*1000).toLocaleDateString(locale()):'')}
  }else note?.remove();
}
function schedule(){if(!scheduled){scheduled=true;requestAnimationFrame(paint)}}
function boot(){new MutationObserver(changes=>{
  if(changes.some(m=>{if(m.type==='childList'&&[...m.addedNodes].some(n=>n.nodeType===1&&(n.matches?.('[data-distance-km]')||n.querySelector?.('[data-distance-km]'))))return true;const el=m.target.nodeType===3?m.target.parentElement:m.target;if(!el||el.closest?.(excluded))return false;
    if(m.type==='characterData'){const old=raw.get(m.target);if(old&&m.target.nodeValue===old.out)return false;return /\d|฿/.test(m.target.nodeValue||'')}
    return [...m.addedNodes].some(n=>!(n.nodeType===1&&n.matches(excluded))&&/\d|฿/.test(n.textContent||''));}))schedule();
}).observe(D.body,{childList:true,characterData:true,subtree:true});paint();rates()}
W.CendonDisplayPrefs=Object.freeze({prefs,distance,money,paint,rate:c=>c==='THB'?1:rate(c),transform:convert,sync:()=>{schedule();return rates()}});
W.addEventListener('cendon:preferences',()=>{schedule();rates()});W.addEventListener('cendon:auth-ready',()=>{schedule();rates()});
D.addEventListener('cendon:auth-ready',()=>{schedule();rates()});
W.addEventListener('storage',e=>{if(['spire_setup','spire_lang'].includes(e.key)){schedule();rates()}});
if(D.readyState==='loading')D.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})(window,document);
