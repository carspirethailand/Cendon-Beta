/* Requests are durable on the server. Navigation only ends this page's polling. */
(function(W,D){
'use strict';let config=null,polling=false;const wait=ms=>new Promise(r=>setTimeout(r,ms));
function user(){return config?.user?.()||null}
async function call(uid,path,body){const u=user();if(u?.uid!==uid)throw Object.assign(Error('Account changed'),{accountChanged:true});
  const token=await u.getIdToken();if(user()?.uid!==uid)throw Object.assign(Error('Account changed'),{accountChanged:true});
  const payload=body?JSON.stringify(body):undefined,controller=new AbortController(),timer=setTimeout(()=>controller.abort(),15000);
  try{const r=await fetch(String(W.BACKEND_URL).replace(/\/+$/,'')+path,{method:body?'POST':'GET',headers:{Authorization:'Bearer '+token,...(body?{'Content-Type':'application/json'}:{})},body:payload,keepalive:!!payload&&new TextEncoder().encode(payload).length<60000,cache:'no-store',signal:controller.signal});
    const d=await r.json();if(user()?.uid!==uid)throw Object.assign(Error('Account changed'),{accountChanged:true});
    if(!r.ok)throw Object.assign(Error('Chat request unavailable'),{status:r.status,userQuota:d?.error==='quota'});return d;
  }finally{clearTimeout(timer)}
}
async function run(body,uid,onUpdate){
  let response,last;for(let n=0;n<3;n++){try{response=await call(uid,'/api/ai/jobs',body);break}catch(e){last=e;if(e.status||e.accountChanged)throw e;if(n<2)await wait(700*(n+1))}}
  if(!response)throw last;if(!response.job?.id)throw Error('Invalid job response');
  while(user()?.uid===uid){const d=await call(uid,'/api/ai/jobs/'+encodeURIComponent(response.job.id));if(!d.job)throw Error('Invalid answer');
    onUpdate(d.job,uid);if(['complete','error','cancelled'].includes(d.job.status))return d.job;await wait(D.hidden?3500:1000);
  }throw Object.assign(Error('Account changed'),{accountChanged:true});
}
async function resume(){const uid=user()?.uid;if(!uid||!config||polling||D.hidden)return;polling=true;
  try{const d=await call(uid,'/api/ai/jobs');for(const meta of d.jobs||[]){if(user()?.uid!==uid)break;if(!config.needs(meta))continue;const r=await call(uid,'/api/ai/jobs/'+encodeURIComponent(meta.id));if(r.job)config.apply(r.job,uid)}}catch{}finally{polling=false}
}
function cancel(id){const uid=user()?.uid;return uid?call(uid,'/api/ai/jobs/'+encodeURIComponent(id)+'/cancel',{}):Promise.reject(Error('Sign in required'))}
W.CendonChatJobs=Object.freeze({configure(c){config=c;resume()},run,resume,cancel});
W.addEventListener('online',resume);W.addEventListener('focus',resume);W.addEventListener('pageshow',resume);W.addEventListener('cendon:auth-ready',resume);D.addEventListener('visibilitychange',resume);setInterval(resume,4000);
})(window,document);
