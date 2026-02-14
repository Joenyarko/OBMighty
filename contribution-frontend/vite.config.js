import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['logo.jpeg', 'Neziz-logo2.png'],
      manifest: {
        name: 'Management System',
        short_name: 'System',
        description: 'Business management and finance system',
        theme_color: '#4F46E5',
        background_color: '#ffffff',
        display: 'standalone',
        start_url: '/',
        icons: [
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
        ]
      },
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
