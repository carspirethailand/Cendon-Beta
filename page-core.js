/* Explicit foreground checkpoint, after the page's primary handlers are wired.
   It is presentation only; backend authorization and owner gates stay unchanged. */
(function(W,D){'use strict';
  if(!W.CendonView||W.CendonPageCore)return;
  const ns=W.frameElement?.dataset.cendonView;
  const live=()=>{const u=(W.spireAuth||W.auth)?.currentUser;return u&&typeof u.getIdToken==='function'&&W.CendonScope?.owner()===u.uid?u:null;};
  function ready(){
    if(!live())return false;
    if(ns==='garage')return !!(D.getElementById('garageList')&&typeof W.openAddCar==='function'&&typeof W.openCarDetail==='function'&&W.Nav?.started&&D.getElementById('gAdd')?.onclick&&W.CendonGarageRules&&W.CendonGarageData&&W.spireGuard);
    if(ns==='profile')return !!(W.CendonSettings&&D.querySelector('#v-settings.on #stMain'));
    if(ns==='news')return typeof W.openMagModal==='function'&&!!D.getElementById('v-magazine');
    if(ns==='spares')return !!(W.CendonShopSearch&&D.getElementById('ssForm'));
    return false;
  }
  W.CendonPageCore=Object.freeze({ready});
  D.dispatchEvent(new Event('cendon:primary-ready'));
})(window,document);
