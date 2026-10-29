import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import HavokPhysics from '@babylonjs/havok';
import { HavokPlugin, MeshBuilder, NullEngine, PhysicsAggregate, PhysicsShapeType, Scene, Vector3 } from '@babylonjs/core';
import { FixedStep } from '../src/game/core/fixedStep.ts';
import { LANE_DRONES, LaneDroneModel, type DroneTarget } from '../src/game/combat/LaneDroneModel.ts';
import { LaneDrones } from '../src/game/combat/LaneDrones.ts';
import { freshDamage } from '../src/game/combat/DamageModel.ts';

const step = 1 / 60;
function advance(model: LaneDroneModel, seconds: number, targets: DroneTarget[] = [], sight = true) {
  const events: string[] = [];
  for (let i = 0; i < Math.round(seconds / step); i++) model.update(step, targets, () => sight, () => true,
    ({ shooter, target }) => { events.push(`${shooter.id}:${target.id}`); });
  return events;
}
const model = new LaneDroneModel(() => 0);
advance(model, 29); assert.equal(model.drones.length, 0);
advance(model, 1); assert.equal(model.wave, 1); assert.equal(model.drones.length, 18);
for (const team of ['A', 'B']) for (let lane = 0; lane < 3; lane++) {
  const drones = model.drones.filter(d => d.team === team && d.lane === lane);
  assert.equal(drones.length, 3); assert.ok(drones.every(d => team === 'A' ? d.position.z < -260 : d.position.z > 260));
}
advance(model, 30); assert.equal(model.wave, 2); assert.equal(model.drones.length, 36);
// Pin a single unit to distinguish target pursuit, friendly fire and a genuine lane movement.
model.reset(); advance(model, 30);
const drone = model.drones[0]; model.drones.splice(1); drone.cooldown = 0;
const start = drone.position.clone();
const target = { id: 'enemy', team: 'B' as const, position: start.add(new Vector3(12, 0, 0)), hp: 100 };
const friend = { ...target, id: 'friend', team: 'A' as const };
assert.equal(advance(model, 1, [target, friend]).length, 1, 'one shot/second, enemies only');
assert.ok(Vector3.Distance(start, drone.position) < 1e-8, 'holds lane while firing');
target.position.x += 100;
assert.equal(advance(model, 1, [target, friend]).length, 0, 'no fire beyond range');
assert.ok(drone.position.z > start.z, 'continues lane rather than pursuing the target');
target.position.copyFrom(drone.position.add(new Vector3(12, 0, 0)));
assert.equal(advance(model, 1, [target], false).length, 0, 'blocked line of sight prevents fire');
const beforeBlocked = drone.position.clone();
model.update(step, [], () => false, () => false, () => assert.fail('no target'));
assert.deepEqual(drone.position, beforeBlocked, 'movement cannot cross blocked geometry');
// Long blocked battles stay bounded; expired units free capacity and new waves resume.
model.reset();
for (let i = 0; i < 600 / step; i++) {
  model.update(step, [], () => false, () => false, () => {});
  assert.ok(model.drones.length <= 108);
}
assert.equal(model.wave, 20); assert.ok(model.drones.every(d => d.age <= LANE_DRONES.lifetime));
assert.ok(model.drones.some(d => Number(d.id.split('-').at(-1)) > 108), 'old units retire and replacements arrive');
model.reset(); assert.equal(model.drones.length, 0); assert.equal(model.wave, 0);
advance(model, 29); assert.equal(model.drones.length, 0, 'reset restarts the entire wave timer');
const snapshots = [30, 60, 120].map(fps => {
  const m = new LaneDroneModel(() => 0), clock = new FixedStep();
  for (let frame = 0; frame < fps * 61; frame++) clock.advance(1 / fps, dt => m.update(dt, [], () => false, () => true, () => {}));
  return m.drones.map(d => [d.id, ...d.position.asArray(), d.hp]);
});
assert.deepEqual(snapshots[0], snapshots[1]); assert.deepEqual(snapshots[1], snapshots[2]);

const wasmBinary = await readFile(new URL('../node_modules/@babylonjs/havok/lib/esm/HavokPhysics.wasm', import.meta.url));
const engine = new NullEngine(), scene = new Scene(engine);
scene.enablePhysics(new Vector3(0, -9.81, 0), new HavokPlugin(true, await HavokPhysics({ wasmBinary })));
scene.physicsEnabled = false;
const physics = scene.getPhysicsEngine()!; physics.setTimeStep(step);
const resources = () => [scene.meshes.length, scene.transformNodes.length, scene.materials.length, physics.getBodies().length];
const base = resources();
for (let cycle = 0; cycle < 2; cycle++) {
  const tankNode = MeshBuilder.CreateBox('target', { width: 3, height: 2, depth: 5 }, scene);
  tankNode.position.set(-10, 1, -290);
  const tankBody = new PhysicsAggregate(tankNode, PhysicsShapeType.BOX, { mass: 0 }, scene);
  const damage = freshDamage(), member = { vehicle: { node: tankNode, body: tankBody.body }, damage, team: 'B' as const };
  const system = new LaneDrones(scene, () => [member]);
  for (let tick = 0; tick < 30 / step; tick++) { system.fixedUpdate(step); physics._step(step); }
  assert.equal(system.model.drones.length, 18);
  assert.equal(physics.getBodies().length, base[3] + 19, 'one trigger body per unit plus tank');
  const own = system.model.drones.find(d => d.team === 'A')!;
  const from = own.position.add(new Vector3(0, .6, -5)), to = own.position.add(new Vector3(0, .6, 5));
  const query = physics.raycast(from, to, { shouldHitTriggers: true });
  assert.ok(query.hasHit, 'swept shell ray hits drone trigger');
  const ignored = physics.raycast(from, to);
  assert.equal(ignored.hasHit, false, 'units do not act as solid tank obstacles');
  const hit = { body: query.body, point: query.hitPointWorld.clone(), normal: query.hitNormalWorld.clone(), distance: query.hitDistance };
  const initial = own.hp;
  assert.equal(system.hit(hit, 'A', 25), true); assert.equal(own.hp, initial, 'friendly hit absorbed without damage');
  for (let i = 0; i < 3; i++) system.hit(hit, 'B', LANE_DRONES.mgDamage);
  assert.equal(own.hp, 5); system.hit(hit, 'B', LANE_DRONES.mgDamage); assert.equal(own.hp, 0, 'four MG hits destroy');
  physics._step(step);
  assert.notEqual(physics.raycast(from, to, { shouldHitTriggers: true }).body, hit.body, 'destroyed body is removed immediately');
  let hits = 0;
  system.onTankHit = () => hits++;
  system.blocksSight = () => true;
  for (let tick = 0; tick < 120; tick++) { system.fixedUpdate(step); physics._step(step); }
  assert.equal(damage.hp, 100, 'smoke blocks drone fire');
  system.blocksSight = () => false;
  for (let tick = 0; tick < 120; tick++) { system.fixedUpdate(step); physics._step(step); system.render(.5); }
  assert.ok(hits > 0 && damage.hp < 100 && damage.hp >= 90, `light tank damage, got ${damage.hp}`);
  assert.ok(Object.values(damage.modules).every(hp => hp === 100), 'small arms leave modules intact');
  const hp = damage.hp, count = system.model.drones.length, elapsed = system.model.elapsed;
  system.fixedUpdate(31, true); assert.equal(damage.hp, hp); assert.equal(system.model.elapsed, elapsed); assert.equal(system.model.drones.length, count);
  system.reset(); assert.equal(system.model.drones.length, 0); assert.equal(physics.getBodies().length, base[3] + 1);
  system.fixedUpdate(step); assert.equal(system.model.drones.length, 0);
  system.dispose(); tankBody.dispose(); tankNode.dispose();
  assert.deepEqual(resources(), base, 'all bodies, meshes, transforms and materials released');
}
scene.dispose(); engine.dispose();
console.log('PASS: 30 s / 3 lanes / 18 units, lane-only combat, range/sight, lifetime/cap, FPS, Havok hits, friendly fire, MG, weak tank damage, reset/dispose.');
