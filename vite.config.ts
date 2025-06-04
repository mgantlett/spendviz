import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  base: './', // Ensures correct asset loading in Electron production
  plugins: [react()],
  server: {
    proxy: {
      '/api': 'http://localhost:5174',
    },
    watch: {
      ignored: [
        '**/spendviz.sqlite3',
        '**/spendviz.sqlite3-wal',
        '**/spendviz.sqlite3-shm',
        '**/spendviz.test.sqlite3',
        '**/spendviz.test.sqlite3-shm',
        '**/spendviz.test.sqlite3-wal',
        '**/spendviz.multi-user.sqlite3',
        '**/spendviz.multi-user.sqlite3-wal',
        '**/spendviz.multi-user.sqlite3-shm'
      ]
    }
  }
})
