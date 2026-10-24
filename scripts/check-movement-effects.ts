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
  lateral: Vector3.Right(), surfaceName: 'side-slope-test', approachSpeed: 0,
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
assert.ok(run(-5).particles.filter(p => p.life > 0).every(p => p.velocity.z > 0), 'Geri sürüşte yayılım tersine dönmeli');
const airborne = new DustSimulation();
const c = contact(8); c.grounded = false;
for (let i = 0; i < 60; i++) airborne.step(1 / 60, [c], [1], 100);
assert.equal(airborne.emitted, 0);
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
assert.equal(pool.debris.length, 24); assert.ok(pool.debris.filter(p => p.age < p.life).length <= 24);
assert.ok(pool.debrisEmitted <= 18 * 602, 'Uzun sürüşte taş üretim bütçesi korunmalı');
pool.reset(); assert.equal(pool.liveCount, 0); assert.equal(pool.emitted, 0);

function eventRun(fps: number) {
  const simulation = new DustSimulation(), clock = new FixedStep();
  const sides = Array.from({ length: 12 }, (_, i) => i < 6 ? -1 : 1);
  let tick = 0;
  for (let frame = 0; frame < fps * 4; frame++) clock.advance(1 / fps, dt => {
    const speed = tick < 60 ? 8 : Math.max(0, 8 - (tick - 60) * 0.1);
    const contacts = sides.map(side => {
      const c = contact(speed); c.point.x = side;
      c.grounded = !(tick >= 160 && tick < 180 && side === -1);
      c.approachSpeed = tick === 180 && side === -1 ? 3 : 0;
      return c;
    });
    simulation.step(dt, contacts, sides, 100, 1, tick >= 60 ? 1 : 0, speed); tick++;
  });
  return simulation;
}
const events = eventRun(60);
assert.equal(events.brakeEvents, 1, 'Basılı fren tek puf üretmeli');
assert.equal(events.landingEvents, 1, 'Altı temas tek palet inişine birleşmeli');
assert.ok(events.debrisEmitted > 0 && events.debrisEmitted <= 4 * 18);
for (const direction of [-1, 1]) {
  const stopping = new DustSimulation();
  for (let tick = 0; tick < 120; tick++) {
    const speed = direction * Math.max(0, 8 - tick * 0.1);
    stopping.step(1 / 60, [contact(speed)], [1], 100, 1, 1, speed);
  }
  assert.equal(stopping.brakeEvents, 1, 'İleri ve geri fren tek puf üretmeli');
}
for (const density of [0, 1]) {
  const quiet = new DustSimulation();
  for (let tick = 0; tick < 120; tick++) {
    const speed = Math.max(0, 8 - tick * 0.1);
    quiet.step(1 / 60, [contact(speed)], [1], 100, density, density === 0 ? 1 : 0, speed);
  }
  assert.equal(quiet.brakeEvents, 0, 'Efekt kapalıyken veya frensiz yavaşlamada puf yok');
  if (density === 0) { assert.equal(quiet.emitted, 0); assert.equal(quiet.debrisEmitted, 0); }
}
for (const fps of [30, 120]) {
  const other = eventRun(fps);
  assert.deepEqual([other.emitted, other.debrisEmitted, other.brakeEvents, other.landingEvents],
    [events.emitted, events.debrisEmitted, events.brakeEvents, events.landingEvents]);
  assert.deepEqual(other.debris, events.debris, 'Taş balistiği render FPS ile değişmemeli');
}
const landing = new DustSimulation();
const landingContacts = Array.from({ length: 12 }, (_, i) => { const c = contact(0); c.point.x = i < 6 ? -1 : 1; return c; });
const landingSides = landingContacts.map(c => c.point.x);
const landingTick = () => landing.step(1 / 60, landingContacts, landingSides, 100);
landingTick(); assert.equal(landing.landingEvents, 0, 'Başlangıçta sahte iniş yok');
landingContacts.slice(0, 6).forEach(c => { c.grounded = false; });
for (let i = 0; i < 12; i++) landingTick();
landingContacts.slice(0, 6).forEach(c => { c.grounded = true; c.approachSpeed = 4; });
for (let i = 0; i < 14; i++) landingTick();
assert.equal(landing.landingEvents, 1);
assert.ok(landing.emitted > 0 && landing.particles.filter(p => p.life > 0).every(p => p.position.x < 0), 'Puf sadece inen tarafta');
landing.reset(); landingTick(); assert.equal(landing.emitted, 0, 'Reset olay/hız geçmişini temizlemeli');
for (const airTicks of [2, 12]) {
  landing.reset(); landingContacts.forEach(c => { c.grounded = false; });
  for (let i = 0; i < airTicks; i++) landingTick();
  landingContacts.forEach(c => { c.grounded = true; c.approachSpeed = airTicks === 2 ? 4 : 0.5; });
  for (let i = 0; i < 20; i++) landingTick();
  assert.equal(landing.landingEvents, 0, 'Kısa temas kaybı veya zayıf darbe puf üretmemeli');
}
for (const surface of ['tree-collider-1', 'boulder-1', 'unknown']) {
  const simulation = new DustSimulation(), c = contact(8); c.surfaceName = surface;
  for (let i = 0; i < 120; i++) simulation.step(1 / 60, [c], [1], 100);
  assert.equal(simulation.debrisEmitted, 0, 'Kaya/ağaç/bilinmeyen yüzey çakıl kaynağı değil');
}
assert.equal(run(0).debrisEmitted, 0);
assert.ok(run(0, 60, 3).debrisEmitted > 0, 'Yerinde dönüş taş üretmeli');
const gravel = run(8);
assert.ok(gravel.debris.some(p => p.age < p.life));
assert.ok(gravel.debris.filter(p => p.life > 0).every(p => p.size >= 0.01 && p.size <= 0.04));
for (let i = 0; i < 60; i++) gravel.step(1 / 60, [], [], 100);
assert.ok(gravel.debris.every(p => p.age >= p.life), 'Balistik parçalar kısa ömürlü olmalı');
assert.equal(gravel.debris.length, 24);
events.reset(); assert.equal(events.debrisEmitted, 0); assert.equal(events.brakeEvents, 0); assert.equal(events.landingEvents, 0);

const havok = await HavokPhysics({ wasmBinary: await readFile(new URL('../node_modules/@babylonjs/havok/lib/esm/HavokPhysics.wasm', import.meta.url)) });
const engine = new NullEngine(), scene = new Scene(engine);
new FreeCamera('test-camera', new Vector3(0, 5, -15), scene);
scene.enablePhysics(new Vector3(0, -9.81, 0), new HavokPlugin(true, havok)); scene.physicsEnabled = false;
const ground = MeshBuilder.CreateBox('side-slope-test', { width: 500, depth: 500, height: 1 }, scene); ground.position.y = -0.5;
const floor = new PhysicsAggregate(ground, PhysicsShapeType.BOX, { mass: 0 }, scene);
const tank = await loadTankModel(scene, new Uint8Array(await readFile(new URL('../assets/tanks/iron_dust_01/iron_dust_01.glb', import.meta.url))), Vector3.Zero());
const vehicle = new TankVehicle(scene, extractTankRig(tank), Vector3.Zero());
const resources = () => [scene.spriteManagers?.length ?? 0, scene.textures.length, scene.meshes.length, scene.materials.length];
const baseline = resources();
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
  for (let i = 0; i < 160; i++) tick(0, 0);
  assert.ok(effects.simulation.landingEvents > 0, 'Gerçek Havok düşüşünde iniş algılanmalı');
  effects.dispose();
  assert.deepEqual(resources(), baseline, 'Sprite/texture/mesh/material kaynakları temizlenmeli');
}
vehicle.dispose(); tank.dispose(); floor.dispose(); ground.dispose(); scene.dispose(); engine.dispose();
console.log('Efekt kontrolleri geçti: fren tek puf, taraf başına iniş, küçük darbe kapısı, taş balistiği/yüzey/24 havuz, 30/60/120 FPS, 10 dk havuz, gerçek Havok inişi ve üç kaynak temizleme çevrimi.');
