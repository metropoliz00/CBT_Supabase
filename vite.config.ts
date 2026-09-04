import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 3000,
    proxy: {
      '/api/supabase': {
        target: process.env.VITE_SUPABASE_URL || 'https://uudpcksekqbpqccisowl.supabase.co',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/supabase/, ''),
      },
    },
  },
  build: {
    chunkSizeWarningLimit: 1600,
  },
})