import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import { copyFileSync } from 'node:fs'

// GitHub Pages serves 404.html for unknown paths: make it the app so /shop/... deep links work
const spa404 = () => ({ name: 'spa-404', closeBundle() { try { copyFileSync('dist/index.html', 'dist/404.html') } catch { /* first build */ } } })

export default defineConfig({
  base: '/brick-shop/',
  plugins: [
    react(),
    spa404(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon-192.png', 'icon-512.png', 'icon-maskable-512.png', 'joey-head.webp', 'joey/*.webp'],
      manifest: {
        id: '/brick-shop/',
        name: 'BRICK Shop · מלאי',
        short_name: 'BRICK',
        description: 'ניהול מלאי BRICK Shop',
        lang: 'he',
        dir: 'rtl',
        start_url: '/brick-shop/',
        scope: '/brick-shop/',
        display: 'standalone',
        background_color: '#FAF8F4',
        theme_color: '#F5B81C',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: 'icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
        ]
      },
      workbox: {
        navigateFallback: '/brick-shop/index.html',
        globPatterns: ['**/*.{js,css,html,png,webp,svg,woff2}'],
        runtimeCaching: [
          { urlPattern: /^https:\/\/fzznhlitvigvsxhkhvwf\.supabase\.co\/storage\/v1\/object\/public\/bs-assets\/joey\/keyed\/.*/i, handler: 'CacheFirst', options: { cacheName: 'bs-assets', expiration: { maxEntries: 60, maxAgeSeconds: 60 * 60 * 24 * 30 } } },
          { urlPattern: /^https:\/\/images\.brickset\.com\/.*/i, handler: 'CacheFirst', options: { cacheName: 'brickset-images', expiration: { maxEntries: 2000, maxAgeSeconds: 60 * 60 * 24 * 90 } } },
          { urlPattern: /^https:\/\/fonts\.(googleapis|gstatic)\.com\/.*/i, handler: 'StaleWhileRevalidate', options: { cacheName: 'fonts' } }
        ]
      }
    })
  ]
})
