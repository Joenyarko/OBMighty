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
      icons: [
        {
          src: companyData.logo_url || '/logo.jpeg',
          sizes: '192x192',
          type: (companyData.logo_url && companyData.logo_url.endsWith('.png')) ? 'image/png' : 'image/jpeg',
          purpose: 'any'
        },
        {
          src: companyData.logo_url || '/logo.jpeg',
          sizes: '512x512',
          type: (companyData.logo_url && companyData.logo_url.endsWith('.png')) ? 'image/png' : 'image/jpeg',
          purpose: 'any'
        }
      ],
      company: companyData
    };

    // Update static tags and Service Worker
    function syncBranding() {
      // 1. Update static tags (iOS Icons/Title/Favicon)
      if (companyData.logo_url) {
        const appleIcon = document.getElementById('apple-touch-icon');
        if (appleIcon) appleIcon.href = companyData.logo_url;

        // Also update the standard favicon
        const favicon = document.querySelector('link[rel="icon"]');
        if (favicon) favicon.href = companyData.logo_url;
      }

      const appleTitle = document.getElementById('apple-app-title');
      if (appleTitle) appleTitle.content = companyData.name;
      document.title = `${companyData.name} - Contribution Manager`;

      // 2. Swapping manifest link (only if needed or to force re-fetch)
      // Since backend now brands /manifest.json automatically, we only touch this if we want to bypass caching
      const manifestLink = document.getElementById('manifest-link');
      if (manifestLink) {
        manifestLink.href = `/api/manifest.json?v=${companyData.id || 'default'}`;
      }

      // 2. Sync with Service Worker for Offline support
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.getRegistrations().then(registrations => {
          registrations.forEach(registration => registration.update());
        });

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
