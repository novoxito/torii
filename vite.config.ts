import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig(({ command }) => ({
  base: command === 'build' ? '/torii/' : '/',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      workbox: {
        globPatterns: ['**/*.{js,css,html,json,png,svg,woff2}'],
        maximumFileSizeToCacheInBytes: 6 * 1024 * 1024,
        runtimeCaching: [
          {
            // stroke-order SVGs from KanjiVG CDN
            urlPattern: /^https:\/\/cdn\.jsdelivr\.net\/.*\.svg$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'kanjivg',
              expiration: { maxEntries: 1000, maxAgeSeconds: 60 * 60 * 24 * 365 },
            },
          },
        ],
      },
      manifest: {
        name: 'Torii - Aprende japonés',
        short_name: 'Torii',
        description: 'Curso completo de japonés con repaso espaciado FSRS y tutor IA',
        lang: 'es',
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#141218',
        theme_color: '#141218',
        start_url: '/torii/',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
    }),
  ],
}))
