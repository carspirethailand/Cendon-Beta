/* Reproducible upstream dependency download; no application/user data is sent. */
import {createHash} from 'node:crypto';
import {gunzipSync} from 'node:zlib';
import {mkdir,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
const version='2.10.3',integrity='ovVeT1wUcdMg8Lu6Iel6yEBW2+s6iA7qfRLCVKTSIfJU9csiawU0UOmVJdcoy3WNOsF2Ur9UfoTUC9aDcm4c0w==';
const r=await fetch('https://registry.npmjs.org/@barba/core/-/core-'+version+'.tgz',{signal:AbortSignal.timeout(30000)});if(!r.ok)throw Error('Upstream dependency unavailable');
const archive=Buffer.from(await r.arrayBuffer());if(createHash('sha512').update(archive).digest('base64')!==integrity)throw Error('Upstream integrity mismatch');
const tar=gunzipSync(archive),files=new Map();for(let p=0;p+512<=tar.length;){const name=tar.subarray(p,p+100).toString().replace(/\0.*$/s,''),size=parseInt(tar.subarray(p+124,p+136).toString().replace(/\0.*$/s,'').trim()||'0',8);if(!name)break;if(!Number.isFinite(size)||size<0||p+512+size>tar.length)throw Error('Invalid upstream archive');files.set(name,tar.subarray(p+512,p+512+size));p+=512+Math.ceil(size/512)*512;}
const js=files.get('package/dist/barba.umd.js'),license=files.get('package/LICENSE');if(!js||!license)throw Error('Expected upstream files missing');
const dir=resolve(import.meta.dirname,'../vendor');await mkdir(dir,{recursive:true});await writeFile(resolve(dir,'barba-core-2.10.3.umd.js'),js);await writeFile(resolve(dir,'barba-LICENSE.txt'),license);
await writeFile(resolve(dir,'barba-provenance.json'),JSON.stringify({name:'@barba/core',version,license:'MIT',source:'https://github.com/barbajs/barba',tarball:'https://registry.npmjs.org/@barba/core/-/core-2.10.3.tgz',integrity:'sha512-'+integrity,assetSha256:createHash('sha256').update(js).digest('hex')},null,2)+'\n');console.log(JSON.stringify({version,bytes:js.length,integrityVerified:true}));
