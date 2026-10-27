import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {namespace} from '../app-routes.js';
import {appShell,shouldShell,shellResponse} from '../lib/app-shell.mjs';
test('Barba route allowlist excludes auth, admin, APIs and external navigation',()=>{
 for(const [p,n]of [['/','home'],['/studio/edit','home'],['/messages/123','home'],['/garage/car/spec','garage'],['/chat.html','chat'],['/profile/settings','profile']])assert.equal(namespace(p),n);
 for(const p of ['/login','/launch','/admin','/api/me','/trip/secret','/passport/id','https://evil.invalid/chat','javascript:alert(1)'])assert.equal(namespace(p),null);
});
test('shell and legacy frame responses cannot recursively wrap each other',()=>{
 const req=(p,h={})=>new Request('https://cendon.test'+p,{headers:h});
 assert.equal(shouldShell(req('/garage',{'Sec-Fetch-Dest':'document'})),true);
 assert.equal(shouldShell(req('/garage',{'Sec-Fetch-Dest':'empty'})),true);
 assert.equal(shouldShell(req('/garage',{'Sec-Fetch-Dest':'iframe'})),false);
 assert.equal(shouldShell(req('/garage?__cendon_document=1')),false);
 assert.equal(shouldShell(req('/garage?classic=1')),false);
 assert.equal(shouldShell(req('/app-navigation.js')),false);
 assert.equal(shouldShell(req('/tech/public')),false);
 assert.equal(shouldShell(req('/tech/public',{Cookie:'cendon_signed=1'})),true);
 assert.equal(shellResponse(req('/chat')).headers.get('Cache-Control'),'private, no-store');
 assert.equal(shellResponse(req('/chat')).headers.get('X-Frame-Options'),'SAMEORIGIN');
 assert.equal(shellResponse(req('/chat')).headers.get('Vary'),'Sec-Fetch-Dest, Cookie');
});
test('shell escapes deep links, uses real pinned Barba and contains no account payload',async()=>{
 const html=appShell('https://cendon.test/chat?q='+encodeURIComponent('\"><script>alert(1)</script>'));
 assert.match(html,/data-barba="wrapper"/);assert.match(html,/data-barba-namespace="chat"/);
 assert.match(html,/barba-core-2\.10\.3\.umd\.js/);assert.doesNotMatch(html,/<script>alert/);
 assert.ok(Buffer.byteLength(html)<5000);
 const p=JSON.parse(await readFile(new URL('../vendor/barba-provenance.json',import.meta.url)));
 assert.equal(p.version,'2.10.3');
});
test('all app documents register their lifecycle bridge before auth and old opt-in router',async()=>{
 for(const f of ['index','garage','chat','news','spares','profile']){const s=await readFile(new URL('../'+f+'.html',import.meta.url),'utf8');const i=s.indexOf('/app-navigation-bridge.js?v=1');assert.ok(i>0&&i<s.indexOf('/auth-gate.js'));if(s.includes('/tab-shell.js'))assert.ok(i<s.indexOf('/tab-shell.js'));}
});
