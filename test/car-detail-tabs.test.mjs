import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
const source=readFileSync(new URL('../car-detail-tabs.js',import.meta.url),'utf8'),css=readFileSync(new URL('../car-detail-tabs.css',import.meta.url),'utf8');
function fixture({width=380,count=8,mouse=true,reduced=false,selected=0}={}){
  const frames=[],observers=[],listeners={},scrolls=[],elements=[];let left=0;
  function el(){const attrs={},classes=new Set();const e={attrs,disabled:false,listeners:{},children:[],classList:{contains:k=>classes.has(k),toggle:(k,v)=>v?classes.add(k):classes.delete(k)},set className(v){v.split(' ').forEach(k=>classes.add(k))},get className(){return [...classes].join(' ')},setAttribute(k,v){attrs[k]=v},addEventListener(k,fn){this.listeners[k]=fn},append(...a){this.children.push(...a);for(const child of a)child.parentNode=this},insertBefore(child){this.children.unshift(child);child.parentNode=this},get clientWidth(){return width},getBoundingClientRect(){return {left:0,right:this.clientWidth}}};elements.push(e);return e}
  const parent=el(),rail=el();rail.id='clTabs';rail.className='carx-tabs';parent.append(rail);
  Object.defineProperty(rail,'clientWidth',{get:()=>width-(rail.parentNode.classList.contains('has-overflow')&&mouse?84:0)});
  Object.defineProperty(rail,'scrollWidth',{get:()=>Math.max(rail.clientWidth,48+count*100)});
  Object.defineProperty(rail,'scrollLeft',{get:()=>left});
  rail.scrollTo=o=>{scrolls.push(o);left=o.left};
  const tabs=Array.from({length:count},(_,i)=>({getBoundingClientRect:()=>({left:24+i*100-left,right:124+i*100-left}),closest:()=>tabs[i]}));
  rail.querySelectorAll=()=>tabs;rail.querySelector=()=>tabs[selected];
  const D={readyState:'complete',getElementById:()=>rail,createElement:el,addEventListener:(k,fn)=>listeners[k]=fn};
  const media={matches:mouse,addEventListener(){}};
  const W={lang:'en',matchMedia:q=>q.includes('reduced')?{matches:reduced}:media,requestAnimationFrame:fn=>{frames.push(fn);return frames.length},getComputedStyle:()=>({paddingLeft:'24px',paddingRight:'24px'}),addEventListener(){},
    MutationObserver:class{constructor(fn){this.fn=fn;observers.push(this)}observe(target,options){this.target=target;this.options=options}},
    ResizeObserver:class{constructor(fn){this.fn=fn;observers.push(this)}observe(target){(this.targets??=[]).push(target)}}};
  vm.runInNewContext(source,{window:W,document:D,WeakMap});
  const flush=()=>{while(frames.length)frames.shift()()};flush();const shell=rail.parentNode,[prev,,next]=shell.children;
  return {W,D,rail,shell,prev,next,tabs,scrolls,observers,frames,flush,setWidth:v=>width=v,setSelected:i=>selected=i,setScroll:v=>left=v};
}
test('desktop tabs: overflow exposes mouse arrows and disables the unavailable edge',()=>{
  const f=fixture();assert.ok(f.shell.classList.contains('has-overflow'));assert.equal(f.prev.disabled,true);assert.equal(f.next.disabled,false);assert.equal(f.next.attrs['aria-controls'],'clTabs');assert.equal(f.next.attrs['aria-label'],'Scroll tabs right');assert.equal(f.next.tabIndex,0);
});
test('desktop tabs: arrows advance a full tab group rather than nudging only the next tab',()=>{
  const f=fixture();f.next.listeners.click();f.flush();assert.equal(f.scrolls.at(-1).left,200,'next group begins with the partially hidden tab, not a 52px nudge');assert.equal(f.scrolls.at(-1).behavior,'smooth');f.next.listeners.click();f.flush();assert.equal(f.scrolls.at(-1).left,400);f.prev.listeners.click();f.flush();assert.equal(f.scrolls.at(-1).left,152);assert.equal(f.rail.querySelector(),f.tabs[0],'arrow scrolling never changes tab selection');
});
test('desktop tabs: one click reaches the remaining tabs on a normal desktop rail and one click returns',()=>{
  const f=fixture({width:680});f.next.listeners.click();f.flush();assert.equal(f.scrolls.at(-1).left,f.rail.scrollWidth-f.rail.clientWidth);assert.equal(f.next.disabled,true);f.prev.listeners.click();f.flush();assert.equal(f.scrolls.at(-1).left,0);assert.equal(f.prev.disabled,true);
});
test('desktop tabs: narrow-window page steps fully expose every tab at least once, including boundary tabs',()=>{
  const f=fixture(),seen=new Set(),observe=()=>{for(const [i,t] of f.tabs.entries()){const b=t.getBoundingClientRect();if(b.left>=24-1&&b.right<=f.rail.clientWidth-24+1)seen.add(i)}};
  observe();let clicks=0;while(!f.next.disabled&&clicks<10){f.next.listeners.click();f.flush();observe();clicks++}assert.equal(seen.size,8);assert.equal(clicks,3,'three group steps replace six small nudges in a narrow desktop window');
});
test('desktop tabs: both ends are clamped and end arrows cannot overscroll',()=>{
  const f=fixture();for(let i=0;i<12;i++){f.next.listeners.click();f.flush()}assert.equal(f.next.disabled,true);assert.equal(f.prev.disabled,false);assert.ok(f.scrolls.every(x=>x.left>=0&&x.left<=f.rail.scrollWidth-f.rail.clientWidth));for(let i=0;i<12;i++){f.prev.listeners.click();f.flush()}assert.equal(f.prev.disabled,true);assert.equal(f.scrolls.at(-1).left,0);
});
test('desktop tabs: reduced motion, keyboard focus and reopened selection remain usable',()=>{
  const f=fixture({reduced:true});f.rail.listeners.focusin({target:f.tabs[7]});f.flush();assert.equal(f.scrolls.at(-1).behavior,'instant');f.setSelected(7);f.W.CendonDetailTabs.mount(f.rail);f.flush();assert.equal(f.scrolls.at(-1).left,f.rail.scrollWidth-f.rail.clientWidth);
});
test('desktop tabs: no arrows when everything fits; resize uses only scoped observers and coalesced frames',()=>{
  const f=fixture({width:1000});assert.ok(!f.shell.classList.contains('has-overflow'));assert.equal(f.next.tabIndex,-1);f.setWidth(380);for(const o of f.observers)o.fn();assert.equal(f.frames.length,1);f.flush();assert.ok(f.shell.classList.contains('has-overflow'));assert.ok(f.observers.every(o=>o.target===f.rail||o.targets.every(t=>t===f.rail||t===f.shell)));
});
test('desktop tabs: resizing retains visibility of the selected tab instead of resetting to hidden content',()=>{
  const f=fixture({width:1000,selected:7});f.setWidth(380);f.setScroll(0);f.observers.find(o=>o.targets).fn();f.flush();assert.equal(f.scrolls.at(-1).left,f.rail.scrollWidth-f.rail.clientWidth);
});
test('desktop tabs: height-only resize notifications do not undo an intentional arrow scroll',()=>{
  const f=fixture({width:680});const resize=f.observers.find(o=>o.targets);resize.fn();f.flush();f.next.listeners.click();f.flush();const atEnd=f.rail.scrollLeft;resize.fn();f.flush();assert.equal(f.rail.scrollLeft,atEnd,'content height changes must not scroll back to the selected tab');
});
test('desktop tabs: touch scrolling is never intercepted and hidden controls are not focusable',()=>{
  const f=fixture({mouse:false});assert.equal(f.next.tabIndex,-1);assert.equal(f.next.attrs['aria-hidden'],'true');assert.ok(!('touchmove' in f.rail.listeners));assert.ok(!('wheel' in f.rail.listeners));assert.match(css,/@media \(hover:hover\) and \(pointer:fine\)/);assert.doesNotMatch(css,/touch-action:\s*none|overflow-x:\s*hidden|mask:/);
});
test('desktop tabs: repeated opens do not duplicate wrappers, controls or observers; Thai labels follow app language',()=>{
  const f=fixture(),observers=f.observers.length;f.W.lang='th';for(let i=0;i<6;i++)f.W.CendonDetailTabs.mount(f.rail);f.flush();assert.equal(f.rail.parentNode,f.shell);assert.equal(f.shell.children.length,3);assert.equal(f.observers.length,observers);assert.match(f.next.attrs['aria-label'],/ขวา/);
});
test('desktop tabs: all existing car-detail entry pages load styles before paint and mount only after showing their modal',()=>{
  /* การาจใช้หน้ารถโฉมใหม่ 4 ห้อง (แท็บพอดีจอ ไม่มีรางเลื่อน) — หน้าอื่นพามาหน้ารถของการาจ */
  for(const name of ['news','profile','spares']){const html=readFileSync(new URL('../'+name+'.html',import.meta.url),'utf8');assert.ok(html.indexOf('href="car-detail-tabs.css?v=2026-10-12-r1"')<html.indexOf('</head>'),name);assert.match(html,/modal\.classList\.add\("show"\);\s+window\.CendonDetailTabs\?\.mount\(\$\("clTabs"\)\)/,name);assert.match(html,/src="car-detail-tabs.js\?v=2026-10-12-r2" defer/,name)}
});
