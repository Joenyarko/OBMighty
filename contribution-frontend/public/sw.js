// Service Worker for O.B. Mighty PWA
const CACHE_NAME = 'obmighty-cache-v2';

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

  // Skip cross-origin requests - let browser handle them normally
  // This prevents CSP issues with external API domains
  if (url.origin !== self.location.origin) {
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

  // Navigation and HTML requests: Network-First (always get fresh version from server, fallback to cache if offline)
  if (request.mode === 'navigate' || request.destination === 'document' || url.pathname === '/' || url.pathname.endsWith('.html')) {
    event.respondWith(
      fetch(request)
        .then(response => {
          if (response && response.status === 200) {
            const cacheCopy = response.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(request, cacheCopy));
          }
          return response;
        })
        .catch(() => caches.match(request))
    );
    return;
  }

  // Static assets (hashed JS, CSS, images): Stale-While-Revalidate
  event.respondWith(
    caches.match(request).then(cachedResponse => {
      const fetchPromise = fetch(request)
        .then(networkResponse => {
          if (networkResponse && networkResponse.status === 200) {
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(request, responseToCache));
          }
          return networkResponse;
        })
        .catch(() => cachedResponse);

      // Return cached version immediately if available, otherwise wait for network
      return cachedResponse || fetchPromise;
    })
  );
});

