/* The dedicated login page owns Firebase initialization; application pages keep their existing auth object. */
(function(W,D){
"use strict";
if(W.__cendonAuthBootstrap)return;
W.__cendonAuthBootstrap=true;
W.BACKEND_URL=W.BACKEND_URL||"https://spireonebackend.carspirethailand.workers.dev";
var config={apiKey:"AIzaSyCowQ-RU7amV380yrSQ3yamgiDW58ap2yw",authDomain:"cendon-1.firebaseapp.com",projectId:"cendon-1",storageBucket:"cendon-1.firebasestorage.app",messagingSenderId:"229708644319",appId:"1:229708644319:web:849e321d755fa53d670e6a",measurementId:"G-GDLHE2EVPE"};
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
