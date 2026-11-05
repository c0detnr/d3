import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { studioPlugin } from './scripts/studio-plugin.ts';
export default defineConfig({
  base: './',
  server: { host: '127.0.0.1' },
  plugins: [react(), tailwindcss(), studioPlugin()],
  build: {
    outDir: 'dist-map',
    assetsInlineLimit: 0,
    rollupOptions: { input: ['index.html', 'map-preview.html', 'lan-duel.html'] },
  },
});
