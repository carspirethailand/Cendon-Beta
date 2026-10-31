import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,readFile,writeFile,readdir,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,relative,resolve} from 'node:path';
import {isPublicAsset,buildPublic} from '../tools/build-public.mjs';

test('public build includes app assets, not internal data, tools, tests or path escapes',()=>{
  for(const name of ['index.html','admin.html','sw.js','_headers','_redirects','fonts/kanit.css','img/cars/suv.webp','site/static/site.css'])assert.equal(isPublicAsset(name),true,name);
  for(const name of ['','../index.html','/index.html','img/../secret.json','img/.private/a.json','img\\a.png','.env','.qa/snapshot.json','.pages-output/index.html','test/fixture.json','tools/probe.js','research/sounds.json','lib/private.js','functions/index.js','node_modules/key.json','output/snapshot.json','Backyard.html','cendon-backyard/app.js','handbookparts.json','HANDBOOK.md','site/content/privacy.mjs'])assert.equal(isPublicAsset(name),false,name);
});

test('Git and manual releases get cacheable runtime code without publishing fixtures or changing source',async()=>{
  const root=await mkdtemp(join(tmpdir(),'cendon-public-build-'));
  try{
    const html='<html><head></head><body><script id="main">window.ready=true;/*'+'fixture '.repeat(1200)+'*/</script></body></html>',files=[];
    for(const name of ['index','garage','profile','news','spares','chat']){files.push(name+'.html');await writeFile(join(root,name+'.html'),html)}
    for(const name of ['app-navigation.js','_headers','_redirects','handbookparts.json']){files.push(name);await writeFile(join(root,name),'fixture')}
    await mkdir(join(root,'test'));await writeFile(join(root,'test','secret.json'),'not-public');files.push('test/secret.json');
    const result=await buildPublic({root,trackedFiles:files}),out=join(root,'.pages-output');
    assert.equal(result.publicFiles,9);assert.equal(result.runtime.assets,1);
    assert.match(await readFile(join(out,'garage.html'),'utf8'),/src="\/runtime\/[a-f0-9]{24}\.js"/);
    const names=await readdir(out);assert.ok(!names.includes('test'));assert.ok(!names.includes('handbookparts.json'));
    assert.equal(await readFile(join(root,'garage.html'),'utf8'),html);
    await assert.rejects(buildPublic({root,trackedFiles:files}),/EEXIST/,'a repeated build cannot erase or replace existing files');
  }finally{const rel=relative(resolve(tmpdir()),resolve(root));assert.ok(rel.startsWith('cendon-public-build-')&&!rel.includes('..'));await rm(root,{recursive:true})}
});

test('an incomplete checkout fails before making an output directory',async()=>{
  const root=await mkdtemp(join(tmpdir(),'cendon-public-build-'));
  try{await assert.rejects(buildPublic({root,trackedFiles:['index.html']}),/Missing required public asset/);assert.deepEqual(await readdir(root),[])}
  finally{const rel=relative(resolve(tmpdir()),resolve(root));assert.ok(rel.startsWith('cendon-public-build-')&&!rel.includes('..'));await rm(root,{recursive:true})}
});
