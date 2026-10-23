/* Import confirmed mileage, not estimates. LINE and the garage use the same
   server anchors; importing one must not enqueue another outgoing reading. */
(function(W,D){
  'use strict';
  if(W.CendonMileageSync)return;
  const KEY='spire___mileage_readings',POLL=10000;
  const user=()=> (W.auth||W.spireAuth)?.currentUser;
  const read=(k,f)=>{try{return JSON.parse(localStorage.getItem(k))??f}catch{return f}};
  const scope=uid=>!!uid&&user()?.uid===uid&&(W.CendonScope?W.CendonScope.mine(uid):read('spire___owner',null)===uid);
  const hash=str=>{let h=5381;for(let i=0;i<str.length;i++)h=((h*33)^str.charCodeAt(i))>>>0;return str.length+':'+h.toString(36)};
  let owner=null,rows=[],stamp='',job=null,requestNo=0,redraw=false;
  function validate(list){
    if(!Array.isArray(list)||list.length>100)throw Error('Invalid mileage response');
    return list.map(r=>{
      if(!r||typeof r.carId!=='string'||!r.carId||r.carId.length>60||!Number.isInteger(r.km)||r.km<0||r.km>3000000||!Number.isFinite(r.observedAt)||r.observedAt<=0||!Number.isFinite(r.updatedAt)||r.updatedAt<=0)throw Error('Invalid mileage reading');
      return {carId:r.carId,km:r.km,observedAt:r.observedAt,updatedAt:r.updatedAt,source:String(r.source||'manual').slice(0,20)};
    });
  }
  function pending(id,r){
    const q=read('spire_odo_queue',[]);
    return Array.isArray(q)&&q.some(x=>x.uid===owner&&String(x.carId)===id&&!x.needsReview&&Number(x.observedAt)>r.observedAt);
  }
  function forCar(id){
    if(!scope(owner)||W.CendonCars?.isDeleted(id))return null;
    const r=rows.find(x=>x.carId===String(id));
    return r&&!pending(String(id),r)?{...r}:null;
  }
  function dirtyForm(){
    if(D.activeElement?.matches('input,textarea,select,[contenteditable="true"]'))return true;
    return [...D.querySelectorAll('#clModal input,#clModal textarea,#clModal select')].some(el=>el.getClientRects().length&&(
      el.tagName==='SELECT'?[...el.options].some(o=>o.selected!==o.defaultSelected):
      /^(checkbox|radio)$/.test(el.type)?el.checked!==el.defaultChecked:el.value!==el.defaultValue));
  }
  function paint(){
    if(!redraw||!scope(owner)||D.hidden||dirtyForm())return;
    redraw=false;
    for(const name of ['renderGarage','renderDashCars','renderCarSel','renderCarUI','odoRefresh','clRefreshWidgets','clRerender']){
      try{if(typeof W[name]==='function')W[name]()}catch{/* One missing widget must not stop other mileage views. */}
    }
    W.dispatchEvent(new CustomEvent('cendon:mileage-updated'));
  }
  function apply(){
    if(!scope(owner))return;
    const raw=localStorage.getItem('spire_garage'),cars=read('spire_garage',null);
    if(!Array.isArray(cars))return;
    let changed=false;
    const next=cars.map(c=>{
      const r=c&&forCar(c.id);if(!r)return c;
      const mileage=typeof c.mileage==='number'?r.km:String(r.km);
      if(c.mileage===mileage)return c;
      changed=true;return {...c,mileage};
    });
    if(changed){
      // A server import is not a new local edit of the whole garage document.
      // Keep genuinely unsynced color/detail drafts dirty; acknowledge only a clean cache.
      const seen=read('spire___seen',{}),synced=read('spire___synced',{}),meta=read('spire___meta',{}),oldHash=hash(raw);
      const clean=seen.garage===oldHash&&synced.garage?.h===oldHash&&(Number(meta.garage)||0)<=Number(synced.garage.t);
      const value=JSON.stringify(next);
      try{
        localStorage.setItem('spire_garage',value);
        if(clean){seen.garage=hash(value);synced.garage.h=hash(value);localStorage.setItem('spire___seen',JSON.stringify(seen));localStorage.setItem('spire___synced',JSON.stringify(synced))}
      }catch{/* The confirmed in-memory reading still renders if storage is full. */}
      redraw=true;
    }
    paint();
  }
  function adopt(uid,list){
    if(!scope(uid))return;
    const next=validate(list),key=JSON.stringify(next);
    const changed=owner!==uid||stamp!==key;owner=uid;rows=next;stamp=key;
    if(changed){try{localStorage.setItem(KEY,JSON.stringify({uid,cars:next}))}catch{}redraw=true}
    apply();
  }
  function account(){
    const uid=user()?.uid||null;if(uid===owner)return uid;
    requestNo++;job?.abort.abort();job=null;rows=[];stamp='';owner=uid;redraw=false;
    if(scope(uid)){
      const cached=read(KEY,null);
      if(cached?.uid===uid){try{adopt(uid,cached.cars)}catch{}}
    }
    return uid;
  }
  async function refresh(fresh=false){
    const uid=account();if(!scope(uid)||D.hidden||navigator.onLine===false)return false;
    if(job&&!fresh)return job.promise;
    if(job)job.abort.abort();
    const abort=new AbortController(),number=++requestNo;
    const current={abort,promise:null};job=current;
    const timer=setTimeout(()=>abort.abort(),8000);
    current.promise=(async()=>{
      try{
        const token=await user().getIdToken();if(!scope(uid)||number!==requestNo)return false;
        const base=String(W.BACKEND_URL||'https://spireonebackend.carspirethailand.workers.dev').replace(/\/+$/,'');
        const r=await fetch(base+'/api/odo/readings',{headers:{Authorization:'Bearer '+token},cache:'no-store',signal:abort.signal});
        if(!r.ok)return false;
        const d=await r.json();if(!scope(uid)||number!==requestNo)return false;
        adopt(uid,d.cars);return true;
      }catch{return false}finally{clearTimeout(timer);if(job===current)job=null}
    })();
    return current.promise;
  }
  W.CendonMileageSync=Object.freeze({forCar,refresh});
  W.addEventListener('cendon:auth-ready',()=>refresh(true));
  W.addEventListener('cendon:mileage-saved',()=>refresh(true));
  for(const event of ['focus','pageshow','online'])W.addEventListener(event,()=>refresh());
  D.addEventListener('visibilitychange',()=>{if(!D.hidden)refresh(true)});
  D.addEventListener('focusout',()=>setTimeout(paint,0));
  W.addEventListener('storage',e=>{
    if(e.key===KEY){const c=read(KEY,null);if(c?.uid===user()?.uid){try{adopt(c.uid,c.cars)}catch{}}}
    if(e.key==='spire_garage')apply();
    if(e.key==='spire___owner')account();
  });
  setInterval(()=>{refresh();paint()},POLL);
  refresh();
})(window,document);
