import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

const source=readFileSync(new URL('../cendon-tour.js',import.meta.url),'utf8');
const css=readFileSync(new URL('../account.css',import.meta.url),'utf8');

function fixture({targets=['#one','#two'],viewport={width:390,height:844},lang='th'}={}){
  const observers=[];
  const events=()=>({events:new Map(),addEventListener(name,fn){if(!this.events.has(name))this.events.set(name,new Set());this.events.get(name).add(fn);},removeEventListener(name,fn){this.events.get(name)?.delete(fn);},fire(name,event={}){for(const fn of this.events.get(name)||[])fn(event);}});
  let doc;
  class Element{
    constructor(tag){Object.assign(this,events());this.tagName=tag.toUpperCase();this.style={};this.children=[];this.attrs={};this.hidden=false;this.inert=false;this.disabled=false;this.nodeType=1;this.isConnected=false;this.offsetHeight=190;this.textContent='';}
    appendChild(node){node.parentNode=this;node.isConnected=this.isConnected;this.children.push(node);return node;}
    setAttribute(name,value){this.attrs[name]=String(value);}
    getAttribute(name){return this.attrs[name];}
    getBoundingClientRect(){return this.rect||{left:40,top:170,right:350,bottom:245,width:310,height:75};}
    scrollIntoView(){this.scrolled=(this.scrolled||0)+1;}
    focus(){doc.activeElement=this;}
    contains(node){return this===node||this.children.some(child=>child.contains(node));}
    remove(){this.parentNode.children=this.parentNode.children.filter(node=>node!==this);this.isConnected=false;}
  }
  const body=new Element('body');body.isConnected=true;
  const nodes=new Map(targets.map(selector=>{const node=new Element('button');node.isConnected=true;body.appendChild(node);return[selector,node];}));
  const previouslyInert=new Element('aside');previouslyInert.inert=true;body.appendChild(previouslyInert);
  const previousFocus=nodes.values().next().value;
  doc={...events(),body,activeElement:previousFocus,documentElement:{lang},createElement:tag=>new Element(tag),createElementNS:(_,tag)=>new Element(tag),
    querySelectorAll:selector=>selector.split(',').map(item=>nodes.get(item.trim())).filter(Boolean),getElementById:id=>nodes.get('#'+id)};
  const window={...events(),...viewport,innerWidth:viewport.width,innerHeight:viewport.height,scrollBy(){},visualViewport:{...events(),...viewport,offsetLeft:0,offsetTop:0}};
  const sandbox={window,document:doc,getComputedStyle:()=>({display:'block',visibility:'visible',opacity:'1'}),
    setTimeout:(fn)=>setTimeout(fn,0),clearTimeout,requestAnimationFrame:fn=>setTimeout(fn,0),cancelAnimationFrame:clearTimeout,
    MutationObserver:class{constructor(fn){this.fn=fn;observers.push(this);}observe(){}disconnect(){this.disconnected=true;}}};
  vm.runInNewContext(source,sandbox);
  function walk(root,className){if(root.className===className)return root;for(const child of root.children){const found=walk(child,className);if(found)return found;}}
  const get=className=>walk(body,className);
  const start=finish=>window.CendonTour.start({targets:targets.map((selector,index)=>({selector,title:`Title ${index}`,text:'Helpful copy'})),finish});
  return{api:window.CendonTour,body,nodes,doc,window,observers,get,start,previouslyInert,previousFocus};
}
const tick=()=>new Promise(resolve=>setTimeout(resolve,5));

test('spotlight geometry uses four non-overlapping dark regions and a real clear hole',()=>{
  const {api}=fixture();
  for(const [width,height] of [[320,568],[390,844],[430,932],[1200,800]]){
    const layout=api.geometry({left:22,top:80,right:width-22,bottom:150},{width,height},{width:400,height:200});
    const scrimArea=layout.scrims.reduce((sum,rect)=>sum+rect.width*rect.height,0);
    assert.equal(scrimArea+layout.hole.width*layout.hole.height,width*height);
    assert.ok(layout.card.left>=16&&layout.card.top>=16);
    assert.ok(layout.card.left+layout.card.width<=width-16);
    assert.ok(layout.card.top+layout.card.height<=height-16);
    assert.equal(layout.overlap,false);
  }
});
test('partly offscreen targets and visual viewport offsets stay inside visible bounds',()=>{
  const {api}=fixture();
  const layout=api.geometry({left:-40,top:90,right:450,bottom:200},{left:10,top:100,width:320,height:440},{width:400,height:180});
  assert.equal(layout.hole.left,0);assert.equal(layout.hole.top,0);assert.equal(layout.hole.right,320);
  assert.equal(layout.hole.bottom,109);assert.ok(layout.scrims.every(rect=>rect.width>=0&&rect.height>=0));
});
test('bottom navigation gets a card above it and tall targets identify overlap',()=>{
  const {api}=fixture();
  const nav=api.geometry({left:0,top:504,right:320,bottom:568},{width:320,height:568},{width:288,height:200});
  assert.equal(nav.below,false);assert.equal(nav.overlap,false);
  const tall=api.geometry({left:10,top:50,right:310,bottom:500},{width:320,height:568},{width:288,height:220});
  assert.equal(tall.overlap,true);
});
test('tutorial is a modal, blocks underlying interactions, and restores previous inert/focus state',async()=>{
  const f=fixture();assert.equal(await f.start(async()=>{}),true);
  assert.equal(f.get('ct-root').attrs['aria-modal'],'true');
  assert.equal(f.previousFocus.inert,true);assert.equal(f.previouslyInert.inert,true);
  assert.equal(f.get('ct-hole').style.width,'328px');
  assert.equal(f.get('ct-count').textContent,'1 จาก 2');
  f.api.stop();assert.equal(f.get('ct-root'),undefined);assert.equal(f.previousFocus.inert,false);
  assert.equal(f.previouslyInert.inert,true);assert.equal(f.doc.activeElement,f.previousFocus);
  assert.ok(f.observers[0].disconnected);assert.equal(f.doc.events.get('keydown').size,0);
  assert.equal(f.window.events.get('resize').size,0);assert.equal(f.window.visualViewport.events.get('resize').size,0);
});
test('next and back do not finish early; final next persists completed status',async()=>{
  const f=fixture({lang:'en'}),statuses=[];await f.start(async status=>statuses.push(status));
  assert.equal(f.get('ct-back').hidden,true);assert.equal(f.get('ct-next').textContent,'Next');
  f.get('ct-next').fire('click');assert.equal(f.get('ct-count').textContent,'2 of 2');
  f.get('ct-back').fire('click');assert.equal(f.get('ct-count').textContent,'1 of 2');assert.equal(statuses.length,0);
  f.get('ct-next').fire('click');f.get('ct-next').fire('click');await tick();
  assert.deepEqual(statuses,['completed']);assert.equal(f.get('ct-root'),undefined);
});
test('skip waits for persistence and failed persistence keeps the tutorial open with retry',async()=>{
  const f=fixture(),statuses=[];let calls=0;await f.start(async status=>{statuses.push(status);if(calls++===0)throw new Error('offline');});
  f.get('ct-skip').fire('click');assert.ok(f.get('ct-root'));assert.equal(f.get('ct-next').disabled,true);await tick();
  assert.ok(f.get('ct-root'));assert.equal(f.get('ct-error').hidden,false);assert.equal(f.get('ct-next').textContent,'ลองอีกครั้ง');
  f.get('ct-next').fire('click');await tick();assert.deepEqual(statuses,['skipped','skipped']);assert.equal(f.get('ct-root'),undefined);
});
test('stopping an old pending persistence cannot close a newly started tour',async()=>{
  const f=fixture();let resolveOld;await f.start(()=>new Promise(resolve=>{resolveOld=resolve;}));
  f.get('ct-skip').fire('click');f.api.stop();await f.start(async()=>{});
  resolveOld(true);await tick();assert.ok(f.get('ct-root'));assert.equal(f.get('ct-next').disabled,false);f.api.stop();
});
test('keyboard trap stays in controls and Escape persists skipped status',async()=>{
  const f=fixture(),statuses=[];await f.start(async status=>statuses.push(status));let prevented=false;
  f.doc.fire('keydown',{key:'Tab',preventDefault(){prevented=true;}});assert.equal(prevented,true);assert.equal(f.doc.activeElement,f.get('ct-skip'));
  f.doc.fire('keydown',{key:'Escape',preventDefault(){}});await tick();assert.deepEqual(statuses,['skipped']);assert.equal(f.get('ct-root'),undefined);
});
test('custom tutorial copy is rendered as text rather than executable HTML',async()=>{
  const f=fixture();await f.api.start({targets:[{selector:'#one',title:'<img src=x onerror=attack()>',text:'<script>attack()</script>'}],finish:async()=>{}});
  assert.equal(f.get('ct-title').textContent,'<img src=x onerror=attack()>');assert.equal(f.get('ct-title').children.length,0);f.api.stop();
});
test('absent targets exit after a bounded wait and cancellation clears pending discovery',async()=>{
  const f=fixture({targets:[]});const absent=await f.api.start({targets:['#absent'],finish:async()=>{throw new Error('Must not finish');}});
  assert.equal(absent,false);assert.equal(f.get('ct-root'),undefined);
  const pending=f.api.start({targets:['#absent']});f.api.stop();assert.equal(await pending,false);
});
test('paper styles preserve compact mobile flow, keyboard focus, and reduced motion',()=>{
  assert.match(css,/\.ac-screen\{[^}]*overflow:auto/);assert.match(css,/100dvh/);assert.match(css,/safe-area-inset-bottom/);
  assert.match(css,/\.ac-dob\{display:grid;grid-template-columns:minmax\(0,1fr\)/);
  assert.match(css,/button:focus-visible/);assert.match(css,/prefers-reduced-motion:reduce/);
  assert.match(css,/\.ac-primary\{flex:none/);assert.match(css,/\.ac-actions>\.ac-primary\{flex:1\}/);
  assert.match(css,/\.ac-error\[hidden\]\{display:block!important;visibility:hidden\}/);
  assert.match(css,/\.ct-scrim\{[^}]*rgba\(0,0,0,\.88\)/);assert.match(css,/\.ct-hole\{[^}]*background:transparent/);
  assert.doesNotMatch(css,/backdrop-filter|url\(/);
});
