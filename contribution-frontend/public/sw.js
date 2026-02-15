// Service Worker for O.B. Mighty PWA
const CACHE_NAME = 'obmighty-v2';
const ASSET_CACHE = 'obmighty-assets-v1';

// Install event
self.addEventListener('install', (event) => {
  console.log('[ServiceWorker] Installing...');
  self.skipWaiting();
});

// Activate event
self.addEventListener('activate', (event) => {
  console.log('[ServiceWorker] Activating...');
  // Clean up old caches
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME && cacheName !== ASSET_CACHE) {
            console.log('[ServiceWorker] Removing old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch event - handle manifest and asset caching
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // 1. Let manifest fall through to default strategy (static fetch)
  if (url.pathname.endsWith('/manifest.webmanifest')) {
    return;
  }

  // 2. Network-first strategy for branding assets (logos), fallback to cache
  if (url.pathname.includes('/storage/logos/') || url.pathname.includes('/api/images/')) {
    event.respondWith(
      fetch(request.clone())
        .then((response) => {
          if (response && response.status === 200) {
            const cacheCopy = response.clone();
            caches.open(ASSET_CACHE).then((cache) => {
              cache.put(request, cacheCopy);
            });
          }
          return response;
        })
        .catch(() => caches.match(request))
    );
    return;
  }

  // 3. Default Cache-first strategy for other static assets
  event.respondWith(
    caches.match(request).then((response) => {
      return response || fetch(request).catch(() => {
        // Silent fail for non-critical assets
      });
    })
  );
});

// Dynamic Manifest Handling
async function getDynamicManifest(request) {
  try {
    // Try to get stored branded manifest from IndexedDB
    const manifestData = await getStoredManifestData();

    if (manifestData) {
      console.log('[SW] Serving manifest from IndexedDB');
      return new Response(JSON.stringify(manifestData), {
        headers: { 'Content-Type': 'application/manifest+json' }
      });
    }
  } catch (error) {
    console.error('[SW] Error getting dynamic manifest:', error);
  }

  // Fallback to network fetch if manifest data isn't in DB yet
  console.log('[SW] Manifest not in DB, fetching from network');
  try {
    const response = await fetch(request.clone());
    if (response && response.ok) {
      console.log('[SW] Network fetch successful for manifest');
      return response;
    }
  } catch (error) {
    console.error('[SW] Network fetch failed for manifest:', error);
  }

  // If all else fails, return a minimal valid manifest
  console.log('[SW] Returning fallback manifest');
  return new Response(JSON.stringify({
    id: 'default_system',
    name: 'Management System',
    short_name: 'Management',
    display: 'standalone',
    start_url: '/',
    scope: '/'
  }), {
    headers: { 'Content-Type': 'application/manifest+json' }
  });
}

// IndexedDB Access
function getStoredManifestData() {
  return new Promise((resolve) => {
    const request = indexedDB.open('obmighty', 1);
    request.onsuccess = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains('manifest')) {
        resolve(null);
        return;
      }
      const transaction = db.transaction('manifest', 'readonly');
      const getReq = transaction.objectStore('manifest').get('company');
      getReq.onsuccess = () => resolve(getReq.result || null);
      getReq.onerror = () => resolve(null);
    };
    request.onerror = () => resolve(null);
    request.onupgradeneeded = (event) => {
      event.target.result.createObjectStore('manifest');
    };
  });
}

// Client Messages
self.addEventListener('message', (event) => {
  if (!event.data) return;

  if (event.data.type === 'UPDATE_MANIFEST') {
    saveManifestData(event.data.manifest);
  }

  if (event.data.type === 'PRECACHE_ASSETS') {
    const assets = event.data.assets || [];
    caches.open(ASSET_CACHE).then((cache) => {
      cache.addAll(assets).catch(err => console.error('[SW] Precache failed:', err));
    });
  }
});

function saveManifestData(manifest) {
  const request = indexedDB.open('obmighty', 1);
  request.onsuccess = (event) => {
    const db = event.target.result;
    const transaction = db.transaction('manifest', 'readwrite');
    transaction.objectStore('manifest').put(manifest, 'company');
  };
}
