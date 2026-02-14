// Service Worker for O.B. Mighty PWA
const CACHE_NAME = 'obmighty-v1';
const MANIFEST_KEY = 'pwa_manifest_data';

// Install event
self.addEventListener('install', (event) => {
  console.log('[ServiceWorker] Installing...');
  self.skipWaiting();
});

// Activate event
self.addEventListener('activate', (event) => {
  console.log('[ServiceWorker] Activating...');
  self.clients.claim();
});

// Fetch event - handle manifest requests dynamically
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Intercept manifest.json requests and serve dynamic manifest
  if (url.pathname === '/manifest.json' || url.pathname.endsWith('/manifest.json')) {
    event.respondWith(getManifest());
    return;
  }

  // For other requests, use default fetch
  event.respondWith(
    caches.match(request).then((response) => {
      return response || fetch(request).catch((error) => {
        console.error('Fetch error:', error);
      });
    })
  );
});

// Get dynamic manifest based on stored company data
async function getManifest() {
  try {
    // Try to get company data from IndexedDB or localStorage
    const manifestData = await getStoredManifestData();
    
    if (manifestData && manifestData.company) {
      // Return company-specific manifest
      return new Response(
        JSON.stringify(manifestData),
        {
          headers: {
            'Content-Type': 'application/manifest+json',
            'Cache-Control': 'no-cache'
          }
        }
      );
    }
  } catch (error) {
    console.error('Error getting stored manifest:', error);
  }

  // Fallback to default manifest
  return fetch('/manifest.json');
}

// Get stored manifest data from IndexedDB
function getStoredManifestData() {
  return new Promise((resolve) => {
    const request = indexedDB.open('obmighty', 1);

    request.onerror = () => {
      console.error('IndexedDB error');
      resolve(null);
    };

    request.onsuccess = (event) => {
      const db = event.target.result;
      const transaction = db.transaction('manifest', 'readonly');
      const objectStore = transaction.objectStore('manifest');
      const getRequest = objectStore.get('company');

      getRequest.onsuccess = () => {
        resolve(getRequest.result || null);
      };

      getRequest.onerror = () => {
        resolve(null);
      };
    };

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains('manifest')) {
        db.createObjectStore('manifest');
      }
    };
  });
}

// Listen for messages from the client to update manifest
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'UPDATE_MANIFEST') {
    saveManifestData(event.data.manifest);
  }
});

// Save manifest data to IndexedDB
function saveManifestData(manifest) {
  const request = indexedDB.open('obmighty', 1);

  request.onsuccess = (event) => {
    const db = event.target.result;
    const transaction = db.transaction('manifest', 'readwrite');
    const objectStore = transaction.objectStore('manifest');
    objectStore.put(manifest, 'company');
  };
}
