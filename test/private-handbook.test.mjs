import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {onRequest as parts} from '../functions/handbookparts.json.js';
import {onRequest as source} from '../functions/HANDBOOK.md.js';
test('internal handbook sources never fall through to public static assets',async()=>{
  const sw=readFileSync(new URL('../sw.js',import.meta.url),'utf8');
  assert.ok(sw.includes('handbookparts\\.json|HANDBOOK\\.md'),'service worker must not serve cached private import files');
  for(const handler of [parts,source]){
    let next=false;const r=handler({next(){next=true;throw Error('Private static content exposed')}});
    assert.equal(r.status,404);assert.equal(await r.text(),'Not found');assert.equal(next,false);
    assert.match(r.headers.get('Cache-Control'),/no-store/);assert.equal(r.headers.get('X-Robots-Tag'),'noindex');
  }
});
