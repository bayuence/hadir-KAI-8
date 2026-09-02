import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate', // Langsung update otomatis tanpa perlu copot aplikasi
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,webp,jpg,jpeg}'],
        cleanupOutdatedCaches: true
      },
      manifest: {
        name: 'Hadir KAI 8',
        short_name: 'Hadir KAI 8',
        description: 'Sistem Presensi Digital Magang PT KAI Daop 8',
        theme_color: '#ffffff',
        background_color: '#ffffff',
        display: 'standalone',
        icons: [
          {
            src: '/logo-kai.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: '/logo-kai.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable'
          }
        ]
      }
    })
  ],
  server: {
    port: 3000,
    open: true,
  },
})
