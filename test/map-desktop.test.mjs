import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
/* แผนที่บนคอม: เต็มจอ และแผงซ้ายไม่ลอยเว้นช่องว่างด้านบน */
const r=f=>readFileSync(new URL('../'+f,import.meta.url),'utf8').replace(/\r\n/g,'\n');
const css=r('map-atlas.css'),home=r('index.html'),atlas=r('map-atlas.js');

test('map box rules never match <body> (it also carries the atl-map class while the map is open)',()=>{
  assert.match(home,/document\.body\.classList\.toggle\("atl-map"/,'body does get the class');
  assert.doesNotMatch(css,/(^|[\s,}])\.atl-map\{/m,'no bare .atl-map rule');
  assert.match(css,/\.atl>\.atl-map\{position:absolute;inset:0;z-index:0;/);
  assert.match(css,/\.atl>\.atl-map\{left:400px\}/);
});

test('the map view is never capped to the content width on wide screens',()=>{
  assert.match(r('wide-layout.css'),/\.view\{max-width:var\(--page-w\)\}/,'pages are capped…');
  assert.match(home,/\.view\.mapv\{max-width:none\}/,'…but not the map');
});

test('on wide screens the app bar centres over the map and the panel starts at the top',()=>{
  assert.match(css,/@media\(min-width:1200px\)\{\n  body\.onmap\.atl-map \.navwrap\{left:400px\}\n  \.atl-top,\.atl-ubar\{top:20px\}\n  \.atl-chips\{top:78px\}\n  \.atl-sheet\{padding-top:128px\}\n\}/);
  assert.match(css,/\.atl-chips\{-webkit-mask-image:linear-gradient\(90deg,#000 calc\(100% - 36px\),transparent\)/,'scrollable chips fade instead of looking cut off');
  assert.match(atlas,/CSS_URL='\/map-atlas\.css\?v=3'/);
});

test('call page fills the screen on tablet and desktop: map left, steps panel right with its button pinned',()=>{
  const cx=r('call-x.css');
  assert.doesNotMatch(cx,/width:min\(480px,100vw\)/,'no phone-sized column in the middle of a desktop');
  assert.match(cx,/@media\(min-width:761px\)\{\n  \.bs\.cxs \.pn\{left:0;right:0;top:0;bottom:0;width:auto;/);
  assert.match(cx,/\.cx\{display:grid;grid-template-columns:minmax\(0,1fr\) var\(--cxw\);height:100%\}/);
  assert.match(cx,/\.bs\.cxs \.ft\{position:absolute;right:0;bottom:0;z-index:6;width:var\(--cxw\);/,'Next stays above the scrolling panel');
});

test('Car Passport cost switch is brand orange when on, never all-white in dark mode',()=>{
  const g=r('garage-extras.css');
  assert.doesNotMatch(g,/\.cx-rem input:checked\+\.sw\{background:var\(--ink/);
  assert.match(g,/\.cx-rem input:checked\+\.sw\{background:linear-gradient\(135deg,#FFB547,#F28C38 45%,#E4572E\)/);
  assert.match(r('garage.html'),/garage-extras\.css\?v=8/);
});
