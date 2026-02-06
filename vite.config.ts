import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icons/*'],
      workbox: {
        skipWaiting: true,
        clientsClaim: true,
        navigateFallback: '/index.html',
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/api\./,
            handler: 'NetworkOnly',
          },
          {
            urlPattern: /\/api\//,
            handler: 'NetworkOnly',
          }
        ]
      },
      manifest: {
        name: 'TMT Vocab',
        short_name: 'TMT Vocab',
        description: 'TMT行业英语词汇学习工具',
        theme_color: '#1e40af',
        background_color: '#0f172a',
        display: 'standalone',
        orientation: 'portrait',
        scope: '/',
        start_url: '/',
        icons: [
          {
            src: '/icons/icon.svg',
            sizes: '512x512',
            type: 'image/svg+xml',
            purpose: 'any maskable'
          }
        ]
      }
    })
  ],
})
