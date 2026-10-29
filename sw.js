/* ══════════════════════════════════════════════════════════════════
   Cendon service worker
   หน้าที่หลักคือรับการแจ้งเตือน ส่วนแคชทำแบบระวังตัว
   หน้าเว็บเป็นไฟล์เดียวที่เปลี่ยนบ่อย จึงถามเน็ตก่อนเสมอ (ไม่งั้นผู้ใช้จะติดอยู่กับเวอร์ชันเก่า)
   แต่รอแค่ครู่เดียว — เน็ตมือถือช้า/ค้าง ต้องไม่ทำให้แอปค้างหน้าจอโหลด
   ══════════════════════════════════════════════════════════════════ */
const CACHE = 'cendon-v395-cloud-size-layout';
/* หน้าเว็บที่โหลดสำเร็จล่าสุด แยกตู้ไว้และ "ไม่ลบตอนอัปเดตเวอร์ชัน"
   เดิมทุกครั้งที่ deploy ตู้เก่าถูกล้างหมด เปิดแอปครั้งแรกหลังอัปเดตจึงไม่มีของสำรอง
   ต้องรอเน็ตอย่างเดียว — เน็ตมือถือช้าเมื่อไรก็ค้างหน้าจอโหลดของมือถือ */
const PAGES = 'cendon-pages';
/* เน็ตไม่ตอบภายในเท่านี้ ใช้หน้าที่เก็บไว้ก่อน (เน็ตตอบทีหลังก็เก็บไว้ใช้รอบหน้า) */
const WAIT = 1500;
/* โหลดล่วงหน้าเฉพาะไฟล์เล็กที่หน้าแรกใช้จริง
   เดิมโหลดทุกหน้า (~7 MB) แย่งเน็ตตอนผู้ใช้กำลังเปิดแอป และในรายการมีไฟล์ที่ไม่มีอยู่จริง
   (cendon-one.css, about, help, privacy) ทำให้ addAll ล้มทั้งชุด = ไม่เคยเก็บอะไรได้เลย */
const CORE = ['./mileage-session.js?v=1', './mileage-review.js?v=1', './garage-rules.js?v=5', './garage-data.js?v=2', './calm-ui.css?v=1', './chat-garage.js?v=1', './chat-render.js?v=3', './account-paint.js?v=2026-10-16-r2', './account.css?v=2026-10-16-login5', './account.js?v=2026-10-28-r1', './account-actions.js?v=3', './account-scope.js?v=2', './settings.js?v=8', './settings.css?v=5', './sheet-drag.js?v=1', './launch-gate.js?v=1', './auth-gate.js?v=2', './login-hero.webp', './auth-bootstrap.js', './cendon-tour.js', './nav.js?v=2', './input-guard.js?v=6', './media-store.js?v=3', './repair-proof.js?v=1', './car-sync.js', './carspec.js?v=2026-10-18-r1', './car-detail-tabs.css?v=2026-10-12-r1', './car-detail-tabs.js?v=2026-10-12-r2', './call-ui.css?v=2026-10-19-inst1', './call-composer.js?v=2026-10-17-r4', './call-agent.js?v=2026-10-24-security2', './call-surface.js?v=2026-10-21-r1', './garage-care.js?v=1', './call-session.js?v=2026-10-23-language1', './lux.css', './category-pages.js', './home-layout.css?v=3','./home-stages.css?v=3','./home-stages.js?v=3', './call-x.css?v=2', './stability.css?v=2026-10-27-zoom', './stability.js?v=2026-10-28-r1', './mobile-ui.js?v=2', './fluid.js', './crop.js', './cendon-admin.js', './call-sounds.js?v=1', './call-tools.js?v=2026-10-23-language1', './sound-lens.js?v=1', './engine-scan.js?v=2026-10-17-r4', './vehicle-audio.js?v=5', './vehicle-audio.css?v=3', './valet-core.js?v=8', './call-shell.js?v=1', './valet.js?v=9', './valet.css?v=4', './bell.js?v=19', './tab-shell.js?v=6', './drop.js?v=5', './car-menu.js?v=1', './garage-extras.js?v=7', './garage-extras.css?v=7', './cendon-search.js', './cendon-line.js?v=5', './cloud-swap.js?v=5', './manifest.webmanifest', './icon192.png', './img/cars/sedan.webp', './img/cars/coupe.webp', './img/cars/mpv.webp', './img/cars/pickup.webp', './img/cars/van.webp', './fonts/kanit.css?v=1', './fonts/kanit-300-thai.woff2', './fonts/kanit-300-latin.woff2', './fonts/kanit-400-thai.woff2', './fonts/kanit-400-latin.woff2', './fonts/kanit-500-thai.woff2', './fonts/kanit-500-latin.woff2', './fonts/kanit-600-thai.woff2', './fonts/kanit-600-latin.woff2', './fonts/kanit-700-thai.woff2', './fonts/kanit-700-latin.woff2', './fonts/kanit-800-thai.woff2', './fonts/kanit-800-latin.woff2', './motion.css?v=1', './icons/ti.css?v=2ef93532', './icons/ti.woff2?v=3ea894cc'];
CORE.unshift('./money-fields.js?v=1','./car-info-review.js?v=2','./mileage-sync.js?v=1','./chat-jobs.js?v=4','./primary-material.css?v=1','./shop-search.js?v=5','./shop-search.css?v=4','./shop-images.js?v=1','./display-prefs.js?v=5','./partner-state.js?v=1','./partner-entry.js?v=1','./partner-entry.css?v=1');
CORE.unshift('./money-fields.js?v=1','./car-info-review.js?v=2','./i18n/ui-en.js?v=4','./ui-language.js?v=15','./car-info-review.js?v=2');
const BUILD_HEADER = 'X-Cendon-Shell';
CORE.unshift('./app-navigation.js?v=4','./app-navigation-bridge.js?v=3','./app-navigation.css?v=3','./app-routes.js','./app-pending.js','./app-pending.css?v=1','./page-core.js?v=1','./vendor/barba-core-2.10.3.umd.js');
// An update must not redownload every tool/font/image while the first page boots.
// Noncritical public code is cached on actual use; hashed runtime survives builds.
const INSTALL_CORE=[...new Set(CORE)].filter(u=>/^\.\/(?:app-(?:navigation|pending|routes)|page-core|auth-gate|account-scope|account-paint|account\.js|garage-rules|garage-data|input-guard|vendor\/barba|nav\.js|manifest\.|icon192)/.test(u));
const CODE = 'cendon-code-v1'; // Public content-addressed scripts; old cached HTML may still reference them.
const VIEW_WARM=new Map();
const WARM_ASSETS=new Map();
/* /about /help /privacy /terms = เว็บไซต์ (สร้างจาก site/) เก็บไว้ให้เปิดได้ตอนออฟไลน์ด้วย */
const SHELL_ROUTES = new Set(['/', '/index', '/garage', '/news', '/spares', '/profile', '/chat', '/plan', '/handbook', '/tech', '/techs', '/terms', '/login', '/about', '/help', '/privacy', '/launch']);
/* ที่อยู่แบบลึก (แบบ YouTube) ใช้ไฟล์หน้าเดียวกับหน้าแม่ — ตรงกับ _redirects
   /garage/<รถ>/spec → หน้า /garage · /tech/<ร้าน> /jobs/<งาน> ฯลฯ → หน้าแรก / */
const DEEP_PAGES = new Set(['garage', 'news', 'spares', 'profile', 'chat', 'passport']);
const DEEP_HOME = new Set(['tech', 'service', 'category', 'search', 'map', 'jobs', 'messages', 'quote', 'listen', 'photo', 'line', 'studio', 'work', 'staff', 'join', 'trip', 'quotes', 'compare', 'urgent', 'diagnose', 'post']);
function shellOf(pathname) {
  const p = pathname.replace(/\.html$/, '').replace(/\/index$/, '/');
  if (p === '/console') return '/console';
  if (SHELL_ROUTES.has(p)) return p;
  const seg = p.split('/')[1] || '';
  if (DEEP_PAGES.has(seg)) return '/' + seg;
  if (DEEP_HOME.has(seg)) return '/';
  return null;
}
function stored(r) {
  const headers = new Headers(r.headers);
  headers.set(BUILD_HEADER, CACHE);
  // fetch() has decoded the stream already; don't attach wire-level lengths/encoding.
  headers.delete('Content-Length'); headers.delete('Content-Encoding');
  return new Response(r.body, { status:r.status, statusText:r.statusText, headers });
}

/* ชื่อหน้าแบบสะอาดตามที่ Cloudflare Pages ใช้ (/index.html → /, /chat.html → /chat)
   ขอชื่อนี้ตรง ๆ ไม่ต้องเสียรอบ redirect 308 และใช้เป็นกุญแจในตู้ (ไม่รวม ?shop= ?trip= — ไฟล์เดียวกัน) */
const pageKey = (u) => u.origin + (shellOf(u.pathname) || u.pathname.replace(/\/index\.html$/, '/').replace(/\.html$/, ''));
const wait = (ms) => new Promise((r) => setTimeout(() => r(null), ms));
/* คำตอบที่ผ่าน redirect ส่งให้การเปิดหน้า (navigate) ไม่ได้ — เบราว์เซอร์จะขึ้น ERR_FAILED จึงห่อใหม่ */
const plain = async (r) => (r && r.redirected
  ? new Response(await r.blob(), { status: r.status, statusText: r.statusText, headers: r.headers })
  : r);

self.addEventListener('install', (e) => {
  self.skipWaiting();
  e.waitUntil((async () => {
    const c = await caches.open(CACHE);
    /* ทีละไฟล์ ไฟล์ไหนพังก็ข้าม ไม่ลากไฟล์อื่นล้มไปด้วย */
    await Promise.all(INSTALL_CORE.map((u) => c.add(new Request(u, { cache: 'reload' })).catch(() => {})));
    /* หน้าแรกรุ่นใหม่เก็บไว้ตั้งแต่ติดตั้ง — โหลดไม่สำเร็จก็ยังมีรุ่นก่อนหน้าอยู่ในตู้ */
    const home = new URL('./', self.location).href;
    await fetch(home, {cache:'reload'}).then(plain).then(async r => {
      if(r.ok&&r.headers.get('X-Cendon-Document')!=='barba-shell-v1')await (await caches.open(PAGES)).put(home,stored(r));
    }).catch(() => {});
  })());
});

self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((k) => k.startsWith('cendon-') && k !== CACHE && k !== PAGES && k !== CODE).map((k) => caches.delete(k)));
    /* ให้เบราว์เซอร์เริ่มขอหน้าจากเน็ตไปพร้อมกับปลุก service worker (มือถือปลุกช้าได้หลายร้อย ms) */
    try { if (self.registration.navigationPreload) await self.registration.navigationPreload.disable(); } catch (err) {}
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;   // API และ CDN ปล่อยผ่าน
  if (/^\/api(?:\/|$)/.test(url.pathname) || req.headers.has('Authorization') || /^\/(?:handbookparts\.json|HANDBOOK\.md)\/?$/i.test(url.pathname)) return;
  const appPart=url.pathname.replace(/\.html$/,'').split('/')[1]||'';
  if(new Set(['','index','garage','news','spares','profile','chat',...DEEP_HOME]).has(appPart)&&appPart!=='trip')return openAppPage(e,url);
  const isPage = shellOf(url.pathname) !== null && (req.mode === 'navigate' || /\.html$/.test(url.pathname) || !req.destination);
  if (isPage) return openPage(e, url);
  if (!/\.(?:js|css|png|webp|svg|ico|woff2?|webmanifest|json)$/.test(url.pathname)) return;
  e.respondWith(asset(e, req));
});

/* Barba's tiny host document and the legacy view must NEVER share a cache key.
   The host is private/no-store (may contain a deep-link query). Only generic
   app-code views are cached. API responses/tokens remain outside these caches. */
function openAppPage(e,url){
  const frame=['iframe','frame'].includes(e.request.destination)||url.searchParams.has('__cendon_document')||url.searchParams.get('classic')==='1';
  const key=pageKey(url)+'?__cendon_view=legacy-v386';
  const netUrl=new URL(url);if(frame)netUrl.searchParams.set('__cendon_document','1');
  const inFlight=frame&&!url.search&&VIEW_WARM.get(url.origin+url.pathname);
  const net=inFlight?inFlight.then(r=>r.clone()):fetch(netUrl.href,{cache:'no-cache',credentials:'same-origin'}).then(plain);
  e.respondWith((async()=>{
    if(!frame)return net.catch(()=>offlinePage());
    // Anonymous public SSR and query-specific pages are not generic app code.
    if(/^\/(?:tech|service|category)(?:\/|$)/.test(url.pathname)||url.search)return net.catch(()=>offlinePage());
    const c=await caches.open(PAGES),cached=await c.match(key);
    const refresh=net.then(async r=>{if(r.ok&&r.headers.get('X-Cendon-Document')!=='barba-shell-v1')await c.put(key,stored(r.clone()));return r;});
    e.waitUntil(refresh.catch(()=>{}));
    if(cached&&cached.headers.get(BUILD_HEADER)===CACHE&&!['reload','no-cache'].includes(e.request.cache))return cached;
    if(cached){const r=await Promise.race([refresh.catch(()=>null),wait(WAIT)]);return r?.ok?r:cached;}
    return refresh.catch(()=>offlinePage());
  })());
}
function offlinePage(){return new Response('<!doctype html><meta charset="utf-8"><title>Cendon · Offline</title><body style="background:#101012;color:white;font:18px system-ui;padding:32px"><h1>ยังเปิดหน้านี้ไม่ได้</h1><p>เชื่อมต่ออินเทอร์เน็ตแล้วลองอีกครั้ง · Please reconnect and retry.</p><button onclick="location.reload()">ลองอีกครั้ง · Retry</button>',{status:503,headers:{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store'}});}

// Warm only Garage's PUBLIC static app code, not an executing hidden app. No
// Firebase boot, geolocation, personal API, AI task or account write is triggered.
self.addEventListener('message',e=>{
  if(!e.source?.url)return;
  if(new URL(e.source.url).origin!==self.location.origin)return;
  const client=e.source.id||e.source.url;
  if(e.data?.type==='cendon:stop-warm'){WARM_ASSETS.get(client)?.abort();return;}
  if(e.data?.type!=='cendon:warm-garage')return;
  const url=new URL('/garage',self.location.origin),id=url.href;
  if(VIEW_WARM.has(id))return;
  const controller=new AbortController();WARM_ASSETS.get(client)?.abort();WARM_ASSETS.set(client,controller);
  const task=(async()=>{const c=await caches.open(PAGES),key=pageKey(url)+'?__cendon_view=legacy-v386',cached=await c.match(key);
    if(cached?.headers.get(BUILD_HEADER)===CACHE)return cached;
    const r=await fetch(id+'?__cendon_document=1',{cache:'no-cache',credentials:'omit'}).then(plain);
    if(r.ok&&r.headers.get('X-Cendon-Document')!=='barba-shell-v1'&&/text\/html/i.test(r.headers.get('Content-Type')||'')){
      await c.put(key,stored(r.clone()));
    }
    return r;
  })();VIEW_WARM.set(id,task);
  // Foreground navigation may join ONLY the HTML task, never wait for warming
  // optional dependencies. A tap also cancels those lower-priority transfers.
  const htmlReady=task.finally(()=>{if(VIEW_WARM.get(id)===task)VIEW_WARM.delete(id);});
  e.waitUntil(htmlReady.then(async r=>{
    if(!r.ok||controller.signal.aborted||r.headers.get('X-Cendon-Document')==='barba-shell-v1')return;
    const html=await r.clone().text(),urls=[...new Set([...html.matchAll(/(?:src|href)=["'](\/runtime\/[a-f0-9]{24}\.(?:js|css))["']/g)].map(m=>m[1]))],code=await caches.open(CODE);
    for(const asset of urls){if(controller.signal.aborted)break;const address=url.origin+asset;if(await code.match(address))continue;
      const a=await fetch(address,{credentials:'omit',signal:controller.signal});if(a.ok)await code.put(address,a);
    }
  }).catch(()=>{}).finally(()=>{if(WARM_ASSETS.get(client)===controller)WARM_ASSETS.delete(client);}));
});

/* หน้าเว็บ: ถามเน็ตก่อน (ได้รุ่นล่าสุดเสมอเมื่อเน็ตดี) แต่รอไม่เกิน WAIT ถ้ามีหน้าเก่าในตู้
   cache:'no-cache' = ถามเซิร์ฟเวอร์ทุกครั้ง แต่ถ้าไฟล์ไม่เปลี่ยนได้ 304 กลับมาสั้น ๆ ไม่ต้องโหลดทั้งไฟล์ซ้ำ */
function openPage(e, url) {
  const key = pageKey(url), clean = key === url.origin + url.pathname;
  const pre = clean && e.preloadResponse ? e.preloadResponse : Promise.resolve(null);
  let saved = null;
  const net = pre.catch(() => null)
    .then((r) => (r && r.ok ? r : fetch(key + url.search, { cache: 'no-cache', credentials: 'same-origin' })))
    .then(plain)
    .then((r) => {
      if (r.ok) { const copy = stored(r.clone()); saved = caches.open(PAGES).then((c) => c.put(key, copy)); }
      return r;
    });
  /* เน็ตตอบช้ากว่าที่รอ ก็ยังเก็บหน้าใหม่ลงตู้ให้ครั้งหน้า */
  e.waitUntil(net.then(() => saved).catch(() => {}));
  if (!clean && e.preloadResponse) e.waitUntil(e.preloadResponse.catch(() => {}));
  e.respondWith((async () => {
    const pages = await caches.open(PAGES);
    const cached = await pages.match(key);
    if (cached) {
      // Current-build public HTML is ready now. Fetch refreshes it in the background.
      // Older builds still check the network first, so deployment fixes aren't hidden.
      if(cached.headers.get(BUILD_HEADER)===CACHE && !['reload','no-cache'].includes(e.request.cache))return cached;
      const fresh = await Promise.race([net.catch(() => null), wait(WAIT)]);
      return fresh && fresh.ok ? fresh : cached;
    }
    try { return await net; } catch (err) {
      // Never render Home under /chat (or another page's URL). Its router
      // rewrites the address to /, losing the user's navigation intent.
      return new Response('<!doctype html><html lang="th"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Cendon · ออฟไลน์</title><body style="background:#101012;color:#fff;font:18px system-ui;padding:32px"><h1>ยังเปิดหน้านี้ไม่ได้</h1><p>เชื่อมต่ออินเทอร์เน็ตแล้วลองอีกครั้ง ข้อมูลที่บันทึกไว้ยังอยู่</p><button onclick="location.reload()" style="padding:14px 20px">ลองอีกครั้ง</button></body></html>',{status:503,headers:{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store'}});
    }
  })());
}

/* ไฟล์ประกอบ (js/css/รูป): ถามเน็ตก่อนเหมือนกัน รอไม่เกิน WAIT ถ้ามีของในตู้ */
async function asset(e, req) {
  const immutable=/^\/runtime\/[a-f0-9]{24}\.(?:js|css)$/.test(new URL(req.url).pathname);
  const cache=await caches.open(immutable?CODE:CACHE),cached=await cache.match(req);
  if(immutable&&cached&&!['reload','no-cache'].includes(req.cache))return cached;
  const net=fetch(req).then(r=>{if(r.ok)e.waitUntil(cache.put(req,r.clone()).catch(()=>{}));return r});
  if(cached && !['reload','no-cache'].includes(req.cache)){
    e.waitUntil(net.catch(()=>{}));return cached;
  }
  if(!cached)return net;
  const fresh=await Promise.race([net.catch(()=>null),wait(WAIT)]);
  e.waitUntil(net.catch(()=>{}));return fresh&&fresh.ok?fresh:cached;
}

self.addEventListener('push', (e) => {
  let d = { title: 'Cendon', body: '', url: '/' };
  try { if (e.data) d = Object.assign(d, e.data.json()); } catch (err) {
    try { d.body = e.data.text(); } catch (e2) {}
  }
  e.waitUntil((async () => {
    /* "AI ตอบแล้ว" — ผู้ใช้เปิดหน้าแชต AI ดูอยู่ (แท็บที่มองเห็นอยู่) เห็นคำตอบเองแล้ว ไม่ต้องเด้งบนเครื่องซ้ำ */
    if (/^cendon-ai-/.test(d.tag || '')) {
      const all = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
      if (all.some(c => c.visibilityState === 'visible' && /^\/chat(?:\.html)?\/?$/.test(new URL(c.url).pathname))) return;
    }
    await self.registration.showNotification(d.title, {
      body: d.body,
      icon: './icon192.png',
      badge: './icon192.png',
      tag: d.tag || 'cendon',
      renotify: true,
      data: { url: d.url || '/' },
    });
  })());
});

self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  const target = (e.notification.data && e.notification.data.url) || '/';
  e.waitUntil((async () => {
    const all = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    // มีแท็บเปิดอยู่แล้วให้โฟกัสแท็บนั้น ไม่ต้องเปิดใหม่ซ้อน
    // แต่ต้องพาไปหน้าปลายทางด้วย — การเตือนบำรุงรักษาชี้ไปที่รถคันหนึ่งโดยเฉพาะ
    // (/garage.html?car=..&due=..) ถ้าแค่โฟกัสเฉย ๆ ผู้ใช้จะเห็นหน้าเดิมที่ค้างอยู่
    // แล้วงงว่ากดแจ้งเตือนไปทำไม
    const abs = new URL(target, self.location.origin).href;
    for (const c of all) {
      if (!c.url.startsWith(self.location.origin)) continue;
      await c.focus();
      if (c.url !== abs && 'navigate' in c) {
        try { await c.navigate(abs); } catch (err) { /* ข้ามเอกสารบางกรณีทำไม่ได้ */ }
      }
      return;
    }
    await self.clients.openWindow(abs);
  })());
});
