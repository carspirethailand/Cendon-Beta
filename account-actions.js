/* Existing account settings remain available outside the first-use wizard. */
(function(W,D){
  'use strict';
  const T=(th,en)=>{try{return W.spireT?W.spireT(th,en):(JSON.parse(localStorage.getItem('spire_lang'))==='en'?en:th)}catch(e){return th}};
  const auth=()=>W.auth||W.spireAuth;
  /* เรียก backend ด้วยโทเคนของบัญชีที่ล็อกอินอยู่ · opt.method/body/raw (raw = คืน Response ไว้อ่านเอง) · keep = ไม่โยน error เมื่อสถานะไม่ใช่ 2xx */
  async function call(path,opt={}){
    const u=auth()&&auth().currentUser;if(!u)throw new Error('not_signed_in');
    const controller=new AbortController();let timer;
    const expired=new Promise((_,reject)=>{timer=setTimeout(()=>{controller.abort();reject(new Error('timeout'))},opt.timeout||15000)});
    try{return await Promise.race([expired,(async()=>{
      const token=await u.getIdToken();if(!auth().currentUser||auth().currentUser.uid!==u.uid||controller.signal.aborted)throw new Error('account_changed');
      const headers={Authorization:'Bearer '+token};if(opt.body)headers['Content-Type']='application/json';
      const res=await fetch((W.BACKEND_URL||'https://spireonebackend.carspirethailand.workers.dev')+path,{method:opt.method||'POST',headers,body:opt.body?JSON.stringify(opt.body):undefined,signal:controller.signal});
      if(opt.raw){if(!res.ok)throw new Error('HTTP '+res.status);return res}
      const data=await res.json().catch(()=>({}));
      if(!res.ok&&!opt.keep)throw new Error('HTTP '+res.status);
      if(!auth().currentUser||auth().currentUser.uid!==u.uid)throw new Error('account_changed');return opt.keep?{status:res.status,...data}:data;
    })()])}finally{clearTimeout(timer)}
  }
  /* ล้างทุกอย่างที่แอปเก็บไว้ในเครื่องนี้ (คงภาษา/ธีมไว้ถ้า keepPrefs) */
  function clearLocal(keepPrefs){
    const keep=new Set(keepPrefs?['spire_lang','spire_theme','lang','theme']:[]);
    try{for(let i=localStorage.length-1;i>=0;i--){const key=localStorage.key(i);if(key&&(key.startsWith('spire_')||key.startsWith('cendon'))&&!keep.has(key))localStorage.removeItem(key)}}catch(e){}
    try{sessionStorage.clear()}catch(e){}
    try{indexedDB.deleteDatabase('cendon-media')}catch(e){}
  }
  /* ดาวน์โหลดข้อมูลของฉัน — ไฟล์ JSON ทุกอย่างที่เซิร์ฟเวอร์เก็บเกี่ยวกับบัญชีนี้ */
  async function exportData(){
    const res=await call('/api/account/export',{method:'GET',raw:true,timeout:30000});
    const blob=await res.blob(),url=URL.createObjectURL(blob),a=D.createElement('a');
    a.href=url;a.download='cendon-data-'+new Date().toISOString().slice(0,10)+'.json';D.body.appendChild(a);a.click();a.remove();
    setTimeout(()=>URL.revokeObjectURL(url),60000);
  }
  /* ลบบัญชี Firebase จากเครื่อง (กรณีเซิร์ฟเวอร์ลบให้ไม่ได้) — ล็อกอินนานแล้วต้องยืนยันตัวตนใหม่ก่อน */
  async function deleteSignIn(){
    const u=auth()&&auth().currentUser;if(!u)return true;
    try{await u.delete();return true}catch(e){
      if(e&&e.code==='auth/requires-recent-login'&&W.firebase&&firebase.auth){
        const pid=(u.providerData||[]).map(p=>p&&p.providerId).find(Boolean);
        const provider=pid==='google.com'?new firebase.auth.GoogleAuthProvider():pid==='apple.com'?new firebase.auth.OAuthProvider('apple.com'):null;
        if(provider){try{await u.reauthenticateWithPopup(provider);await u.delete();return true}catch(_){}}
      }
      return false;
    }
  }
  /* confirmed = หน้าตั้งค่าให้ผู้ใช้พิมพ์ยืนยันในแผ่นของมันเองแล้ว (ไม่ต้องถามซ้ำด้วยกล่องของเบราว์เซอร์) · คืน true เมื่อลบสำเร็จ */
  async function deleteAccount(say,confirmed){
    if(!confirmed){const typed=W.prompt(T('ลบบัญชีถาวร: ข้อมูลทั้งหมด (รถ แชต AI ไฟล์ การเชื่อม LINE ร้านช่าง) จะถูกลบและกู้คืนไม่ได้\nแนะนำให้กด "ดาวน์โหลดข้อมูลของฉัน" ก่อน\n\nพิมพ์ DELETE เพื่อยืนยัน','Delete account permanently: all data (cars, AI chats, files, LINE link, mechanic shop) will be erased and cannot be recovered.\nConsider "Download my data" first.\n\nType DELETE to confirm'));
    if(typed==null)return false;
    if(String(typed).trim().toUpperCase()!=='DELETE'){say(T('ยังไม่ได้ลบ — ต้องพิมพ์ DELETE ให้ตรง','Not deleted — you must type DELETE exactly'));return false}}
    say(T('กำลังลบข้อมูล…','Deleting your data…'));
    let r;try{r=await call('/api/account/delete',{body:{confirm:'DELETE'},keep:true,timeout:45000})}
    catch(e){say(T('ลบไม่สำเร็จ ยังไม่มีอะไรถูกลบ กรุณาลองใหม่','Could not delete. Nothing was removed. Please retry.'));return false}
    if(r.status===409&&r.error==='active_jobs'){say(T('ยังมีงานซ่อมที่ทำค้างอยู่ '+(r.jobs||[]).length+' งาน — ปิดงานให้จบก่อน แล้วค่อยลบบัญชี','You still have '+(r.jobs||[]).length+' repair job(s) in progress — finish them before deleting your account'));return false}
    if(r.ok!==true){say(T('ลบไม่สำเร็จ กรุณาลองใหม่หรือติดต่อทีมงาน','Could not delete. Please retry or contact support.'));return false}
    const signIn=r.firebaseDeleted||await deleteSignIn();
    clearLocal(true);
    try{if(auth())await auth().signOut()}catch(e){}
    W.alert(signIn?T('ลบบัญชีและข้อมูลทั้งหมดเรียบร้อยแล้ว ขอบคุณที่ใช้ Cendon','Your account and all data have been deleted. Thank you for using Cendon.')
      :T('ลบข้อมูลทั้งหมดแล้ว แต่ยังลบบัญชีล็อกอินไม่สำเร็จ — เข้าสู่ระบบอีกครั้งแล้วกด "ลบบัญชีถาวร" ซ้ำเพื่อลบให้ครบ','All data was deleted, but the sign-in account could not be removed — sign in again and press "Delete account" once more to finish.'));
    location.replace('/');
    return true;
  }
  async function resetAccount(){
    try{const result=await call('/api/account/reset');
      if(result.ok!==true||Object.values(result.removed||{}).some(v=>typeof v==='string'&&v.startsWith('error:')))throw new Error('partial_reset');
      clearLocal(true);
      return {server:true,why:''};
    }catch(e){return {server:false,why:String(e.message||e)}}
  }
  function dangerHTML(){return `<section class="su-danger" id="suDanger"><h4>${T('บัญชีและความปลอดภัย','Account and safety')}</h4><p>${T('ข้อมูลของคุณเป็นของคุณ ดาวน์โหลดสำเนาได้ทุกเมื่อ · รีเซ็ต/ปิด/ลบบัญชีมีผลกับข้อมูลจริง กรุณาตรวจให้แน่ใจก่อนกด','Your data is yours — download a copy anytime. Reset, deactivate and delete affect real data, so please review first.')} <a href="/privacy" target="_blank" rel="noopener">${T('นโยบายความเป็นส่วนตัว','Privacy policy')}</a></p><div class="row"><button type="button" data-danger="export">${T('ดาวน์โหลดข้อมูลของฉัน','Download my data')}</button><button type="button" data-danger="logout">${T('ออกจากระบบ','Sign out')}</button><button type="button" data-danger="reset">${T('รีเซ็ตบัญชี','Reset account')}</button><button type="button" data-danger="deactivate">${T('ปิดใช้งานบัญชี','Deactivate account')}</button><button type="button" data-danger="delete">${T('ลบบัญชีถาวร','Delete account')}</button></div><p id="suDangerMsg" role="status"></p></section>`}
  async function danger(action){
    const say=text=>{const el=D.getElementById('suDangerMsg');if(el)el.textContent=text};
    if(action==='export'){say(T('กำลังเตรียมไฟล์…','Preparing your file…'));try{await exportData();say(T('ดาวน์โหลดแล้ว — ไฟล์มีข้อมูลส่วนตัว เก็บไว้ในที่ปลอดภัย','Downloaded — the file contains personal data, keep it safe'))}catch(e){say(T('ดาวน์โหลดไม่สำเร็จ กรุณาลองใหม่','Download failed. Please retry.'))}return}
    if(action==='delete'){await deleteAccount(say);return}
    if(action==='logout'){try{if(W.CendonScope)await W.CendonScope.signOut();else{const a=auth();if(a)await a.signOut()}location.reload()}catch(e){say(T('ออกจากระบบไม่สำเร็จ กรุณาลองใหม่','Could not sign out. Please retry.'))}return}
    if(action==='reset'){
      if(!W.confirm(T('ล้างข้อมูลทั้งหมดของบัญชีนี้บนเซิร์ฟเวอร์ แล้วเริ่มตั้งค่าใหม่? การกระทำนี้ย้อนกลับไม่ได้','Erase this account data from the server and start setup again? This cannot be undone.')))return;
      const result=await resetAccount();
      if(!result.server){say(T('รีเซ็ตไม่สำเร็จหรือยังล้างข้อมูลไม่ครบ ข้อมูลในเครื่องยังไม่ได้ล้าง กรุณาลองใหม่','The reset did not finish. Local data was not cleared. Please retry.'));return}
      if(W.CendonAccount)W.CendonAccount.reload();else location.reload();return;
    }
    if(action==='deactivate'){
      if(!W.confirm(T('ปิดใช้งานบัญชีนี้? คุณจะเข้าใช้งานไม่ได้จนกว่าผู้ดูแลจะเปิดคืนให้','Deactivate this account? You cannot sign in again until an administrator restores it.')))return;
      try{await deactivateAccount();location.reload()}
      catch(e){say(T('ปิดใช้งานไม่สำเร็จ กรุณาลองใหม่หรือติดต่อผู้ดูแล','Could not deactivate the account. Please retry or contact support.'))}
    }
  }
  /* ปิดใช้งาน: บอกเซิร์ฟเวอร์ก่อน แล้วออกจากระบบ (ล้างข้อมูลในเครื่องด้วย) */
  async function deactivateAccount(){
    await call('/api/account/deactivate');
    if(W.CendonScope)await W.CendonScope.signOut();else if(auth())await auth().signOut();
    return true;
  }
  W.spireResetAccount=resetAccount;W.spireExportData=exportData;W.spireDangerHTML=dangerHTML;
  /* หน้าตั้งค่า (settings.js) เรียกชุดนี้ — ยืนยันในแผ่นของหน้าตั้งค่าเองแล้ว */
  W.CendonAccountActions=Object.freeze({exportData,reset:resetAccount,deactivate:deactivateAccount,remove:say=>deleteAccount(say,true)});
  W.spireWireDanger=root=>{(root||D).querySelectorAll('[data-danger]').forEach(b=>{b.onclick=async()=>{if(b.disabled)return;b.disabled=true;try{await danger(b.dataset.danger)}finally{b.disabled=false}}})};
})(window,document);
