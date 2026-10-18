import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {preview,inject} from '../lib/share-meta.mjs';
/* SEO: หน้าสาธารณะให้ค้นเจอ หน้าในแอป/ลิงก์ส่วนตัวไม่ขึ้นผลค้นหา · ลิงก์ร้าน/บริการได้การ์ดแชร์ของตัวเอง */
const r=f=>readFileSync(new URL('../'+f,import.meta.url),'utf8').replace(/\r\n/g,'\n');
const SITE='https://cendon-beta.pages.dev';

test('robots.txt allows crawling and points to the sitemap; sitemap lists only the public pages',()=>{
  const rb=r('robots.txt');assert.match(rb,/^User-agent: \*\nAllow: \/$/m);assert.match(rb,new RegExp(`^Sitemap: ${SITE}/sitemap.xml$`,'m'));
  assert.doesNotMatch(rb,/^Disallow/m,'noindex pages must stay crawlable so the noindex is seen');
  const sm=r('sitemap.xml');for(const p of ['/about','/help','/terms','/privacy'])assert.match(sm,new RegExp(`<loc>${SITE}${p}</loc>`));
  assert.doesNotMatch(sm,/login|garage|404/);
});

test('a real 404 page exists (no soft 404s), is noindex, and every app deep link still has a _redirects rule',()=>{
  const nf=r('404.html');assert.match(nf,/<meta name="robots" content="noindex">/);assert.doesNotMatch(nf,/rel="canonical"/);
  assert.match(nf,/href="\/stability\.css"/,'absolute asset paths so it renders at any depth');
  const red=r('_redirects'),home=r('index.html');
  const routes=[...home.matchAll(/Nav\.route\(\{path:"([a-z]+)[/"]/g)].map(m=>m[1]).filter(p=>p!=='chat'&&p!=='help'&&p!=='all'&&p!=='accident'&&p!=='breakdown');
  for(const p of new Set(routes))assert.match(red,new RegExp(`^/${p}(/\\*)?\\s+/\\s+200`,'m'),`/${p} needs a _redirects rule now that unknown paths return 404`);
});

test('app pages, login and private share links are noindex via headers; public pages are not',()=>{
  const h=r('_headers');
  for(const p of ['/login','/garage','/garage/*','/trip/*','/passport/*','/tech/*','/messages/*','/studio/*','/admin','/console'])
    assert.match(h,new RegExp(`^${p.replace(/[*]/g,'\\*')}\\n  X-Robots-Tag: noindex$`,'m'),p);
  for(const p of ['/about','/help','/privacy','/terms','/'])assert.doesNotMatch(h,new RegExp(`^${p}\\n  X-Robots-Tag`,'m'),p);
  assert.match(r('login.html'),/<meta name="robots" content="noindex">/);
  assert.ok((h.match(/^\//gm)||[]).length<100,'Cloudflare Pages allows at most 100 header rules');
});

test('public pages: keyword title, canonical, robots, structured data, self-hosted font',()=>{
  const a=r('about.html');
  assert.match(a,/<title>Cendon — ถามอาการรถกับ AI เช็กราคาซ่อม หาช่างใกล้คุณ<\/title>/);
  assert.match(a,new RegExp(`<link rel="canonical" href="${SITE}/about">`));
  assert.match(a,/<meta name="robots" content="index,follow,max-image-preview:large">/);
  const ld=JSON.parse(a.match(/<script type="application\/ld\+json">(.*?)<\/script>/)[1]);
  assert.deepEqual(ld['@graph'].map(x=>x['@type']),['Organization','WebSite','WebApplication']);
  assert.ok(!JSON.stringify(ld).includes('aggregateRating'),'no invented ratings');
  for(const f of ['help.html','privacy.html','terms.html']){const s=r(f);assert.match(s,/"@type":"BreadcrumbList"/,f);}
  for(const f of ['about.html','help.html','privacy.html','terms.html','login.html','passport.html']){
    const s=r(f);assert.doesNotMatch(s,/fonts\.googleapis\.com\/css2\?family=Kanit/,f);assert.match(s,/\/fonts\/kanit\.css/,f);}
  assert.ok(existsSync(new URL('../apple-touch-icon.png',import.meta.url)),'pages link /apple-touch-icon.png');
});

/* ── การ์ดแชร์ลิงก์ร้าน/บริการ ── */
const SHELL=r('index.html');
const ctx=(path,over={})=>({request:new Request(SITE+path),params:{path:path.split('/').slice(2).filter(Boolean)},
  env:{ASSETS:{fetch:async()=>new Response(SHELL,{headers:{'content-type':'text/html; charset=utf-8','x-frame-options':'SAMEORIGIN'}})},...over},next:async()=>new Response('legacy')});
const TECHS={techs:[{id:'t_abc',shop:'นนท์แอร์ แอนด์ เซอร์วิส',area:'บางนา กรุงเทพ',skills:['แอร์รถยนต์'],rating:4.8,reviewCount:12,about:'ซ่อมแอร์รถยนต์ทุกยี่ห้อ',cover:101,verified:true,test:false},
  {id:'t_test',shop:'ร้านทดสอบ',verified:false,test:true}]};
const GIGS={gigs:[{id:9,title:'ล้างแอร์ครบชุด + เติมน้ำยา',price:1500,body:'ถอดตู้ล้าง',photos:[102],tech:{shop:'นนท์แอร์',area:'บางนา',test:false}}]};
function api(){const seen=[];globalThis.fetch=async u=>{seen.push(String(u));return Response.json(/\/gigs$/.test(new URL(u).pathname)?GIGS:TECHS)};return seen}

test('shop link preview: LINE/Facebook card shows the shop name, skills, rating and photo',async()=>{
  const seen=api();const res=await preview(ctx('/tech/t_abc'),'tech'),html=await res.text();
  assert.equal(res.status,200);assert.equal(res.headers.get('x-robots-tag'),'noindex');
  assert.match(html,/<title>นนท์แอร์ แอนด์ เซอร์วิส · บางนา กรุงเทพ · Cendon<\/title>/);
  assert.match(html,/<meta property="og:title" content="นนท์แอร์ แอนด์ เซอร์วิส · บางนา กรุงเทพ · Cendon">/);
  assert.match(html,/<meta property="og:description" content="ช่างแอร์รถยนต์ ย่านบางนา กรุงเทพ · ★ 4\.8 \(12 รีวิว\) — ซ่อมแอร์รถยนต์ทุกยี่ห้อ/);
  assert.match(html,/<meta property="og:image" content="https:\/\/spireonebackend\.carspirethailand\.workers\.dev\/api\/tech\/img\/101">/);
  assert.match(html,/<meta property="og:url" content="https:\/\/cendon-beta\.pages\.dev\/tech\/t_abc">/);
  assert.doesNotMatch(html,/og:image:width/);assert.match(seen[0],/\/api\/tech$/);
  assert.equal(html.replace(/<head>[\s\S]*<\/head>/,''),SHELL.replace(/<head>[\s\S]*<\/head>/,''),'page body untouched');
});

test('service link preview shows the service, starting price and photo',async()=>{
  api();const html=await (await preview(ctx('/service/9'),'service')).text();
  assert.match(html,/<meta property="og:title" content="ล้างแอร์ครบชุด \+ เติมน้ำยา · เริ่ม ฿1,500 · Cendon">/);
  assert.match(html,/og:image" content="[^"]+\/api\/tech\/img\/102"/);
});

test('unknown/test shops, broken backend, odd ids → the normal app page, never an error; bare /tech stays the legacy file',async()=>{
  api();
  for(const p of ['/tech/t_test','/tech/nope','/tech/%E0%A4%A','/service/77']){
    const res=await preview(ctx(p),p.startsWith('/service')?'service':'tech');assert.equal(res.status,200,p);assert.equal(await res.text(),SHELL,p);}
  globalThis.fetch=async()=>{throw Error('down')};assert.equal(await (await preview(ctx('/tech/t_abc'),'tech')).text(),SHELL);
  assert.equal(await (await preview(ctx('/tech'),'tech')).text(),'legacy');
  /* ค่าจากร้านถูก escape กันแทรกแท็ก */
  assert.match(inject('<title>x</title><meta property="og:title" content="y">',{title:'"><script>alert(1)</script>',desc:'d'},SITE),/content="&quot;&gt;&lt;script&gt;/);
});
