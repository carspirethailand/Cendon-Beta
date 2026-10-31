import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,readFile,writeFile,readdir,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,resolve,relative} from 'node:path';
import {buildPageRuntime} from '../tools/build-page-runtime.mjs';
test('critical head bundles preserve order and never cross inline/deferred/style boundaries',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'cendon-runtime-test-'));try{
  for(const n of ['app-navigation-bridge','tab-shell','launch-gate','auth-gate','account-scope','garage-rules','garage-data'])await writeFile(join(dir,n+'.js'),'window.order.push("'+n+'");');
  await writeFile(join(dir,'account-scope.js'),'window.script=document.currentScript;');
  const html='<html><head><script src="/app-navigation-bridge.js?v=6"></script>\n<script src="/tab-shell.js?v=6"></script><script>window.boundary=1;</script><script src="/launch-gate.js"></script><style>body{color:red}</style><script src="/auth-gate.js"></script><script src="/account-scope.js"></script><script src="/garage-rules.js" defer></script><script id="keep-id" src="/garage-data.js"></script></head><body></body></html>';
  for(const name of ['index','garage','profile','news','spares','chat'])await writeFile(join(dir,name+'.html'),html);
  const result=await buildPageRuntime(dir),out=await readFile(join(dir,'garage.html'),'utf8');assert.equal(result.headBundles,6);assert.equal(result.assets,1);assert.equal(result.inlineBytes,0);
  const url=out.match(/<script fetchpriority="high" src="(\/runtime\/[^"']+)"/)[1],body=await readFile(join(dir,url),'utf8');assert.ok(body.indexOf('window.order.push("app-navigation-bridge")')<body.indexOf('window.order.push("tab-shell")'));assert.ok(out.indexOf('src="'+url+'"')<out.indexOf('window.boundary=1'));
  for(const n of ['launch-gate','auth-gate','account-scope','garage-rules','garage-data'])assert.ok(out.includes('src="/'+n+'.js"'));assert.ok(out.includes('id="keep-id"'));assert.ok(out.includes('defer'));assert.doesNotMatch(body,/eval\(|new Function/);
 }finally{assert.ok(resolve(dir).startsWith(resolve(tmpdir())+(process.platform==='win32'?'\\':'/'))&&dir.includes('cendon-runtime-test-'));await rm(dir,{recursive:true})}
});
test('public runtime build reuses identical classic code without altering order, attributes or page-specific entry',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'cendon-runtime-test-'));
 try{const shared='window.shared=(window.shared||0)+1;/*'+'public code '.repeat(1100)+'*/',unique='window.page="home";/*'+'unique '.repeat(1600)+'*/';
  const original='<html><head></head><body><div id="before"></div><script id="common">'+shared+'</script><div id="after"></div><script id="own">'+unique+'</script><script type="application/json">'+JSON.stringify({large:'x'.repeat(11000)})+'</script></body></html>';
  for(const name of ['index','garage','profile','news','spares','chat'])await writeFile(join(dir,name+'.html'),name==='index'?original:original.replace(/<script id="own">[\s\S]*?<\/script>/,''));
  const result=await buildPageRuntime(dir),html=await readFile(join(dir,'index.html'),'utf8');assert.equal(result.assets,2);assert.equal((await readdir(join(dir,'runtime'))).length,2);
  assert.match(html,/<script id="common" fetchpriority="high" src="\/runtime\/[a-f0-9]{24}\.js"><\/script>/);assert.ok(html.indexOf('id="before"')<html.indexOf('id="common"')&&html.indexOf('id="common"')<html.indexOf('id="after"'));
  assert.match(html,/<script id="own" fetchpriority="high" src="\/runtime\/[a-f0-9]{24}\.js"><\/script>/,'unique entry is cacheable but executes at its original position');assert.match(html,/<script type="application\/json">/);assert.match(html,/fetchpriority="high"/);assert.doesNotMatch(html,/\beval\(|data-barba|iframe/);
  const bodies=await Promise.all((await readdir(join(dir,'runtime'))).map(f=>readFile(join(dir,'runtime',f),'utf8')));assert.ok(bodies.includes(shared));assert.ok(bodies.includes(unique));
 }finally{const rel=relative(resolve(tmpdir()),resolve(dir));assert.ok(rel&&!rel.startsWith('..')&&rel.startsWith('cendon-runtime-test-'));await rm(dir,{recursive:true})}
});
test('critical styles stay exactly inline instead of adding a blocking request waterfall',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'cendon-runtime-test-'));try{
  const css=`<style id="critical">a{background:url('premium_part.png')}b{filter:url(#local)}/*`+' CSS '.repeat(1500)+'*/</style>',html='<html><head>'+css+'</head><body></body></html>';
  for(const name of ['index','garage','profile','news','spares','chat'])await writeFile(join(dir,name+'.html'),html);
  const result=await buildPageRuntime(dir);assert.equal(result.styleAssets,0);assert.ok((await readFile(join(dir,'garage.html'),'utf8')).includes(css));assert.equal((await readdir(join(dir,'runtime'))).length,0);
 }finally{assert.ok(resolve(dir).startsWith(resolve(tmpdir())+ (process.platform==='win32'?'\\':'/'))&&dir.includes('cendon-runtime-test-'));await rm(dir,{recursive:true})}
});
test('tab navigation never uses a timer as proof of readiness, and validates stale tabs before showing them',async()=>{
 const s=await readFile(new URL('../tab-shell.js',import.meta.url),'utf8');assert.doesNotMatch(s,/setTimeout\(\(\)=>\{f\.ready=true/);assert.doesNotMatch(s,/setTimeout\(\(\)=>W\.CendonTabs\.ready/);
 assert.ok(s.includes('setTimeout(look,80)'));assert.ok(!s.includes('requestAnimationFrame(look)'),'transparent tabs must not wait for animation frames');
 const go=s.slice(s.indexOf('const f=fresh?start'),s.indexOf('if(f.ready)go();'));assert.ok(go.indexOf('t.setHidden(false)')<go.indexOf("f.el.classList.add('on')"));assert.ok(go.includes('f.ready=false;f.go=go'));
});
test('hidden briefs do not build a canvas on startup, and Profile paints its actual first screen before background tools',async()=>{
 for(const file of ['garage','profile','news','spares']){const s=await readFile(new URL('../'+file+'.html',import.meta.url),'utf8');assert.ok(s.includes('if(!wrap||D.body.dataset.briefOpen!=="1")return'));assert.ok(!s.includes('fillWidget(); ensureView(); syncOthers(); garageSummary();'))}
 const p=await readFile(new URL('../profile.html',import.meta.url),'utf8');assert.ok(p.indexOf('<script src="/settings.js?v=10"></script>')<p.indexOf('<script id="brief-js">'));assert.ok(p.includes('window.__SPIRE_PAGE__="profile";'));
 const css=await readFile(new URL('../settings.css',import.meta.url),'utf8');assert.match(css,/html\[data-gate="1"\] #v-settings\.st-float/);
});
