import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import tailwindcss from '@tailwindcss/vite'
import { resolve } from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'mask-icon.svg', 'sitemap.xml', 'robots.txt', 'llms.txt', 'og-image.png'],
      manifest: {
        name: 'ZIPDoco',
        short_name: 'ZIPDoco',
        description: 'Safe intake tool for untrusted archives',
        theme_color: '#EEF0EC',
        background_color: '#EEF0EC',
        display: 'standalone',
        file_handlers: [
          {
            action: '/app/',
            accept: {
              'application/zip': ['.zip'],
              'application/x-rar-compressed': ['.rar'],
              'application/x-7z-compressed': ['.7z'],
              'application/x-tar': ['.tar'],
              'application/gzip': ['.gz', '.tgz'],
              'application/x-bzip2': ['.bz2'],
              'application/x-xz': ['.xz']
            }
          }
        ],
        share_target: {
          action: '/app/share-target',
          method: 'POST',
          enctype: 'multipart/form-data',
          params: {
            files: [
              {
                name: 'archive',
                accept: [
                  '.zip',
                  '.rar',
                  '.7z',
                  '.tar',
                  '.gz',
                  '.tgz',
                  '.bz2',
                  '.xz',
                  'application/zip',
                  'application/x-rar-compressed',
                  'application/x-7z-compressed',
                  'application/x-tar',
                  'application/gzip',
                  'application/x-bzip2',
                  'application/x-xz'
                ]
              }
            ]
          }
        },
        icons: [
          {
            src: 'pwa-64x64.png',
            sizes: '64x64',
            type: 'image/png'
          },
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: 'maskable-icon-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable'
          }
        ]
      }
    })
  ],
  build: {
    rollupOptions: {
      input: {
        main: resolve(import.meta.dirname, 'index.html'),
        app: resolve(import.meta.dirname, 'app/index.html'),
        faq: resolve(import.meta.dirname, 'faq/index.html'),
        blog: resolve(import.meta.dirname, 'blog/index.html'),
        privacy: resolve(import.meta.dirname, 'privacy/index.html'),
        terms: resolve(import.meta.dirname, 'terms/index.html'),
      }
    }
  }
})
