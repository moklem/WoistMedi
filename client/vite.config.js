import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'Wo ist Medi?',
        short_name: 'WoistMedi',
        description: 'Standort teilen auf der medi Meisterschaft 2026',
        theme_color: '#1a1a2e',
        background_color: '#0f0f1a',
        display: 'standalone',
        scope: '/',
        start_url: '/'
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,webp,jpg}'],
        runtimeCaching: [
          {
            urlPattern: /\/lageplan\.(jpg|png|webp|svg)$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'festival-map',
              expiration: { maxEntries: 3, maxAgeSeconds: 60 * 60 * 24 * 7 }
            }
          }
        ]
      }
    })
  ],
  server: {
    proxy: {
      '/api': 'http://localhost:3001',
      '/socket.io': { target: 'http://localhost:3001', ws: true }
    }
  }
});
