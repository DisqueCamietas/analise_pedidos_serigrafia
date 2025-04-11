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
        rewrite: (path) => path.replace(/^\/api\/bling/, ''),
        configure: (proxy, _options) => {
          proxy.on('error', (err, _req, _res) => {
            console.log('Erro no proxy:', err);
          });
          proxy.on('proxyReq', (proxyReq, req, _res) => {
            console.log('Enviando requisição para:', req.url);
          });
          proxy.on('proxyRes', (proxyRes, req, _res) => {
            console.log('Recebendo resposta para:', req.url, 'status:', proxyRes.statusCode);
          });
        }
      }
    }
  }
})
