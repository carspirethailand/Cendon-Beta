import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
/* เจ้าของระบบในแอป (index.html) และ Cendon Experience (admin.html) + คำตัดสินใบสมัคร 3 แบบ */
const home=readFileSync(new URL('../index.html',import.meta.url),'utf8');
const admin=readFileSync(new URL('../admin.html',import.meta.url),'utf8');
const part=(src,a,b)=>src.slice(src.indexOf(a),src.indexOf(b,src.indexOf(a)));

test('review sheet: ไม่ผ่าน · ให้แก้ · อนุมัติ for admins, plus owner-only test approval',()=>{
  assert.match(home,/<button class="btn s rv-ban" id="rvBan">ไม่ผ่าน<\/button><button class="btn s" id="rvNo">ให้แก้<\/button><button class="btn p" id="rvOk" disabled>อนุมัติ<\/button>/);
  assert.match(home,/\$\("rvNo"\)\.disabled=\$\("rvBan"\)\.disabled=!\(ME&&ME\.admin\)\|\|ME\.uid===a\.uid;/,'moderators and self-review stay locked');
  assert.match(home,/\$\("rvBan"\)\.onclick=e=>\{if\(why\(\)&&confirm\([^)]*\)\)go\("decline",e\.currentTarget\)\};/,'decline needs a reason and a confirmation');
  assert.match(home,/\$\{ME&&ME\.owner\?`<div class="rv-test"><button class="btn s w" id="rvTest"/,'test approval only renders for the owner');
  assert.match(home,/decision:"approve_test"/);
});

test('applicant status page knows ไม่ผ่าน (declined): no resubmit button, shows the reason',()=>{
  const sp=part(home,'function statusPage(a,fresh,pv){','function previewStatus');
  assert.match(sp,/st==="declined"\?`<div class="err"/);
  assert.match(sp,/foot:st==="rejected"\?'<button class="btn p w" id="sFix">/,'only ให้แก้ offers resubmission');
  assert.match(home,/declined:"ไม่ผ่าน"/);
});

test('a trial shop (test approval) lets a non-staff applicant into Studio',()=>{
  assert.match(home,/if\(ME&&\(ME\.staff\|\|ME\.technician\)\)m\.push\("tech"\);/);
  assert.match(home,/function openStudio\(\)\{\n  if\(!U\)return needLogin\(\);\n  const t=ME&&ME\.technician;\n  if\(!t\)return openJoin\(\);/);
});

test('owner tools: storefront crown menu, service edit/delete, review hide — and shop edits send only what changed',()=>{
  assert.match(home,/\$\{ME&&ME\.owner\?`<button class="lx-gh lx-ic" id="bBoss"/);
  assert.match(home,/function bossMenu\(t\)\{/);
  assert.match(home,/const d=mine\?null:km\(HERE,t\),av=t\.avatar,boss=!mine&&!!\(ME&&ME\.owner\);/);
  assert.match(home,/edit:\(\)=>gigForm\(g,boss\?\{tech:t\.id\}:null\)/);
  assert.match(home,/addPhotos:part,\.\.\.\(boss&&!id\?\{tech:opt\.tech\}:\{\}\)/);
  assert.match(home,/if\(boss\)\{const ch=\{tech:t\.id\};for\(const\[k,v\]of Object\.entries\(body\)\)if\(JSON\.stringify\(v\)!==JSON\.stringify\(start\[k\]\)/,'hidden fields are never wiped');
  assert.match(home,/if\(!SHOPED\.base\)SHOPED\.base=/,'baseline survives the location picker redraw');
  assert.match(home,/api\("\/api\/tech\/reviews\/hide",\{body:\{job:x\.dataset\.hide\}\}\)/);
  assert.match(home,/else if\(oc&&!oc\.owner&&!oc\.boss&&ME&&ME\.owner\)/,'deep-linked pages redraw once the owner is known');
  assert.equal((home.match(/id="sN"/g)||[]).length,1,'shop-name input id is unique (staff badge renamed)');
});

test('Cendon Experience: the owner role sees every page and skips the NDA',()=>{
  const src=part(admin,'const ROLE_RANK=','let auth=null')+';function rank(r){return ROLE_RANK[r]||0};this.setMe=m=>{me=m};';
  const c={window:{}};vm.createContext(c);vm.runInContext('let me=null;'+src,c);
  c.setMe({uid:'o',role:'owner',pos:'staff'});for(const m of ['finance','config','audit','recruit','system'])assert.equal(c.can(m),true,m);
  c.setMe({uid:'s',role:'moderator',pos:'staff'});assert.equal(c.can('finance'),false);
  assert.match(admin,/function ndaNeeded\(tab\)\{ return !!NDA_AREAS\[tab\]&&!NDA_OK&&!\(me&&me\.role==="owner"\) \}/);
});

test('applicants can cancel: status page (รอตรวจ/ให้แก้) and a non-staff trial shop in Studio settings',()=>{
  const sp=part(home,'function statusPage(a,fresh,pv){','function previewStatus');
  assert.match(sp,/!pv&&\(st==="pending"\|\|st==="rejected"\)\?`<button class="lx-gh ss-wd" id="sWd"/,'never offered for declined or in staff previews');
  assert.match(home,/t\.test&&!\(ME&&ME\.staff\)\?`<section class="ss-g">[\s\S]{0,200}id="ssWd"/);
  const wd=part(home,'function withdrawApp(btn){','function statusPage');
  assert.match(wd,/if\(!confirm\(/,'asks before deleting');
  assert.match(wd,/api\("\/api\/tech\/apply\/withdraw",\{body:\{\}\}\)/);
  assert.match(wd,/if\(MODE==="tech"\)setMode\("customer"\)/,'leaves Studio once the trial shop is gone');
});
