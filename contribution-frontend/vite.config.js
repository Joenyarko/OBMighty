import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [
    react()
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
