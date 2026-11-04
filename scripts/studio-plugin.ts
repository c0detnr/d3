import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { join, resolve } from 'node:path';
import type { Plugin } from 'vite';

/**
 * Dev-only studio backend: stores takes and pipes raw RGBA frames into ffmpeg.
 * Output: studio-out/takes/<id>.json|.webm and studio-out/renders/<name>.mp4.
 */
const OUT = resolve('studio-out');
const TAKES = join(OUT, 'takes');
const RENDERS = join(OUT, 'renders');
const ID = /^[a-z0-9-]{1,64}$/;

interface RenderJob {
  ffmpeg: ChildProcessWithoutNullStreams;
  frameBytes: number;
  frames: number;
  file: string;
  log: string;
  done: Promise<number>;
}
export interface RenderRequest {
  take: string; width: number; height: number; supersample: 1 | 2;
  fps: 30 | 60; audio: boolean; label: string;
}

const jobs = new Map<string, RenderJob>();

function readBody(req: IncomingMessage) {
  return new Promise<Buffer>((done, fail) => {
    const chunks: Buffer[] = [];
    req.on('data', chunk => chunks.push(chunk));
    req.on('end', () => done(Buffer.concat(chunks)));
    req.on('error', fail);
  });
}
function json(res: ServerResponse, status: number, body: unknown) {
  res.statusCode = status;
  res.setHeader('content-type', 'application/json');
  res.end(JSON.stringify(body));
}

function startRender(request: RenderRequest): RenderJob {
  const { take, width, height, supersample, fps, audio, label } = request;
  mkdirSync(RENDERS, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const file = join(RENDERS, `${take}-${label}-${stamp}.mp4`);
  const audioFile = join(TAKES, `${take}.webm`);
  const withAudio = audio && existsSync(audioFile);
  const [w, h] = [width * supersample, height * supersample];
  // WebGL rows arrive bottom-up; lanczos downscale doubles as supersampling AA.
  const args = ['-y', '-hide_banner', '-loglevel', 'error',
    '-f', 'rawvideo', '-pix_fmt', 'rgba', '-s', `${w}x${h}`, '-framerate', String(fps), '-i', '-',
    ...(withAudio ? ['-i', audioFile] : []),
    '-vf', `vflip,scale=${width}:${height}:flags=lanczos,format=yuv420p`,
    '-c:v', 'libx264', '-preset', 'slow', '-crf', '15', '-profile:v', 'high', '-r', String(fps),
    ...(withAudio ? ['-map', '0:v', '-map', '1:a', '-c:a', 'aac', '-b:a', '256k', '-shortest'] : []),
    '-movflags', '+faststart', file];
  const ffmpeg = spawn('ffmpeg', args);
  const job: RenderJob = { ffmpeg, frameBytes: w * h * 4, frames: 0, file, log: '',
    done: new Promise(done => ffmpeg.on('close', code => done(code ?? 1))) };
  ffmpeg.stderr.on('data', chunk => { job.log = (job.log + chunk).slice(-4000); });
  ffmpeg.stdin.on('error', () => undefined);
  return job;
}

function pipeFrame(req: IncomingMessage, res: ServerResponse, job: RenderJob) {
  let bytes = 0;
  req.on('data', (chunk: Buffer) => {
    bytes += chunk.length;
    if (!job.ffmpeg.stdin.write(chunk)) { req.pause(); job.ffmpeg.stdin.once('drain', () => req.resume()); }
  });
  req.on('end', () => {
    if (bytes !== job.frameBytes) return json(res, 400, { error: `kare boyutu ${bytes}, beklenen ${job.frameBytes}` });
    job.frames++;
    res.statusCode = 204; res.end();
  });
}

async function handle(req: IncomingMessage, res: ServerResponse) {
  const [path] = (req.url ?? '').split('?');
  const parts = path.split('/').filter(Boolean);
  mkdirSync(TAKES, { recursive: true });
  if (req.method === 'GET' && path === '/takes') {
    const takes = readdirSync(TAKES).filter(name => name.endsWith('.json')).map(name => {
      const take = JSON.parse(readFileSync(join(TAKES, name), 'utf8'));
      return { id: take.id, scene: take.scene, steps: take.steps.length, created: take.created,
        audio: existsSync(join(TAKES, `${take.id}.webm`)) };
    }).sort((a, b) => b.created.localeCompare(a.created));
    return json(res, 200, takes);
  }
  if (parts[0] === 'takes' && parts[1] && ID.test(parts[1])) {
    const base = join(TAKES, parts[1]);
    if (req.method === 'GET') return existsSync(`${base}.json`)
      ? json(res, 200, JSON.parse(readFileSync(`${base}.json`, 'utf8'))) : json(res, 404, { error: 'çekim yok' });
    if (req.method === 'PUT' && parts[2] === 'audio') { writeFileSync(`${base}.webm`, await readBody(req)); return json(res, 200, { ok: true }); }
    if (req.method === 'PUT') { writeFileSync(`${base}.json`, await readBody(req)); return json(res, 200, { ok: true }); }
  }
  if (req.method === 'POST' && path === '/renders') {
    const request = JSON.parse((await readBody(req)).toString()) as RenderRequest;
    if (!ID.test(request.take) || !ID.test(request.label)) return json(res, 400, { error: 'geçersiz ad' });
    const id = `${Date.now().toString(36)}`;
    jobs.set(id, startRender(request));
    return json(res, 200, { id });
  }
  const job = parts[0] === 'renders' ? jobs.get(parts[1]) : undefined;
  if (job && req.method === 'POST' && parts[2] === 'frame') return pipeFrame(req, res, job);
  if (job && req.method === 'POST' && (parts[2] === 'finish' || parts[2] === 'cancel')) {
    jobs.delete(parts[1]);
    if (parts[2] === 'cancel') job.ffmpeg.kill('SIGKILL');
    else job.ffmpeg.stdin.end();
    const code = await job.done;
    const ok = code === 0 && existsSync(job.file);
    return json(res, ok || parts[2] === 'cancel' ? 200 : 500, {
      file: ok ? job.file : undefined, frames: job.frames,
      megabytes: ok ? +(statSync(job.file).size / 1e6).toFixed(1) : 0, error: ok ? undefined : job.log });
  }
  json(res, 404, { error: 'bilinmeyen stüdyo isteği' });
}

export function studioPlugin(): Plugin {
  return {
    name: 'iron-dust-studio',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use('/studio-api', (req, res) => {
        handle(req, res).catch((error: unknown) => json(res, 500, { error: String(error) }));
      });
    },
  };
}
