import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
/* กระดิ่ง = ศูนย์รวมงาน: เรื่องราคาอยู่บนสุด · งานที่รอเรา · ข้อความใหม่ · ที่เหลืออยู่ "กำลังดำเนินการ" */
const r=f=>readFileSync(new URL('../'+f,import.meta.url),'utf8').replace(/\r\n/g,'\n');
const source=r('bell.js');
function fixture(uid='one',saved=new Map()){
  const document={readyState:'loading',hidden:false,addEventListener(){},querySelector:()=>({})};
  const window={spireAuth:{currentUser:{uid}},CendonChatJobs:{},addEventListener(){}};
  vm.runInNewContext(source,{window,document,navigator:{},localStorage:{getItem:k=>saved.get(k)??null,setItem:(k,v)=>saved.set(k,v),removeItem:k=>saved.delete(k)},Date,Set,setTimeout,clearTimeout});
  return {bell:window.CendonBell,window,saved};
}
const now=Date.now();
const job=(id,o)=>({id,side:'customer',status:'requested',car:'Honda City 2019',techName:'Fixture shop',total:0,unread:0,createdAt:now-36e5,updatedAt:now-36e5,...o});
const JOBS=[
  job('msg',{status:'enroute',unread:2,updatedAt:now}),
  job('done',{status:'done',total:2400,updatedAt:now-1000}),
  job('quote',{status:'quoted',total:1300,updatedAt:now-5e6}),
  job('wait',{status:'requested'}),
  job('g1',{status:'quoted',group:'G',total:1500}),job('g2',{status:'requested',group:'G'}),
  job('closed',{status:'completed'}),job('old',{status:'cancelled'}),
  job('tech-new',{side:'technician',status:'requested',updatedAt:now-9e6}),
];
const POSTS=[{id:'p1',status:'open',car:'Honda City 2019',offers:2,lowest:450,createdAt:now-2e6},{id:'p2',status:'open',car:'Mazda 2',offers:0,createdAt:now}];
test('quotes and offers come first, then jobs waiting on you, then new messages; finished jobs stay out',()=>{
  const {bell}=fixture();bell.setJobs(JOBS,POSTS);const h=bell.hub();
  const ranks=[...h.act.map(x=>x.r)];assert.deepEqual([...ranks].sort((a,b)=>a-b),ranks,'sorted by priority');
  const top=[...h.act.filter(x=>x.r===0).map(x=>x.id)].sort();
  assert.deepEqual(top,['g:G','p:p1','quote','tech-new'].sort(),'quote, group compare, post with offers and a new request for the shop are all priority 0');
  assert.equal(h.act.find(x=>x.id==='done').r,1);assert.equal(h.act.find(x=>x.id==='msg').r,2);
  assert.ok(!h.act.concat(h.live).some(x=>['closed','old','g1','g2'].includes(x.id)),'finished jobs and grouped requests are not listed one by one');
  assert.deepEqual([...h.live.map(x=>x.id)].sort(),['p:p2','wait'].sort());
  assert.equal(h.act.find(x=>x.id==='g:G').url,'/compare/G');
});
test('the job summary is kept per account, slimmed, and never shown to another account',()=>{
  const f=fixture('one');f.bell.setJobs([job('a',{status:'quoted',total:900,address:'99/1 private street',technicianPhone:'0812345678',messages:[{text:'private'}]})],[]);
  const stored=f.saved.get('spire_bell_jobs');assert.ok(stored);assert.doesNotMatch(stored,/private street|0812345678|"messages"/,'no address, phone or chat text in the cache');
  assert.equal(JSON.parse(stored).uid,'one');
  const other=fixture('two',f.saved);assert.equal(other.bell.hub().act.length,0,'another account sees nothing');
});
test('bell badge counts priority work too, and its label says how many are waiting',()=>{
  assert.match(source,/T\(`การแจ้งเตือน \$\{n\} เรื่องรอคุณ`,`Notifications, \$\{n\} waiting for you`\)/);
  assert.match(source,/act\.sort\(\(a,b\)=>a\.r-b\.r\|\|\(b\.at\|\|0\)-\(a\.at\|\|0\)\)/);
});
test('home hands its fresh job list to the bell, and the old My jobs button opens the bell',()=>{
  const h=r('index.html');
  assert.match(h,/CendonBell\.setJobs\(JOBS_OK\?JOBS:null,/);
  assert.match(h,/\$\("bJobs"\)\.onclick=\(\)=>\{const b=window\.CendonBell&&CendonBell\.buttons\(\)\.find\(x=>x\.offsetParent\);if\(b\)CendonBell\.panel\(b\);else jobs\(\)\}/);
});
test('bell settings moved to Settings: the panel only suggests features that are off, with a 14-day "not now"',()=>{
  assert.doesNotMatch(source,/function kmRow\(/,'no on/off rows inside the bell any more');
  assert.match(source,/const snoozed=k=>/);assert.match(source,/v\[k\]=Date\.now\(\)\+14\*86400000/);
  assert.match(source,/openSettings/);
  const nav=r('nav-pages.js');assert.match(nav,/"notif"\]/);
  const st=r('settings.js');assert.match(st,/act:'notif-dev'/);
});
test('no "AI answered" notice while the chat page is on screen — in the page and in the service worker',()=>{
  const cj=r('chat-jobs.js');assert.ok(cj.includes("const onChat=()=>/^\\/chat(?:\\.html)?\\/?$/.test(location.pathname);"));
  assert.match(cj,/const view=!D\.hidden&&\(!!config\?\.viewing\?\.\(job\)\|\|onChat\(\)\)/);
});
test('service worker: an AI-answer push is dropped only while a chat tab is visible; other pushes always show',async()=>{
  const H={},shown=[];let tabs=[];
  const self={addEventListener:(t,f)=>{H[t]=f},registration:{showNotification:async(title,o)=>{shown.push(o.tag)}},clients:{matchAll:async()=>tabs},location:{origin:'https://app.unit.test'},skipWaiting(){}};
  vm.runInNewContext(r('sw.js'),{self,caches:{},fetch:async()=>{},URL,Response,console,setTimeout});
  const push=async data=>{let p;H.push({data:{json:()=>data,text:()=>''},waitUntil:x=>{p=x}});await p};
  tabs=[{url:'https://app.unit.test/chat',visibilityState:'visible'}];
  await push({title:'Cendon AI ตอบแล้ว',tag:'cendon-ai-1'});assert.deepEqual(shown,[],'viewing the chat = no device popup');
  await push({title:'ช่างเสนอราคา',tag:'quote-1'});assert.deepEqual(shown,['quote-1'],'job pushes still show');
  tabs=[{url:'https://app.unit.test/chat',visibilityState:'hidden'},{url:'https://app.unit.test/',visibilityState:'visible'}];
  await push({title:'Cendon AI ตอบแล้ว',tag:'cendon-ai-2'});assert.deepEqual(shown,['quote-1','cendon-ai-2'],'chat in the background = still notified');
});
test('job sheet: status card with step road + AI-style light while waiting, live map kept as is, actions unchanged',()=>{
  const h=r('index.html');
  assert.match(h,/const hero=`<section class="jw-hero s-\$\{s\}\$\{waiting\?" wait":""\}"><span class="jw-ring"/,'status card carries the loading ring');
  assert.match(h,/\.jw-hero\.wait \.jw-ring\{opacity:1;animation-play-state:running\}/,'ring only runs while waiting for the other side');
  assert.match(h,/#FFB547 34%,#F28C38 42%,#FF4D7A 53%,#8B6BFF 63%/,'same colours as the Cendon AI composer light');
  assert.match(h,/class="jw-road"[\s\S]{0,800}\$\{CAR_TOY\}/,'the toy car drives along the step road');
  assert.match(h,/\$\{hero\}\$\{liveCard\}/,'the live map card follows the headline untouched');
  for(const a of ['newcode','share','unshare','dispute','extra_ok:','extra_no:','accept','quote','start'])assert.ok(h.includes('data-a="'+a)||h.includes('["'+a+'"'),a);
  assert.match(h,/const at=s==="done"\?4:rk/,'repair finished = only the last step is left');
  assert.match(h,/requested:asCust,quoted:!asCust,accepted:asCust,enroute:asCust,working:asCust,done:!asCust/,'waiting = the other side has the next move');
  assert.match(h,/id="qSum"/);assert.match(h,/id="qW" value="\$\{w0\}"/,'warranty presets still post one number');
  assert.match(h,/\.jw-ring,\.jw-hero::after[^}]*\{animation:none;transition:none\}/,'reduced motion stops every moving part');
});
