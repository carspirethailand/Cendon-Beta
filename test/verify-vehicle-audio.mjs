import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
const origin=process.argv[2];if(!/^https:\/\/[a-z0-9.-]+\.pages\.dev$/.test(origin||''))throw Error('Expected Pages origin');
const files=['vehicle-audio.js','vehicle-audio.css','call-tools.js','call-session.js','call-agent.js','call-surface.js','feature-ai.js','sw.js','chat.html','index.html','repair-proof.js'];
const checks=[];
for(const name of files){const path=name==='index.html'?'/':name==='chat.html'?'/chat':'/'+name;
  const r=await fetch(origin+path+'?audio-release='+Date.now(),{cache:'no-store',signal:AbortSignal.timeout(20000)});assert.equal(r.status,200,name);
  const actual=(await r.text()).replace(/<!-- Cloudflare Pages Analytics --><script defer src='https:\/\/static\.cloudflareinsights\.com\/beacon\.min\.js' data-cf-beacon='[^']*'><\/script><!-- Cloudflare Pages Analytics -->/g,'').replaceAll('\r\n','\n');
  const expected=execFileSync('git',['show','HEAD:'+name],{maxBuffer:6*1024*1024}).toString().replaceAll('\r\n','\n');assert.equal(actual===expected,true,'Deployed source mismatch: '+name);checks.push({name,status:r.status,matchesSource:true});
}
const qa=await fetch(origin+'/test/vehicle-audio-browser.mjs?audio-release='+Date.now(),{cache:'no-store',signal:AbortSignal.timeout(20000)}),text=await qa.text();assert.ok(!text.includes('Isolated browser regression: synthetic account'));
console.log(JSON.stringify({origin,checks,qaSourcePublished:false,realAIInvocations:0},null,2));
