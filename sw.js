/* Cycle — offline service worker.
   Bump CACHE whenever you replace index.html so phones pick up the new version. */
const CACHE = 'cycle-v16';
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

  // Navigations: serve the cached page immediately, refresh it in the background.
  if (req.mode === 'navigate') {
    e.respondWith(
      caches.match('./index.html').then(hit => {
        const net = fetch(req)
          .then(res => {
            caches.open(CACHE).then(c => c.put('./index.html', res.clone()));
            return res;
          })
          .catch(() => hit);
        return hit || net;
      })
    );
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
