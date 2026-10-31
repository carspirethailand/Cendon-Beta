// Isolated QA origin: synthetic account and APIs only; no real backend traffic.
import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {resolve,extname} from 'node:path';
import {gzipSync} from 'node:zlib';
import {shouldShell,shellResponse} from '../lib/app-shell.mjs';
import {namespace} from '../app-routes.js';
const directory=resolve(process.argv[2]||'.'),port=Number(process.argv[3]||0),latency=Number(process.argv[4]||0),uid='performance-fixture';
const equalLeaflet=process.env.CENDON_QA_LEAFLET==='1';
const car={id:'fixture-car',make:'Toyota',model:'Fortuner',year:2013,color:'#778899',type:'suv',body:'suv',mileage:'10000'};
const seed=`(()=>{const uid='${uid}';if(!localStorage.getItem('cendon_signed'))for(const[k,v]of Object.entries({cendon_signed:'1',spire___owner:uid,spire_theme:'"light"',spire_lang:'"th"',cendon_cfg:JSON.stringify({launch:null,got:Date.now()}),spire_setup:JSON.stringify({uid,v:3,level:'enthusiast',lang:'th',distance:'km',currency:'THB'}),['spire___account_'+uid+'_status']:JSON.stringify({status:'completed',completed:true,profile:{uid}}),spire_cachedUser:JSON.stringify({uid,displayName:'QA fixture'}),spire_garage:JSON.stringify([${JSON.stringify(car)}]),spire_selCar:JSON.stringify('${car.id}')}))localStorage.setItem(k,v);})();`;
const sdk=`window.firebase=window.firebase||(()=>{const u={uid:'${uid}',displayName:'QA fixture',getIdToken:async()=> 'local-synthetic',getIdTokenResult:async()=>({claims:{}})},a={currentUser:u,onAuthStateChanged(f){setTimeout(()=>f(u),40);return()=>{}},onIdTokenChanged(f){setTimeout(()=>f(u),40);return()=>{}},setPersistence:async()=>{},getRedirectResult:async()=>({user:null})};function auth(){return a}auth.Auth={Persistence:{LOCAL:'local'}};auth.GoogleAuthProvider=function(){};auth.OAuthProvider=function(){};return {apps:[],initializeApp(options){this.apps.push({name:'[DEFAULT]',options})},auth}})();`;
const mime={'.js':'text/javascript','.mjs':'text/javascript','.css':'text/css','.html':'text/html; charset=utf-8','.json':'application/json','.woff2':'font/woff2','.png':'image/png','.jpg':'image/jpeg','.webp':'image/webp','.svg':'image/svg+xml'};
const server=createServer(async(req,res)=>{try{
 const url=new URL(req.url,'http://'+req.headers.host),base=url.origin;
 if(url.pathname.startsWith('/api/')){const p=url.pathname,body=p==='/api/config'?{launch:null,features:{},now:Date.now()}:p==='/api/onboarding'?{status:'completed',completed:true,profile:{uid,name:'QA fixture',lang:'th'}}:p==='/api/tech/me'?{uid,technician:{id:'fixture-shop',uid,name:'QA shop',verified:true,test:false},application:null}:p==='/api/cars'?{cars:[car]}:p==='/api/tech/my/gigs'?{gigs:[],total:0,limit:2}:{cars:[car],items:[],techs:[],gigs:[],jobs:[],threads:[],posts:[],saved:[],user:{uid}};
  res.setHeader('Content-Type','application/json');res.setHeader('Cache-Control','no-store');res.end(JSON.stringify(body));return;}
 if(latency)await new Promise(r=>setTimeout(r,latency));
 if(url.pathname.startsWith('/fixture/firebase/')){res.setHeader('Content-Type','text/javascript');res.end(sdk);return;}
 if(url.pathname==='/sw.js'){res.writeHead(404);res.end();return;}
 if(equalLeaflet&&/^\/fixture\/leaflet\/(?:leaflet\.(?:js|css)|images\/[\w-]+\.png)$/.test(url.pathname)){const f=url.pathname.slice('/fixture/leaflet/'.length),body=await readFile(resolve('vendor/leaflet-1.9.4',f));res.setHeader('Content-Type',mime[extname(f)]);res.setHeader('Content-Encoding','gzip');res.end(gzipSync(body));return;}
 let body,type;const request=new Request(url,{headers:req.headers});
 if(shouldShell(request)){body=(await shellResponse(request).text()).replace('<head>','<head><script>'+seed+'</script>');type=mime['.html'];}
 else{let f=url.pathname==='/'?'index.html':url.pathname.slice(1);if(!extname(f)){const ns=namespace(url.href,base);f=(ns==='home'?'index':ns||f)+'.html';}if(!/^[\w./-]+$/.test(f)||f.includes('..'))throw Error('path');
  body=await readFile(resolve(directory,f));type=mime[extname(f)]||'application/octet-stream';
  if(/\.(html|js|css)$/.test(f))body=body.toString().replaceAll('https://spireonebackend.carspirethailand.workers.dev',base).replaceAll('https://www.gstatic.com/firebasejs/',base+'/fixture/firebase/');
  if(f.endsWith('.html')){if(equalLeaflet)body=body.replaceAll('https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js',base+'/fixture/leaflet/leaflet.js').replaceAll('https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css',base+'/fixture/leaflet/leaflet.css');body=body.replace(/<head>/i,'<head><script>'+seed+'</script>');}
 }
 res.setHeader('Content-Type',type);res.setHeader('Cache-Control','public,max-age=3600');if(typeof body==='string'){res.setHeader('Content-Encoding','gzip');body=gzipSync(body)}res.end(body);
 }catch{res.writeHead(404);res.end();}});
server.listen(port,'127.0.0.1',()=>console.log(JSON.stringify({ready:true,url:'http://127.0.0.1:'+server.address().port,latency,synthetic:true,productionWrites:0})));
