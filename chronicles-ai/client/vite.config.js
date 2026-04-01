import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 5000,
    allowedHosts: true,
    proxy: {
      '/chat': { target: 'http://localhost:8000', changeOrigin: true },
      '/tts': { target: 'http://localhost:8000', changeOrigin: true },
      '/evaluate': { target: 'http://localhost:8000', changeOrigin: true },
      '/transcribe': { target: 'http://localhost:8000', changeOrigin: true },
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, '')
      }
    }
  }
})
