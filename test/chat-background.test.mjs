import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=f=>readFileSync(new URL('../'+f,import.meta.url),'utf8');
test('completion collector is loaded on every main app page, not only Chat',()=>{
  for(const p of ['index','garage','chat','profile','news','spares'])assert.match(read(p+'.html'),/bell\.js\?v=19/,p);
  assert.match(read('bell.js'),/script\.src='\/chat-jobs\.js\?v=4'/);
  assert.match(read('chat.html'),/src="chat-jobs\.js\?v=4"/);
  assert.match(read('sw.js'),/cendon-v413-daily-a3/);assert.match(read('sw.js'),/chat-jobs\.js\?v=4/);
});
test('chat tool analysis uses the durable queue instead of a page-owned timed request',()=>{
  const s=read('chat.html'),a=s.indexOf('    if(featureJob){',s.indexOf('const directValet=')),b=s.indexOf('\n    }',a),branch=s.slice(a,b);
  assert.match(branch,/await CendonFeatureAI\.payload/);assert.match(branch,/await streamJobAnswer/);assert.doesNotMatch(branch,/AbortController|90000|\.analyze\(/);
  assert.match(s,/kind:'feature',feature:opts\.feature/);
});
test('changing pages never issues a cancellation, and inbox notices reveal no question or answer',()=>{
  const s=read('chat-jobs.js');assert.doesNotMatch(s,/addEventListener\(['"](?:pagehide|beforeunload)['"]/);
  assert.match(s,/id:'ai-job:'\+job\.id/);assert.match(s,/body:en\?'Open your conversation/);
  assert.doesNotMatch(s,/body:.*(?:job\.text|contents)/);
  assert.match(s,/if\(!mine\(uid\)\)/);assert.match(s,/cache:'no-store'/);
});

test('chat follows the live channel (steps, text, sources) and falls back to polling; status comes from real steps, with continue/retry after a cut or failed answer',()=>{
  const cj=read('chat-jobs.js'),chat=read('chat.html');
  assert.match(cj,/\/api\/ai\/jobs\/'\+encodeURIComponent\(id\)\+'\/events'/,'live channel endpoint');
  assert.match(cj,/if\(r\.status===404\|\|r\.status===405\)return null/,'old servers fall back to polling');
  assert.match(cj,/const fin=await follow\(uid,response\.job,onUpdate\);if\(fin\)return fin/);
  assert.match(cj,/e\.type==='step'&&typeof e\.id==='string'/);assert.match(cj,/e\.seq<=seq\)continue/,'duplicate events after reconnect are ignored');
  for(const id of ['car','kb','history','spec','search','think','write','check'])assert.match(chat,new RegExp(id+':TT\\('),'label for step '+id);
  assert.match(chat,/if\(thinking&&m\)\{ const h=stepHead\(m\)\|\|m\.status/,'status line uses real steps first');
  assert.match(chat,/data-note="continue"/);assert.match(chat,/data-note="retry"/);
  assert.match(chat,/if\(Array\.isArray\(job\.steps\)\)m\.steps=job\.steps/);
  assert.match(chat,/rel="noopener noreferrer nofollow"/,'source links never pass the opener');
});
