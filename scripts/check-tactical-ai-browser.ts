import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';
import { createServer } from 'vite';
import { launch, waitFor } from './reel/cdp.ts';
const server = process.env.TEAM_URL ? undefined : await createServer({ cacheDir: '/tmp/d3-ai-browser-cache', server: { host:'127.0.0.1', port:19241, strictPort:true, hmr:false, watch:{ ignored:['**/*'] } } });
await server?.listen();
const page = await launch(960, 700, ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader']);
const out = 'artifacts/ai/browser'; mkdirSync(out, { recursive: true });
const capture = async (name: string) => {
  if (name.startsWith('match-')) await page.evaluate(`(()=>{const s=document.createElement('style');s.id='ai-observation';s.textContent='.team-duel-hud,.tactical-hud,.damage-hud,.fpv-dock,.game-pointer-prompt,.pause-button,.smoke-supply-hud{visibility:hidden!important}';document.head.append(s)})()`);
  await page.evaluate(`new Promise(requestAnimationFrame)`);
  writeFileSync(`${out}/${name}.png`, Buffer.from((await page.send('Page.captureScreenshot', { format: 'png' })).data, 'base64'));
  if (name.startsWith('match-')) await page.evaluate(`document.querySelector('#ai-observation')?.remove()`);
};
async function click(text: string) {
  await waitFor(page, `(()=>{const e=[...document.querySelectorAll('#shell-root button')].find(e=>e.textContent.trim().replace(/[→←»«]/g,'').trim()===${JSON.stringify(text)});return e&&!e.disabled})()`, 30000, `button ${text}`);
  await page.evaluate(`(()=>{const e=[...document.querySelectorAll('#shell-root button')].find(e=>e.textContent.trim().replace(/[→←»«]/g,'').trim()===${JSON.stringify(text)});e.click()})()`);
  console.log('UI CLICK', text);
}
const samples: unknown[] = [];
try {
  await page.send('Page.addScriptToEvaluateOnNewDocument', { source: `try{localStorage.setItem('iron-dust.player.v1',JSON.stringify({version:1,settings:{devMode:false,tank:'02',droneMode:'ASSIST',language:'tr',quality:'low',volume:0,difficulty:'normal'},missions:{}}))}catch{};window.__aiErrors=[];addEventListener('error',e=>window.__aiErrors.push(e.message));addEventListener('unhandledrejection',e=>window.__aiErrors.push(String(e.reason)));` });
  await page.send('Page.navigate', { url: process.env.TEAM_URL ?? 'http://127.0.0.1:19241/' });
  await waitFor(page, `document.querySelector('.main-navigation') && document.querySelector('#status').hidden && !!window.__missionTest`, 120000, 'menu ready');
  await waitFor(page, `!document.querySelector('#loading-screen') || getComputedStyle(document.querySelector('#loading-screen')).pointerEvents==='none'`, 30000, 'loading dismissed');
  await click('Ayarlar');
  assert.equal(await page.evaluate(`document.querySelector('select:has(option[value="normal"])')?.value`), 'normal');
  await page.evaluate(`(()=>{const s=document.querySelector('select:has(option[value="normal"])');s.value='hard';s.dispatchEvent(new Event('change',{bubbles:true}))})()`);
  assert.equal(await page.evaluate(`JSON.parse(localStorage.getItem('iron-dust.player.v1')).settings.difficulty`), 'hard');
  await page.evaluate(`(()=>{const s=document.querySelector('select:has(option[value="normal"])');s.value='normal';s.dispatchEvent(new Event('change',{bubbles:true}))})()`);
  await capture('difficulty'); await click('Geri'); await click('Oyna');
  await waitFor(page, `!!document.querySelector('.shell-tankSelect') || document.body.classList.contains('shell-playing')`, 30000, 'play flow');
  if (await page.evaluate(`!!document.querySelector('.shell-tankSelect')`)) { await click('Devam'); await click('Maça gir'); }
  await waitFor(page, `document.body.classList.contains('shell-playing') && window.__missionTest?.team()?.elapsed > 1`, 120000, 'playing');
  await capture('start'); await page.evaluate(`window.__missionTest.inspectAI(1)`);
  for (const second of [10, 20, 35, 45]) {
    await waitFor(page, `window.__missionTest.team().elapsed >= ${second}`, 240000, `match ${second}s`);
    const sample = await page.evaluate(`({elapsed:window.__missionTest.team().elapsed,ai:window.__missionTest.ai(),fps:window.__missionTest.fps()})`);
    samples.push(sample); writeFileSync(`${out}/report.json`, JSON.stringify({ samples, complete: false }, null, 2)); console.log('AI BROWSER', JSON.stringify(sample)); await page.evaluate(`window.__missionTest.inspectAI(1)`); await capture(`match-${second}`);
  }
  const errors = await page.evaluate(`window.__aiErrors`); assert.deepEqual(errors, []);
  writeFileSync(`${out}/report.json`, JSON.stringify({ samples, errors, complete: true }, null, 2));
  console.log('AI BROWSER: observed 45 seconds of actual 3v3, settings persisted, captured frames; visual interpretation required.');
} catch (error) {
  await capture('failure'); writeFileSync(`${out}/failure.json`, JSON.stringify({ error: String(error), samples }, null, 2)); throw error;
} finally { await page.close(); await server?.close(); }
