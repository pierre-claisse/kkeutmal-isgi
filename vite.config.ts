import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

// En déploiement GitHub Pages, l'app est servie sous /kkeutmal-isgi/.
// En dev local et preview, on garde la racine.
const isPages = process.env.GITHUB_PAGES === 'true';

export default defineConfig({
  base: isPages ? '/kkeutmal-isgi/' : '/',
  plugins: [
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      manifest: {
        name: '끝말잇기',
        short_name: '끝말',
        description: 'Jeu de 끝말잇기 (word chain coréen) — PWA',
        lang: 'ko',
        theme_color: '#000000',
        background_color: '#000000',
        display: 'standalone',
        orientation: 'any',
        start_url: '.',
        scope: '.',
        icons: [
          {
            src: 'icons/icon.svg',
            sizes: 'any',
            type: 'image/svg+xml',
            purpose: 'any maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,json,woff2,png,svg}'],
        maximumFileSizeToCacheInBytes: 6 * 1024 * 1024,
      },
    }),
  ],
  build: {
    target: 'es2022',
    sourcemap: false,
  },
});
