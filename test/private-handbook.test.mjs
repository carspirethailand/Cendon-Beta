import test from 'node:test';
import assert from 'node:assert/strict';
import {onRequest as parts} from '../functions/handbookparts.json.js';
import {onRequest as source} from '../functions/HANDBOOK.md.js';
test('internal handbook sources never fall through to public static assets',async()=>{
  for(const handler of [parts,source]){
    let next=false;const r=handler({next(){next=true;throw Error('Private static content exposed')}});
    assert.equal(r.status,404);assert.equal(await r.text(),'Not found');assert.equal(next,false);
    assert.match(r.headers.get('Cache-Control'),/no-store/);assert.equal(r.headers.get('X-Robots-Tag'),'noindex');
  }
});
