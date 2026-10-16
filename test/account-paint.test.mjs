import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
const source=readFileSync(new URL('../account-paint.js',import.meta.url),'utf8');
const I='cendon_paint_identity',H='cendon_paint_handoff';
function own(uid='A'){
  return new Map([['spire_setup',JSON.stringify({uid,v:3,level:'advance'})],['spire_cachedUser',JSON.stringify({uid,name:'Fixture'})],['spire___account_'+uid+'_status',JSON.stringify({status:'completed',completed:true,profile:{uid}})]]);
}
function fixture({pathname='/',uid=null,local=own(),session=new Map(),now=100000,blocked=false}={}){
  const events={},root={dataset:{}},storage=map=>({getItem:k=>{if(blocked)throw Error('blocked');return map.get(k)??null},setItem:(k,v)=>{if(blocked)throw Error('blocked');map.set(k,v)},removeItem:k=>{if(blocked)throw Error('blocked');map.delete(k)}});
  const makeUser=id=>id?{uid:id,getIdToken(){throw Error('A paint hint must never read or mint a token')}}:null;
  const document={documentElement:root,addEventListener:(name,fn)=>{events[name]=fn}};
  const window={auth:{currentUser:makeUser(uid)},addEventListener:(name,fn)=>{events[name]=fn}};
  const location={origin:'https://unit.test',pathname,href:'https://unit.test'+pathname};
  class Clock extends Date{static now(){return now}}
  vm.runInNewContext(source,{window,document,location,URL,Date:Clock,Math,Set,localStorage:storage(local),sessionStorage:storage(session)});
  return {api:window.CendonPaint,root,events,local,session,setUser:id=>{window.auth.currentUser=makeUser(id)},clock:value=>{now=value},click:(href,extra={})=>events.click({isTrusted:true,button:0,target:{closest:()=>({href:new URL(href,location.href).href,hasAttribute:()=>false,target:''})},...extra})};
}
function handoff(){const f=fixture({uid:'A'});f.api.observed('A');assert.equal(f.api.prepare('/garage'),true);return f}
test('same-tab completed navigation restores content at parser time, before destination Firebase exists',()=>{
  const a=handoff(),b=fixture({pathname:'/garage',local:a.local,session:a.session});
  assert.equal(b.root.dataset.gate,'0');/* เลิกแบ่งระดับการใช้งานแล้ว: หน้าเปิดแบบเต็มเสมอ (ค่าเดิมที่เก็บไว้ยังอ่านได้ แต่ไม่ใช้ซ่อนเครื่องมือ) */assert.equal(b.root.dataset.level,'enthusiast');assert.equal(b.api.level(),'advance');assert.equal(b.session.has(H),false);
  assert.equal(Object.hasOwn(b.api,'completed'),false,'paint metadata is not server completion authority');
});
test('handoff stores only identity generation, target shell and timestamp, never a credential or PII',()=>{
  const f=handoff(),h=JSON.parse(f.session.get(H));assert.deepEqual(Object.keys(h).sort(),['at','generation','target','uid']);
  for(const word of ['token','email','birthDate','role','name'])assert.equal(Object.hasOwn(h,word),false);
});
test('handoff is one-use and bounded to its destination and ten seconds',()=>{
  for(const variant of ['replay','other-path','expired','future','other-generation']){
    const a=handoff();if(variant==='other-generation')a.local.set(I,JSON.stringify({uid:'A',generation:'different'}));
    const path=variant==='other-path'?'/profile':'/garage',now=variant==='expired'?110001:variant==='future'?99999:100000;
    if(variant==='replay')fixture({pathname:'/garage',local:a.local,session:a.session});
    const b=fixture({pathname:path,now,local:a.local,session:a.session});assert.equal(b.root.dataset.gate,'1',variant);assert.equal(b.api.level(),'');assert.equal(b.session.has(H),false);
  }
});
test('foreign account projection, completion record or cached user never opens a private page',()=>{
  for(const key of ['spire_setup','spire___account_A_status','spire_cachedUser']){
    const a=handoff(),v=JSON.parse(a.local.get(key));if(key.includes('_status'))v.profile.uid='B';else v.uid='B';a.local.set(key,JSON.stringify(v));
    const b=fixture({pathname:'/garage',local:a.local,session:a.session});assert.equal(b.root.dataset.gate,'1');assert.equal(b.api.level(),'');
  }
});
test('an old setup flag alone, an unrestored source user or blocked storage cannot create a handoff',()=>{
  const noStatus=own();noStatus.delete('spire___account_A_status');
  for(const f of [fixture({uid:null}),fixture({uid:'A',local:noStatus}),fixture({uid:'A',blocked:true})]){
    f.api.observed('A');assert.equal(f.api.prepare('/garage'),false);assert.equal(f.session.has(H),false);
  }
});

test('rapid consecutive taps forward consumed paint context without prolonging the original deadline',()=>{
  const a=handoff(),b=fixture({pathname:'/garage',now:100200,local:a.local,session:a.session});
  assert.equal(b.api.prepare('/news'),true);b.events.beforeunload();assert.equal(JSON.parse(b.session.get(H)).target,'/news');assert.equal(JSON.parse(b.session.get(H)).at,100000);
  const c=fixture({pathname:'/news',now:100400,local:a.local,session:a.session});assert.equal(c.root.dataset.gate,'0');
  c.clock(110001);assert.equal(c.api.prepare('/profile'),false);assert.equal(c.session.has(H),false);
  c.setUser('A');c.api.observed('A');assert.equal(c.api.prepare('/profile'),true);assert.equal(JSON.parse(c.session.get(H)).at,110001);
});
test('normal cross-page clicks create a handoff before the native navigation handler runs',()=>{
  const f=fixture({uid:'A'});f.api.observed('A');f.click('/garage?car=private#section');const h=JSON.parse(f.session.get(H));assert.equal(h.target,'/garage');assert.equal(JSON.stringify(h).includes('private'),false);
});
test('modified, synthetic, same-page and external links do not create a handoff',()=>{
  for(const [path,extra] of [['/garage',{ctrlKey:true}],['/garage',{metaKey:true}],['/garage',{button:1}],['/garage',{isTrusted:false}],['/',{}],['https://outside.test/garage',{}]]){
    const f=fixture({uid:'A'});f.api.observed('A');f.click(path,extra);assert.equal(f.session.has(H),false,path);
  }
});
test('refresh captures the current page and does not overwrite a pending cross-page handoff',()=>{
  const f=fixture({pathname:'/garage',uid:'A'});f.api.observed('A');f.events.beforeunload();assert.equal(JSON.parse(f.session.get(H)).target,'/garage');
  f.api.prepare('/news');f.events.beforeunload();assert.equal(JSON.parse(f.session.get(H)).target,'/news');
});
test('sign-out, identity switch and another-tab identity change revoke early presentation',()=>{
  for(const mode of ['signout','switch','storage','generation','history']){
    const a=handoff(),b=fixture({pathname:'/garage',local:a.local,session:a.session});assert.equal(b.root.dataset.gate,'0');
    if(['storage','generation','history'].includes(mode)){b.local.set(I,JSON.stringify({uid:mode==='generation'?'A':'B',generation:'new'}));b.events[mode==='history'?'pageshow':'storage']({key:I})}else b.api.observed(mode==='signout'?null:'B');
    assert.equal(b.root.dataset.gate,'1',mode);assert.equal(b.root.dataset.level,'pending');assert.equal(b.api.level(),'');
  }
});

test('programmatic main-navigation controls prepare the destination without changing feature handlers',()=>{
  for(const page of ['garage','news','spares','profile']){
    const html=readFileSync(new URL('../'+page+'.html',import.meta.url),'utf8');
    assert.ok(html.includes('if(ready){if(window.CendonPaint)CendonPaint.prepare(f);location.href=f}'));
    assert.ok(html.includes("CendonPaint.prepare('/chat');location.href=\"/chat\""),'floating chat button also hands off first-paint context');
  }
  const chat=readFileSync(new URL('../chat.html',import.meta.url),'utf8');
  assert.ok(chat.includes('CendonPaint.prepare(F[k]||"/");CendonNavigate(F[k]||"/")'));
});

test('chat displays its native car chooser immediately for a valid same-tab paint even when no car exists',()=>{
  const html=readFileSync(new URL('../chat.html',import.meta.url),'utf8');
  const init=html.match(/\(function\(\)\{\s*const q=new URLSearchParams\(location.search\);[\s\S]*?\n\}\)\(\);/)[0];
  for(const allowed of [true,false]){
    let entered=0;const sandbox={location:{search:'',pathname:'/chat'},history:{replaceState(){}},URLSearchParams,
      LS:{set(){}},useFb:true,currentUser:{uid:'A'},garage:()=>[],document:{documentElement:{dataset:{accountPaint:allowed?'handoff':undefined}}},
      window:{CendonPaint:{level:()=>allowed?'enthusiast':''}},CendonPaint:{level:()=>allowed?'enthusiast':''},setPhase(){},runEntry(){entered++}};
    vm.runInNewContext(init,sandbox);assert.equal(entered,allowed?1:0);
  }
});
test('actual restored UID can supply presentation level, but a mismatched UID cannot',()=>{
  const f=fixture({pathname:'/garage',uid:'A'});assert.equal(f.api.level(),'advance');f.setUser('B');assert.equal(f.api.level(),'');
});
test('server invalidation prevents another handoff without deleting vehicle or account data',()=>{
  const f=handoff();f.local.set('spire_garage','{"untouched":true}');f.api.invalidate('A');assert.equal(f.session.has(H),false);assert.equal(f.local.has(I),false);assert.equal(f.local.get('spire_garage'),'{"untouched":true}');
});
test('every private page consumes paint context before styles and does not reset the entire page to pending',()=>{
  for(const page of ['garage','news','spares','profile','chat']){
    const html=readFileSync(new URL('../'+page+'.html',import.meta.url),'utf8');const script=html.match(/<script src="\/account-paint[^>]+>/)[0];
    assert.doesNotMatch(script,/defer|async/);assert.ok(html.indexOf(script)<html.indexOf('<style>'));assert.doesNotMatch(html,/document\.documentElement\.dataset\.gate="1"/);
    assert.ok(html.includes('done()||(window.CendonPaint&&window.CendonPaint.level())?"enthusiast":"pending"'));
  }
});
