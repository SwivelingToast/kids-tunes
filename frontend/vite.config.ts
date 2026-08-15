import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon-32.png', 'apple-touch-icon.png', 'fonts/inter-latin-variable.woff2'],
      manifest: {
        name: 'Kids Jukebox',
        short_name: 'Jukebox',
        description: "A locked-down music jukebox for kids, backed by a parent's Spotify account.",
        start_url: '/',
        display: 'fullscreen',
        orientation: 'portrait',
        background_color: '#161826',
        theme_color: '#161826',
        icons: [
          { src: '/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: '/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // The font is self-hosted (see nocturne.css) and precached along
        // with the rest of the app's own assets by globPatterns below -
        // no runtime Google Fonts caching needed since nothing calls out
        // to Google's CDN anymore.
        globPatterns: ['**/*.{js,css,html,woff2,png,svg}'],
      },
    }),
  ],
})
