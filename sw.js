// Future Muslims Academy — offline cache
const CACHE = 'fma-v1';
const CORE = ['./', './index.html', './manifest.json',
  './icon-192.png', './icon-512.png', './maskable-512.png', './apple-touch-icon.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(CORE)).then(() => self.skipWaiting()));
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
  const url = new URL(req.url);

  // Google Fonts: save on first online visit so they work offline later
  if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
    e.respondWith(
      caches.open(CACHE).then(c =>
        c.match(req).then(hit => {
          const net = fetch(req).then(r => { c.put(req, r.clone()); return r; }).catch(() => hit);
          return hit || net;
        })
      )
    );
    return;
  }

  // Only handle our own files
  if (url.origin !== location.origin) return;

  // Pages: network first (fresh when online), cache when offline
  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req).then(r => { caches.open(CACHE).then(c => c.put('./index.html', r.clone())); return r; })
        .catch(() => caches.match('./index.html'))
    );
    return;
  }

  // Other files: cache first
  e.respondWith(
    caches.match(req).then(hit => hit || fetch(req).then(r => {
      caches.open(CACHE).then(c => c.put(req, r.clone())); return r;
    }))
  );
});
