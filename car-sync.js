/* Car deletion is a server operation, not just a local list edit. */
(function(W){
  'use strict';
  const KEY='spire___carDeletes', memory=Object.create(null), pending=new Map();
  let version=0;
  const user=()=>{const a=W.auth||W.spireAuth;return a&&a.currentUser};
  const owner=()=>{const u=user();return u&&u.uid||'guest'};
  function read(key,fallback){try{const v=JSON.parse(localStorage.getItem(key));return v===null?fallback:v}catch(e){return fallback}}
  function deleted(uid){
    const stored=read(KEY,{}), ids=stored&&Array.isArray(stored[uid])?stored[uid]:[];
    return new Set([...ids,...(memory[uid]||[])]);
  }
  const valid=id=>typeof id==='string'&&id.length>0&&id.length<60;
  function filter(cars){const ids=deleted(owner());return Array.isArray(cars)?cars.filter(c=>!c||!ids.has(c.id)):[]}
  function purge(uid){
    if(uid!==owner())return;
    const cars=read('spire_garage',[]), clean=filter(cars);
    if(Array.isArray(cars)&&clean.length!==cars.length){
      localStorage.setItem('spire_garage',JSON.stringify(clean));
      if(W.cloudMark)W.cloudMark('garage');
    }
    const selected=read('spire_selCar','');
    if(deleted(uid).has(selected)){
      localStorage.setItem('spire_selCar',JSON.stringify(''));
      if(W.cloudMark)W.cloudMark('selCar');
    }
  }
  function acceptDeleted(ids,uid=owner()){
    if(uid!==owner()||!Array.isArray(ids))return false;
    const all=deleted(uid), size=all.size;
    ids.filter(valid).forEach(id=>all.add(id));
    memory[uid]=[...all];
    if(all.size!==size){
      const stored=read(KEY,{}), record=Object.assign(Object.create(null),stored&&typeof stored==='object'&&!Array.isArray(stored)?stored:{});
      record[uid]=[...all];
      try{localStorage.setItem(KEY,JSON.stringify(record))}catch(e){/* Server tombstones remain authoritative. */}
      version++;
    }
    purge(uid);return true;
  }
  function remove(id){
    if(!valid(id))return Promise.reject(new Error('Invalid car ID'));
    const uid=owner(), key=uid+':'+id;
    if(pending.has(key))return pending.get(key);
    const job=(async()=>{
      const u=user();
      const cached=read('spire_cachedUser',null);
      if(!u&&location.protocol!=='file:'&&(cached&&cached.uid||W.currentUser&&W.currentUser.uid))throw new Error('Sign-in is still loading');
      if(u&&location.protocol!=='file:'){
        if(navigator.onLine===false)throw new Error('Offline');
        const ac=new AbortController();let timer;
        const expired=new Promise((_,reject)=>{timer=setTimeout(()=>{ac.abort();reject(new Error('Delete timed out'))},10000)});
        try{
          await Promise.race([expired,(async()=>{
          const token=await u.getIdToken();
          if(owner()!==uid||user()!==u)throw new Error('Account changed');
          if(ac.signal.aborted)throw new Error('Delete timed out');
          if(!W.BACKEND_URL)throw new Error('Backend unavailable');
          const r=await fetch(W.BACKEND_URL+'/api/cars/'+encodeURIComponent(id),{
            method:'DELETE',headers:{Authorization:'Bearer '+token},signal:ac.signal});
          if(!r.ok){const e=new Error('HTTP '+r.status);e.status=r.status;throw e}
          const body=await r.json();
          if(!body||body.success!==true)throw new Error('Delete not confirmed');
          })()]);
        }finally{clearTimeout(timer)}
      }
      if(owner()!==uid)throw new Error('Account changed');
      acceptDeleted([id],uid);
      return true;
    })();
    pending.set(key,job);
    job.finally(()=>pending.delete(key)).catch(()=>{});
    return job;
  }
  W.CendonCars={filter,isDeleted:id=>deleted(owner()).has(id),acceptDeleted,remove,owner,revision:()=>version};
})(window);
