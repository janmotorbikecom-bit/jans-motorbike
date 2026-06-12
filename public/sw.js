const CACHE_NAME = 'jans-motorbike-v1';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => caches.delete(cache))
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  // Luôn luôn tải mới từ mạng để không bị treo Pending trên localhost
  event.respondWith(fetch(event.request));
});
