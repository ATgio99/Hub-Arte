import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: './',
  build: { outDir: 'dist', chunkSizeWarningLimit: 2000 },
  server: {
    // Ignora la cartella ios/ (vecchi artefatti Capacitor) dal dependency scanning
    watch: {
      ignored: ['**/ios/**', '**/dist/**'],
    },
  },
  // Escludi ios/ dal file scanning di Vite
  optimizeDeps: {
    exclude: [],
    entries: ['src/main.tsx'],
  },
})
