import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
/* แอปจริงอยู่ index.html (tech.html เป็นแค่ตัวส่งต่อไปหน้าแรก) */
const page=readFileSync(new URL('../index.html',import.meta.url),'utf8');
const part=(a,b)=>page.slice(page.indexOf(a),page.indexOf(b,page.indexOf(a)));
const stepSource=part('function step(n){','/* สถานะใบสมัคร');
const reviewSource=part('const VETTING_VERSION=','/* ═══ บัญชี');
const keys=['identity','phone','work','skills','shop','terms'];
function node(){return {value:'',checked:false,disabled:false,textContent:'',innerHTML:'',dataset:{},addEventListener(){},scrollIntoView(){},querySelectorAll:()=>[],querySelector:()=>node(),parentElement:{querySelector:()=>({})}};}
const valid=()=>({title:'นาย',name:'สมชาย ใจดี',idNo:'1101700203450',birth:'1996-05-01',phone:'0812345678',years:5,cats:['eng'],from:500,warranty:30,about:'ซ่อมเครื่องยนต์และระบบแอร์ มีเครื่องตรวจและเครื่องมือประจำอู่',docs:{}});
function stepFixture(over={}){
  const nodes=new Map(),$=id=>{if(!nodes.has(id))nodes.set(id,node());return nodes.get(id);},sheets=[];
  const app={...valid(),...over};
  const c=vm.createContext({APP:app,ME:{admin:true,staff:true},$: $,esc:String,CAT:Object.fromEntries(['eng','air','body','ev','tyre'].map(x=>[x,{ic:'',th:x}])),DK:[['id','id',1,1],['selfie','selfie',1,1],['shop','shop',1,3],['work','work',3,6]],stepHd:()=>'',segs:()=>'',fmtId:String,keep(){},wireSeg(){},thaiId:()=>true,ageOf:()=>30,money:String,landing(){},sheet(o){sheets.push(o);if(sheets.length===1)o.mount?.({querySelectorAll:()=>[]});}});
  vm.runInContext(stepSource,c);return {c,$,app,sheets};
}
for(const over of [{name:'Hasdjjgiohwigrs'},{years:1000},{years:29},{years:2.5},{about:'random'}])test('admin real application is not a validation bypass: '+JSON.stringify(over),()=>{const f=stepFixture(over);f.c.step(1);f.$('aNx').onclick();assert.equal(f.sheets.length,1);assert.match(f.$('err').textContent,/กรุณาตรวจสอบ/);});
test('real application moves forward only when required data passes',()=>{const f=stepFixture();f.c.step(1);f.$('aNx').onclick();assert.equal(f.sheets.length,2);});
test('admin real application cannot skip required documents',()=>{const f=stepFixture();f.c.step(3);f.$('aNx').onclick();assert.equal(f.sheets.length,1);assert.match(f.$('err').textContent,/ยังขาดเอกสาร/);});
async function reviewFixture(ai,me={admin:true,uid:'reviewer'}){
  const nodes=new Map(),$=id=>{if(!nodes.has(id))nodes.set(id,node());return nodes.get(id);},events={},requests=[],boxes=keys.map(k=>({...node(),checked:true,dataset:{k}}));
  const fields=new Map(keys.flatMap(k=>[[`[data-method="${k}"]`,{...node(),value:'live_call'}],[`[data-evidence="${k}"]`,{...node(),value:'Unit-test evidence only; not a real verification.'}]]));
  const b={querySelectorAll:s=>s==='[data-k]'?boxes:[],querySelector:s=>fields.get(s),addEventListener(k,fn){events[k]=fn;}};
  $('rvN').value='Unit-test human review note';
  const app={uid:'applicant',revision:1,name:'Unit test',cats:[],ai};
  const fresh={status:'complete',policyVersion:3,revision:1,flags:[]};
  const c=vm.createContext({ME:me,$,DK:[],CAT:{},esc:String,money:String,fmtId:String,zoom(){},aiCard:()=>'',busy:async(_b,fn)=>fn(),toast(){},load:async()=>{},staffBar(){},reviewList(){},api:async(path,args)=>{requests.push({path,args});return path.includes('/rescreen')?{ai:fresh}:{docs:[]};},sheet(o){o.mount?.(b);}});
  vm.runInContext(reviewSource,c);await c.reviewOne(app);return {$,fields,events,requests,app};
}
for(const ai of [null,{status:'failed'},{status:'complete',policyVersion:2,revision:1,flags:[]},{status:'complete',policyVersion:3,revision:2,flags:[]},{status:'complete',policyVersion:3,revision:1,flags:[{source:'rules',level:'high'}]},{status:'complete',policyVersion:3,revision:1,flags:[{source:'identity',level:'high',block:true,code:'id_mismatch',msg:'x'}]}])test('approval button stays locked for missing, failed, stale or invalid screening',async()=>{const f=await reviewFixture(ai);assert.equal(f.$('rvOk').disabled,true);});
test('AI retry is bound inside reviewer screen and fresh successful result unlocks complete evidence',async()=>{const f=await reviewFixture(null);await f.$('aiRe').onclick();assert.equal(f.requests.filter(x=>x.path==='/api/tech/rescreen').length,1);assert.equal(f.$('rvOk').disabled,false);f.fields.get('[data-evidence="phone"]').value='';f.events.input();assert.equal(f.$('rvOk').disabled,true);});
test('review submits evidence, revision and strict checks to backend',async()=>{const f=await reviewFixture({status:'complete',policyVersion:3,revision:1,flags:[]});await f.$('rvOk').onclick({currentTarget:f.$('rvOk')});const payload=f.requests.find(x=>x.path==='/api/tech/review').args.body;assert.equal(payload.revision,1);assert.equal(payload.evidence.phone.method,'live_call');assert.equal(Object.keys(payload.evidence).length,6);assert.ok(Object.values(payload.checks).every(x=>x===true));});
for(const me of [{admin:false,uid:'reviewer'},{admin:true,uid:'applicant'}])test('moderator/self approval stays locked: '+JSON.stringify(me),async()=>{const f=await reviewFixture({status:'complete',policyVersion:3,revision:1,flags:[]},me);assert.equal(f.$('rvOk').disabled,true);assert.equal(f.$('rvNo').disabled,true);});
