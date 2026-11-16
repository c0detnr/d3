import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { ArcRotateCamera, HavokPlugin, NullEngine, Scene, Vector3 } from '@babylonjs/core';
import HavokPhysics from '@babylonjs/havok';
import { TeamMatchRules, TEAM_MATCH } from '../src/game/combat/teamMatchRules.ts';
import { FILM_TEAM_LAYOUT as layout } from '../src/game/combat/filmTeamLayout.ts';
import { FILM_LIMIT, RIVER, filmSetHeight, riverCenterX, riverProfile } from '../src/game/world/filmSetLayout.ts';
import { createFilmSet } from '../src/game/world/createFilmSet.ts';
import { factorySources, landmarkSources } from '../src/game/world/environmentSources.ts';
import { DuelTank } from '../src/game/combat/DuelTank.ts';
import { TeamDuel } from '../src/game/combat/TeamDuel.ts';

function advance(rules: TeamMatchRules, seconds: number) { for (let i = 0; i < Math.round(seconds * 60); i++) rules.advance(1 / 60); }
const rules = new TeamMatchRules(['A', 'A', 'A', 'B', 'B', 'B']);
assert.equal(rules.eliminate(0, 3), false, 'spawn protection');
advance(rules, 3.1);
assert.equal(rules.eliminate(0, 1), false, 'friendly fire');
assert.equal(rules.eliminate(0, 3), true);
assert.equal(rules.eliminate(0, 3), false, 'no duplicate deaths');
assert.deepEqual(rules.score, { A: 0, B: 1 });
assert.equal(rules.members[3].kills, 1); assert.equal(rules.members[0].deaths, 1);
advance(rules, 4.9); assert.equal(rules.members[0].alive, false);
advance(rules, .1); assert.equal(rules.members[0].alive, true);
assert.equal(rules.members[0].protection, 3);
assert.equal(rules.eliminate(0, 3), false);
advance(rules, 3.1); assert.equal(rules.eliminate(0, 3), true);
for (const result of ['A', 'B', 'draw'] as const) {
  const match = new TeamMatchRules(['A', 'B']);
  match.score = result === 'draw' ? { A: 2, B: 2 } : result === 'A' ? { A: 4, B: 2 } : { A: 2, B: 4 };
  advance(match, 360); assert.equal(match.result, result); assert.equal(match.remaining, 0);
  const elapsed = match.elapsed; match.advance(3); assert.equal(match.elapsed, elapsed);
  assert.equal(match.eliminate(0, 1), false, 'result locks damage');
}
for (const team of ['A', 'B'] as const) {
  const match = new TeamMatchRules(['A', 'B']); advance(match, 3.1);
  const victim = team === 'A' ? 1 : 0, shooter = 1 - victim;
  for (let i = 0; i < 15; i++) {
    assert.equal(match.eliminate(victim, shooter), true); match.resolve();
    if (i < 14) { assert.equal(match.result, undefined); advance(match, 8.1); }
  }
  assert.equal(match.result, team); assert.equal(match.score[team], TEAM_MATCH.scoreLimit);
}
assert.throws(() => rules.advance(NaN));

// Load the same GLBs and procedural colliders as the browser, without changing world code.
for (const sources of [factorySources, landmarkSources]) for (const [key, source] of Object.entries(sources))
  Object.assign(sources, { [key]: new Uint8Array(await readFile(new URL(source))) });
const wasmBinary = await readFile(new URL('../node_modules/@babylonjs/havok/lib/esm/HavokPhysics.wasm', import.meta.url));
const engine = new NullEngine(), scene = new Scene(engine);
new ArcRotateCamera('check', 0, 1, 20, Vector3.Zero(), scene);
scene.enablePhysics(new Vector3(0, -9.81, 0), new HavokPlugin(true, await HavokPhysics({ wasmBinary })));
const physics = scene.getPhysicsEngine()!;
const map = await createFilmSet(scene); scene.render();
let samples = 0;
try {
  const a = layout.spawn('A', 0), b = layout.spawn('B', 0);
  assert.ok(Math.hypot(a.x - b.x, a.z - b.z) >= 250 && Math.hypot(a.x - b.x, a.z - b.z) <= 350);
  function clear(x: number, z: number) {
    assert.ok(Math.abs(x) + 2 < FILM_LIMIT && Math.abs(z) + 5 < FILM_LIMIT);
    assert.equal(riverProfile(x, z).weight, 0);
    assert.ok(Math.abs(x - riverCenterX(z)) > RIVER.waterHalf + 2);
    // Whole tank footprint, including low cover. Actual Havok triangle surfaces, not footprints from metadata.
    const ground = Math.max(...[-2, 0, 2].flatMap(dx => [-5, 0, 5].map(dz => filmSetHeight(x + dx, z + dz))));
    for (const dx of [-2, 0, 2]) for (const dz of [-5, 0, 5]) {
      const hit = physics.raycast(new Vector3(x + dx, ground + 12, z + dz), new Vector3(x + dx, ground + .25, z + dz));
      assert.ok(!hit.hasHit, `blocked route at ${x},${z} by ${hit.body?.transformNode.name}`);
    }
    samples++;
  }
  for (const team of ['A', 'B'] as const) for (let slot = 0; slot < layout.teamSize; slot++) {
    let previous = layout.spawn(team, slot); clear(previous.x, previous.z);
    for (const point of layout.route(team, slot)) {
      const steps = Math.max(1, Math.ceil(Math.hypot(point.x - previous.x, point.z - previous.z)));
      for (let i = 1; i <= steps; i++) clear(previous.x + (point.x - previous.x) * i / steps, previous.z + (point.z - previous.z) * i / steps);
      previous = point;
    }
  }
  const source = new Uint8Array(await readFile(new URL('../assets/tanks/iron_dust_01/iron_dust_01.glb', import.meta.url)));
  const spawn = layout.spawn('A', 0), player = await DuelTank.load(scene, source, new Vector3(spawn.x, spawn.y, spawn.z));
  const duel = new TeamDuel(scene, { tank: player.tank, vehicle: player.vehicle, damage: player.damage, team: 'A' }, layout);
  await duel.load(source);
  assert.ok(duel.navigation && duel.navigation.nodes.length > 1000, 'film collider network loaded');
  assert.ok(duel.bots.every(b => b.context.allies?.length === 2), 'allied separation context wired');
  assert.equal(duel.members.length, 6); assert.equal(duel.alive('A'), 3); assert.equal(duel.alive('B'), 3);
  const victim = duel.members[3];
  for (let i = 0; i < 186; i++) duel.beforeStep(1 / 60);
  const hit = { point: victim.vehicle.node.position.clone(), normal: Vector3.Up(), body: victim.vehicle.body, distance: 0 };
  duel.playerImpact(hit);
  assert.equal(duel.bots.find(b => b.member === victim)!.ai.state, 'cover', 'shared impact path reaches tactical damage response');
  for (let i = 0; i < 11; i++) duel.playerImpact(hit);
  assert.equal(victim.damage.hp, 0); assert.equal(duel.rules!.score.A, 1); assert.equal(duel.feed.length, 1);
  duel.finishStep(); assert.equal(duel.finished, false);
  for (let i = 0; i < 300; i++) duel.beforeStep(1 / 60);
  assert.equal(victim.damage.hp, 100); assert.equal(duel.rules!.members[3].protection, 3);
  duel.playerImpact(hit); assert.equal(victim.damage.hp, 100);
  duel.reset(); assert.deepEqual(duel.rules!.score, { A: 0, B: 0 }); assert.equal(duel.feed.length, 0);
  duel.dispose(); player.dispose();
} finally { map.dispose(); scene.dispose(); engine.dispose(); }
console.log(`TEAM MATCH PASS: score, respawn/protection, time, results, real six-tank damage/reset, ${samples} film layout footprint samples against real Havok geometry.`);
