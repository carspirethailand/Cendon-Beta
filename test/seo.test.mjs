import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {handle,inject,sitemap} from '../lib/public-pages.mjs';
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
  for(const p of ['/login','/garage','/garage/*','/trip/*','/passport/*','/messages/*','/studio/*','/admin','/console'])
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

/* ── หน้าสาธารณะ: ร้าน บริการ หมวดช่าง (Pages Functions) ── */
const SHELL=r('index.html'),NF=r('404.html');
const ctx=(path,{cookie='',env={}}={})=>({request:new Request(SITE+path,{headers:cookie?{cookie}:{}}),params:{path:path.split('/').slice(2).filter(Boolean)},
  env:{ASSETS:{fetch:async q=>new URL(q.url).pathname==='/404'?new Response(NF,{headers:{'content-type':'text/html'}}):new Response(SHELL,{headers:{'content-type':'text/html; charset=utf-8'}})},...env},next:async()=>new Response('legacy')});
const SHOP={id:'t_abc',shop:'นนท์แอร์ แอนด์ เซอร์วิส',name:'สมชาย',area:'บางนา กรุงเทพ',cats:['air'],skills:['แอร์รถยนต์'],rating:4.8,reviewCount:12,about:'ซ่อมแอร์รถยนต์ทุกยี่ห้อ',
  cover:101,avatar:104,photos:[101,102,104],verified:true,test:false,mobile:true,urgent:false,years:8,warranty:30,from:600,proven:5,
  phone:'0812345678',line:'@nonair',address:'99/9 ถนนบางนา-ตราด',lat:13.67,lng:100.6,brands2:['Toyota'],
  week:[{on:true,open:'08:00',close:'18:00'},{on:true,open:'08:00',close:'18:00'},{on:true,open:'08:00',close:'18:00'},{on:true,open:'08:00',close:'18:00'},{on:true,open:'08:00',close:'18:00'},{on:true,open:'09:00',close:'16:00'},{on:false,open:'08:00',close:'18:00'}],
  vetting:{at:1,identity:true,phone:true,shop:'video_call',skills:'interview',cats:['air'],mobile:true}};
const TECHS={techs:[SHOP,{id:'t_test',shop:'ร้านทดสอบ',verified:false,test:true,cats:['air']}]};
const GIGS={gigs:[{id:9,title:'ล้างแอร์ครบชุด + เติมน้ำยา',price:1500,body:'ถอดตู้ล้าง\nเติมน้ำยา',cats:['air-clean'],photos:[102],createdAt:Date.UTC(2026,9,1),tech:SHOP},
  {id:10,title:'บริการร้านทดสอบ',price:1,cats:['air'],photos:[],tech:{id:'t_test',test:true}}]};
function api(){const seen=[];globalThis.fetch=async u=>{seen.push(String(u));return Response.json(/\/gigs$/.test(new URL(u).pathname)?GIGS:TECHS)};return seen}
const ldOf=html=>JSON.parse(html.match(/<script type="application\/ld\+json">(.*?)<\/script>/)[1])['@graph'];

test('public shop page: server-rendered, indexable, real data + AutoRepair schema',async()=>{
  api();const res=await handle(ctx('/tech/t_abc'),'tech'),html=await res.text();
  assert.equal(res.status,200);assert.equal(res.headers.get('x-robots-tag'),null);assert.match(res.headers.get('vary'),/Cookie/);
  assert.match(html,/<title>นนท์แอร์ แอนด์ เซอร์วิส — ช่างแอร์รถยนต์ บางนา กรุงเทพ \| Cendon<\/title>/);
  assert.match(html,new RegExp(`<link rel="canonical" href="${SITE}/tech/t_abc">`));
  assert.match(html,/<meta name="robots" content="index,follow/);
  assert.match(html,/<h1>นนท์แอร์ แอนด์ เซอร์วิส<\/h1>/,'content is in the HTML, no JavaScript needed');
  assert.match(html,/ล้างแอร์ครบชุด \+ เติมน้ำยา[\s\S]*฿1,500/);assert.match(html,/href="\/service\/9"/);
  assert.match(html,/ทีมงานตรวจบัตรประชาชนของช่างแล้ว/);assert.match(html,/รับประกันงาน 30 วัน/);
  assert.match(html,/href="\/login\?next=%2Ftech%2Ft_abc"/,'quote/chat asks to sign in, then comes back');
  assert.match(html,/og:image" content="[^"]+\/api\/tech\/img\/101"/);
  assert.doesNotMatch(html,/auth-gate/,'no login wall on the public page');
  /* ข้อมูลส่วนตัวไม่ขึ้นเว็บเปิด */
  for(const x of ['0812345678','@nonair','99/9','13.67','100.6'])assert.ok(!html.includes(x),x);
  const ld=ldOf(html),shop=ld.find(x=>x['@type']==='AutoRepair');
  assert.equal(shop.aggregateRating.ratingValue,'4.8');assert.equal(shop.aggregateRating.reviewCount,12);
  assert.equal(shop.address.addressLocality,'บางนา กรุงเทพ');assert.ok(!shop.address.streetAddress&&!shop.geo&&!shop.telephone);
  assert.equal(shop.openingHoursSpecification.length,6);assert.equal(shop.makesOffer[0].price,'1500');
  assert.deepEqual(ld.find(x=>x['@type']==='BreadcrumbList').itemListElement.map(x=>x.name),['Cendon','ช่างแอร์รถยนต์','นนท์แอร์ แอนด์ เซอร์วิส']);
});

test('signed-in visitors (cookie) and deeper app paths get the app, with the shop share card and noindex',async()=>{
  api();
  for(const [path,o] of [['/tech/t_abc',{cookie:'x=1; cendon_signed=1'}],['/tech/t_abc/quote',{}]]){
    const res=await handle(ctx(path,o),'tech'),html=await res.text();
    assert.equal(res.headers.get('x-robots-tag'),'noindex',path);
    assert.equal(html.replace(/<head>[\s\S]*<\/head>/,''),SHELL.replace(/<head>[\s\S]*<\/head>/,''),path+': the app, untouched');
    assert.match(html,/<meta property="og:title" content="นนท์แอร์ แอนด์ เซอร์วิส — ช่างแอร์รถยนต์/,path);
  }
  assert.equal(await (await handle(ctx('/tech'),'tech')).text(),'legacy','bare /tech stays the legacy redirect file');
});

test('service and category pages; empty category is noindex; unknown/test shops are real 404s; backend down → app',async()=>{
  api();
  const sv=await (await handle(ctx('/service/9'),'service')).text();
  assert.match(sv,/<h1>ล้างแอร์ครบชุด \+ เติมน้ำยา<\/h1>/);assert.match(sv,/ถอดตู้ล้าง<br>เติมน้ำยา/);
  assert.equal(ldOf(sv).find(x=>x['@type']==='Service').offers.price,'1500');
  const cat=await handle(ctx('/category/air'),'category'),ch=await cat.text();
  assert.equal(cat.headers.get('x-robots-tag'),null);assert.match(ch,/<h1><span data-l="th">ช่างแอร์รถยนต์ที่ผ่านการตรวจ<\/span>/);
  assert.match(ch,/href="\/tech\/t_abc"/);assert.doesNotMatch(ch,/ร้านทดสอบ/);
  assert.equal(ldOf(ch).find(x=>x['@type']==='CollectionPage').mainEntity.numberOfItems,1);
  const empty=await handle(ctx('/category/body'),'category');
  assert.equal(empty.headers.get('x-robots-tag'),'noindex');assert.match(await empty.text(),/<meta name="robots" content="noindex">/);
  for(const [p,k] of [['/tech/t_test','tech'],['/tech/nope','tech'],['/service/10','service'],['/service/77','service']]){
    const res=await handle(ctx(p),k);assert.equal(res.status,404,p);}
  assert.equal((await handle(ctx('/tech/%E0%A4%A'),'tech')).headers.get('x-robots-tag'),'noindex','odd id → app');
  globalThis.fetch=async()=>{throw Error('down')};
  const down=await handle(ctx('/tech/t_abc'),'tech');assert.equal(down.status,200);assert.equal(await down.text(),SHELL);
});

test('live sitemap lists categories with shops, verified shops and their services', async()=>{
  api();const xml=await (await sitemap(ctx('/sitemaps/shops'))).text();
  assert.match(xml,new RegExp(`<loc>${SITE}/category/air</loc>`));assert.doesNotMatch(xml,/category\/body/);
  assert.match(xml,new RegExp(`<loc>${SITE}/tech/t_abc</loc>`));assert.doesNotMatch(xml,/t_test/);
  assert.match(xml,new RegExp(`<loc>${SITE}/service/9</loc><lastmod>2026-10-01</lastmod>`));assert.doesNotMatch(xml,/service\/10/);
  assert.match(r('robots.txt'),new RegExp(`^Sitemap: ${SITE}/sitemaps/shops$`,'m'));
  globalThis.fetch=async()=>{throw Error('down')};assert.equal((await sitemap(ctx('/sitemaps/shops'))).status,503);
});

test('values from shops are escaped everywhere (no tag injection)',async()=>{
  const bad='"><script>alert(1)</script>';
  globalThis.fetch=async u=>Response.json(/\/gigs$/.test(new URL(u).pathname)?{gigs:[]}:{techs:[{...SHOP,shop:bad,about:bad,area:bad}]});
  const html=await (await handle(ctx('/tech/t_abc'),'tech')).text();
  assert.ok(!html.includes('<script>alert(1)</script>'));assert.ok(!/<\/script>alert/.test(html));
  assert.match(inject('<title>x</title><meta property="og:title" content="y">',{title:bad,desc:'d'},SITE),/content="&quot;&gt;&lt;script&gt;/);
});

test('logged-in hint cookie is kept in sync with sign-in (app gets the app, everyone else the public page)',()=>{
  assert.match(r('account.js'),/const signedHint=on=>\{try\{if\(on\)localStorage\.setItem\('cendon_signed','1'\);else localStorage\.removeItem\('cendon_signed'\)\}catch\(e\)\{\}signedCookie\(on\)\};/);
  assert.match(r('auth-gate.js'),/if\(!\/\(\?:\^\|; \)cendon_signed=1\/\.test\(D\.cookie\)\)D\.cookie='cendon_signed=1; max-age=31536000; path=\/; samesite=lax'/);
  const h=r('_headers');for(const p of ['/tech/*','/service/*','/category/*'])assert.doesNotMatch(h,new RegExp(`^${p.replace('*','\\*')}\\n  X-Robots-Tag`,'m'),p);
  for(const f of ['about.html','help.html'])assert.match(r(f),/<a href="\/category\/air">/,f+' links to category pages (crawl path)');
});

test('owner preview (?preview=1) shows the public page even when signed in, never indexed or cached',async()=>{
  api();
  const pv=(path,cookie)=>({...ctx('/tech/x',{cookie}),request:new Request(SITE+path,{headers:cookie?{cookie}:{}}),params:{path:[path.split('?')[0].split('/')[2]]}});
  const res=await handle(pv('/tech/t_abc?preview=1','cendon_signed=1'),'tech'),html=await res.text();
  assert.equal(res.status,200);assert.match(html,/<h1>นนท์แอร์ แอนด์ เซอร์วิส<\/h1>/,'public page, not the app');
  assert.equal(res.headers.get('x-robots-tag'),'noindex');assert.equal(res.headers.get('cache-control'),'private, no-store');
  assert.match(html,new RegExp(`<link rel="canonical" href="${SITE}/tech/t_abc">`),'canonical stays the clean address');
  for(const x of ['0812345678','@nonair','99/9'])assert.ok(!html.includes(x),x);
  /* ร้านทดลอง/ไม่มีอยู่: ไม่มีหน้าสาธารณะให้ดู → หน้าแอปเดิม ไม่ใช่หน้าสาธารณะปลอม */
  const t=await handle(pv('/tech/t_test?preview=1','cendon_signed=1'),'tech');
  assert.equal(t.headers.get('x-robots-tag'),'noindex');assert.doesNotMatch(await t.text(),/sp-head/);
});

test('shop names: /tech/<name> is the address, ids and capitals move there, old names follow the shop',async()=>{
  const named={...SHOP,handle:'nonair'};
  const seen=[];globalThis.fetch=async u=>{u=new URL(u);seen.push(u.pathname);
    if(u.pathname==='/api/tech/handle/nonair-old')return Response.json({techId:'t_abc',handle:'nonair',current:false});
    if(u.pathname.startsWith('/api/tech/handle/'))return Response.json({error:'ไม่พบร้าน'},{status:404});
    return Response.json(/\/gigs$/.test(u.pathname)?{gigs:GIGS.gigs.map(g=>g.tech.id==='t_abc'?{...g,tech:named}:g)}:{techs:[named,TECHS.techs[1]]})};
  const res=await handle(ctx('/tech/nonair'),'tech'),html=await res.text();
  assert.equal(res.status,200);assert.match(html,/<h1>นนท์แอร์ แอนด์ เซอร์วิส<\/h1>/);
  assert.match(html,new RegExp(`<link rel="canonical" href="${SITE}/tech/nonair">`));
  assert.equal(ldOf(html).find(x=>x['@type']==='AutoRepair')['@id'],SITE+'/tech/nonair#shop');
  for(const [from,to] of [['/tech/t_abc','/tech/nonair'],['/tech/NonAir','/tech/nonair'],['/tech/nonair-old','/tech/nonair']]){
    const r=await handle(ctx(from),'tech');assert.equal(r.status,301,from);assert.equal(r.headers.get('location'),to,from);}
  /* คนที่ล็อกอินอยู่ได้หน้าแอปที่ที่อยู่เดิม (แอปหาร้านจากชื่อหรือรหัสได้เอง) — ไม่ย้ายที่อยู่ */
  assert.equal((await handle(ctx('/tech/t_abc',{cookie:'cendon_signed=1'}),'tech')).status,200);
  assert.equal((await handle(ctx('/tech/nobody-here'),'tech')).status,404);
  const sv=await (await handle(ctx('/service/9'),'service')).text();assert.match(sv,/href="\/tech\/nonair"/);assert.doesNotMatch(sv,/href="\/tech\/t_abc"/);
  const sm=await (await sitemap({env:{},request:new Request(SITE+'/sitemaps/shops')})).text();
  assert.match(sm,new RegExp(`<loc>${SITE}/tech/nonair</loc>`));assert.doesNotMatch(sm,/\/tech\/t_abc/);
});
