import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'
import path from 'path'

export default defineConfig({
  server: {
    port: 3000,
  },
  resolve: {
    alias: {
      canvg: path.resolve('./src/utils/canvg-stub.js'),
      html2canvas: path.resolve('./src/utils/canvg-stub.js'),
      dompurify: path.resolve('./src/utils/canvg-stub.js'),
    },
  },
  build: {
    rollupOptions: {
      external: ['canvg', 'html2canvas', 'dompurify'],
    },
  },
  plugins: [
    tailwindcss(),
    react(),
    VitePWA({
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.js',
      registerType: 'autoUpdate',
      includeAssets: ['icon.svg', 'favicon.ico'],
      manifest: {
        name: 'WAY FIT — Sistema para Personal Trainers',
        short_name: 'WAY FIT',
        description: 'Gerencie seus alunos, treinos e finanças em um só lugar',
        theme_color: '#3B82F6',
        background_color: '#ffffff',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
        scope: '/',
        icons: [
          { src: '/icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any maskable' },
        ],
        screenshots: [
          { src: '/icon.svg', sizes: '512x512', type: 'image/svg+xml', form_factor: 'wide' },
        ],
      },
      injectManifest: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        maximumFileSizeToCacheInBytes: 3 * 1024 * 1024,
      },
      devOptions: { enabled: false },
    }),
  ],
})
