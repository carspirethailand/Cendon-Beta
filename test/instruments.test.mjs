/* เครื่องมือฟังเสียง · สแกนห้องเครื่อง · คำถามว่ารถคันไหน (โฉม "เครื่องมือวัด")
   ไม่ถามก่อนเริ่ม · หน้าปัดเสียงชุดเดียวทั้งในสายและหน้าฟังเสียงรถ · สแกนใช้หมุดแทนกล่อง · หน้าฟังเสียงไม่บังคับเลือกตำแหน่ง */
import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
const r=f=>readFileSync(new URL('../'+f,import.meta.url),'utf8');
const tools=r('call-tools.js'),home=r('index.html'),css=r('call-ui.css');

test('one shared sound dial: time goes around (one turn per recording), frequency outward, loudness as colour, light and dark palettes',()=>{
  const w={};vm.runInNewContext(r('sound-lens.js'),{window:w});const L=w.CendonLens;
  assert.deepEqual(Object.keys(L).sort(),['base','slice','tick']);
  const calls=[];const g=new Proxy({},{get:(t,k)=>k==='beginPath'?()=>calls.push('path'):()=>{},set:(t,k,v)=>{t[k]=v;return true}});
  const G=L.base({clientWidth:300,getContext:()=>g},{light:true});assert.equal(G.light,true);assert.equal(G.tick,0);
  L.slice(G,new Uint8Array(1024).fill(200),23.4,0,.5);assert.ok(G.tick>=50,'ticks fill as the hand passes');
  assert.match(tools,/const LENS=window\.CendonLens;/);assert.match(home,/CendonLens\.base\(cv,\{light:light\(\)\}\)/);
});

test('in-call listening never stops to ask: car pill + countdown that pauses only while the car sheet is open',()=>{
  assert.match(tools,/VA\.bind\('ctVehicle',saved,v=>\{selected=v\},\{cars:host\.getCars\?\.\(\)\|\|\[\],lang,host:el,onOpen:\(\)=>\{paused=true\},onClose:\(\)=>\{paused=false\}\}\);/);
  assert.match(tools,/if\(!paused\)pre\+=dt;/);
  assert.doesNotMatch(tools,/ctStartEar|ctChooseError|ก่อนฟังเสียงรถ/);
  for(const f of ['index.html','chat.html'])assert.match(r(f),/getCars:\(\)=>/,f);
});

test('engine-bay scan marks parts with numbered pins and small tags — no filled boxes; hazards come from the scanner only',()=>{
  assert.match(tools,/el\.innerHTML='<span class="lv-pin"><b><\/b><\/span><span class="lv-tag"><em><\/em><\/span>'/);
  assert.match(tools,/el\.classList\.toggle\('warn',x\.hazard!=='observe'\)/);
  assert.doesNotMatch(tools,/กรอบแดง/);
  assert.match(tools,/หมุด = ตำแหน่งที่ AI เห็น ไม่ได้แปลว่าชำรุด/);
  assert.match(css,/\.hearth \.lv-box\{background:transparent;box-shadow:none/);
  /* แผ่นรายละเอียด: ก่อนหน้า/ถัดไป ปิดแล้วการ์ดกลับมา */
  assert.match(tools,/function closeDet\(\)\{LV\.pick=-1;/);assert.match(tools,/else if\(!LV\.busy&&LV\.pick<0\)\{\$\('lvChips'\)\.hidden=false;\}/);
});

test('listen page: record first, where-is-it comes after the clip and can be skipped (sent as "not sure")',()=>{
  const lp=home.slice(home.indexOf('function listenPage(){'),home.indexOf('\n}\n',home.indexOf('function listenPage(){')));
  assert.match(lp,/\$\("lpWhere"\)\.hidden=!clip;/);
  assert.match(lp,/const A=LP_AREA\.find\(x=>x\[0\]===\(area\|\|"unsure"\)\)/);
  assert.match(lp,/T\("ส่งโดยไม่ระบุตำแหน่ง","Send without a location"\)/);
  assert.doesNotMatch(lp,/need\("lpS2"\)/,'no forced area step');
  /* แตะจุดบนรถกับรายการใช้เลขเดียวกัน */
  for(const k of ['engine','ac','front','cabin','under','rear','exhaust'])assert.match(home,new RegExp(`${k}:"\\d"`));
});

test('car sheet and pill read well in both themes (light mode used to show white text on white)',()=>{
  const v=r('vehicle-audio.css');
  assert.match(v,/html\[data-theme="light"\] \.va-pick,html\[data-theme="light"\] \.va-sheet\{[^}]*--va-ink:#09090B/);
  assert.match(v,/\.va-pill\{[^}]*color:var\(--va-ink\)/);
  assert.match(css,/\.hearth\.light\{--ct-bg:#FAFAF9;/);
});
