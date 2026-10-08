// Static local preview with production-style clean routes. No fake users or API data.
import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {resolve,extname,sep} from 'node:path';
const root=process.cwd(),types={'.html':'text/html','.js':'text/javascript','.css':'text/css','.png':'image/png','.webp':'image/webp','.svg':'image/svg+xml','.json':'application/json','.webmanifest':'application/manifest+json'};
createServer(async(req,res)=>{
  try{
    let name=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
    if(name==='/')name='/index.html';else if(!extname(name))name+='.html';
    const file=resolve(root,'.'+name);
    if(!file.startsWith(root+sep)||!types[extname(file)])throw Error('Not found');
    const data=await readFile(file);
    res.writeHead(200,{'Content-Type':types[extname(file)]+'; charset=utf-8','Cache-Control':'no-cache'});res.end(data);
  }catch{res.writeHead(404);res.end('Not found');}
}).listen(4174,'127.0.0.1',()=>console.log('Stability preview: http://127.0.0.1:4174/'));
