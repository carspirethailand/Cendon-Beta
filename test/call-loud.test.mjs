/* เสียง AI ในสายดังชัด: บีบช่วงเสียง + ขยาย + กันแตกแบบนุ่ม ก่อนออกลำโพง · มิเตอร์อยู่ก่อนขยาย · ไม่บังคับเส้นทางเสียง (ลำโพงใหญ่เป็นค่าเริ่มต้นของเบราว์เซอร์มือถือ) */
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const src=readFileSync(new URL('../call-session.js',import.meta.url),'utf8');
const part=(a,b)=>src.slice(src.indexOf(a),src.indexOf(b,src.indexOf(a)));

function chain(ctx){
  const c=vm.createContext({Math,Float32Array});
  vm.runInContext(part('const AI_BOOST=','/* เสียง AI 24kHz')+';this.loudChain=loudChain;',c);
  return c.loudChain;
}
function fakeCtx(){
  const links=[],node=kind=>{const n={kind,connect(t){links.push([kind,t.kind]);return t}};return n};
  const param=()=>({value:0});
  return {links,ctx:{
    createDynamicsCompressor(){return Object.assign(node('comp'),{threshold:param(),knee:param(),ratio:param(),attack:param(),release:param()})},
    createGain(){return Object.assign(node('boost'),{gain:param()})},
    createWaveShaper(){return Object.assign(node('clip'),{curve:null,oversample:'none'})}},node};
}

test('AI voice goes meter → compressor → boost → soft clip → speaker, and falls back to a direct line on old devices',()=>{
  const loud=chain(),{ctx,links,node}=fakeCtx(),meter=node('meter');
  const out=loud(ctx,meter);
  assert.equal(out.kind,'clip');
  assert.deepEqual(links,[['meter','comp'],['comp','boost'],['boost','clip']]);
  /* เครื่องที่ไม่มี DynamicsCompressor = ต่อตรงแบบเดิม ไม่เงียบ */
  const old=node('meter2');assert.equal(loud({createDynamicsCompressor(){throw Error('no')}},old),old);
  /* ต่อเข้า startCall จริง: มิเตอร์วงกลมรับเสียงก่อนขยาย ภาพและตัวกันเสียงสะท้อนอ่านระดับเดิม */
  assert.match(src,/playGain\.connect\(playAnalyser\);loudChain\(playCtx,playAnalyser\)\.connect\(playCtx\.destination\);/);
  assert.doesNotMatch(src,/playAnalyser\.connect\(playCtx\.destination\)/);
});

test('settings measured in Chromium: quiet speech comes up ~10 dB, loud speech never clips',()=>{
  assert.match(src,/comp\.threshold\.value=-38;comp\.knee\.value=10;comp\.ratio\.value=6;comp\.attack\.value=\.003;comp\.release\.value=\.15;/);
  assert.match(src,/const AI_BOOST=2\.7,CLIP_RANGE=2;/);
  assert.match(src,/boost\.gain\.value=AI_BOOST\/CLIP_RANGE;clip\.curve=softClip;clip\.oversample="2x";/);
  const loud=chain(),{ctx,node}=fakeCtx(),out=loud(ctx,node('m')),curve=out.curve,n=curve.length,R=2;
  assert.equal(n%2,1,'odd length keeps 0 → 0');assert.equal(curve[(n-1)/2],0);
  for(let i=1;i<n;i++)assert.ok(curve[i]>=curve[i-1],'monotonic: louder in never comes out quieter');
  for(let i=0;i<n;i++){const r=(i/((n-1)/2)-1)*R;if(Math.abs(r)<=.8)assert.ok(Math.abs(curve[i]-r)<1e-6,'untouched below 0.8')}
  assert.ok(Math.max(...curve.map(Math.abs))<=.98+1e-6,'ceiling below full scale');
});

test('louder playback raises the echo-gate floor, and iPhone audio mode is restored after hanging up',()=>{
  assert.match(src,/const th=Math\.max\(0\.06,echoLv\*2\.4\);/);
  const end=part('function endCall(){','/* แตะตรงไหนก็ได้');
  assert.match(end,/navigator\.audioSession\.type==="play-and-record"\)setTimeout\(\(\)=>\{try\{if\(!callActive&&!callConnecting\)navigator\.audioSession\.type="auto"\}/);
  /* ไม่บังคับเส้นทางเสียงเอง: ไม่มี setSinkId/เลือกไมค์เฉพาะ — มือถือเลือกลำโพงใหญ่เอง และหูฟัง/บลูทูธที่ต่ออยู่ยังใช้ได้ */
  assert.doesNotMatch(src,/setSinkId|deviceId:\s*\{\s*exact/);
});
