/* One public build for both Git-connected Pages and manual deployments.
   Only tracked public files are copied. No dependencies, account data or keys. */
import {execFileSync} from 'node:child_process';
import {copyFile,lstat,mkdir} from 'node:fs/promises';
import {dirname,join,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {buildPageRuntime} from './build-page-runtime.mjs';

export function isPublicAsset(name){
  if(!name||name.startsWith('.')||name.startsWith('/')||name.includes('\\')||name.split('/').some(p=>p==='..'||p.startsWith('.')))return false;
  if(/^(?:test|tools|docs|research|functions|lib|node_modules|output)\//i.test(name)||/backyard|\.env|\.dev\.vars/i.test(name))return false;
  if(/^(?:handbookparts\.json|HANDBOOK\.md)$/i.test(name))return false;
  if(name.startsWith('site/')&&!name.startsWith('site/static/'))return false;
  return /^_(?:redirects|headers)$/.test(name)||/\.(?:html|css|js|json|webmanifest|xml|svg|png|webp|jpe?g|avif|ico|woff2?|ttf|txt|mp4|webm|mp3|ogg|wav)$/i.test(name);
}

export async function buildPublic({root=resolve(import.meta.dirname,'..'),trackedFiles}={}){
  root=resolve(root);
  const files=(trackedFiles??execFileSync('git',['ls-files','-z'],{cwd:root,encoding:'utf8'}).split('\0')).filter(isPublicAsset);
  for(const name of ['index.html','garage.html','profile.html','news.html','spares.html','chat.html','app-navigation.js','_headers','_redirects']){
    if(!files.includes(name))throw Error('Missing required public asset: '+name);
  }
  // Never clear a directory or overwrite the source checkout. An existing output
  // is a hard failure; CI uses a fresh checkout and local callers use a new one.
  const output=join(root,'.pages-output');
  await mkdir(output);
  let bytes=0;
  for(const name of files){
    const source=join(root,name),info=await lstat(source);
    if(!info.isFile()||info.isSymbolicLink())throw Error('Public assets must be regular files: '+name);
    if(info.size>25*1024*1024)throw Error('Public asset exceeds Pages limit: '+name);
    const destination=join(output,name);await mkdir(dirname(destination),{recursive:true});await copyFile(source,destination);bytes+=info.size;
  }
  const runtime=await buildPageRuntime(output);
  return {output:'.pages-output',publicFiles:files.length,sourceBytes:bytes,runtime};
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url))console.log(JSON.stringify(await buildPublic()));
