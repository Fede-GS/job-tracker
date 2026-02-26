import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      // Dev only: proxy /api calls to the local Flask backend
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: 'dist',
    // Generate a _redirects file for SPA routing on Render / Netlify
    rollupOptions: {
      output: {
        manualChunks: undefined,
      },
    },
  },
})
