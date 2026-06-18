import { defineConfig } from 'vite';

export default defineConfig({
  // The project root (where index.html lives)
  root: '.',

  // Dev server settings
  server: {
    port: 4000,
    host: 'localhost',
    open: true,           // Auto-open the browser on start
    strictPort: true,     // Fail loudly if port 4000 is busy
  },

  // Build settings (for production bundle)
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },

  // Make uPlot assets resolve correctly
  optimizeDeps: {
    include: ['uplot'],
  },
});
