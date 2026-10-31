import test from 'node:test';import assert from 'node:assert/strict';import vm from 'node:vm';import {readFileSync} from 'node:fs';
const bridge=readFileSync(new URL('../app-navigation-bridge.js',import.meta.url),'utf8'),app=readFileSync(new URL('../app-navigation.js',import.meta.url),'utf8');
function fixture(){
 const authEvents=new Set(),tokenEvents=new Set(),docEvents={},winEvents={},u={uid:'live-owner',getIdToken:async()=> 'fixture-only'};
 const auth={currentUser:u,languageCode:'th',onAuthStateChanged(f){authEvents.add(f);f(this.currentUser);return ()=>authEvents.delete(f);},onIdTokenChanged(f){tokenEvents.add(f);return ()=>tokenEvents.delete(f);},async signOut(){this.currentUser=null;for(const f of authEvents)f(null);}};
 function factory(){return auth;}factory.Auth={Persistence:{LOCAL:'local'}};factory.GoogleAuthProvider=class{};
 const sdk={apps:[{name:'[DEFAULT]',options:{projectId:'cendon-1'}}],auth:factory},parent={document:{hidden:false},CendonApp:{shareFirebase:()=>sdk,ready(){}},history:{},location:new URL('https://fixture.test/')};
 const document={documentElement:{dataset:{}},readyState:'loading',body:{},dispatchEvent:e=>{for(const f of docEvents[e.type]||[])f(e);},addEventListener:(n,f)=>(docEvents[n]??=[]).push(f)};
 const window={frameElement:{dataset:{cendonView:'garage'},classList:{contains:()=>false}},parent,location:new URL('https://fixture.test/garage'),history:{replaceState(){}},addEventListener:(n,f)=>(winEvents[n]??=[]).push(f)};
 vm.runInNewContext(bridge,{window,document,Event:class{constructor(type){this.type=type}},URL,setTimeout:()=>0,clearTimeout(){}});
 return {window,parent,document,sdk,auth,authEvents,tokenEvents,emit:(n,e={})=>{for(const f of winEvents[n]||[])f(e);}};
}
test('shared Firebase keeps the real identity/method binding/providers, without mutating the donor',async()=>{
 const f=fixture();assert.equal(f.window.CendonView.reuseFirebase('cendon-1'),true);const a=f.window.firebase.auth();assert.notEqual(a,f.auth);assert.equal(a.currentUser,f.auth.currentUser);assert.equal(f.window.firebase.auth.Auth,f.sdk.auth.Auth);assert.equal(f.window.firebase.auth.GoogleAuthProvider,f.sdk.auth.GoogleAuthProvider);assert.equal(f.sdk.auth(),f.auth);
 let seen;const stop=a.onAuthStateChanged(u=>seen=u?.uid||null);assert.equal(seen,'live-owner');a.languageCode='en';assert.equal(f.auth.languageCode,'en');await a.signOut();assert.equal(seen,null);assert.equal(a.currentUser,null);stop();assert.equal(f.authEvents.size,0);
});
test('eviction/retry disposes scoped subscriptions, not another view\'s session',()=>{
 const f=fixture();f.window.CendonView.reuseFirebase('cendon-1');const a=f.window.firebase.auth();let calls=0;const donorStop=f.auth.onAuthStateChanged(()=>{});a.onAuthStateChanged(()=>calls++);a.onIdTokenChanged(()=>{});assert.equal(f.authEvents.size,2);assert.equal(f.tokenEvents.size,1);
 f.window.CendonView.disposeAuth();assert.equal(f.authEvents.size,1);assert.equal(f.tokenEvents.size,0);assert.equal(f.auth.currentUser.uid,'live-owner');a.onAuthStateChanged(()=>calls++);assert.equal(calls,1);donorStop();
});
test('back/forward cache pauses and restores each live subscription exactly once',()=>{
 const f=fixture();f.window.CendonView.reuseFirebase('cendon-1');const a=f.window.firebase.auth(),stop=a.onAuthStateChanged(()=>{});a.onIdTokenChanged(()=>{});f.emit('pagehide');assert.equal(f.authEvents.size,0);assert.equal(f.tokenEvents.size,0);f.emit('pageshow',{persisted:true});f.emit('pageshow',{persisted:true});assert.equal(f.authEvents.size,1);assert.equal(f.tokenEvents.size,1);stop();assert.equal(f.authEvents.size,0);
});
test('a missing live donor leaves the normal SDK/auth path intact',()=>{
 const f=fixture();f.parent.CendonApp.shareFirebase=()=>null;assert.equal(f.window.CendonView.reuseFirebase('cendon-1'),false);assert.equal(f.window.CendonView.sharedAuth,false);assert.equal(f.window.firebase,undefined);
});

test('late history callbacks from a hidden/preparing view cannot rewind the active page',()=>{
 const f=fixture(),visits=[];f.parent.history.go=n=>visits.push(n);f.parent.CendonApp.traversal=()=>{};f.window.dispatchEvent=()=>{};
 f.window.CendonView.history.go(-1);assert.equal(visits.length,0);
 f.window.CendonView.setHidden(false);f.parent.CendonApp.loading=true;f.window.CendonView.history.go(-1);assert.equal(visits.length,0);
 f.parent.CendonApp.loading=false;f.window.CendonView.history.go(-1);assert.deepEqual(visits,[-1]);
});
test('host never shares cached identity, an auth proxy, wrong owner/project, frozen or unready document',()=>{
 const f=fixture(),owners=new Set(),w={firebase:f.sdk,spireAuth:f.auth,CendonScope:{owner:()=> 'live-owner',frozen:()=>false}},r={ready:true,el:{isConnected:true,contentWindow:w}},frames=new Map([['home',r]]),context={frames,authOwners:owners};
 vm.runInNewContext(app.slice(app.indexOf('function shareFirebase('),app.indexOf('function showError('))+';globalThis.share=shareFirebase;',context);
 assert.equal(context.share('cendon-1'),f.sdk);assert.deepEqual([...owners],['home']);assert.equal(context.share('another-project'),null);assert.equal(context.share('../admin'),null);
 r.ready=false;assert.equal(context.share('cendon-1'),null);r.ready=true;w.CendonScope.owner=()=> 'another-owner';assert.equal(context.share('cendon-1'),null);w.CendonScope.owner=()=> 'live-owner';w.CendonScope.frozen=()=>true;assert.equal(context.share('cendon-1'),null);w.CendonScope.frozen=()=>false;
 w.spireAuth={currentUser:f.auth.currentUser};assert.equal(context.share('cendon-1'),null);w.spireAuth=f.auth;f.auth.currentUser={uid:'live-owner'};assert.equal(context.share('cendon-1'),null);f.auth.currentUser=null;assert.equal(context.share('cendon-1'),f.sdk,'reuse the actual pending SDK, but never manufacture a signed-in user');
});
test('the requested real document starts before awaiting Barba metadata; no loading UI remains',()=>{
 assert.ok(app.indexOf('result:prepare(u.href)')<app.indexOf('const response=await barba.cache'));assert.doesNotMatch(app,/pendingView|appPending|app-pending/);assert.ok(app.includes('authOwners.has(name)'));assert.ok(app.includes('CendonView?.disposeAuth?.()'));
});
