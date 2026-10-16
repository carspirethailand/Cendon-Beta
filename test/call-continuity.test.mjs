import {test} from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';
const source=await readFile(new URL('../call-continuity.js',import.meta.url),'utf8');
function fixture(){
 const events={},writes=[],children=[],location={href:'https://app.test/chat',origin:'https://app.test',pathname:'/chat',search:'',hash:'',assign:u=>writes.push(['assign',u]),replace:u=>writes.push(['replace',u])};
 const history={state:{original:true},pushState(s,_,u){this.state=s;writes.push(['push',u])},replaceState(s,_,u){this.state=s;writes.push(['replaceState',u])}};
 const document={addEventListener:(n,f)=>events[n]=f,createElement(){const frame={contentWindow:{location:{replace:u=>writes.push(['frameReplace',u])}},remove(){frame.removed=true}};children.push(frame);return frame},body:{append(){},children:[]}};
 const window={};const ctx={window,parent:window,location,history,document,navigator:{},URL,addEventListener:(n,f)=>events[n]=f};vm.runInNewContext(source,ctx);return{api:window.CendonCallContinuity,events,writes,children,history};
}
test('only explicit same-origin customer routes are admitted, never admin/auth/API/external or encoded traversal',()=>{
 const f=fixture();for(const route of ['/garage','/chat','/messages/123','/tech/real','/news?a=1'])assert.ok(f.api.safe(route));
 for(const route of ['/admin','/staff','/backyard','/login','/api/cars','//evil.test/garage','https://evil.test/garage','javascript:alert(1)','/garage/%2e%2e/admin','/garage/%2fadmin','/garage/admin'])assert.equal(f.api.safe(route),null,route);
});
test('navigation keeps the same owner and creates one reusable visible content frame, never a mic/token/socket',()=>{
 const f=fixture();assert.equal(f.api.go('/garage'),false);let starts=0,roams=0,ends=0;const session={active:true,start(){starts++},end(){ends++},suspendVisuals(){}};f.api.register(session,{roam(){roams++}});
 assert.equal(f.api.go('/garage'),true);assert.equal(f.api.go('/news'),true);assert.equal(f.children.length,1);assert.equal(starts,0);assert.equal(ends,0);assert.equal(roams,2);assert.equal(f.api.active,true);assert.ok(!source.includes('getUserMedia'));assert.ok(!source.includes('new WebSocket'));
});
test('only the owned content window receives a call-control facade; no raw transport, token or admin bridge',()=>{
 const f=fixture();f.api.register({active:true},{expand(){}});f.api.go('/garage');assert.equal(f.api.owns(f.children[0].contentWindow),true);assert.equal(f.api.owns({}),false);const c=f.api.controls();assert.equal(c.bridge,undefined);assert.equal(c.getIdToken,undefined);assert.equal(c.callWS,undefined);
});
test('entrypoints share the continuity helper and app denies external embedding while privileged pages remain unframeable',async()=>{
 for(const file of ['index.html','chat.html','garage.html','news.html','spares.html','profile.html','plan.html','handbook.html','passport.html'])assert.match(await readFile(new URL('../'+file,import.meta.url),'utf8'),/call-continuity\.js\?v=/);
 const headers=await readFile(new URL('../_headers',import.meta.url),'utf8');assert.match(headers,/X-Frame-Options: SAMEORIGIN/);assert.match(headers,/frame-ancestors 'self'/);assert.match(headers,/\/admin\r?\n\s+Content-Security-Policy: frame-ancestors 'none'/);
});
