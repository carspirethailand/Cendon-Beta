import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const source=readFileSync(new URL('../category-pages.js',import.meta.url),'utf8');
function setup(count=24,reduced=false){
  let mutation,resize,pending;
  const media={matches:true,addEventListener(){}};
  function el(){return{children:[],attrs:{},events:{},setAttribute(k,v){this.attrs[k]=v;},addEventListener(k,f){this.events[k]=f;},replaceChildren(...nodes){this.children=nodes;}};}
  const rail=el();Object.assign(rail,{closest:()=>null,scrollLeft:0,clientWidth:358,scrollWidth:1078,getBoundingClientRect:()=>({left:16}),after(node){this.dots=node;},scrollTo(options){this.lastScroll=options;this.scrollLeft=options.left;this.events.scroll();}});
  function items(n){rail.children=Array.from({length:n},(_,i)=>({tagName:'BUTTON',getBoundingClientRect:()=>({left:20+Math.floor(i/2)*90-rail.scrollLeft})}));}
  items(count);rail.scrollWidth=8+Math.ceil(count/2)*90-10;
  vm.runInNewContext(source,{document:{getElementById:()=>rail,createElement:el},matchMedia:q=>q.includes('reduced')?{matches:reduced}:media,parseFloat,getComputedStyle:()=>({paddingLeft:'4px'}),Math,requestAnimationFrame(fn){pending=fn;return 1;},MutationObserver:class{constructor(fn){mutation=fn;}observe(){}},ResizeObserver:class{constructor(fn){resize=fn;}observe(){}}});
  const flush=()=>{pending?.();pending=null;};flush();
  return{rail,items,flush,mutation:()=>mutation(),resize:()=>resize()};
}
test('page controls open consecutive full groups and correctly select the active page',()=>{
  const {rail,flush}=setup();assert.equal(rail.dots.children.length,3);
  for(const [i,left] of [[0,0],[1,360],[2,720]]){
    rail.dots.children[i].events.click();
    assert.equal(rail.lastScroll.left,left);assert.equal(rail.lastScroll.behavior,'smooth');
    // Flush a native scroll notification after each movement.
    rail.events.scroll();flush();
    assert.equal(rail.dots.children[i].attrs['aria-current'],'true');
    assert.equal(rail.dots.children.filter(dot=>dot.attrs['aria-current']==='true').length,1);
  }
});
test('last partial group is reachable, and reduced motion avoids animated scrolling',()=>{
  const {rail}=setup(25,true);assert.equal(rail.dots.children.length,4);
  rail.dots.children[3].events.click();
  assert.equal(rail.lastScroll.left,rail.scrollWidth-rail.clientWidth);
  assert.equal(rail.lastScroll.behavior,'auto');
});
test('category re-render and resized geometry refresh controls without modifying buttons',()=>{
  const fixture=setup();const first=fixture.rail.children[0];fixture.resize();assert.equal(fixture.rail.children[0],first);
  fixture.items(8);fixture.mutation();fixture.flush();assert.equal(fixture.rail.dots.children.length,1);assert.equal(fixture.rail.dots.hidden,true);
});

test('hidden category geometry is skipped and becomes current when its section is shown',()=>{
 const f=setup();f.rail.closest=()=>({hidden:true});const bounds=f.rail.getBoundingClientRect;f.rail.getBoundingClientRect=()=>{throw Error('Hidden rail must not be measured')};f.items(8);f.mutation();f.flush();
 f.rail.closest=()=>null;f.rail.getBoundingClientRect=bounds;f.resize();f.flush();assert.equal(f.rail.dots.children.length,1);assert.equal(f.rail.dots.hidden,true);
});
