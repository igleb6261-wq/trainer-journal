import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

// Приложение публикуется на GitHub Pages по адресу /trainer-journal/
const version = new Date().toISOString().slice(0, 16).replace('T', ' ')

export default defineConfig({
  base: '/trainer-journal/',
  define: { __APP_VERSION__: JSON.stringify(version) },
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon.svg', 'apple-touch-icon.png'],
      manifest: {
        name: 'Журнал тренера',
        short_name: 'Журнал',
        description: 'Клиенты, тренировки, замеры и фото — локально на телефоне',
        lang: 'ru',
        start_url: '/trainer-journal/',
        scope: '/trainer-journal/',
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#0f1115',
        theme_color: '#0f1115',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
        navigateFallback: '/trainer-journal/index.html',
      },
    }),
  ],
})
