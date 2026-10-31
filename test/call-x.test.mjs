import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
/* ปุ่ม + หน้าแรก · เมนูเรียกช่าง · หน้าใบงานแบบทีละคำถาม (แผนที่เต็มจอ + เปลี่ยนข้อแบบ morph + เส้นแสง ambient แบบแชต) */
const r=f=>readFileSync(new URL('../'+f,import.meta.url),'utf8').replace(/\r\n/g,'\n');
const home=r('index.html'),css=r('call-x.css'),sw=r('sw.js');
const cx=home.slice(home.indexOf('function cxSheet(o){'),home.indexOf('function book(t,sym){'));

test('+ lives only on the mobile home screen, left of the logo, level with the bell',()=>{
  assert.match(home,/<link rel="stylesheet" href="call-x\.css\?v=\d+">/);
  /* หน้าตาเดียวกับกระดิ่ง: 36px ขอบบน 23px ห่างขอบ 16px (กระดิ่งขวา ปุ่มนี้ซ้าย) · โปร่ง ไม่มีกรอบ สีเดียวกับกระดิ่ง */
  assert.match(css,/\.cx-plus\{position:absolute;top:calc\(23px \+ env\(safe-area-inset-top\)\);left:16px;z-index:31;width:36px;height:36px;border-radius:50%;\n  border:0;background:none;color:var\(--ink,#09090B\);/);
  assert.match(r('bell.js'),/\.cb-m\{position:absolute;top:calc\(23px \+ env\(safe-area-inset-top\) \+ var\(--cb-dy,0px\)\);right:calc\(16px \+ var\(--cb-dx,0px\)\);width:36px;height:36px;/,'bell geometry this mirrors');
  assert.match(home,/b\.innerHTML='<i class="ti ti-plus" aria-hidden="true"><\/i>';/,'same icon set as the bell');
  assert.match(css,/@media\(min-width:761px\)\{\.cx-plus\{display:none!important\}\}/,'mobile only');
  assert.match(css,/body\[data-mode="tech"\] \.cx-plus,body\.onmap \.cx-plus\{display:none!important\}/,'not in shop mode or on the map');
  assert.match(home,/VIEW=v;if\(\$\("cxPlus"\)\)\{\$\("cxPlus"\)\.hidden=v!=="menu";if\(v!=="menu"\)plusClose\(\)\}/,'other pages hide it and close the menu');
  assert.match(home,/b\.setAttribute\("aria-haspopup","menu"\);b\.setAttribute\("aria-expanded","false"\);/);
});

test('urgent or not is chosen before the job page; a home visit is an option inside it, not a third kind',()=>{
  const menu=home.slice(home.indexOf('function plusOpen(){'),home.indexOf('function plusClose('));
  for(const k of ['urgent','photo','listen'])assert.match(menu,new RegExp(`data-k="${k}"`),k);
  for(const k of ['post','multi'])assert.match(menu,new RegExp(`tile\\("${k}"`),k);
  assert.doesNotMatch(menu,/tile\("home"|openPostForm\("","",\{home:true\}\)/,'no separate come-to-me entry');
  assert.match(menu,/T\("ไม่ด่วน · ช่างมาหาหรือเอารถเข้าอู่ก็ได้",/);
  assert.match(css,/\.cx-tile\.cx-wide\{grid-column:1\/-1;/,'the non-urgent choice is a full-width row under the urgent card');
  const q=home.slice(home.indexOf('function drawQuick'),home.indexOf('function urgTap'));
  assert.doesNotMatch(q,/\["home","ti-/,'Home quick row: urgent / post / quotes');
  /* หน้าใบงานไม่มีแถบสลับด่วน/หาช่าง/มาหาที่บ้านแล้ว */
  assert.doesNotMatch(cx,/cx-seg|urgentCall\(null,\{swap:true/);
  assert.match(home,/cxSheet\(\{kind:"post",cf,url:home\?"\/post\?at=home":"\/post",title:T\("ประกาศหาช่าง","Post a job"\),/);
  assert.match(home,/modeDef:home\?"mobile":"shop"/,'old /post?at=home links and AI drafts preselect “come to me”');
  assert.doesNotMatch(home,/\$\("bMode"\)\.closest\("\.fld"\)\.hidden=true/,'…and it can still be changed');
});

test('+ menu: past shops come only from the customer’s own conversations',()=>{
  const past=home.slice(home.indexOf('function pastShops(){'),home.indexOf('function plusOpen(){'));
  assert.match(past,/for\(const c of convos\(th,jb\)\)/);
  assert.match(past,/if\(t&&!isMine\(t\)\)out\.push\(t\)/,'never the user’s own shop');
  assert.doesNotMatch(past,/api\(/,'no new request just to open the menu');
});

test('one question per screen: problem → location → time → review · urgent = problem → location & send',()=>{
  assert.match(cx,/const symF=fld\(symId\),P=\[\];if\(symF\)P\.push\("sym"\);P\.push\("loc"\);if\(\$\("bWhen"\)\)P\.push\("when"\);if\(!urgent\)P\.push\("send"\);/);
  assert.match(cx,/if\(urgent\)\{put\(\$\("cxSymX"\),carF\);put\(dock,fld\("bPhone"\),after\)\}/,'urgent: phone and the shops it reaches sit on the map step');
  /* คำตอบที่ผ่านแล้วเป็นชิปด้านบน แตะเพื่อกลับไปแก้ */
  assert.match(cx,/d\.querySelectorAll\("\.cx-dc"\)\.forEach\(b=>b\.onclick=\(\)=>go\(P\.indexOf\(b\.dataset\.k\),\{from:b\}\)\)/);
  assert.match(cx,/s\.querySelectorAll\("\.cx-sr"\)\.forEach\(b=>b\.onclick=\(\)=>go\(P\.indexOf\(b\.dataset\.go\),\{from:b\}\)\)/,'review rows jump back too');
});

test('job page keeps the original submit paths and checks — only the layout is new',()=>{
  assert.match(home,/const r=await api\("\/api\/tech\/jobs",\{body:\{id:reqId,techId:t\.id,\.\.\.cf\.read\(\)\}\}\);/,'quote to one shop');
  assert.match(home,/return sendGroup\(list,\{\.\.\.v,symptom:sym\}\)/,'quotes from several shops');
  assert.match(home,/cxSheet\(\{kind:"urgent",cf,push:true,/);
  /* "ถัดไป" ตรวจด้วยกติกาเดียวกับตอนส่ง — ไม่มีกติกาแยกที่หลวมกว่า */
  assert.match(cx,/if\(cur<P\.length-1\)\{try\{cf\.read\(o\.readOpt&&o\.readOpt\(\)\)\}catch\(err\)\{if\(err&&err\.form\)\{const mine=err\.form\.filter\(x=>\{const i=paneOf\(x\.id\);return i>=0&&i<=cur\}\);if\(mine\.length\)return formPop\(mine\)\}\}return go\(cur\+1\)\}/);
  assert.match(cx,/busy\(btn,o\.go\)\.finally\(\(\)=>bs\.classList\.remove\("cx-busy"\)\)/);
  assert.match(cx,/document\.addEventListener\("cendon:formpop",onPop\);/,'an error jumps to the step that holds the field');
  /* ช่องย้ายไปไว้ตามข้อก่อน mount — แผนที่จึงเกิดในขนาดเต็มจอ */
  assert.ok(cx.indexOf('locP.insertBefore($("bMap"),locP.firstChild);')<cx.indexOf('cf.mount();'));
  assert.match(cx,/deco\("bWhen",\{"วันนี้":\["ti-sun","amber",day\(0\)\],"พรุ่งนี้":\["ti-sunrise","pink",day\(1\)\],"__":/,'cards keep the original data-v values');
});

test('location = full-screen map with a warm gradient from the top that melts into the page at the bottom',()=>{
  assert.match(css,/\.cx \.cx-loc #bMap\{position:absolute;inset:0;z-index:0;height:auto;margin:0;border-radius:0;/);
  assert.match(css,/\.cx-mapfx\{position:absolute;inset:0;z-index:1;pointer-events:none;\n  background:linear-gradient\(180deg,var\(--cx-card\) 0,/);
  assert.match(css,/\.cx-mapfx::before\{content:"";position:absolute;left:-10%;right:-10%;top:0;height:56%;mix-blend-mode:screen;/,'the drifting glow never uncovers an edge');
  assert.match(css,/html\[data-theme="dark"\] \.cx \.leaflet-tile-pane\{filter:invert\(1\) hue-rotate\(180deg\)/);
  assert.match(css,/\.cx \.cx-loc \.leaflet-tile\{width:256\.5px!important;height:256\.5px!important;mix-blend-mode:normal!important\}/,'no seams between filtered tiles');
  assert.match(css,/\.cx \.cx-dock \.pk-gps\{right:2px;bottom:auto;top:-56px\}/,'the locate button floats above the bottom panel');
});

test('steps change fluidly: one gentle spring, fade + soft blur, the map blooms from what was tapped and files into its chip',()=>{
  /* สปริงหน่วงพอดี (ไม่เด้ง) ตัวเดียวกันทั้งการเปลี่ยนข้อและแถบความคืบหน้า */
  assert.match(css,/--cx-spring:linear\(0,0\.009 2%,/);
  assert.match(css,/html\[data-cx-dir\]::view-transition-group\(\*\)\{animation-duration:\.55s;animation-timing-function:var\(--cx-spring\)\}/);
  assert.match(css,/\.cx-prog b\{display:block;width:0;height:100%;border-radius:inherit;transition:width \.55s var\(--cx-spring\)/);
  const vt=css.slice(css.indexOf('/* ── เปลี่ยนข้อแบบลื่น'),css.indexOf('/* แท็บเล็ต/คอม: เต็มจอตามขนาดเครื่อง'));
  assert.ok(vt.length>2000);
  assert.doesNotMatch(css,/(^|\})::view-transition-group\(\*\)/,'only this page’s transitions are tuned (html[data-cx-dir])');
  /* ลื่น: ทุก keyframe ขยับแค่ transform/opacity/filter (การ์ดจอทำเอง) · เบลอแค่บาง ๆ · ไม่มี clip-path */
  for(const [,name,body] of vt.matchAll(/@keyframes (\w+)\{(.*)\}\n/g))
    for(const [,prop] of body.matchAll(/([a-z-]+):/g))assert.ok(['transform','opacity','filter'].includes(prop),`${name} animates ${prop}`);
  assert.doesNotMatch(vt.replace(/\/\*[\s\S]*?\*\//g,''),/clip-path/);
  for(const [,px] of vt.matchAll(/blur\((\d+)px\)/g))assert.ok(+px<=8,`blur ${px}px stays soft`);
  /* แต่ละข้อมีชื่อของตัวเอง: ข้อเก่าอยู่ใต้แผนที่ ข้อใหม่อยู่บน · ของเก่าจาง + เบลอออก ของใหม่เลื่อนเข้าแล้วค่อย ๆ ชัด */
  assert.match(css,/\.cx-pane\.on\[data-k="sym"\] \.cx-pb\{view-transition-name:cx-pb-sym\}\.cx-pane\.on\[data-k="loc"\] \.cx-pb\{view-transition-name:cx-pb-loc\}/);
  assert.match(vt,/html\[data-cx-from="sym"\]::view-transition-group\(cx-pb-sym\)[^{]*\{z-index:1\}/);
  assert.match(vt,/html\[data-cx-to="send"\]::view-transition-group\(cx-pb-send\)\{z-index:4\}/);
  assert.match(vt,/::view-transition-old\(cx-pb-send\)\{animation:cxXOutF \.55s var\(--cx-spring\) both,cxFadeOut \.2s ease-out both,cxBlurOut \.24s ease-out both\}/);
  assert.match(vt,/::view-transition-new\(cx-pb-send\)\{animation:cxXInF \.55s var\(--cx-spring\) both,cxFadeIn \.34s ease-out \.06s both,cxFocusIn \.42s ease-out \.06s both\}/);
  assert.match(vt,/html\[data-cx-dir\] \.mnav,html\[data-cx-dir\] #navInd,html\[data-cx-dir\] \.fab-dock\{view-transition-name:none!important\}/,'the app tab bar never shows through');
  /* แผนที่บานออกจากชิ้นที่แตะ (วัดตำแหน่งจริง) · หดเข้าหาชิปตำแหน่งแล้วชิปขึ้นแทน */
  assert.match(cx,/h\.dataset\.cxMap=from===L\?"old":to===L\?"new":"";h\.dataset\.cxFrom=P\[from\];h\.dataset\.cxTo=P\[to\];/);
  assert.match(cx,/if\(to===L\)clip\(src,to<from\?locChip\(\):nearEl\(\),\$\("cxGo"\)\);/,'opens from what was tapped');
  assert.match(cx,/if\(fx&&from===L\)clip\(to>L\?locChip\(\):nearEl\(\),\$\("cxGo"\)\)/,'closes into the chip measured in the new step');
  assert.match(vt,/transform-origin:var\(--cx-ox,50%\) var\(--cx-oy,70%\)\}/);
  assert.match(vt,/@keyframes cxBloom\{from\{transform:scale\(\.9\);filter:blur\(8px\)\}\}/);
  assert.match(vt,/@keyframes cxSink\{to\{transform:scale\(\.92\);filter:blur\(6px\)\}\}/);
  assert.match(vt,/html\[data-cx-dir\]::view-transition-new\(cx-dloc\)\{animation:cxPop \.4s var\(--cx-spring\) \.2s both\}/);
  assert.match(css,/\.cx-pane\.cx-loc\.on #bMap\{view-transition-name:cx-map\}/);
  assert.doesNotMatch(css,/\.cx-near\{view-transition-name|cx-near[^{]*\{[^}]*view-transition-name/,'the shops chip is a launch point, not stretched into the map');
  /* กล่องอาการ ↔ ชิป: กรอบแปลงร่าง เนื้อในขนาดเดิม */
  assert.match(css,/\.cx-pane\.on \.cx-say\{view-transition-name:cx-sym\}/);
  assert.match(css,/\.cx-dc\[data-k="sym"\]\{view-transition-name:cx-sym\}\.cx-dc\[data-k="loc"\]\{view-transition-name:cx-dloc\}/);
  assert.match(vt,/inset:0 auto auto 0;width:auto;height:auto;object-fit:none;mix-blend-mode:normal\}/);
  /* ไม่รองรับ View Transitions = เลื่อน + จาง + โฟกัสเข้าบนสปริงเดียวกัน · ลดภาพเคลื่อนไหว = ทันที */
  assert.match(cx,/const still=matchMedia\("\(prefers-reduced-motion: reduce\)"\)/);
  assert.match(css,/\.cx-pb\.cx-in-f\{animation:cxXInF \.55s var\(--cx-spring\) both,cxFadeIn \.34s ease-out both,cxFocusIn \.42s ease-out both\}/);
  assert.match(cx,/pb\.classList\.add\("cx-in-"\+dir\)/);
  assert.match(cx,/d\.querySelectorAll\("\.cx-dc"\)\.forEach\(b=>b\.onclick=\(\)=>go\(P\.indexOf\(b\.dataset\.k\),\{from:b\}\)\)/);
});

test('steps start without a hitch: nothing set on <html> makes the browser restyle the whole page',()=>{
  /* ตัวเลือกใต้ html[data-cx-*] ที่ชี้ element จริงต้องลงท้ายด้วยคลาส/ไอดี — ลงท้ายด้วย * หรือแท็กทำให้ตั้ง attribute แต่ละครั้งคำนวณสไตล์ทั้งเอกสาร */
  const sels=[...css.replace(/\/\*[\s\S]*?\*\//g,'').matchAll(/(?:^|\})([^{}@]*html\[data-cx-[^{]*)\{/g)].flatMap(m=>m[1].split(',')).map(x=>x.trim()).filter(x=>x.startsWith('html[data-cx-')&&!x.includes('::view-transition'));
  assert.ok(sels.length>0);
  for(const x of sels)assert.match(x,/[.#][\w-]+$/,`${x} targets classes or ids only`);
  /* จุดศูนย์กลางแผนที่ลงทะเบียนแบบไม่สืบทอด และส่งต่อเฉพาะสาย pseudo ของแผนที่ */
  assert.match(css,/@property --cx-ox\{syntax:"<length-percentage>";inherits:false;initial-value:50%\}/);
  assert.match(css,/@property --cx-oy\{syntax:"<length-percentage>";inherits:false;initial-value:70%\}/);
  assert.match(css,/html::view-transition,html::view-transition-group\(cx-map\),html::view-transition-image-pair\(cx-map\),html::view-transition-old\(cx-map\),html::view-transition-new\(cx-map\),/);
  assert.match(cx,/CV=\["ox","oy"\]/,'only the registered origin is written onto <html>');
  /* วัดตำแหน่งก่อนเขียน attribute (อ่านหลังเขียน = บังคับคำนวณกลางตัวจัดการแตะ) */
  assert.ok(cx.indexOf('if(to===L)clip(src,')<cx.indexOf('h.dataset.cxDir=dir;'),'measure first, then write');
  /* ออโรรา: ดวงแสงเป็น gradient นุ่มในตัว ไม่ใช่ blur รัศมีใหญ่ที่ต้องวาดใหม่ทุกเฟรม */
  const aur=css.slice(css.indexOf('.cx-aur{'),css.indexOf('@keyframes cxA1'));
  assert.match(aur,/\.cx-aur i\{position:absolute;box-sizing:content-box;padding:128px;margin:-128px;border-radius:50%;opacity:var\(--cx-aur\);will-change:transform;\n  background:radial-gradient\(closest-side,var\(--c\) 12%,54%,transparent\)\}/);
  assert.doesNotMatch(aur.replace(/\/\*[\s\S]*?\*\//g,''),/filter:blur/);
  assert.doesNotMatch(css,/\.cx-aur i\{filter:blur/);
});

test('small on-theme art per step, coloured option icons, ambient line, and calm under reduced motion',()=>{
  for(const k of ['sym','urgent','when','send'])assert.match(home,new RegExp(`${k}:(car\\(|\\\`<svg)`),k);
  assert.match(css,/\.cx-q em\{font-style:normal;background:var\(--cx-gt\);-webkit-background-clip:text;background-clip:text;color:transparent\}/,'the key word of each question is a Cendon gradient');
  assert.match(css,/\.cx-tiles>button\.on\{background:rgba\(var\(--h\),\.12\);box-shadow:inset 0 0 0 1\.5px rgba\(var\(--h\),\.75\)/);
  assert.match(css,/\.cx-say::before\{content:"";position:absolute;left:16%;right:16%;top:0;/);
  assert.match(css,/\.cx \.cx-say \.inp:focus\{border-color:transparent!important;box-shadow:none!important\}/,'the app-wide focus ring stays out of the problem box');
  assert.match(css,/\.bs\.cxs\.cx-busy \.cx-go::after\{opacity:1;animation:cxRing/);
  assert.match(css,/@media\(prefers-reduced-motion:reduce\)\{\n  \.cx-aur i,\.cx-ill \*,/);
});

test('privacy: no microphone or speech API on the job page — the camera chip attaches a photo',()=>{
  assert.doesNotMatch(cx,/getUserMedia|SpeechRecognition/);
  assert.match(cx,/cam\.innerHTML='<i class="ti ti-camera-plus"><\/i>'\+T\("แนบรูป","Add a photo"\);/);
});

test('job page: sheet class does not collide with the page root, admin orb never covers it',()=>{
  assert.match(home,/cls:"cx",kind,full:true/);
  assert.doesNotMatch(css,/(^|[,}\s])\.bs\.cx[\s.{]/,'sheet styles use .bs.cxs, not .bs.cx');
  assert.match(css,/body:has\(#bs\.cxs\.on\) #cxa-fab,body:has\(#cxPlus\[aria-expanded="true"\]\) #cxa-fab\{display:none!important\}/);
});

test('the old tilted hero map is gone; the stylesheet is precached at the same version the page loads',()=>{
  assert.ok(!existsSync(new URL('../call-x-map.js',import.meta.url)));
  assert.doesNotMatch(home,/call-x-map\.js|CX_ART|CX\.hero/);
  const v=home.match(/href="call-x\.css\?v=(\d+)"/)[1];
  assert.match(sw,new RegExp(`'\\./call-x\\.css\\?v=${v}'`),'render-critical style is precached');
});
