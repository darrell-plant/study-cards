// sw.js
const CACHE = 'sc-v40';

const VERSION_ENDPOINT = 'version.txt';
const VERSION_PATHNAME = new URL(VERSION_ENDPOINT, self.registration.scope).pathname;

// Put only files that truly exist next to sw.js (add icons if you have them)
const ASSETS = [
  "./",
  'index.html',
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

self.addEventListener("fetch", (event) => {
  const { request } = event;
  // Serve a plain-text version string from the SW (uses CACHE)
  try {
    const url = new URL(event.request.url);
    if (url.origin === location.origin && url.pathname === VERSION_PATHNAME) {
      event.respondWith(new Response(CACHE, {
        status: 200,
        headers: {
          'content-type': 'text/plain; charset=utf-8',
          'cache-control': 'no-store'
        }
      }));
      return;
    }
  } catch (_) {}

  // Always try network first for navigations/HTML so index.html is never stale
  const isHTML =
    request.mode === "navigate" ||
    (request.headers.get("accept") || "").includes("text/html");

  if (isHTML) {
    event.respondWith(
      fetch(request)
        .then((res) => {
          // Optionally cache the fresh HTML (not required, but fine)
          const okFull = res.ok && res.status === 200 && res.type === "basic";
          if (okFull) {
            const resClone = res.clone();
            caches.open(CACHE).then((c) => c.put(request, resClone));
          }
          return res;
        })
        .catch(() => {
          // Fallback to cache (./ or cached index.html) when offline
          return caches.match(request).then((hit) => hit || caches.match("./"));
        })
    );
    return;
  }

  // Cache-first for library files (sentence decks)
  if (request.url.includes("/library/")) {
    return cacheFirst(event, request);
  }

  // Cache-first for app icons
  if (request.url.includes('/assets/')) {
    return cacheFirst(event, request);
  }

  // Cache-first for the PWA manifest
  if (request.url.endsWith('manifest.webmanifest')) {
    return cacheFirst(event, request);
  }

  // Network-first for everything else
  event.respondWith(
    fetch(request)
      .then((res) => {
        const isPartial = res.status === 206 || res.headers.has('Content-Range');
        const canCache = res.ok && !isPartial && request.method === 'GET' && res.type === 'basic';
        if (canCache) {
          const resClone = res.clone();
          caches.open(CACHE).then((c) => c.put(request, resClone));
        }
        return res;
      })
      .catch(() => caches.match(request))
  );
});

function cacheFirst(event, request) {
  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;
      return fetch(request).then((res) => {
        const isPartial = res.status === 206 || res.headers.has('Content-Range');
        const canCache = res.ok && !isPartial && request.method === 'GET' && res.type === 'basic';
        if (canCache) {
          const resClone = res.clone();
          caches.open(CACHE).then((c) => c.put(request, resClone));
        }
        return res;
      });
    })
  );
  return;
}
