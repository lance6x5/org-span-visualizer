import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import { readFileSync } from 'node:fs';

const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8'));

// Strict Content-Security-Policy injected into production builds only (the dev
// server needs inline scripts/websockets for HMR). connect-src 'self' means the
// page physically cannot send data to any other origin. The in-app feedback
// links are ordinary <a target="_blank"> navigations to github.com, which CSP
// fetch directives do not govern, so no CSP change is needed for them. The same
// applies to the footer studio credit: its "Noncommercial license" and "More apps"
// links are plain navigations and its mark is a local file (img-src 'self').
const CSP =
  "default-src 'self'; img-src 'self' data: blob:; style-src 'self' 'unsafe-inline'; " +
  "script-src 'self'; connect-src 'self'; worker-src 'self'; manifest-src 'self'; " +
  "object-src 'none'; base-uri 'self'; form-action 'none'";

const cspPlugin = {
  name: 'inject-csp',
  apply: 'build',
  transformIndexHtml() {
    return [
      { tag: 'meta', attrs: { 'http-equiv': 'Content-Security-Policy', content: CSP }, injectTo: 'head-prepend' }
    ];
  }
};

// GitHub Pages serves the app from /org-span-visualizer/
export default defineConfig({
  base: '/org-span-visualizer/',
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version)
  },
  plugins: [
    react(),
    cspPlugin,
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon.svg', 'icon-maskable.svg', 'logo.svg', 'apple-touch-icon.png'],
      manifest: {
        name: 'Spanscope: Org Span-of-Control Analyzer',
        short_name: 'Spanscope',
        description: 'Spanscope: see every span of control at a glance. Interactive org chart that flags spans that are too wide or too narrow. Your file never leaves this browser.',
        theme_color: '#5b3fd6',
        background_color: '#ffffff',
        display: 'standalone',
        start_url: '/org-span-visualizer/',
        scope: '/org-span-visualizer/',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: 'icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
          { src: 'icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,webmanifest}']
      }
    })
  ],
  test: {
    environment: 'node',
    include: ['test/**/*.test.js']
  }
});
