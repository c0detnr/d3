import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';
import { launch, waitFor } from './reel/cdp.ts';

const page = await launch(1280, 800, ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader']);
const loadingHidden = `document.querySelector('#loading-screen')?.hidden === true`;
async function click(selector: string) {
  await waitFor(page, `!!document.querySelector(${JSON.stringify(selector)})`, 10000, selector);
  const point = await page.evaluate(`(() => {
    const r = document.querySelector(${JSON.stringify(selector)}).getBoundingClientRect();
    return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
  })()`);
  for (const type of ['mousePressed', 'mouseReleased']) {
    await page.send('Input.dispatchMouseEvent', { type, button: 'left', clickCount: 1, ...point });
  }
}
try {
  await page.send('Page.addScriptToEvaluateOnNewDocument', { source: `
    window.__loadingErrors = [];
    addEventListener('error', e => window.__loadingErrors.push(e.message));
    addEventListener('unhandledrejection', e => window.__loadingErrors.push(String(e.reason)));
    localStorage.setItem('iron-dust.player.v1', JSON.stringify({version:1, settings:{language:'tr', quality:'low', volume:0, sensitivity:1, invertY:false}, missions:{}}));
  ` });
  await page.send('Page.navigate', { url: process.env.LOADING_URL ?? 'http://127.0.0.1:5173/' });
  await waitFor(page, `${loadingHidden} && !!document.querySelector('.shell-home .main-navigation')`, 120000, 'initial loading dismissed');
  await click('.main-navigation .primary');
  await click('.detail-actions .primary');
  await click('.briefing-body .primary');
  await waitFor(page, `${loadingHidden} && window.__missionTest?.snapshot()?.state === 'active'`, 120000, 'mission ready');
  await click('.pause-button');
  await click('.shell-pause .main-navigation button:nth-child(2)');
  await waitFor(page, `!document.querySelector('#loading-screen').hidden`, 5000, 'restart loading visible');
  await waitFor(page, `${loadingHidden} && document.querySelector('#status').hidden && window.__missionTest?.snapshot()?.state === 'active'`, 120000, 'restart loading dismissed');
  assert.deepEqual(await page.evaluate('window.__loadingErrors'), []);
  mkdirSync('artifacts/loading', { recursive: true });
  const screenshot = await page.send('Page.captureScreenshot', { format: 'png' });
  writeFileSync('artifacts/loading/restarted.png', Buffer.from(screenshot.data, 'base64'));
  console.log('loading browser: initial menu, mission start, restart overlay shown/dismissed, no page errors passed (Chromium / ANGLE SwiftShader, 1280x800, low)');
} finally {
  await page.close();
}
