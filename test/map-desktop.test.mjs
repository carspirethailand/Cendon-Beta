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
