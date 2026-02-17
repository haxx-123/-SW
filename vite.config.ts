import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import compression from 'vite-plugin-compression';
import { visualizer } from 'rollup-plugin-visualizer';

export default defineConfig({
  plugins: [
    react(),
    // 1. Compression Strategy: Gzip for compatibility
    compression({
      algorithm: 'gzip',
      ext: '.gz',
      threshold: 10240, // Compress files larger than 10KB
      deleteOriginFile: false,
      verbose: true
    }),
    // 2. Compression Strategy: Brotli for better compression ratio (modern browsers)
    compression({
      algorithm: 'brotliCompress',
      ext: '.br',
      threshold: 10240,
      deleteOriginFile: false,
      verbose: true
    }),
    // 3. Bundle Analysis: Generates stats.html to visualize dependency sizes
    visualizer({
      open: true, // Automatically open the report after build
      gzipSize: true,
      brotliSize: true,
      filename: 'stats.html'
    })
  ],
  build: {
    // Optimization: Manual Chunks to split vendor code
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom'],
          'recharts-vendor': ['recharts'],
          'utils-vendor': ['lucide-react', 'html2canvas']
        }
      }
    },
    chunkSizeWarningLimit: 500,
    reportCompressedSize: true
  }
});