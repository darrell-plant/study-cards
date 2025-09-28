self.addEventListener('install', e => {
  e.waitUntil(
    caches.open('sc-v1').then(cache =>
      cache.addAll(['/', '/study_cards.html', '/manifest.webmanifest'])
    )
  );
});
self.addEventListener('fetch', e => {
  e.respondWith(
    caches.match(e.request).then(resp => resp || fetch(e.request))
  );
});