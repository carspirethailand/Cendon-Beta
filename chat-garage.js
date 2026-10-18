/* Real selected-car shortcuts, not a social feed or invented AI recommendations. */
(function(W,D){
'use strict';
const T=(th,en)=>(W.spireT?W.spireT(th,en):(W.lang==='en'?en:th));
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function paint(){
  const anchor=D.getElementById('wCarTag');if(!anchor)return;
  let el=D.getElementById('chatGarage');if(!el){el=D.createElement('section');el.id='chatGarage';el.className='cg-card';anchor.after(el)}
  const V=W.CendonValetCore,c=V?.curCar(),km=c&&String(c.mileage??'').trim()!==''?Number(c.mileage):NaN;
  const key=JSON.stringify([c?.id,c?.name,c?.make,c?.model,c?.year,c?.mileage,W.lang]);if(el.dataset.key===key)return;el.dataset.key=key;
  el.innerHTML=`<div class="cg-heading"><i class="ti ti-car"></i><div><b>${esc(c?V.carLabel(c):T('รถของคุณ','Your car'))}</b><small>${c&&Number.isFinite(km)?esc(km.toLocaleString())+' km':T('เลือกรถเพื่อใช้เครื่องมือของคันนั้น','Select a car to use its tools')}</small></div><a href="/garage">${T('ดูรถ','Garage')} ↗</a></div>
    <div class="cg-actions"><button type="button" data-cg="cost"><i class="ti ti-receipt"></i>${T('จดค่าใช้จ่าย','Log a cost')}</button><button type="button" data-cg="park"><i class="ti ti-map-pin"></i>${T('ที่จอดของฉัน','My parking')}</button><a href="/post"><i class="ti ti-tool"></i>${T('หาช่าง','Find a mechanic')}</a></div><p class="cg-status" role="status" hidden></p>`;
  el.querySelector('[data-cg="cost"]').onclick=()=>{W.setPhase?.('thread');W.CendonFeatureAI?.openEntry()};
  el.querySelector('[data-cg="park"]').onclick=async e=>{const out=el.querySelector('[role="status"]');e.currentTarget.disabled=true;out.hidden=false;out.textContent=T('กำลังอ่านจุดจอด…','Reading your parking…');try{out.textContent=V.parkingText(await V.parking())}catch{out.textContent=T('ยังอ่านจุดจอดไม่ได้','Parking unavailable')}finally{el.querySelector('[data-cg="park"]').disabled=false}};
}
function mount(){paint();const tag=D.getElementById('wCarTag');if(tag)new MutationObserver(paint).observe(tag,{childList:true,subtree:true});}
if(D.readyState==='loading')D.addEventListener('DOMContentLoaded',mount,{once:true});else mount();
W.addEventListener('storage',paint);D.addEventListener('spire-auth',paint);W.addEventListener('cendon:garage',paint);
})(window,document);
