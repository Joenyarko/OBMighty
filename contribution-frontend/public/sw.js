// Service Worker for O.B. Mighty PWA
const CACHE_NAME = 'obmighty-cache-v1';

// Install event
self.addEventListener('install', () => {
  console.log('[ServiceWorker] Installing...');
  self.skipWaiting();
});

// Activate event
self.addEventListener('activate', (event) => {
  console.log('[ServiceWorker] Activating...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('[ServiceWorker] Removing old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch event - simple caching strategy
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Only handle GET requests
  if (request.method !== 'GET') {
    return;
  }

  // Skip manifest - let browser fetch it normally (same origin, no caching needed)
  if (url.pathname.endsWith('/manifest.webmanifest')) {
    return;
  }

  // API calls: network-first, fallback to cache
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(request)
        .then(response => {
          if (response && response.status === 200) {
            const cacheCopy = response.clone();
            caches.open(CACHE_NAME).then(cache => {
              cache.put(request, cacheCopy);
            });
          }
          return response;
        })
        .catch(() => caches.match(request))
    );
    return;
  }

  // Static assets: cache-first, network fallback
  event.respondWith(
    caches.match(request).then(response => {
      if (response) {
        return response;
      }
      return fetch(request)
        .then(res => {
          if (!res || res.status !== 200) {
            return res;
          }
          const cacheCopy = res.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(request, cacheCopy);
          });
          return res;
        })
        .catch(() => {
          // Silent fail for offline
        });
    })
  );
});
