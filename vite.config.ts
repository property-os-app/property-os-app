import { fileURLToPath, URL } from 'node:url'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  // Big libraries in their own files: they change less often than our code, so browsers keep them cached across deploys.
  // Pages are split per route in src/app/router.tsx (lazy). Do not raise chunkSizeWarningLimit to hide a big chunk.
  build: {
    rolldownOptions: {
      output: {
        codeSplitting: {
          groups: [
            { name: 'firebase', test: /node_modules[\\/]@?firebase[\\/]/ },
            { name: 'react', test: /node_modules[\\/](react|react-dom|react-router|scheduler)[\\/]/ },
            { name: 'tanstack', test: /node_modules[\\/]@tanstack[\\/]/ },
            { name: 'forms', test: /node_modules[\\/](react-hook-form|@hookform|zod)[\\/]/ },
          ],
        },
      },
    },
  },
  // Backend CORS only allows http://localhost:5173, so never fall back to another port.
  server: {
    port: 5173,
    strictPort: true,
  },
})
