import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: true, // Чтобы работало в локальной сети
    proxy: {
      '/api': {
        target: 'http://localhost:3000', // <-- Адрес твоего сервера
        changeOrigin: true,
        secure: false,
      }
    }
  }
})