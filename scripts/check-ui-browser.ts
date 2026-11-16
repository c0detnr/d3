import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';
import { createServer } from 'vite';
import { launch, waitFor } from './reel/cdp.ts';
const width = Number(process.env.UI_WIDTH ?? 1280), height = Number(process.env.UI_HEIGHT ?? 720);
const tag = process.env.UI_TAG ?? '';
const port = Number(process.env.UI_PORT ?? 19263);
const server = await createServer({ cacheDir: '/tmp/claude-1000/d3-ui-walk-cache', server: { host: '127.0.0.1', port, strictPort: true, hmr: false, watch: { ignored: ['**/*'] } } });
await server.listen();
const page = await launch(width, height, ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader']);
const out = 'artifacts/ui'; mkdirSync(out, { recursive: true });
const log: unknown[] = [];
async function capture(name: string) {
  await page.evaluate(`new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))`);
  const overflow = await page.evaluate(`(()=>{const l=document.querySelector('.shell-layout');const bad=[...document.querySelectorAll('#shell-root *, .tactical-hud *, .hud-vehicle, .team-duel-hud, .smoke-inventory, .fpv-osd *')].filter(e=>!e.closest('.compass-window')).filter(e=>{const r=e.getBoundingClientRect();return r.width>0&&(r.right>innerWidth+1||r.left<-1||r.bottom>innerHeight+1)&&getComputedStyle(e).visibility!=='hidden'}).slice(0,6).map(e=>e.className||e.tagName);return {scroll:l?l.scrollHeight>l.clientHeight+1:false,bad}})()`);
  log.push({ name, overflow }); console.log('CAPTURE', name, JSON.stringify(overflow));
  const shot = await page.send('Page.captureScreenshot', { format: 'png' });
  writeFileSync(`${out}/${name}-${width}x${height}${tag}.png`, Buffer.from(shot.data, 'base64'));
}
async function key(code: string, keyName = code) {
  const vk: Record<string, number> = { Escape: 27, Enter: 13, ArrowLeft: 37, ArrowRight: 39, KeyB: 66 };
  await page.send('Input.dispatchKeyEvent', { type: 'keyDown', key: keyName, code, windowsVirtualKeyCode: vk[code] });
  await page.send('Input.dispatchKeyEvent', { type: 'keyUp', key: keyName, code, windowsVirtualKeyCode: vk[code] });
}
async function click(text: string) {
  const expr = `[...document.querySelectorAll('#shell-root button')].find(e=>e.textContent.replace(/[→←»«]/g,'').trim()===${JSON.stringify(text)})`;
  await waitFor(page, `(()=>{const e=${expr};return e&&!e.disabled})()`, 60000, `button ${text}`);
  const box = await page.evaluate(`(()=>{const r=${expr}.getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2}})()`);
  await page.send('Input.dispatchMouseEvent', { type: 'mousePressed', button: 'left', clickCount: 1, ...box });
  await page.send('Input.dispatchMouseEvent', { type: 'mouseReleased', button: 'left', clickCount: 1, ...box });
}
try {
  await page.send('Page.addScriptToEvaluateOnNewDocument', { source: `if(!sessionStorage.getItem('seeded')){sessionStorage.setItem('seeded','1');localStorage.setItem('iron-dust.player.v1',JSON.stringify({version:1,settings:{devMode:false,tank:'02',droneMode:'ASSIST',language:'${process.env.UI_LANG ?? 'tr'}',quality:'low',volume:0,difficulty:'normal'},missions:{}}))};window.__e=[];addEventListener('error',e=>window.__e.push(e.message||'resource:'+(e.target&&e.target.src)),true);addEventListener('unhandledrejection',e=>window.__e.push(String(e.reason)));` });
  await page.send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: false });
  await page.send('Page.navigate', { url: `http://127.0.0.1:${port}/` });
  await waitFor(page, `document.querySelector('#loading-screen:not(.loading-hidden)')`, 30000, 'loading visible').catch(() => {});
  await capture('loading');
  await waitFor(page, `document.querySelector('.main-navigation') && document.querySelector('#status').hidden && !!window.__missionTest`, 180000, 'menu ready');
  await new Promise(r => setTimeout(r, 1500));
  const attract = await page.evaluate(`window.__missionTest.loadout()`); console.log('ATTRACT', JSON.stringify(attract));
  await capture('menu-home');
  await click(process.env.UI_LANG === 'en' ? 'Settings' : 'Ayarlar'); await capture('menu-settings'); await key('Escape');
  await click(process.env.UI_LANG === 'en' ? 'Controls' : 'Kontroller'); await capture('menu-controls'); await key('Escape');
  await click(process.env.UI_LANG === 'en' ? 'Play' : 'Oyna');
  await waitFor(page, `!!document.querySelector('.shell-tankSelect .loadout-card[aria-checked="true"][data-choice="02"]')`, 10000, 'tank select default 02');
  await capture('select-tank');
  await key('ArrowLeft'); await waitFor(page, `!!document.querySelector('.loadout-card[aria-checked="true"][data-choice="01"]')`, 3000, 'arrow selects 01');
  await key('ArrowRight'); await waitFor(page, `!!document.querySelector('.loadout-card[aria-checked="true"][data-choice="02"]')`, 3000, 'arrow back to 02');
  await key('Enter'); await waitFor(page, `!!document.querySelector('.shell-droneSelect')`, 3000, 'drone select');
  await key('Escape'); await waitFor(page, `!!document.querySelector('.shell-tankSelect')`, 3000, 'esc back to tank');
  await key('Enter'); await waitFor(page, `!!document.querySelector('.shell-droneSelect')`, 3000, 'drone select again');
  await key('ArrowRight'); await waitFor(page, `!!document.querySelector('.loadout-card[aria-checked="true"][data-choice="ACRO"]')`, 3000, 'ACRO');
  await capture('select-drone');
  await key('Enter');
  await waitFor(page, `document.body.classList.contains('shell-playing') && window.__missionTest?.team()?.elapsed > 2`, 180000, 'match');
  const loadout = await page.evaluate(`window.__missionTest.loadout()`); console.log('MATCH', JSON.stringify(loadout));
  assert.equal(loadout.tank, '02'); assert.equal(loadout.droneMode, 'ACRO'); assert.equal(loadout.attract, false);
  assert.equal(await page.evaluate(`JSON.parse(localStorage.getItem('iron-dust.player.v1')).settings.droneMode`), 'ACRO');
  await new Promise(r => setTimeout(r, 2000));
  await capture('hud-match');
  await page.evaluate(`window.__missionTest.teamHit(0,3)`); await new Promise(r => setTimeout(r, 400)); await capture('hud-hit');
  await waitFor(page, `window.__missionTest.team().members[0].hp > 0`, 30000, 'respawn');
  await new Promise(r => setTimeout(r, 1500)); await capture('hud-respawned');
  await page.evaluate(`window.__missionTest.launchFpv()`);
  await waitFor(page, `document.body.classList.contains('fpv-active')`, 10000, 'fpv active');
  await new Promise(r => setTimeout(r, 1500)); await capture('hud-fpv');
  await key('KeyV', 'v'); await new Promise(r => setTimeout(r, 500));
  await page.evaluate(`window.__missionTest.teamExpire()`);
  await waitFor(page, `!!document.querySelector('.shell-result')`, 20000, 'team result');
  await capture('menu-result');
  await click(process.env.UI_LANG === 'en' ? 'Play again' : 'Tekrar oyna');
  await waitFor(page, `document.body.classList.contains('shell-playing') && window.__missionTest?.team()?.elapsed > 1`, 180000, 'replay');
  const replay = await page.evaluate(`window.__missionTest.loadout()`); console.log('REPLAY', JSON.stringify(replay));
  assert.equal(replay.tank, '02'); assert.equal(replay.droneMode, 'ACRO');
  await key('Escape');
  await waitFor(page, `!!document.querySelector('.shell-pause')`, 5000, 'pause');
  await capture('menu-pause');
  await click(process.env.UI_LANG === 'en' ? 'Main menu' : 'Ana menü');
  await waitFor(page, `!!document.querySelector('.shell-home') && document.querySelector('#status').hidden`, 120000, 'home again');
  const errors = await page.evaluate(`window.__e`); console.log('ERRORS', JSON.stringify(errors));
  writeFileSync(`${out}/walk-${width}x${height}${tag}.json`, JSON.stringify({ attract, loadout, log, errors }, null, 2));
  console.log('WALK OK');
} catch (error) {
  await capture('failure').catch(() => {}); console.error(error); process.exitCode = 1;
} finally { await page.close(); await server.close(); }
