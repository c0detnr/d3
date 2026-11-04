import { defineConfig } from 'vite';
import { studioPlugin } from './scripts/studio-plugin.ts';
export default defineConfig({
  server: { host: '127.0.0.1' },
  plugins: [studioPlugin()],
  build: {
    outDir: 'dist-map',
    assetsInlineLimit: 0,
    rollupOptions: { input: ['index.html', 'map-preview.html', 'lan-duel.html'] },
  },
});
