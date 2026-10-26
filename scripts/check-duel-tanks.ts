import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import HavokPhysics from '@babylonjs/havok';
import { HavokPlugin, MeshBuilder, NullEngine, PhysicsAggregate, PhysicsShapeType, Scene, Vector3, type PhysicsEngineV2 } from '@babylonjs/core';
import { DuelTank } from '../src/game/combat/DuelTank.ts';
import { FixedStep } from '../src/game/core/fixedStep.ts';
import type { DriveCommand } from '../src/game/input/DriveInput.ts';
import { createTestGround } from '../src/game/world/createTestGround.ts';
import { terrainHeight } from '../src/game/world/terrain.ts';

// Run directly: node --experimental-strip-types scripts/check-duel-tanks.ts
// C1 only: real models, shared physics, reset/dispose; no AI or damage simulation.
const dt = 1 / 60;
const parked: DriveCommand = { throttle: 0, steer: 0, brake: 1 };
const forward: DriveCommand = { throttle: 1, steer: 0, brake: 0 };
const wasmBinary = new Uint8Array(await readFile(new URL('../node_modules/@babylonjs/havok/lib/esm/HavokPhysics.wasm', import.meta.url))).buffer;
const havok = await HavokPhysics({ wasmBinary });
const sources = await Promise.all(['01', '02'].map(id => readFile(new URL(`../assets/tanks/iron_dust_${id}/iron_dust_${id}.glb`, import.meta.url))));
const engine = new NullEngine();
const scene = new Scene(engine);
scene.enablePhysics(new Vector3(0, -9.81, 0), new HavokPlugin(true, havok));
scene.physicsEnabled = false;
const physics = scene.getPhysicsEngine() as PhysicsEngineV2;
physics.setTimeStep(dt);
const counts = () => ({ meshes: scene.meshes.length, materials: scene.materials.length,
  nodes: scene.transformNodes.length, bodies: physics.getBodies().length });
const empty = counts();
type Pair = readonly [DuelTank, DuelTank];
async function loadPair(playerModel: number, spawns: readonly [Vector3, Vector3]): Promise<Pair> {
  const player = await DuelTank.load(scene, sources[playerModel], spawns[0]);
  try {
    const opponent = await DuelTank.load(scene, sources[1 - playerModel], spawns[1]);
    // DuelTank is an opponent wrapper and resets to pi. Human fixture must face +Z.
    player.vehicle.reset(spawns[0], 0);
    player.render(1);
    assert.equal(physics.getBodies().length, baselineBodies + 2, 'Exactly one rigid hull per tank');
    return [player, opponent];
  } catch (error) { player.dispose(); throw error; }
}
let baselineBodies = 0;
function tick(pair: Pair, commands: readonly [DriveCommand, DriveCommand] = [parked, parked]) {
  // Both force passes precede the ONE world step; neither wrapper owns the world clock.
  pair[0].beforeStep(dt, commands[0]); pair[1].beforeStep(dt, commands[1]);
  physics._step(dt);
  pair[0].afterStep(dt); pair[1].afterStep(dt);
}
function run(pair: Pair, seconds: number, commands?: readonly [DriveCommand, DriveCommand]) {
  for (let step = 0; step < Math.round(seconds / dt); step++) tick(pair, commands);
}
function resetPair(pair: Pair, positions?: readonly [Vector3, Vector3]) {
  for (const tank of pair) tank.reset();
  pair[0].vehicle.reset(positions?.[0] ?? pair[0].vehicle.spawn, 0);
  if (positions) pair[1].vehicle.reset(positions[1], Math.PI);
  pair.forEach(tank => tank.render(1));
}
function assertSettled(pair: Pair, label: string) {
  const heights = pair.map(tank => tank.vehicle.node.position.y);
  run(pair, 2);
  pair.forEach((tank, index) => {
    const v = tank.vehicle;
    assert.ok(Math.abs(v.node.position.y - heights[index]) < 0.003,
      `${label}, hull ${index}: stable suspension height (2 s drift=${v.node.position.y - heights[index]} m, speed=${v.body.getLinearVelocity().length()} m/s, position=${v.node.position.asArray()})`);
    assert.ok(v.body.getLinearVelocity().length() < 0.1, `${label}: settled velocity`);
    assert.equal(v.contacts.filter(c => c.grounded).length, v.contacts.length, `${label}: both tracks grounded`);
    assert.ok(v.contacts.every(c => Math.abs(c.compression - v.definition.staticCompression) < 0.025), `${label}: static spring compression`);
  });
}
function assertReset(pair: Pair) {
  for (const tank of pair) {
    tank.vehicle.body.setLinearVelocity(new Vector3(2, 3, 4));
    tank.vehicle.body.setAngularVelocity(new Vector3(0.2, 0.3, 0.4));
    for (let step = 0; step < 60; step++) tank.turret.fixedUpdateManual(1, 0.02, dt);
    assert.ok(Math.abs(tank.turret.angles.yaw) > 0.1 && Math.abs(tank.turret.angles.elevation) > 0.05, 'Turret state was exercised');
    assert.ok(tank.weapon.fire(), 'Fresh weapon fires');
    tank.weapon.fixedUpdate(dt * 2);
    assert.ok(tank.weapon.reloadRemaining > 4 && tank.weapon.recoilOffset > 0, 'Reload and recoil were exercised');
    assert.equal(tank.weapon.fire(), undefined, 'Reload blocks a second shot');
  }
  resetPair(pair);
  for (const [index, tank] of pair.entries()) {
    const v = tank.vehicle;
    assert.equal(v.body.getLinearVelocity().length(), 0, 'Reset linear velocity');
    assert.equal(v.body.getAngularVelocity().length(), 0, 'Reset angular velocity');
    assert.ok(Vector3.Distance(v.node.position, v.spawn.add(v.rig.center)) < 1e-6, 'Reset spawn');
    assert.ok(Math.abs(v.current.rotation.toEulerAngles().y - (index ? Math.PI : 0)) < 1e-6, 'Reset role heading');
    assert.equal(v.speed, 0); assert.equal(v.driveForce, 0);
    assert.deepEqual(tank.turret.angles, { yaw: 0, elevation: 0 });
    assert.equal(tank.turret.limited, false);
    assert.equal(tank.weapon.reloadRemaining, 0); assert.equal(tank.weapon.recoilOffset, 0);
    assert.equal(tank.weapon.shotsFired, 0); assert.equal(tank.weapon.ready, true);
    const ray = tank.turret.getMuzzleRay();
    assert.ok(Vector3.Dot(ray.direction, index ? Vector3.Backward() : Vector3.Forward()) > 0.999, 'Reset muzzle follows hull, not stale turret/recoil');
  }
}
try {
  const ground = MeshBuilder.CreateBox('duel-test-floor', { width: 500, depth: 500, height: 1 }, scene);
  ground.position.y = -0.5;
  const floor = new PhysicsAggregate(ground, PhysicsShapeType.BOX, { mass: 0, friction: 0.85, restitution: 0 }, scene);
  try {
    const baseline = counts(); baselineBodies = baseline.bodies;
    for (let cycle = 0; cycle < 3; cycle++) {
      const playerModel = cycle % 2;
      const pair = await loadPair(playerModel, [new Vector3(-12, 0, 0), new Vector3(12, 0, 0)]);
      try {
        resetPair(pair, [new Vector3(-12, 12, 0), new Vector3(12, 12, 0)]);
        const start = pair.map(tank => tank.vehicle.node.position.y);
        run(pair, 0.5);
        pair.forEach((tank, i) => {
          const v = tank.vehicle;
          assert.ok(Math.abs(v.body.getLinearVelocity().y + 9.81 * 0.5) < 0.03, 'Both hulls receive exactly one gravity step per tick');
          assert.ok(start[i] - v.node.position.y > 1.2 && start[i] - v.node.position.y < 1.3, 'Both hulls fall simultaneously');
          assert.equal(v.contacts.filter(c => c.grounded).length, 0);
        });
        run(pair, 6); assertSettled(pair, 'flat ground');
        assertReset(pair);

        // Drive into a braked, dynamic opponent. Check every step, not just the endpoint:
        // unconstrained travel would exceed 50 m and pass completely through the target.
        resetPair(pair, [new Vector3(0, 0, -12), Vector3.Zero()]);
        run(pair, 3);
        const halfLengths = (pair[0].vehicle.rig.size.z + pair[1].vehicle.rig.size.z) / 2;
        let minGap = Infinity;
        for (let step = 0; step < 8 * 60; step++) {
          tick(pair, [forward, parked]);
          const [a, b] = pair.map(tank => tank.vehicle.node.position);
          const gap = b.z - a.z - halfLengths;
          minGap = Math.min(minGap, gap);
          assert.ok(gap > -0.03, `Hull collision must prevent overlap/passing (3 cm solver tolerance): gap=${gap}`);
          assert.ok(Math.abs(a.x - b.x) < 0.1, 'Collision fixture stays head-on, not a lateral bypass');
        }
        assert.ok(minGap < 0.1, 'Driving hull actually reaches opponent collider');
        assert.ok(pair[0].vehicle.node.position.z > -8, 'Driving hull advanced before contact');
        console.log('collision', { cycle, playerModel: playerModel + 1, minGap, positions: pair.map(t => t.vehicle.node.position.asArray()) });

        const samples: { fps: number; positions: Vector3[]; velocities: Vector3[] }[] = [];
        for (const fps of [30, 60, 120]) {
          resetPair(pair);
          const clock = new FixedStep(); let steps = 0;
          for (let frame = 0; frame < fps * 10; frame++) {
            const result = clock.advance(1 / fps, () => {
              const time = steps++ * dt;
              tick(pair, [time >= 2 && time < 7 ? forward : parked,
                time >= 3 && time < 6 ? forward : parked]);
            });
            pair.forEach(tank => tank.render(result));
          }
          assert.equal(steps, 600, 'All render rates advance the same shared simulation ticks');
          samples.push({ fps, positions: pair.map(t => t.vehicle.current.position.clone()), velocities: pair.map(t => t.vehicle.body.getLinearVelocity().clone()) });
        }
        for (const sample of samples) for (let i = 0; i < 2; i++) {
          assert.ok(Vector3.Distance(sample.positions[i], samples[1].positions[i]) < 0.03, '30/60/120 FPS: each hull position agrees within 3 cm');
          assert.ok(Vector3.Distance(sample.velocities[i], samples[1].velocities[i]) < 0.03, '30/60/120 FPS: each hull velocity agrees within 0.03 m/s');
        }
        console.log('render rates', JSON.stringify(samples.map(s => ({ fps: s.fps, positions: s.positions.map(p => p.asArray()),
          positionErrors: s.positions.map((p, i) => Vector3.Distance(p, samples[1].positions[i])),
          velocityErrors: s.velocities.map((v, i) => Vector3.Distance(v, samples[1].velocities[i])) }))));
      } finally { pair.forEach(tank => tank.dispose()); }
      assert.deepEqual(counts(), baseline, `Load/dispose cycle ${cycle + 1}: mesh/material/node/body counts restored`);
    }
  } finally { floor.dispose(); ground.dispose(); }
  assert.deepEqual(counts(), empty, 'Flat fixture fully disposed');

  // Actual map coordinates and physical terrain/LOS, for BOTH model assignments.
  const world = createTestGround(scene);
  const mapFailures: unknown[] = [];
  try {
    const baseline = counts(); baselineBodies = baseline.bodies;
    const spawns: [Vector3, Vector3] = [new Vector3(-34, 0, -42), new Vector3(-28, terrainHeight(-28, -42), -42)];
    assert.ok(Vector3.Distance(world.spawn, spawns[0]) < 1e-6, 'Fixture matches actual player spawn');
    for (const playerModel of [0, 1]) {
      const pair = await loadPair(playerModel, spawns);
      try {
        // yaw 0/pi have the same axis-aligned hull bounds: X separation is a separating axis.
        const initialGap = pair[1].vehicle.node.position.x - pair[0].vehicle.node.position.x
          - (pair[0].vehicle.rig.size.x + pair[1].vehicle.rig.size.x) / 2;
        assert.ok(initialGap > 2, 'Actual map spawn hulls do not initially overlap');
        for (const [index, spawn] of spawns.entries()) {
          const hit = physics.raycast(spawn.add(new Vector3(0, 10, 0)), spawn.add(new Vector3(0, -3, 0)),
            { ignoreBody: pair[index].vehicle.body });
          assert.ok(hit.hasHit && Math.abs(hit.hitPointWorld.y - spawn.y) < 0.03, 'Real map terrain supports spawn');
        }
        const [a, b] = pair.map(t => t.vehicle.node.position);
        const from = a.add(new Vector3(pair[0].vehicle.rig.size.x / 2 + 0.15, 0, 0));
        const to = b.subtract(new Vector3(pair[1].vehicle.rig.size.x / 2 + 0.15, 0, 0));
        assert.equal(physics.raycast(from, to).hasHit, false, 'Physical LOS across spawn gap is unobstructed');
        const targetHit = physics.raycast(from, b);
        assert.ok(targetHit.hasHit && targetHit.body === pair[1].vehicle.body, 'Physical LOS reaches opposing hull first');
        console.log('actual map', { playerModel: playerModel + 1, initialGap, positions: pair.map(t => t.vehicle.node.position.asArray()) });
        run(pair, 5);
        // Keep both role/resource tests running even if the real-map spawn exposes a
        // production settling failure. Preserve the strict flat-ground acceptance.
        try { assertSettled(pair, `actual map, player model ${playerModel + 1}`); }
        catch (error) { mapFailures.push(error); }
        assertReset(pair);
      } finally { pair.forEach(tank => tank.dispose()); }
      assert.deepEqual(counts(), baseline, 'Actual-map pair disposal restores all resource counts');
    }
  } finally { world.dispose(); }
  assert.deepEqual(counts(), empty, 'World and both vehicles leave no mesh/material/node/body resources');
  if (mapFailures.length) throw new AggregateError(mapFailures, 'Actual-map C1 settling failed (both roles and cleanup were still tested)');
} finally { scene.dispose(); engine.dispose(); }
console.log('Passed: C1 real 01/02 GLBs in both roles, one shared Havok step, gravity/settling, hull collision, reset, 30/60/120 FPS, actual-map spawn/physical LOS, three load/dispose cycles.');
