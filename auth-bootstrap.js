/* The dedicated login page owns Firebase initialization; application pages keep their existing auth object. */
(function(W,D){
"use strict";
if(W.__cendonAuthBootstrap)return;
W.__cendonAuthBootstrap=true;
W.BACKEND_URL=W.BACKEND_URL||"https://spireonebackend.carspirethailand.workers.dev";
var config={apiKey:"AIzaSyDDtvz4d4FRG_KOq5EQHmlDijU-x1FDZlQ",authDomain:"sp1p-82396.firebaseapp.com",databaseURL:"https://sp1p-82396-default-rtdb.firebaseio.com",projectId:"sp1p-82396",storageBucket:"sp1p-82396.appspot.com",messagingSenderId:"924479207020",appId:"1:924479207020:web:ec64428a61403e1ad48a49"};
var auth=null;
try{
  if(!W.firebase||!W.firebase.auth)throw new Error("auth_unavailable");
  if(!W.firebase.apps||!W.firebase.apps.length)W.firebase.initializeApp(config);
  auth=W.firebase.auth();
  W.auth=auth;
  W.spireAuth=auth;
  W.spireFbReady=auth.setPersistence(W.firebase.auth.Auth.Persistence.LOCAL).then(function(){return true},function(){return false});
  W.spireInitialAuthReady=new Promise(function(resolve){
    var unsubscribe=null,settled=false;
    function finish(user){if(settled)return;settled=true;resolve(user||null);if(unsubscribe)unsubscribe();}
    unsubscribe=auth.onAuthStateChanged(finish,function(){finish(null)});
    if(settled&&unsubscribe)unsubscribe();
  });
  W.spireRedirectResult=Promise.resolve().then(function(){return auth.getRedirectResult()}).catch(function(error){
    W.spireRedirectError=String(error&&error.code||"auth/redirect-error");
    try{D.dispatchEvent(new CustomEvent("cendon:auth-error",{detail:{code:W.spireRedirectError}}))}catch(e){}
    return null;
  });
  try{D.dispatchEvent(new CustomEvent('cendon:auth-ready'))}catch(e){}
}catch(e){
  W.spireAuthError="auth_unavailable";
  W.spireFbReady=Promise.resolve(false);
  W.spireInitialAuthReady=Promise.resolve(null);
  W.spireRedirectResult=Promise.resolve(null);
}
W.spireAwaitUser=function(ms){
  return new Promise(function(resolve){
    if(!auth)return resolve(null);
    if(auth.currentUser)return resolve(auth.currentUser);
    var finished=false,unsubscribe=null;
    var waitMs=Math.max(0,Math.min(20000,Number.isFinite(+ms)?+ms:7000));
    var timer=setTimeout(function(){finish(auth.currentUser||null)},waitMs);
    function finish(user){if(finished)return;finished=true;clearTimeout(timer);if(unsubscribe)unsubscribe();resolve(user||null);}
    unsubscribe=auth.onAuthStateChanged(finish,function(){finish(null)});
    if(finished&&unsubscribe)unsubscribe();
  });
};
})(window,document);
