/* ══════════════════════════════════════════════════════════════════
   Cendon service worker
   หน้าที่หลักคือรับการแจ้งเตือน ส่วนแคชทำแบบระวังตัว
   หน้าเว็บเป็นไฟล์เดียวที่เปลี่ยนบ่อย จึงใช้ network-first เสมอ
   ไม่งั้นผู้ใช้จะติดอยู่กับเวอร์ชันเก่าโดยไม่รู้ตัว
   ══════════════════════════════════════════════════════════════════ */
const CACHE = 'cendon-v27';
/* แต่ละหน้าเป็นไฟล์เดี่ยวที่สมบูรณ์ในตัว โหลดล่วงหน้าไว้ทั้งชุด
   การเปิด URL ของหน้าไหนตรง ๆ จึงไม่ต้องรอเน็ต */
const SHELL = ['./', './index.html', './garage.html', './news.html',
  './spares.html', './profile.html', './chat.html',
  './about.html', './help.html', './terms.html', './privacy.html'];

self.addEventListener('install', (e) => {
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL).catch(() => {})));
});

self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;   // API และ CDN ปล่อยผ่าน
  /* หน้าเว็บเป็นไฟล์เดียวขนาดใหญ่ที่เปลี่ยนทุกครั้งที่อัปเดต
     GitHub Pages ส่ง Cache-Control มาให้เก็บได้ เบราว์เซอร์จึงอาจตอบ fetch()
     ด้วยของเก่าจาก HTTP cache เอง ทั้งที่เซิร์ฟเวอร์มีของใหม่แล้ว
     ผู้ใช้จะเห็น UI เก่าค้างอยู่โดยไม่มีทางรู้ตัว — บังคับให้ไปถามเซิร์ฟเวอร์จริง */
  const isPage = req.mode === 'navigate' || /\.html$/.test(url.pathname);
  e.respondWith((async () => {
    try {
      const fresh = isPage
        ? await fetch(req.url, { cache: 'reload', credentials: 'same-origin' })
        : await fetch(req);
      if (fresh && fresh.ok) {
        const c = await caches.open(CACHE);
        c.put(req, fresh.clone());
      }
      return fresh;
    } catch (err) {
      // ออฟไลน์ค่อยหยิบของที่เก็บไว้ อย่างน้อยเปิดดูข้อมูลรถได้
      const hit = await caches.match(req);
      if (hit) return hit;
      const home = await caches.match('./index.html');
      if (home) return home;
      throw err;
    }
  })());
});

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
