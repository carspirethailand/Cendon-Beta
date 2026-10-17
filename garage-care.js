/* Rare, optional conversation invitations; silence does not reveal a person's thoughts. */
(function(W){
  'use strict';
  const POLICY=Object.freeze({quietMs:25000,warmupMs:60000});
  const risk=/กำลังขับ|ขับรถอยู่|อุบัติเหตุ|ชนรถ|รถชน|บาดเจ็บ|ไฟไหม้|ควัน|เครื่องร้อน|เบรกแตก|หายใจไม่|เจ็บหน้าอก|เสียกลางทาง|รถเสีย|ฉุกเฉิน|สตาร์ทไม่ติด|start\s*ไม่ติด|\b(?:driving|accident|crash|injured|smoke|fire|overheat|brake failure|chest pain|stranded|breakdown|will not start|won't start)\b/i;
  function create(host){
    const now=host.now||Date.now;
    let epoch=0,start=now(),last=now(),seen=false,completed=false,consumed=false,suppressed=false,prompt=null,request=null;
    function reset(){epoch++;request?.abort();request=null;start=last=now();seen=completed=consumed=suppressed=false;prompt=null;}
    function activity(){last=now();}
    function heard(text){seen=true;activity();if(risk.test(String(text||''))||/ขอเงียบ|เงียบก่อน|รอก่อน|ขอคิด|ไม่ต้องถาม|ไม่อยากคุย|อย่าถาม|\b(?:be quiet|stay quiet|let me think|give me a moment|do not ask|don't ask)\b/i.test(String(text||'')))suppressed=true;}
    function turnComplete(){completed=true;activity();}
    function ready(s){return s&&s.active&&s.ready&&s.visible&&!s.busy&&!s.muted&&s.uid&&s.carId&&!suppressed;}
    async function tick(){
      const s=host.state();
      if(!ready(s)){activity();return;}
      if(consumed||!seen||!completed||now()-start<POLICY.warmupMs||now()-last<POLICY.quietMs)return;
      consumed=true;const run=epoch,at=last,owner=s.uid,car=s.carId,abort=new AbortController();request=abort;
      try{
        const result=await host.claim(car,abort.signal);
        const current=host.state(),q=result?.question;
        if(run!==epoch||abort.signal.aborted||!ready(current)||current.uid!==owner||current.carId!==car||last!==at)return;
        if(!q||q.carId!==car||!['mileage','ins','act','tax','chk'].includes(q.field)||typeof q.text!=='string'||q.text.length>600||typeof q.ticket!=='string'||q.ticket.length>100)return;
        // No invented user utterance is appended to the user's saved conversation.
        if(host.send(q)!==false){prompt=q;activity();}
      }catch{ /* A failed invitation must not disrupt/reconnect the call or retry-loop. */ }
      finally{if(request===abort)request=null;}
    }
    async function control(action,ctx){
      if(!['skip','disable','enable'].includes(action))return{error:'Unsupported check-in preference'};
      if(action==='skip'&&!prompt)return{error:'No current scheduled question'};
      if(!ctx?.isCurrent?.()||ctx.signal?.aborted)return{error:'Call no longer active'};
      const result=await host.feedback(action,prompt?.ticket,ctx.signal);
      if(!ctx.isCurrent()||ctx.signal.aborted)return{error:'Call no longer active'};
      if(result?.ok){if(action!=='enable')suppressed=true;prompt=null;activity();return{done:true,enabled:result.enabled,skipped:result.skipped,note:'Preference saved for this account. Do not ask another garage question now.'};}
      return{error:'Preference could not be saved. Do not claim it succeeded.'};
    }
    return Object.freeze({tick,reset,activity,heard,turnComplete,control});
  }
  W.CendonGarageCare=Object.freeze({create,POLICY});
})(window);
