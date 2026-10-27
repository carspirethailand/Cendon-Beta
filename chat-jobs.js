/* Server-owned work; every signed-in page can collect results. Never cancel on navigation. */
(function(W,D){
'use strict';if(W.CendonChatJobs)return;
const KEY='spire_ai_results',DAY=86400000,wait=ms=>new Promise(r=>setTimeout(r,ms));
let config=null,polling=false;const fetching=new Map(),following=new Set(),noLive=new Set();
const terminal=j=>['complete','error','cancelled'].includes(j?.status);
const valid=j=>j&&/^[a-f0-9-]{36}$/.test(j.id||'')&&/^[\w-]{1,100}$/.test(j.carId||'')&&/^s[a-z0-9]{8,60}$/i.test(j.sessionId||'');
function user(){return config?.user?.()||(W.spireAuth||W.auth)?.currentUser||null}
const onChat=()=>/^\/chat(?:\.html)?\/?$/.test(location.pathname);
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
  /* อยู่ในหน้าแชต AI และจอเปิดอยู่ = ผู้ใช้เห็นคำตอบเอง ไม่ต้องแจ้งว่า "AI ตอบแล้ว" (ไม่ว่าจะเปิดบทสนทนาไหนอยู่) */
  const view=!D.hidden&&(!!config?.viewing?.(job)||onChat()),rows=cached(uid),old=rows.find(j=>j.id===job.id);
  if(terminal(job)){
    // Keep a bounded result, not the original request, attachments or credentials.
    const row={id:job.id,carId:job.carId,sessionId:job.sessionId,status:job.status,text:String(job.text||'').slice(0,160000),research:(job.research||[]).slice(0,12),steps:(job.steps||[]).slice(0,16),sources:(job.sources||[]).slice(0,8),notice:job.notice||null,usage:job.usage,expiresAt:job.expiresAt,savedAt:Date.now(),notice:old?.notice||view||job.status==='cancelled'};
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
/* ── ช่องสด: เห็นขั้นตอนจริงและตัวอักษรทันทีที่เซิร์ฟเวอร์ทำ ──
   snapshot → step/text/sources/notice ทีละอย่าง → end · สายหลุดต่อใหม่ได้ (ได้ snapshot ล่าสุดเสมอ)
   ต่อไม่ได้เลย (เซิร์ฟเวอร์รุ่นเก่า / เครือข่ายบล็อก) = คืน null ให้ถอยไปถามทุกวินาทีแบบเดิม */
async function follow(uid,job,onUpdate){
  if(!W.ReadableStream||!W.TextDecoder||!W.AbortController)return null;
  const id=job.id,state={...job,status:job.status==='queued'?'queued':'running',text:job.text||'',statusText:job.statusText||'',steps:job.steps||[],sources:job.sources||[],research:job.research||[],notice:job.notice||null};
  let seq=0,misses=0,timer=0;
  const flush=()=>{timer=0;if(mine(uid))accept({...state,steps:state.steps.slice(),sources:state.sources.slice()},uid,onUpdate)};
  const soon=()=>{if(!timer)timer=setTimeout(flush,80)};
  const step=e=>{const {type,seq:_s,...row}=e,i=state.steps.findIndex(x=>x.id===row.id);if(i<0)state.steps.push(row);else state.steps[i]={...state.steps[i],...row}};
  while(mine(uid)&&misses<4){
    let ended=false,got=false;
    try{
      const u=user();if(!u||!mine(uid))throw Object.assign(Error('Account changed'),{accountChanged:true});
      const token=await u.getIdToken(),ac=new AbortController();let idle=setTimeout(()=>ac.abort(),15000);
      const r=await fetch(String(W.BACKEND_URL).replace(/\/+$/,'')+'/api/ai/jobs/'+encodeURIComponent(id)+'/events',{headers:{Authorization:'Bearer '+token},cache:'no-store',signal:ac.signal});
      if(!r.ok||!r.body){clearTimeout(idle);if(r.status===404||r.status===405)return null;throw Error('live unavailable')}
      const rd=r.body.getReader(),dec=new TextDecoder();let buf='';
      for(;;){
        const {done,value}=await rd.read();if(done)break;
        clearTimeout(idle);idle=setTimeout(()=>ac.abort(),15000);
        if(!mine(uid)){ac.abort();throw Object.assign(Error('Account changed'),{accountChanged:true})}
        buf+=dec.decode(value,{stream:true});const parts=buf.split('\n\n');buf=parts.pop();
        for(const part of parts){
          if(!part.startsWith('data: '))continue;let e;try{e=JSON.parse(part.slice(6))}catch{continue}
          got=true;
          if(e.type==='snapshot'){Object.assign(state,{text:e.text||'',statusText:e.statusText||'',steps:e.steps||[],sources:e.sources||[],research:e.research||[],notice:e.notice||null});if(e.status&&!terminal(e))state.status=e.status;seq=e.seq||0;soon();continue}
          if(e.seq){if(e.seq<=seq)continue;seq=e.seq}
          if(e.type==='end'){ended=true;break}
          if(e.type==='ping')continue;
          state.status='running';
          if(e.type==='text')state.text+=String(e.delta||'');
          else if(e.type==='text_done')state.text=String(e.text||state.text);
          else if(e.type==='status')state.statusText=String(e.text||'');
          else if(e.type==='step'&&typeof e.id==='string')step(e);
          else if(e.type==='sources'&&Array.isArray(e.items))state.sources=e.items.slice(0,8);
          else if(e.type==='research'&&e.q)state.research=[...state.research,String(e.q)].slice(0,12);
          else if(e.type==='notice')state.notice=String(e.kind||'');
          else if(e.type==='done')state.usage=e.usage||null;
          soon();
        }
        if(ended){try{ac.abort()}catch{}break}
      }
      clearTimeout(idle);
    }catch(e){if(e.accountChanged)throw e}
    misses=got?0:misses+1;
    /* จบแล้ว หรือสายปิด (เซิร์ฟเวอร์ปิดทุก 2 นาที) → ดึงผลทางการหนึ่งครั้ง ถ้าจบแล้วใช้อันนั้น ไม่งั้นต่อใหม่ */
    try{const d=await read(uid,id);if(valid(d.job)&&terminal(d.job)){clearTimeout(timer);accept(d.job,uid,onUpdate);return d.job}}catch(e){if(e.accountChanged)throw e}
    if(!ended)await wait(got?150:700*misses);
  }
  clearTimeout(timer);return null;
}
async function run(body,uid,onUpdate){
  let response,last;for(let n=0;n<3;n++){try{response=await call(uid,'/api/ai/jobs',body);break}catch(e){last=e;if(e.status||e.accountChanged)throw e;if(n<2)await wait(700*(n+1))}}
  if(!response)throw last;if(!valid(response.job))throw Error('Invalid job response');
  accept(response.job,uid,onUpdate);
  following.add(response.job.id);
  try{const fin=await follow(uid,response.job,onUpdate);if(fin)return fin}finally{following.delete(response.job.id)}
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
      /* งานที่ยังทำอยู่ (เช่นเปิดหน้าใหม่ระหว่างรอ) → ต่อช่องสดแทนการถามทุก 4 วินาที */
      if(!terminal(meta)&&!following.has(meta.id)&&!noLive.has(meta.id)){following.add(meta.id);follow(uid,meta,null).then(j=>{if(!j)noLive.add(meta.id)},()=>{}).finally(()=>following.delete(meta.id));continue}
      if(!terminal(meta)&&following.has(meta.id))continue;
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
