import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
/* Motion v2: นิ่ง มั่นคง ไม่ดิ้น ไม่กระตุก — ตรวจทั้งหน้าใน browser แล้วแก้ที่ต้นเหตุ ไฟล์นี้กันไม่ให้ถอยกลับ */
const r=f=>readFileSync(new URL('../'+f,import.meta.url),'utf8').replace(/\r\n/g,'\n');
const PAGES=['index.html','garage.html','spares.html','news.html','profile.html','chat.html'];
const M=r('motion.css');

test('every app page loads the motion system in the head and holds transitions until the page is ready', () => {
  for(const f of PAGES){const s=r(f),head=s.slice(0,s.indexOf('</head>'));
    assert.match(head,/<link rel="stylesheet" href="\/motion\.css\?v=1">\n<script>\/\* Motion v2:/,f);
    assert.match(head,/e\.classList\.add\("m-boot"\)/,f);}
  assert.match(M,/html\.m-boot \*,html\.m-boot \*::before,html\.m-boot \*::after\{transition:none!important\}/);
  assert.match(r('sw.js'),/'\.\/motion\.css\?v=1'/);
});

test('one calm timing for the whole app: opacity/transform only, decelerate easing, no overshoot', () => {
  assert.match(M,/--m-ease:cubic-bezier\(\.2,0,0,1\)/);
  for(const m of M.matchAll(/cubic-bezier\(([^)]*)\)/g)){const v=m[1].split(',').map(Number);assert.ok(v[1]>=0&&v[1]<=1&&v[3]>=0&&v[3]<=1,m[0])}
  for(const m of M.matchAll(/@keyframes ([\w-]+)\{([^}]*\}?)\}/g))assert.doesNotMatch(m[2],/width|height|top|left|margin|filter|box-shadow/,m[1]);
  assert.match(M,/@media \(prefers-reduced-motion:reduce\)\{\n  \*,\*::before,\*::after\{animation-duration:\.01ms!important/);
});

test('page chrome never moves: navbar, tab bar, bell, tab indicator (no slide on any page)', () => {
  assert.match(M,/html \.nav-ind\{transition:none!important\}/);
  assert.match(M,/::view-transition-group\(navind\)\{animation:none!important\}/);
  assert.match(M,/::view-transition-group\(mnav\)\{animation:none!important\}/);
  assert.match(M,/html \.navwrap,html \.navwrap \.nav,html \.mnav,html header\.pill,html \.stu-top,html \.cb-bell,html #fabDock\{animation:none!important\}/);
});

test('no decorative motion loops, no hover lifts; full-screen backdrops dim without blurring every frame', () => {
  for(const sel of ['#hForm','.lx-sky i','.qf-dot','.mz-live','.cl-fx i','.w-sweep i','.big-logo','.logo-halo::before'])assert.ok(M.includes('html '+sel),sel);
  for(const sel of ['.qa:hover','.card:hover','.lx-gc:hover','.mag-card:hover','.btn.primary:hover'])assert.ok(M.includes('html '+sel),sel);
  assert.match(M,/html \.carx-bd,html \.gx-bd,html \.fpop,html \.mag-modal-backdrop,html \.mzr-bd,html #sheetBg,html \.bs \.bg\{-webkit-backdrop-filter:none!important;backdrop-filter:none!important\}/);
  assert.match(M,/@media\(min-width:641px\)\{html \.carx\{height:min\(88dvh,900px\)\}\}/,'car window keeps its size when switching tabs');
});

test('desktop background is the same calm, static one on every page; theme colours only fade when the user switches theme', () => {
  for(const f of ['garage.html','news.html','spares.html','profile.html']){const s=r(f);
    assert.match(s,/let alive=LSg\("alive",false\), depth=LSg\("depth",false\), gyro=LSg\("gyro",false\);/,f);
    assert.match(s,/if \(root\.getAttribute\("data-theme"\) !== theme && document\.readyState === "complete"\) \{\n    root\.classList\.add\("theme-fade"\);/,f);}
  assert.match(r('chat.html'),/if\(root\.getAttribute\("data-ctheme"\)!==t&&document\.readyState==="complete"\)\{\n    root\.classList\.add\("theme-fade"\);/);
});

test('bells are in place on the first frame everywhere (mobile pages, chat bar, settings) and survive redraws', () => {
  for(const f of ['garage.html','news.html','spares.html'])assert.match(r(f),/<button type="button" class="cb-bell cb-m cb-pre" aria-label="การแจ้งเตือน">/,f);
  const bell=r('bell.js');
  assert.match(bell,/const pre=chat\?null:document\.querySelector\("\.cb-bell\.cb-m\.cb-pre"\);/);
  assert.match(bell,/if\(own\)\{if\(!BTNS\.includes\(own\)\)\{wire\(own\);paint\(\)\}\}else\{host\.appendChild\(mkBtn\(cls\)\);paint\(\)\}/);
  assert.match(bell,/\.pill \.cb-bell\{order:99;margin-left:auto\}/);
  assert.match(r('chat.html'),/b\.className="cb-bell p-btn cb-pre"/);
  /* หน้าตั้งค่า (settings.js): กระดิ่งวางตั้งแต่เปิด และอยู่ต่อข้ามการวาดใหม่ (วาดใหม่แค่ #stMain/#stManage ไม่แตะกระดิ่ง) */
  const st=r('settings.js');
  assert.match(st,/const keep=v\.querySelector\(':scope>\.cb-bell'\);/);
  assert.match(st,/b\.className='cb-bell cb-m cb-sh cb-pre'/);
  assert.match(st,/main\.innerHTML=mainHTML\(\);/);
  for(const f of PAGES)assert.match(r(f),/bell\.js\?v=15/,f);
});

test('content does not push the page around while loading', () => {
  assert.match(r('index.html'),/const SK='<div class="skel" style="height:341px;grid-column:1\/-1"><\/div>';/,'home suggestions keep the real row height');
  /* แถว LINE ในหน้าตั้งค่า: จองความสูงแถวไว้ตั้งแต่แรก · ซ่อนทั้งหมวดเฉพาะเมื่อรู้แน่ว่าไม่มี LINE */
  assert.match(r('settings.css'),/\.st-line\{min-height:76px/);
  assert.match(r('settings.js'),/localStorage\.getItem\('cendon_line_card'\)==='0'\?' hidden':''/);
  assert.match(r('cendon-line.js'),/if\(el\.dataset\.lineConnect==="row"\)\{const gone=!!st&&st\.oa==="";/);
  assert.match(r('cendon-line.js'),/localStorage\.setItem\("cendon_line_card",empty\?"0":"1"\);if\(!empty&&el\.offsetHeight\)localStorage\.setItem\("cendon_line_h",String\(el\.offsetHeight\)\)/);
});
