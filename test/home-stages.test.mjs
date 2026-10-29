import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const r=f=>readFileSync(new URL('../'+f,import.meta.url),'utf8').replace(/\r\n/g,'\n');
const page=r('index.html'),js=r('home-stages.js'),css=r('home-stages.css'),sw=r('sw.js');
const menu=page.slice(page.indexOf('<section class="view menu" id="vMenu"'),page.indexOf('<section class="view lx-cat lx-res" id="vRes"'));
const at=(s,id)=>s.indexOf(`id="${id}"`);

test('home is two stages: AI car check first, call-a-mechanic second, only one shown at a time',()=>{
  assert.match(menu,/id="vMenu" data-stage="ai"/);
  const ai=at(menu,'hmAi'),call=at(menu,'hmCall');assert.ok(ai>0&&call>ai);
  assert.match(menu,/<section class="hm-stage hm-call" id="hmCall" hidden /,'stage 2 starts hidden');
  assert.doesNotMatch(menu.slice(ai,ai+120),/hidden/,'stage 1 starts shown');
  assert.match(css,/#vMenu \.hm-stage\[hidden\]\{display:none!important\}/,'a stage is hidden whole — never scrolled half-way');
});

test('reorganisation only: every existing home element and id is still there',()=>{
  const ids=['hSky','hFlip','hFlipIn','hSearch','hs','hForm','hq','hPhoto','hListen','hVoiceSend','hHint','hToggle','myCar','hQuick','hRail','hPartner','sugList','sugMap','sugAll','staff','active','grid','mapW','miniMap','mwN','fUrgent','fPost','fMulti','fAi','usedBox','list','bJoin','diag','secT','secN'];
  for(const id of ids)assert.equal((menu.match(new RegExp(`id="${id}"`,'g'))||[]).length,1,id);
  /* ซ่อนแบบเดิม: .left/.right ยังเป็นลูกตรงของ #vMenu */
  assert.match(menu,/<\/div>\n  <nav class="hm-dots"[\s\S]*<div class="left">[\s\S]*<div class="right">/);
  assert.match(page,/#vMenu>\.left,#vMenu>\.right\{display:none!important\}/);
});

test('stage 1 holds the AI box, tools and my car; stage 2 holds search, actions, categories, partner and services',()=>{
  const ai=menu.slice(at(menu,'hmAi'),at(menu,'hmCall')),call=menu.slice(at(menu,'hmCall'),menu.indexOf('class="hm-dots"'));
  for(const id of ['hFlip','hForm','hSearch','hTools','myCar','hmNext'])assert.ok(ai.includes(`id="${id}"`),'stage 1: '+id);
  for(const id of ['hmSearch','hs2','hQuick','hRail','hPartner','sugList','sugMap','sugAll','hmBack'])assert.ok(call.includes(`id="${id}"`),'stage 2: '+id);
  for(const id of ['hQuick','hRail','hPartner','sugList'])assert.ok(!ai.includes(`id="${id}"`),id+' is not in stage 1');
  /* ลำดับเดิมที่เทสต์หน้าแรกเดิมถือ: ช่อง AI → รถของฉัน → ปุ่มลัด → หมวด → บริการ */
  const pos=['hForm','myCar','hQuick','hRail','sugList'].map(id=>at(page,id));assert.deepEqual([...pos].sort((a,b)=>a-b),pos);
});

test('quick actions keep every handler: urgent / post / home / quotes (stage 2) and photo / sound / quote / urgent (stage 1)',()=>{
  const q=page.slice(page.indexOf('function drawQuick'),page.indexOf('function urgTap'));
  for(const k of ['post','home','multi','photo','listen','quote'])assert.match(q,new RegExp(`\\["${k}","ti-`),k);
  assert.match(q,/if\(k==="urgent"\)return emergency\(\);if\(k==="multi"\)return openMulti\("",""\);/);
  assert.match(q,/if\(k==="post"\)return openPostForm\("",""\);if\(k==="home"\)return openPostForm\("","",\{home:true\}\);/);
  assert.match(q,/if\(k==="photo"\)return photoPage\(\);/);assert.match(q,/return quotePage\(\)/);assert.match(q,/return listenPage\(\)/);
  assert.match(q,/urgTap\(\$\("hQuick"\)\.querySelector\("\.lx-urg"\),\(\)=>go\("urgent"\)\);/);
  assert.match(q,/urgTap\(\$\("hTools"\)\.querySelector\("\.lx-urg"\),\(\)=>go\("urgent"\)\);/,'the emergency shortcut keeps the first-tap behaviour in stage 1 too');
  assert.match(page,/if\(!\$\("hQuick"\)\.childNodes\.length\|\|!\$\("hTools"\)\.childNodes\.length\)drawQuick\(\);/);
});

test('the search ⇄ AI box still flips; it just opens on AI unless the visitor chose search this session',()=>{
  assert.match(page,/sessionStorage\.getItem\("spire_heroAi"\)!=="0"/);
  assert.match(page,/sessionStorage\.setItem\("spire_heroAi",ai\?"1":"0"\)/);
  assert.match(page,/\$\("hToggle"\)\.onclick=\(\)=>set\(!ai,true,1\);/);
  assert.match(page,/F\.addEventListener\("dblclick"/);assert.match(page,/S\.onsubmit=e=>\{e\.preventDefault\(\);const v=si\.value\.trim\(\);if\(v\.length<2\)\{si\.focus\(\);return\}openRes\(v\)\}/);
  /* ช่วง 2 ค้นหาไปหน้าผลลัพธ์เดียวกัน */
  assert.match(js,/W\.openRes\(v\)/);
});

test('switching is locked: one transition at a time, input blocked meanwhile, always unlocks',()=>{
  assert.match(js,/if\(busy\|\|to===stage\|\|blocked\(\)\)return false;/);
  /* แผ่นใสเต็มจอใต้เมฆรับการกด/ล้อ/นิ้วแทนหน้าข้างหลัง */
  assert.match(js,/lockEl\.className="hm-lock"/);
  assert.match(js,/for\(const ev of \["wheel","touchmove"\]\)lockEl\.addEventListener\(ev,e=>\{if\(e\.cancelable\)e\.preventDefault\(\)\},\{passive:false\}\)/);
  assert.match(css,/\.hm-lock\{position:fixed;inset:0;z-index:2147483590;/);
  assert.match(css,/\.hm-lock\{[^}]*touch-action:none/);
  assert.match(js,/if\(busy\)\{if\(\/\^\(ArrowUp\|ArrowDown\|PageUp\|PageDown\|Home\|End\| \)\$\/\.test\(e\.key\)&&!typing\(e\.target\)\)e\.preventDefault\(\);return\}/);
  assert.match(js,/guard=setTimeout\(\(\)=>\{if\(stage!==to\)swap\(to\);finish\(\)\},4800\)/,'failsafe unlock keeps the right stage');
  assert.match(js,/const finish=\(\)=>\{if\(fin\)return;fin=true;clearTimeout\(guard\);[\s\S]*?lock\(false\);busy=false/);
  /* ไม่สลับทับแผ่นล่าง/เมนู/สายโทร */
  assert.match(js,/body\.style\.overflow==="hidden"\|\|H\.classList\.contains\("cv-calling"\)\|\|!!D\.querySelector\("\.bs\.on,\.cx-menu\.on,\.cx-scrim\.on"\)/);
});

test('gestures only work at the edge, start there, and cannot be triggered by sideways swipes or typing',()=>{
  assert.match(js,/const edge=\(\)=>stage==="ai"\?atBottom\(\):atTop\(\);/);
  assert.match(js,/gestureEdge=edge\(\)&&dwell\(\)/);
  assert.match(js,/Math\.abs\(e\.deltaX\)>Math\.abs\(e\.deltaY\)/);
  assert.match(js,/Math\.abs\(dy\)<70\|\|Math\.abs\(dy\)<Math\.abs\(dx\)\*1\.6/);
  assert.match(js,/typing\(e\.target\)/);
  assert.ok(!/addEventListener\("wheel",[^)]*\{passive:false\}/.test(js.replace(/sky\.addEventListener[^\n]*/,'')),'page wheel scrolling is never hijacked');
});

test('clouds are the settings-page theme clouds (cloud-swap.js), not a private copy',()=>{
  const cs=r('cloud-swap.js');
  assert.match(js,/cloud\.run\(\{kind:"stage",dir,from,to\},apply,finish\)/);
  assert.match(js,/const dir=to==="call"\?1:-1/);
  assert.ok(!/hm-cl|hm-sky|hm-veil|fly\(/.test(js+css),'no second cloud implementation');
  assert.match(cs,/function run\(job,apply,cb\)\{/);
  assert.match(cs,/job\.kind==='stage'\?\(job\.dir<0\?-1:1\)/);
  assert.match(cs,/function finish\(\)\{done=true;ov\.remove\(\);busy=false;if\(cb\)\{try\{cb\(\)\}catch\(e\)\{\}\}/);
  /* ยังเป็นของเดิมทุกอย่าง: หมอกทึบแล้วค่อยสลับ · ดักปุ่มธีม/ภาษา/สี */
  assert.match(cs,/vin\.onfinish=function\(\)\{\s*doApply\(\);\s*var vout=veil\.animate\(/);
  assert.match(cs,/var THEME_SEL='button\[data-sitetheme\],#v-settings button\[data-theme\],\.th-opt\[data-th\]'/);
  assert.match(page,/<script src="\/cloud-swap\.js\?v=4" defer><\/script>\n<script src="home-stages\.js\?v=2" defer><\/script>/);
  for(const f of ['chat.html','garage.html','news.html','profile.html','spares.html'])assert.match(r(f),/<script src="\/cloud-swap\.js\?v=4" defer><\/script>/,f);
  assert.match(sw,/'\.\/cloud-swap\.js\?v=4'/);
});

test('smooth slide: old stage lifts away while the mist thickens, new stage staggers in; transform/opacity only; none with reduced motion',()=>{
  assert.match(js,/function leave\(el,dir\)\{\s*if\(calm\(\)\|\|!el\.animate\)return;/);
  assert.match(js,/function enter\(el,dir\)\{\s*if\(calm\(\)\|\|!el\.animate\)return;/);
  assert.match(js,/\{opacity:1,transform:"translate3d\(0,0,0\)"\},\{opacity:0,transform:`translate3d\(0,\$\{-dir\*34\}px,0\)`\}/);
  assert.match(js,/\{opacity:0,transform:`translate3d\(0,\$\{dir\*46\}px,0\)`\},\{opacity:1,transform:"translate3d\(0,0,0\)"\}/);
  assert.match(js,/delay:70\+Math\.min\(i,7\)\*70,easing:EASE_OUT,fill:"backwards"/);
  /* ช่วงเก่าเริ่มลอยก่อนเมฆสลับ; ช่วงใหม่เล่นหลังสลับ (ใต้หมอก) */
  assert.match(js,/leave\(from==="ai"\?ai:call,dir\);\s*cloud\.run/);
  assert.match(js,/const apply=\(\)=>\{swap\(to\);if\(leaving\)\{leaving\.cancel\(\);leaving=null\}enter\(next,dir\)\};/);
  assert.match(css,/@media\(prefers-reduced-motion:reduce\)\{\.hm-next \.ti\{animation:none\}/);
});

test('home tab while on stage 2 goes back to the AI stage; stage is restored on back/reload only',()=>{
  assert.match(js,/\.navwrap \[data-view="home"\],\[data-mnav="home"\]/);
  assert.match(js,/nav\.type==="back_forward"\|\|nav\.type==="reload"/);
  assert.match(js,/W\.CendonHomeStages=Object\.freeze\(/);
});

test('new strings are routed through the shared translator and the files are cached by the service worker',()=>{
  assert.match(js,/const T=\(th,en\)=>W\.spireT\?W\.spireT\(th,en\):th;/);
  assert.match(sw,/'\.\/home-stages\.css\?v=2'/);assert.match(sw,/'\.\/home-stages\.js\?v=2'/);
  assert.match(page,/href="home-stages\.css\?v=2"/);assert.match(page,/<script src="home-stages\.js\?v=2" defer><\/script>/);
  assert.match(r('i18n/extract.mjs'),/'home-stages\.js'\]/);
});

test('no new icon is introduced (the local icon font is a subset)',()=>{
  const ti=r('icons/ti.css');
  for(const m of (js+css+menu).matchAll(/ti-([a-z0-9]+(?:-[a-z0-9]+)*)/g))if(!/^(?:ti)$/.test(m[1]))assert.ok(ti.includes(`.ti-${m[1]}:before`),'ti-'+m[1]);
});
