/* Cycle — offline service worker.
   Bump CACHE whenever you replace index.html so phones pick up the new version. */
const CACHE = 'cycle-v53';
const SHELL = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icon-192.png',
  './icon-512.png',
  './apple-touch-icon.png'
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE)
      .then(c => c.addAll(SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;

  /* Navigations: ask the network first, so a new upload shows up on the very
     next launch rather than the one after. Fall back to the cached page when
     the network is missing or slow, so it still opens offline. */
  if (req.mode === 'navigate') {
    e.respondWith((async () => {
      let hit = null;
      try { hit = await caches.match('./index.html'); } catch (err) {}
      let timer;
      try {
        const res = await Promise.race([
          fetch(req),
          new Promise((_, rej) => { timer = setTimeout(() => rej(new Error('slow')), 2500); })
        ]);
        if (res && res.ok) {
          try { const c = await caches.open(CACHE); await c.put('./index.html', res.clone()); } catch (err) {}
          return res;
        }
        return hit || res;
      } catch (err) {
        return hit || fetch(req);
      } finally { clearTimeout(timer); }
    })());
    return;
  }

  e.respondWith(
    caches.match(req).then(hit => hit || fetch(req).then(res => {
      if (res && res.status === 200 && res.type === 'basic') {
        const copy = res.clone();
        caches.open(CACHE).then(c => c.put(req, copy));
      }
      return res;
    }).catch(() => hit))
  );
});
