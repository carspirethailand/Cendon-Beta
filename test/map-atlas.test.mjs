import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import vm from 'node:vm';

const read=f=>readFileSync(new URL('../'+f,import.meta.url),'utf8').replace(/\r\n/g,'\n');
const home=read('index.html'),atlas=read('map-atlas.js'),css=read('map-atlas.css');

test('map page loads the new map first and keeps the old Leaflet map as the fallback',()=>{
  assert.match(home,/<div class="atl-host" id="atlas" hidden><\/div>\n<\/section>/,'host lives inside the map view');
  assert.match(home,/const M=await import\("\/map-atlas\.js\?v=3"\);if\(!M\.supported\(\)\)throw Error\("webgl"\)/);
  assert.match(home,/catch\(e\)\{console\.warn\("atlas",e&&e\.message\);ATLAS_OFF=true;[^\n]*if\(VIEW==="map"\)oldMap\(\)\}/,'failure falls back to the old map');
  assert.match(home,/function oldMap\(\)\{if\(!MAP\)initMap\(\);else\{MAP\.invalidateSize\(\);drawPins\(true\)\}renderCarousel\(\)\}/);
  assert.match(home,/if\(v==="map"\)\{\n    document\.documentElement\.style\.setProperty\("--mtop",\$\("top"\)\.offsetHeight\+"px"\);\n    showMap\(\);/);
  assert.match(home,/if\(ATLAS\|\|ATLAS_P&&!ATLAS_OFF\)\{ATLAS&&ATLAS\.refresh\(\);return\}/,'shop list refresh redraws the new map, not the old carousel');
  assert.match(home,/if\(ATLAS&&VIEW==="map"\)ATLAS\.refresh\(\);/,'job updates reach the live pill');
  assert.match(home,/#vMap\.atl-on>#map,#vMap\.atl-on>\.mapback,#vMap\.atl-on>\.mfilt,#vMap\.atl-on>\.locate,#vMap\.atl-on>\.carousel\{display:none\}/);
  assert.match(home,/body\.onmap\.atl-map #mnav\{display:none\}/,'full-screen map hides the bottom tab bar');
});

test('the map only acts through the page\'s real flows',()=>{
  const api=home.slice(home.indexOf('function atlasApi(){'),home.indexOf('let MAP=null'));
  for(const [k,fn] of [['openTech','openTech(id)'],['book','book(t)'],['message','messageTech(t)'],['urgent','urgentCall()'],['post','Nav.go("/post")'],['ai','aiDiag(q)'],['openJob','openJob(id,true)'],['back','setView("menu")'],['shown','shown(o)'],['locate','locate()']])
    assert.ok(api.includes(`${k}:`)&&api.includes(fn),k+' → '+fn);
  assert.match(api,/parked:\(\)=>\{const cars=ls\.get\("spire_garage",\[\]\)\|\|\[\],c=cars\.find\(x=>x&&x\.id===ls\.get\("spire_selCar",""\)\)\|\|cars\[0\];return ls\.get\("spire_park_"\+\(c&&c\.id\|\|"none"\),null\)\}/,'parking spot is read from the garage\'s own key');
  assert.match(api,/jobs:\(\)=>JOBS_OK\?JOBS:\[\]/);
});

test('privacy: the map module calls no API and never sends location or the parking spot anywhere',()=>{
  assert.doesNotMatch(atlas,/\/api\//,'no backend calls from the map file');
  const fetches=[...atlas.matchAll(/fetch\(([^,)]+)/g)].map(m=>m[1]);
  assert.deepEqual(fetches,['STYLE'],'only the public map style is fetched');
  assert.match(atlas,/const ML='\/vendor\/maplibre-gl-4\.7\.1',STYLE='https:\/\/tiles\.openfreemap\.org\/styles\/liberty'/);
  assert.match(atlas,/tiles:\['https:\/\/tile\.openstreetmap\.org\/\{z\}\/\{x\}\/\{y\}\.png'\]/,'raster fallback when the style cannot load');
  assert.match(atlas,/LS\.set\('spire_mapLayers',LAY\)/,'only layer choices are remembered locally');
  assert.doesNotMatch(atlas,/LS\.set\('spire_park/,'the map never writes the parking spot');
});

test('urgent mode uses the same rules as the urgent call itself: no paused or full shops, shops taking jobs now first',()=>{
  const u=atlas.slice(atlas.indexOf('function urgentList(){'),atlas.indexOf('/* ── ตัวกรอง ── */'));
  assert.match(u,/TS=A\.techs\(\)\.filter\(t=>!A\.isMine\(t\)&&!t\.full&&!t\.vacation&&t\.lat!=null\)/);
  assert.match(u,/let l=TS\.filter\(t=>t\.mobile&&t\.urgent\);if\(!l\.length\)l=TS\.filter\(t=>t\.mobile\)/);
  assert.match(u,/t\.dist==null\|\|t\.dist<=Math\.max\(t\.radius\|\|30,30\)/);
  assert.match(u,/\.sort\(\(a,b\)=>\(!!b\.online-!!a\.online\)\|\|\(a\.dist\?\?1e9\)-\(b\.dist\?\?1e9\)\)/);
  assert.match(u,/const pick=l\.slice\(0,3\)/);
  const call=home.slice(home.indexOf('async function urgentCall(pre,o2){'),home.indexOf('cxSheet({kind:"urgent"'));
  assert.match(call,/const TS=TECHS\.filter\(t=>!isMine\(t\)&&!t\.full&&!t\.vacation\);let l=TS\.filter\(t=>t\.mobile&&t\.urgent\);if\(!l\.length\)l=TS\.filter\(t=>t\.mobile\)/);
  assert.match(call,/\.sort\(\(a,b\)=>\(!!b\.online-!!a\.online\)\|\|\(a\.dist\?\?1e9\)-\(b\.dist\?\?1e9\)\)\.slice\(0,3\)/);
  assert.match(home,/r\.taking\?T\(`แจ้งเตือนช่างที่รับงานอยู่ตอนนี้ \$\{r\.taking\} ร้าน/,'the customer hears how many shops taking jobs were alerted');
});

test('match: nearest, best quality, most stars and a balanced pick — from real data, never paused, full or own shops',()=>{
  const m=atlas.slice(atlas.indexOf('const bay=t=>'),atlas.indexOf('/* เหตุผลที่เลือก'));
  assert.match(m,/const bay=t=>t\.reviewCount>0\?\(Number\(t\.rating\)\*t\.reviewCount\+4\*5\)\/\(t\.reviewCount\+5\):0/,'stars are weighted by review count');
  for(const k of ['best','near','quality','stars'])assert.match(m,new RegExp(`\\b${k}:\\{key:`),k);
  assert.match(m,/quality:\{key:'proven',cmp:\(a,b\)=>\(b\.proven\|\|0\)-\(a\.proven\|\|0\)/,'quality = proven finished jobs first');
  assert.match(m,/stars:\{key:'stars',need:t=>t\.reviewCount>0/,'no-review shops never top "most stars"');
  assert.match(m,/near:\{key:'dist',cmp:\(a,b\)=>\(a\.dist\?\?1e9\)-\(b\.dist\?\?1e9\)/);
  assert.match(m,/let c=st\.list\.filter\(t=>!A\.isMine\(t\)&&!t\.vacation&&!t\.full&&\(!m\.need\|\|m\.need\(t\)\)\)/);
  assert.match(m,/return c\.slice\(0,3\)\.map\(\(t,i\)=>\(\{\.\.\.t,rank:i\+1\}\)\)/);
  assert.match(atlas,/\$\{t\.rank\?`<span class="atl-rank">\$\{t\.rank\}<\/span>`/,'rank badges on the pins');
  assert.match(atlas,/const pts=\(st\.urg\?urgentList\(\)\.all:st\.match\?matchList\(\):st\.list\)/,'match mode shows only the three picks');
  assert.match(atlas,/case 'pbook':\{const t=st\.all\.find\(x=>x\.id===b\.dataset\.t\);t&&A\.book\(t\);break\}/,'quote goes through the real booking flow');
  assert.match(css,/\.atl\[data-mode="match"\] \.atl-fab\{display:none\}/);
});

test('roaming mechanic on the map: pins follow the phone point from the server, glide, and never offer directions to a moving mechanic',()=>{
  assert.match(home,/TECHS=d\.techs\.map\(roamPos\)/);
  assert.match(home,/function roamPos\(t\)\{\n  if\(!t\)return t;\n  if\(t\.live&&t\.live\.lat!=null\)\{if\(!t\.base\)t\.base=\{lat:t\.lat,lng:t\.lng\};t\.lat=t\.live\.lat;t\.lng=t\.live\.lng\}\n  else if\(t\.base\)\{t\.lat=t\.base\.lat;t\.lng=t\.base\.lng\}/);
  const poll=home.slice(home.indexOf('async function pollLive(){'),home.indexOf('function km(a,b){'));
  assert.match(poll,/if\(VIEW!=="map"\)return;/,'only while the map is open');
  assert.match(poll,/api\("\/api\/tech\/live"\)/);assert.match(poll,/LIVE_T=setTimeout\(pollLive,30000\)/);
  assert.match(home,/function showMap\(\)\{pollLive\(\);/);
  assert.match(atlas,/const moving=t=>!!\(t\.roam&&t\.live\)/);
  assert.match(atlas,/\$\{moving\(t\)\?'':`<a class="atl-ib" href="https:\/\/www\.google\.com\/maps\/dir/,'no directions link to a moving point');
  assert.match(atlas,/glide\(m\.mk,\[t\.lng,t\.lat\],t\.roam\)/);
  assert.match(atlas,/if\(!soft\|\|RM\|\|A\.km/,'reduced motion jumps instead of gliding');
});

test('shop status does what it says: labels, settings, and the phone position sender only runs while taking jobs in roaming mode',()=>{
  assert.match(home,/const STATE=\{on:\[T\("รับงาน","Taking jobs"\)/);
  assert.match(home,/pause:\[T\("ไม่รับงาน","Not taking jobs"\)/);
  assert.match(home,/quiet:\[T\("รับงาน ไม่แจ้งเตือน","Taking jobs, no alerts"\),T\("ลูกค้ายังขอราคาได้ · งานด่วนไม่ส่ง LINE และไม่มีเสียงเตือน"/);
  const R=home.slice(home.indexOf('const RoamShare={'),home.indexOf('function roamChip(){'));
  assert.match(R,/want\(\)\{const t=myShop\(\);return !!\(U&&t&&t\.mobile&&t\.roam&&!t\.vacation&&!t\.suspended&&\(DSTATS\?DSTATS\.online:t\.online\)\)\}/);
  assert.match(R,/api\("\/api\/tech\/here",\{body:\{\.\.\.here,acc:c\.accuracy\}\}\)/);
  assert.match(R,/if\(\[403,404,409\]\.includes\(e\.status\)\)\{this\.stop\(\);return\}/,'server says no → stop sending');
  assert.match(R,/if\(!force&&at-this\.last<60000&&!\(moved>=0\.2&&at-this\.last>=20000\)\)return;/,'at most every 20 s, normally once a minute');
  assert.match(home,/RoamShare\.sync\(\);\n    toast\(k==="on"/,'changing status starts or stops sharing');
  assert.match(home,/\$\{t\.mobile\?swRow\("ssRoam","ช่างเคลื่อนที่ — ตำแหน่งตามมือถือ"/,'roaming switch only for shops that go to customers');
  assert.match(home,/if\(\$\("ssRoam"\)\)body\.roam=\$\("ssRoam"\)\.checked;/);
});

test('honest numbers: travel time is labelled as an estimate and open status comes from real data',()=>{
  assert.match(atlas,/const etaMin=d=>Math\.max\(3,Math\.round\(d\/22\*60\)\+2\)/);
  assert.match(atlas,/T\(`ขับรถราว \$\{etaMin\(d\)\} นาที`,`About \$\{etaMin\(d\)\} min drive`\)/);
  const s=atlas.slice(atlas.indexOf('function status(t){'),atlas.indexOf('const ratingOk'));
  assert.match(s,/if\(t\.vacation\)/);assert.match(s,/const o=A\.openNow\(t\);if\(o\)return o;/);assert.match(s,/t\.online\?/);
  assert.match(atlas,/const ratingOk=t=>t\.reviewCount>0&&Number\(t\.rating\)>=4\.5/,'4.5+ needs real reviews');
});

test('styles: light and dark, phone sheet and desktop panel, reduced motion',()=>{
  assert.match(atlas,/CSS_URL='\/map-atlas\.css\?v=2'/);
  assert.ok(existsSync(new URL('../vendor/maplibre-gl-4.7.1.js',import.meta.url)));
  assert.match(css,/\.atl-map\{position:absolute;inset:0;z-index:0;/,'map markers stay under the sheet');
  assert.match(css,/@media\(min-width:1024px\)\{\n  \.atl\{--sv:0px\}\n  \.atl-map\{left:400px\}/);
  assert.match(css,/html\[data-theme="dark"\] \.atl-lab\{background:#FAFAF9;color:#09090B/);
  assert.match(css,/@media\(prefers-reduced-motion:reduce\)/);
});

test('every English string on the map has a translation in all ten languages',()=>{
  const strs=[...atlas.matchAll(/T\((`[^`]*`|'[^']*'),(`[^`]*`|'(?:[^'\\]|\\.)*')\)/g)].map(m=>m[2].slice(1,-1).replace(/\\'/g,"'"));
  assert.ok(strs.length>60,'found the map strings');
  for(const lang of ['zh','ja','ko','id','vi','ms','de','fr','es','pt']){
    const ctx={window:{}};vm.runInNewContext(read(`i18n/home-${lang}.js`),ctx);const L=ctx.window.CENDON_L10N.t;
    for(const en of strs){
      if(!/[A-Za-z]/.test(en.replace(/\$\{[^}]*\}/g,'')))continue;
      let i=0;const key=en.replace(/\$\{[^}]*\}/g,()=>`{${i++}}`);
      const frags=en.split(/\$\{[^}]*\}/).map(x=>x.trim()).filter(x=>/[A-Za-z]/.test(x));
      assert.ok(L[key]!=null||(en.includes('${')&&frags.every(f=>L[f]!=null)),`${lang}: ${key}`);
    }
  }
});
