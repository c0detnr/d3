import { execFileSync } from 'node:child_process';
import { existsSync, linkSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { launch, type Page } from './cdp.ts';

/**
 * Final reel edit: trimmed shot renders + typed text overlay + music.
 * Staged on purpose: one big ffmpeg graph (10 trimmed inputs + piped overlay) deadlocked in ffmpeg 8.
 *  1. each slot is trimmed to its own near-lossless clip, then joined with the concat demuxer;
 *  2. the overlay page (overlay/index.html) is screenshotted in headless Chromium with a
 *     transparent background, only when it changes; unchanged frames are hard links;
 *  3. one final pass lays overlay and music on the base.
 * Usage: node --experimental-strip-types scripts/reel/compose.ts <episode.edit.json>
 */
interface TextItem { at: number; title: string; sub?: string[]; size?: 'xl' }
interface Slot {
  shot: string; from: number; seconds: number; text: TextItem[];
  /** Two white frames at the cut into this slot. */ flash?: boolean;
  /** Seconds at the end of the slot that zoom into the frame centre (cut "into" the next shot). */ punchIn?: number;
  card?: boolean; stamp?: { at: number; text: string }; disclaimer?: boolean;
}
interface Edit { episode: string; file: string; music: string; out: string; disclaimer?: string; slots: Slot[] }

const FPS = 60, W = 1080, H = 1920;
const editPath = process.argv[2];
if (!editPath) throw new Error('kullanım: compose.ts <bolum.edit.json>');
const edit = JSON.parse(readFileSync(editPath, 'utf8')) as Edit;
const total = edit.slots.reduce((sum, slot) => sum + slot.seconds, 0);
const frames = Math.round(total * FPS);
const work = join('studio-out/compose', edit.episode);
rmSync(work, { recursive: true, force: true });
mkdirSync(join(work, 'overlay'), { recursive: true });
mkdirSync(dirname(edit.out), { recursive: true });
const ffmpeg = (...args: string[]) => execFileSync('ffmpeg', ['-y', '-hide_banner', '-loglevel', 'error', ...args], { stdio: 'inherit' });
const step = (label: string) => console.error(`· ${label}`);

// Latest native render of each shot (file names end with an ISO timestamp, so they sort by time).
const renders = readdirSync('studio-out/renders');
const clips = edit.slots.map(slot => {
  const name = renders.filter(f => f.startsWith(`reel-${edit.episode}-${slot.shot}-`) && f.endsWith('.mp4')).sort().at(-1);
  if (!name) throw new Error(`render yok: ${slot.shot}`);
  return join('studio-out/renders', name);
});
if (!existsSync(edit.music)) execFileSync('node', ['--experimental-strip-types', 'scripts/reel/music.ts', edit.music], { stdio: 'inherit' });

// 1. Base picture.
edit.slots.forEach((slot, i) => {
  step(`kesim ${i + 1}/${edit.slots.length} ${slot.shot}`);
  const count = Math.round(slot.seconds * FPS);
  let vf = `fps=${FPS}`;
  if (slot.punchIn) {
    const from = Math.round((slot.seconds - slot.punchIn) * FPS), length = slot.punchIn * FPS;
    vf += `,zoompan=z='if(gt(in,${from}),1+0.9*pow((in-${from})/${length},2),1)':d=1:s=${W}x${H}:fps=${FPS}:x='iw/2-iw/zoom/2':y='ih/2-ih/zoom/2'`;
  }
  ffmpeg('-ss', String(slot.from), '-i', clips[i], '-vf', `${vf},format=yuv420p`, '-frames:v', String(count), '-an',
    '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '6', join(work, `slot${i}.mp4`));
});
writeFileSync(join(work, 'slots.txt'), edit.slots.map((_, i) => `file 'slot${i}.mp4'`).join('\n'));

// 2. Overlay stills, captured only when the page state changes.
async function openOverlay() {
  const page = await launch(W, H, ['--disable-gpu']);
  await page.send('Emulation.setDeviceMetricsOverride', { width: W, height: H, deviceScaleFactor: 1, mobile: false });
  await page.send('Emulation.setDefaultBackgroundColorOverride', { color: { r: 0, g: 0, b: 0, a: 0 } });
  await page.send('Page.navigate', { url: pathToFileURL(resolve('scripts/reel/overlay/index.html')).href });
  for (let i = 0; i < 100 && !(await page.evaluate<boolean>('typeof window.setEdit === "function"')); i++) await new Promise(d => setTimeout(d, 100));
  if (!(await page.evaluate<boolean>(`setEdit(${JSON.stringify(edit)})`))) throw new Error('yazı tipleri yüklenemedi');
  return page;
}
/** Headless Chromium sometimes stops answering; every call gets a deadline and a fresh browser. */
function deadline<T>(promise: Promise<T>, ms: number) {
  return Promise.race([promise, new Promise<never>((_, fail) => setTimeout(() => fail(new Error('zaman aşımı')), ms))]);
}
step('yazı katmanı');
let stills = 0;
let page: Page = await openOverlay();
try {
  let key = '', still = '';
  for (let f = 0; f < frames; f++) {
    for (let attempt = 0; ; attempt++) {
      try {
        const next = await deadline(page.evaluate<string>(`renderAt(${f / FPS})`), 10_000);
        if (next !== key) {
          const shot = await deadline(page.send<{ data: string }>('Page.captureScreenshot', { format: 'png' }), 10_000);
          still = join(work, `still${String(stills++).padStart(4, '0')}.png`);
          writeFileSync(still, Buffer.from(shot.data, 'base64'));
          key = next;
        }
        break;
      } catch (error) {
        if (attempt >= 3) throw error;
        console.error(`  kare ${f}: tarayıcı yanıt vermedi, yeniden açılıyor`);
        page.close().catch(() => {});
        page = await openOverlay(); key = '';
      }
    }
    // One numbered file per output frame keeps single-frame flashes exact.
    linkSync(still, join(work, 'overlay', `${String(f).padStart(5, '0')}.png`));
  }
} finally {
  await deadline(page.close(), 5000).catch(() => {});
}
console.error(`  ${frames} karede ${stills} farklı görüntü`);

// 3. Final pass.
step('birleştirme');
ffmpeg('-f', 'concat', '-safe', '0', '-i', join(work, 'slots.txt'),
  '-framerate', String(FPS), '-i', join(work, 'overlay', '%05d.png'),
  '-i', edit.music,
  '-filter_complex', `[1:v]format=rgba[ov];[0:v][ov]overlay=format=auto,format=yuv420p[v]`,
  '-map', '[v]', '-map', '2:a', '-frames:v', String(frames), '-t', String(total),
  '-c:v', 'libx264', '-preset', 'slow', '-crf', '15', '-profile:v', 'high', '-pix_fmt', 'yuv420p', '-r', String(FPS),
  '-c:a', 'aac', '-b:a', '256k', '-movflags', '+faststart', edit.out);
console.log(edit.out);
