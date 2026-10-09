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
test('mobile pages contain eight consecutive icons and stop at each page',()=>{
  assert.match(css,/button:nth-child\(8n \+ 1\)\{scroll-snap-align:start;scroll-snap-stop:always\}/);
  assert.match(css,/min-height:90px;.*scroll-snap-align:none/);
  for(const count of [1,7,8,9,24,25,31]){
    const pages=Array.from({length:Math.ceil(count/8)},(_,p)=>Array.from({length:Math.min(8,count-p*8)},(_,i)=>p*8+i));
    assert.deepEqual(pages.flat(),Array.from({length:count},(_,i)=>i));
  }
});
test('page indicators are accessible and leave native gesture and category handlers alone',()=>{
  const js=readFileSync(new URL('../category-pages.js',import.meta.url),'utf8');
  assert.ok(page.includes('src="category-pages.js" defer'));
  assert.match(js,/aria-current/);assert.match(js,/aria-label/);assert.match(js,/reduced.matches\?'auto':'smooth'/);
  assert.ok(!js.includes('preventDefault')&&!js.includes('innerHTML')&&!js.includes('onclick'));
  assert.match(js,/observe\(rail,\{childList:true\}\)/);
  assert.ok(readFileSync(new URL('../sw.js',import.meta.url),'utf8').includes("'./category-pages.js'"));
});
