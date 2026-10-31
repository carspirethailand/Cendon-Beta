import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

const home=readFileSync(new URL('../index.html',import.meta.url),'utf8');
const between=(a,b)=>home.slice(home.indexOf(a),home.indexOf(b,home.indexOf(a)));
function fixture(techs=[],me=null){
  const c={TECHS:techs,ME:me,T:(_th,en)=>en,location:{host:'cendon-beta.pages.dev'},
    googleLive:t=>!!(t.verified&&!t.test&&!t.suspended)};
  vm.createContext(c);
  vm.runInContext(between('const shopPath=t=>','\n',)+'\n'+between('const techByKey=','\n')+'\n'+between('const HANDLE_OK=','function handleSheet(')+';this.shopPath=shopPath;this.techByKey=techByKey;this.ideas=handleIdeas;this.hint=handleHint;this.ok=HANDLE_OK;',c);
  return c;
}

test('shop links use the claimed name, and a shop is found by id or by name in any case',()=>{
  const a={id:'t_aaaaaaaaaaaaaaaa',handle:'nonair'},b={id:'t_bbbbbbbbbbbbbbbb',handle:''};const f=fixture([a,b]);
  assert.equal(f.shopPath(a),'/tech/nonair');assert.equal(f.shopPath(b),'/tech/t_bbbbbbbbbbbbbbbb');
  assert.equal(f.techByKey('nonair'),a);assert.equal(f.techByKey('NonAir'),a);assert.equal(f.techByKey('t_bbbbbbbbbbbbbbbb'),b);assert.equal(f.techByKey('nope'),null);
});

test('name rules match the server, and suggestions only offer valid names',()=>{
  const f=fixture();
  for(const ok of ['nonair','nonair-bangna','a1b'])assert.ok(f.ok.test(ok),ok);
  for(const bad of ['ab','Non','-a','a-','a--b','non_air','นนท์แอร์'])assert.ok(!f.ok.test(bad),bad);
  assert.deepEqual(Array.from(f.ideas({line:'@NonAir',shop:'Non Air Service นนท์แอร์'})),['nonair','non-air-service','nonairservice']);
  assert.deepEqual(Array.from(f.ideas({shop:'นนท์แอร์'})),[],'no fake transliteration of Thai names');
  assert.deepEqual(Array.from(f.ideas({line:'@nonair',handle:'nonair',shop:'x'})),[],'current name is not suggested');
});

test('Studio row tells the truth for each shop state',()=>{
  const f=fixture();
  assert.equal(f.hint({handle:'nonair',verified:true}),'cendon-beta.pages.dev/tech/nonair');
  assert.equal(f.hint({verified:true}),'Not claimed yet — each name goes to one shop');
  assert.equal(f.hint({verified:false,test:true}),'Available once your shop is approved');
});

test('Studio wiring: claim card for unnamed live shops, row, refreshable route, app resolves names',()=>{
  assert.match(home,/googleLive\(t\)&&!t\.handle\?`<button class="hd-cta" type="button" id="sHdCta">/);
  assert.match(home,/\$\{row\("sName","ti-at"/);assert.match(home,/\$\("sName"\)\.onclick=\(\)=>handleSheet\(\)/);
  assert.match(home,/\["settings","stats","edit","post","qr","google","name","design"\]\.includes\(p\.k\)/);
  assert.match(home,/api\("\/api\/tech\/handle\/"\+encodeURIComponent\(k\.toLowerCase\(\)\)\)/,'old names resolve in the app too');
  assert.match(home,/api\("\/api\/tech\/handle",\{body:\{handle:h\}\}\)/);
  for(const l of ['zh','ja','ko','id','vi','ms','de','fr','es','pt']){
    const pack=readFileSync(new URL(`../i18n/home-${l}.js`,import.meta.url),'utf8');
    for(const k of ['Shop link name','Claim this name','Another shop already has this name','Claim your shop link name first'])assert.ok(pack.includes(JSON.stringify(k)+':'),l+': '+k);
  }
});
