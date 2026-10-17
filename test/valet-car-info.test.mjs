import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
/* AI กรอกข้อมูลรถให้จากที่ผู้ใช้พูด (car_info) + เครื่องมือต้นทุนไม่ตันเมื่อยังไม่มีข้อมูล */
const valet=readFileSync(new URL('../valet.js',import.meta.url),'utf8'),chat=readFileSync(new URL('../chat.html',import.meta.url),'utf8'),fa=readFileSync(new URL('../feature-ai.js',import.meta.url),'utf8');

test('car_info: allowed action, whitelisted fields only, user confirms on a card, merges into existing details',()=>{
  assert.match(valet,/const ACTS=\[[^\]]*"car_info"/);
  assert.match(valet,/const INFO_K=\["trim","engine","engine_code","model_year","gear","fuel","drive","tire","vin","plate","province"\];/);
  assert.match(valet,/if\(o\.do==="car_info"\)INFO_K\.forEach/);
  assert.match(valet,/data-va="info" data-car=/,'saving needs the user to press the button');
  assert.match(valet,/c\.info=\{\.\.\.\(c\.info\|\|\{\}\),\.\.\.add\};/,'other saved details are kept');
  assert.match(valet,/\/\^\[A-HJ-NPR-Z0-9\]\{17\}\$\/\.test\(add\.vin\)/,'VIN checked before saving');
});

test('cost analysis with no saved costs sends the user to the cost log instead of a dead end',()=>{
  assert.match(fa,/\{code:'no_cost'\}\)/);
  assert.match(chat,/if\(e\.code==="no_cost"\)\{/);
  assert.match(chat,/location\.href="\/garage\/"\+encodeURIComponent\(c\.id\)\+"\/cost"/);
});
