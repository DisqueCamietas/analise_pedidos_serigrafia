import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api/bling': {
        target: 'https://api.bling.com.br',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/bling/, '')
      }
    }
  }
})
