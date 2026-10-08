import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const source=readFileSync(new URL('../fluid.js',import.meta.url),'utf8');
function fixture({reduced=false,running=false,visible=true}={}){
  const calls=[];
  class Element{animate(frames,options){calls.push({frames,options})}getAnimations(){return running?[{playState:'running'}]:[]}getBoundingClientRect(){return {left:0,top:0,width:visible?320:0,height:400}}}
  const window={Element},element=new Element();
  const sandbox={window,Element,document:{body:{}},innerWidth:360,innerHeight:800,Date,WeakSet,
    addEventListener(){},matchMedia:()=>({matches:reduced}),MutationObserver:class{observe(){}}};
  vm.runInNewContext(source,sandbox);return {calls,open:()=>window.cendonFluid(element)};
}
test('popup motion is short and visible from its first frame, without layout/filter animation',()=>{
  const f=fixture();f.open();const {frames,options}=f.calls[0];assert.equal(options.duration,180);
  assert.ok(frames[0].opacity>=.9);assert.ok(Number(frames[0].scale)>.98);
  assert.ok(frames.every(frame=>!('filter' in frame)&&!('borderRadius' in frame)&&!('width' in frame)&&!('height' in frame)));
});
test('existing CSS popup transition is not animated twice',()=>{const f=fixture({running:true});f.open();assert.equal(f.calls.length,0)});
test('reduced-motion preference is respected',()=>{const f=fixture({reduced:true});f.open();assert.equal(f.calls.length,0)});
test('hidden popup does not trigger a presentation animation',()=>{const f=fixture({visible:false});f.open();assert.equal(f.calls.length,0)});
