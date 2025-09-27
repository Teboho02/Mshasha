import { defineConfig } from 'vite'
import { resolve } from 'path'

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        portfolio: resolve(__dirname, 'portfolio-gallery.html'),
        admin: resolve(__dirname, 'admin.html')
      }
    }
  },
  // Optional: Configure dev server for multi-page development
  server: {
    open: '/index.html' // Default page to open in development
  }
})