import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import HavokPhysics from '@babylonjs/havok';
import { HavokPlugin, MeshBuilder, NullEngine, PhysicsAggregate, PhysicsShapeType, Scene, Vector3 } from '@babylonjs/core';
import { loadTankModel } from '../src/game/vehicle/loadTankModel.ts';
import { extractTankRig } from '../src/game/vehicle/tankRig.ts';
import { TankVehicle } from '../src/game/vehicle/TankVehicle.ts';
import { DriveInput, releasedKeys, type DriveKeys } from '../src/game/input/DriveInput.ts';
import { FixedStep } from '../src/game/core/fixedStep.ts';

const wasmBinary = await readFile(new URL('../node_modules/@babylonjs/havok/lib/esm/HavokPhysics.wasm', import.meta.url));
const havok = await HavokPhysics({ wasmBinary });
const engine = new NullEngine();
const scene = new Scene(engine);
scene.enablePhysics(new Vector3(0, -9.81, 0), new HavokPlugin(true, havok));
scene.physicsEnabled = false;
const physics = scene.getPhysicsEngine()!;
physics.setTimeStep(1 / 60);
const ground = MeshBuilder.CreateBox('driving-test-floor', { width: 1500, depth: 1500, height: 1 }, scene);
ground.position.y = -0.5;
const floor = new PhysicsAggregate(ground, PhysicsShapeType.BOX, { mass: 0, friction: 0.85, restitution: 0 }, scene);
const tankId = process.argv[2] === '02' ? '02' : '01';
const tank = await loadTankModel(scene, new Uint8Array(await readFile(new URL(`../assets/tanks/iron_dust_${tankId}/iron_dust_${tankId}.glb`, import.meta.url))), Vector3.Zero());
const rig = extractTankRig(tank);
const vehicle = new TankVehicle(scene, rig, Vector3.Zero());
const input = new DriveInput();
const results: Record<string, unknown> = {};
const idle = releasedKeys();
function tick(keys = idle) {
  const command = input.resolve(keys, vehicle.speed, 1 / 60);
  vehicle.beforeStep(1 / 60, command); physics._step(1 / 60); vehicle.afterStep();
}
function run(seconds: number, keys = idle) { for (let i = 0; i < Math.round(seconds * 60); i++) tick(keys); }
function reset(position = Vector3.Zero(), yaw = 0) { vehicle.reset(position, yaw); input.reset(); }
function yaw() { const q = vehicle.current.rotation; return Math.atan2(2 * (q.w * q.y + q.x * q.z), 1 - 2 * (q.y * q.y + q.x * q.x)); }
try {
  run(5);
  results.settle = { position: vehicle.node.position.asArray(), velocity: vehicle.body.getLinearVelocity().asArray(), contacts: vehicle.contacts.filter(c => c.grounded).length, compression: vehicle.contacts.map(c => c.compression) };
  console.log('settle', results.settle);
  const restingY = vehicle.node.position.y;
  run(2);
  assert.ok(Math.abs(vehicle.node.position.y - restingY) < 0.002 && vehicle.body.getLinearVelocity().length() < 0.1, 'Zeminde sakinleşmeli');
  assert.equal(vehicle.contacts.filter(c => c.grounded).length, tankId === '02' ? 14 : 12);
  assert.ok(Math.abs(vehicle.contacts[0].compression - vehicle.definition.staticCompression) < 0.025);
  reset(new Vector3(0, 20, 0)); run(0.5, { ...idle, forward: true, right: true });
  assert.equal(vehicle.driveForce, 0, 'Havada çekiş olmamalı');
  assert.equal(vehicle.contacts.filter(c => c.grounded).length, 0);
  assert.ok(Math.hypot(vehicle.body.getLinearVelocity().x, vehicle.body.getLinearVelocity().z) < 0.001);
  results.airborne = 'passed';
  reset(); run(3); run(6, { ...idle, forward: true });
  const forwardSpeed = vehicle.speed; const forwardDistance = vehicle.node.position.z;
  assert.ok(forwardSpeed > 7 && forwardSpeed <= vehicle.definition.forwardSpeed * 1.03, `İleri hız: ${forwardSpeed}`);
  run(4, { ...idle, reverse: true });
  results.forwardReverse = { forwardSpeed, forwardDistance, reverseSpeed: vehicle.speed, z: vehicle.node.position.z };
  console.log('forwardReverse', results.forwardReverse);
  assert.ok(vehicle.speed < -1 && vehicle.speed >= -vehicle.definition.reverseSpeed * 1.03);
  reset(); run(3); run(5, { ...idle, forward: true });
  run(2, { ...idle, brake: true });
  assert.ok(Math.abs(vehicle.speed) < 0.2, `Güçlü fren: ${vehicle.speed}`);
  results.brake = { speedAfterTwoSeconds: vehicle.speed };
  run(3, { ...idle, brake: true });
  assert.ok(Math.abs(vehicle.speed) < 0.02, 'Fren basılıyken duruş korunmalı');
  Object.assign(results.brake as object, { speedAfterFiveSeconds: vehicle.speed });
  const turns: number[] = [];
  for (const right of [true, false]) {
    reset(); run(3); run(2, { ...idle, right, left: !right });
    turns.push(yaw());
    assert.ok(Math.hypot(vehicle.node.position.x, vehicle.node.position.z) < 1, 'Yerinde dönüşte merkez kayması');
  }
  console.log('turns', turns);
  assert.ok(turns[0] > 0.3 && turns[1] < -0.3, 'Dönüş yönleri');
  assert.ok(Math.abs(turns[0] + turns[1]) < 0.08, 'Simetrik dönüş');
  results.pivotTurns = turns;
  const movingTurns: { x: number; yaw: number; speed: number }[] = [];
  for (const right of [true, false]) {
    reset(); run(3); run(3, { ...idle, forward: true });
    run(4, { ...idle, forward: true, right, left: !right });
    movingTurns.push({ x: vehicle.node.position.x, yaw: yaw(), speed: vehicle.speed });
  }
  console.log('movingTurns', movingTurns);
  assert.ok(movingTurns[0].x > 2 && movingTurns[1].x < -2, 'Hareketli dönüş yönleri');
  assert.ok(Math.abs(movingTurns[0].x + movingTurns[1].x) < 0.1, 'Hareketli dönüş simetrisi');
  results.movingTurns = movingTurns;
  reset(); run(3); run(4, { ...idle, forward: true });
  const poweredSpeed = vehicle.speed; run(3);
  assert.ok(vehicle.speed > 0 && vehicle.speed < poweredSpeed - 0.4, 'Gaz bırakınca yuvarlanma direnciyle yavaşlamalı');
  results.coast = { poweredSpeed, speedAfterThreeSeconds: vehicle.speed };
  reset(); run(3); run(18, { ...idle, forward: true });
  assert.ok(vehicle.speed <= vehicle.definition.forwardSpeed && vehicle.speed > vehicle.definition.forwardSpeed * 0.9, 'İleri hız yumuşak sınıra yaklaşmalı');
  results.sustainedForwardSpeed = vehicle.speed;
  // A frame does not change velocity directly at the speed cap.
  vehicle.body.setLinearVelocity(new Vector3(0, 0, 17));
  tick({ ...idle, forward: true });
  assert.ok(vehicle.speed > 16, 'Hız sınırı doğrudan hız kesmemeli');
  results.overspeed = vehicle.speed;

  const frameRates: Record<string, unknown>[] = [];
  for (const fps of [30, 60, 120]) {
    reset(); input.reset(); const clock = new FixedStep(); let stepIndex = 0;
    for (let frame = 0; frame < fps * 12; frame++) clock.advance(1 / fps, () => {
      const time = stepIndex++ / 60;
      tick({ ...idle, forward: time >= 2 && time < 8, right: time >= 5 && time < 7, brake: time >= 8 && time < 9 });
    });
    frameRates.push({ fps, steps: stepIndex, position: vehicle.node.position.asArray(), speed: vehicle.speed });
  }
  results.renderRates = frameRates;
  const baseline = frameRates[1];
  for (const sample of frameRates) {
    assert.equal(sample.steps, 720);
    const a = Vector3.FromArray(sample.position as number[]), b = Vector3.FromArray(baseline.position as number[]);
    assert.ok(Vector3.Distance(a, b) / Math.max(1, b.length()) < 0.05, 'Render FPS konum farkı %5 altında');
    assert.ok(Math.abs(Number(sample.speed) - Number(baseline.speed)) / Math.max(1, Math.abs(Number(baseline.speed))) < 0.05);
  }
  // Raised two-sided ramp and a separate side slope. Real static mesh queries and hull contacts.
  const ramps: PhysicsAggregate[] = [];
  const meshes = [];
  for (const [name, x, z, roll, pitch] of [
    ['ramp-up', 0, 22, 0, -0.15], ['ramp-down', 0, 42, 0, 0.15],
    ['side-slope', 30, 30, 0.12, 0],
  ] as const) {
    const mesh = MeshBuilder.CreateBox(name, { width: 14, depth: 20, height: 0.5 }, scene);
    mesh.position.set(x, 1.25, z); mesh.rotation.set(pitch, 0, roll);
    ramps.push(new PhysicsAggregate(mesh, PhysicsShapeType.BOX, { mass: 0, friction: 0.8, restitution: 0 }, scene)); meshes.push(mesh);
  }
  reset(); run(3); let maxHeight = 0;
  for (let i = 0; i < 60 * 11; i++) { tick({ ...idle, forward: true }); maxHeight = Math.max(maxHeight, vehicle.node.position.y); }
  results.ramp = { maxHeight, position: vehicle.node.position.asArray(), up: vehicle.current.rotation.toEulerAngles().asArray() };
  console.log('ramp', results.ramp);
  assert.ok(maxHeight > 2.8 && vehicle.node.position.z > 54, 'İki yönlü rampayı aşmalı');
  assert.ok(vehicle.current.rotation.toEulerAngles().x < 0.5 && Math.abs(vehicle.current.rotation.toEulerAngles().z) < 0.5);
  reset(new Vector3(30, 3, 30)); run(5);
  results.sideSlope = { roll: vehicle.current.rotation.toEulerAngles().z, velocity: vehicle.body.getLinearVelocity().length() };
  assert.ok(Math.abs(vehicle.current.rotation.toEulerAngles().z) > 0.06, 'Gövde yan eğime oturmalı');
  assert.ok(vehicle.body.getLinearVelocity().length() < 0.5, 'Yan eğimde kararlı');
  ramps.forEach(r => r.dispose()); meshes.forEach(m => m.dispose());
  const wallMesh = MeshBuilder.CreateBox('hull-obstacle', { width: 14, height: 4, depth: 1 }, scene);
  wallMesh.position.set(0, 2, 18);
  const wall = new PhysicsAggregate(wallMesh, PhysicsShapeType.BOX, { mass: 0, friction: 0.8, restitution: 0 }, scene);
  reset(); run(3); run(8, { ...idle, forward: true });
  assert.ok(vehicle.node.position.z < 16, 'Dinamik gövde fiziksel engeli geçmemeli');
  results.obstacle = { position: vehicle.node.position.asArray(), speed: vehicle.speed };
  wall.dispose(); wallMesh.dispose();
  const bumps: PhysicsAggregate[] = []; const bumpMeshes = [];
  for (let i = 0; i < 4; i++) {
    const bump = MeshBuilder.CreateBox(`suspension-bump-${i}`, { width: 12, depth: 0.6, height: 0.15 + i * 0.05 }, scene);
    bump.position.set(0, (0.15 + i * 0.05) / 2, 15 + i * 5);
    bumps.push(new PhysicsAggregate(bump, PhysicsShapeType.BOX, { mass: 0, friction: 0.8, restitution: 0 }, scene)); bumpMeshes.push(bump);
  }
  reset(); run(3); run(8, { ...idle, forward: true });
  assert.ok(vehicle.node.position.z > 35, 'Alçak tümsekler aşılmalı');
  assert.ok(Math.abs(vehicle.current.rotation.toEulerAngles().z) < 0.2, 'Tümsek sonrasında gövde kararlı');
  results.bumps = { position: vehicle.node.position.asArray(), speed: vehicle.speed };
  bumps.forEach(b => b.dispose()); bumpMeshes.forEach(b => b.dispose());

  reset(); run(3); run(2, { ...idle, forward: true }); reset();
  assert.equal(vehicle.body.getLinearVelocity().length(), 0); assert.equal(vehicle.body.getAngularVelocity().length(), 0);
  results.reset = 'passed';
  console.log(JSON.stringify(results, null, 2));
  await writeFile(new URL(tankId === '02' ? '../assets/tanks/iron_dust_02/driving-results.json' : '../docs/driving-results.json', import.meta.url), JSON.stringify(results, null, 2) + '\n');
} finally {
  vehicle.dispose(); tank.dispose(); floor.dispose(); ground.dispose();
  assert.equal(physics.getBodies().length, 0, 'Fizik kaynakları temizlenmeli');
  scene.dispose(); engine.dispose();
}
console.log('Geçti: gerçek Havok süspansiyon, hava, ileri/fren/geri, simetrik yerinde dönüş, 30/60/120 FPS, rampa, yan eğim, sıfırlama ve kaynak temizliği.');
