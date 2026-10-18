/* Own-account failed readings stay editable, never silently discarded or sent as another user. */
(function(W,D){
'use strict';const T=(th,en)=>W.lang==='en'?en:th;
const read=()=>{try{return JSON.parse(localStorage.getItem('spire_odo_queue')||'[]')}catch{return []}};
const auth=()=>W.spireAuth||W.auth;
function mount(car){
  const host=D.getElementById('clBody'),owner=auth()?.currentUser?.uid;if(!host||!owner||!car?.id)return;
  host.querySelector('#mileageReview')?.remove();const rows=read().filter(x=>x.uid===owner&&x.carId===car.id&&x.needsReview);if(!rows.length)return;
  const panel=D.createElement('section');panel.id='mileageReview';panel.className='cl-grp';const title=D.createElement('h4');title.textContent=T('เลขไมล์ที่ยังไม่ซิงก์','Mileage needing review');panel.append(title);
  for(const item of rows.slice(0,20)){
    const form=D.createElement('form');form.className='fa-entry';
    form.innerHTML='<label>'+T('เลขหน้าปัดจริง','Actual dashboard reading')+'<input name="km" type="number" min="0" max="3000000" step="1" required></label><label>'+T('วันที่อ่านเลขนี้','Date of this reading')+'<input name="date" type="date" required></label><button type="submit" class="btn primary">'+T('ตรวจและส่งอีกครั้ง','Check and resubmit')+'</button><p role="status" aria-live="polite"></p>';
    form.elements.km.value=String(item.km);const time=new Date(item.observedAt);form.elements.date.value=Number.isFinite(time.getTime())?time.toISOString().slice(0,10):'';
    form.onsubmit=async e=>{
      e.preventDefault();const button=form.querySelector('button'),status=form.querySelector('[role="status"]');if(button.disabled)return;button.disabled=true;
      try{
        if(auth()?.currentUser?.uid!==owner)throw Error(T('บัญชีเปลี่ยนแล้ว','Account changed'));
        const km=W.CendonGarageRules.number(form.elements.km.value,0,3000000,'km',true),date=W.CendonGarageRules.date(form.elements.date.value,true);
        const observedAt=Math.min(Date.parse(date+'T12:00:00Z'),Date.now()),body={carId:car.id,km,source:'manual',observedAt};
        status.textContent=T('กำลังส่ง…','Saving…');
        try{await W.CendonValetCore.api('/api/odo/anchor',body,'POST',owner)}catch(error){if(error.code!=='mileage_jump'||!confirm(error.message))throw error;await W.CendonValetCore.api('/api/odo/anchor',{...body,confirmJump:true},'POST',owner)}
        if(auth()?.currentUser?.uid!==owner)throw Error('Account changed');
        localStorage.setItem('spire_odo_queue',JSON.stringify(read().filter(x=>!(x.uid===owner&&x.sig===item.sig))));
        status.textContent=T('บันทึกขึ้นบัญชีแล้ว','Saved to your account');button.hidden=true;W.syncCars?.();
      }catch(error){status.textContent=error.message;button.disabled=false}
    };panel.append(form);
  }host.append(panel);
}
W.CendonMileageReview=Object.freeze({mount});
})(window,document);
