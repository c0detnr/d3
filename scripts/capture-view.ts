import { createServer } from 'vite';
import { launch, waitFor } from './reel/cdp.ts';
import { mkdirSync, writeFileSync } from 'node:fs';

const out = '/tmp/claude-1000/-home-mami-Projects-d3/cb1546d2-8374-477c-a967-ec86bbf0f9d4/scratchpad';
mkdirSync(out, { recursive: true });

const server = await createServer({ configFile: './vite.map.config.ts', server: { port: 5188, host: '127.0.0.1' } });
await server.listen();
const page = await launch(1440, 960, ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader']);
try {
  await page.send('Page.navigate', { url: 'http://127.0.0.1:5188/map-preview.html' });
  await waitFor(page, 'document.querySelector("#status")?.hidden && window.__missionTest', 30000, 'ready');
  // Wait a few frames for rendering
  await new Promise(r => setTimeout(r, 2000));
  const shot = await page.send('Page.captureScreenshot', { format: 'png' });
  writeFileSync(`${out}/test_view.png`, Buffer.from(shot.data, 'base64'));
  console.log('Saved test_view.png');
} finally {
  await page.close();
  await server.close();
}
