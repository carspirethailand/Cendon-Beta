import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
/* หน้าหมวดช่าง: เรียงลำดับ · ร้านที่เหมาะที่สุด (คะแนนจากข้อมูลจริง) · แผนที่อยู่ในหน้าหมวด ไม่อยู่ในแถวหมวด */
const home=readFileSync(new URL('../index.html',import.meta.url),'utf8'),chat=readFileSync(new URL('../chat.html',import.meta.url),'utf8');
const part=(a,b)=>home.slice(home.indexOf(a),home.indexOf(b,home.indexOf(a)));

test('best match scores only measurable facts and explains itself in two short reasons',()=>{
  const src=part('function matchOf(t,car){','const CAT_SORTS');
  const c={T:(th)=>th,distTxt:d=>d+" กม."};vm.createContext(c);vm.runInContext(src+';this.matchOf=matchOf;',c);
  const open={online:true,dist:2,reviewCount:20,rating:4.9,jobs:40,verified:true,brands:['Toyota']};
  const closed={online:false,dist:25,reviewCount:0,jobs:0};
  assert.ok(c.matchOf(open,'toyota vios').sc>c.matchOf(closed,'toyota vios').sc);
  const m=c.matchOf(open,'toyota vios');assert.equal(m.why.length,2);assert.equal(m.why[0],'ถนัดรถของคุณ');
  assert.equal(c.matchOf(closed,'').why.length,0,'nothing measurable → no badge');
});

test('category page: sort menu, map toggle, best line inside the top card (no extra box)',()=>{
  assert.match(home,/<select id="catSort" aria-label="เรียงตาม"><\/select>/);
  assert.match(home,/<button type="button" class="lx-gh lx-mapt" id="catMapT" aria-pressed="false">/);
  assert.match(home,/<div class="lx-catmap" id="catMap" hidden><\/div>/);
  assert.doesNotMatch(home,/id="catBest"/);
  assert.match(home,/\$\{t\._best\?`<small class="lx-pbest">/);
  assert.match(home,/RAIL\.filter\(c=>c\.id!=="map"\)\.map\(c=>`<button type="button" data-k="\$\{c\.id\}">/,'the map is not a category icon any more');
  assert.match(home,/\$\("sugMap"\)\.onclick=\(\)=>setView\("map"\);/);
});

test('chat welcome stays the original layout (no car-app card)',()=>{
  assert.doesNotMatch(chat,/wCarApp|renderCarApp/);
});
