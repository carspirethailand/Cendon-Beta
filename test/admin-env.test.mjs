import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

const page=readFileSync(new URL('../admin.html',import.meta.url),'utf8');
const start=page.indexOf('const ENV_FIELDS=');
const end=page.indexOf('function copyText(',start);
function fixture(values={}){
  const sandbox={$:id=>({value:values[id]||''})};
  vm.runInNewContext(page.slice(start,end)+'\nthis.fields=ENV_FIELDS;this.command=cmdFor;',sandbox);
  return sandbox;
}

test('admin uses the real backend Gemini and quota variable names',()=>{
  const f=fixture();
  assert.deepEqual(Array.from(f.fields,x=>x.k),[
    'GEMINI_MODEL','GEMINI_SEARCH_MODEL','GEMINI_LIVE_MODEL','AI_DAILY_LIMIT',
    'AI_ANON_DAILY_LIMIT','ALLOWED_ORIGINS','GEMINI_KEY','OPENROUTER_API_KEY'
  ]);
});

test('secret command targets GEMINI_KEY and never embeds a key in shell history',()=>{
  const f=fixture({env_GEMINI_KEY:'fixture-only-not-a-real-key'});
  assert.equal(f.command('GEMINI_KEY','secret'),'npx wrangler secret put GEMINI_KEY');
  assert.equal(f.command('OPENROUTER_API_KEY','secret'),'npx wrangler secret put OPENROUTER_API_KEY');
});

test('variable command preserves JSON escaping without evaluating shell syntax',()=>{
  const value='a"b\nc';
  const f=fixture({env_GEMINI_MODEL:value});
  assert.ok(f.command('GEMINI_MODEL','var').endsWith('"GEMINI_MODEL": '+JSON.stringify(value)));
  assert.equal(f.command('GEMINI_LIVE_MODEL','var'),'');
});

test('bulk variable commands do not include secret update operations',()=>{
  const bulk=page.slice(page.indexOf('function envAllCmd()'),page.indexOf('window.envCmd='));
  assert.ok(bulk.includes('filter(f=>f.kind!=="secret")'));
});
