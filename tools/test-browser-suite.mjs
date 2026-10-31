/* Run every assertion-based browser fixture. Preview scripts are not tests.
   Output stays private; only local/synthetic records and blocked remote DNS. */
import {spawn} from 'node:child_process';import {readdir,mkdir,writeFile} from 'node:fs/promises';import {resolve,join} from 'node:path';
const root=resolve(import.meta.dirname,'..'),files=(await readdir(join(root,'test'))).filter(f=>f.endsWith('-browser.mjs')).sort(),results=[];
if(!process.env.CENDON_NODE_PACKAGES)throw Error('Set CENDON_NODE_PACKAGES to the existing Playwright node_modules folder');
await mkdir(join(root,'.qa/browser-audit'),{recursive:true});
for(const file of files){const start=Date.now(),chunks=[];let timedOut=false;const child=spawn(process.execPath,['--import','./test/local-browser-safety.mjs','test/'+file],{cwd:root,env:{...process.env,CENDON_CHROME_CHANNEL:'chrome'},stdio:['ignore','pipe','pipe']});
 child.stdout.on('data',b=>chunks.push(b));child.stderr.on('data',b=>chunks.push(b));const timer=setTimeout(()=>{timedOut=true;child.kill()},120000);const code=await new Promise(r=>{child.once('exit',r);child.once('error',()=>r(-1))});clearTimeout(timer);
 const output=Buffer.concat(chunks).toString(),result={file,pass:code===0&&!timedOut,exitCode:code,timedOut,ms:Date.now()-start,log:'.qa/browser-audit/'+file+'.log'};await writeFile(join(root,result.log),output);results.push(result);await writeFile(join(root,'.qa/browser-audit/results.json'),JSON.stringify({remoteDnsBlocked:true,syntheticFixtures:true,results},null,2));console.log(JSON.stringify({...result,...result.pass?{}:{lastOutput:output.slice(-1800)}}));
}
console.log(JSON.stringify({total:results.length,passed:results.filter(x=>x.pass).length,failed:results.filter(x=>!x.pass).length}));if(results.some(x=>!x.pass))process.exitCode=1;
