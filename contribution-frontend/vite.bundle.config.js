// vite-plugin-bundle-analyzer.config.js
// Configuration for analyzing and optimizing frontend bundle size

import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { visualizer } from 'rollup-plugin-visualizer';

export default defineConfig({
  plugins: [
    react(),
    visualizer({
      open: true,
      gzipSize: true,
      brotliSize: true,
      filename: 'dist/stats.html',
    }),
  ],
  build: {
    rollupOptions: {
      output: {
        // Code splitting strategy for optimal chunk sizes
        manualChunks: {
          // Vendor libraries
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          'vendor-ui': ['lucide-react'],
          'vendor-http': ['axios'],
          
          // Feature-specific chunks
          'chunk-dashboard': [
            './src/pages/CompanyDashboard.jsx',
            './src/components/CompanyDashboard.jsx',
          ],
          'chunk-reports': [
            './src/pages/EnhancedReports.jsx',
            './src/components/EnhancedReports.jsx',
          ],
          'chunk-settings': [
            './src/pages/CompanySettings.jsx',
            './src/components/CompanySettings.jsx',
          ],
          'chunk-offline': [
            './src/components/OfflineIndicator.jsx',
            './src/utils/offlineQueueManager.js',
          ],
        },
      },
    },
    // Minify and compress
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
      },
      output: {
        comments: false,
      },
    },
    // Increase chunk size warning threshold
    chunkSizeWarningLimit: 500,
    
    // Source maps only in production for debugging
    sourcemap: process.env.NODE_ENV === 'production',
  },
  
  // Optimization settings
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react-router-dom',
      'axios',
      'lucide-react',
    ],
    exclude: ['@vite/preload-helper'],
  },
});
