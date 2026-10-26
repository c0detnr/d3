import assert from 'node:assert/strict';
import { WebSocket } from 'ws';
import { startLanServer } from './lan-server.ts';
import type { ServerState } from '../src/game/network/protocol.ts';

const running = await startLanServer(0, '127.0.0.1');
const base = `http://127.0.0.1:${running.port}`;
const sockets: WebSocket[] = [];
type Message = ServerState | { type: 'welcome'; slot: number } | { type: 'error'; message: string };
async function client() {
  const ws = new WebSocket(`ws://127.0.0.1:${running.port}/duel`, { origin: base });
  sockets.push(ws);
  const messages: Message[] = [];
  ws.on('message', data => messages.push(JSON.parse(data.toString())));
  await new Promise<void>((done, reject) => { ws.once('open', done); ws.once('error', reject); });
  return { ws, messages };
}
async function until<T>(get: () => T | undefined | false, label: string): Promise<T> {
  const deadline = performance.now() + 8000;
  while (performance.now() < deadline) {
    const result = get();
    if (result) return result;
    await new Promise(done => setTimeout(done, 20));
  }
  throw new Error(`Timed out: ${label}`);
}
function state(messages: Message[], predicate: (s: ServerState) => boolean) {
  return messages.find((m): m is ServerState => m.type === 'state' && predicate(m));
}
try {
  const page = await fetch(base);
  assert.equal(page.status, 200);
  assert.match(await page.text(), /<canvas/);
  for (const path of ['/package.json', '/.git/config', '/%2e%2e/README.md', '/assets-source/private', '/%00']) {
    assert.equal((await fetch(base + path)).status, 404, `Source not public: ${path}`);
  }
  assert.equal((await fetch(base, { method: 'POST' })).status, 405);
  assert.equal((await fetch(base, { method: 'HEAD' })).status, 200);
  const rejected = new WebSocket(`ws://127.0.0.1:${running.port}/duel`, { origin: 'http://evil.example' });
  await new Promise<void>((done, reject) => {
    rejected.once('open', () => reject(new Error('Foreign origin admitted')));
    rejected.once('error', () => done());
  });
  const a = await client(), b = await client();
  await until(() => a.messages.find(m => m.type === 'welcome' && m.slot === 0), 'first role');
  await until(() => b.messages.find(m => m.type === 'welcome' && m.slot === 1), 'second role');
  const third = await client();
  await until(() => third.messages.find(m => m.type === 'error'), 'third player rejected');
  await until(() => third.ws.readyState === WebSocket.CLOSED, 'full room closes');
  a.ws.send(JSON.stringify({ type: 'ready' })); b.ws.send(JSON.stringify({ type: 'ready' }));
  const initial = await until(() => state(a.messages, s => s.phase === 'playing'), 'both ready starts');
  assert.deepEqual(initial.tanks.map(t => t.hp), [100, 100]);
  let sequence = 0;
  const send = setInterval(() => a.ws.send(JSON.stringify({ type: 'input', sequence: ++sequence,
    throttle: 1, steer: 0, brake: 0, turn: 0, elevation: 0, fire: sequence === 1 })), 34);
  const start = initial.tanks[0].position;
  let advanced: ServerState;
  try {
    advanced = await until(() => state(b.messages, s => s.tick > initial.tick + 90 &&
      Math.hypot(s.tanks[0].position[0] - start[0], s.tanks[0].position[2] - start[2]) > 0.5), 'remote sees movement');
  } finally { clearInterval(send); }
  assert.equal(advanced.tanks[0].shots, 1, 'Remote sees one cannon shot');
  const latest = await until(() => state(a.messages, s => s.tick === advanced.tick), 'both clients share same tick');
  assert.deepEqual(latest, advanced, 'Identical authoritative state on both clients');
  b.ws.close();
  await until(() => state(a.messages, s => s.phase === 'cancelled'), 'disconnect cancels');
  await until(() => b.ws.readyState === WebSocket.CLOSED, 'disconnected socket closes');
  const replacement = await client();
  await until(() => replacement.messages.find(m => m.type === 'welcome' && m.slot === 1), 'vacated slot reopens');
  a.ws.send(JSON.stringify({ type: 'ready' })); replacement.ws.send(JSON.stringify({ type: 'ready' }));
  await until(() => state(replacement.messages, s => s.phase === 'playing'), 'new pair can start');
  replacement.ws.send(JSON.stringify({ type: 'input', sequence: 1, throttle: 'invalid' }));
  await until(() => replacement.ws.readyState === WebSocket.CLOSED, 'malformed input closed');
  const flood = await client();
  for (let i = 0; i < 100; i++) flood.ws.send(JSON.stringify({ type: 'ready' }));
  await until(() => flood.ws.readyState === WebSocket.CLOSED, 'rate limited');
  console.log('Passed: HTTP isolation, origin gate, two-player limit, ready, shared movement/shot state, cancellation, replacement, invalid input, rate limit.');
} finally {
  for (const socket of sockets) socket.terminate();
  await running.close();
}
