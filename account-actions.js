/* Existing account settings remain available outside the first-use wizard. */
(function(W,D){
  'use strict';
  const T=(th,en)=>{try{return W.spireT?W.spireT(th,en):(JSON.parse(localStorage.getItem('spire_lang'))==='en'?en:th)}catch(e){return th}};
  const auth=()=>W.auth||W.spireAuth;
  async function call(path){
    const u=auth()&&auth().currentUser;if(!u)throw new Error('not_signed_in');
    const controller=new AbortController();let timer;
    const expired=new Promise((_,reject)=>{timer=setTimeout(()=>{controller.abort();reject(new Error('timeout'))},15000)});
    try{return await Promise.race([expired,(async()=>{
      const token=await u.getIdToken();if(!auth().currentUser||auth().currentUser.uid!==u.uid||controller.signal.aborted)throw new Error('account_changed');
      const res=await fetch((W.BACKEND_URL||'https://spireonebackend.carspirethailand.workers.dev')+path,{method:'POST',headers:{Authorization:'Bearer '+token},signal:controller.signal});
      if(!res.ok)throw new Error('HTTP '+res.status);const data=await res.json();
      if(!auth().currentUser||auth().currentUser.uid!==u.uid)throw new Error('account_changed');return data;
    })()])}finally{clearTimeout(timer)}
  }
  async function resetAccount(){
    try{const result=await call('/api/account/reset');
      if(result.ok!==true||Object.values(result.removed||{}).some(v=>typeof v==='string'&&v.startsWith('error:')))throw new Error('partial_reset');
      const keep=new Set(['spire_lang','spire_theme','lang','theme']);
      for(let i=localStorage.length-1;i>=0;i--){const key=localStorage.key(i);if(key&&key.startsWith('spire_')&&!keep.has(key))localStorage.removeItem(key)}
      return {server:true,why:''};
    }catch(e){return {server:false,why:String(e.message||e)}}
  }
  function dangerHTML(){return `<section class="su-danger" id="suDanger"><h4>${T('บัญชีและความปลอดภัย','Account and safety')}</h4><p>${T('รีเซ็ตและปิดบัญชีมีผลกับข้อมูลจริง กรุณาตรวจให้แน่ใจก่อนกด','Resetting or deactivating affects real account data. Please review before continuing.')}</p><div class="row"><button type="button" data-danger="logout">${T('ออกจากระบบ','Sign out')}</button><button type="button" data-danger="reset">${T('รีเซ็ตบัญชี','Reset account')}</button><button type="button" data-danger="deactivate">${T('ปิดใช้งานบัญชี','Deactivate account')}</button></div><p id="suDangerMsg" role="status"></p></section>`}
  async function danger(action){
    const say=text=>{const el=D.getElementById('suDangerMsg');if(el)el.textContent=text};
    if(action==='logout'){try{const a=auth();if(a)await a.signOut();location.reload()}catch(e){say(T('ออกจากระบบไม่สำเร็จ กรุณาลองใหม่','Could not sign out. Please retry.'))}return}
    if(action==='reset'){
      if(!W.confirm(T('ล้างข้อมูลทั้งหมดของบัญชีนี้บนเซิร์ฟเวอร์ แล้วเริ่มตั้งค่าใหม่? การกระทำนี้ย้อนกลับไม่ได้','Erase this account data from the server and start setup again? This cannot be undone.')))return;
      const result=await resetAccount();
      if(!result.server){say(T('รีเซ็ตไม่สำเร็จหรือยังล้างข้อมูลไม่ครบ ข้อมูลในเครื่องยังไม่ได้ล้าง กรุณาลองใหม่','The reset did not finish. Local data was not cleared. Please retry.'));return}
      if(W.CendonAccount)W.CendonAccount.reload();else location.reload();return;
    }
    if(action==='deactivate'){
      if(!W.confirm(T('ปิดใช้งานบัญชีนี้? คุณจะเข้าใช้งานไม่ได้จนกว่าผู้ดูแลจะเปิดคืนให้','Deactivate this account? You cannot sign in again until an administrator restores it.')))return;
      try{await call('/api/account/deactivate');if(auth())await auth().signOut();location.reload()}
      catch(e){say(T('ปิดใช้งานไม่สำเร็จ กรุณาลองใหม่หรือติดต่อผู้ดูแล','Could not deactivate the account. Please retry or contact support.'))}
    }
  }
  W.spireResetAccount=resetAccount;W.spireDangerHTML=dangerHTML;
  W.spireWireDanger=root=>{(root||D).querySelectorAll('[data-danger]').forEach(b=>{b.onclick=async()=>{if(b.disabled)return;b.disabled=true;try{await danger(b.dataset.danger)}finally{b.disabled=false}}})};
})(window,document);
