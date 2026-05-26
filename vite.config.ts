import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig(({ mode }) => ({
  plugins: [react(), tailwindcss()],
  server: {
    port: 3006,
    host: '127.0.0.1',
    allowedHosts:
      mode === 'development' ? ['rentals.edub.fr', 'localhost'] : undefined,
    proxy: {
      '/api': 'http://localhost:3007',
    },
  },
  preview: {
    port: 4174,
    host: '127.0.0.1',
    proxy: {
      '/api': 'http://localhost:3007',
    },
  },
}))
