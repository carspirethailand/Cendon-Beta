/* Production-only packaging. Preserve classic execution/cascade order, IDs and
 * attributes. Public code/styles get content addresses and browser code caches;
 * private API/account data is never part of this build. */
import {createHash} from 'node:crypto';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {resolve,relative,join} from 'node:path';
import {fileURLToPath} from 'node:url';
export function cssFromRoot(source){
  // Tokenize URL values, not a regex across embedded SVG/data strings. A relative
  // URL in these root HTML documents must still resolve from / after extraction.
  let out='',at=0,i=0,fragment=false;
  while(i<source.length){
    if(source.startsWith('/*',i)){const end=source.indexOf('*/',i+2);i=end<0?source.length:end+2;continue;}
    if(source[i]==='"'||source[i]==="'"){const q=source[i++];while(i<source.length){if(source[i]==='\\'){i+=2;continue;}if(source[i++]===q)break;}continue;}
    if(source.slice(i,i+4).toLowerCase()!=='url('){i++;continue;}
    const start=i;let p=i+4;while(/\s/.test(source[p]||'')&&p<source.length)p++;
    const q=/["']/.test(source[p]||'')?source[p++]:'';const valueStart=p;
    while(p<source.length){if(source[p]==='\\'){p+=2;continue;}if(q?source[p]===q:source[p]===')')break;p++;}
    const value=source.slice(valueStart,p).trim();if(value.startsWith('#'))fragment=true;
    let end=p;if(q){end++;while(/\s/.test(source[end]||'')&&end<source.length)end++;}if(source[end]!==')'){i=Math.max(end,start+4);continue;}
    if(value&&!/^(?:[a-z][\w+.-]*:|\/|#|var\()/i.test(value)){
      const url=new URL(value,'https://build.invalid/');out+=source.slice(at,valueStart)+url.pathname+url.search+url.hash;at=p;
    }
    i=end+1;
  }
  return {css:out+source.slice(at),fragment};
}
export async function buildPageRuntime(directory){
  const dir=resolve(directory),runtime=join(dir,'runtime');await mkdir(runtime,{recursive:true});
  const names=['index','garage','profile','news','spares','chat'],sources=new Map();
  for(const name of names)sources.set(name,await readFile(join(dir,name+'.html'),'utf8'));
  const result={pages:[],assets:new Set(),inlineBytes:0,htmlBytesBefore:0,htmlBytesAfter:0,styleAssets:0};
  for(const name of names){
    const file=join(dir,name+'.html'),source=sources.get(name),assets=[];let replaced=0,styles=0;
    const add=(body,extension)=>{const hash=createHash('sha256').update(body).digest('hex').slice(0,24),url='/runtime/'+hash+'.'+extension;assets.push({hash,url,body,extension});result.assets.add(url);result.inlineBytes+=Buffer.byteLength(body);return url;};
    let html=source.replace(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi,(whole,attrs,body)=>{
      if(/\bsrc\s*=|\btype\s*=|\bdata-inline\b/i.test(attrs)||Buffer.byteLength(body)<8000)return whole;
      const url=add(body,'js');replaced++;
      return '<script'+attrs+' src="'+url+'"></script>';
    });
    html=html.replace(/<style\b([^>]*)>([\s\S]*?)<\/style>/gi,(whole,attrs,body)=>{
      if(/\bdata-inline\b/i.test(attrs)||Buffer.byteLength(body)<4000)return whole;
      const rebased=cssFromRoot(body);if(rebased.fragment||/@import\s+["']/i.test(body))return whole;
      const id=attrs.match(/\bid=["']([^"']+)["']/)?.[1];
      if(id){const escaped=id.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');if(new RegExp('(?:getElementById|querySelector)\\(["\\\'](?:style#)?'+escaped+'["\\\']\\)').test(source))return whole;}
      const url=add(rebased.css,'css');styles++;return '<link rel="stylesheet"'+attrs+' href="'+url+'">';
    });
    // Preload before the first external script, so late classic scripts do not
    // add discovery waterfalls. No inline eval, fetch of private API, or iframe.
    const hints=[...new Set(assets.filter(x=>x.extension==='js').map(x=>x.url))].map(url=>'<link rel="preload" as="script" fetchpriority="low" href="'+url+'">').join('\n');
    const out=html.replace(/<head>/i,'<head>\n'+hints+'\n');
    for(const a of assets)await writeFile(join(runtime,a.hash+'.'+a.extension),a.body);
    await writeFile(file,out);result.htmlBytesBefore+=Buffer.byteLength(source);result.htmlBytesAfter+=Buffer.byteLength(out);result.pages.push({page:name,replaced,styles});result.styleAssets+=styles;
  }
  return {...result,assets:result.assets.size};
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  const dir=process.argv[2];if(!dir)throw Error('Pass the generated public deployment directory, never the source checkout');
  const path=resolve(dir),root=resolve(import.meta.dirname,'..'),rel=relative(root,path);
  if(!rel.startsWith('.qa'+(process.platform==='win32'?'\\':'/'))||rel.includes('..'))throw Error('Output must be a generated .qa/ deployment package');
  console.log(JSON.stringify(await buildPageRuntime(path)));
}
