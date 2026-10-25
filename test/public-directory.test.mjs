import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
const home=readFileSync(new URL('../index.html',import.meta.url),'utf8');
const part=(a,b)=>home.slice(home.indexOf(a),home.indexOf(b,home.indexOf(a)));
function fixture(){
  let response={techs:[{id:'public'}],gigs:[{id:1,tech:{id:'public'}}]},handler=async()=>response;
  const calls=[],c={window:{},document:{hidden:false,addEventListener(){}},Date,JSON,Number,Set,T:(_th,en)=>en,addEventListener(){},setInterval(){},setTimeout:f=>{queueMicrotask(f);return 1},clearTimeout(){},GIG_MAX:2,
    drawHome(){},drawCat(){},render(){},renderUsed(){},diag(){},ccDone(){},READY:{gigs:{done(){}},techs:{done(){}}},api:path=>{calls.push(path);return handler(path)}};
  vm.createContext(c);vm.runInContext('let U=null,ME=null,TECHS=[],LOADED=false,SERVER=null;'+part('function roamPos(t){','/* แผนที่เปิดอยู่')+part('let GIGS=null;','function myCarText(){')+part('async function load(){','/* ปิดหน้าโหลด:')+
    ';this.manager={load,loadGigs,notice:ownServiceNotice,switch:uid=>{U=uid?{uid}:null;resetPublicDirectory()},shop:t=>ME={technician:t},state:()=>({gigs:GIGS,techs:TECHS,error:GIG_ERR,server:SERVER,loaded:LOADED})}',c);
  return {api:c.manager,calls,reply:r=>response=r,handler:f=>handler=f};
}

test('directory refresh always refreshes shops and services together after approval or editing',async()=>{
  const f=fixture();await f.api.load();f.reply({techs:[{id:'now-public'}],gigs:[{id:2,tech:{id:'now-public'}}]});await f.api.load();
  assert.equal(f.api.state().gigs[0].id,2);assert.equal(f.api.state().techs[0].id,'now-public');assert.equal(f.calls.filter(p=>p==='/api/tech/gigs').length,2);
});

test('failed or malformed services refresh is retryable, not an empty inventory',async()=>{
  const f=fixture();await f.api.load();for(const bad of [null,{}, {gigs:null}]){f.reply(bad);await f.api.loadGigs();assert.equal(f.api.state().gigs[0].id,1);assert.ok(f.api.state().error)}
  const first=fixture();first.handler(async()=>{throw Error('offline')});await first.api.load();assert.equal(first.api.state().gigs,null);assert.ok(first.api.state().error);assert.equal(first.api.state().server,false);
  first.reply({techs:[],gigs:[]});first.handler(async()=>({techs:[],gigs:[]}));await first.api.load();assert.equal(first.api.state().error,'');assert.equal(first.api.state().gigs.length,0);
});

test('account changes immediately clear staff-only directory results and ignore late previous-account responses',async()=>{
  const f=fixture();await f.api.load();f.api.switch('staff');let release;f.handler(()=>new Promise(r=>release=r));const old=f.api.loadGigs();
  f.api.switch('customer');assert.equal(f.api.state().gigs,null);assert.equal(f.api.state().techs.length,0);
  release({gigs:[{id:99,tech:{test:true}}]});await old;assert.equal(f.api.state().gigs,null);
});

test('concurrent directory refreshes share work without preserving a previous-account request',async()=>{
  const f=fixture();let pending=[];f.handler(()=>new Promise(r=>pending.push(r)));
  const a=f.api.load(),b=f.api.load();assert.equal(pending.length,2,'one shops request and one services request');pending.forEach(r=>r({techs:[],gigs:[]}));await Promise.all([a,b]);
  assert.equal(f.calls.length,2);assert.equal(f.api.state().loaded,true);
});

test('owner visibility notice explains every blocker without implying data loss or automatic approval',()=>{
  const f=fixture();f.api.shop({test:true,suspended:true,verified:false});let notice=f.api.notice();assert.match(notice,/suspended/);assert.match(notice,/trial shop/);assert.match(notice,/saved/);
  f.api.shop({test:false,suspended:false,verified:true});assert.equal(f.api.notice(),'');
  assert.match(home,/resetOwnGigs\(\);resetPublicDirectory\(\)/);assert.match(home,/const paintKey=JSON.stringify\(\[k,!!p\?\.suspended,!!p\?\.test,mine\]\)/);
});
