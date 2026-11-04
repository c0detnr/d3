import { spawn, type ChildProcess } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import WebSocket from 'ws';

/** Minimal Chrome DevTools Protocol client for headless reel automation (no extra dependency). */
export interface Page {
  send<T = any>(method: string, params?: Record<string, unknown>): Promise<T>;
  evaluate<T = any>(expression: string): Promise<T>;
  close(): Promise<void>;
}

const BROWSERS = ['/usr/bin/chromium', '/usr/bin/google-chrome-stable'];

export async function launch(width: number, height: number, extraArgs: string[] = []): Promise<Page> {
  const profile = mkdtempSync(join(tmpdir(), 'iron-dust-reel-'));
  const browser: ChildProcess = spawn(process.env.CHROME ?? BROWSERS[0], [
    '--headless=new', '--remote-debugging-port=0', `--user-data-dir=${profile}`,
    `--window-size=${width},${height}`, '--hide-scrollbars', '--mute-audio',
    '--autoplay-policy=no-user-gesture-required', '--enable-unsafe-swiftshader',
    '--ignore-gpu-blocklist', '--enable-gpu', ...extraArgs, 'about:blank'], { stdio: ['ignore', 'ignore', 'pipe'] });
  const wsUrl = await new Promise<string>((done, fail) => {
    let log = '';
    browser.stderr!.on('data', chunk => {
      log += chunk;
      const match = /DevTools listening on (ws:\/\/\S+)/.exec(log);
      if (match) done(match[1]);
    });
    browser.on('exit', code => fail(new Error(`tarayıcı kapandı (${code}): ${log.slice(-800)}`)));
  });
  const port = new URL(wsUrl).port;
  const targets = await fetch(`http://127.0.0.1:${port}/json`).then(r => r.json()) as { type: string; webSocketDebuggerUrl: string }[];
  const socket = new WebSocket(targets.find(t => t.type === 'page')!.webSocketDebuggerUrl, { maxPayload: 512 * 1024 * 1024 });
  await new Promise(done => socket.once('open', done));
  let id = 0;
  const pending = new Map<number, { done(v: any): void; fail(e: Error): void }>();
  socket.on('message', raw => {
    const message = JSON.parse(String(raw));
    if (message.method === 'Runtime.exceptionThrown') console.error('[sayfa]', message.params.exceptionDetails?.exception?.description);
    if (message.method === 'Runtime.consoleAPICalled' && (message.params.type === 'error' || process.env.CDP_LOG))
      console.error('[konsol]', message.params.args.map((a: any) => a.value ?? a.description).join(' '));
    const call = pending.get(message.id);
    if (!call) return;
    pending.delete(message.id);
    if (message.error) call.fail(new Error(`${message.error.message}`)); else call.done(message.result);
  });
  const page: Page = {
    send(method, params = {}) {
      return new Promise((done, fail) => {
        const callId = ++id;
        pending.set(callId, { done, fail });
        socket.send(JSON.stringify({ id: callId, method, params }));
      });
    },
    async evaluate(expression) {
      const result = await page.send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
      if (result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description ?? result.exceptionDetails.text);
      return result.result.value;
    },
    async close() {
      socket.close();
      browser.kill('SIGTERM');
      await new Promise(done => browser.once('exit', done));
      rmSync(profile, { recursive: true, force: true });
    },
  };
  await page.send('Runtime.enable');
  await page.send('Page.enable');
  return page;
}

export async function waitFor(page: Page, expression: string, timeoutMs: number, label: string) {
  const end = Date.now() + timeoutMs;
  while (Date.now() < end) {
    if (await page.evaluate(expression)) return;
    await new Promise(done => setTimeout(done, 250));
  }
  throw new Error(`zaman aşımı: ${label}`);
}
