/* Explicit foreground checkpoint, after the page's primary handlers are wired.
   It is presentation only; backend authorization and owner gates stay unchanged. */
(function(W,D){'use strict';
  if(!W.CendonView||W.CendonPageCore)return;
  const ns=W.frameElement?.dataset.cendonView;
  const live=()=>{const u=(W.spireAuth||W.auth)?.currentUser;return u&&typeof u.getIdToken==='function'&&W.CendonScope?.owner()===u.uid?u:null;};
  function ready(){
    if(!live())return false;
    if(ns==='garage')return !!(D.getElementById('garageList')&&typeof W.openAddCar==='function'&&D.getElementById('gAdd')?.onclick&&W.CendonGarageRules&&W.CendonGarageData&&W.spireGuard);
    if(ns==='profile')return !!(W.CendonSettings&&D.querySelector('#v-settings.on #stMain'));
    if(ns==='news')return typeof W.openMagModal==='function'&&!!D.getElementById('v-magazine');
    if(ns==='spares')return !!(W.CendonShopSearch&&D.getElementById('ssForm'));
    return false;
  }
  W.CendonPageCore=Object.freeze({ready});
  D.dispatchEvent(new Event('cendon:primary-ready'));
  // Car detail belongs to a later feature block. A fast foreground paint must
  // not turn its first click into the old swallowed "function not ready" error.
  if(ns==='garage')D.addEventListener('click',e=>{
    const card=e.target.closest?.('#garageList .gx-car[data-open]');if(!card||typeof W.openCarDetail==='function')return;
    if(e.target.closest?.('button,a,input,select,textarea,[data-paint],[data-info],[data-del],[data-diag2]'))return;
    e.preventDefault();e.stopImmediatePropagation();const uid=live()?.uid,id=card.dataset.open;if(!uid||card.dataset.coreWaiting)return;
    card.dataset.coreWaiting='1';card.setAttribute('aria-busy','true');const began=Date.now(),status=D.createElement('span');status.setAttribute('role','status');status.style.cssText='display:block;padding:12px 18px;font-size:13px;color:var(--co)';status.textContent=W.spireT?.('กำลังเปิดรายละเอียด…','Opening details…')||'กำลังเปิดรายละเอียด…';card.append(status);
    const wait=()=>{if(!card.isConnected||live()?.uid!==uid){done();return;}
      if(typeof W.openCarDetail==='function'){done();W.openCarDetail(id);return;}
      if(Date.now()-began>18000){done();W.toast?.(W.spireT?.('ยังเปิดรายละเอียดไม่ได้ ลองอีกครั้ง','Details are not ready. Please retry.')||'Details are not ready. Please retry.');return;}
      setTimeout(wait,40);
    };function done(){delete card.dataset.coreWaiting;card.removeAttribute('aria-busy');status.remove();}wait();
  },true);
})(window,document);
