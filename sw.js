/* כוח: service worker. כשמעלים גרסה חדשה מעלים את המספר כאן */
const VERSION = 'koach-2.5';
const SHELL = ['./', './index.html', './manifest.json', './icon-180.png', './icon-192.png', './icon-512.png'];
const LIB = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.116.0/dist/umd/supabase.js';

self.addEventListener('install', e => {
  e.waitUntil((async () => {
    const c = await caches.open(VERSION);
    await c.addAll(SHELL);
    try { await c.add(new Request(LIB, { mode: 'no-cors' })); } catch (err) {}
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', e => {
  e.waitUntil((async () => {
    for (const k of await caches.keys()) if (k !== VERSION) await caches.delete(k);
    await self.clients.claim();
  })());
});

const withTimeout = (p, ms) => Promise.race([p, new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), ms))]);

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.hostname.endsWith('supabase.co')) return;            /* נתונים: תמיד מהרשת */

  if (req.mode === 'navigate') {                                 /* הדף עצמו: קודם רשת, בלי קליטה מהמטמון */
    e.respondWith((async () => {
      try {
        const res = await withTimeout(fetch(req), 4000);
        if (res.ok) (await caches.open(VERSION)).put('./index.html', res.clone());
        return res;
      } catch (err) {
        return (await caches.match('./index.html')) || (await caches.match('./')) || Response.error();
      }
    })());
    return;
  }

  if (url.origin === self.location.origin || url.href === LIB) {  /* קבצים קבועים: קודם מטמון */
    e.respondWith((async () => {
      const hit = await caches.match(req);
      if (hit) return hit;
      const res = await fetch(req);
      if (res && (res.ok || res.type === 'opaque')) (await caches.open(VERSION)).put(req, res.clone());
      return res;
    })());
  }
});
