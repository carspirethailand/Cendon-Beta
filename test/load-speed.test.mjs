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

test('instant tabs: only bottom-tab pages are prerendered, never broad link rules',()=>{
  const j=read('instant-nav.js');
  assert.match(j,/const TABS=\['\/','\/garage','\/messages','\/news','\/profile'\]/);
  assert.match(j,/prerender:\[\{urls:list,eagerness:'immediate'\}\]/);
  assert.doesNotMatch(j,/href_matches/,'no "every link" prerender (removed before for side effects)');
  for(const f of ['index','garage','news','profile','spares','chat']){
    const h=read(f+'.html');
    assert.match(h,/<script src="\/instant-nav\.js\?v=1"><\/script>/,f);
    assert.doesNotMatch(h,/"prerender":\[\{"where"/,f+': no broad prerender rules');
    /* ต้องโหลดก่อนสคริปต์อื่นที่เรียกเซิร์ฟเวอร์ */
    assert.ok(h.indexOf('/instant-nav.js')<h.indexOf('launch-gate.js')||h.indexOf('launch-gate.js')<0,f+': loads before other scripts');
  }
  assert.match(read('sw.js'),/'\.\/instant-nav\.js\?v=1'/);
});

test('instant tabs: a prerendered page holds Cendon API calls until the user opens it, and reloads if data changed',()=>{
  const j=read('instant-nav.js');
  assert.match(j,/if\(D\.prerendering\)\{/);
  assert.match(j,/W\.fetch=function\(input,init\)\{\s*if\(!D\.prerendering\|\|!api\(/);
  assert.match(j,/addEventListener\('prerenderingchange',\(\)=>\{\s*W\.fetch=nativeFetch;/);
  assert.match(j,/if\(sig\(\)!==start\)\{location\.reload\(\);return\}/);
  assert.match(j,/else if\(rules\)\{drop\(\);soon\(1500\)\}/,'a change on the visible page drops stale prerenders at once');
  assert.match(j,/mem>=6\?4:mem>=4\?2:0/,'low-memory phones do not prerender');
  assert.match(j,/saveData/);
});
