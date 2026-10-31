/* Production-only packaging. Preserve classic execution/cascade order, IDs and
 * attributes. Public code gets content addresses and browser code caches;
 * private API/account data is never part of this build. */
import {createHash} from 'node:crypto';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {resolve,relative,join} from 'node:path';
import {fileURLToPath} from 'node:url';
export async function buildPageRuntime(directory){
  const dir=resolve(directory),runtime=join(dir,'runtime');await mkdir(runtime,{recursive:true});
  const names=['index','garage','profile','news','spares','chat'],sources=new Map();
  // Git-connected Pages builds use LF; Windows checkouts often use CRLF.
  // Canonical source newlines keep identical code at one content address across
  // both release paths, instead of evicting all shared browser code caches.
  for(const name of names)sources.set(name,(await readFile(join(dir,name+'.html'),'utf8')).replace(/\r\n/g,'\n'));
  const result={pages:[],assets:new Set(),inlineBytes:0,htmlBytesBefore:0,htmlBytesAfter:0,styleAssets:0,headBundles:0};
  // Only known order-independent IIFEs, at their original parser position. Never
  // merge async/defer/module scripts, inline boundaries or currentScript users.
  const headFiles=new Map([['app-navigation-bridge.js','navigation'],['tab-shell.js','navigation'],['launch-gate.js','gates'],['auth-gate.js','gates'],['account-scope.js','gates'],['garage-rules.js','garage'],['garage-data.js','garage'],['partner-state.js','owner-ui'],['shop-images.js','owner-ui'],['partner-entry.js','owner-entry'],['account-paint.js','owner-entry'],['nav.js','navigation-ui'],['media-store.js','navigation-ui']]);
  for(const name of names){
    const file=join(dir,name+'.html'),source=sources.get(name),assets=[];let replaced=0,styles=0;
    const checkpoint=source.indexOf('<script src="/page-core.js'),theme=source.indexOf('<script id="themejs"'),primaryEnd=checkpoint>=0?checkpoint:theme>=0?theme:source.length;
    const add=(body,extension,primary=false,inline=true)=>{const hash=createHash('sha256').update(body).digest('hex').slice(0,24),url='/runtime/'+hash+'.'+extension;assets.push({hash,url,body,extension,primary,head:!inline});result.assets.add(url);if(inline)result.inlineBytes+=Buffer.byteLength(body);return url;};
    let html=source.replace(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi,(whole,attrs,body,offset)=>{
      if(/\bsrc\s*=|\btype\s*=|\bdata-inline\b/i.test(attrs)||Buffer.byteLength(body)<8000)return whole;
      const primary=offset<primaryEnd||name==='garage'&&/\bid=["'](?:leveljs|skillsjs|dimension-js|carlab-js)["']/.test(attrs),url=add(body,'js',primary);replaced++;
      return '<script'+attrs+(/\bfetchpriority\s*=/.test(attrs)?'':' fetchpriority="'+(primary?'high':'low')+'"')+' src="'+url+'"></script>';
    });
    const headEnd=html.search(/<\/head>/i),head=headEnd<0?'':html.slice(0,headEnd),runs=[];let run=[];
    const flush=()=>{if(run.length>1)runs.push(run);run=[];};
    for(const match of head.matchAll(/<script\b([^>]*)>[\s\S]*?<\/script>/gi)){
      const attrs=match[1],src=attrs.match(/^\s*src=["']\/?([\w.-]+\.js)(?:\?[^"']*)?["']\s*$/i);
      if(!src||!headFiles.has(src[1])){flush();continue;}
      const body=(await readFile(join(dir,src[1]),'utf8')).replace(/\r\n/g,'\n');
      if(/\bcurrentScript\b|\bimport\.meta\b/.test(body)){flush();continue;}
      const group=headFiles.get(src[1]);
      if(run.length&&(run.at(-1).group!==group||!/^\s*(?:<!--[\s\S]*?-->\s*)*$/.test(head.slice(run.at(-1).end,match.index))))flush();
      run.push({start:match.index,end:match.index+match[0].length,body,name:src[1],group});
    }flush();
    for(const group of runs.reverse()){
      const url=add(group.map(s=>'/* '+s.name+' */\n'+s.body).join('\n;\n'),'js',true,false);
      html=html.slice(0,group[0].start)+'<script fetchpriority="high" src="'+url+'"></script>'+html.slice(group.at(-1).end);result.headBundles++;
    }
    // Keep the page's original styles inline. Splitting them into 16–17 blocking
    // requests added several latency waves before any primary handler could run.
    // Only the real primary handlers belong on the critical path. Preloading
    // every footer tool at low priority starved those handlers behind CSS/tools.
    const ordered=[...assets.filter(x=>x.head).reverse(),...assets.filter(x=>!x.head)];
    const hints=[...new Set(ordered.filter(x=>x.extension==='js'&&x.primary).map(x=>x.url))].map(url=>'<link rel="preload" as="script" fetchpriority="high" href="'+url+'">').join('\n');
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
