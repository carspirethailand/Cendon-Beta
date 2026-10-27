import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const read=f=>readFileSync(new URL('../'+f,import.meta.url),'utf8');
test('cancellation notifications use the recorded actor, never infer who cancelled from the viewing side',()=>{
  const s=read('bell.js'),code=s.slice(s.indexOf('const money='),s.indexOf('/* ── หน้าตา:'));
  for(const side of ['customer','technician','both'])for(const [by,label]of Object.entries({customer:'Customer cancelled',technician:'Mechanic cancelled',admin:'Staff cancelled',system:'Request closed by the system',unknown:'Job cancelled'})){
    const storage=new Map(),context={localStorage:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v)},T:(th,en)=>en};vm.createContext(context);vm.runInContext(code+';this.fire=jobEvents',context);
    const j={id:'fixture',status:'accepted',side,car:'Fixture car',updatedAt:1};assert.equal(context.fire([j],'one').length,0);
    const result=context.fire([{...j,status:'cancelled',cancelledBy:by,updatedAt:2}],'one');
    /* ไม่แจ้งเรื่องที่ตัวเองเพิ่งกด: ช่างยกเลิกเอง/ลูกค้ายกเลิกเอง ไม่เด้งกลับมาหาคนกด */
    const own=side==='technician'?by==='technician':by==='customer';
    if(own){assert.equal(result.length,0,side+' '+by);continue}
    assert.equal(result.length,1);assert.equal(result[0].title,label+': Fixture car');
  }
});
test('all main pages use the shared UI dictionary while authored user content is excluded',()=>{
  for(const file of ['index','garage','chat','news','profile','spares']){const s=read(file+'.html');assert.match(s,/i18n\/ui-en\.js\?v=4/);assert.match(s,/ui-language\.js\?v=15/)}
  /* นิตยสาร: ภาษาอื่นนอกจากไทย/อังกฤษใช้ตัวแปลกลาง (เดิมตกเป็นไทยทั้งหน้า) และวันที่ตามภาษาที่เลือก */
  const news=read('news.html');assert.match(news,/const MZT=\(th,en\)=>\(window\.spireT\?window\.spireT\(th,en\)/);assert.match(news,/toLocaleDateString\(lang==="th"\?"th-TH":lang==="en"\?"en-GB":lang,/);
  const module=read('ui-language.js');assert.match(module,/\.msg,\.bubble,\.nt,\.nm,\.about/);assert.doesNotMatch(module,/fetch\(/);
});
test('chat, analysis and live calls carry the selected language rather than Thai/English-only guessing',()=>{
  assert.match(read('chat.html'),/lang:window\.spireLang\?\.\(\)\|\|lang/);
  assert.match(read('feature-ai.js'),/lang:window\.spireLang\?\.\(\)\|\|window\.lang/);
  assert.match(read('call-session.js'),/lang:window\.spireLang\?\.\(\)\|\|lang/);
  assert.match(read('call-session.js'),/turnComplete:false/);
  assert.match(read('call-tools.js'),/lang:window\.spireLang\?\.\(\)\|\|lang/);
});
test('an active call accepts a saved language change without reconnecting or generating a preference-only reply',()=>{
  const s=read('call-session.js'),a=s.indexOf('  let callLanguage='),b=s.indexOf('  /* ข้อความจากระบบเข้าสาย',a),sent=[],listeners={};
  const context={global:{spireLang:()=> 'en',addEventListener:(n,f)=>listeners[n]=f},lang:'en',host:{getUser:()=>({uid:'one'})},callActive:true,callWS:{readyState:1,send:x=>sent.push(JSON.parse(x))}};
  vm.createContext(context);vm.runInContext(s.slice(a,b),context);
  listeners['cendon:preferences']({detail:{uid:'one',lang:'ja'}});assert.equal(sent.length,1);assert.equal(sent[0].clientContent.turnComplete,false);assert.match(sent[0].clientContent.turns[0].parts[0].text,/now ja/);
  listeners['cendon:preferences']({detail:{uid:'one',lang:'ja'}});assert.equal(sent.length,1);
  listeners['cendon:preferences']({detail:{uid:'other',lang:'de'}});assert.equal(sent.length,1);
});
test('Home and Studio expose a live language setter without reloading or discarding an open form',()=>{
  const s=read('index.html'),a=s.indexOf('window.spireLang=()=>LANG;'),b=s.indexOf('\nconst $=',a),calls=[];
  const context={window:{addEventListener(){},dispatchEvent:e=>calls.push(e.type),CendonLocale:{paint:()=>calls.push('paint')}},document:{documentElement:{}},localStorage:{setItem:(k,v)=>calls.push(k+':'+v)},LANG:'th',TH:true,LOC:'th-TH',LANGS:['th','en','ja'],L10N:null,L10P:[],homePatterns:()=>[],T:(th,en)=>en,paintStatic:()=>calls.push('static'),CustomEvent:class{constructor(type,o){this.type=type;this.detail=o.detail}}};
  vm.createContext(context);vm.runInContext(s.slice(a,b),context);context.window.spireSetLang('ja');assert.equal(context.window.spireLang(),'ja');assert.equal(context.TH,false);assert.equal(context.LOC,'ja');assert.equal(context.document.documentElement.lang,'ja');assert.ok(calls.includes('paint'));assert.ok(calls.includes('cendon:language'));
});
