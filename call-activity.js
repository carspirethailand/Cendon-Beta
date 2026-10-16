/* Observable task states, not model reasoning. Confirmations are UI-only. */
(() => {
 'use strict';
 const labels={get_my_car:'กำลังดูรถที่เลือก',find_mechanics:'กำลังค้นหาช่าง',show_mechanic:'กำลังเปิดร้าน',prepare_urgent_request:'กำลังเตรียมร่างงาน',get_my_garage:'กำลังอ่านรถของคุณ',get_my_requests:'กำลังดูคำขอของคุณ',get_my_conversations:'กำลังดูห้องคุยของคุณ',read_my_conversation:'กำลังอ่านบทสนทนาที่คุณเป็นเจ้าของ',prepare_mechanic_message:'กำลังเตรียมข้อความให้ตรวจ',open_app_page:'กำลังเปิดหน้าแอป'};
 const english={get_my_car:'Reading selected car',find_mechanics:'Finding mechanics',show_mechanic:'Opening shop',prepare_urgent_request:'Preparing request draft',get_my_garage:'Reading your garage',get_my_requests:'Reading your requests',get_my_conversations:'Listing your conversations',read_my_conversation:'Reading your conversation',prepare_mechanic_message:'Preparing message for review',open_app_page:'Opening app screen'};
 function create({language='th',onOpen}={}){
  const en=language!=='th',root=document.createElement('aside');root.className='cc-activity';root.hidden=true;root.setAttribute('aria-label',en?'AI task activity':'สถานะการทำงาน AI');
  const title=document.createElement('p'),status=document.createElement('p'),body=document.createElement('p'),actions=document.createElement('div');status.setAttribute('role','status');root.append(title,status,body,actions);document.body.append(root);
  let pending=null,history=[],busy=false,epoch=0;
  const details=document.createElement('details'),summary=document.createElement('summary'),steps=document.createElement('ol');details.className='cc-task-history';summary.textContent=en?'Recent activity':'กิจกรรมล่าสุด';details.append(summary,steps);root.append(details);
  function remember(name,state){history.push({task:name,state,at:Date.now()});history=history.slice(-20);steps.replaceChildren();for(const step of history.slice(-6)){const item=document.createElement('li');item.textContent=((en?english[step.task]:labels[step.task])||(en?'Task':'งาน'))+' · '+(step.state==='done'?(en?'done':'เสร็จแล้ว'):step.state==='error'?(en?'unavailable':'ไม่สำเร็จ'):(en?'working':'กำลังทำ'));steps.append(item)}}
  const show=(message,detail='')=>{root.hidden=false;status.textContent=message;body.textContent=detail};
  function task(name,state){remember(name,state);if(pending||busy)return;const label=en?(english[name]||'Working'):(labels[name]||'กำลังทำงาน');title.textContent='Cendon';show(label+(state==='done'?(en?' · done':' · เสร็จแล้ว'):state==='error'?(en?' · unavailable':' · ทำไม่สำเร็จ'):''));actions.replaceChildren();}
  function dismiss(){if(busy)return;pending?.cancel?.();pending=null;root.hidden=true;actions.replaceChildren()}
  function confirmation(draft,confirm,cancel){
   if(pending)return false;pending={cancel};title.textContent=en?'Review before sending':'ตรวจข้อความก่อนส่ง';show(draft.preview.shopName,draft.preview.message);actions.replaceChildren();
   const no=document.createElement('button'),yes=document.createElement('button');no.type=yes.type='button';no.textContent=en?'Cancel':'ยกเลิก';yes.textContent=en?'Confirm and send':'ยืนยันส่งข้อความ';no.onclick=dismiss;
   const uncertain=()=>{pending=null;actions.replaceChildren();show(en?'Delivery not confirmed — do not resend yet':'ยังยืนยันการส่งไม่ได้ อย่าส่งซ้ำทันที',en?'Check your conversations first.':'ตรวจในห้องคุยก่อนลองใหม่ครับ');const open=document.createElement('button');open.type='button';open.textContent=en?'Open conversations':'เปิดห้องคุยของฉัน';open.onclick=()=>onOpen?.('/messages');actions.append(open)};
   yes.onclick=async()=>{
    if(busy||!pending)return;const mine=epoch;busy=true;yes.disabled=no.disabled=true;status.textContent=en?'Sending…':'กำลังส่งข้อความ…';
    try{
     const r=await confirm();if(mine!==epoch)return;pending=null;actions.replaceChildren();
     if(r?.status==='sent'){
      show(en?'Message saved to conversation':'ส่งข้อความเข้าห้องคุยแล้ว',en?'This is not a booking.':'นี่เป็นการส่งข้อความ ยังไม่ใช่การจ้างงาน');
      const open=document.createElement('button');open.type='button';open.textContent=en?'Open conversation':'เปิดห้องคุย';open.onclick=()=>onOpen?.('/messages/'+r.threadId);actions.append(open);
     }else uncertain();
    }catch{if(mine===epoch)uncertain()}finally{if(mine===epoch)busy=false}
   };actions.append(no,yes);return true;
  }
  const close=document.createElement('button');close.type='button';close.className='cc-activity-close';close.textContent='×';close.setAttribute('aria-label',en?'Close task or cancel draft':'ปิดสถานะหรือยกเลิกร่าง');close.onclick=()=>{if(busy)return;if(pending)dismiss();else root.hidden=true};root.prepend(close);
  return Object.freeze({task,confirmation,reset(){epoch++;pending?.cancel?.();pending=null;busy=false;root.hidden=true;body.textContent='';actions.replaceChildren();history=[];steps.replaceChildren();details.open=false},dispose(){epoch++;pending?.cancel?.();root.remove()},history:()=>history.slice()});
 }
 window.CendonCallActivity=Object.freeze({create});
})();
