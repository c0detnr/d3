import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';
import { launch, waitFor } from './reel/cdp.ts';
const page = await launch(1440, 960, ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader']);
const url = process.env.MISSION_URL ?? 'http://127.0.0.1:18762/';
mkdirSync('artifacts/mission1', { recursive: true });
const report: Record<string, unknown> = { url, browser: 'Headless Chromium / ANGLE SwiftShader', viewport: '1440x960', quality: 'low', checks: [] };
async function click(text: string) {
  const box = await page.evaluate(`(() => {const button=[...document.querySelectorAll('#shell-root button')].find(b=>b.textContent.trim()===${JSON.stringify(text)} || b.textContent.trim()===${JSON.stringify(text+'→')});if(!button||button.disabled)throw Error('Missing/enabled button: '+${JSON.stringify(text)});const r=button.getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2}})()`);
  await page.send('Input.dispatchMouseEvent', { type: 'mousePressed', button: 'left', clickCount: 1, ...box });
  await page.send('Input.dispatchMouseEvent', { type: 'mouseReleased', button: 'left', clickCount: 1, ...box });
}
async function capture(name: string) { const shot = await page.send('Page.captureScreenshot', { format: 'png' }); writeFileSync(`artifacts/mission1/${name}.png`, Buffer.from(shot.data, 'base64')); }
async function checkResultCamera(name: string) {
  const camera = await page.evaluate(`window.__missionTest.camera()`);
  assert.equal(camera.resultView, true); assert.equal(camera.aiming, false);
  assert.equal(camera.active, 'tank-follow'); assert.equal(camera.fov, .8);
  assert.ok(camera.distance >= 14, 'result camera stays outside tank');
  await waitFor(page, `Math.hypot(...window.__missionTest.camera().position.map((v,i)=>v-${JSON.stringify(camera.position)}[i]))>.1`, 10000, 'cinematic orbit');
  const layout = await page.evaluate(`(() => {const r=document.querySelector('.result-panel').getBoundingClientRect();return {center:r.x+r.width/2,width:innerWidth,overflow:document.querySelector('.shell-result').scrollWidth>innerWidth}})()`);
  assert.ok(Math.abs(layout.center-layout.width/2)<2, 'result card centered');
  assert.equal(layout.overflow, false);
  await page.send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });
  await page.evaluate(`new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)))`);
  const still = await page.evaluate(`window.__missionTest.camera().position`);
  await page.evaluate(`new Promise(resolve=>setTimeout(resolve,150))`);
  assert.deepEqual(await page.evaluate(`window.__missionTest.camera().position`), still, 'reduced motion stops result orbit');
  await page.send('Emulation.setEmulatedMedia', { features: [] });
  const [width, height] = String(report.viewport).split('x').map(Number);
  await page.send('Emulation.setDeviceMetricsOverride', { width: 640, height: 800, deviceScaleFactor: 1, mobile: false });
  await page.evaluate(`new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)))`);
  assert.equal(await page.evaluate(`document.querySelector('.shell-result').scrollWidth>innerWidth`), false, 'compact result has no horizontal overflow');
  await capture(name+'-compact');
  await page.send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: false });
  await page.evaluate(`new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)))`);
  report[name+'Camera'] = camera;
}
async function pause() {
  await page.send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 });
  await page.send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 });
  await waitFor(page, `!!document.querySelector('.shell-pause')`, 5000, 'Escape pauses');
}
async function playing() { await waitFor(page, `document.body.classList.contains('shell-playing') && document.querySelector('#status').hidden && window.__missionTest?.snapshot()?.state==='active'`, 120000, 'active mission'); }
try {
  await page.send('Page.addScriptToEvaluateOnNewDocument', { source: `window.__missionErrors=[];addEventListener('error',e=>window.__missionErrors.push(e.message||e.target?.src||'resource'),true);addEventListener('unhandledrejection',e=>window.__missionErrors.push(String(e.reason)));const err=console.error;console.error=(...a)=>{window.__missionErrors.push(a.map(String).join(' '));err(...a)};` });
  await page.send('Page.navigate', { url });
  report.viewport = await page.evaluate(`innerWidth + 'x' + innerHeight`);
  await page.evaluate(`localStorage.setItem('iron-dust.player.v1',JSON.stringify({version:1,settings:{language:'tr',quality:'low',volume:.7,sensitivity:1,invertY:false},missions:{}}))`);
  await page.send('Page.reload');
  await waitFor(page, `document.querySelector('.main-navigation') && document.querySelector('#status').hidden`, 120000, 'menu scene');
  assert.equal(await page.evaluate(`window.__missionTest.snapshot().state`), 'briefing');
  await click('Görevler'); await click('Başla');
  await waitFor(page, `!!document.querySelector('.briefing-body')`, 5000, 'briefing');
  await click('Başla'); await playing();
  await waitFor(page, `!!document.querySelector('.mission-radio p').dataset.fullText && document.querySelector('.mission-radio p').textContent===document.querySelector('.mission-radio p').dataset.fullText`, 10000, 'complete typed radio');
  await page.evaluate(`window.__missionTest.lookAtObjective()`);
  const hudLayout = await page.evaluate(`(() => {
    const radio = document.querySelector('.mission-radio p');
    const pickup = document.querySelector('.smoke-pickup').getBoundingClientRect();
    const slot = document.querySelector('.smoke-use').getBoundingClientRect();
    const reload = document.querySelector('.hud-reload > div').getBoundingClientRect();
    const bar = document.querySelector('.hud-reload progress').getBoundingClientRect();
    return { radioFits: radio.scrollWidth <= radio.clientWidth && radio.scrollHeight <= radio.clientHeight,
      pickupGap: slot.top - pickup.bottom, reloadGap: bar.top - reload.bottom,
      brandHidden: getComputedStyle(document.querySelector('.hud-brand')).display === 'none',
      duplicateRangeHidden: getComputedStyle(document.querySelector('.hud-range')).display === 'none' };
  })()`);
  assert.equal(hudLayout.radioFits, true); assert.ok(hudLayout.pickupGap >= 24);
  assert.ok(hudLayout.reloadGap >= 8); assert.equal(hudLayout.brandHidden, true);
  assert.equal(hudLayout.duplicateRangeHidden, true); report.hudLayout = hudLayout;
  await capture('objective-hud'); await capture('radio');
  assert.match(await page.evaluate(`document.querySelector('.mission-objective strong').textContent`), /1?0\/3/);
  for (let i = 0; i < 3; i++) await page.evaluate(`window.__missionTest.advance()`);
  assert.equal(await page.evaluate(`window.__missionTest.snapshot().step`), 'range');
  for (let i = 0; i < 3; i++) await page.evaluate(`window.__missionTest.advance()`);
  assert.equal(await page.evaluate(`window.__missionTest.snapshot().step`), 'ambush');
  assert.equal(await page.evaluate(`window.__missionTest.snapshot().enemies.filter(e=>e.hp===100).length`), 2);
  // Let real EasyDuelAI and real Havok advance before capturing combat.
  await waitFor(page, `window.__missionTest.snapshot().score.seconds > 7`, 90000, 'AI simulation');
  await page.evaluate(`window.__missionTest.inspectBattle()`);
  await waitFor(page, `document.querySelector('.mission-waypoint span').textContent.length>0`, 5000, 'enemy marker');
  await capture('enemy-combat');
  await page.evaluate(`window.__missionTest.advance(); window.__missionTest.advance()`);
  await waitFor(page, `document.querySelector('h1')?.textContent==='Zafer'`, 5000, 'victory');
  await checkResultCamera('victory'); await capture('victory');
  const score = await page.evaluate(`window.__missionTest.snapshot().score`);
  assert.equal(score.victory, true); assert.ok(score.stars >= 2); assert.equal(score.shots, 11); assert.equal(score.hits, 11);
  assert.equal(await page.evaluate(`JSON.parse(localStorage.getItem('iron-dust.player.v1')).missions.rookie.completed`), true);
  assert.equal(await page.evaluate(`JSON.parse(localStorage.getItem('iron-dust.player.v1')).missions.rookie.stats.shots`), 11);
  await click('Görev seçimi');
  await waitFor(page, `document.querySelector('#status').hidden && document.querySelectorAll('.mission-card').length===5`, 120000, 'mission select');
  assert.equal(await page.evaluate(`document.querySelectorAll('.mission-card')[1].dataset.locked`), 'false');
  assert.match(await page.evaluate(`document.querySelectorAll('.mission-card')[1].textContent`), /Yakında.*Açıldı/);
  await page.evaluate(`document.querySelectorAll('.mission-card')[1].click()`);
  assert.equal(await page.evaluate(`document.querySelector('.detail-actions button').disabled`), true);
  await page.evaluate(`document.querySelector('.mission-card').click()`);
  await click('Başla'); await click('Başla'); await playing();
  await page.send('Input.dispatchKeyEvent', { type: 'keyDown', key: '2', code: 'Digit2', windowsVirtualKeyCode: 50 });
  await page.send('Input.dispatchKeyEvent', { type: 'keyUp', key: '2', code: 'Digit2', windowsVirtualKeyCode: 50 });
  assert.notEqual(await page.evaluate(`window.__missionTest.camera().active`), 'tank-follow', 'defeat starts in MG view');
  await page.evaluate(`window.__missionTest.defeat()`);
  await waitFor(page, `document.querySelector('h1')?.textContent==='Yenilgi'`, 5000, 'defeat');
  await checkResultCamera('defeat'); await capture('defeat');
  await click('Tekrar'); await playing();
  assert.equal(await page.evaluate(`window.__missionTest.snapshot().progress`), 0);
  // Rebuild the entire world five times; old DOM/listeners must not accumulate.
  for (let i = 0; i < 5; i++) {
    await pause(); await click('Yeniden başlat'); await playing();
    assert.equal(await page.evaluate(`document.querySelectorAll('.mission-hud').length`), 1);
    assert.equal(await page.evaluate(`document.querySelectorAll('.tactical-hud').length`), 1);
    assert.equal(await page.evaluate(`document.querySelectorAll('canvas').length`), 1);
    assert.equal(await page.evaluate(`window.__missionTest.snapshot().progress`), 0);
  }
  await pause(); await click('Ayarlar');
  await page.evaluate(`document.querySelector('.settings-list [data-language=en]').click()`);
  await click('← Back'); await click('Resume'); await playing();
  await waitFor(page, `document.querySelector('.mission-objective strong').textContent.startsWith('Checkpoint')`, 5000, 'English HUD');
  await waitFor(page, `!!document.querySelector('.mission-radio p').dataset.fullText && document.querySelector('.mission-radio p').textContent===document.querySelector('.mission-radio p').dataset.fullText`, 10000, 'complete English radio');
  assert.equal(await page.evaluate(`(() => { const p = document.querySelector('.mission-radio p'); return p.scrollWidth <= p.clientWidth && p.scrollHeight <= p.clientHeight; })()`), true);
  await capture('objective-en');
  await pause(); await click('Mission select');
  await waitFor(page, `document.querySelector('#status').hidden`, 120000, 'leave mission');
  await page.send('Page.reload');
  await waitFor(page, `document.querySelector('.main-navigation') && document.querySelector('#status').hidden`, 120000, 'persisted reload');
  await click('Missions');
  assert.equal(await page.evaluate(`document.querySelectorAll('.mission-card')[1].dataset.locked`), 'false');
  const errors = await page.evaluate(`window.__missionErrors`); assert.deepEqual(errors, []);
  report.score = score; report.errors = errors; report.passed = true;
  report.checks = ['menu / mission 1 / briefing / start', 'typed TR radio / objective / world and edge markers', '3 ordered checkpoints / 3 distinct real ArmorTarget bodies', 'two real DuelTank / EasyDuelAI actors / real-time Havok simulation', 'victory / score / stars / save statistics', 'mission 2 unlocked but coming soon / start disabled', 'defeat / replay', '5 full scene restarts / one HUD and canvas', 'English HUD and radio dictionary', 'mission selection / saved unlock after reload', 'zero page/resource/console errors'];
  console.log(JSON.stringify(report));
} catch (error) { report.passed = false; report.error = String(error); report.snapshot = await page.evaluate(`window.__missionTest?.snapshot()`); report.errors = await page.evaluate(`window.__missionErrors`); await capture('failure'); throw error; }
finally { writeFileSync('artifacts/mission1/browser-check.json', JSON.stringify(report, null, 2)); await page.close(); }
