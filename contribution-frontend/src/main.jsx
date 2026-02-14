import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import { TenantProvider } from './context/TenantContext.jsx'

// Register service worker for PWA
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js').then(
    (registration) => {
      console.log('[PWA] Service Worker registered successfully');
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
