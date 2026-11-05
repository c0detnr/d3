import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';
import { launch, waitFor } from './reel/cdp.ts';
mkdirSync('artifacts/mission1', { recursive: true });
const page = await launch(1280, 720, ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader']);
try {
  await page.send('Page.addScriptToEvaluateOnNewDocument', { source: `localStorage.setItem('iron-dust.player.v1',JSON.stringify({version:1,settings:{language:'en',quality:'low',volume:0,sensitivity:1,invertY:false},missions:{}}));window.__errors=[];addEventListener('error',e=>window.__errors.push(e.message||e.target?.src||'resource'),true);addEventListener('unhandledrejection',e=>window.__errors.push(String(e.reason)));const err=console.error;console.error=(...a)=>{window.__errors.push(a.map(String).join(' '));err(...a)};` });
  await page.send('Page.navigate', { url: 'http://127.0.0.1:18763/game/' });
  await waitFor(page, `document.querySelector('.main-navigation')&&document.querySelector('#status').hidden`, 120000, 'production menu');
  assert.equal(await page.evaluate(`'__missionTest' in window`), false);
  await page.evaluate(`document.querySelector('.main-navigation .primary').click()`);
  await page.evaluate(`document.querySelector('.detail-actions button').click()`);
  await page.evaluate(`document.querySelector('.briefing-body .primary').click()`);
  await waitFor(page, `document.querySelector('.mission-objective strong').textContent.startsWith('Checkpoint')`, 10000, 'production mission HUD');
  assert.equal(await page.evaluate(`'__missionTest' in window`), false);
  const errors = await page.evaluate(`window.__errors`);assert.deepEqual(errors, []);
  const shot = await page.send('Page.captureScreenshot', {format:'png'});
  writeFileSync('artifacts/mission1/production-subdirectory.png', Buffer.from(shot.data,'base64'));
  const viewport = await page.evaluate(`innerWidth + 'x' + innerHeight`);
  writeFileSync('artifacts/mission1/production-check.json', JSON.stringify({ passed:true, url:'http://127.0.0.1:18763/game/', viewport, quality:'low', browser:'Headless Chromium / ANGLE SwiftShader', checks:['relative subdirectory assets / WASM / GLB', 'menu / briefing / mission HUD', 'DEV hook absent'], errors },null,2));
  console.log('PRODUCTION PASS: subdirectory assets, menu/briefing/mission HUD, no DEV hook, zero errors');
} finally { await page.close(); }
