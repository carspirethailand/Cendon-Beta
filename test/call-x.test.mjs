import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
/* ปุ่ม + หน้าแรก · เมนูเรียกช่างทุกแบบ · หน้าเรียกช่างแบบใหม่ (แผนที่เอียง + แผ่นข้อมูลเป็นขั้น + เส้นแสง ambient แบบแชต) */
const r=f=>readFileSync(new URL('../'+f,import.meta.url),'utf8').replace(/\r\n/g,'\n');
const home=r('index.html'),css=r('call-x.css'),map=r('call-x-map.js'),sw=r('sw.js');

test('+ lives only on the mobile home screen, left of the logo, level with the bell',()=>{
  assert.match(home,/<link rel="stylesheet" href="call-x\.css\?v=\d+">/);
  /* หน้าตาเดียวกับกระดิ่ง: 36px ขอบบน 23px ห่างขอบ 16px (กระดิ่งขวา ปุ่มนี้ซ้าย) · โปร่ง ไม่มีกรอบ สีเดียวกับกระดิ่ง */
  assert.match(css,/\.cx-plus\{position:absolute;top:calc\(23px \+ env\(safe-area-inset-top\)\);left:16px;z-index:31;width:36px;height:36px;border-radius:50%;\n  border:0;background:none;color:var\(--ink,#09090B\);/);
  assert.match(r('bell.js'),/\.cb-m\{position:absolute;top:calc\(23px \+ env\(safe-area-inset-top\) \+ var\(--cb-dy,0px\)\);right:calc\(16px \+ var\(--cb-dx,0px\)\);width:36px;height:36px;/,'bell geometry this mirrors');
  assert.match(home,/b\.innerHTML='<i class="ti ti-plus" aria-hidden="true"><\/i>';/,'same icon set as the bell');
  assert.match(css,/@media\(min-width:761px\)\{\.cx-plus\{display:none!important\}\}/,'mobile only');
  assert.match(css,/body\[data-mode="tech"\] \.cx-plus,body\.onmap \.cx-plus\{display:none!important\}/,'not in shop mode or on the map');
  assert.match(home,/VIEW=v;if\(\$\("cxPlus"\)\)\{\$\("cxPlus"\)\.hidden=v!=="menu";if\(v!=="menu"\)plusClose\(\)\}/,'other pages hide it and close the menu');
  assert.match(home,/b\.setAttribute\("aria-haspopup","menu"\);b\.setAttribute\("aria-expanded","false"\);/);
});

test('+ menu offers every way to call a mechanic, and past shops come only from the customer’s own conversations',()=>{
  const menu=home.slice(home.indexOf('function plusOpen(){'),home.indexOf('function plusClose('));
  for(const k of ['urgent','photo','listen'])assert.match(menu,new RegExp(`data-k="${k}"`),k);
  for(const k of ['post','home','multi'])assert.match(menu,new RegExp(`tile\\("${k}"`),k);
  const past=home.slice(home.indexOf('function pastShops(){'),home.indexOf('function plusOpen(){'));
  assert.match(past,/for\(const c of convos\(th,jb\)\)/);
  assert.match(past,/if\(t&&!isMine\(t\)\)out\.push\(t\)/,'never the user’s own shop');
  assert.doesNotMatch(past,/api\(/,'no new request just to open the menu');
});

test('call page keeps the original submit paths — only the layout is new',()=>{
  assert.match(home,/const r=await api\("\/api\/tech\/jobs",\{body:\{id:reqId,techId:t\.id,\.\.\.cf\.read\(\)\}\}\);/,'quote to one shop');
  assert.match(home,/return sendGroup\(list,\{\.\.\.v,symptom:sym\}\)/,'quotes from several shops');
  assert.match(home,/cxSheet\(\{kind:"urgent",cf,switch:!pre,/);
  /* ตรวจทีละขั้นด้วยกติกาเดียวกับตอนส่ง — ไม่มีกติกาแยกที่หลวมกว่า */
  assert.match(home,/try\{cf\.read\(o\.readOpt&&o\.readOpt\(\)\)\}catch\(err\)\{if\(err&&err\.form\)\{const mine=err\.form\.filter\(x=>stepOf\(x\.id\)===cur\);if\(mine\.length\)return formPop\(mine\)\}\}/);
  assert.match(home,/busy\(e\.currentTarget,o\.go\)\.finally\(\(\)=>bs\.classList\.remove\("cx-busy"\)\)/);
  assert.match(home,/document\.dispatchEvent\(new CustomEvent\("cendon:formpop",\{detail:list\}\)\)|cendon:formpop/,'an error jumps to the step that holds the field');
});

test('switching urgent / find / come-to-me keeps what was typed',()=>{
  assert.match(home,/const s=\(sym&&sym\.value\|\|""\)\.trim\(\);\n        if\(k==="urgent"\)urgentCall\(null,\{swap:true,sym:s\}\);else openPostForm\(s,"",\{home:k==="home",swap:true\}\)/);
});

test('hero map: view only, no API calls, and shown only once real roads are drawn',()=>{
  assert.match(map,/interactive:false/);
  assert.doesNotMatch(map,/fetch\(|api\(/,'the map module never calls the API');
  assert.match(map,/const seen=\(\)=>\{try\{return map\.queryRenderedFeatures\(\)\.some\(f=>!\/\^cx\/\.test\(f\.source\)\)\}catch\(e\)\{return false\}\};/);
  assert.match(home,/h\.live\.then\(\(\)=>\{if\(seq===CX\.seq&&root\.isConnected\)root\.classList\.add\("live"\)\}\)/);
  assert.match(css,/\.cx-map\{opacity:0;transition:opacity \.7s ease\}\n\.cx\.live \.cx-map\{opacity:1\}/,'until then the drawn map art stays');
  assert.match(css,/\.cx-hero \.cx-map\{position:absolute;inset:0\}/,'beats MapLibre’s position:relative (otherwise the box is 0px tall)');
  assert.match(r('map-atlas.js'),/export \{loadLib,styleFor\};/);
  assert.match(home,/import\("\/call-x-map\.js\?v=\d+"\)/);
});

test('ambient light: chat console line on the symptom box, ember ring while sending, calm with reduced motion',()=>{
  assert.match(css,/\.cx-say-box::after\{content:"";position:absolute;left:16%;right:16%;top:-1px;/);
  assert.match(home,/box\.className="cx-say-box";sym\.before\(box\);box\.appendChild\(sym\);/,'line sits on the box edge, not above the label');
  assert.match(css,/\.bs\.cxs\.cx-busy \.cx-go::after\{opacity:1;animation:cxRing/);
  assert.match(css,/@media\(prefers-reduced-motion:reduce\)\{/);
});

test('privacy: no microphone or speech API on the call page — the round button attaches a photo',()=>{
  const cx=home.slice(home.indexOf('function cxSheet(o){'),home.indexOf('function book(t,sym){'));
  assert.doesNotMatch(cx+map,/getUserMedia|SpeechRecognition/);
  assert.match(cx,/cam\.setAttribute\("aria-label",T\("แนบรูป","Add a photo"\)\);cam\.innerHTML='<i class="ti ti-camera-plus"><\/i>';/);
});

test('call page: sheet class does not collide with the page root, admin orb never covers the steps',()=>{
  assert.match(home,/cls:"cx",kind,full:true/);
  assert.doesNotMatch(css,/(^|[,}\s])\.bs\.cx[\s.{]/,'sheet styles use .bs.cxs, not .bs.cx');
  assert.match(css,/body:has\(#bs\.cxs\.on\) #cxa-fab,body:has\(#cxPlus\[aria-expanded="true"\]\) #cxa-fab\{display:none!important\}/);
});

test('new call-page files are cached for offline start',()=>{
  assert.match(sw,/'\.\/call-x\.css\?v=2'/,'render-critical style is precached; the map module loads on demand like the /map page');
  assert.match(home,/href="call-x\.css\?v=2"/,'same version as the page');
});
