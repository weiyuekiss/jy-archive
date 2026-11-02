import { VitePWA } from 'vite-plugin-pwa'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath, URL } from 'node:url'

export default defineConfig(({ command }) => ({
  base: command === 'serve' ? '/' : '/jy-archive/',
  plugins: [
    vue(),
    VitePWA({
      registerType: 'prompt',
      includeAssets: ['favicon.svg', 'apple-touch-icon.png'],
      manifest: {
        id: '/jy-archive/',
        name: 'JY Archive',
        short_name: 'JY Archive',
        description: '把日常，慢慢收进来。',
        lang: 'zh-CN',
        start_url: '/jy-archive/',
        scope: '/jy-archive/',
        display: 'standalone',
        orientation: 'portrait',
        theme_color: '#ffffff',
        background_color: '#f7f8fa',
        icons: [
          { src: '/jy-archive/pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: '/jy-archive/pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          { src: '/jy-archive/pwa-maskable-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
        ]
      },
      workbox: {
        navigateFallback: 'index.html',
        navigateFallbackDenylist: [/^\/chat\/completions(?:\/|$)/],
        globPatterns: ['**/*.{js,css,html,svg,png,ico,webmanifest}'],
        additionalManifestEntries: [{ url: 'offline.html', revision: null }],
        navigateFallbackAllowlist: [/^(?!\/chat\/completions(?:\/|$)).*/],
        runtimeCaching: [
          {
            urlPattern: ({ request }) => request.destination === 'image',
            handler: 'StaleWhileRevalidate',
            options: { cacheName: 'jy-images', expiration: { maxEntries: 80, maxAgeSeconds: 2592000 } }
          }
        ]
      }
    })
  ],
  server: {
    port: 5173,
    host: true
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    }
  }
}))
