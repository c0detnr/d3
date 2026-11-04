import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import HavokPhysics from '@babylonjs/havok';
import { FreeCamera, HavokPlugin, MeshBuilder, NullEngine, PhysicsAggregate, PhysicsShapeType, Scene, Vector3 } from '@babylonjs/core';
import { DustSimulation, dustSurfaceFactor } from '../src/game/effects/DustSimulation.ts';
import { MovementEffects } from '../src/game/effects/MovementEffects.ts';
import { FixedStep } from '../src/game/core/fixedStep.ts';
import { TankVehicle, type ContactState } from '../src/game/vehicle/TankVehicle.ts';
import { loadTankModel } from '../src/game/vehicle/loadTankModel.ts';
import { extractTankRig } from '../src/game/vehicle/tankRig.ts';

const contact = (speed: number, sideSpeed = 0): ContactState => ({
  compression: 0.2, grounded: true, load: 100, speed, sideSpeed,
  point: Vector3.Zero(), normal: Vector3.Up(), velocity: new Vector3(sideSpeed, 0, speed),
  lateral: Vector3.Right(), surfaceName: 'side-slope-test',
});
function run(speed: number, fps = 60, sideSpeed = 0) {
  const simulation = new DustSimulation(), clock = new FixedStep();
  const contacts = Array.from({ length: 12 }, () => contact(speed, sideSpeed));
  for (let frame = 0; frame < fps * 2; frame++) clock.advance(1 / fps, dt => simulation.step(dt, contacts, contacts.map((_, i) => i < 6 ? -1 : 1), 100));
  return simulation;
}
assert.equal(run(0).emitted, 0);
assert.ok(run(30, 60, 10).emitted <= 120 * 2, 'Toplam üretim 120/sn sınırını aşmamalı');
assert.ok(run(8).emitted > run(1).emitted * 1.5, 'Hızla yoğunlaşmalı');
assert.ok(run(0, 60, 2).emitted > 0, 'Yanal kaymada dönüş tozu');
for (const fps of [30, 120]) {
  const a = run(5, fps), b = run(5);
  assert.equal(a.emitted, b.emitted);
  assert.deepEqual(a.particles.map(p => p.position.asArray()), b.particles.map(p => p.position.asArray()));
}
assert.equal(run(1).clodsEmitted, 0, 'Yavaş sürüşte çamur atılmaz');
assert.ok(run(8).clodsEmitted > 0, 'Hızlı sürüşte çamur atılır');
const clodRun = run(8);
for (let i = 0; i < 90; i++) clodRun.step(1 / 60, [], [], 100);
assert.equal(clodRun.liveClods, 0, 'Çamur yere düşüp kaybolur');
assert.equal(run(5, 30).clodsEmitted, run(5, 120).clodsEmitted);
assert.ok(run(-5).particles.filter(p => p.life > 0).every(p => p.velocity.z > 0), 'Geri sürüşte yayılım tersine dönmeli');
const airborne = new DustSimulation();
const c = contact(8); c.grounded = false;
for (let i = 0; i < 60; i++) airborne.step(1 / 60, [c], [1], 100);
assert.equal(airborne.emitted + airborne.clodsEmitted, 0);
c.grounded = true; c.load = 0;
for (let i = 0; i < 60; i++) airborne.step(1 / 60, [c], [1], 100);
assert.equal(airborne.emitted, 0);
assert.equal(dustSurfaceFactor('tree-collider-1', Vector3.Zero()), 0);
assert.ok(dustSurfaceFactor('boulder-1', Vector3.Zero()) < dustSurfaceFactor('natural-terrain', Vector3.Zero()));
const pool = run(8);
const p = pool.particles.find(p => p.life > 0)!; const before = p.position.clone();
pool.step(1 / 60, [], [], 100);
assert.ok(Vector3.Distance(before, p.position) < 0.1, 'Eski toz tanka bağlanmamalı');
for (let i = 0; i < 36000; i++) pool.step(1 / 60, Array.from({ length: 12 }, () => contact(30, 10)), Array(12).fill(1), 100);
assert.equal(pool.particles.length, 320); assert.ok(pool.liveCount <= 320);
pool.reset(); assert.equal(pool.liveCount, 0); assert.equal(pool.emitted, 0);

const havok = await HavokPhysics({ wasmBinary: await readFile(new URL('../node_modules/@babylonjs/havok/lib/esm/HavokPhysics.wasm', import.meta.url)) });
const engine = new NullEngine(), scene = new Scene(engine);
new FreeCamera('test-camera', new Vector3(0, 5, -15), scene);
scene.enablePhysics(new Vector3(0, -9.81, 0), new HavokPlugin(true, havok)); scene.physicsEnabled = false;
const ground = MeshBuilder.CreateBox('side-slope-test', { width: 500, depth: 500, height: 1 }, scene); ground.position.y = -0.5;
const floor = new PhysicsAggregate(ground, PhysicsShapeType.BOX, { mass: 0 }, scene);
const tank = await loadTankModel(scene, new Uint8Array(await readFile(new URL('../assets/tanks/iron_dust_01/iron_dust_01.glb', import.meta.url))), Vector3.Zero());
const vehicle = new TankVehicle(scene, extractTankRig(tank), Vector3.Zero());
const baseline = [scene.spriteManagers?.length ?? 0, scene.textures.length];
for (let cycle = 0; cycle < 3; cycle++) {
  vehicle.reset();
  const effects = new MovementEffects(scene, vehicle);
  const tick = (throttle: number, steer: number) => {
    vehicle.beforeStep(1 / 60, { throttle, steer, brake: 0 });
    effects.fixedUpdate(vehicle, 1 / 60);
    scene.getPhysicsEngine()!._step(1 / 60); vehicle.afterStep(); effects.render(0.5);
  };
  for (let i = 0; i < 180; i++) tick(0, 0);
  assert.equal(effects.simulation.emitted, 0, 'Gerçek Havok duruşunda toz yok');
  for (let i = 0; i < 180; i++) tick(0, 1);
  assert.ok(effects.simulation.emitted > 0, 'Gerçek yerinde dönüşte toz var');
  assert.ok(vehicle.contacts.some(c => c.grounded && c.surfaceName === 'side-slope-test'));
  effects.reset(); vehicle.reset(new Vector3(0, 20, 0));
  for (let i = 0; i < 20; i++) tick(1, 1);
  assert.equal(effects.simulation.emitted, 0, 'Gerçek havada gaz/dönüşte toz yok');
  effects.dispose();
  assert.deepEqual([scene.spriteManagers?.length ?? 0, scene.textures.length], baseline, 'Sprite/texture kaynakları temizlenmeli');
}
vehicle.dispose(); tank.dispose(); floor.dispose(); ground.dispose(); scene.dispose(); engine.dispose();
console.log('Toz kontrolleri geçti: duruş/yük/hava, hız, geri, dönüş, 30/60/120 FPS, 10 dk havuz, gerçek Havok, üç kaynak temizleme çevrimi.');
