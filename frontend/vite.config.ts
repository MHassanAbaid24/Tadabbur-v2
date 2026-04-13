import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'Tadabbur',
        short_name: 'Tadabbur',
        description: 'Read. Reflect. Grow Together.',
        theme_color: '#1A6B4A',
        background_color: '#FDFAF2',
        display: 'standalone',
      },
    }),
  ],
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
    },
  },
})
