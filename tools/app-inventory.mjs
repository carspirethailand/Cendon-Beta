/* Read-only source catalogue. Static discovery is NOT proof an interaction works. */
import {readFile,readdir,writeFile} from 'node:fs/promises';
import {resolve,join} from 'node:path';
import {fileURLToPath} from 'node:url';
export async function appInventory(root=resolve(import.meta.dirname,'..')){
 const names=(await readdir(root)).filter(n=>/\.(?:html|js)$/.test(n)).sort(),pages=[],routes=[],watchers=[],localAssets=new Set();
 for(const name of names){const text=await readFile(join(root,name),'utf8');
  if(name.endsWith('.html')){
   const assets=[...text.matchAll(/<(?:script|link|img)\b[^>]*\b(?:src|href)=["']([^"']+)["']/g)].map(m=>m[1]).filter(s=>!s.includes('${')&&!/^(?:https?:|data:|#)/.test(s));
   for(const a of assets)localAssets.add(a.split('?')[0].replace(/^\//,''));
   pages.push({file:name,bytes:Buffer.byteLength(text),literalButtons:(text.match(/<button\b/g)||[]).length,literalForms:(text.match(/<form\b/g)||[]).length,localAssets:[...new Set(assets)]});
  }
  for(const m of text.matchAll(/\bNav\.route\(\{\s*path\s*:\s*(["'])([^"']+)\1/g)){
   const head=text.slice(m.index,m.index+350).split(/\b(?:open|test)\s*:/)[0],nameMatch=head.match(/\bname\s*:\s*(["'])([^"']+)\1/),parent=head.match(/\bparent\s*:\s*(\[[^\]]*\]|["'][^"']*["'])/);
   routes.push({file:name,line:text.slice(0,m.index).split('\n').length,path:m[2],name:nameMatch?.[2]||null,parent:parent?.[1]||null});
  }
  for(const m of text.matchAll(/\bNav\.watch\(\{\s*sel\s*:\s*(["'])([^"']+)\1/g))watchers.push({file:name,selector:m[2],line:text.slice(0,m.index).split('\n').length});
 }
 const redirects=(await readFile(join(root,'_redirects'),'utf8')).split(/\r?\n/).map(s=>s.trim()).filter(s=>s&&!s.startsWith('#')).map(s=>{const [from,to,status]=s.split(/\s+/);return {from,to,status:Number(status)}});
 const consoleSource=await readFile(join(root,'console.html'),'utf8'),consoleLinks=[...consoleSource.matchAll(/<a\b[^>]*class="tool"[^>]*href="(\/[^"]*)"/g)].map(m=>m[1]);
 return {version:1,scope:'static source inventory; literal markup may include templates; dynamic records and external providers require separate tests',pages,routes,watchers,redirects,consoleLinks:[...new Set(consoleLinks)],localAssets:[...localAssets].sort()};
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){const inventory=await appInventory();if(process.argv[2])await writeFile(resolve(process.argv[2]),JSON.stringify(inventory,null,2));console.log(JSON.stringify({pages:inventory.pages.length,routeRegistrations:inventory.routes.length,watchedPanels:inventory.watchers.length,redirects:inventory.redirects.length,consoleLinks:inventory.consoleLinks.length,assets:inventory.localAssets.length}));}
