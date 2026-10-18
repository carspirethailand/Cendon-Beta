/* Small account-bound Garage operations. No silent writes or model-generated facts. */
(function(W){
'use strict';
const policies=new Map(),pending=new Map();
const auth=()=>W.spireAuth||W.auth;
const current=uid=>auth()?.currentUser?.uid===uid;
async function request(path,body,owner){
  const u=auth()?.currentUser;if(!u||u.uid!==owner)throw Error('Sign in to save Garage data');
  const token=await u.getIdToken();if(!current(owner))throw Error('Account changed');
  const r=await fetch(W.BACKEND_URL+path,{method:body?'POST':'GET',headers:{Authorization:'Bearer '+token,...(body?{'Content-Type':'application/json'}:{})},body:body?JSON.stringify(body):undefined,cache:'no-store',signal:AbortSignal.timeout(12000)});
  const d=await r.json();if(!current(owner))throw Error('Account changed');
  if(!r.ok)throw Error(d.error||'Garage is unavailable');return d;
}
function policy(car){const uid=auth()?.currentUser?.uid;return uid?policies.get(uid+':'+car.id):null}
async function loadPolicy(car){
  const uid=auth()?.currentUser?.uid;if(!uid||!car?.id)return null;
  const k=uid+':'+car.id;if(policies.has(k))return policies.get(k);
  if(pending.has(k))return pending.get(k);
  const task=request('/api/garage/cost-policy?car='+encodeURIComponent(car.id),null,uid).then(d=>{if(current(uid)&&d.policy)policies.set(k,d.policy);return d.policy}).catch(()=>null).finally(()=>pending.delete(k));
  pending.set(k,task);return task;
}
async function append(car,kind,entry,baseLog){
  const uid=auth()?.currentUser?.uid;if(!uid)throw Error('Sign in to save Garage data');
  const id=W.crypto?.randomUUID?.();if(!id)throw Error('Secure random IDs unavailable');
  const r=await request('/api/garage/log',{carId:car.id,kind,entry,baseLog,requestId:id},uid);
  if(!r.ok||!r.entry||!r.log)throw Error('Save not acknowledged');
  return r;
}
function refreshPolicy(car){const uid=auth()?.currentUser?.uid;if(uid)policies.delete(uid+':'+car.id);return loadPolicy(car)}
W.CendonGarageData=Object.freeze({policy,loadPolicy,refreshPolicy,append});
})(window);
