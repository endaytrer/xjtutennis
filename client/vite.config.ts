import { reactRouter } from "@react-router/dev/vite";
import { defineConfig } from 'vite'

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
  plugins: [reactRouter()],
})
