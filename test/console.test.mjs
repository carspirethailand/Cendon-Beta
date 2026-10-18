import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const root=new URL('../',import.meta.url),source=readFileSync(new URL('console-entry.js',root),'utf8'),html=readFileSync(new URL('console.html',root),'utf8');
function parser(){const window={location:{pathname:'/console',search:''}},document={};vm.runInNewContext(source,{window,document,URLSearchParams,Set,Object});return window.CendonConsoleEntry.readIntent;}
test('console is an unlisted static catalogue with no admin or backend controls',()=>{
  assert.match(html,/noindex,nofollow,noarchive/);assert.match(html,/<html lang="th">/);
  assert.match(html,/Content-Security-Policy/);assert.match(html,/script-src 'self'/);assert.match(html,/connect-src 'none'/);
  assert.doesNotMatch(html,/href="\/(?:admin|staff|backyard)(?:[/?"])/i);
  assert.doesNotMatch(html,/api\/|firebase|Authorization|GEMINI_KEY|CLOUDFLARE_API_TOKEN/);
  assert.equal((html.match(/class="tool"/g)||[]).length,38);
  assert.equal((html.match(/data-group="/g)||[]).length,5);
  for(const link of html.matchAll(/<a\b[^>]*href="([^"]+)"/g))assert.ok(link[1].startsWith('/')||link[1]==='#tools');
});
test('every handoff URL in the catalogue has a supported exact allowlisted intent',()=>{
  const read=parser();let count=0;
  for(const match of html.matchAll(/href="([^"]*console(?:Tool|Action|Tab)=[^"]+)"/g)){
    const url=new URL(match[1].replaceAll('&amp;','&'),'https://test.invalid');assert.ok(read(url.search,url.pathname),url.href);count++;
  }assert.equal(count,18);
});
test('handoff tools and actions are narrow and reject unknown paths and executable input',()=>{
  const read=parser();for(const key of ['quote','listen','shake','park','own'])assert.equal(read('?consoleTool='+key,'/chat').key,key);
  for(const key of ['call','scan','entry'])assert.equal(read('?consoleAction='+key,'/chat').key,key);
  for(const key of ['odo','spec','equip','health','plan','parts','cost','trip','cal','pass'])assert.equal(read('?consoleTab='+key,'/garage').key,key);
  for(const input of ['admin','staff','backyard','__proto__','constructor','javascript:alert(1)','https://evil.invalid']){
    assert.equal(read('?consoleTool='+encodeURIComponent(input),'/chat'),null);assert.equal(read('?consoleTab='+encodeURIComponent(input),'/garage'),null);
  }
  assert.equal(read('?consoleTool=quote','/admin'),null);assert.equal(read('?consoleTab=spec','/chat'),null);assert.equal(read('?consoleAction=call','/garage'),null);
});
test('ordinary app navigation does not activate the bridge or touch auth/devices',()=>{
  let called=0;const window={location:{pathname:'/chat',search:''},get spireAuth(){called++;throw Error('must not read auth')}};
  vm.runInNewContext(source,{window,document:{},URLSearchParams,Set,Object});assert.equal(called,0);
});
test('bridge waits for canonical account completion, uses only the current car and cannot force a plan',()=>{
  assert.match(source,/CendonAccount\?\.completed/);assert.match(source,/core\.cars\(\)\.some/);assert.match(source,/owner!==user.uid/);
  assert.doesNotMatch(source,/force\s*:\s*true|fetch\(|getUserMedia\(|getCurrentPosition\(|DeviceMotionEvent|eval\(|Function\(/);
  assert.match(source,/start\.addEventListener\('click'/);assert.match(source,/W.startCall\(\)/);
});
test('entry is captured before existing chat code strips query parameters',()=>{
  for(const name of ['chat.html','garage.html']){
    const page=readFileSync(new URL(name,root),'utf8');assert.match(page,/<script src="\/console-entry\.js\?v=1"><\/script>/);
    assert.ok(page.indexOf('console-entry.js')<page.indexOf('history.replaceState'));
  }
});
test('console filters work with text only and do not collect private data',()=>{
  const js=readFileSync(new URL('console.js',root),'utf8');assert.match(js,/normalize\('NFKC'\)/);
  assert.doesNotMatch(js,/innerHTML|fetch\(|localStorage|sessionStorage|sendBeacon|firebase|analytics\s*\(/);
});
test('mobile layout, focus, motion and new cache namespace are explicit',()=>{
  const css=readFileSync(new URL('console.css',root),'utf8');assert.match(css,/max-width:640px/);assert.match(css,/prefers-reduced-motion/);assert.match(css,/focus-visible/);
  const sw=readFileSync(new URL('sw.js',root),'utf8');assert.ok(+(sw.match(/cendon-v(\d+)/)||[])[1]>=313);assert.match(sw,/p === '\/console'/);
});
