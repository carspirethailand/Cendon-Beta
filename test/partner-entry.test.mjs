import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
const read=f=>readFileSync(new URL('../'+f,import.meta.url),'utf8');
const home=read('index.html'),settings=read('settings.js');
function card(p){
  const c={me:()=>({uid:'me'}),fbUser:()=>({uid:'me'}),t:a=>a,localStorage:{getItem:()=>JSON.stringify(p)}};vm.createContext(c);
  vm.runInContext(settings.slice(settings.indexOf('function partnerHTML(){'),settings.indexOf('const chev='))+'result=partnerHTML()',c);return c.result;
}
test('unregistered, trial, stale and foreign-account settings cards always point directly to /join',()=>{
  for(const p of [null,{uid:'me',s:'none'},{uid:'me',s:'pending'},{uid:'me',s:'rejected'},{uid:'me',s:'shop'},{uid:'me',s:'shop',registered:false},{uid:'other',s:'shop',registered:true}]){
    const html=card(p);assert.match(html,/href="\/join"/);assert.doesNotMatch(html,/href="\/studio"/);
  }
  assert.match(card({uid:'me',s:'shop',registered:true}),/href="\/studio"/,'only a confirmed shop card enters Studio');
});
test('all app entry points load the public entry before page code and pair the service-worker assets',()=>{
  for(const f of ['index','garage','chat','news','profile','spares','admin','handbook','plan']){
    const html=read(f+'.html');assert.match(html,/href="\/partner-entry\.css\?v=1"/);assert.match(html,/src="\/partner-entry\.js\?v=1"/);assert.ok(html.indexOf('/partner-entry.js')<html.indexOf('</head>'));
  }
  assert.match(read('sw.js'),/CORE\.unshift\('\.\/partner-entry\.js\?v=1','\.\/partner-entry\.css\?v=1'\)/);
});
test('the Home account menu uses the same approved-real-shop check for its label and click, including staff trial shops',()=>{
  const begin=home.indexOf('$("bMe").onclick=()=>{'),end=home.indexOf('/* ═══ มุมมอง',begin),source=home.slice(begin,end);
  for(const technician of [null,{test:true,verified:false},{test:false,verified:false},{test:false,verified:true}]){
    const nodes=Object.fromEntries(['bMe','mJoin','mJobs','mStaff'].map(k=>[k,{}])),actions=[];let html='';
    const c={U:{uid:'me',email:'fixture@example.test'},ME:{staff:true,technician},$:k=>nodes[k],initial:()=>'',esc:s=>String(s||''),decided:()=>false,
      sheet:o=>{html=o.body;o.mount()},closeSheet:()=>{},openStudio:()=>actions.push('studio'),openJoin:()=>actions.push('join')};
    vm.createContext(c);vm.runInContext(source,c);nodes.bMe.onclick();nodes.mJoin.onclick();
    const approved=technician?.verified===true&&technician?.test===false;
    assert.deepEqual(actions,[approved?'studio':'join']);assert.ok(html.includes(approved?'Studio — หน้าร้านของฉัน':'สมัครเป็นช่าง'));
  }
});
test('the real introduction paints before requests and an unverified technician record never enters Studio',async()=>{
  let release;const wait=new Promise(r=>release=r),draws=[],SH={cur:null,stack:[]};let studio=0;
  const c={U:{uid:'me'},ME:{technician:{verified:false,test:false}},SH,window:{},document:{documentElement:{dataset:{boot:'tech'}}},BOOT_TECH:true,location:{search:''},URLSearchParams,
    landing:(_push,pending)=>{const o={pending};SH.cur=o;draws.push(o)},refreshMe:()=>wait,techPolicy:()=>wait,$:()=>({classList:{contains:()=>true}}),openStudio:()=>studio++};
  vm.createContext(c);const begin=home.indexOf('async function openJoin(){'),end=home.indexOf('/* ใบสมัครช่างเป็นขั้น',begin);vm.runInContext(home.slice(begin,end),c);
  const task=vm.runInContext('openJoin()',c);assert.equal(draws[0].pending,true);assert.equal(studio,0);assert.equal(c.BOOT_TECH,false);assert.equal(c.document.documentElement.dataset.boot,undefined);
  release();await task;assert.equal(studio,0);assert.equal(draws.length,2);assert.equal(draws[1].pending,undefined);
});
test('instant entry is display-only; it never fetches, starts Firebase, embeds another app, or submits anything',()=>{
  const source=read('partner-entry.js');assert.doesNotMatch(source,/\bfetch\s*\(|firebase\.auth|createElement\(['"]iframe|\/api\/tech\/apply/);
  assert.match(source,/if\(e\.defaultPrevented\|\|e\.button\|\|e\.metaKey\|\|e\.ctrlKey\|\|e\.shiftKey\|\|e\.altKey\)return/);
  assert.match(source,/a\.hasAttribute\('download'\)/);assert.match(source,/isJoin\(a\.href\)/);
});
