import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon.svg', 'apple-touch-icon.png'],
      manifest: {
        name: 'Bookshelf',
        short_name: 'Bookshelf',
        description: 'A personal media tracker styled as an ornate old library',
        theme_color: '#130c08',
        background_color: '#130c08',
        display: 'standalone',
        orientation: 'portrait',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: { globPatterns: ['**/*.{js,css,html,woff2,png,svg}'], maximumFileSizeToCacheInBytes: 4 * 1024 * 1024 },
    }),
  ],
  server: { host: true, port: 5173 },     // host: true so the iPhone can open it over the LAN
});
