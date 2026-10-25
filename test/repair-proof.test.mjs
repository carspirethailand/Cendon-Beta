import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
/* หลักฐานการซ่อม · งานค้าง · ลูกค้าไม่ตอบ · ผลงานบนหน้าร้าน · แจ้งร้าน · งบในประกาศ — รวมเข้ากับของเดิม ไม่มีแท็บ/หน้าใหม่ */
const r=f=>readFileSync(new URL('../'+f,import.meta.url),'utf8');
const home=r('index.html'),pf=r('repair-proof.js');

test('the job sheet hosts repair proof and the plain-language summary (no new page or tab)',()=>{
  assert.match(home,/<script src="repair-proof\.js\?v=1" defer><\/script>/);
  assert.match(home,/\$\{window\.CendonProof\?CendonProof\.card\(j\):""\}/);
  assert.match(home,/CendonProof\.wire\(b\.querySelector\("#pfBox"\),j,ctx\);CendonProof\.plain\(b\.querySelector\("#plBox"\),j,ctx\)/);
  assert.match(r('sw.js'),/'\.\/repair-proof\.js\?v=1'/);
});

test('parts jobs: the quote says which parts, and "Finished" waits for all three clips',()=>{
  assert.match(home,/const partsRead=px=>\(\{partsNote:/);
  assert.match(home,/change\(j,"quote",\{labor:\+\$\("qL"\)\.value\|\|0,parts:\+\$\("qP"\)\.value\|\|0,travel:\+\$\("qT"\)\.value\|\|0,\.\.\.partsRead\("q"\)/);
  assert.match(home,/\/offer`,\{body:\{labor:\+\$\("oL"\)\.value\|\|0,parts:\+\$\("oP"\)\.value\|\|0,travel:\+\$\("oT"\)\.value\|\|0,\.\.\.partsRead\("o"\)/);
  assert.match(home,/if\(a==="done"&&window\.CendonProof&&CendonProof\.missing\(j\)\.length\)\{/);
  assert.match(pf,/function missing\(j\)\{const p=j\.proof;if\(!p\|\|!p\.need\)return \[\];/);
});

test('the recorder films live in the app (no gallery), stamps time and job number, 3–8 s, frames for the AI',()=>{
  assert.match(pf,/navigator\.mediaDevices\.getUserMedia\(\{video:\{facingMode:\{ideal:"environment"\}/);
  assert.doesNotMatch(pf,/type="file"|accept="video/,'no picking clips from the gallery');
  assert.match(pf,/const MIN=3000,MAX=8000;/);
  assert.match(pf,/`Cendon · \$\{L\("ใบงาน","Job"\)\} #\$\{String\(j\.id\)\.slice\(0,6\)\.toUpperCase\(\)\}/);
  assert.match(pf,/body:\{shot,media:id,frames:frames\.slice\(0,3\),\.\.\.\(pos\|\|\{\}\)\}/);
  /* ตำแหน่ง: ไม่เด้งขออนุญาตกลางขั้นตอน และไม่ค้าง */
  assert.match(pf,/\(await navigator\.permissions\.query\(\{name:"geolocation"\}\)\)\.state!=="granted"\)return null/);
  assert.match(pf,/AI ดูว่าคลิปตรงกับขั้นตอน และอ่านเลขบนกล่อง — ไม่ได้ตรวจว่าอะไหล่แท้หรือปลอม/,'honest about what the AI can do');
});

test('owners decide per clip whether a shop may showcase it, and can withdraw',()=>{
  assert.match(pf,/data-pf-sc="showcase_ok:\$\{esc\(x\.media\)\}"/);
  assert.match(pf,/data-pf-sc="showcase_no:\$\{esc\(x\.media\)\}">\$\{L\("ถอนการอนุญาต","Withdraw"\)\}/);
  assert.match(home,/fetch\(API\+"\/api\/tech\/showcase\?tech="\+encodeURIComponent\(t\.id\)\)/);
});

test('customer silence, open-job cap and confirming the job stand in for payment for now',()=>{
  assert.match(home,/if\(cust&&\(s==="done"\|\|s==="disputed"&&j\.noreplyAt\)\)A\.push\(\["complete","ตรวจแล้ว งานเรียบร้อย","p"\]\);/);
  assert.match(home,/if\(tech&&!cust&&s==="done"&&j\.noreplyFrom&&Date\.now\(\)>=j\.noreplyFrom\)more\.unshift\(\["noreply","ลูกค้าไม่ตอบ"\]\);/);
  assert.match(home,/const TS=TECHS\.filter\(t=>!isMine\(t\)&&!t\.full&&!t\.vacation\);/,'urgent calls skip full and paused shops');
  assert.match(home,/<p class="stu-cap\$\{openN>=capN\?" full":""\}">/);
  assert.match(home,/if\(t\.full\)sc-=40;/);
});

test('proven work, reports, budgets and Passport clips',()=>{
  assert.match(home,/sc\+=Math\.min\(20,t\.proven\*2\)\+Math\.min\(15,inCat\*5\)/);
  assert.match(home,/await api\("\/api\/tech\/report",\{body:\{techId,jobId:jobId\|\|undefined,reason:/);
  assert.match(home,/usedOk:\$\("pUsed"\)\.checked/);
  assert.match(home,/body:\{tool:"budget",lang:LANG/);
  const pp=r('passport.html');
  assert.match(pp,/"\/api\/tech\/passport\/"\+encodeURIComponent\(token\)\+"\/media\/"\+encodeURIComponent\(c\.media\)/);
  assert.match(r('admin.html'),/await api\("\/api\/tech\/reports\/decide",\{body:\{id:\+id,outcome,note:note\.trim\(\)\}\}\)/);
});
