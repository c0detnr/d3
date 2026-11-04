import { spawnSync } from 'node:child_process';

/**
 * Review aid: one row of evenly spaced frames per video.
 * Usage: node --experimental-strip-types scripts/reel/contact-sheet.ts <out.png> <video> [frames=6]
 */
const [out, video, count = '6'] = process.argv.slice(2);
const frames = Number(count);
const probe = spawnSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', video], { encoding: 'utf8' });
const duration = Number(probe.stdout.trim());
const fps = frames / Math.max(0.1, duration);
const result = spawnSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', '-i', video,
  '-vf', `fps=${fps},scale=270:480,tile=${frames}x1`, '-frames:v', '1', out], { encoding: 'utf8' });
if (result.status !== 0) { console.error(result.stderr); process.exit(1); }
console.log(out);
