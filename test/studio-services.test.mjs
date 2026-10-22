import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
const home=readFileSync(new URL('../index.html',import.meta.url),'utf8');
const inventory=home.slice(home.indexOf('let GIGS=null;'),home.indexOf('async function loadGigs(){'));
const own=home.slice(home.indexOf('const myGigs='),home.indexOf('async function gigForm('));
function fixture(){
  let reply={gigs:[{id:1,tech:{id:'shop-one'},photos:[7]}],quota:{used:1,limit:2},visibility:'suspended'};
  const calls=[],c={window:{},Date,JSON,Number,Set,T:(_th,en)=>en,GIG_MAX:2,api:async path=>{calls.push(path);return reply}};
  vm.createContext(c);vm.runInContext('let U={uid:"one"},ME={uid:"one",technician:{id:"shop-one"}};'+inventory+own+
    ';this.manager={load:loadOwnGigs,rows:myGigs,state:ownGigState,find:findGig,reset:resetOwnGigs,publicRows:()=>GIGS,setPublic:x=>GIGS=x,switch:uid=>{U={uid};ME={uid,technician:{id:"shop-"+uid}};resetOwnGigs()}};',c);
  return {api:c.manager,c,calls,reply:r=>reply=r};
}

test('owner services use the private authenticated inventory, never the public feed; public refresh cannot erase them',async()=>{
  const f=fixture();f.api.setPublic([]);await f.api.load();assert.equal(f.api.rows().length,1);assert.deepEqual(f.calls,['/api/tech/gigs?mine=1']);
  f.api.setPublic([]);assert.equal(f.api.find(1).id,1);assert.equal(f.api.publicRows().length,0,'private rows never enter the public feed');
  await f.api.load();assert.equal(f.calls.length,1,'same-account requests share a recent successful snapshot');
});

test('offline and malformed responses retain the previous inventory instead of inventing an empty shop',async()=>{
  const f=fixture();await f.api.load();
  for(const d of [null,{}, {gigs:null},{gigs:[{id:0}]},{gigs:[{id:1}],quota:{used:0,limit:2}}]){
    f.reply(d);await assert.rejects(f.api.load(true));assert.equal(f.api.rows().length,1);
  }
});

test('a successful empty response is distinct from a missing response; scope changes cannot reuse another shop',async()=>{
  const f=fixture();await f.api.load();f.api.switch('two');assert.equal(f.api.rows().length,0);assert.equal(f.api.find(1),undefined);
  f.reply({gigs:[],quota:{used:0,limit:2},visibility:'review'});await f.api.load();assert.equal(f.api.rows().length,0);assert.equal(f.api.state().quota.used,0);
});

test('an in-flight previous-account response cannot repopulate inventory after account switch',async()=>{
  const c={window:{},Date,JSON,Number,Set,T:(_th,en)=>en,GIG_MAX:2};let release;
  c.api=()=>new Promise(r=>release=r);vm.createContext(c);
  vm.runInContext('let U={uid:"one"},ME={uid:"one",technician:{id:"shop-one"}};'+inventory+own+';this.load=loadOwnGigs;this.rows=myGigs;this.switch=()=>{U={uid:"two"};ME={uid:"two",technician:{id:"shop-two"}};resetOwnGigs()}',c);
  const old=c.load(),failure=assert.rejects(old,/Account changed/);c.switch();release({gigs:[{id:1}],quota:{used:1,limit:2}});await failure;assert.equal(c.rows().length,0);
});

test('new-service preflight checks the private quota; quota failure is not a malformed-form popup',()=>{
  const form=home.slice(home.indexOf('async function gigForm('),home.indexOf('async function tabPosts(){'));
  assert.match(form,/await loadOwnGigs\(true\)/);assert.match(form,/quota\.used>=quota\.limit/);
  const tab=home.slice(home.indexOf('async function tabPosts(){'),home.indexOf('function railNav(){'));
  assert.match(tab,/mine=await loadOwnGigs\(true\)/);assert.doesNotMatch(tab,/GIGS\s*=/);assert.match(tab,/catch\(e\).*errBar/);
  assert.match(home,/if\(U\?\.uid!==u\?\.uid\)\{resetOwnGigs\(\);resetPublicDirectory\(\)\}/);assert.match(home,/myGigs\(\).*GIGS/);
});

test('owner-only images stay off public image URLs, storage and logs; document kinds remain backend-controlled',()=>{
  const images=readFileSync(new URL('../shop-images.js',import.meta.url),'utf8');
  assert.match(images,/\?owner=1/);assert.match(images,/Authorization:'Bearer '\+token/);assert.match(images,/cache:'no-store'/);
  assert.doesNotMatch(images,/localStorage|sessionStorage|console\./);assert.match(images,/URL\.revokeObjectURL/);assert.match(images,/2500000/);
});
