// Isolated visual fixture: no production auth bypass, network model, or fake AI answer.
import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {resolve} from 'node:path';
const root=resolve(import.meta.dirname,'..');
createServer(async(req,res)=>{
  try{
    const path=new URL(req.url,'http://localhost').pathname;
    if(path==='/feature-ai.js'||path==='/feature-ai.css'){
      res.writeHead(200,{'Content-Type':path.endsWith('.js')?'text/javascript':'text/css','Cache-Control':'no-store'});
      return res.end(await readFile(resolve(root,path.slice(1))));
    }
    if(path!=='/')throw Error('Not found');
    const source=await readFile(resolve(root,'chat.html'),'utf8');
    const styles=[...source.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)].map(x=>x[1]).join('\n');
    const ledger=source.match(/<script id="ledgerjs">([\s\S]*?)<\/script>/)[1];
    const bootstrap=`window.lang='en';window.selCar=()=>({id:'visual-fixture',name:'Fixture Toyota Corolla',year:2020,mileage:42000});window.garage=()=>[window.selCar()];window.spireHasFeature=()=>true;window.switchView=()=>{document.getElementById('v-quote')?.classList.add('active')};window.setPhase=p=>document.body.dataset.phase=p;localStorage.setItem('spire_carlab_log_visual-fixture',JSON.stringify({services:[{date:'2026-09-20',km:42000,amount:1800,k:'oil',note:'Visual fixture only'}],fuel:[{date:'2026-09-01',km:41000,amount:1200},{date:'2026-09-15',km:41500,amount:1100}]}));window.BACKEND_URL='';`;
    res.writeHead(200,{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store'});
    res.end(`<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>${styles}</style><link rel="stylesheet" href="feature-ai.css"><style>body{display:block!important;overflow:auto!important;background:#171719!important;color:#efefef}.main{position:static!important;display:block!important;width:100%!important;height:auto!important;padding:0!important}#v-quote{position:static!important;height:auto!important;display:block!important}.scroll{height:auto!important;overflow:visible!important}.composer{position:fixed!important;bottom:14px!important;left:50%!important;transform:translateX(-50%)!important;width:min(760px,94vw)!important;z-index:50!important}.fixture-banner{padding:10px 20px;background:#33291e;color:#f6a85b;font:12px system-ui}.lg-wrap{padding-bottom:190px!important}</style></head><body data-phase="thread"><div class="fixture-banner">VISUAL TEST ONLY · isolated sample records · AI requires real sign-in</div><main class="main"></main><footer id="composer" class="composer"><div class="crow"><textarea id="inp" placeholder="Ask AU+I"></textarea></div></footer><script>${bootstrap}</script><script src="feature-ai.js"></script><script>${ledger}</script></body></html>`);
  }catch{res.writeHead(404);res.end('Not found');}
}).listen(4174,'127.0.0.1',()=>console.log('Isolated feature UI: http://127.0.0.1:4174/'));
