import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
/* Intelligent UI: AI ประกอบหน้าจอได้อิสระจากชิ้นส่วนที่กำหนด — แต่ทุกอย่างผ่านตัวตรวจ ไม่มี HTML/ลิงก์/คำสั่งนอกรายชื่อ */
const r=f=>readFileSync(new URL('../'+f,import.meta.url),'utf8').replace(/\r\n/g,'\n');
function load(iconNames){
  const sheets=iconNames?[{href:'https://x/icons/ti.css?v=1',cssRules:iconNames.map(n=>({selectorText:`.${n}::before`}))}]:[];
  const win={lang:'th',location:{href:''},addEventListener(){}};
  const doc={addEventListener(){},styleSheets:sheets,documentElement:{},querySelectorAll:()=>[]};
  vm.runInNewContext(r('ai-ui.js'),{window:win,document:doc,MutationObserver:class{observe(){}},fetch:()=>Promise.reject(Error('no')),URLSearchParams,JSON,Math,Number,String,Array,Object,Set,Map,RegExp,Error,Promise});
  return win.CendonAIUI;
}
const UI=load(['ti-engine','ti-battery','ti-check','ti-send','ti-alert-triangle','ti-circle-check']);
const wrap=o=>'คำตอบ\n[[UI]]'+JSON.stringify(o)+'[[/UI]]\n[[NEXT]]["a"][[/NEXT]]';

test('the [[UI]] block is cut out of the text; the readable answer stays',()=>{
  const c=UI.cut(wrap({blocks:[{t:'text',text:'สวัสดี'}]}));
  assert.equal(c.text,'คำตอบ\n\n[[NEXT]]["a"][[/NEXT]]'.replace('\n\n','\n\n'));
  assert.equal(c.ui.blocks.length,1);
  assert.equal(UI.cut('ข้อความ [[UI]]{ไม่ใช่ json').ui,null,'broken JSON is dropped, never shown raw');
  assert.equal(UI.cut('ข้อความ [[UI]]{ไม่ใช่ json').text,'ข้อความ');
});

test('free layout from the allowed parts only; unknown types and HTML never pass',()=>{
  const ui=UI.sanitize({blocks:[{t:'card',title:'x',children:[{t:'row',children:[{t:'script',text:'<img src=x onerror=alert(1)>'},{t:'badge',text:'ok'}]}]},{t:'iframe',src:'https://evil'}]});
  assert.equal(ui.blocks.length,1);assert.equal(ui.blocks[0].children[0].children.length,1);
  const html=UI.html({ui:UI.sanitize({blocks:[{t:'text',text:'<b onclick=alert(1)>hi</b> **ok**'},{t:'card',title:'"><script>x</script>'}]})});
  assert.doesNotMatch(html,/<script|<[a-z][^>]*\son\w+=/i,'no real tag carries an event handler');
  assert.match(html,/&lt;b onclick=alert\(1\)&gt;hi&lt;\/b&gt; <b>ok<\/b>/,'text is escaped; only **bold** becomes markup');
});

test('buttons can only ask, open a listed app page, or open an in-chat tool',()=>{
  const b=a=>{const v=UI.sanitize({blocks:[{t:'button',label:'x',act:a}]});return v&&JSON.parse(JSON.stringify(v))};
  assert.equal(b({do:'open',to:'https://evil.example'}),null);
  assert.equal(b({do:'open',to:'javascript:alert(1)'}),null);
  assert.equal(b({do:'call',to:'0812345678'}),null);
  assert.equal(b({do:'valet',act:'delete'}),null);
  assert.equal(b({do:'open',to:'category',cat:'../../x'}),null);
  assert.equal(b({do:'open',to:'search'}),null,'search needs a query');
  assert.deepEqual(b({do:'open',to:'urgent'}).blocks[0].act,{do:'open',to:'urgent'});
  assert.deepEqual(b({do:'tool',k:'listen'}).blocks[0].act,{do:'tool',k:'listen'});
  assert.deepEqual(b({do:'ask',text:'แบตยี่ห้อไหนดี'}).blocks[0].act,{do:'ask',text:'แบตยี่ห้อไหนดี'});
  assert.deepEqual(JSON.parse(JSON.stringify([...UI.OPEN].sort())),['accident','category','garage','home','home_service','jobs','map','messages','news','post','quotes','search','spares','urgent']);
});

test('size, depth, numbers and icons are bounded',()=>{
  const many=UI.sanitize({blocks:[{t:'col',children:Array.from({length:12},()=>({t:'col',children:Array.from({length:12},()=>({t:'badge',text:'x'}))}))}]});
  let n=0;const walk=x=>{n++;(x.children||[]).forEach(walk)};many.blocks.forEach(walk);assert.ok(n<=UI.LIM.nodes,'≤ '+UI.LIM.nodes+' parts');
  let deep={t:'text',text:'leaf'};for(let i=0;i<10;i++)deep={t:'col',children:[deep]};
  const d=UI.sanitize({blocks:[deep]});assert.equal(d,null,'a structure deeper than the limit is dropped, not truncated into something misleading');
  let ok={t:'text',text:'leaf'};for(let i=0;i<5;i++)ok={t:'col',children:[ok]};assert.ok(UI.sanitize({blocks:[ok]}),'6 levels are fine');
  const m=UI.sanitize({blocks:[{t:'meter',label:'a',value:180},{t:'range',min:5000,max:1000,typical:99999},{t:'badge',text:'x',icon:'ti-made-up-icon'},{t:'badge',text:'y',icon:'engine'}]});
  assert.equal(m.blocks[0].value,100);assert.deepEqual([m.blocks[1].min,m.blocks[1].max,m.blocks[1].typical],[1000,5000,5000]);
  assert.equal(m.blocks[2].icon,'','icons not in the app icon set are dropped');assert.equal(m.blocks[3].icon,'ti-engine');
});

test('shops are never invented by the AI: the part only names a category to fill from the real directory',()=>{
  const s=UI.sanitize({blocks:[{t:'shops',cat:'eng',title:'ร้านใกล้คุณ',shops:[{name:'ร้านปลอม',phone:'0812345678'}]}]});
  assert.deepEqual(Object.keys(s.blocks[0]).sort(),['cat','limit','q','t','title']);
  const src=r('ai-ui.js');
  assert.match(src,/fetch\(base\+'\/api\/tech',\{headers:h\}\)/);
  assert.match(src,/l=all\.filter\(t=>t&&t\.id&&!t\.test&&!t\.vacation&&!t\.full&&t\.id!==mine\)/,'no test, paused, full or own shops');
});

test('chat wiring: hidden while streaming, drawn under the answer, kept with the conversation',()=>{
  const chat=r('chat.html');
  assert.match(chat,/<link rel="stylesheet" href="ai-ui\.css\?v=\d+">/);assert.match(chat,/<script src="ai-ui\.js\?v=\d+" defer><\/script>/);
  assert.match(chat,/function flowText\(t\)\{return String\(t\|\|""\)\.replace\(\/\\\[\\\[\(ASK\|NEXT\|ACT\|UI\)\\\]\\\]/);
  assert.match(chat,/const uc=window\.CendonAIUI\?CendonAIUI\.cut\(txt\)/);
  assert.match(chat,/\$\{m\.ui&&window\.CendonAIUI\?CendonAIUI\.html\(m\):""\}/);
  assert.match(chat,/if\(m\.ui\)\{try\{if\(JSON\.stringify\(m\.ui\)\.length<24000\)\{o\.ui=m\.ui;if\(m\.uiState\)o\.uiState=m\.uiState\}\}catch\(e\)\{\}\}/);
  assert.match(chat,/if\(p\.ui\)m\.ui=p\.ui;m\.jobApplied=true;/,'background answers too');
});
