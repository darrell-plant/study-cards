// sw.js
const CACHE = 'sc-v117';

// Put only files that truly exist next to sw.js (add icons if you have them)
const ASSETS = [
  'study_cards.html',
  'manifest.webmanifest',
  'library/index.json',
  'assets/icon-192.v3.png',
  'assets/icon-512.v3.png',
];

function toScopedURL(path) {
  // Resolve against the service worker scope so it works on GitHub Pages subpaths
  return new URL(path, self.registration.scope).toString();
}

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then(async (cache) => {
      // Cache each asset individually so one 404 doesn't nuke the whole install
      const urls = ASSETS.map(toScopedURL);
      await Promise.all(urls.map(async (url) => {
        try {
          const res = await fetch(url, { cache: 'no-cache' });
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          await cache.put(url, res.clone());
        } catch (err) {
          // Log and continue; don't fail entire install on a single miss
          console.warn('[SW] Cache skip:', url, String(err));
        }
      }));
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.map((k) => (k === CACHE ? null : caches.delete(k))))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  // Handle only same-origin GET requests
  if (req.method !== 'GET') return;
  if (new URL(req.url).origin !== self.location.origin) return;

  event.respondWith(
    fetch(req).then((res) => {
      // Update cache in background
      const copy = res.clone();
      caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {});
      return res;
    }).catch(async () => {
      // Offline fallback: if it's a navigation, show main HTML
      if (req.mode === 'navigate') {
        return caches.match(toScopedURL('study_cards.html'));
      }
      return caches.match(req);
    })
  );
});
