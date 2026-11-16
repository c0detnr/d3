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
import { chooseSpawn, seededRandom, spawnYaw, SPAWN_RULES } from '../src/game/combat/spawnSelection.ts';

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

// Random spawn selection: safety distance, no shared spawn, LOS preference, fallback and determinism.
const flat = (a: { x: number; z: number }, b: { x: number; z: number }) => Math.hypot(a.x - b.x, a.z - b.z);
for (const team of ['A', 'B'] as const) {
  const pool = layout.spawnPool!(team);
  assert.ok(pool.length >= 8, `${team} pool has at least eight points`);
  const half = pool.every(p => team === 'A' ? p.z < -60 : p.z > -40);
  assert.ok(half, `${team} pool stays on its own half`);
}
{
  const pool = layout.spawnPool!('A'), random = seededRandom(7);
  const threats = [pool[0], pool[3]].map(p => ({ x: p.x + 20, y: p.y, z: p.z }));
  for (let i = 0; i < 200; i++) {
    const occupied = [pool[i % pool.length]];
    const p = chooseSpawn(pool, { threats, occupied, random });
    assert.ok(threats.every(t => flat(t, p) >= SPAWN_RULES.minEnemyDistance), 'spawn keeps 60 m from enemies');
    assert.ok(occupied.every(o => flat(o, p) >= SPAWN_RULES.minTankGap), 'two tanks never share a spawn');
  }
  const seen = pool.filter((_, i) => i % 2 === 0);
  for (let i = 0; i < 50; i++) {
    const p = chooseSpawn(pool, { threats: [{ x: 0, y: 0, z: 400 }], occupied: [], random, visible: (_t, q) => seen.includes(q) });
    assert.ok(!seen.includes(p), 'hidden spawns preferred over spawns in enemy sight');
  }
  // Every point unsafe: the free point farthest from all enemies.
  const crowd = pool.map(p => ({ x: p.x + 5, y: p.y, z: p.z }));
  const far = chooseSpawn(pool, { threats: crowd, occupied: [], random });
  assert.ok(pool.every(p => Math.min(...crowd.map(t => flat(t, p))) <= Math.min(...crowd.map(t => flat(t, far))) + 1e-9), 'fallback picks farthest');
  const draw = (seed: number) => { const r = seededRandom(seed); return Array.from({ length: 12 }, () => pool.indexOf(chooseSpawn(pool, { threats: [], occupied: [], random: r }))); };
  assert.deepEqual(draw(42), draw(42), 'same seed, same spawns');
  assert.notDeepEqual(draw(42), draw(43), 'new seed, new spawns');
  const yaw = spawnYaw({ x: 0, y: 0, z: 0 }, [{ x: 0, y: 0, z: 100 }, { x: 80, y: 0, z: 0 }], { x: 0, y: 0, z: -1 });
  assert.ok(Math.abs(yaw - Math.PI / 2) < 1e-9, 'spawn faces the nearest threat');
}

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
  for (const team of ['A', 'B'] as const) for (const p of layout.spawnPool!(team)) {
    // Whole hull at every heading: a 6 m radius ring plus centre, against real colliders.
    clear(p.x, p.z);
    for (let a = 0; a < 8; a++) clear(p.x + Math.cos(a * Math.PI / 4) * 6, p.z + Math.sin(a * Math.PI / 4) * 6);
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
  const duel = new TeamDuel(scene, { tank: player.tank, vehicle: player.vehicle, damage: player.damage, team: 'A' }, layout, 1234);
  let playerYaw: number | undefined;
  duel.onSpawn = yaw => { playerYaw = yaw; };
  await duel.load(source);
  assert.ok(duel.navigation && duel.navigation.nodes.length > 1000, 'film collider network loaded');
  // Every pool point is on the largest connected navigation component.
  const nav = duel.navigation!, reach = new Uint8Array(nav.nodes.length), stack = [nav.nearest(new Vector3(0, 0, -50))];
  reach[stack[0]] = 1;
  while (stack.length) for (const j of nav.edges[stack.pop()!]) if (!reach[j]) { reach[j] = 1; stack.push(j); }
  for (const team of ['A', 'B'] as const) for (const p of layout.spawnPool!(team)) {
    const n = nav.nearest(new Vector3(p.x, p.y, p.z), true);
    assert.ok(n >= 0 && reach[n] && flat(nav.nodes[n], p) < 1, `spawn ${p.x},${p.z} on the navigation network`);
  }
  const checkSpawns = (label: string) => {
    const at = duel.spawnPoints;
    duel.members.forEach((m, i) => {
      assert.ok(layout.spawnPool!(m.team).some(p => flat(p, at[i]) < .5), `${label}: ${m.team} spawns from its pool`);
      for (let j = 0; j < i; j++) {
        assert.ok(flat(at[i], at[j]) >= SPAWN_RULES.minTankGap, `${label}: distinct spawns`);
        if (duel.members[j].team !== m.team) assert.ok(flat(at[i], at[j]) >= SPAWN_RULES.minEnemyDistance, `${label}: enemies ≥ 60 m apart`);
      }
    });
    return at.map(p => `${p.x.toFixed(0)},${p.z.toFixed(0)}`).join(' ');
  };
  const firstSpawns = checkSpawns('match start');
  assert.ok(playerYaw !== undefined, 'player placed through the spawn hook');
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
  {
    const at = victim.vehicle.node.position;
    assert.ok(layout.spawnPool!(victim.team).some(p => flat(p, at) < .5), 'respawn from the pool');
    for (const m of duel.members) if (m !== victim) {
      assert.ok(flat(m.vehicle.node.position, at) >= SPAWN_RULES.minTankGap, 'respawn does not overlap a tank');
      if (m.team !== victim.team && m.damage.hp > 0) assert.ok(flat(m.vehicle.node.position, at) >= SPAWN_RULES.minEnemyDistance, 'respawn ≥ 60 m from living enemies');
    }
  }
  duel.playerImpact(hit); assert.equal(victim.damage.hp, 100);
  duel.reset(); assert.deepEqual(duel.rules!.score, { A: 0, B: 0 }); assert.equal(duel.feed.length, 0);
  const resetSpawns = checkSpawns('reset');
  assert.notEqual(resetSpawns, firstSpawns, 'a new round draws new spawns');
  console.log(`spawns seed 1234: ${firstSpawns} | after reset: ${resetSpawns}`);
  duel.dispose(); player.dispose();
} finally { map.dispose(); scene.dispose(); engine.dispose(); }
console.log(`TEAM MATCH PASS: score, respawn/protection, time, results, real six-tank damage/reset, random spawn pool (safety, overlap, LOS preference, fallback, determinism, nav reachability), ${samples} film layout footprint samples against real Havok geometry.`);
