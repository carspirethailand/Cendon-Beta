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

test('quick actions keep every handler: urgent / post / quotes (stage 2) and photo / sound / quote / urgent (stage 1)',()=>{
  const q=page.slice(page.indexOf('function drawQuick'),page.indexOf('function urgTap'));
  for(const k of ['post','multi','photo','listen','quote'])assert.match(q,new RegExp(`\\["${k}","ti-`),k);
  /* ด่วน / ไม่ด่วน เลือกก่อนเข้าหน้าใบงาน · ช่างมาหาที่บ้านเป็นตัวเลือกในหน้าใบงาน ไม่ใช่ปุ่มแยก */
  assert.doesNotMatch(q,/\["home","ti-/);
  assert.match(q,/if\(k==="urgent"\)return emergency\(\);if\(k==="multi"\)return openMulti\("",""\);/);
  assert.match(q,/if\(k==="post"\)return openPostForm\("",""\);\n/);
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
  assert.match(js,/Math\.abs\(dy\)>=\(fast\?24:48\)&&Math\.abs\(dy\)>=Math\.abs\(dx\)\*1\.4/,'short swipe or quick flick is enough');
  assert.match(js,/if\(acc>40\)\{acc=0;go\(/);assert.match(js,/const dwell=\(\)=>performance\.now\(\)-edgeAt>220;/);
  assert.match(js,/near=\(\)=>stage==="ai"\?atBottom\(\):W\.scrollY<=24/,'edge tolerance for touch');
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
  assert.match(page,/<script src="\/cloud-swap\.js\?v=5" defer><\/script>\n<script src="home-stages\.js\?v=6" defer><\/script>/);
  for(const f of ['chat.html','garage.html','news.html','profile.html','spares.html'])assert.match(r(f),/<script src="\/cloud-swap\.js\?v=5" defer><\/script>/,f);
  assert.match(sw,/'\.\/cloud-swap\.js\?v=5'/);
});

test('smooth slide: old stage lifts away while the mist thickens, new stage staggers in; transform/opacity only; none with reduced motion',()=>{
  assert.match(js,/function leave\(el,dir,fromPx\)\{\s*if\(calm\(\)\|\|!el\.animate\)return;/);
  assert.match(js,/function enter\(el,dir\)\{\s*if\(calm\(\)\|\|!el\.animate\)return;/);
  assert.match(js,/\{opacity:1,transform:`translate3d\(0,\$\{from\}px,0\)`\},\{opacity:0,transform:`translate3d\(0,\$\{to\}px,0\)`\}/);
  assert.match(js,/\{opacity:0,transform:`translate3d\(0,\$\{dir\*46\}px,0\)`\},\{opacity:1,transform:"translate3d\(0,0,0\)"\}/);
  assert.match(js,/delay:70\+Math\.min\(i,7\)\*70,easing:EASE_OUT,fill:"backwards"/);
  /* ช่วงเก่าเริ่มลอยก่อนเมฆสลับ; ช่วงใหม่เล่นหลังสลับ (ใต้หมอก) */
  assert.match(js,/leave\(from==="ai"\?ai:call,dir,fromPx\);\s*cloud\.run/);
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
  assert.match(sw,/'\.\/home-stages\.css\?v=7'/);assert.match(sw,/'\.\/home-stages\.js\?v=6'/);
  assert.match(page,/href="home-stages\.css\?v=7"/);assert.match(page,/<script src="home-stages\.js\?v=6" defer><\/script>/);
  assert.match(r('i18n/extract.mjs'),/'home-stages\.js'\]/);
});

test('no new icon is introduced (the local icon font is a subset)',()=>{
  const ti=r('icons/ti.css');
  for(const m of (js+css+menu).matchAll(/ti-([a-z0-9]+(?:-[a-z0-9]+)*)/g))if(!/^(?:ti)$/.test(m[1]))assert.ok(ti.includes(`.ti-${m[1]}:before`),'ti-'+m[1]);
});

test('AI stage: logo stays at the top; everything else is centred on the y axis; stage 2 clears the + and bell on phones',()=>{
  const ai=menu.slice(at(menu,'hmAi'),at(menu,'hmCall'));
  assert.ok(ai.indexOf('class="lx-logo nt"')>0&&ai.indexOf('class="lx-logo nt"')<ai.indexOf('<header class="lx-hero">'),'logo is outside the hero, above it');
  assert.equal((page.match(/class="lx-logo nt"/g)||[]).length,1);
  assert.match(css,/#vMenu \.hm-ai>\.lx-logo\{padding-top:12px;margin:0\}/);
  /* ก้อนกลางเว้นบน–ล่างเท่ากัน ส่วนลูกศรอยู่ในพื้นที่แตะของตัวเอง ไม่มีข้อความมาดันหรือทับ */
  assert.match(css,/#vMenu\[data-stage="ai"\]\{padding-bottom:0\}/,'do not reserve the old 40px footer a second time');
  assert.match(css,/#vMenu \.hm-core\{flex:1 0 auto;display:flex;flex-direction:column;justify-content:center;padding:var\(--hm-cue-space\) 0\}/);
  assert.match(css,/#vMenu \.hm-core>\.lx-hero\{padding:0!important;margin:0\}/);
  assert.match(css,/\.hm-next\{position:absolute;left:0;right:0;bottom:2px;/);
  assert.match(css,/\.hm-next\{[^}]*width:44px!important;height:44px/,'small icon keeps an accessible touch target');
  assert.match(css,/\.hm-next \.ti\{font-size:22px;/);
  assert.match(js,/next\.innerHTML=`<i class="ti ti-chevron-down" aria-hidden="true"><\/i>`/,'only the arrow is visible');
  assert.match(js,/next\.setAttribute\("aria-label",nextLabel\);next\.title=nextLabel;next\.setAttribute\("aria-controls","hmCall"\)/);
  assert.doesNotMatch(css,/\.hm-next (?:b|small)\{/,'no leftover text-block styling');
  assert.doesNotMatch(css,/#liveBar|\.live-bar/,'no floating location badge or leftover offset rules');
  const core=ai.slice(ai.indexOf('<div class="hm-core">'),ai.indexOf('id="hmNext"'));
  for(const id of ['hFlip','hTools','myCar'])assert.ok(core.includes(`id="${id}"`),id+' is in the centred group');
  assert.ok(!core.includes('lx-logo')&&!core.includes('id="hmNext"'),'logo and call button are outside the group');
  assert.match(css,/@media\(max-width:760px\)\{[\s\S]*#vMenu \.hm-call\{padding-top:58px\}/);
});

test('clouds use the desktop cloud size on narrow screens and the exact desktop set on wide ones',()=>{
  const cs=r('cloud-swap.js');
  assert.match(cs,/var REF_W=2560,REF_VH=800,NARROW=1000;/);
  assert.match(cs,/narrow\?l\.map\(function\(p\)\{return \[\(p\[0\]\/s\)\.toFixed\(1\),\(p\[1\]\/hs\)\.toFixed\(1\),p\[2\],p\[3\]\]\}\):l/);
  assert.match(cs,/Math\.max\(3,Math\.round\(n\*s\)\)/);
  assert.ok(!/max-aspect-ratio/.test(cs),'no squeezed portrait override');
  assert.match(cs,/el\.getAttribute\('data-k'\)===key/,'rebuilt when the screen class changes (rotation)');
});

test('pulling down at the top of stage 2 switches stages instead of refreshing the page',()=>{
  /* เบราว์เซอร์มือถือตีความดึงลงที่ต้นหน้าเป็น "ดึงเพื่อรีเฟรช" — ต้องกันทั้งใน CSS และตอนดึงจริง */
  assert.match(css,/html:has\(#vMenu:not\(\[hidden\]\)\),html:has\(#vMenu:not\(\[hidden\]\)\) body\{overscroll-behavior-y:contain\}/);
  assert.match(js,/addEventListener\("touchmove",e=>\{[\s\S]*?if\(e\.cancelable\)e\.preventDefault\(\);\s*pull\(/);
  assert.match(js,/\},\{passive:false\}\);\s*addEventListener\("touchend"/);
  /* ไม่ preventDefault ถ้าไม่ได้อยู่ที่ขอบ/ไม่ใช่ทิศที่สลับ/แนวนอน/พิมพ์อยู่ — การเลื่อนหน้าปกติไม่ถูกขัด */
  assert.match(js,/if\(!tOn\|\|!tEdge\|\|busy\|\|typing\(e\.target\)\)return;/);
  assert.match(js,/Math\.abs\(dy\)<8\|\|Math\.abs\(dy\)<Math\.abs\(dx\)\*1\.4\|\|!want\(-dy\)\|\|!near\(\)\)return;/);
  /* หน้าขยับตามนิ้วเล็กน้อย แล้วคืนตำแหน่งถ้าไม่สลับ */
  assert.match(js,/pull\(Math\.max\(-46,Math\.min\(46,dy\*\.35\)\)\)/);
  assert.match(js,/if\(ok\)\{const from=pullPx;pull\(0\);go\(stage==="ai"\?"call":"ai",from\)\}else if\(pulled\)pull\(0,true\)/);
  assert.match(js,/addEventListener\("touchcancel",\(\)=>\{tOn=false;if\(pulled\)pull\(0,true\)\}/);
});

test('pull gesture is continuous: the page leaves from where the finger left it (no snap-back first)',()=>{
  assert.match(js,/function leave\(el,dir,fromPx\)\{/);
  assert.match(js,/const from=fromPx\|\|0,to=-dir\*Math\.max\(34,Math\.abs\(from\)\+24\);/);
  assert.match(js,/translate3d\(0,\$\{from\}px,0\)/);
  assert.match(js,/async function go\(to,fromPx\)\{/);
  assert.match(js,/leave\(from==="ai"\?ai:call,dir,fromPx\);/);
  assert.match(js,/if\(ok\)\{const from=pullPx;pull\(0\);go\(stage==="ai"\?"call":"ai",from\)\}/);
  assert.match(js,/let pullPx=0;\s*function pull\(px,anim\)\{pullPx=px;/);
});

test('large screens: content is wider but never edge to edge; phones and the navbar are untouched',()=>{
  const wide=r('wide-layout.css');
  assert.match(wide,/@media\(min-width:1100px\)\{/);
  assert.match(wide,/:root\{--page-w:min\(1360px,88vw\)\}/);
  assert.match(wide,/\.view\{max-width:var\(--page-w\)\}/);
  assert.match(wide,/#vMenu:not\(\[hidden\]\)\{max-width:var\(--page-w\)\}/);
  assert.match(wide,/#vMenu\{--hw:100%\}/);
  assert.ok(!/navwrap|\.cx-plus|cb-bell|#top\b/.test(wide.replace(/\/\*[\s\S]*?\*\//g,'')),'navbar, + button and bell are not styled here');
  assert.ok(wide.replace(/\/\*[\s\S]*?\*\//g,'').trim().startsWith('@media(min-width:1100px){')&&wide.trim().endsWith('}'),'everything lives inside the desktop media query');
  for(const f of ['garage.html','news.html','spares.html','profile.html','chat.html'])assert.match(r(f),/<link rel="stylesheet" href="\/wide-layout\.css\?v=1">\n<\/head>/,f);
  assert.match(page,/href="wide-layout\.css\?v=1"/);
  assert.match(sw,/'\.\/wide-layout\.css\?v=1'/);
  assert.match(r('tech-marketplace.css'),/@media\(min-width:1100px\)\{\.wrap\{max-width:min\(1360px,88vw\)!important\}\}/);
});
