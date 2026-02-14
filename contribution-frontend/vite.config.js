import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      // No static manifest or icons; dynamic manifest is handled by backend/service worker
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
        runtimeCaching: [
          {
            urlPattern: /^https?:\/\/.*\/api\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-cache',
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 300
              }
            }
          }
        ]
      }
    })
  ],
  server: {
    host: '0.0.0.0', // Listen on all addresses (needed for custom domains)
    allowedHosts: true, // Allow all hosts for multi-tenant dev
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:8001', // Updated to match your backend port
        changeOrigin: false,
        secure: false,
      },
      '/storage': {
        target: 'http://localhost:8001',
        changeOrigin: false,
        secure: false,
      }
    }
  }
})
