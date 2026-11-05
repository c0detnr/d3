import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';
import { launch, waitFor } from './reel/cdp.ts';
const width = Number(process.env.UI_WIDTH ?? 1280), height = Number(process.env.UI_HEIGHT ?? 720);
const page = await launch(width, height, ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader']);
mkdirSync('artifacts/ui', { recursive: true });
const origin = process.env.SHELL_URL ?? 'http://127.0.0.1:18760/game/';
async function click(text: string) {
  const box = await page.evaluate(`(() => { const el = [...document.querySelectorAll('#shell-root button')].find(b => b.textContent.trim() === ${JSON.stringify(text)} || b.textContent.trim() === ${JSON.stringify(text + '→')}); if (!el) throw Error('button missing: '+${JSON.stringify(text)}); const r=el.getBoundingClientRect(); return {x:r.x+r.width/2,y:r.y+r.height/2}; })()`);
  await page.send('Input.dispatchMouseEvent', { type: 'mousePressed', button: 'left', clickCount: 1, ...box });
  await page.send('Input.dispatchMouseEvent', { type: 'mouseReleased', button: 'left', clickCount: 1, ...box });
}
async function capture(name: string) {
  const viewport = await page.evaluate(`({ width: innerWidth, height: innerHeight })`);
  await page.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: viewport.width - 8, y: viewport.height - 8 });
  const shot = await page.send('Page.captureScreenshot', { format: 'png' });
  const data = Buffer.from(shot.data, 'base64');
  writeFileSync(`artifacts/ui/${name}-${viewport.width}x${viewport.height}.png`, data);
  if (width === 1280) writeFileSync(`artifacts/ui/${name}.png`, data);
}
let priorErrors: unknown[] = [];
const report: Record<string, unknown> = { url: origin, viewport: `${width}x${height}`, browser: 'Chromium headless / SwiftShader', checks: [] };
try {
  const initScript = await page.send('Page.addScriptToEvaluateOnNewDocument', { source: `localStorage.setItem('iron-dust.player.v1', JSON.stringify({version:1,settings:{language:'tr',quality:'low',volume:.7,sensitivity:1,invertY:false},missions:{}})); window.__shellErrors=[]; addEventListener('error',e=>window.__shellErrors.push(e.message || e.target?.src || 'resource'),true); addEventListener('unhandledrejection',e=>window.__shellErrors.push(String(e.reason))); const originalError=console.error; console.error=(...a)=>{window.__shellErrors.push(a.map(String).join(' '));originalError(...a)};` });
  await page.send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: false });
  await page.send('Page.navigate', { url: origin });
  await waitFor(page, `document.querySelector('.main-navigation') && document.querySelector('#status')?.hidden`, 120000, 'main menu and loaded scene');
  assert.equal(await page.evaluate(`getComputedStyle(document.querySelector('.main-navigation .primary')).backgroundColor`), 'rgb(225, 189, 141)');
  assert.equal(await page.evaluate(`document.querySelectorAll('.wordmark').length`), 1);
  assert.equal(await page.evaluate(`document.querySelectorAll('.shell-footer').length`), 0);
  await capture('main-menu');
  await click('Görevler');
  await waitFor(page, `document.querySelectorAll('.mission-card').length===5`, 5000, 'mission cards');
  assert.equal(await page.evaluate(`document.querySelectorAll('.mission-card[data-locked="true"]').length`), 4);
  assert.equal(await page.evaluate(`(() => {const back=document.querySelector('.header-back').getBoundingClientRect(),lang=document.querySelector('.shell-header .language-switch').getBoundingClientRect();return back.right + 12 <= lang.left;})()`), true);
  assert.equal(await page.evaluate(`new Set([...document.querySelectorAll('.mission-card')].map(el=>el.getBoundingClientRect().height)).size`), 1);
  assert.equal(await page.evaluate(`document.querySelector('.detail-actions button').getBoundingClientRect().bottom <= innerHeight`), true);
  await capture('mission-select');
  await page.evaluate(`document.querySelectorAll('.mission-card')[1].click()`);
  await waitFor(page, `document.querySelector('#mission-detail-title')?.textContent==='Kayıp Erzak' && document.querySelector('.detail-actions button').disabled`, 5000, 'locked mission detail');
  await page.evaluate(`document.querySelector('.mission-card').click()`);
  await page.evaluate(`document.querySelector('.detail-actions button').click()`);
  await waitFor(page, `!!document.querySelector('.briefing-body')`, 5000, 'briefing');
  await capture('briefing');
  await click('Başla');
  await waitFor(page, `document.body.classList.contains('shell-playing')`, 5000, 'playing');
  await page.evaluate(`document.exitPointerLock()`);
  await waitFor(page, `document.querySelector('h1')?.textContent==='Duraklatıldı'`, 5000, 'pointer release pauses');
  await capture('pause');
  await click('Devam');
  await waitFor(page, `document.pointerLockElement===document.querySelector('#map')`, 5000, 'resume acquires pointer lock');
  await page.send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 });
  await page.send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 });
  await waitFor(page, `!!document.querySelector('h1')`, 5000, 'Escape pauses');
  await click('Ayarlar');
  await page.evaluate(`(() => { document.querySelector('.settings-list [data-language="en"]').click(); })()`);
  await waitFor(page, `document.querySelector('h1')?.textContent==='Settings'`, 5000, 'English settings');
  await page.evaluate(`(() => {const s=document.querySelector('.settings-list select');s.value='low';s.dispatchEvent(new Event('change',{bubbles:true}));const c=document.querySelector('.settings-list input[type=checkbox]');c.click();})()`);
  assert.equal(await page.evaluate(`JSON.parse(localStorage.getItem('iron-dust.player.v1')).settings.quality`), 'low');
  assert.equal(await page.evaluate(`Math.abs(document.querySelector('#map').width / document.querySelector('#map').getBoundingClientRect().width - .625) < .02`), true);
  await capture('settings-en');
  await click('← Back');
  for (let i = 0; i < 5; i++) {
    await click('Restart');
    await waitFor(page, `document.querySelector('#status')?.hidden && document.body.classList.contains('shell-playing')`, 120000, `restart ${i}`);
    await page.send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 });
    await page.send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 });
    await waitFor(page, `document.querySelector('h1')?.textContent==='Paused'`, 5000, `pause ${i}`);
    assert.equal(await page.evaluate(`document.querySelectorAll('.tactical-hud').length`), 1);
    assert.equal(await page.evaluate(`document.querySelectorAll('canvas').length`), 1);
    assert.equal(await page.evaluate(`document.querySelectorAll('.game-pointer-prompt').length`), 1);
  }
  await click('Mission select');
  await waitFor(page, `document.querySelector('#status')?.hidden && document.querySelectorAll('.mission-card').length===5`, 120000, 'return to missions');
  priorErrors = await page.evaluate(`window.__shellErrors`);
  await page.send('Page.removeScriptToEvaluateOnNewDocument', { identifier: initScript.identifier });
  await page.send('Page.addScriptToEvaluateOnNewDocument', { source: `window.__shellErrors=[];addEventListener('error',e=>window.__shellErrors.push(e.message || e.target?.src || 'resource'),true);addEventListener('unhandledrejection',e=>window.__shellErrors.push(String(e.reason)));const err=console.error;console.error=(...a)=>{window.__shellErrors.push(a.map(String).join(' '));err(...a)};` });
  await page.send('Page.reload');
  await waitFor(page, `document.querySelector('.main-navigation') && document.querySelector('#status')?.hidden`, 120000, 'reload');
  assert.equal(await page.evaluate(`document.documentElement.lang`), 'en');
  assert.equal(await page.evaluate(`JSON.parse(localStorage.getItem('iron-dust.player.v1')).settings.invertY`), true);
  // A narrow window must keep the complete navigation usable.
  await page.send('Emulation.setDeviceMetricsOverride', { width: 640, height: 800, deviceScaleFactor: 1, mobile: false });
  await capture('main-menu-640');
  assert.equal(await page.evaluate(`document.querySelector('.shell-layout').scrollWidth <= innerWidth`), true);
  const errors = [...priorErrors, ...await page.evaluate(`window.__shellErrors ?? []`)];
  // Storage failure must not replace live store settings when a session is rebuilt.
  await page.send('Page.addScriptToEvaluateOnNewDocument', { source: `
    Object.defineProperty(window, 'localStorage', { get() { throw new DOMException('Storage blocked', 'SecurityError'); } });
    window.__shellMasters = [];
    const connect = AudioNode.prototype.connect;
    AudioNode.prototype.connect = function(destination, ...args) {
      if (this instanceof GainNode && destination instanceof DynamicsCompressorNode) window.__shellMasters.push(this);
      return connect.call(this, destination, ...args);
    };
  ` });
  await page.send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: false });
  await page.send('Page.reload');
  await waitFor(page, `document.querySelector('.main-navigation') && document.querySelector('#status')?.hidden`, 120000, 'blocked storage menu');
  await click('Ayarlar');
  await page.evaluate(`(() => {
    const quality = document.querySelector('.settings-list select');
    quality.value = 'low'; quality.dispatchEvent(new Event('change', { bubbles: true }));
    const volume = document.querySelectorAll('.settings-list input[type=range]')[1];
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(volume, '0');
    volume.dispatchEvent(new Event('input', { bubbles: true }));
  })()`);
  await waitFor(page, `!!document.querySelector('.storage-notice') && document.querySelectorAll('.settings-list output')[1]?.textContent === '0%'`, 5000, 'in-memory muted settings');
  await click('← Geri');
  await click('Görevler');
  await page.evaluate(`document.querySelector('.detail-actions button').click()`);
  await waitFor(page, `!!document.querySelector('.briefing-body')`, 5000, 'blocked storage briefing');
  await click('Başla');
  const blockedStorage: unknown[] = [];
  for (let i = 0; i < 2; i++) {
    await waitFor(page, `document.querySelector('#status')?.hidden && document.body.classList.contains('shell-playing') && window.__shellMasters.length === ${i + 1}`, 120000, `blocked storage session ${i}`);
    await waitFor(page, `window.__shellMasters.at(-1).context.state === 'running' && window.__shellMasters.at(-1).gain.value < .001`, 5000, `blocked storage muted gain ${i}`);
    const measured = await page.evaluate(`({ scale: document.querySelector('#map').width / document.querySelector('#map').getBoundingClientRect().width, volume: window.__shellMasters.at(-1).gain.value })`);
    assert.ok(Math.abs(measured.scale - .625) < .02, `blocked storage low quality: ${JSON.stringify(measured)}`);
    assert.ok(measured.volume < .001, 'blocked storage master gain stays muted');
    blockedStorage.push(measured);
    if (i === 0) {
      await page.send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 });
      await page.send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 });
      await waitFor(page, `document.querySelector('h1')?.textContent==='Duraklatıldı'`, 5000, 'blocked storage pause');
      await click('Yeniden başlat');
    }
  }
  report.blockedStorage = blockedStorage;
  errors.push(...await page.evaluate(`window.__shellErrors ?? []`));
  report.errors = errors;
  assert.deepEqual(errors, []);
  report.checks = ['subdirectory assets / WASM / GLB', '5 cards / 4 locked / selected detail', 'single logo / primary style', 'briefing', 'pointer unlock pause / resume relock', 'Escape', 'saved language / quality / invertY', '5 restart disposal cycles / one HUD and pointer prompt', 'return to menu', 'reload persistence', '640px no horizontal overflow', 'zero page / resource / console errors'];
  report.checks.push('blocked storage start / restart retains low canvas scale and muted master gain');
  report.passed = true;
  console.log(JSON.stringify(report));
} catch (error) {
  report.passed = false; report.error = String(error); report.errors = await page.evaluate(`window.__shellErrors`);
  await capture('failure'); throw error;
} finally {
  writeFileSync(`artifacts/ui/browser-check-${width}x${height}.json`, JSON.stringify(report, null, 2));
  if (width === 1280) writeFileSync('artifacts/ui/browser-check.json', JSON.stringify(report, null, 2));
  await page.close();
}
