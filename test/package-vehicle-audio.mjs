// Publish tracked public web assets only. Never deploy the repository root.
import {execFileSync} from 'node:child_process';
import {readFile,writeFile,copyFile,mkdir} from 'node:fs/promises';
import {resolve,dirname,join} from 'node:path';
import {createHash} from 'node:crypto';
const root=resolve(import.meta.dirname,'..'),sha=execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim();
const target=join(root,'.qa','audio-dist-'+sha.slice(0,8));await mkdir(target);
const files=execFileSync('git',['ls-files','-z'],{cwd:root,encoding:'utf8'}).split('\0').filter(Boolean).filter(name=>{
  if(/^(test|tools|node_modules|\.git|\.qa|output)\//.test(name))return false;
  if(name.startsWith('site/')&&!name.startsWith('site/static/'))return false;
  return /^_(redirects|headers)$/.test(name)||/\.(html|css|js|json|webmanifest|svg|png|webp|jpe?g|avif|ico|woff2?|ttf|txt|mp4|webm|mp3|ogg|wav)$/.test(name);
});
for(const required of ['vehicle-audio.js','vehicle-audio.css','call-tools.js','call-session.js','feature-ai.js','chat.html','index.html','sw.js','repair-proof.js','console.html'])if(!files.includes(required))throw Error('Missing public dependency '+required);
const manifest=[];
for(const name of files){const from=join(root,name),to=join(target,name),data=await readFile(from);if(data.length>25*1024*1024)throw Error('Pages asset too large: '+name);await mkdir(dirname(to),{recursive:true});await copyFile(from,to);manifest.push({path:name,bytes:data.length,sha256:createHash('sha256').update(data).digest('hex')});}
await writeFile(join(root,'.qa','audio-publication-manifest.json'),JSON.stringify({sha,target,files:manifest},null,2));
console.log(JSON.stringify({sha,target,files:files.length,bytes:manifest.reduce((n,f)=>n+f.bytes,0)}));
