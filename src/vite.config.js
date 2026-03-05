import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: './',
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    target: 'chrome120',   // Electron 28 usa Chrome 120
    minify: 'esbuild',
    cssMinify: true,
    reportCompressedSize: false,
    // Nessun manualChunks: in Electron tutto gira locale, il code splitting non aiuta
  },
  server: { port: 5173 },
});
