import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
/* feedback รอบ 5: ฟอร์มหาช่างเป็นหมวด · งบก่อนอะไหล่มือสอง · หมุดบนบก+รัศมี · ติ๊กวงกลมขาว · สลับร้านทดสอบ/จริง · แชตกลับหน้าเดิม · LINE ไม่ค้าง */
const r=f=>readFileSync(new URL('../'+f,import.meta.url),'utf8').replace(/\r\n/g,'\n');
const home=r('index.html'),line=r('cendon-line.js'),stab=r('stability.css');

test('post form is split into 3 numbered sections; the GPS button lives inside the map',()=>{
  assert.match(home,/const sec=\(n,title,body\)=>`<section class="fsec"><h3 class="fsec-h"><span class="fsec-n">\$\{n\}<\/span>\$\{title\}<\/h3>\$\{body\}<\/section>`;/);
  assert.match(home,/sec\(1,T\("รถและอาการ","Car & problem"\)/);assert.match(home,/sec\(2,T\("ที่ไหน เมื่อไร","Where & when"\)/);
  assert.match(home,/contactForm\(\{sym:sym\?\?\$\("q"\)\.value\.trim\(\),mobile:true,carId:d\.carId,photos:d\.photos,sections:true,needGps:true,/);
  assert.match(home,/<button type="button" class="pk-gps" id="bGps"/);
  assert.doesNotMatch(home,/id="bGps" style="margin-top:8px;min-height:44px"/,'no full-width GPS button any more');
});

test('used-parts option only appears once the budget has a number, and is never sent without one',()=>{
  assert.match(home,/<label class="chk pb-used" id="pUsedRow" hidden><input type="checkbox" id="pUsed"\/>/);
  assert.match(home,/const used=\(\)=>\{const on=\(\+inp\.value\|\|0\)>0;\$\("pUsedRow"\)\.hidden=!on;if\(!on\)\$\("pUsed"\)\.checked=false\};/);
  assert.match(home,/usedOk:bud>0&&\$\("pUsed"\)\.checked/);
});

test('pin must be on land and within reach of the phone (urgent 1.5 km, normal 20 km); posts need GPS',()=>{
  assert.match(home,/const PIN_KM=\{urgent:1\.5,normal:20\},WET=\{\};/);
  assert.match(home,/https:\/\/tile\.openstreetmap\.org\/\$\{z\}\/\$\{tx\}\/\$\{ty\}\.png/);
  assert.match(home,/Math\.abs\(d\[i\]-170\)<=8&&Math\.abs\(d\[i\+1\]-211\)<=8&&Math\.abs\(d\[i\+2\]-223\)<=8/,'OSM water colour #aad3df');
  assert.match(home,/const lock=on=>\{if\(on&&why\(\)\)on=false;/,'a bad pin cannot be locked');
  assert.match(home,/L\.map\.setMaxBounds\(ring\.getBounds\(\)\.pad\(\.02\)\)/,'map cannot be dragged far outside the circle');
  assert.match(home,/if\(o\.needGps&&!L\.gps\)bad\.push\(\{id:"bGps"/);
  assert.match(home,/else if\(L\.water\)bad\.push\(/);
  assert.match(home,/\.\.\.\(L\.gps\?\{gps:\{lat:L\.gps\.lat,lng:L\.gps\.lng,acc:Math\.round\(L\.gps\.acc\|\|0\)\}\}:\{\}\)/);
  assert.match(home,/const cf=contactForm\(\{urgent:true,noSym:true,needGps:true,/);
  assert.match(home,/res\(\{\.\.\.HERE,acc:Math\.round\(p\.coords\.accuracy\|\|0\)\}\)/);
});

test('every checkbox in the app is a white circle; on/off switches are left alone',()=>{
  assert.match(stab,/input\[type=checkbox\]:not\(\.switch input\):not\(\.lx-sw input\)\{\n  -webkit-appearance:none!important;appearance:none!important;/);
  assert.match(stab,/border-radius:50%!important;/);assert.match(stab,/background:#fff center\/15px 15px no-repeat!important;/);
  for(const f of ['index.html','garage.html','news.html','spares.html','profile.html','chat.html','admin.html','login.html','handbook.html'])assert.match(r(f),/stability\.css/,f+' loads the shared checkbox style');
});

test('service photos are shrunk to JPEG before upload (big PNG crops used to block posting a service)',()=>{
  assert.match(home,/F2\.add\.push\(\{data:await shrink\(f,1920\)\}\)/);
  assert.doesNotMatch(home,/asData\(/);
});

test('owner can switch a shop between test and real from the storefront owner tools',()=>{
  assert.match(home,/\$\{t\.test\?row\("oMode","ti-rosette-discount-check"/);
  assert.match(home,/await api\("\/api\/tech\/shop-mode",\{body:\{id:t\.id,test:!real,note\}\}\)/);
});

test('chat tab from another page: home stays hidden until the inbox shows, and closing returns to that page',()=>{
  assert.match(home,/if\(\/\^\\\/messages\(\\\/\|\$\)\/\.test\(location\.pathname\)\)\{document\.documentElement\.classList\.add\("ib-boot"\)/);
  assert.match(home,/html\.ib-boot #top,html\.ib-boot \.view,html\.ib-boot #ibFab\{visibility:hidden!important\}/);
  assert.match(home,/var IB_FROM=/);
  assert.match(home,/if\(st&&st\.nav&&st\.k!=="root"\)history\.go\(-2\);else location\.replace\(to\);return\}/);
  /* แผ่นข้อความขึ้นเต็มจอทันที ไม่เลื่อนจากล่าง แล้วค่อยเปิดหน้าข้างหลัง — เดิมหน้าแรกโผล่ระหว่างแผ่นเลื่อนขึ้น */
  assert.match(home,/html\.ib-boot \.bs \.pn,html\.ib-boot \.bs \.bg\{transition:none!important\}/);
  assert.match(home,/if\(de\.classList\.contains\("ib-boot"\)\)\{void \$\("bs"\)\.offsetHeight;de\.classList\.remove\("ib-boot"\)\}/);
});

test('LINE card paints at once from the last known state and never keeps asking to connect after linking',()=>{
  assert.match(line,/const KEY=uid=>"cendon_line_st:"\+uid;/);
  assert.match(line,/try\{await status\(!st\|\|!st\.linked\)\}catch\(e\)\{\}/);
  assert.match(line,/window\.CendonLine=\{refresh:/);
  assert.match(home,/const done=r=>\{if\(window\.CendonLine\)CendonLine\.refresh\(\);return sheet\(/);
  for(const f of ['index.html','garage.html','news.html','spares.html','profile.html','chat.html','sw.js'])assert.match(r(f),/cendon-line\.js\?v=5/,f);
});
