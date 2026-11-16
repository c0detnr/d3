import assert from 'node:assert/strict';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { cpus } from 'node:os';
import HavokPhysics from '@babylonjs/havok';
import { ArcRotateCamera, HavokPlugin, NullEngine, Quaternion, Scene, Vector3 } from '@babylonjs/core';
import { createFilmSet } from '../src/game/world/createFilmSet.ts';
import { factorySources, landmarkSources } from '../src/game/world/environmentSources.ts';
import { filmSetHeight } from '../src/game/world/filmSetLayout.ts';
import { FILM_TEAM_LAYOUT as layout } from '../src/game/combat/filmTeamLayout.ts';
import { FilmNavigation, NavigationAgent, FILM_NAV } from '../src/game/combat/FilmNavigation.ts';
import { EasyDuelAI, type AIContext } from '../src/game/combat/EasyDuelAI.ts';
import { AI_DIFFICULTY, AI_TACTICS, type AIDifficulty } from '../src/game/combat/easyAIConfig.ts';
import { DuelTank } from '../src/game/combat/DuelTank.ts';
import { TeamDuel } from '../src/game/combat/TeamDuel.ts';
import { readSave, defaults, writeSave } from '../src/game/core/playerSave.ts';

const fake = (x: number, z: number, speed = 0) => ({ vehicle: { speed, node: { position: new Vector3(x, filmSetHeight(x, z), z), rotationQuaternion: Quaternion.Identity() } } }) as Pick<DuelTank, 'vehicle'>;
const self = fake(-120, -80), enemy = fake(-120, -20);
for (const level of ['easy', 'normal', 'hard'] as AIDifficulty[]) {
  const a = new EasyDuelAI({}, 417), b = new EasyDuelAI({}, 417); a.difficulty = b.difficulty = level;
  let first = 0;
  for (let i = 0; i < 240; i++) {
    const at = a.update(self, enemy, true, 1 / 60).target!.clone();
    const bt = b.update(self, enemy, true, 1 / 60).target!;
    assert.deepEqual(at.asArray(), bt.asArray(), 'seeded deterministic aim');
    assert.ok(Vector3.Distance(at, enemy.vehicle.node.position.add(new Vector3(0, 1.15, 0))) <= AI_TACTICS.maxSpreadMetres);
    if (i === 0) first = a.aimSpread;
  }
  assert.ok(a.aimSpread < first * .7, 'aim settles while tracking');
  a.reset(); a.update(self, enemy, true, .01); assert.equal(a.canShoot, false);
  a.update(self, enemy, true, .85 * AI_DIFFICULTY[level].reaction); assert.equal(a.canShoot, true);
  a.shotFired(); assert.equal(a.state, 'cover'); assert.equal(a.canShoot, false);
}
const spreads = (['easy', 'normal', 'hard'] as AIDifficulty[]).map(level => {
  const ai = new EasyDuelAI(); ai.difficulty = level; ai.update(self, enemy, true, .01); return ai.aimSpread;
});
assert.ok(spreads[0] > spreads[1] && spreads[1] > spreads[2]);
const cautious = new EasyDuelAI(), aggressive = new EasyDuelAI(); cautious.difficulty = 'easy'; aggressive.difficulty = 'hard';
const distant = fake(-120, 30);
assert.equal(cautious.update(self, distant, true, .01).drive.throttle, 0, 'easy crew holds farther away');
assert.ok(aggressive.update(self, distant, true, .01).drive.throttle > 0, 'hard crew advances more aggressively');
const stationary = new EasyDuelAI(), moving = new EasyDuelAI();
stationary.update(self, enemy, true, .01); moving.update(fake(-120, -80, 10), fake(-120, 40, 12), true, .01);
assert.ok(moving.aimSpread > stationary.aimSpread * 2);
// Poison hidden pose/speed getters: no steering/aim code can accidentally read live hidden data.
const hidden = { vehicle: { get node() { throw Error('hidden pose read'); }, get speed() { throw Error('hidden speed read'); } } } as Pick<DuelTank, 'vehicle'>;
const fair = new EasyDuelAI(); fair.update(self, enemy, true, .1);
const lost = fair.update(self, hidden, false, .1); assert.equal(lost.target, undefined); assert.ok(lost.look); assert.equal(fair.canShoot, false);
fair.onDamage(new Vector3(self.vehicle.node.position.x - 2, self.vehicle.node.position.y, self.vehicle.node.position.z));
const ambush = fair.update(self, hidden, false, .1); assert.ok(ambush.look!.x < self.vehicle.node.position.x - 40, 'turn turret towards unseen hit bearing');
assert.equal(fair.state, 'cover'); assert.equal(fair.canShoot, false);
const saved = defaults(); assert.equal(saved.settings.difficulty, 'normal'); saved.settings.difficulty = 'hard';
let json = ''; writeSave(saved, { setItem: (_key, value) => { json = value; } }); assert.equal(readSave({ getItem: () => json }).settings.difficulty, 'hard');
assert.equal(readSave({ getItem: () => '{"version":1,"settings":{"difficulty":"cheat"}}' }).settings.difficulty, 'normal');

for (const sources of [factorySources, landmarkSources]) for (const [key, source] of Object.entries(sources))
  Object.assign(sources, { [key]: new Uint8Array(await readFile(new URL(source))) });
const engine = new NullEngine(), scene = new Scene(engine);
new ArcRotateCamera('check', 0, 1, 20, Vector3.Zero(), scene);
const wasmBinary = await readFile(new URL('../node_modules/@babylonjs/havok/lib/esm/HavokPhysics.wasm', import.meta.url));
scene.enablePhysics(new Vector3(0, -9.81, 0), new HavokPlugin(true, await HavokPhysics({ wasmBinary })));
scene.physicsEnabled = false;
const physics = scene.getPhysicsEngine()!; physics.setTimeStep(1 / 60);
const map = await createFilmSet(scene); scene.render();
const report: Record<string, unknown> = { cpu: cpus()[0].model, renderer: 'NullEngine / Havok (no GPU)', fixedStepSeconds: 1 / 60 };
try {
  const graphStart = performance.now(), graph = new FilmNavigation(scene);
  report.graph = { nodes: graph.nodes.length, colliders: graph.obstacles.length, buildMs: performance.now() - graphStart };
  console.log('NAV GRAPH', report.graph);
  let samples = 0;
  function footprint(p: Vector3) {
    const ground = Math.max(...[-3.5, 0, 3.5].flatMap(dx => [-4, 0, 4].map(dz => filmSetHeight(p.x + dx, p.z + dz))));
    for (const dx of [-3.5, 0, 3.5]) for (const dz of [-4, 0, 4]) {
      const hit = physics.raycast(new Vector3(p.x + dx, ground + 14, p.z + dz), new Vector3(p.x + dx, ground + .28, p.z + dz));
      assert.ok(!hit.hasHit, `A* footprint blocked at ${p.x},${p.z} by ${hit.body?.transformNode.name}`);
    }
    samples++;
  }
  for (const team of ['A', 'B'] as const) for (let slot = 0; slot < 3; slot++) {
    const spawn = layout.spawn(team, slot), end = layout.spawn(team === 'A' ? 'B' : 'A', slot);
    const path = new NavigationAgent(graph); path.request(new Vector3(spawn.x, spawn.y, spawn.z), new Vector3(end.x, end.y, end.z));
    let steps = 0; while (path.pending) { assert.ok(path.step(FILM_NAV.expansionsPerStep) <= FILM_NAV.expansionsPerStep); assert.ok(steps++ < 300); }
    assert.ok(path.path.length > 10, 'bases connected through real collider network');
    for (let i = 1; i < path.path.length; i++) {
      const a = graph.nodes[path.path[i - 1]], b = graph.nodes[path.path[i]];
      assert.ok(graph.clearSegment(a, b));
      const n = Math.ceil(Vector3.Distance(a, b));
      for (let k = 0; k <= n; k++) footprint(Vector3.Lerp(a, b, k / n));
    }
  }
  report.pathFootprintSamples = samples;
  // Cover must break real LOS and the next firing position must be a different reachable point.
  const context: AIContext = { navigation: new NavigationAgent(graph), health: 100, slot: 1 };
  const ai = new EasyDuelAI(); ai.update(self, enemy, true, 1, undefined, context); ai.shotFired();
  ai.update(self, enemy, true, 1 / 60, undefined, context);
  assert.equal(ai.state, 'cover'); assert.equal(ai.canShoot, false);
  const cover = graph.tacticalPoint(self.vehicle.node.position, enemy.vehicle.node.position, true, -1);
  assert.ok(cover, 'cover exists in combat area'); assert.ok(graph.occluded(cover, enemy.vehicle.node.position));
  self.vehicle.node.position.copyFrom(cover);
  for (let i = 0; i < 310; i++) ai.update(self, hidden, false, 1 / 60, undefined, context);
  assert.equal(ai.state, 'reposition', 'reload completion selects another firing position');
  ai.update(self, hidden, false, 1 / 60, undefined, { ...context, health: 25 }); assert.equal(ai.state, 'retreat');

  const source = new Uint8Array(await readFile(new URL('../assets/tanks/iron_dust_01/iron_dust_01.glb', import.meta.url)));
  const p = layout.spawn('A', 0), end = layout.spawn('B', 0), goal = new Vector3(end.x, end.y, end.z);
  const tank = await DuelTank.load(scene, source, new Vector3(p.x, p.y, p.z)); tank.vehicle.reset(tank.vehicle.spawn, 0);
  const driver = new EasyDuelAI(), navigator = new NavigationAgent(graph);
  let arrived = false, seconds = 0, worstStall = 0, stall = 0, last = tank.vehicle.node.position.clone();
  const trail: number[][] = [];
  for (let i = 0; i < 60 * 140; i++) {
    const decision = driver.update(tank, hidden, false, 1 / 60, goal, { navigation: navigator }); navigator.step(FILM_NAV.expansionsPerStep);
    tank.beforeStep(1 / 60, decision.drive); physics._step(1 / 60); tank.afterStep(1 / 60);
    if (i % 60 === 59) {
      const pos = tank.vehicle.node.position;
      trail.push([Math.round(pos.x), Math.round(pos.z)]);
      stall = Vector3.Distance(pos, last) < .5 ? stall + 1 : 0; worstStall = Math.max(worstStall, stall); last.copyFrom(pos);
      if (i % 600 === 599) console.log('NAV DRIVE', (i + 1) / 60, pos.asArray().map(x => +x.toFixed(1)), decision.drive, navigator.path.length);
    }
    if (Math.hypot(tank.vehicle.node.position.x - goal.x, tank.vehicle.node.position.z - goal.z) < 12) { arrived = true; seconds = (i + 1) / 60; break; }
  }
  report.navigation = { arrived, seconds, worstStallSeconds: worstStall, trail };
  assert.ok(arrived, `physical bot must reach other base: ${JSON.stringify(trail)}`); assert.ok(worstStall < 6, 'no prolonged collision stall');
  tank.dispose();
  // Real six-tank controller benchmark. Includes decision/perception/navigation and suspension rays,
  // excludes shared Havok world integration, projectiles, rendering and loading.
  const player = await DuelTank.load(scene, source, new Vector3(p.x, p.y, p.z)); player.vehicle.reset(player.vehicle.spawn, 0);
  const duel = new TeamDuel(scene, { tank: player.tank, vehicle: player.vehicle, damage: player.damage, team: 'A' }, layout);
  await duel.load(source);
  // One ally sees, another is blind: radio is delayed and delivers a copied observation.
  const scout = duel.bots.find(b => b.member.team === 'A' && b.slot === 1)!;
  const blind = duel.bots.find(b => b.member.team === 'A' && b.slot === 2)!;
  const contact = duel.bots.find(b => b.member.team === 'B' && b.slot === 0)!;
  scout.actor.vehicle.reset(new Vector3(0, 0, -60), 0); blind.actor.vehicle.reset(new Vector3(15, 0, -60), 0);
  contact.actor.vehicle.reset(new Vector3(0, 0, 30), Math.PI);
  for (const b of duel.bots) b.delay = 0;
  const eye = blind.actor.vehicle.node.position.add(new Vector3(0, 1.2, 0));
  duel.blocksSight = from => Vector3.DistanceSquared(from, eye) < .01;
  for (let i = 0; i < 36; i++) duel.beforeStep(1 / 60);
  assert.equal(blind.context.report, undefined, 'no instant team radar');
  for (let i = 0; i < 18; i++) duel.beforeStep(1 / 60);
  assert.ok(blind.context.report, 'delayed radio arrives');
  const copied = blind.context.report!.clone();
  contact.actor.vehicle.reset(new Vector3(95, 0, 30), Math.PI);
  duel.beforeStep(1 / 60);
  assert.deepEqual(blind.context.report!.asArray(), copied.asArray(), 'radio never follows a hidden live pose');
  assert.equal(blind.ai.canShoot, false, 'radio gives investigation, never fire permission');
  duel.blocksSight = () => false; duel.reset(); player.vehicle.reset(player.vehicle.spawn, 0);
  const sixth = new EasyDuelAI({}, 771), sixthContext: AIContext = { navigation: new NavigationAgent(duel.navigation!), allies: duel.members.filter(m => m !== duel.player && m.team === 'A') };
  const timing: number[] = [], states = new Set<string>(); let shots = 0;
  duel.onShot = () => shots++;
  for (let i = 0; i < 60 * 90; i++) {
    const start = performance.now();
    const decision = sixth.update(player, hidden, false, 1 / 60, goal, sixthContext);
    sixthContext.navigation!.step(16); player.beforeStep(1 / 60, decision.drive); duel.beforeStep(1 / 60);
    timing.push(performance.now() - start);
    physics._step(1 / 60); player.afterStep(1 / 60); duel.afterStep(1 / 60); duel.finishStep();
    for (const bot of duel.bots) states.add(bot.ai.state);
    if (i % 1800 === 1799) console.log('TACTICAL MATCH', (i + 1) / 60, shots, duel.bots.map(b => [b.member.team, b.ai.state, Math.round(b.actor.vehicle.node.position.x), Math.round(b.actor.vehicle.node.position.z)]));
  }
  timing.sort((a, b) => a - b);
  report.sixTankController = { steps: timing.length, meanMs: timing.reduce((a, b) => a + b) / timing.length, p95Ms: timing[Math.floor(timing.length * .95)], maxMs: timing.at(-1), shots, states: [...states] };
  assert.ok(shots > 0, 'actual six-tank match fires ballistic shells'); assert.ok(states.has('cover') && states.has('reposition'), 'match uses shelter and new positions');
  duel.dispose(); player.dispose();
  console.log('AI PASS', JSON.stringify(report.sixTankController));
} finally {
  await mkdir('artifacts/ai', { recursive: true }); await writeFile('artifacts/ai/headless.json', JSON.stringify(report, null, 2));
  map.dispose(); scene.dispose(); engine.dispose();
}
