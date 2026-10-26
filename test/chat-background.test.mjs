import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=f=>readFileSync(new URL('../'+f,import.meta.url),'utf8');
test('completion collector is loaded on every main app page, not only Chat',()=>{
  for(const p of ['index','garage','chat','profile','news','spares'])assert.match(read(p+'.html'),/bell\.js\?v=18/,p);
  assert.match(read('bell.js'),/script\.src='\/chat-jobs\.js\?v=3'/);
  assert.match(read('chat.html'),/src="chat-jobs\.js\?v=3"/);
  assert.match(read('sw.js'),/cendon-v371-job-art/);assert.match(read('sw.js'),/chat-jobs\.js\?v=3/);
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
