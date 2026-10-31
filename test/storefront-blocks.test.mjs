/* หน้าร้านแบบจัดเอง: ร้านเดิมไม่เปลี่ยน · การ์ดวาดจากข้อมูลจริง · ข้อความช่างถูก escape · ส่วนที่ล็อกไว้อยู่ครบ
   ตัวแต่งหน้าร้าน: ร่างเก็บต่อบัญชี+ร้าน · บันทึกไม่สำเร็จร่างไม่หาย · หลังบ้านเก่าไม่ถูกเข้าใจผิดว่าบันทึกแล้ว */
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import vm from 'node:vm';
const read=f=>readFileSync(new URL('../'+f,import.meta.url),'utf8').replace(/\r\n/g,'\n');
const home=read('index.html'),scene=read('shop-scene.js');
const part=(a,b)=>{const i=home.indexOf(a);assert.ok(i>=0,a);const j=home.indexOf(b,i);assert.ok(j>i,b);return home.slice(i,j)};
const chunk=part('const SB_TYPES={','/* ── ฉากหน้าร้าน 3 มิติ (shop-scene.js) ──');
const sky=part('const nowH=','const skyDark='),frame=part('function sbFrame(','async function storeEditor(){');
function sandbox(){
  const ctx={T:(th)=>th,esc:s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])),
    img:id=>'/api/tech/img/'+id,thColor:()=>'#2f6fb5',LOGO:'M0 0',dnOf:i=>'d'+i,Date};
  vm.createContext(ctx);vm.runInContext(chunk+'\n'+sky+'\n'+frame+';this.storeBlocksHTML=storeBlocksHTML;this.storePage=storePage;this.sbHTML=sbHTML;',ctx);return ctx;
}
const P={pv:'<p class="so-pv">PV</p>',head:'<header class="so-id">HEAD</header>',idrest:'<p>VET</p>',svc:'<section id="soSvc">SVC</section>',rev:'<section id="soRev">REV</section>',
  work:'<section class="so-sec" id="soWork" hidden>WORK</section>',about:'ABOUT',care:'<section class="so-care">CARE</section>',rep:'<button data-report>REP</button>',ser:'<p class="so-ser">SER</p>'};
const X={cover:null,pics:[],svc:[],info:[],weekRows:'',on:null,facts:[],cats:[],rate:''};
const shop=(blocks,extra={})=>({id:'s1',shop:'อู่ทดสอบ',page:blocks&&{v:1,blocks},...extra});

test('storefront: shops without a saved layout keep the classic page, in the classic order',()=>{
  const f=part('function storeHTML(t,mine,o){','/* แถบล่างของหน้าร้าน');
  assert.match(f,/if\(storePage\(t\)\)return storeBlocksHTML\(t,mine,P,\{cover,pics,svc,info,weekRows,on,facts,cats,rate\},o\);/);
  const classic=f.slice(f.indexOf('if(storePage(t))'));
  const order=['P.pv','P.cover','P.head','P.idrest','P.svc','P.rev','P.work','P.about','P.care','P.rep','P.ser'].map(k=>classic.indexOf('${'+k+'}'));
  assert.ok(order.every((v,i)=>v>0&&(!i||v>order[i-1])),'classic sections stay in their original order');
  const c=sandbox();assert.equal(c.storePage(shop(null)),null);assert.equal(c.storePage(shop([])),null,'an empty layout is the classic page');
});

test('storefront: cards follow the mechanic order; the identity, safety notes and report link are always present',()=>{
  const c=sandbox(),h=c.storeBlocksHTML(shop([{id:'b',type:'banner',style:'card',props:{title:'โปร',grad:'ocean'}},{id:'r',type:'reviews',style:'gradient'},{id:'v',type:'services',style:'full'},{id:'x',type:'script'},{id:'b2',type:'banner',props:{title:'ท้าย'}}]),false,P,X);
  const at=s=>h.indexOf(s);
  assert.ok(at('sb-t-banner')<at('HEAD'),'hero cards sit above the shop name');
  assert.ok(at('HEAD')<at('REV')&&at('REV')<at('SVC')&&at('SVC')<at('ท้าย'),'other cards (even a later banner) follow the saved order after the shop name');
  assert.ok(at('SVC')<at('CARE')&&at('CARE')<at('REP')&&at('REP')<at('SER'),'before-you-hire, report and shop id close every storefront');
  assert.match(h,/VET/);assert.doesNotMatch(h,/script/,'unknown card types are ignored');
  assert.match(h,/sb sb-gradient sb-t-reviews/);assert.match(h,/sb sb-full sb-t-services/);
});

test('storefront: mechanic-typed text is escaped and colours/styles fall back to safe choices',()=>{
  const c=sandbox(),evil='<img src=x onerror=alert(1)>';
  const h=c.storeBlocksHTML(shop([{id:'t"><b>',type:'text',style:'weird',props:{title:evil,body:evil}},{id:'b',type:'banner',props:{title:evil,grad:'url(x)'}},{id:'s',type:'scene',style:'full',props:{sign:evil}}]),false,P,X);
  assert.doesNotMatch(h,/<img src=x/);assert.match(h,/&lt;img src=x onerror=alert\(1\)&gt;/);
  assert.doesNotMatch(h,/data-b="t"><b>/,'block ids are escaped too');
  assert.match(h,/--g1:#ff8a4c;--g2:#e2477c/,'unknown gradients use the default');assert.match(h,/sb sb-card sb-t-text/,'unknown styles use the first allowed style');
});

test('storefront: empty cards are hidden from customers and explained to the owner in the editor',()=>{
  const c=sandbox(),blocks=[{id:'c',type:'cover',style:'full'},{id:'p',type:'photos'},{id:'h',type:'hours'},{id:'st',type:'stats'},{id:'w',type:'work'}];
  const cust=c.storeBlocksHTML(shop(blocks),false,P,X);
  assert.doesNotMatch(cust,/sb-empty/);assert.doesNotMatch(cust,/sb-t-(cover|photos|hours|stats)/);
  assert.match(cust,/<section class="sb sb-card sb-t-work" data-b="w" hidden>/,'proof clips stay hidden until real clips load');
  assert.doesNotMatch(cust,/top0/,'no edge-to-edge top when the hero card has nothing to show');
  const ed=c.storeBlocksHTML(shop(blocks),true,P,X,{edit:true});
  assert.equal((ed.match(/class="sb-empty/g)||[]).length,5);assert.doesNotMatch(ed,/data-b="w" hidden/);
  const real=c.storeBlocksHTML(shop([{id:'st',type:'stats'}],{jobs:12,reviewCount:3,rating:4.67}),false,P,X);
  assert.match(real,/<b>12<\/b>/);assert.match(real,/4\.7★/);assert.doesNotMatch(real,/ปีประสบการณ์/,'only numbers the shop really has');
});

test('storefront: a full-width scene or cover on top behaves like the classic cover',()=>{
  const c=sandbox(),h=c.storeBlocksHTML(shop([{id:'s',type:'scene',style:'full',props:{sign:'ป้าย',signColor:'#2f6fb5'}}]),false,P,X);
  assert.match(h,/class="so so-pg top0"/);assert.match(h,/class="sb-id has-cover"/);
  assert.match(h,/data-scene="s"/);assert.match(h,/<canvas aria-hidden="true"><\/canvas>/);assert.match(h,/class="sb-fb" role="img"/,'a flat sign is shown before (or instead of) the 3D scene');
  const card=c.storeBlocksHTML(shop([{id:'s',type:'scene',style:'card'}]),false,P,X);assert.doesNotMatch(card,/top0|has-cover/);
});

test('storefront editor: drafts are per account and shop, kept on failure, cleared only after a confirmed save',()=>{
  const ed=part('async function storeEditor(){','/* คลังการ์ด');
  assert.match(home,/const sbDraftKey=t=>"spire_store_draft:"\+\(U&&U\.uid\|\|""\)\+":"\+t\.id;/);
  assert.match(ed,/try\{await loadOwnGigs\(\)\}catch\(e\)\{toast\(e\.message,"ti-alert-triangle"\);return\}/,'services must load before the editor shows them (never "no services" by mistake)');
  const save=ed.slice(ed.indexOf('async function save('),ed.indexOf('async function reset('));
  assert.match(save,/api\("\/api\/tech\/shop",\{body:\{page:\{v:1,blocks:ED\.blocks\}\}\}\)/);
  assert.match(save,/if\(!r\|\|!\("page" in r\)\)throw new Error/,'an old backend that ignores the layout is not reported as saved');
  assert.ok(save.indexOf('throw new Error')<save.indexOf('localStorage.removeItem(sbDraftKey(t0))'),'the draft is removed only after the server confirms');
  assert.match(ed,/localStorage\.setItem\(sbDraftKey\(t0\)/);
  assert.match(home,/test:p=>\[[^\]]*"design"[^\]]*\]\.includes\(p\.k\)[^\n]*design:storeEditor/,'/studio/design reopens the editor');
});

test('3D shopfront: loaded lazily, skipped on save-data and low-end devices, every scene disposed',()=>{
  assert.match(home,/const SCENE_URL="\/shop-scene\.js\?v=1"/);assert.ok(existsSync(new URL('../shop-scene.js',import.meta.url)));
  assert.match(scene,/^import \* as THREE from '\.\/vendor\/three-0\.160\.0\.module\.min\.js';$/m);
  const ok=part('function sceneOk(){','const sceneLoad=');
  assert.match(ok,/saveData\)return false/);assert.match(ok,/hardwareConcurrency\|\|8\)<=4\|\|\(navigator\.deviceMemory\|\|8\)<=3\)return false/);
  const ctl=part('function shopScene(cv,opts){','/* ฉากบนหน้าร้าน');
  assert.match(ctl,/IntersectionObserver/);assert.match(ctl,/requestIdleCallback/);assert.match(ctl,/CendonView\.visible/);assert.match(ctl,/if\(!c\.cv\.isConnected\)c\.dispose\(\)/,'scenes removed from the page are cleaned up');
  assert.match(home,/SH\.onClose=\(\)=>\{list\.forEach\(c=>c\.dispose\(\)\)/,'closing a storefront releases its scene');
  assert.match(scene,/R\.forceContextLoss\(\)/);assert.match(scene,/prefers-reduced-motion: reduce/);
  const logo=read('site/brand/logo-path.txt').trim();assert.ok(scene.includes(`const LOGO = '${logo}'`),'the sign uses the real brand path');
  assert.doesNotMatch(scene,/fetch\(|localStorage|getIdToken|Authorization/,'the scene never touches the network, storage or tokens');
});

test('Studio sky strip: decorative only, pauses under sheets, never pushes the work list down',()=>{
  assert.match(home,/<div class="stu-sky" id="stuSky" aria-hidden="true"><canvas id="stuSkyCv"><\/canvas><\/div>/);
  assert.match(home,/\.stu-sky\{position:absolute;z-index:0;[^}]*pointer-events:none/);
  assert.match(home,/STU_SKY=shopScene\(\$\("stuSkyCv"\),\{view:"strip",intro:false,shadows:false,dprMax:1\.5,fps:15,/);
  assert.match(home,/STU_SKY\.call\("pause",\$\("bs"\)\.classList\.contains\("on"\)\)/);
  assert.match(part('function stuChrome(){','/* ป้ายนับแยกตามเมนู'),/stuBadges\(\);stuSky\(\);/);
});
