/* ความเร็วตอนเปิดหน้า: สิ่งที่วัดเจอว่าทำให้จอว่าง/เครื่องค้าง ห้ามกลับมา */
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=f=>readFileSync(new URL('../'+f,import.meta.url),'utf8');

test('home 3D logo waits until on screen, page settled and idle; weak phones keep the still logo',()=>{
  const h=read('index.html'),fx=h.slice(h.indexOf('function fx3d(cv,o){'),h.indexOf('function drawPartner()'));
  assert.match(fx,/IntersectionObserver/);
  assert.match(fx,/loadEventEnd/);
  assert.match(fx,/requestIdleCallback/);
  assert.match(fx,/hardwareConcurrency\|\|8\)<=4/);
  assert.ok(fx.indexOf('import("/fx3d.js')>fx.indexOf('const go='),'the 3D module is only imported inside the deferred start');
});

test('chat page does not wait for /api/login before showing the room; long car fetch shows a loading line',()=>{
  const c=read('chat.html');
  assert.doesNotMatch(c,/await backendLogin\(u\)/);
  assert.match(c,/const login=backendLogin\(u\)/);
  assert.match(c,/#v-login\.wait \.pane-inner\{visibility:visible\}/);
  assert.match(c,/"login\.loading":\[/);
});

test('/jobs, /compare, /post/:id open as soon as the user is known (not after the whole directory loads)',()=>{
  const h=read('index.html');
  assert.match(h,/const needUser=async\(\)=>\{await READY\.user;/);
  for(const r of ['path:"jobs",name:"jobs",open:async()=>{if(await needUser())','path:"compare/:g",open:async p=>{if(await needUser())','path:"post/:id",open:async p=>{if(await needUser())'])assert.ok(h.includes(r),r);
});

test('mobile chat header: ⋮ sits beside the bell, never over the car name',()=>{
  const v=read('valet.css'),c=read('chat.html');
  assert.match(v,/header\.pill #pMore~\.cb-bell\{margin-left:0!important\}/,'only ⋮ pushes right; the bell must not split the free space');
  assert.match(c,/valet\.css\?v=3/);
  assert.match(c,/header\.pill \.p-car\{[^}]*max-width:calc\(100vw - 212px\)!important/,'centred car name leaves room for two buttons each side');
});

test('units/currency use the device owner\'s saved preferences before Firebase restores the session',()=>{
  const d=read('display-prefs.js');
  assert.match(d,/function owner\(\)\{try\{return localStorage\.getItem\('cendon_signed'\)==='1'\?localStorage\.getItem\('spire___owner'\):null\}/);
  assert.match(d,/own=cu\?null:owner\(\),u=cu\|\|\(own\?\{uid:own\}:null\)/);
  for(const f of ['index','chat','garage','news','profile','spares','admin','plan','handbook'])assert.match(read(f+'.html'),/display-prefs\.js\?v=4/,f);
});

test('chat enters immediately for the signed-in device owner even without a cached chat user',()=>{
  const c=read('chat.html');
  assert.match(c,/if\(useFb&&!currentUser&&signed&&own\)\{const st=LS\.get\("setup",\{\}\)\|\|\{\};currentUser=\{uid:own/);
  assert.match(c,/if\(currentUser&&own&&currentUser\.uid!==own\)currentUser=null;/,'a cached user from another account is never used');
});

test('app pages do not zoom (pinch, double-tap, iOS gesture)',()=>{
  for(const f of ['index','chat','garage','news','profile','spares','admin','login','plan']){
    const h=read(f+'.html');
    assert.equal((h.match(/<meta name="viewport"/g)||[]).length,1,f+': one viewport tag');
    assert.match(h,/maximum-scale=1, user-scalable=no/,f);
    assert.match(h,/\["gesturestart","gesturechange"\]/,f);
  }
  assert.match(read('stability.css'),/html\{touch-action:manipulation\}/);
});

test('no prerender of app pages: on real phones it made tabs slower (blank screen while prerenders fought for CPU)',()=>{
  for(const f of ['index','garage','news','profile','spares','chat']){
    const h=read(f+'.html');
    assert.doesNotMatch(h,/instant-nav\.js/,f);
    assert.doesNotMatch(h,/"prerender"/,f);
  }
  assert.doesNotMatch(read('sw.js'),/instant-nav/);
});

test('tab keep-alive (test mode): off unless the device opted in, home ↔ garage only, hidden tab holds GETs',()=>{
  const j=read('tab-shell.js');
  assert.match(j,/if\(q==='1'\)localStorage\.setItem\('cendon_tabs','1'\);if\(q==='0'\)localStorage\.removeItem\('cendon_tabs'\)/);
  assert.match(j,/if\(!enabled&&!childKey\)\{W\.CendonTabs=Object\.freeze\(\{on:false,go:\(\)=>false\}\);return\}/,'default: nothing is wrapped or overridden');
  assert.ok(j.indexOf("if(!enabled&&!childKey)")<j.indexOf("W.fetch=function"),'fetch is only wrapped in test mode');
  assert.match(j,/const TABS=\{'\/':'home','\/garage':'garage'\}/);
  assert.match(j,/if\(!hidden\|\|method!=='GET'\|\|!api\(url\)\)return nativeFetch\(input,init\)/,'writes are never held');
  assert.match(j,/const calling=\(\)=>/,'an active AI call keeps call-shell in charge');
  assert.match(j,/e\.stopImmediatePropagation\(\);if\(st\.cendonTab!==cur\)reveal/,'tab history entries are not fed to nav.js');
  for(const f of ['index','garage']){const h=read(f+'.html'),head=h.slice(0,h.indexOf('</head>'));
    assert.equal(head.indexOf('<script src='),head.indexOf('<script src="/tab-shell.js?v=1">'),f+': first external script')}
  assert.match(read('mobile-ui.js'),/if\(f&&window\.CendonTabs&&CendonTabs\.go\(f\)\)return;/);
  assert.match(read('sw.js'),/'\.\/tab-shell\.js\?v=1'/);
});
