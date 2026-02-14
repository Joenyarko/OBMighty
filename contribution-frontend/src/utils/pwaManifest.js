/**
 * Utility to update PWA manifest data in service worker
 * This ensures iOS and other devices get the correct company branding
 */

export async function updatePWAManifest(companyData) {
  if (!companyData) return;

  try {
    const companyName = companyData.name || 'Management System';

    // Build the manifest object dynamically
    const manifest = {
      name: companyName,
      short_name: companyName.substring(0, 12),
      description: `${companyName} management system`,
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
        : [],
      company: companyData
    };

    // Update static tags and Service Worker
    function syncBranding() {
      // 1. Update static tags (iOS Icons/Title)
      if (companyData.logo_url) {
        const appleIcon = document.getElementById('apple-touch-icon');
        if (appleIcon) appleIcon.href = companyData.logo_url;
      }

      const appleTitle = document.getElementById('apple-app-title');
      if (appleTitle) appleTitle.content = companyName;

      const manifestLink = document.getElementById('manifest-link');
      if (manifestLink) {
        const manifestUrl = `/api/pwa-manifest/${companyData.id}`;
        manifestLink.href = manifestUrl;
      }

      // 2. Sync with Service Worker for Offline support
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.ready.then((registration) => {
          if (registration.active) {
            // Send manifest data to store in SW (IndexedDB)
            registration.active.postMessage({
              type: 'UPDATE_MANIFEST',
              manifest: manifest
            });

            // Pre-cache the logo for offline use
            if (companyData.logo_url) {
              registration.active.postMessage({
                type: 'PRECACHE_ASSETS',
                assets: [companyData.logo_url]
              });
            }
          }
        });
      }
    }
    syncBranding();
  } catch (error) {
    console.error('[PWA] Error updating branding:', error);
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
    if (manifestLink) manifestLink.href = '/manifest.json';

    const appleIcon = document.getElementById('apple-touch-icon');
    if (appleIcon) appleIcon.href = '/logo.jpeg';

    const appleTitle = document.getElementById('apple-app-title');
    if (appleTitle) appleTitle.content = 'Management System';

    console.log('[PWA] Branding reset to default');
  } catch (error) {
    console.error('[PWA] Error resetting branding:', error);
  }
}
