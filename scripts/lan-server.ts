import { createServer } from 'node:http';
import { readFile, realpath, stat } from 'node:fs/promises';
import { networkInterfaces } from 'node:os';
import { extname, resolve, sep } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import HavokPhysics from '@babylonjs/havok';
import { WebSocket, WebSocketServer } from 'ws';
import { DuelSimulation } from '../src/game/network/DuelSimulation.ts';
import { parseCommand, type Slot } from '../src/game/network/protocol.ts';
import { FixedStep } from '../src/game/core/fixedStep.ts';

const root = fileURLToPath(new URL('../', import.meta.url));
const mime: Record<string, string> = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript',
  '.css': 'text/css', '.wasm': 'application/wasm', '.glb': 'model/gltf-binary', '.png': 'image/png',
  '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.txt': 'text/plain; charset=utf-8', '.json': 'application/json' };

export async function startLanServer(port = 5174, host = '0.0.0.0') {
  const publicRoot = await realpath(resolve(root, 'dist-map'));
  await stat(resolve(publicRoot, 'lan-duel.html'));
  const wasmBinary = new Uint8Array(await readFile(resolve(root, 'node_modules/@babylonjs/havok/lib/esm/HavokPhysics.wasm'))).buffer;
  const havok = await HavokPhysics({ wasmBinary });
  const sources = await Promise.all(['01', '02'].map(id => readFile(resolve(root, `assets/tanks/iron_dust_${id}/iron_dust_${id}.glb`))));
  const simulation = await DuelSimulation.create(havok, [sources[0], sources[1]]);
  const server = createServer((req, res) => {
    void (async () => {
      if (req.method !== 'GET' && req.method !== 'HEAD') { res.writeHead(405).end(); return; }
      let pathname: string;
      try { pathname = decodeURIComponent(new URL(req.url ?? '/', 'http://local').pathname); }
      catch { res.writeHead(400).end(); return; }
      if (pathname === '/') pathname = '/lan-duel.html';
      if (pathname.includes('\0') || pathname.includes('\\') || pathname.split('/').some(part => part.startsWith('.'))) {
        res.writeHead(404).end(); return;
      }
      try {
        const file = await realpath(resolve(publicRoot, '.' + pathname));
        if (!file.startsWith(publicRoot + sep) || !(await stat(file)).isFile()) { res.writeHead(404).end(); return; }
        const content = await readFile(file);
        res.writeHead(200, { 'Content-Type': mime[extname(file)] ?? 'application/octet-stream',
          'Content-Length': content.length, 'X-Content-Type-Options': 'nosniff', 'Cache-Control': 'no-cache' });
        res.end(req.method === 'HEAD' ? undefined : content);
      } catch { res.writeHead(404).end(); }
    })().catch(() => { if (!res.headersSent) res.writeHead(500); res.end(); });
  });
  const wss = new WebSocketServer({ noServer: true, maxPayload: 2048, perMessageDeflate: false });
  const hosts = new Set(['localhost', '127.0.0.1', '[::1]']);
  for (const entries of Object.values(networkInterfaces())) for (const entry of entries ?? []) {
    hosts.add(entry.family === 'IPv6' ? `[${entry.address}]` : entry.address);
  }
  server.on('upgrade', (req, socket, head) => {
    let allowed = false;
    try {
      const origin = new URL(req.headers.origin ?? '');
      allowed = req.url === '/duel' && origin.protocol === 'http:' && origin.host === req.headers.host && hosts.has(origin.hostname);
    } catch { /* Browser origin is mandatory, even on LAN. */ }
    if (!allowed) { socket.end('HTTP/1.1 403 Forbidden\r\nConnection: close\r\n\r\n'); return; }
    wss.handleUpgrade(req, socket, head, ws => wss.emit('connection', ws, req));
  });
  const peers: [WebSocket | undefined, WebSocket | undefined] = [undefined, undefined];
  let closed = false;
  wss.on('connection', ws => {
    const free = peers.findIndex(peer => !peer);
    if (free < 0) { ws.send(JSON.stringify({ type: 'error', message: 'Oda dolu. Bu düello iki oyunculuktur.' })); ws.close(1008, 'Room full'); return; }
    const slot = free as Slot;
    peers[slot] = ws;
    simulation.connect(slot);
    ws.send(JSON.stringify({ type: 'welcome', slot }));
    ws.send(JSON.stringify(simulation.snapshot()));
    let lastPong = performance.now();
    ws.on('pong', () => { lastPong = performance.now(); });
    let windowStart = performance.now(), messages = 0;
    ws.on('message', (data, binary) => {
      if (performance.now() - windowStart >= 1000) { windowStart = performance.now(); messages = 0; }
      if (++messages > 90 || binary) { ws.close(1008, 'Invalid input'); return; }
      let command;
      try { command = parseCommand(JSON.parse(data.toString())); } catch { /* Invalid JSON is rejected. */ }
      if (!command) { ws.close(1008, 'Invalid command'); return; }
      simulation.command(slot, command);
    });
    const heartbeat = setInterval(() => {
      if (performance.now() - lastPong > 10_000) ws.terminate();
      else ws.ping();
    }, 3000);
    ws.on('error', () => ws.terminate());
    ws.once('close', () => {
      clearInterval(heartbeat);
      if (peers[slot] === ws) { peers[slot] = undefined; simulation.disconnect(slot); }
    });
  });
  const clock = new FixedStep();
  let previous = performance.now(), ticks = 0;
  const timer = setInterval(() => {
    const now = performance.now();
    clock.advance((now - previous) / 1000, dt => {
      simulation.step(dt);
      if (++ticks % 3 === 0) {
        const state = JSON.stringify(simulation.snapshot());
        for (const peer of peers) if (peer?.readyState === WebSocket.OPEN) {
          if (peer.bufferedAmount > 256 * 1024) peer.terminate();
          else peer.send(state);
        }
      }
    });
    previous = now;
  }, 8);
  async function close() {
    if (closed) return;
    closed = true;
    clearInterval(timer);
    for (const peer of wss.clients) peer.terminate();
    await new Promise<void>(done => wss.close(() => done()));
    await new Promise<void>(done => server.close(() => done()));
    simulation.dispose();
  }
  try {
    await new Promise<void>((done, reject) => { server.once('error', reject); server.listen(port, host, () => { server.off('error', reject); done(); }); });
  } catch (error) { await close(); throw error; }
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('LAN server address unavailable');
  return { port: address.port, close };
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const port = Number(process.env.PORT ?? 5174);
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('PORT must be 1..65535');
  try {
    const running = await startLanServer(port);
    console.log(`LAN düellosu hazır: http://localhost:${running.port}/`);
    for (const entries of Object.values(networkInterfaces())) for (const entry of entries ?? []) {
      if (entry.family === 'IPv4' && !entry.internal) console.log(`Diğer bilgisayarda aç: http://${entry.address}:${running.port}/`);
    }
    console.log('Yalnız güvenilir yerel ağda kullanın. Kapatmak için Ctrl+C.');
    const stop = () => { void running.close(); };
    process.once('SIGINT', stop); process.once('SIGTERM', stop);
  } catch (error) { console.error('LAN sunucusu başlatılamadı:', error); process.exitCode = 1; }
}
