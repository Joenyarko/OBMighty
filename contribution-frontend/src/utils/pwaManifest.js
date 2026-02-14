/**
 * Utility to update PWA manifest data in service worker
 * This ensures iOS and other devices get the correct company branding
 */

export async function updatePWAManifest(companyData) {
  if (!companyData) return;

  try {
    // Build the manifest object
    const manifest = {
      name: companyData.name ? `${companyData.name} - Contribution Manager` : 'Contribution Manager',
      short_name: companyData.name ? companyData.name.substring(0, 12) : 'Contribution',
      description: companyData.name ? `${companyData.name} contribution and finance management system` : 'Manage contributions and finances',
      start_url: '/',
      scope: '/',
      display: 'standalone',
      orientation: 'portrait-or-landscape',
      theme_color: companyData.primary_color || '#4F46E5',
      background_color: '#ffffff',
      icons: companyData.logo_url
        ? [
          {
            src: companyData.logo_url,
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: companyData.logo_url,
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any'
          }
        ]
        : [
          {
            src: '/logo.jpeg',
            sizes: '192x192',
            type: 'image/jpeg',
            purpose: 'any'
          },
          {
            src: '/logo.jpeg',
            sizes: '512x512',
            type: 'image/jpeg',
            purpose: 'any'
          }
        ],
      company: companyData
    };

    // Wait for service worker controller if not present
    function sendManifestToSW() {
      // 1. Update static tags immediately (faster for iOS)
      if (companyData.logo_url) {
        const appleIcon = document.getElementById('apple-touch-icon');
        if (appleIcon) appleIcon.href = companyData.logo_url;
      }

      const manifestLink = document.getElementById('manifest-link');
      if (manifestLink) {
        // Use the authenticated API endpoint directly - more reliable for iOS Safari
        manifestLink.href = '/api/manifest';
      }

      // 2. Sync with Service Worker for background updates
      if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage({
          type: 'UPDATE_MANIFEST',
          manifest: manifest
        });
        console.log('[PWA] Manifest synced with Service Worker:', companyData.name);
      } else if ('serviceWorker' in navigator) {
        // If no controller yet, wait for it or just rely on the /api/manifest link we set above
        navigator.serviceWorker.ready.then((registration) => {
          if (registration.active) {
            registration.active.postMessage({
              type: 'UPDATE_MANIFEST',
              manifest: manifest
            });
          }
        });
        console.log('[PWA] Static tags updated, waiting for Service Worker controller...');
      }
    }
    sendManifestToSW();
  } catch (error) {
    console.error('[PWA] Error updating manifest:', error);
  }
}

/**
 * Reset PWA manifest to default when user logs out
 */
export function resetPWAManifest() {
  try {
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({
        type: 'UPDATE_MANIFEST',
        manifest: null
      });
    }

    const manifestLink = document.getElementById('manifest-link');
    if (manifestLink) {
      manifestLink.href = '/manifest.json';
    }

    const appleIcon = document.getElementById('apple-touch-icon');
    if (appleIcon) {
      appleIcon.href = '/logo.jpeg';
    }

    console.log('[PWA] Manifest reset to default');
  } catch (error) {
    console.error('[PWA] Error resetting manifest:', error);
  }
}
