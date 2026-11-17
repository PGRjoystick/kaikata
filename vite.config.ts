import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { VitePWA } from 'vite-plugin-pwa'
import { thirdPartyNotices } from './scripts/notices-plugin.ts'
import pkg from './package.json' with { type: 'json' }

export default defineConfig({
  base: './',
  define: { __APP_VERSION__: JSON.stringify(pkg.version) },
  plugins: [
    vue(),
    thirdPartyNotices(import.meta.dirname),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon.svg'],
      manifest: {
        name: 'Kaikata',
        short_name: 'Kaikata',
        description: 'Practice writing Japanese by hand.',
        lang: 'en',
        start_url: '.',
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#f4eee2',
        theme_color: '#b93a2b',
        icons: [
          { src: 'icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
          { src: 'icon-maskable.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'maskable' },
        ],
      },
    }),
  ],
})
