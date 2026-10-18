/* นับถอยหลังเปิดตัว · แผนที่ช่างกำลังมา 3 มิติ · three.js ในแอป · หน้าตั้งค่าทั้งหมดในแผงควบคุม */
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import vm from 'node:vm';
const root=new URL('../',import.meta.url);
const read=f=>readFileSync(new URL(f,root),'utf8');
const html=read('index.html'),admin=read('admin.html'),gate=read('launch-gate.js');

/* รันประตูเปิดตัวในเครื่องจำลอง: คืนว่าถูกส่งไปไหน + คลาสบนหน้า */
function gateRun({path='/',search='',cfg,staff=false,session={}}={}){
  const store={};if(cfg)store.cendon_cfg=JSON.stringify(cfg);if(staff)store.cendon_staff='1';
  const cls=new Set(),H={style:{},classList:{add:c=>cls.add(c),remove:c=>cls.delete(c),contains:c=>cls.has(c)},firstChild:null,insertBefore(){},appendChild(){}};
  let to=null,fetched=0;
  const W={location:{pathname:path,search,replace:u=>{to=u}},matchMedia:()=>({matches:false}),
    localStorage:{getItem:k=>k in store?store[k]:null,setItem:(k,v)=>{store[k]=String(v)},removeItem:k=>{delete store[k]}},
    sessionStorage:{getItem:k=>k in session?session[k]:null,removeItem:k=>{delete session[k]}}};
  const D={documentElement:H,readyState:'loading',addEventListener(){},createElement:()=>({style:{},setAttribute(){},appendChild(){}}),body:{appendChild(){}}};
  vm.runInNewContext(gate,{window:W,document:D,fetch:()=>{fetched++;return new Promise(()=>{})},setTimeout:()=>0,URLSearchParams,JSON,Date,Math});
  return {to,cls,H,W,fetched,store};
}
const soon={launch:{enabled:true,at:Date.now()+864e5,title:'',message:'',join:true},features:{},skew:0,got:Date.now()};
const over={...soon,launch:{...soon.launch,at:Date.now()-6e4}};

test('countdown gate: the public goes to /launch; staff, shared links, sign-in for joining and public pages pass',()=>{
  assert.equal(gateRun({cfg:soon}).to,'/launch');
  assert.equal(gateRun({cfg:soon,path:'/garage'}).to,'/launch');
  assert.equal(gateRun({cfg:soon,staff:true}).to,null,'staff use the app as normal');
  assert.equal(gateRun({cfg:soon,search:'?staff=1'}).to,null,'staff on a new device: the app checks them itself');
  for(const p of ['/trip/abc','/passport/x','/about','/privacy','/help','/terms','/tech/shop-1','/launch'])assert.equal(gateRun({cfg:soon,path:p}).to,null,p);
  /* /join = จองสิทธิ์เป็นช่าง: เห็นแค่ใบสมัคร */
  const j=gateRun({cfg:soon,path:'/join'});assert.equal(j.to,null);assert.ok(j.cls.has('prejoin'));
  assert.ok(!gateRun({cfg:soon,path:'/join',staff:true}).cls.has('prejoin'),'staff see the normal app behind the form');
  /* หน้าเข้าสู่ระบบ: ไปต่อเฉพาะคนที่จะจองสิทธิ์/ทีมงาน · คนที่ถูกส่งมาจากหน้าแอป → นับถอยหลัง */
  assert.equal(gateRun({cfg:soon,path:'/login',search:'?next=%2F'}).to,'/launch');
  assert.equal(gateRun({cfg:soon,path:'/login'}).to,'/launch');
  assert.equal(gateRun({cfg:soon,path:'/login',search:'?next=%2Fjoin'}).to,null);
  assert.equal(gateRun({cfg:soon,path:'/login',search:'?next=%2F%3Fstaff%3D1'}).to,null);
  /* เวลาผ่านไปแล้ว หรือปิดอยู่ = แอปเปิดตามปกติ */
  assert.equal(gateRun({cfg:over}).to,null);
  assert.equal(gateRun({cfg:{...soon,launch:{...soon.launch,enabled:false}}}).to,null);
});

test('countdown gate: a device that never saw the setting hides the page briefly and asks the server; fresh values are not re-fetched',()=>{
  const g=gateRun();assert.equal(g.to,null);assert.equal(g.H.style.visibility,'hidden');assert.equal(g.fetched,1);
  assert.equal(gateRun({cfg:{...over,got:Date.now()}}).fetched,0,'fresh cache (<2 min) is trusted');
  assert.equal(gateRun({cfg:{...over,got:Date.now()-3e5}}).fetched,1,'older cache refreshes in the background');
  /* เวลาอิงนาฬิกาหลังบ้าน: เครื่องเดินช้าไป 2 ชม. แต่หลังบ้านบอกว่าเลยเวลาแล้ว */
  assert.equal(gateRun({cfg:{...soon,launch:{...soon.launch,at:Date.now()+36e5},skew:72e5}}).to,null);
});

test('countdown gate: arriving from the countdown page plays the cloud reveal once',()=>{
  const s={cendon_cloud_in:'1'},g=gateRun({session:s});
  assert.ok(g.cls.has('cloud-in'));assert.equal(s.cendon_cloud_in,undefined,'flag is consumed');
  assert.ok(!gateRun().cls.has('cloud-in'));
});

test('every app page loads the countdown gate before the sign-in gate; the app tells it who is staff',()=>{
  for(const f of ['index.html','chat.html','garage.html','news.html','profile.html','spares.html','plan.html']){
    const s=read(f),g=s.indexOf('/launch-gate.js'),a=s.indexOf('/auth-gate.js');
    assert.ok(g>0&&g<a,f);
  }
  assert.ok(read('login.html').includes('/launch-gate.js'));
  assert.match(html,/CendonLaunch\.staff\(!!\(ME\.staff\|\|ME\.owner\)\)/);
  /* ปิดใบสมัครในโหมดจองสิทธิ์ = กลับหน้านับถอยหลัง */
  assert.match(html,/classList\.contains\("prejoin"\)\)location\.replace\("\/launch"\)/);
  assert.match(read('sw.js'),/'\.\/launch-gate\.js\?v=1'/);
});

test('countdown page: server time, owner text, join link, staff entry, fly into the clouds, no WebGL fallback',()=>{
  const p=read('launch.html'),j=read('launch.js');
  assert.match(p,/<meta name="robots" content="noindex">/);
  assert.match(p,/id="join" href="\/login\?next=%2Fjoin"/);
  assert.match(p,/href="\/login\?next=%2F%3Fstaff%3D1"/,'staff sign-in link');
  assert.match(p,/line\.me\/R\/ti\/p\/%40988omovg/);
  assert.match(j,/skew=j\.now\?j\.now-Math\.round/,'countdown uses the server clock');
  assert.match(j,/if\(L\.title\)\$\('title'\)\.textContent=L\.title/,'owner title is text, not HTML');
  assert.doesNotMatch(j,/innerHTML/);
  assert.match(j,/sessionStorage\.setItem\('cendon_cloud_in','1'\)/);
  assert.match(j,/auto=Math\.min\(1,auto\+dt\/4\.2\)/,'never stalls: flies in by itself');
  assert.match(j,/if\(!G\)\{/,'works without WebGL');
  assert.match(read('_headers'),/\/launch\n  X-Robots-Tag: noindex/);
});

test('three.js and MapLibre are self-hosted with licences; the logo is the real brand path',()=>{
  for(const f of ['three-0.160.0.module.min.js','three-svgloader-0.160.0.js','maplibre-gl-4.7.1.js','maplibre-gl-4.7.1.css','LICENSE-three.txt','LICENSE-maplibre.txt'])assert.ok(existsSync(new URL('vendor/'+f,root)),f);
  assert.doesNotMatch(read('vendor/three-0.160.0.module.min.js'),/^import /m);
  assert.match(read('vendor/three-svgloader-0.160.0.js'),/from '\.\/three-0\.160\.0\.module\.min\.js'/);
  assert.doesNotMatch(read('vendor/maplibre-gl-4.7.1.js'),/sourceMappingURL/);
  assert.match(read('_headers'),/\/vendor\/\*\n  Cache-Control: public, max-age=31536000, immutable/);
  const logo=read('site/brand/logo-path.txt').trim();
  assert.ok(read('fx3d.js').includes(`export const LOGO='${logo}'`));
  assert.match(read('launch.js'),/from '\.\/fx3d\.js'/);
});

test('live map: tries the 3D map first, falls back to the flat map, frees the GPU, and updates faster',()=>{
  const l=read('live3d.js');
  assert.match(html,/import\("\/live3d\.js\?v=1"\)/);
  assert.match(html,/console\.warn\("live3d",e&&e\.message\)\}\s*try\{flat\(\)/,'any 3D failure → Leaflet');
  assert.match(html,/features\|\|\{\}\)\.map3d===false/,'staff can switch 3D off for everyone');
  assert.match(html,/const stop=\(\)=>\{st\.alive=false;clearTimeout\(st\.t\);if\(st\.d3\)\{st\.d3\.destroy\(\);st\.d3=null\}\}/);
  assert.match(html,/LIVE_STOP\.adopt\(lb\)/,'a redrawn job keeps the same map');
  assert.match(html,/Date\.now\(\)-this\.last<4000/,'mechanic sends every ~4 s');
  assert.match(html,/every:mine\?4000:3000/,'customer polls every ~3 s');
  assert.match(l,/if\(!supported\(\)\)throw Error\('webgl'\)/);
  assert.match(l,/cooperativeGestures:true/,'one finger still scrolls the page');
  assert.match(l,/AttributionControl\(\{compact:true\}\)/);
  assert.match(l,/STYLE='https:\/\/tiles\.openfreemap\.org\/styles\/liberty'/);
  assert.match(l,/return rasterStyle\(P,dark\)/,'OpenFreeMap down → OSM raster');
  assert.match(l,/new IntersectionObserver/,'stops drawing when scrolled away');
  assert.match(l,/try\{renderer&&renderer\.dispose\(\)\}catch\(e\)\{\}try\{map\.remove\(\)\}/);
  /* เส้นที่ช่างวิ่งผ่านอยู่ในหน้าจอนี้เท่านั้น ไม่ส่งไปไหน */
  assert.doesNotMatch(l,/fetch\([^)]*trail|localStorage/);
});

test('three.js touches: partner card on the home page, luxury join page, all pause off-screen and respect reduced motion',()=>{
  const fx=read('fx3d.js');
  assert.match(html,/<div class="lx-partner" id="hPartner"><\/div>/);
  assert.match(html,/function drawPartner\(\)/);
  assert.match(html,/k==="shop"\?openStudio\(\):openJoin\(\)/);
  assert.match(html,/<div class="jx-hero"><canvas class="jx-gl" id="jxGl"/);
  assert.match(html,/fx3d\(\$\("jxGl"\)\)/);
  assert.match(fx,/prefers-reduced-motion: reduce/);
  assert.match(fx,/new IntersectionObserver/);
  assert.match(fx,/if\(!cv\.isConnected\)return fx\.stop\(\)/);
  assert.match(fx,/R\.dispose\(\);R\.forceContextLoss\(\)/);
});

test('admin settings hub: one page for everything, launch countdown is owner-only, 3D map can be switched off',()=>{
  assert.match(admin,/<h1>ตั้งค่าทั้งหมด<\/h1>/);
  for(const id of ['cfg-launch','cfg-ann','cfg-maint','cfg-quota','cfg-feat','cfg-line','cfg-linemenu','cfg-seo','cfg-export'])assert.match(admin,new RegExp(`id="${id}"`),id);
  assert.match(admin,/const owner=me&&me\.role==="owner"/);
  assert.match(admin,/\["lcOn","lcJoin","lcTitle","lcMsg","lcDate","lcTime","lcSave"\]\.forEach\(k=>\$\(k\)\.disabled=!owner\)/);
  assert.match(admin,/const body=\{launch:\{enabled:on,at:Number\.isFinite\(at\)\?at:0/);
  assert.match(admin,/\{k:"map3d"/);
  assert.match(admin,/\.lc-lock\[hidden\]\{display:none\}/);
});

test('profile pictures have no coloured glow underneath anywhere',()=>{
  assert.match(html,/\.av\.sq,\.thumb\.sq\{box-shadow:inset 0 1px 0 rgba\(255,255,255,\.3\),0 0 0 1px rgba\(0,0,0,\.06\)\}/);
  assert.doesNotMatch(html,/\.so-av\{[^}]*rgba\(0,0,0,\.5\)/);
  assert.match(html,/\.lx-pav\{[^}]*box-shadow:none\}/);
  assert.match(read('chat.html'),/\.msg\.ai \.av\{background:var\(--c-grad\);box-shadow:none\}/);
});
