import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const base = (env.VITE_API_BASE || 'http://localhost:8000').replace(/\/+$/, '')

  return {
    plugins: [react()],
    server: {
      proxy: {
        '/api': {
          target: base,
          changeOrigin: true,
          ws: true,
        },
      },
    },
  }
})
