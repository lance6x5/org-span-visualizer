import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

// Strict Content-Security-Policy injected into production builds only (the dev
// server needs inline scripts/websockets for HMR). connect-src 'self' means the
// page physically cannot send data to any other origin.
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
  plugins: [
    react(),
    cspPlugin,
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon.svg', 'icon-maskable.svg'],
      manifest: {
        name: 'Org Span-of-Control Visualizer',
        short_name: 'Span Viz',
        description: 'Interactive org chart that flags spans of control. Your file never leaves this browser.',
        theme_color: '#1f6feb',
        background_color: '#ffffff',
        display: 'standalone',
        start_url: '/org-span-visualizer/',
        scope: '/org-span-visualizer/',
        icons: [
          { src: 'icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
          { src: 'icon-maskable.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'maskable' }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,webmanifest}']
      }
    })
  ],
  test: {
    environment: 'node',
    include: ['test/**/*.test.js']
  }
});
