/* Local-only visual QA. No Firebase, email provider, production API or durable DB is used. */
import http from 'node:http';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {DatabaseSync} from 'node:sqlite';
import {handleOnboarding,ONBOARDING_SQL,ONBOARDING_VERSIONS,onboardingName} from '../../SpireONE-backend/src/onboarding.js';

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const PORT=4176,ORIGIN=`http://127.0.0.1:${PORT}`;
const UID='preview-cendon-account',TOKEN='fixture-only-preview-token';
const NOTICE='หน้าทดสอบ • ไม่ส่งอีเมล/ไม่สร้างบัญชี/ไม่ใช่การยอมรับเงื่อนไขจริง';
const sqlite=new DatabaseSync(':memory:');
sqlite.exec(`CREATE TABLE config(key TEXT PRIMARY KEY,value TEXT);
  CREATE TABLE users(uid TEXT PRIMARY KEY,name TEXT,email TEXT,role TEXT,created_at INTEGER);
  CREATE TABLE user_state(uid TEXT NOT NULL,k TEXT NOT NULL,v TEXT NOT NULL,t INTEGER NOT NULL,PRIMARY KEY(uid,k));`);
let queue=Promise.resolve();
const DB={
  prepare(sql){let args=[];return{
    bind(...values){args=values;return this},
    async first(){return sqlite.prepare(sql).get(...args)||null},
    async all(){return{results:sqlite.prepare(sql).all(...args)}},
    async run(){const result=sqlite.prepare(sql).run(...args);return{meta:{changes:Number(result.changes)}}},
  }},
  batch(statements){const task=queue.then(async()=>{sqlite.exec('BEGIN');try{const out=[];for(const s of statements)out.push(await s.run());sqlite.exec('COMMIT');return out}catch(e){sqlite.exec('ROLLBACK');throw e}});queue=task.catch(()=>{});return task},
};
await DB.batch(ONBOARDING_SQL.map(sql=>DB.prepare(sql)));
sqlite.prepare('INSERT INTO users VALUES (?,?,?,?,?)').run(UID,'ผู้ทดสอบ','preview@example.test','user',Date.now()+1000);
const env={DB,ONBOARDING_PRIVACY_URL:'https://preview.example.test/privacy'};
const slowCheck=process.argv.includes('--slow-check')?1200:0;
if(process.argv.includes('--completed')){
  // Disposable RAM-only fixture, not a real agreement or Firebase account.
  await handleOnboarding(new Request(ORIGIN+'/api/onboarding',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({consent:true,termsVersion:ONBOARDING_VERSIONS.terms,privacyVersion:ONBOARDING_VERSIONS.privacy,name:'Cendon Test',birthDate:'2000-05-15',lang:'th',distance:'km',currency:'THB'})}),env,{payload:{sub:UID}});
  await handleOnboarding(new Request(ORIGIN+'/api/onboarding/tutorial',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({status:'skipped'})}),env,{payload:{sub:UID}});
}
let challenge=null;

const authFixture=`(function(W,D){
  if(W.__cendonAccountPreview)return;W.__cendonAccountPreview=true;
  W.BACKEND_URL=${JSON.stringify(ORIGIN)};W.TECH_API_URL=W.BACKEND_URL;
  const user={uid:${JSON.stringify(UID)},email:'preview@example.test',displayName:'ผู้ทดสอบ',photoURL:'',getIdToken:async()=>${JSON.stringify(TOKEN)}};
  const callbacks=new Set();
  const login=/^\\/login(?:\\.html)?\\/?$/.test(location.pathname);
  const a={currentUser:login?null:user,
    setPersistence:async()=>{},
    onAuthStateChanged(fn){callbacks.add(fn);queueMicrotask(()=>{if(callbacks.has(fn))fn(a.currentUser)});return()=>callbacks.delete(fn)},
    getRedirectResult:async()=>null,
    async signInWithPopup(){a.currentUser=user;callbacks.forEach(fn=>fn(user));return{user}},
    async signInWithRedirect(){return a.signInWithPopup()},
    async signInWithCustomToken(token){if(token!=='preview-only-custom-token')throw{code:'auth/invalid-custom-token'};return a.signInWithPopup()},
    async signOut(){a.currentUser=null;callbacks.forEach(fn=>fn(null))},
  };
  class Provider{constructor(id){this.providerId=id||'google.com'}setCustomParameters(){return this}addScope(){return this}}
  function auth(){return a}auth.Auth={Persistence:{LOCAL:'local'}};auth.GoogleAuthProvider=Provider;auth.OAuthProvider=Provider;
  W.firebase={apps:[{name:'[DEFAULT]'}],auth,initializeApp(){return W.firebase.apps[0]}};
  W.auth=a;W.spireAuth=a;W.spireFbReady=Promise.resolve(true);W.spireInitialAuthReady=Promise.resolve(a.currentUser);W.spireRedirectResult=Promise.resolve(null);
  W.spireAwaitUser=async()=>a.currentUser;
  const nativeFetch=W.fetch.bind(W);
  W.fetch=(input,init)=>{const raw=typeof input==='string'?input:input instanceof URL?input.href:input.url;const u=new URL(raw,location.href);
    if(u.origin!==location.origin&&(/^\\/api\\//.test(u.pathname)||/workers\\.dev$|firebase|identitytoolkit|securetoken/.test(u.hostname)))return Promise.reject(new Error('Preview blocks external account/API requests'));
    return nativeFetch(input,init)};
  function badge(){if(D.getElementById('accountPreviewNotice'))return;const el=D.createElement('aside');el.id='accountPreviewNotice';el.setAttribute('role','note');el.textContent=${JSON.stringify(NOTICE)};
    el.style.cssText='position:fixed;top:4px;left:50%;transform:translateX(-50%);width:max-content;max-width:calc(100vw - 16px);z-index:2147483647;pointer-events:none;box-sizing:border-box;background:#fff9dc;color:#574b31;border:1px solid #bda865;border-radius:5px;padding:4px 7px;text-align:center;font:500 10px/1.35 system-ui,sans-serif;';D.body.appendChild(el)}
  if(D.readyState==='loading')D.addEventListener('DOMContentLoaded',badge,{once:true});else badge();
})(window,document);`;

const localize=text=>text.replace(/https:\/\/[A-Za-z0-9.-]+\.workers\.dev/g,ORIGIN);
function previewHtml(text){
  return localize(text)
    .replace(/<script\b[^>]*src=["']https:\/\/www\.gstatic\.com\/firebasejs\/[^"']+["'][^>]*>\s*<\/script>/gi,'')
    .replace(/<script\b[^>]*src=["']\/?auth-bootstrap\.js["'][^>]*>\s*<\/script>/gi,'')
    .replace(/https:\/\/www\.gstatic\.com\/firebasejs\/[^"'\s]+/g,'/preview-auth.js')
    .replace(/if\("serviceWorker" in navigator\)/g,'if(false /* no preview service worker */)')
    .replace('<head>','<head>\n<script src="/preview-auth.js"></script>');
}
const TYPES={'.html':'text/html; charset=utf-8','.js':'application/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json; charset=utf-8','.webmanifest':'application/manifest+json','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.webp':'image/webp','.svg':'image/svg+xml','.ico':'image/x-icon','.woff':'font/woff','.woff2':'font/woff2'};
function headers(type='application/json; charset=utf-8'){
  return{'Content-Type':type,'Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Content-Security-Policy':"connect-src 'self'; object-src 'none'; base-uri 'self'; frame-src 'none'; form-action 'self'"};
}
function send(res,status,value,type){res.writeHead(status,headers(type));res.end(typeof value==='string'||Buffer.isBuffer(value)?value:JSON.stringify(value))}
async function body(req){let raw='';for await(const chunk of req){raw+=chunk;if(Buffer.byteLength(raw)>65536)throw new Error('preview_body_too_large')}return raw}
const authorized=req=>req.headers.authorization===`Bearer ${TOKEN}`;
async function api(req,res,url){
  const p=url.pathname;
  if(p==='/api/auth/config')return send(res,200,{emailOtpReady:true,otpLength:6,testOnly:true});
  if(p==='/api/auth/email/request'&&req.method==='POST'){
    const input=JSON.parse(await body(req));if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.email||''))return send(res,400,{error:'invalid_email'});
    challenge={id:'preview-only-challenge',expires:Date.now()+600000};
    return send(res,200,{challengeId:challenge.id,expiresIn:600,resendAfter:2,testOnly:true,notice:'No email sent. Preview code: 123456'});
  }
  if(p==='/api/auth/email/verify'&&req.method==='POST'){
    const input=JSON.parse(await body(req));if(!challenge||input.challengeId!==challenge.id||input.code!=='123456'||Date.now()>challenge.expires)return send(res,400,{error:'invalid_verification_code'});
    challenge=null;return send(res,200,{customToken:'preview-only-custom-token',testOnly:true});
  }
  if(p.startsWith('/api/onboarding')){
    if(!authorized(req))return send(res,401,{error:'preview_authentication_required'});
    if(slowCheck&&req.method==='GET'&&p==='/api/onboarding')await new Promise(resolve=>setTimeout(resolve,slowCheck));
    const raw=['GET','HEAD'].includes(req.method)?undefined:await body(req);
    const response=await handleOnboarding(new Request(ORIGIN+url.pathname+url.search,{method:req.method,headers:{'Content-Type':'application/json'},body:raw}),env,{payload:{sub:UID}});
    if(!response)return send(res,404,{error:'preview_route_not_found'});
    return send(res,response.status,await response.text());
  }
  if(p==='/api/login'){
    if(!authorized(req))return send(res,401,{error:'preview_authentication_required'});
    return send(res,200,{uid:UID,email:'preview@example.test',name:await onboardingName(env,UID)||'ผู้ทดสอบ',photo:'',role:'user',admin:false,testOnly:true});
  }
  if(p==='/api/tech/me')return send(res,200,{uid:UID,staff:false,admin:false,attention:0,technician:null,application:null});
  if(p==='/api/tech/ping')return send(res,200,{ok:true,version:999,testOnly:true});
  if(p==='/api/tech')return send(res,200,{techs:[],testOnly:true});
  if(p==='/api/tech/gigs')return send(res,200,{gigs:[]});
  if(p==='/api/tech/jobs')return send(res,200,{jobs:[]});
  if(p==='/api/tech/posts'||p==='/api/tech/posts/near')return send(res,200,{posts:[],techs:[]});
  if(p==='/api/cars')return send(res,200,[]);
  if(p==='/api/state'&&req.method==='GET'){
    const state={};for(const row of sqlite.prepare('SELECT k,v,t FROM user_state WHERE uid=?').all(UID))state[row.k]={v:JSON.parse(row.v),t:row.t};return send(res,200,{state});
  }
  if(p==='/api/admin/live')return send(res,403,{error:'preview_not_administrator'});
  return send(res,404,{error:'preview_not_implemented',testOnly:true});
}
const legal=`<!doctype html><html lang="th"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>เอกสารทดสอบเท่านั้น</title><style>body{max-width:620px;margin:48px auto;padding:24px;background:#f7f2e9;color:#302a25;font:16px/1.8 system-ui,sans-serif}</style></head><body><h1>เอกสารทดสอบเท่านั้น</h1><p>${NOTICE}</p><p>หน้านี้ไม่ใช่ข้อกำหนดหรือนโยบายจริง การเลือกยอมรับในหน้าทดสอบไม่มีผลผูกพัน และบันทึกเฉพาะฐานข้อมูลจำลองในหน่วยความจำของเครื่องนี้</p><p>ไม่มีการส่งอีเมล ไม่มีการสร้างบัญชี และไม่มีการติดต่อบริการล็อกอินจริง</p><a href="/login">กลับหน้าทดสอบ</a></body></html>`;
const server=http.createServer(async(req,res)=>{
  try{
    const url=new URL(req.url,ORIGIN);
    if(url.pathname==='/preview-auth.js')return send(res,200,authFixture,TYPES['.js']);
    if(['/terms','/terms.html','/privacy','/privacy.html'].includes(url.pathname))return send(res,200,legal,TYPES['.html']);
    if(url.pathname.startsWith('/api/'))return await api(req,res,url);
    if(req.method!=='GET'&&req.method!=='HEAD')return send(res,405,{error:'preview_method_not_allowed'});
    let relative=decodeURIComponent(url.pathname).replace(/^\/+/, '');
    if(!relative)relative='index.html';else if(!path.extname(relative))relative+='.html';
    const segments=relative.split(/[\\/]/);
    if(segments.some(s=>!s||s.startsWith('.')||['node_modules','output','test'].includes(s))||['sw.js','auth-bootstrap.js','package.json','package-lock.json'].includes(relative))return send(res,403,{error:'preview_private_path'});
    const full=path.resolve(ROOT,relative);
    if(!full.startsWith(ROOT+path.sep)||!TYPES[path.extname(full).toLowerCase()])return send(res,403,{error:'preview_private_path'});
    if(path.extname(full)==='.json'&&!['strings.json','handbookparts.json'].includes(relative))return send(res,403,{error:'preview_private_path'});
    const data=await readFile(full),ext=path.extname(full).toLowerCase();
    const result=ext==='.html'?previewHtml(data.toString('utf8')):ext==='.js'?localize(data.toString('utf8')):data;
    send(res,200,result,TYPES[ext]);
  }catch(e){send(res,e.code==='ENOENT'?404:400,{error:'preview_request_failed',testOnly:true})}
});
server.on('close',()=>sqlite.close());
server.listen(PORT,'127.0.0.1',()=>console.log(`${NOTICE}\nAccount preview: ${ORIGIN}/login\nPreview email code: 123456\nAll account data is in RAM and disappears when this server stops.`));
process.once('SIGINT',()=>server.close());
process.once('SIGTERM',()=>server.close());
