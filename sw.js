/* ══════════════════════════════════════════════════════════════════
   Cendon service worker
   หน้าที่หลักคือรับการแจ้งเตือน ส่วนแคชทำแบบระวังตัว
   หน้าเว็บเป็นไฟล์เดียวที่เปลี่ยนบ่อย จึงถามเน็ตก่อนเสมอ (ไม่งั้นผู้ใช้จะติดอยู่กับเวอร์ชันเก่า)
   แต่รอแค่ครู่เดียว — เน็ตมือถือช้า/ค้าง ต้องไม่ทำให้แอปค้างหน้าจอโหลด
   ══════════════════════════════════════════════════════════════════ */
const CACHE = 'cendon-v213-category-snap';
/* หน้าเว็บที่โหลดสำเร็จล่าสุด แยกตู้ไว้และ "ไม่ลบตอนอัปเดตเวอร์ชัน"
   เดิมทุกครั้งที่ deploy ตู้เก่าถูกล้างหมด เปิดแอปครั้งแรกหลังอัปเดตจึงไม่มีของสำรอง
   ต้องรอเน็ตอย่างเดียว — เน็ตมือถือช้าเมื่อไรก็ค้างหน้าจอโหลดของมือถือ */
const PAGES = 'cendon-pages';
/* เน็ตไม่ตอบภายในเท่านี้ ใช้หน้าที่เก็บไว้ก่อน (เน็ตตอบทีหลังก็เก็บไว้ใช้รอบหน้า) */
const WAIT = 1500;
/* โหลดล่วงหน้าเฉพาะไฟล์เล็กที่หน้าแรกใช้จริง
   เดิมโหลดทุกหน้า (~7 MB) แย่งเน็ตตอนผู้ใช้กำลังเปิดแอป และในรายการมีไฟล์ที่ไม่มีอยู่จริง
   (cendon-one.css, about, help, privacy) ทำให้ addAll ล้มทั้งชุด = ไม่เคยเก็บอะไรได้เลย */
const CORE = ['./home-layout.css', './stability.css', './stability.js', './mobile-ui.js', './fluid.js', './crop.js', './cendon-admin.js', './call-sounds.js?v=1', './cendon-search.js', './cendon-line.js', './manifest.webmanifest', './icon192.png'];
const BUILD_HEADER = 'X-Cendon-Shell';
const SHELL_ROUTES = new Set(['/', '/index', '/garage', '/news', '/spares', '/profile', '/chat', '/dashboard', '/plan', '/handbook', '/tech', '/techs', '/terms', '/login']);
function stored(r) {
  const headers = new Headers(r.headers);
  headers.set(BUILD_HEADER, CACHE);
  // fetch() has decoded the stream already; don't attach wire-level lengths/encoding.
  headers.delete('Content-Length'); headers.delete('Content-Encoding');
  return new Response(r.body, { status:r.status, statusText:r.statusText, headers });
}

/* ชื่อหน้าแบบสะอาดตามที่ Cloudflare Pages ใช้ (/index.html → /, /chat.html → /chat)
   ขอชื่อนี้ตรง ๆ ไม่ต้องเสียรอบ redirect 308 และใช้เป็นกุญแจในตู้ (ไม่รวม ?shop= ?trip= — ไฟล์เดียวกัน) */
const pageKey = (u) => u.origin + u.pathname.replace(/\/index\.html$/, '/').replace(/\.html$/, '');
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
    await Promise.all(CORE.map((u) => c.add(new Request(u, { cache: 'reload' })).catch(() => {})));
    /* หน้าแรกรุ่นใหม่เก็บไว้ตั้งแต่ติดตั้ง — โหลดไม่สำเร็จก็ยังมีรุ่นก่อนหน้าอยู่ในตู้ */
    const home = new URL('./', self.location).href;
    await fetch(home, {cache:'reload'}).then(plain).then(async r => {
      if(r.ok)await (await caches.open(PAGES)).put(home,stored(r));
    }).catch(() => {});
  })());
});

self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((k) => k.startsWith('cendon-') && k !== CACHE && k !== PAGES).map((k) => caches.delete(k)));
    /* ให้เบราว์เซอร์เริ่มขอหน้าจากเน็ตไปพร้อมกับปลุก service worker (มือถือปลุกช้าได้หลายร้อย ms) */
    try { if (self.registration.navigationPreload) await self.registration.navigationPreload.enable(); } catch (err) {}
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;   // API และ CDN ปล่อยผ่าน
  if (/^\/api(?:\/|$)/.test(url.pathname) || req.headers.has('Authorization')) return;
  const route=url.pathname.replace(/\.html$/,'').replace(/\/index$/,'/');
  const isPage = SHELL_ROUTES.has(route) && (req.mode === 'navigate' || /\.html$/.test(url.pathname) || !req.destination);
  if (isPage) return openPage(e, url);
  if (!/\.(?:js|css|png|webp|svg|ico|woff2?|webmanifest|json)$/.test(url.pathname)) return;
  e.respondWith(asset(e, req));
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
      // ออฟไลน์และไม่เคยเปิดหน้านี้ ส่งหน้าแรกที่เก็บไว้แทน อย่างน้อยเปิดแอปได้
      const home = await pages.match(new URL('./', self.location).href);
      if (home) return home;
      throw err;
    }
  })());
}

/* ไฟล์ประกอบ (js/css/รูป): ถามเน็ตก่อนเหมือนกัน รอไม่เกิน WAIT ถ้ามีของในตู้ */
async function asset(e, req) {
  const cache=await caches.open(CACHE),cached=await cache.match(req);
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
  e.waitUntil(self.registration.showNotification(d.title, {
    body: d.body,
    icon: './icon192.png',
    badge: './icon192.png',
    tag: d.tag || 'cendon',
    renotify: true,
    data: { url: d.url || '/' },
  }));
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
