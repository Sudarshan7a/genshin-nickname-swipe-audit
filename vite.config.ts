import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:3000'
    }
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      // Vendor code loads from CDN (import map in index.html): the tunnel
      // drops single responses much above ~30KB, and react-dom alone is
      // bigger than that. App code stays local and tiny.
      external: [/^react($|\/)/, /^react-dom($|\/)/, /^framer-motion$/],
      output: {
        // Keep the local app chunk small for the same reason.
        manualChunks: undefined,
      },
    },
  }
});
