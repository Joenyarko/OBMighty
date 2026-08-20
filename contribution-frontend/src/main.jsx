import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import { TenantProvider } from './context/TenantContext.jsx'

// Register service worker for PWA with automatic update check
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js').then(
    (registration) => {
      console.log('[PWA] Service Worker registered successfully');

      // Check for updates on every app launch / page load
      registration.update();

      // Check for updates periodically (every 30 minutes)
      setInterval(() => {
        registration.update();
      }, 30 * 60 * 1000);

      // Auto-reload when new service worker takes over
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        console.log('[PWA] New version activated, reloading...');
      });
    },
    (error) => {
      console.error('[PWA] Service Worker registration failed:', error);
    }
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
        <TenantProvider>
            <App />
        </TenantProvider>
    </React.StrictMode>,
)
