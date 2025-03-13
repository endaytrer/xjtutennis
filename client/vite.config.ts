import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  server: {
    proxy: {
      "/api": {
        target: "http://localhost:25571",
        changeOrigin: true,
      }
    }
  },
  plugins: [react()],
})
