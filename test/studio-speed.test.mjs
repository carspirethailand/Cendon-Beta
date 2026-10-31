/* Studio งานด่วน: ส่งถึงทุกร้านพร้อมกัน · ชีพจรค้างไม่ทำให้งานขึ้นช้า · แจ้งเตือนมาถึงแล้วหน้าแอปดึงทันที */
import {test} from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
const fn=(name)=>{const i=html.indexOf(`async function ${name}(`);assert.ok(i>=0,name);let d=0,j=html.indexOf('{',i);
  for(let k=j;k<html.length;k++){if(html[k]==='{')d++;else if(html[k]==='}'&&!--d)return html.slice(i,k+1);}};
const deferred=()=>{let resolve,reject;const promise=new Promise((a,b)=>{resolve=a;reject=b});return {promise,resolve,reject};};
const flush=async()=>{for(let i=0;i<20;i++)await Promise.resolve();};
function group(reply){
  const calls=[],ctx={calls,toasts:[],crypto,Promise,Error,
    api:(path,o)=>{const d=deferred();calls.push({body:o.body,...d});reply&&reply(calls.length-1,d,o.body);return d.promise;},
    toast:t=>ctx.toasts.push(t),refreshMe(){},sheetFresh(){},openGroup(){}};
  vm.runInNewContext(fn('sendGroup')+';this.sendGroup=sendGroup',ctx);return ctx;
}
const shops=[{id:'a',mobile:true},{id:'b',mobile:true},{id:'c',mobile:false}];
const v=(over={})=>({car:'Vios',symptom:'แบตหมด',mode:'mobile',urgent:true,photos:[],...over});

test('studio: an urgent request reaches every shop at the same moment, not one after another',async()=>{
  const g=group();const done=g.sendGroup(shops,v());await flush();
  assert.equal(g.calls.length,3,'all three shops are asked before any answers');
  assert.equal(new Set(g.calls.map(c=>c.body.group)).size,1,'one group');
  assert.deepEqual(g.calls.map(c=>c.body.mode),['mobile','mobile','shop']);
  g.calls.forEach(c=>c.resolve({id:c.body.id}));await done;assert.deepEqual(g.toasts,['ส่งถึง 3 ร้านแล้ว']);
});

test('studio: photos upload once — the first shop that accepts gets them, the rest go together without re-uploading',async()=>{
  const g=group();const done=g.sendGroup(shops,v({photos:['data:image/jpeg;base64,AAAA']}));await flush();
  assert.equal(g.calls.length,1);assert.equal(g.calls[0].body.photos.length,1);
  g.calls[0].reject(Object.assign(new Error('ร้านนี้ปิดชั่วคราว'),{status:409}));await flush();
  assert.equal(g.calls.length,2,'a refusal moves the photos to the next shop');assert.equal(g.calls[1].body.photos.length,1);
  g.calls[1].resolve({});await flush();
  assert.equal(g.calls.length,3);assert.equal(g.calls[2].body.photos.length,0);
  g.calls[2].resolve({});await done;assert.deepEqual(g.toasts,['ส่งถึง 2 ร้านแล้ว']);
});

test('studio: a form mistake still comes back to the form; a total failure still says so',async()=>{
  const bad=Object.assign(new Error('เบอร์โทร: ไม่ถูกต้อง'),{status:400});
  const g=group((i,d)=>d.reject(i===1?bad:new Error('ระบบขัดข้อง')));
  await assert.rejects(g.sendGroup(shops,v()),e=>e===bad);
  const h=group((i,d)=>d.reject(new Error('ร้านเต็ม')));
  await assert.rejects(h.sendGroup(shops,v()),/ร้านเต็ม/);
  const p=group((i,d)=>d.reject(bad));
  await assert.rejects(p.sendGroup(shops,v({photos:['x']})),e=>e===bad);assert.equal(p.calls.length,1,'stops at the form error, like before');
});

test('studio: a stalled pulse is cut at 4 s and retried in 1.5 s instead of waiting 20 s',()=>{
  const start=html.slice(html.indexOf('function startAlerts(){'),html.indexOf('function stopAlerts()'));
  assert.match(start,/api\("\/api\/tech\/pulse",\{signal:ac\.signal\}\)/);
  assert.match(start,/setTimeout\(\(\)=>ac\.abort\(\),4000\)/);
  assert.match(start,/document\.hidden\?30000:miss\?1500:PULSE_OK\?3000:15000/);
});

test('studio: a job notification reaching the phone wakes open pages to fetch now (tag only, no content)',async()=>{
  const source=readFileSync(new URL('../sw.js',import.meta.url),'utf8');const listeners={},posted=[],shown=[];
  const client=(url,vis='visible')=>({url,visibilityState:vis,postMessage:m=>posted.push({url,m})});
  const self={location:new URL('https://fixture.test/sw.js'),addEventListener:(n,f)=>listeners[n]=f,skipWaiting(){},
    registration:{navigationPreload:{async enable(){}},async showNotification(t,o){shown.push({t,o})}},
    clients:{async claim(){},async matchAll(){return [client('https://fixture.test/'),client('https://fixture.test/chat','hidden')]}}};
  vm.runInNewContext(source,{self,caches:{},URL,Set,Headers,Request,Response,AbortController,fetch:async()=>new Response(''),setTimeout});
  const pending=[];
  listeners.push({data:{json:()=>({title:'งานด่วน',body:'แบตหมด · 0812345678',url:'/jobs/x',tag:'cendon-job-x'})},waitUntil:p=>pending.push(p)});
  await Promise.all(pending);
  assert.deepEqual(JSON.parse(JSON.stringify(posted.map(p=>p.m))),[{type:'cendon:push',tag:'cendon-job-x'},{type:'cendon:push',tag:'cendon-job-x'}]);
  assert.doesNotMatch(JSON.stringify(posted),/0812345678|แบตหมด/,'pages get the tag only');
  assert.equal(shown.length,1,'the phone notification still shows');
  /* หน้าแอป: เฉพาะป้ายงานช่างเท่านั้นที่ปลุกให้ดึง (ไม่ใช่เตือนต่อภาษี/คำตอบ AI) */
  const page=html.slice(html.indexOf('/* แจ้งเตือนงานมาถึงเครื่อง'),html.indexOf('function stopAlerts()'));
  assert.match(page,/\/\^cendon\(\?:-job-\|\$\)\/\.test/);assert.match(page,/if\(MODE==="tech"\)startAlerts\(\);else if\(U\)refreshJobs\(\)/);
});
