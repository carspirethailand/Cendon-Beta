import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import vm from 'node:vm';

const read=f=>readFileSync(new URL('../'+f,import.meta.url),'utf8');
const home=read('index.html'),atlas=read('map-atlas.js'),css=read('map-atlas.css');

test('map page loads the new map first and keeps the old Leaflet map as the fallback',()=>{
  assert.match(home,/<div class="atl-host" id="atlas" hidden><\/div>\n<\/section>/,'host lives inside the map view');
  assert.match(home,/const M=await import\("\/map-atlas\.js\?v=1"\);if\(!M\.supported\(\)\)throw Error\("webgl"\)/);
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

test('urgent mode uses the same rules as the urgent call itself',()=>{
  const u=atlas.slice(atlas.indexOf('function urgentList(){'),atlas.indexOf('/* ── ตัวกรอง ── */'));
  assert.match(u,/TS=A\.techs\(\)\.filter\(t=>!A\.isMine\(t\)&&!t\.full&&t\.lat!=null\)/);
  assert.match(u,/let l=TS\.filter\(t=>t\.mobile&&t\.urgent\);if\(!l\.length\)l=TS\.filter\(t=>t\.mobile\)/);
  assert.match(u,/t\.dist==null\|\|t\.dist<=Math\.max\(t\.radius\|\|30,30\)/);
  assert.match(u,/const pick=l\.slice\(0,3\)/);
  const call=home.slice(home.indexOf('async function urgentCall(pre){'),home.indexOf('sheet({title:"",push:true,slug:pre?"help":"breakdown"'));
  assert.match(call,/let l=TS\.filter\(t=>t\.mobile&&t\.urgent\);if\(!l\.length\)l=TS\.filter\(t=>t\.mobile\)/);
  assert.match(call,/\.slice\(0,3\)/);
});

test('honest numbers: travel time is labelled as an estimate and open status comes from real data',()=>{
  assert.match(atlas,/const etaMin=d=>Math\.max\(3,Math\.round\(d\/22\*60\)\+2\)/);
  assert.match(atlas,/T\(`ขับรถราว \$\{etaMin\(d\)\} นาที`,`About \$\{etaMin\(d\)\} min drive`\)/);
  const s=atlas.slice(atlas.indexOf('function status(t){'),atlas.indexOf('const ratingOk'));
  assert.match(s,/if\(t\.vacation\)/);assert.match(s,/const o=A\.openNow\(t\);if\(o\)return o;/);assert.match(s,/t\.online\?/);
  assert.match(atlas,/const ratingOk=t=>t\.reviewCount>0&&Number\(t\.rating\)>=4\.5/,'4.5+ needs real reviews');
});

test('styles: light and dark, phone sheet and desktop panel, reduced motion',()=>{
  assert.match(atlas,/CSS_URL='\/map-atlas\.css\?v=1'/);
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
