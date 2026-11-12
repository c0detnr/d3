import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';
import { launch, waitFor } from './reel/cdp.ts';

const out = process.env.INFANTRY_OUT ?? '/tmp/claude-1000/-home-mami-Projects-d3/cb1546d2-8374-477c-a967-ec86bbf0f9d4/scratchpad';
mkdirSync(out, { recursive: true });
const page = await launch(1440, 960, ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader']);
const url = process.env.INFANTRY_URL ?? 'http://127.0.0.1:5174/map-preview.html';
async function shot(name: string) {
  const png = await page.send('Page.captureScreenshot', { format: 'png' });
  writeFileSync(`${out}/${name}.png`, Buffer.from(png.data, 'base64'));
}
async function open(suffix = '') {
  await page.evaluate(`delete window.__missionTest; delete window.__infantrySnapshot`);
  await page.send('Page.navigate', { url: url + suffix });
  await waitFor(page, `location.href === ${JSON.stringify(url + suffix)} && document.querySelector('#status')?.hidden && window.__missionTest`, 120000, 'scene ready');
  console.log('Scene ready', suffix || 'default');
  await page.evaluate(`(async () => {
    const coreUrl = performance.getEntriesByType('resource').find(e => e.name.includes('/@babylonjs_core.js')).name;
    const { EngineStore, Vector3, Matrix, Ray } = await import(coreUrl);
    const scene = EngineStore.LastCreatedScene;
    window.__infantryScene = scene;
    window.__infantryAnimationEnds = [];
    scene.animationGroups.forEach(g => g.onAnimationGroupEndObservable.add(() => window.__infantryAnimationEnds.push(g.name)));
    // Match the existing low-quality browser checks without changing authored placements or camera.
    scene.shadowsEnabled = false; scene.particlesEnabled = false; scene.getEngine().setHardwareScalingLevel(1.6);
    window.__infantrySnapshot = () => {
      const camera = scene.activeCamera, engine = scene.getEngine();
      const viewport = camera.viewport.toGlobal(engine.getRenderWidth(), engine.getRenderHeight());
      const active = scene.getActiveMeshes().data;
      return scene.transformNodes.filter(n => /^infantry-\\d+-placement$/.test(n.name)).map(anchor => {
        const prefix = anchor.name.replace('placement', '');
        const meshes = anchor.getChildMeshes().filter(m => m.getTotalVertices() > 0);
        const center = anchor.position.add(new Vector3(0, .9, 0));
        const screen = Vector3.Project(center, Matrix.Identity(), scene.getTransformMatrix(), viewport);
        const direction = center.subtract(camera.globalPosition);
        const blocker = scene.pickWithRay(new Ray(camera.globalPosition, direction.normalizeToNew(), direction.length()),
          m => m.isEnabled() && m.isVisible && m.getTotalVertices() > 0 && !meshes.includes(m));
        return { name: anchor.name, position: anchor.position.asArray(),
          dimensions: meshes.reduce((range, m) => {
            const box = m.getBoundingInfo().boundingBox;
            return [Math.min(range[0],box.minimumWorld.y), Math.max(range[1],box.maximumWorld.y)];
          }, [Infinity,-Infinity]),
          renderedMeshes: meshes.filter(m => m.isEnabled() && m.isVisible && active.includes(m)).length,
          onScreen: screen.x > 0 && screen.x < viewport.width && screen.y > 0 && screen.y < viewport.height && screen.z > 0 && screen.z < 1,
          unobstructed: !blocker?.hit,
          animations: scene.animationGroups.filter(g => g.name.startsWith(prefix)).map(g => ({name:g.name,playing:g.isPlaying,frame:g.animatables[0]?.masterFrame})) };
      });
    };
  })()`);
  await waitFor(page, `window.__infantrySnapshot().some(n => n.renderedMeshes > 0)`, 30000, 'rendered soldiers');
}
try {
  await page.send('Page.addScriptToEvaluateOnNewDocument', { source: `
    window.__infantryErrors=[];
    addEventListener('error',e=>window.__infantryErrors.push(e.message));
    addEventListener('unhandledrejection',e=>window.__infantryErrors.push(String(e.reason)));
    localStorage.setItem('iron-dust.player.v1',JSON.stringify({version:1,settings:{language:'tr',quality:'low',volume:0,sensitivity:1,invertY:false},missions:{}}));
  ` });
  await open();
  const before = await page.evaluate(`window.__infantrySnapshot()`);
  assert.equal(before.length, 3, 'default test ground has the player garrison');
  assert.ok(before.every((npc: any) => npc.renderedMeshes > 0 && npc.onScreen && npc.unobstructed), 'all three soldiers visible from the unmodified starting camera');
  assert.ok(before.every((npc: any) => npc.dimensions[1]-npc.dimensions[0] > 1.5 && npc.dimensions[1]-npc.dimensions[0] < 2.2), 'human metre scale');
  assert.ok(before.every((npc: any) => npc.animations.some((clip: any) => clip.playing && /Idle_(Alert|Smoke)$/.test(clip.name))), 'rigged idle clips play');
  const firstFrame = before[0].animations.find((clip: any) => clip.playing).frame;
  await waitFor(page, `window.__infantrySnapshot()[0].animations.find(c=>c.playing).frame !== ${firstFrame}`, 15000, 'idle animation advances');
  assert.equal(await page.evaluate(`document.body.innerText.includes('undefined')`), false, 'Turkish HUD has no undefined');
  await shot('soldiers');
  for (const language of ['en','tr']) {
    await page.evaluate(`(async()=>{const {setLanguage}=await import('/src/game/i18n/index.ts');setLanguage('${language}'); const {tr}=await import('/src/game/i18n/tr.ts');const {t}=await import('/src/game/i18n/index.ts');if(Object.keys(tr).some(k=>typeof t(k)!=='string'))throw Error('Missing translation')})()`);
    await waitFor(page, `!document.body.innerText.includes('undefined')`, 10000, `${language} HUD`);
  }
  // Launch the actual drone, then let its fixed-step terrain collision produce the blast.
  assert.equal(await page.evaluate(`window.__missionTest.launchFpv()`), true);
  const impact = await page.evaluate(`(()=>{const ended=window.__missionTest.detonateFpvAtInfantry();return {ended,soldiers:window.__infantrySnapshot()}})()`);
  assert.equal(impact.ended, true);
  const death = impact.soldiers;
  const inBlast = (npc: any) => Math.hypot(...npc.position.map((v: number, i: number) => v-before[0].position[i])) <= 7;
  for (const npc of death) assert.equal(npc.animations.some((clip: any) => clip.playing && clip.name.endsWith('Death_Fall')), inBlast(npc), 'only soldiers in the 7 m blast start Death_Fall');
  await waitFor(page, `!document.querySelector('.soldier-profile').hidden`, 10000, 'casualty profile');
  const deathFrame = death[0].animations.find((clip: any) => clip.playing).frame;
  await waitFor(page, `window.__infantrySnapshot()[0].animations.some(c=>c.name.endsWith('Death_Fall') && c.frame > ${deathFrame}) || window.__infantryAnimationEnds.some(n=>n.startsWith('infantry-0-') && n.endsWith('Death_Fall'))`, 15000, 'death animation advances');
  await waitFor(page, `document.querySelector('.soldier-profile').getBoundingClientRect().width>0 && getComputedStyle(document.querySelector('.soldier-profile')).opacity==='1'`, 5000, 'profile visible');
  assert.match(await page.evaluate(`document.querySelector('.soldier-profile').innerText`), /Andriy Kovalenko/);
  await shot('profile_card');
  assert.deepEqual(await page.evaluate(`window.__infantryErrors`), []);
  const modes = [];
  if (process.env.INFANTRY_DEFAULT_ONLY !== '1') for (const suffix of ['?duel=1','?map=set','?map=kul','?map=kul&duel=5v5&base=B']) {
    await open(suffix);
    const soldiers = await page.evaluate(`window.__infantrySnapshot()`);
    assert.ok(soldiers.slice(0,3).every((npc: any) => npc.renderedMeshes > 0 && npc.onScreen && npc.unobstructed), `${suffix}: player soldiers visible`);
    assert.equal(await page.evaluate(`document.body.innerText.includes('undefined')`), false);
    assert.deepEqual(await page.evaluate(`window.__infantryErrors`), []);
    modes.push({ suffix, soldiers });
  }
  writeFileSync(`${out}/infantry-browser-report.json`, JSON.stringify({ browser:'Headless Chromium / ANGLE SwiftShader', viewport:await page.evaluate(`innerWidth+'x'+innerHeight`),quality:'low',before,death,modes,errors:[]},null,2));
  console.log('INFANTRY BROWSER PASS: default camera visibility, metre scale, advancing idle/death clips, bilingual HUD, FPV collision, profile card, mode coverage');
} catch (error) {
  console.error(await page.evaluate(`({status:document.querySelector('#status')?.textContent,soldiers:window.__infantrySnapshot?.(),errors:window.__infantryErrors})`));
  throw error;
} finally { await page.close(); }
