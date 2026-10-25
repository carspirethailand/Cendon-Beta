import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

const home=readFileSync(new URL('../index.html',import.meta.url),'utf8');
const part=home.slice(home.indexOf('function googleChecks('),home.indexOf('function googleSheet('));
function fixture({owner=false,gigs}={}){
  const c={ME:{owner},T:(_th,en)=>en,ownGigState:()=>gigs===undefined?null:{rows:gigs}};
  vm.createContext(c);vm.runInContext(part+';this.checks=googleChecks;this.hint=googleHint;this.live=googleLive;',c);return c;
}
const FULL={id:'t1',shop:'Non Air',avatar:5,photos:[5,6,7,8],about:'x'.repeat(60),week:Array.from({length:7},(_,i)=>({on:i<6,open:'08:00',close:'18:00'})),brands2:['Toyota'],verified:true,test:false};

test('Google storefront checklist counts only what the public page really uses',()=>{
  const f=fixture({gigs:[{price:900}]});
  assert.deepEqual(Array.from(f.checks(FULL,[{price:900}]),x=>x.ok),[true,true,true,true,true,true,true]);
  const thin={...FULL,avatar:null,photos:[6,7],about:'short',week:null,brands2:[]},c=f.checks(thin,[{price:0}]);
  assert.deepEqual(Array.from(c,x=>x.ok),[true,false,false,false,false,false,false]);
  assert.equal(f.hint(thin),'Complete 2/7 · See what\'s missing','name + priced service from the loaded inventory');
  assert.equal(fixture({gigs:[]}).hint(thin),'Complete 1/7 · See what\'s missing');
  /* โหลดบริการไม่ได้ = ยังไม่รู้ ไม่ใช่ "ไม่มีบริการ" */
  assert.equal(f.checks(FULL,null)[5].ok,null);
  assert.equal(fixture().hint(FULL),'See how easily customers can find you');
});

test('team-reviewed fields are not sent to an edit form that cannot save them',()=>{
  const real=fixture().checks({...FULL,photos:[],about:''},[]);
  assert.equal(real[2].fix,'team');assert.equal(real[3].fix,'team');
  const trial=fixture().checks({...FULL,test:true,photos:[],about:''},[]);
  assert.equal(trial[2].fix,'edit');assert.equal(trial[3].fix,'edit');
  assert.equal(fixture({owner:true}).checks({...FULL,photos:[]},[])[2].fix,'edit','system owner can edit everything');
});

test('only approved, real, open shops are said to be on Google',()=>{
  const f=fixture({gigs:[]});
  assert.equal(f.live(FULL),true);
  assert.equal(f.live({...FULL,test:true}),false);assert.equal(f.hint({...FULL,test:true}),"Trial shops aren't on Google");
  assert.equal(f.live({...FULL,verified:false}),false);assert.equal(f.hint({...FULL,verified:false}),'On Google once approved');
  assert.equal(f.live({...FULL,suspended:true}),false);assert.equal(f.hint({...FULL,suspended:true}),'Shop paused — not on Google yet');
});

test('Studio wires the checklist, the owner preview and every new string has translations',()=>{
  assert.match(home,/\$\{row\("sGoogle","ti-brand-google"/);assert.match(home,/\$\("sGoogle"\)\.onclick=\(\)=>googleSheet\(\)/);
  assert.match(home,/window\.open\(link\+"\?preview=1","_blank","noopener"\)/);
  const sheet=home.slice(home.indexOf('/* ── หน้าร้านบน Google ──'),home.indexOf('function openShopEdit(t0){'));
  const en=[...sheet.matchAll(/T\("(?:[^"\\]|\\.)*","((?:[^"\\]|\\.)*)"\)/g)].map(m=>JSON.parse('"'+m[1]+'"'));
  for(const l of ['zh','ja','ko','id','vi','ms','de','fr','es','pt']){
    const pack=readFileSync(new URL(`../i18n/home-${l}.js`,import.meta.url),'utf8');
    for(const k of en)assert.ok(pack.includes(JSON.stringify(k)+':'),`${l}: ${k}`);
  }
});
