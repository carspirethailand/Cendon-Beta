import {test} from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';

const router=readFileSync(new URL('../stability.js',import.meta.url),'utf8');
const mobile=readFileSync(new URL('../mobile-ui.js',import.meta.url),'utf8');
const css=readFileSync(new URL('../stability.css',import.meta.url),'utf8');
const pages=['index','garage','news','spares','profile','chat'];
function routing({pathname='/',connection,hidden=false,prerender=false}={}){
  const events=new Map(),links=[],assigned=[];
  const location={origin:'https://fixture.test',pathname,href:'https://fixture.test'+pathname,assign:url=>assigned.push(url)};
  const document={hidden,prerendering:prerender,head:{appendChild:l=>links.push(l)},
    createElement:()=>({}),addEventListener:(name,fn)=>events.set(name,fn)};
  vm.runInNewContext(router,{document,location,navigator:{connection},URL,Set});
  function fire(type,href,extra={}){
    const a={href:new URL(href,location.href).href,target:extra.target||'',hasAttribute:name=>extra.download&&name==='download',getAttribute:name=>name==='aria-disabled'&&extra.disabled?'true':null};
    let prevented=false,stopped=false;
    const e={target:{closest:()=>a},button:0,isTrusted:true,preventDefault:()=>{prevented=true},stopImmediatePropagation:()=>{stopped=true},...extra};
    events.get(type)(e);return {prevented,stopped};
  }
  return {events,links,assigned,fire};
}

test('a real navigation click leaves immediately without a timer/auth gate',()=>{
  const f=routing();assert.deepEqual(f.fire('click','/garage'),{prevented:true,stopped:true});
  assert.deepEqual(f.assigned,['https://fixture.test/garage']);
});
for(const extra of [{ctrlKey:true},{metaKey:true},{shiftKey:true},{altKey:true},{button:1},{target:'_blank'},{download:true},{disabled:true},{defaultPrevented:true},{isTrusted:false}])test('native/synthetic click semantics are preserved: '+JSON.stringify(extra),()=>{
  const f=routing();assert.equal(f.fire('click','/news',extra).prevented,false);assert.equal(f.assigned.length,0);
});
for(const href of ['/garage.html','/garage?car=fixture'])test('same-page actions stay with the existing page: '+href,()=>{
  const f=routing({pathname:'/garage'});assert.equal(f.fire('click',href).prevented,false);
});
for(const href of ['/login','/admin','/api/tech','https://external.test/garage','/news#article'])test('no override for unrelated/protected/hash destinations: '+href,()=>{
  const f=routing();assert.equal(f.fire('click',href).prevented,false);assert.equal(f.assigned.length,0);
});
test('intent warmup is bounded, de-duplicated and strips share/personal query values',()=>{
  const f=routing();f.fire('pointerover','/garage?car=fixture');f.fire('pointerover','/garage?car=other');
  f.fire('focusin','/news');f.fire('pointerdown','/spares');
  assert.deepEqual(f.links.map(l=>l.href),['https://fixture.test/garage','https://fixture.test/news']);
  f.links[0].onload();f.fire('pointerdown','/spares');assert.equal(f.links.length,3);
});
for(const options of [{hidden:true},{prerender:true},{connection:{saveData:true}},{connection:{effectiveType:'2g'}},{connection:{effectiveType:'slow-2g'}}])test('warmup respects background/slow/data-saving browsers: '+JSON.stringify(options),()=>{
  const f=routing(options);f.fire('pointerover','/news');assert.equal(f.links.length,0);
});

function mobileBoot({nav=false,avatar=false}={}){
  const events={},observations=[],timers=[];
  const avatarNode={id:'avatarBtn'};
  const document={readyState:'loading',body:{id:'body'},getElementById:id=>id==='avatarBtn'&&avatar?avatarNode:null,
    querySelector:()=>nav?{}:null,addEventListener:(name,fn)=>events[name]=fn};
  class Observer{constructor(fn){this.fn=fn}observe(target,options){observations.push({target,options,observer:this})}}
  const sandbox={document,window:{},location:{pathname:'/chat'},matchMedia:()=>({matches:false,addEventListener(){}}),
    addEventListener(){},MutationObserver:Observer,setTimeout:(fn,ms)=>{timers.push({fn,ms});return timers.length;},clearTimeout(){}};
  vm.runInNewContext(mobile,sandbox);events.DOMContentLoaded();return {observations,timers};
}
test('chat streaming DOM has no redundant mobile body observer',()=>{
  const f=mobileBoot();assert.equal(f.observations.length,0);assert.equal(f.timers.length,0);
});
test('avatar updates observe only the avatar and coalesce instead of resetting timers',()=>{
  const f=mobileBoot({nav:true,avatar:true});assert.equal(f.observations.length,1);
  assert.equal(f.observations[0].target.id,'avatarBtn');
  for(let i=0;i<100;i++)f.observations[0].observer.fn();
  assert.equal(f.timers.length,1);assert.equal(f.timers[0].ms,32);
});
test('all app pages share one mobile implementation and early geometry CSS',()=>{
  for(const name of pages){
    const s=readFileSync(new URL('../'+name+'.html',import.meta.url),'utf8');
    assert.equal((s.match(/src="mobile-ui\.js"/g)||[]).length,1,name);
    assert.ok(s.indexOf('href="stability.css"')<s.indexOf('</head>'),name);
    assert.ok(!s.includes('<script id="mjs">'),name);
    assert.ok(!s.includes('"prerender":'),name);
    assert.ok(!s.includes('cendon-one.css')&&!s.includes('cendon-one.js'),name);
  }
  assert.ok(!mobile.includes('.observe(D.body'));
});
test('mobile nav dimensions and transition are shared rather than content-sized',()=>{
  assert.match(css,/width:calc\(100vw - 24px/);assert.match(css,/height:64px!important/);
  assert.match(css,/grid-template-columns:repeat\(5,minmax\(0,1fr\)\)/);
  assert.match(css,/font-size:10px!important;line-height:11px!important/);
  assert.match(css,/::view-transition-group\(mnav\)\{animation:none!important\}/);
});
test('chat does not hide the shell for a timed intro or animate its navigation/composer',()=>{
  const s=readFileSync(new URL('../chat.html',import.meta.url),'utf8');
  assert.ok(!s.includes('classList.add("pre-enter")'));
  const enter=s.slice(s.indexOf('function uiEnter(){'),s.indexOf('/* warp intro dismissal */'));
  assert.ok(!enter.includes('.pill')&&!enter.includes('.composer')&&!enter.includes('blur('));
  assert.ok(enter.includes('duration:140'));assert.ok(enter.includes('Math.min(i*8,40)'));
});
