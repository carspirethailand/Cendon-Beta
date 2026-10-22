/* Cloudflare is authoritative for mechanic membership. Local storage is only
   an account-scoped paint hint, never a registration or authorization decision.
   No shop/application content, credentials or documents are persisted here. */
(function(W,D){
  'use strict';if(W.CendonPartnerState)return;
  const KEY='spire_partner',STATES=new Set(['none','shop','pending','approved','rejected','declined','withdrawn']);
  const auth=()=>{try{return W.spireAuth||W.auth||(W.firebase?.apps?.length?W.firebase.auth():null)}catch{return null}};
  const user=()=>{try{return auth()?.currentUser||null}catch{return null}};
  const api=()=>String(W.BACKEND_URL||'https://spireonebackend.carspirethailand.workers.dev').replace(/\/+$/,'');
  let owner=null,epoch=0,request=null,record=null,data=null,at=0,lastAttempt=0,failed=false,authKnown=false;
  const bound=new WeakSet();
  function remembered(uid){try{const p=JSON.parse(W.localStorage.getItem(KEY)||'null');return p&&uid&&p.uid===uid&&STATES.has(p.s)?{uid,s:p.s,r:p.r?1:0}:null}catch{return null}}
  function peek(uid){
    const live=user()?.uid;
    if(authKnown&&!live)return {uid:null,s:'none',phase:'signedout'};
    if(live&&uid&&live!==uid)return {uid:live,s:'checking',phase:'checking'};
    uid=live||uid||null;
    const hint=remembered(uid),p=uid&&owner===uid&&record?{...record,r:hint?.r??record.r}:hint;
    // Negative paint hints may predate approval on another device. Only a
    // successful response in this page can establish a new applicant.
    if(!(uid&&owner===uid&&record)&&p&&['none','withdrawn'].includes(p.s))return {uid,s:'checking',phase:owner===uid&&failed?'offline':'checking'};
    return {...(p||{uid,s:'checking'}),...(owner===uid&&record&&data?.technician?{suspended:!!data.technician.suspended,identityHold:!!data.technician.identityHold,test:!!data.technician.test}:{}),phase:owner===uid&&failed?'offline':owner===uid&&record?'ready':'checking'};
  }
  function emit(){try{W.dispatchEvent(new CustomEvent('cendon:partner-state',{detail:peek(owner)}))}catch{}}
  function select(uid){
    if(owner===uid)return;
    epoch++;request?.controller.abort();request=null;owner=uid;record=null;data=null;at=0;lastAttempt=0;failed=false;emit();
  }
  function refresh(force=false){
    const u=user();if(!u?.uid)return Promise.reject(Error('Sign-in is not ready'));
    select(u.uid);
    if(request?.uid===u.uid)return request.task;
    if(!force&&data&&Date.now()-at<30000)return Promise.resolve(data);
    const q={uid:u.uid,epoch,controller:new AbortController()};let timer;
    const current=()=>user()?.uid===q.uid&&owner===q.uid&&epoch===q.epoch&&!q.controller.signal.aborted;
    lastAttempt=Date.now();failed=false;
    const work=async()=>{
      const token=await u.getIdToken();if(!current())throw Error('Account changed');
      const response=await W.fetch(api()+'/api/tech/me',{method:'GET',cache:'no-store',headers:{Authorization:'Bearer '+token},signal:q.controller.signal});
      if(!response.ok)throw Error('Could not check mechanic account');
      const d=await response.json();
      if(!current())throw Error('Account changed');
      // A partial/error response must never become a confirmed "no shop".
      if(!d||d.uid!==q.uid||!Object.hasOwn(d,'technician')||!Object.hasOwn(d,'application')||
        (d.technician!==null&&(!d.technician||typeof d.technician.id!=='string'||!d.technician.id))||
        (d.application!==null&&(!d.application||!STATES.has(d.application.status))))throw Error('Invalid mechanic account response');
      const old=remembered(q.uid),s=d.technician?'shop':d.application?d.application.status:'none';
      record={uid:q.uid,s,r:old?.r||0};data=d;at=Date.now();failed=false;
      try{W.localStorage.setItem(KEY,JSON.stringify({...record,at}))}catch{}
      emit();return d;
    };
    const deadline=new Promise((_,reject)=>{timer=setTimeout(()=>{q.controller.abort();reject(Error('Mechanic account check timed out'))},12000)});
    q.task=Promise.race([work(),deadline]).catch(e=>{if(owner===q.uid&&epoch===q.epoch){failed=true;emit()}throw e}).finally(()=>{clearTimeout(timer);if(request===q)request=null});
    request=q;emit();return q.task;
  }
  function resume(){if(!D.hidden&&user()&&Date.now()-lastAttempt>=5000)refresh(true).catch(()=>{})}
  function boot(){let tries=0;const bind=()=>{
    const a=auth();if(a&&typeof a.onAuthStateChanged==='function'){
      if(bound.has(a))return;bound.add(a);
      a.onAuthStateChanged(u=>{if(user()?.uid!==u?.uid)return;authKnown=true;select(u?.uid||null);emit();if(u)refresh().catch(()=>{})});return;
    }
    if(++tries<40)setTimeout(bind,250);
  };bind()}
  W.CendonPartnerState=Object.freeze({peek,refresh});
  W.addEventListener('focus',resume);W.addEventListener('online',resume);
  W.addEventListener('storage',e=>{if(e.key===KEY){emit();resume()}});
  D.addEventListener('visibilitychange',resume);D.addEventListener('cendon:auth-ready',boot);
  setInterval(resume,60000);
  if(D.readyState==='loading')D.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})(window,document);
