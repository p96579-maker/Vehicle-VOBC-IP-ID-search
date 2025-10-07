
const CACHE = 'vobc-search-v4';
const SHELL = [
  './',
  './index.html',
  './styles.css',
  './app.js',
  './assets/data.json',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './manifest.webmanifest',
  'https://cdn.tailwindcss.com'
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(keys.map(k => k !== CACHE && caches.delete(k))))
  );
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;

  e.respondWith((async () => {
    const cache = await caches.open(CACHE);

    // cache-first for same-origin + tailwind CDN
    const isSameOrigin = new URL(req.url).origin === self.location.origin;
    const isTailwind = req.url.startsWith('https://cdn.tailwindcss.com');

    if (isSameOrigin || isTailwind) {
      const cached = await cache.match(req);
      if (cached) return cached;
      try {
        const res = await fetch(req);
        cache.put(req, res.clone());
        return res;
      } catch (err) {
        // explicit fallback for data.json -> serve cached index (app will use embedded bootstrap data if present)
        if (req.url.endsWith('/assets/data.json')) {
          const index = await cache.match('./index.html');
          if (index) return index;
        }
        if (req.mode === 'navigate') {
          const index = await cache.match('./index.html');
          if (index) return index;
        }
        throw err;
      }
    }

    // default network-first for anything else
    try {
      const res = await fetch(req);
      cache.put(req, res.clone());
      return res;
    } catch {
      const cached = await cache.match(req);
      if (cached) return cached;
      if (req.mode === 'navigate') {
        const index = await cache.match('./index.html');
        if (index) return index;
      }
      throw new Error('Offline and not cached');
    }
  })());
});
