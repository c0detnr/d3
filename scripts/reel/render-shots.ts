import { existsSync, readFileSync } from 'node:fs';
import { basename } from 'node:path';
import { launch, waitFor, type Page } from './cdp.ts';
import { buildTake, type DriveSegment } from './takes.ts';

/**
 * Renders every shot of a reel episode through the live studio page in headless Chromium.
 * Needs the studio dev server: `npx vite --config vite.map.config.ts --port 5199`.
 * Usage: node --experimental-strip-types scripts/reel/render-shots.ts <episode.json> [shotId…] [--draft]
 */
export interface Shot {
  id: string; camera: string; fov?: number;
  /** 1 = normal, 2 = 0.5×, 4 = 0.25× slow motion. */
  slow?: number;
  /** Extra query merged over the episode scene, e.g. "spawn=whoops". */
  scene?: string;
  drive: DriveSegment[];
}
export interface Episode { id: string; scene: string; server?: string; shots: Shot[] }

const args = process.argv.slice(2);
const draft = args.includes('--draft');
const [episodePath, ...only] = args.filter(a => !a.startsWith('--'));
const episode = JSON.parse(readFileSync(episodePath, 'utf8')) as Episode;
const server = episode.server ?? 'http://127.0.0.1:5199';
const shots = episode.shots.filter(shot => !only.length || only.includes(shot.id));

const page = await launch(1280, 900, ['--use-angle=vulkan', '--enable-features=Vulkan']);
const results: Record<string, string> = {};
try {
  let loaded = '';
  for (const shot of shots) {
    const scene = sceneKey(shot);
    if (scene !== loaded) {
      await page.send('Page.navigate', { url: `${server}/map-preview.html?studio=1&${scene}` });
      await waitFor(page, `!!document.querySelector('.studio-ui [data-ui=render]')`, 120_000, 'stüdyo yüklenmedi');
      await new Promise(done => setTimeout(done, 3000));
      loaded = scene;
    }
    results[shot.id] = await renderShot(page, shot, scene);
  }
} finally {
  await page.close();
}
console.log(JSON.stringify(results, null, 2));

/** The studio matches takes by the sorted page query without "studio". */
function sceneKey(shot: Shot) {
  const params = new URLSearchParams(episode.scene);
  new URLSearchParams(shot.scene ?? '').forEach((value, key) => params.set(key, value));
  params.sort();
  return params.toString();
}

async function renderShot(page: Page, shot: Shot, scene: string) {
  const takeId = `reel-${episode.id}-${shot.id}`.toLowerCase().replace(/[^a-z0-9-]/g, '-');
  const take = buildTake(takeId, scene, shot.drive, shot.camera, shot.fov);
  const put = await fetch(`${server}/studio-api/takes/${takeId}`, { method: 'PUT', body: JSON.stringify(take) });
  if (!put.ok) throw new Error(`çekim yazılamadı: ${await put.text()}`);
  const started = Date.now();
  await page.evaluate(`(async () => {
    const ui = name => document.querySelector('.studio-ui [data-ui=' + name + ']');
    ui('take').dispatchEvent(new FocusEvent('focus'));
    for (let i = 0; i < 40 && ![...ui('take').options].some(o => o.value === ${JSON.stringify(takeId)}); i++) await new Promise(d => setTimeout(d, 100));
    ui('take').value = ${JSON.stringify(takeId)};
    ui('shot').value = ${JSON.stringify(shot.camera)};
    ui('fps').value = '${draft ? 30 : 60}';
    ui('quality').value = '${draft ? 1 : 2}';
    ui('slow').value = '${shot.slow ?? 1}';
    ui('status').dataset.tone = '';
    ui('render').click();
  })()`);
  await waitFor(page, `['ok', 'error'].includes(document.querySelector('.studio-ui [data-ui=status]').dataset.tone)`, 30 * 60_000, `render ${shot.id}`);
  const status = await page.evaluate<string>(`document.querySelector('.studio-ui [data-ui=status]').textContent`);
  const file = /· (\/\S+\.mp4)$/.exec(status)?.[1];
  if (!file || !existsSync(file)) throw new Error(`${shot.id}: ${status}`);
  console.error(`✓ ${shot.id} · ${shot.camera} · ${((Date.now() - started) / 1000).toFixed(0)} s · ${basename(file)}`);
  return file;
}
