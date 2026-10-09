import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const css=readFileSync(new URL('../home-layout.css',import.meta.url),'utf8');
const page=readFileSync(new URL('../index.html',import.meta.url),'utf8');
test('home uses a scoped CSS-only spacing pass before first paint',()=>{
  assert.ok(page.indexOf('href="home-layout.css"')<page.indexOf('</head>'));
  assert.ok(!css.includes('@font-face')&&!css.includes('font-family:')&&!css.includes('data-theme'));
  for(const block of css.split('}')){
    const selector=block.slice(block.lastIndexOf('}')+1,block.indexOf('{'));
    if(selector.trim()&&!selector.includes('@media')&&!selector.includes('/*'))assert.ok(selector.includes('#vMenu'),selector);
  }
});
test('category grid remains two horizontal rows, with four fully fitting columns',()=>{
  assert.match(css,/grid-template-rows:repeat\(2,auto\)/);
  assert.match(css,/grid-auto-flow:column;grid-auto-columns:calc\(\(100% - 30px\)\/4\)/);
  assert.match(css,/gap:16px 10px/);
  for(const viewport of [320,360,375,390,414,430,760]){
    const content=viewport-32-8,column=(content-30)/4;
    assert.ok(column>=44,'tap target width at '+viewport);
    assert.equal(column*4+30,content);
  }
});
test('existing search, car hint, quick actions, rail and services keep their order',()=>{
  const ids=['id="hForm"','id="myCar"','id="hQuick"','id="hRail"','id="sugList"'];
  const positions=ids.map(id=>page.indexOf(id));assert.ok(positions.every(x=>x>=0));
  assert.deepEqual([...positions].sort((a,b)=>a-b),positions);
  assert.equal((page.match(/id="hQuick"/g)||[]).length,1);
});
test('touch controls and quick action layout stay usable without new motion',()=>{
  assert.match(css,/width:44px;height:44px/);assert.match(css,/min-height:82px/);
  assert.match(css,/focus-visible/);assert.ok(!css.includes('animation:')&&!css.includes('backdrop-filter:'));
});
test('new stylesheet is available in the service worker core',()=>{
  const sw=readFileSync(new URL('../sw.js',import.meta.url),'utf8');assert.ok(sw.includes("'./home-layout.css'"));
});
test('category rail has mandatory column snapping and no faded edge in any theme',()=>{
  assert.match(css,/#vMenu \.lx-rail\{-webkit-mask:none;mask:none;scroll-snap-type:x mandatory\}/);
  assert.match(css,/#vMenu \.lx-rail button\{scroll-snap-align:start\}/);
  assert.ok(!css.includes('x proximity')&&!css.includes('mask:linear-gradient'));
  assert.match(css,/scroll-padding-inline:4px/);
});
