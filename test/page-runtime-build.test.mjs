import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,readFile,writeFile,readdir,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,resolve,relative} from 'node:path';
import {buildPageRuntime} from '../tools/build-page-runtime.mjs';
test('public runtime build reuses identical classic code without altering order, attributes or page-specific entry',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'cendon-runtime-test-'));
 try{const shared='window.shared=(window.shared||0)+1;/*'+'public code '.repeat(1100)+'*/',unique='window.page="home";/*'+'unique '.repeat(1600)+'*/';
  const original='<html><head></head><body><div id="before"></div><script id="common">'+shared+'</script><div id="after"></div><script id="own">'+unique+'</script><script type="application/json">'+JSON.stringify({large:'x'.repeat(11000)})+'</script></body></html>';
  for(const name of ['index','garage','profile','news','spares','chat'])await writeFile(join(dir,name+'.html'),name==='index'?original:original.replace(/<script id="own">[\s\S]*?<\/script>/,''));
  const result=await buildPageRuntime(dir),html=await readFile(join(dir,'index.html'),'utf8');assert.equal(result.assets,1);assert.equal((await readdir(join(dir,'runtime'))).length,1);
  assert.match(html,/<script id="common" src="\/runtime\/[a-f0-9]{24}\.js"><\/script>/);assert.ok(html.indexOf('id="before"')<html.indexOf('id="common"')&&html.indexOf('id="common"')<html.indexOf('id="after"'));
  assert.ok(html.includes('<script id="own">'+unique+'</script>'),'unique primary entry remains inline');assert.match(html,/<script type="application\/json">/);assert.match(html,/fetchpriority="low"/);assert.doesNotMatch(html,/\beval\(|data-barba|iframe/);
  const file=(await readdir(join(dir,'runtime')))[0];assert.equal(await readFile(join(dir,'runtime',file),'utf8'),shared);
 }finally{const rel=relative(resolve(tmpdir()),resolve(dir));assert.ok(rel&&!rel.startsWith('..')&&rel.startsWith('cendon-runtime-test-'));await rm(dir,{recursive:true})}
});
test('tab navigation never uses a timer as proof of readiness, and validates stale tabs before showing them',async()=>{
 const s=await readFile(new URL('../tab-shell.js',import.meta.url),'utf8');assert.doesNotMatch(s,/setTimeout\(\(\)=>\{f\.ready=true/);assert.doesNotMatch(s,/setTimeout\(\(\)=>W\.CendonTabs\.ready/);
 assert.ok(s.includes('setTimeout(look,80)'));assert.ok(!s.includes('requestAnimationFrame(look)'),'transparent tabs must not wait for animation frames');
 const go=s.slice(s.indexOf('const f=fresh?start'),s.indexOf('if(f.ready)go();'));assert.ok(go.indexOf('t.setHidden(false)')<go.indexOf("f.el.classList.add('on')"));assert.ok(go.includes('f.ready=false;f.go=go'));
});
test('hidden briefs do not build a canvas on startup, and Profile paints its actual first screen before background tools',async()=>{
 for(const file of ['garage','profile','news','spares']){const s=await readFile(new URL('../'+file+'.html',import.meta.url),'utf8');assert.ok(s.includes('if(!wrap||D.body.dataset.briefOpen!=="1")return'));assert.ok(!s.includes('fillWidget(); ensureView(); syncOthers(); garageSummary();'))}
 const p=await readFile(new URL('../profile.html',import.meta.url),'utf8');assert.ok(p.indexOf('<script src="/settings.js?v=8"></script>')<p.indexOf('<script id="brief-js">'));assert.ok(p.includes('window.__SPIRE_PAGE__="profile";'));
 const css=await readFile(new URL('../settings.css',import.meta.url),'utf8');assert.match(css,/html\[data-gate="1"\] #v-settings\.st-float/);
});
