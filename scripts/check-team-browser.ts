import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';
import { cpus } from 'node:os';
import { launch, waitFor } from './reel/cdp.ts';
const page = await launch(1440, 960, ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader']);
const out = 'artifacts/team-match'; mkdirSync(out, { recursive: true });
const shot = async (name: string) => writeFileSync(`${out}/${name}.png`, Buffer.from((await page.send('Page.captureScreenshot', { format: 'png' })).data, 'base64'));
async function click(text: string) {
  const point = await page.evaluate(`(()=>{const e=[...document.querySelectorAll('#shell-root button')].find(e=>e.textContent.trim().replace('→','').trim()===${JSON.stringify(text)});if(!e)throw Error('missing button');const r=e.getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2}})()`);
  await page.send('Input.dispatchMouseEvent', { type: 'mousePressed', button: 'left', clickCount: 1, ...point });
  await page.send('Input.dispatchMouseEvent', { type: 'mouseReleased', button: 'left', clickCount: 1, ...point });
}
try {
  await page.send('Page.addScriptToEvaluateOnNewDocument', { source: `window.__teamErrors=[];addEventListener('error',e=>window.__teamErrors.push(e.message));addEventListener('unhandledrejection',e=>window.__teamErrors.push(String(e.reason)));` });
  await page.send('Page.navigate', { url: process.env.TEAM_URL ?? 'http://127.0.0.1:18765/' });
  await page.evaluate(`localStorage.setItem('iron-dust.player.v1',JSON.stringify({version:1,settings:{devMode:false,language:'tr',quality:'low',volume:0},missions:{}}))`);
  await page.send('Page.reload');
  await waitFor(page, `document.querySelector('.main-navigation') && document.querySelector('#status').hidden && window.__missionTest?.team()`, 120000, 'menu');
  await waitFor(page, `!document.querySelector('#loading-screen') || getComputedStyle(document.querySelector('#loading-screen')).pointerEvents==='none'`, 30000, 'loading overlay');
  await click('Oyna');
  await waitFor(page, `document.body.classList.contains('shell-playing') && document.querySelector('#status').hidden && window.__missionTest?.team()?.elapsed > 3.1`, 120000, '3v3 starts');
  const start = await page.evaluate(`window.__missionTest.team()`); assert.equal(start.members.length, 6);
  console.log('TEAM browser: playing'); await shot('playing');
  await page.evaluate(`window.__missionTest.teamHit(0,3)`);
  await waitFor(page, `window.__missionTest.team().members[0].hp === 0 && document.querySelector('.team-duel-hud').innerText.includes('Yeniden doğma')`, 30000, 'death / respawn countdown');
  console.log('TEAM browser: destroyed'); await shot('destroyed');
  const dead = await page.evaluate(`window.__missionTest.team()`);
  await waitFor(page, `window.__missionTest.team().members[0].hp === 100 && window.__missionTest.team().members[0].protection>0`, 120000, 'respawn full hp');
  console.log('TEAM browser: respawned'); await shot('respawned');
  const respawned = await page.evaluate(`window.__missionTest.team()`);
  assert.ok(respawned.elapsed - dead.elapsed >= 4.8);
  await page.evaluate(`window.__missionTest.teamHit(0,3)`);
  assert.equal((await page.evaluate(`window.__missionTest.team()`)).members[0].hp, 100, 'spawn protection');
  const fps = await page.evaluate(`window.__missionTest.fps()`);
  await page.evaluate(`window.__missionTest.teamExpire()`);
  await waitFor(page, `document.querySelector('.result-panel') && document.querySelector('.result-panel').innerText.includes('Yenilgi')`, 30000, 'defeat with developer mode off');
  console.log('TEAM browser: result'); await shot('result');
  assert.ok(await page.evaluate(`document.querySelector('.result-stats').innerText.includes('Ölüm')`));
  await click('Tekrar oyna');
  await waitFor(page, `document.body.classList.contains('shell-playing') && document.querySelector('#status').hidden && window.__missionTest?.team()?.elapsed > .1`, 120000, 'replay');
  assert.deepEqual((await page.evaluate(`window.__missionTest.team()`)).score, { A: 0, B: 0 });
  await page.evaluate(`window.__missionTest.teamExpire()`);
  await waitFor(page, `document.querySelector('.result-panel') && document.querySelector('.result-panel').innerText.includes('BERABERE')`, 30000, 'draw');
  console.log('TEAM browser: draw'); await shot('draw');
  await click('Ana menü');
  await waitFor(page, `document.querySelector('.shell-home') && document.querySelector('#status').hidden`, 120000, 'home');
  assert.deepEqual(await page.evaluate(`window.__teamErrors`), []);
  writeFileSync(`${out}/report.json`, JSON.stringify({ device: cpus()[0].model, browser: 'Headless Chromium / ANGLE SwiftShader', viewport: await page.evaluate(`innerWidth+'x'+innerHeight`), quality: 'low', fps, start, dead, respawned, checks: ['Oyna launches 3v3 with devMode false', 'real impact path destroys player', '5s fixed-time countdown', 'full HP respawn', '3s protection blocks hit', 'timeout defeat and draw', 'replay starts fresh', 'main menu', 'no page errors'], limitation: 'Deaths are injected via DEV-only shared damage hook; timeout accelerated. Not a human gameplay or GPU performance acceptance.' }, null, 2));
  console.log('TEAM BROWSER PASS', JSON.stringify(fps));
} catch (error) { await shot('failure'); console.error(await page.evaluate(`({screen:document.querySelector('#shell-root')?.innerText,team:window.__missionTest?.team(),fps:window.__missionTest?.fps()})`)); throw error; }
finally { await page.close(); }
