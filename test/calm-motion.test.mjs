import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
/* การเคลื่อนไหวแบบนิ่ง: เปลี่ยนหน้าจางเข้าครั้งเดียว ไม่ไล่ลอยขึ้นทีละกล่อง · ไม่เด้ง · ไม่เบลอระหว่างเคลื่อนไหว
   + ปุ่มโทรคุยกับ AI เป็นคลื่นเสียง 4 แท่งทุกจุด + เมนูเลือกรถอันเดียวกันทั้งหน้าแรกและร้านค้า */
const r=f=>readFileSync(new URL('../'+f,import.meta.url),'utf8');

test('page changes fade once — no staggered slide-up (which also dragged the bell up on every page)',()=>{
  for(const f of ['garage.html','spares.html','news.html','profile.html']){
    const s=r(f);
    assert.match(s,/flex-direction:column;animation:fade \.18s ease-out\}/,f);
    assert.match(s,/@keyframes fade\{from\{opacity:0\}to\{opacity:1\}\}/,f);
    assert.doesNotMatch(s,/\.view\.active \.scroll>\*\{animation:riseUp/,f);
    assert.doesNotMatch(s,/\.view\.active \.widget\{animation:riseUp/,f);
  }
  assert.match(r('index.html'),/\.view\{position:relative;z-index:1;animation:fadeup \.18s ease-out\}/);
  assert.match(r('bell.js'),/\.cb-bell\.cb-m,\.cb-bell\.cb-d,\.cb-bell\.cb-fx\{animation:none!important\}/);
});

test('no overshoot or blur in entrance keyframes on Home and Chat',()=>{
  const home=r('index.html'),chat=r('chat.html');
  assert.match(home,/@keyframes pcIn\{from\{opacity:0;transform:translateY\(4px\)\}/);
  /* แชต: ข้อความ หน้าต้อนรับ และการสลับแผง จางเข้าอย่างเดียว ไม่ลอยขึ้น */
  for(const k of ['msgIn','wRise','paneIn'])assert.match(chat,new RegExp('@keyframes '+k+'\\{from\\{opacity:0\\}to\\{opacity:1\\}\\}'),k);
  /* ของที่เลื่อนเข้ามาในจอ (motion.js) ทุกหน้า: จางเข้า ไม่ลอย */
  for(const f of ['chat.html','garage.html','news.html','profile.html','spares.html'])
    assert.match(r(f),/@keyframes spRise\{\n  from\{opacity:0\}\n  to\{opacity:1\}\n\}/,f);
  assert.doesNotMatch(chat,/@keyframes wInMe\{[^}]*blur/);
});

test('dropdowns animate only opacity + translate (composited), and the custom select survives the mobile toolbar',()=>{
  const d=r('drop.js');const play=d.slice(d.indexOf('function play('),d.indexOf('function check('));
  assert.doesNotMatch(play,/clipPath/);assert.match(play,/translate:`0 \$\{up\?6:-6\}px`,opacity:0/);
  assert.match(d,/const onWin=\(\)=>\{if\(CS&&Math\.abs\(innerWidth-CS\.w\)>2\)closeList\(false\)\};/,'height-only resize (toolbar) keeps the list open');
  assert.match(d,/if\(performance\.now\(\)-CS\.at<350\)return;/);
});

test('every AI call button shows the four-bar wave, never a phone',()=>{
  assert.match(r('index.html'),/id="hVoiceSend"[^>]*><i class="ti cd-wv"><\/i><\/button>/);
  assert.match(r('chat.html'),/id="wSend" data-mode="call"[^>]*><i class="ti cd-wv"><\/i><\/button>/);
  assert.match(r('chat.html'),/btn\.querySelector\("i"\)\.className="ti "\+\(send\?"ti-arrow-up":"cd-wv"\);/);
  assert.match(r('call-composer.js'),/icon\.className='ti '\+\(next==='call'\?'cd-wv':'ti-arrow-up'\)/);
  assert.match(r('call-tools.js'),/id="ctBack"><i class="ti cd-wv"><\/i>/);
  assert.match(r('call-ui.css'),/\.ti\.cd-wv\{display:inline-block;width:1em;height:1em;background:currentColor;/);
});

test('Home and Shop use the same car menu (big rows, no re-render while open)',()=>{
  const cm=r('car-menu.js');
  assert.match(cm,/min-height:48px/);assert.match(cm,/W\.CendonCarMenu=\{show,close\}/);
  assert.match(r('index.html'),/CendonCarMenu\.show\(btn,\{cur,/);
  assert.match(r('spares.html'),/CendonCarMenu\.show\(sw,\{cur:cur&&cur\.id,/);
  for(const f of ['index.html','spares.html'])assert.match(r(f),/<script src="car-menu\.js\?v=1" defer><\/script>/,f);
  assert.match(r('sw.js'),/'\.\/car-menu\.js\?v=1'/);
});
