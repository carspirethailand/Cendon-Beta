import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
/* หน้า "รับช่าง" ใน Cendon Experience (admin.html) + ลิงก์ลึกไปหน้าตรวจเต็มในแอป (index.html) */
const admin=readFileSync(new URL('../admin.html',import.meta.url),'utf8');
const home=readFileSync(new URL('../index.html',import.meta.url),'utf8');
const part=(src,a,b)=>src.slice(src.indexOf(a),src.indexOf(b,src.indexOf(a)));

test('every team position sees the recruitment page, regardless of its module list',()=>{
  const src=part(admin,'const ROLE_RANK=','let auth=null')+';function rank(r){return ROLE_RANK[r]||0};this.setMe=m=>{me=m};this.POSMAP=POSMAP;';
  const c={window:{}};vm.createContext(c);vm.runInContext('let me=null;'+src,c);
  for(const pos of ['staff','support','head_ai','head_ops','cto','cfo','coo','cmo','ceo']){
    c.setMe({uid:'u_'+pos,role:'moderator',pos});
    assert.equal(c.can('recruit'),true,pos+' must see รับช่าง');
  }
  c.setMe({uid:'u_staff',role:'moderator',pos:'staff'});assert.equal(c.can('finance'),false,'other modules still follow the position');
  c.setMe({uid:'cust',role:'user'});assert.equal(c.can('recruit'),false,'customers never see it');
});

test('recruitment page sits behind the NDA and its menu item exists with a pending badge',()=>{
  assert.match(admin,/<a data-tab="recruit" data-mod="recruit">[\s\S]{0,80}id="rcBadge"/);
  assert.match(admin,/<section class="view" id="v-recruit">/);
  assert.match(admin,/NDA_AREAS=\{[\s\S]{0,200}recruit:/,'applicant identity data needs the confidentiality signature first');
  assert.match(admin,/if\(t==="recruit"\)loadRecruit\(\);else rcHideDocs\(\);/,'leaving the page removes document images from the screen');
});

test('the page reads only the staff application API, escapes applicant text, and hands decisions to the full review',()=>{
  const js=part(admin,'/* ═══════════ รับช่าง ═══════════','/* ═══════════ สอน AI');
  assert.match(js,/api\("\/api\/tech\/applications"\)/);assert.match(js,/api\("\/api\/tech\/docs\?uid="\+encodeURIComponent\(uid\)\)/);
  assert.doesNotMatch(js,/\/api\/tech\/review"|\/api\/tech\/review\/idcheck|\/api\/tech\/moderate/,'no approve/reject/ID-check calls from this page — those live in the full review');
  assert.match(js,/href="\/staff\/review\/\$\{encodeURIComponent\(a\.uid\)\}"/);
  for(const f of ['a.name','a.shop','a.about','a.email','f.msg'])assert.ok(js.includes('esc('+f),f+' must be escaped');
  assert.doesNotMatch(js,/localStorage|sessionStorage/,'applicant data is never stored on the device');
});

test('AI result buckets: missing or failed AI means a human looks, a blocking flag means the applicant must fix',()=>{
  const js=part(admin,'const RC_AI=','function rcAgo');const c={};vm.createContext(c);vm.runInContext(js+';this.rcKind=rcKind;',c);
  assert.equal(c.rcKind({ai:null}),'review');
  assert.equal(c.rcKind({ai:{status:'error'}}),'review');
  assert.equal(c.rcKind({ai:{status:'complete',verdict:'pass',flags:[]}}),'pass');
  assert.equal(c.rcKind({ai:{status:'complete',verdict:'pass',flags:[{block:true}]}}),'fail');
});

test('app deep links: /staff/review/<uid> opens that application, /staff/review opens the list (longer routes registered first)',()=>{
  const iUid=home.indexOf('Nav.route({path:"staff/review/:uid"'),iList=home.indexOf('Nav.route({path:"staff/review"'),iStaff=home.indexOf('Nav.route({path:"staff",');
  assert.ok(iUid>0&&iList>0&&iStaff>0);assert.ok(iUid<iList&&iList<iStaff,'first matching route wins, so longer paths must come first');
  assert.match(home,/async function reviewList\(open\)\{/);
  assert.match(home,/if\(want\)reviewOne\(want\);else if\(typeof open==="string"\)toast\(/);
});
