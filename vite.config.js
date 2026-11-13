import { VitePWA } from 'vite-plugin-pwa'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath, URL } from 'node:url'
import { execFileSync } from 'node:child_process'

function getGitRevision() {
  try {
    return execFileSync('git', ['rev-parse', '--short=8', 'HEAD'], { encoding: 'utf8' }).trim()
  } catch {
    return 'local'
  }
}

export default defineConfig(() => {
  // Root deployment by default; GitHub Pages supplies its repository subpath.
  const configuredBase = process.env.VITE_BASE_PATH || '/'
  const base = `/${configuredBase.split('/').filter(Boolean).join('/')}${configuredBase.split('/').filter(Boolean).length ? '/' : ''}`
  return ({
  define: {
    __APP_VERSION__: JSON.stringify(`${process.env.npm_package_version || '0.1.0'}+${getGitRevision()}`),
    __APP_BUILD_TIME__: JSON.stringify(new Date().toISOString())
  },
  base,
  plugins: [
    vue(),
    VitePWA({
      registerType: 'prompt',
      includeAssets: ['favicon.svg', 'apple-touch-icon.png'],
      manifest: {
        id: base,
        name: 'JY Archive',
        short_name: 'JY Archive',
        description: '把日常，慢慢收进来。',
        lang: 'zh-CN',
        start_url: base,
        scope: base,
        display: 'standalone',
        orientation: 'portrait',
        theme_color: '#ffffff',
        background_color: '#f7f8fa',
        icons: [
          { src: `${base}favicon.svg`, sizes: 'any', type: 'image/svg+xml' }
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
  })
})
