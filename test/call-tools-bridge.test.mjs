import {test} from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';
const source=await readFile(new URL('../call-tools.js',import.meta.url),'utf8');
test('engine tools create through an explicit session bridge, no devices, fetch or global call state at startup',async()=>{
  const nodes=new Map(),removed=[];const element=id=>{if(!nodes.has(id))nodes.set(id,{hidden:true,classList:{remove(){}},remove(){removed.push(id)}});return nodes.get(id)};
  let resources=0;const window={};vm.runInNewContext(source,{window,document:{getElementById:element,createElement:()=>({getContext:()=>({})})},cancelAnimationFrame(){},Uint8ClampedArray,fetch(){resources++;throw Error('Unexpected network')},navigator:{mediaDevices:{getUserMedia(){resources++;throw Error('Unexpected mic')}}}});
  const tools=window.CallTools.create({voice:{callActive:false},language:'th'});
  assert.equal(tools.busy,false);assert.equal(tools.holdMic,false);assert.match(tools.prompt(),/listen_engine/);assert.match(tools.prompt(),/scan_engine_bay/);
  await tools.listen();await tools.scan();assert.equal(resources,0);tools.dispose();assert.ok(removed.includes('ctTools'));
});
