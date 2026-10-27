/* Production-only packaging. Keep source HTML readable for maintenance/tests.
 * Classic-script position, attributes and execution order are preserved.
 * Content-addressed public code can be reused between pages, without retaining
 * authenticated documents, executing hidden apps, or replacing their lifecycle.
 */
import {createHash} from 'node:crypto';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {resolve,relative,join} from 'node:path';
import {fileURLToPath} from 'node:url';
export async function buildPageRuntime(directory){
  const dir=resolve(directory),runtime=join(dir,'runtime');await mkdir(runtime,{recursive:true});
  const names=['index','garage','profile','news','spares','chat'],sources=new Map(),copies=new Map();
  for(const name of names){const source=await readFile(join(dir,name+'.html'),'utf8');sources.set(name,source);const unique=new Set([...source.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)].filter(m=>!(/\bsrc\s*=|\btype\s*=/i.test(m[1]))&&Buffer.byteLength(m[2])>=10000).map(m=>createHash('sha256').update(m[2]).digest('hex')));for(const hash of unique)copies.set(hash,(copies.get(hash)||0)+1)}
  const result={pages:[],assets:new Set(),inlineBytes:0,htmlBytesBefore:0,htmlBytesAfter:0};
  for(const name of names){
    const file=join(dir,name+'.html'),source=sources.get(name),assets=[];let replaced=0;
    const html=source.replace(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi,(whole,attrs,body)=>{
      if(/\bsrc\s*=|\btype\s*=/i.test(attrs)||Buffer.byteLength(body)<10000)return whole;
      const digest=createHash('sha256').update(body).digest('hex');if(copies.get(digest)<2)return whole;
      const hash=digest.slice(0,24),url='/runtime/'+hash+'.js';
      assets.push({hash,url,body});result.assets.add(url);result.inlineBytes+=Buffer.byteLength(body);replaced++;
      return '<script'+attrs+' src="'+url+'"></script>';
    });
    // Preload before the first external script, so late classic scripts do not
    // add discovery waterfalls. No inline eval, fetch of private API, or iframe.
    const hints=[...new Set(assets.map(x=>x.url))].map(url=>'<link rel="preload" as="script" fetchpriority="low" href="'+url+'">').join('\n');
    const out=html.replace(/<head>/i,'<head>\n'+hints+'\n');
    for(const a of assets)await writeFile(join(runtime,a.hash+'.js'),a.body);
    await writeFile(file,out);result.htmlBytesBefore+=Buffer.byteLength(source);result.htmlBytesAfter+=Buffer.byteLength(out);result.pages.push({page:name,replaced});
  }
  return {...result,assets:result.assets.size};
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  const dir=process.argv[2];if(!dir)throw Error('Pass the generated public deployment directory, never the source checkout');
  const path=resolve(dir),root=resolve(import.meta.dirname,'..'),rel=relative(root,path);
  if(!rel.startsWith('.qa'+(process.platform==='win32'?'\\':'/'))||rel.includes('..'))throw Error('Output must be a generated .qa/ deployment package');
  console.log(JSON.stringify(await buildPageRuntime(path)));
}
