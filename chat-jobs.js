/* Server-owned work; every signed-in page can collect results. Never cancel on navigation. */
(function(W,D){
'use strict';if(W.CendonChatJobs)return;
const KEY='spire_ai_results',DAY=86400000,wait=ms=>new Promise(r=>setTimeout(r,ms));
let config=null,polling=false;const fetching=new Map();
const terminal=j=>['complete','error','cancelled'].includes(j?.status);
const valid=j=>j&&/^[a-f0-9-]{36}$/.test(j.id||'')&&/^[\w-]{1,100}$/.test(j.carId||'')&&/^s[a-z0-9]{8,60}$/i.test(j.sessionId||'');
function user(){return config?.user?.()||(W.spireAuth||W.auth)?.currentUser||null}
function mine(uid){return user()?.uid===uid&&(!W.CendonScope||W.CendonScope.mine(uid))}
function cached(uid){try{if(!mine(uid))return [];const d=JSON.parse(localStorage.getItem(KEY)||'null');if(d?.uid!==uid||!Array.isArray(d.jobs))return [];const rows=d.jobs.filter(j=>valid(j)&&j.savedAt>Date.now()-7*DAY);if(rows.length!==d.jobs.length)save(uid,rows);return rows}catch{return []}}
function save(uid,jobs){if(!mine(uid))return;const rows=jobs.slice(0,20);do{try{localStorage.setItem(KEY,JSON.stringify({uid,jobs:rows}));return}catch{rows.pop()}}while(rows.length)}
async function call(uid,path,body){const u=user();if(!mine(uid))throw Object.assign(Error('Account changed'),{accountChanged:true});
  const token=await u.getIdToken();if(!mine(uid))throw Object.assign(Error('Account changed'),{accountChanged:true});
  const payload=body?JSON.stringify(body):undefined,controller=new AbortController(),timer=setTimeout(()=>controller.abort(),30000);
  try{const r=await fetch(String(W.BACKEND_URL).replace(/\/+$/,'')+path,{method:body?'POST':'GET',headers:{Authorization:'Bearer '+token,...(body?{'Content-Type':'application/json'}:{})},body:payload,keepalive:!!payload&&new TextEncoder().encode(payload).length<60000,cache:'no-store',signal:controller.signal});
    const d=await r.json();if(!mine(uid))throw Object.assign(Error('Account changed'),{accountChanged:true});
    if(!r.ok)throw Object.assign(Error('Chat request unavailable'),{status:r.status,userQuota:['quota','feature_quota'].includes(d?.error)});return d;
  }finally{clearTimeout(timer)}
}
function accept(job,uid,onUpdate){
  if(!valid(job)||!mine(uid))return;
  const view=!!config?.viewing?.(job)&&!D.hidden,rows=cached(uid),old=rows.find(j=>j.id===job.id);
  if(terminal(job)){
    // Keep a bounded result, not the original request, attachments or credentials.
    const row={id:job.id,carId:job.carId,sessionId:job.sessionId,status:job.status,text:String(job.text||'').slice(0,160000),research:(job.research||[]).slice(0,12),usage:job.usage,expiresAt:job.expiresAt,savedAt:Date.now(),notice:old?.notice||view||job.status==='cancelled'};
    save(uid,[row,...rows.filter(j=>j.id!==job.id)]);
    if(!row.notice&&W.CendonBell){
      const en=(W.lang||W.spireLang?.())==='en';
      W.CendonBell.add({id:'ai-job:'+job.id,kind:'ai',title:en?(job.status==='complete'?'Cendon AI replied':'Cendon AI task needs attention'):(job.status==='complete'?'Cendon AI ตอบแล้ว':'งาน Cendon AI ต้องตรวจสอบ'),
        body:en?'Open your conversation to view the result.':'เปิดบทสนทนาเดิมเพื่อดูผลของคุณ',tag:'cendon-ai-'+job.id,
        url:'/chat?car='+encodeURIComponent(job.carId)+'&session='+encodeURIComponent(job.sessionId)+'&job='+encodeURIComponent(job.id)},{fallback:true});
      row.notice=true;save(uid,[row,...rows.filter(j=>j.id!==job.id)]);
    }
  }
  if(mine(uid)){if(onUpdate)onUpdate(job,uid);else config?.apply?.(job,uid)}
}
function read(uid,id){const key=uid+':'+id;if(fetching.has(key))return fetching.get(key);
  const promise=call(uid,'/api/ai/jobs/'+encodeURIComponent(id)).finally(()=>fetching.delete(key));fetching.set(key,promise);return promise;
}
async function run(body,uid,onUpdate){
  let response,last;for(let n=0;n<3;n++){try{response=await call(uid,'/api/ai/jobs',body);break}catch(e){last=e;if(e.status||e.accountChanged)throw e;if(n<2)await wait(700*(n+1))}}
  if(!response)throw last;if(!valid(response.job))throw Error('Invalid job response');
  accept(response.job,uid,onUpdate);
  while(mine(uid)){const d=await read(uid,response.job.id);if(!valid(d.job))throw Error('Invalid answer');
    accept(d.job,uid,onUpdate);if(terminal(d.job))return d.job;await wait(D.hidden?3500:1000);
  }throw Object.assign(Error('Account changed'),{accountChanged:true});
}
async function resume(){const uid=user()?.uid;if(!uid||!mine(uid)||polling||D.hidden||!W.BACKEND_URL)return;polling=true;
  try{
    for(const job of cached(uid))if(config?.needs?.(job))accept(job,uid);
    const d=await call(uid,'/api/ai/jobs');
    for(const meta of d.jobs||[]){
      if(!mine(uid))break;if(!valid(meta))continue;
      const stored=cached(uid).find(j=>j.id===meta.id);
      if(terminal(meta)&&stored){if(!stored.notice||config?.needs?.(meta))accept(stored,uid);continue}
      if(!terminal(meta)&&!config?.needs?.(meta))continue;
      const r=await read(uid,meta.id);if(r.job)accept(r.job,uid);
    }
  }catch{}finally{polling=false}
}
function cancel(id){const uid=user()?.uid;return uid?call(uid,'/api/ai/jobs/'+encodeURIComponent(id)+'/cancel',{}):Promise.reject(Error('Sign in required'))}
W.CendonChatJobs=Object.freeze({configure(c){config=c;resume()},run,resume,cancel});
for(const event of ['online','focus','pageshow','cendon:auth-ready'])W.addEventListener(event,resume);
D.addEventListener('cendon:auth-ready',resume);D.addEventListener('visibilitychange',resume);
W.addEventListener('storage',e=>{if(e.key===KEY)resume()});setInterval(resume,4000);resume();
})(window,document);
