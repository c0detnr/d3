import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import HavokPhysics from '@babylonjs/havok';
import { HavokPlugin, MeshBuilder, NullEngine, PhysicsAggregate, PhysicsShapeType, Scene, Vector3 } from '@babylonjs/core';
import { loadTankModel } from '../src/game/vehicle/loadTankModel.ts';
import { TurretController } from '../src/game/vehicle/TurretController.ts';
import { ShotCameraMotion } from '../src/game/camera/ShotCameraMotion.ts';
import { CombatEffects, COMBAT_PARTICLE_CAPACITY } from '../src/game/combat/CombatEffects.ts';
import { impactSurface } from '../src/game/combat/ImpactSurface.ts';
import { FixedStep } from '../src/game/core/fixedStep.ts';
import { TankVehicle } from '../src/game/vehicle/TankVehicle.ts';
import { extractTankRig } from '../src/game/vehicle/tankRig.ts';
import { WeaponSystem } from '../src/game/combat/WeaponSystem.ts';
import { IRON_DUST_01_WEAPON, SHOT_FEEDBACK } from '../src/game/combat/WeaponDefinition.ts';
import { ProjectileSystem, type ProjectileHit } from '../src/game/combat/ProjectileSystem.ts';
import { effectiveArmorMm, penetrationAtRangeMm, resolveArmor } from '../src/game/combat/ArmorModel.ts';
import { ArmorRange } from '../src/game/combat/ArmorTarget.ts';
import { IRON_DUST_01_AMMO } from '../src/game/combat/WeaponDefinition.ts';

const bytes = new Uint8Array(await readFile(new URL('../assets/tanks/iron_dust_01/iron_dust_01.glb', import.meta.url)));
const wasmBinary = await readFile(new URL('../node_modules/@babylonjs/havok/lib/esm/HavokPhysics.wasm', import.meta.url));
const havok = await HavokPhysics({ wasmBinary });
const near = (a: number, b: number, epsilon = 1e-6) => assert.ok(Math.abs(a - b) < epsilon, `${a} != ${b}`);

function makeScene(physics: boolean) {
  const engine = new NullEngine();
  const scene = new Scene(engine);
  if (physics) {
    scene.enablePhysics(new Vector3(0, -9.81, 0), new HavokPlugin(true, havok));
    scene.physicsEnabled = false;
    scene.getPhysicsEngine()!.setTimeStep(1 / 60);
  }
  return { engine, scene };
}

async function testWeapon() {
  const { engine, scene } = makeScene(false);
  try {
    for (let cycle = 0; cycle < 3; cycle++) {
      const tank = await loadTankModel(scene, bytes, Vector3.Zero());
      const turret = new TurretController(tank);
      const weapon = new WeaponSystem(turret);
      const barrelBase = turret.barrel.position.clone();
      const muzzleBase = turret.muzzle.position.clone();
      for (let i = 0; i < 720; i++) turret.fixedUpdate(new Vector3(100, 2, 0), 1 / 60);
      const ray = turret.getMuzzleRay();
      const shot = weapon.fire();
      assert.ok(shot, 'first shot is ready');
      assert.ok(Vector3.Dot(shot!.direction, ray.direction) > 0.999999, 'shot follows the physical bore');
      near(Vector3.Distance(shot!.origin, ray.origin), 0, 1e-6);
      assert.equal(weapon.shotsFired, 1);
      near(weapon.reloadRemaining, IRON_DUST_01_WEAPON.reloadSeconds);
      assert.equal(weapon.ready, false);
      assert.equal(weapon.fire(), undefined, 'cannot fire while reloading');
      assert.equal(weapon.definition.reloadSeconds, 5);
      near(weapon.recoilOffset, 0);
      let last = 0;
      for (let i = 0; i < 4; i++) {
        weapon.fixedUpdate(1 / 60);
        assert.ok(weapon.recoilOffset >= last && weapon.recoilOffset <= weapon.definition.recoilDistance);
        last = weapon.recoilOffset;
      }
      assert.ok(last > weapon.definition.recoilDistance * 0.99, 'fast rearward stroke');
      for (let i = 0; i < 60; i++) {
        weapon.fixedUpdate(1 / 60);
        assert.ok(weapon.recoilOffset >= 0 && weapon.recoilOffset <= last, 'return never bounces');
        last = weapon.recoilOffset;
      }
      near(last, 0);
      weapon.reset(); weapon.fire();
      for (let i = 0; i < 18; i++) weapon.fixedUpdate(1 / 60);
      assert.ok(weapon.recoilOffset < IRON_DUST_01_WEAPON.recoilDistance, 'recoil starts returning');
      assert.ok(weapon.recoilOffset > -IRON_DUST_01_WEAPON.recoilDistance, 'recoil stays bounded');
      for (let i = 0; i < 120; i++) weapon.fixedUpdate(1 / 60);
      near(weapon.recoilOffset, 0, 1e-9);
      near(turret.barrel.position.z, barrelBase.z);
      near(turret.muzzle.position.z, muzzleBase.z);
      for (let i = 0; i < Math.round(IRON_DUST_01_WEAPON.reloadSeconds * 60); i++) weapon.fixedUpdate(1 / 60);
      assert.equal(weapon.ready, true);
      near(weapon.reloadFraction, 1);
      assert.ok(weapon.fire(), 'second shot after reload');
      assert.equal(weapon.shotsFired, 2);
      weapon.reset(); weapon.fire();
      for (let i = 0; i < 299; i++) weapon.fixedUpdate(1 / 60);
      assert.equal(weapon.ready, false, 'before reload boundary');
      weapon.fixedUpdate(1 / 60); assert.equal(weapon.ready, true, 'exact 5 s boundary');
      assert.equal(weapon.shotsFired, 1, 'no queued early fire');
      const positions = [30, 60, 120].map(fps => {
        weapon.reset(); weapon.fire();
        const clock = new FixedStep();
        for (let frame = 0; frame < fps / 2; frame++) {
          const alpha = clock.advance(1 / fps, dt => weapon.fixedUpdate(dt));
          weapon.render(alpha);
        }
        return weapon.recoilOffset;
      });
      assert.deepEqual(positions, [positions[0], positions[0], positions[0]], 'render rate never changes recoil simulation');
      weapon.reset();
      assert.equal(weapon.ready, true);
      assert.equal(weapon.shotsFired, 0);
      near(weapon.recoilOffset, 0);
      near(turret.barrel.position.z, barrelBase.z);
      near(turret.muzzle.position.z, muzzleBase.z);
      turret.dispose();
      tank.dispose();
      assert.equal(scene.meshes.length, 0);
      assert.equal(scene.transformNodes.length, 0);
      assert.equal(scene.materials.length, 0);
    }
    console.log('Weapon: real GLB bore pose, reload gate, bounded visual recoil, reset and 3 disposal cycles passed.');
  } finally {
    scene.dispose();
    engine.dispose();
  }
}

function testProjectiles() {
  const { engine, scene } = makeScene(true);
  const physics = scene.getPhysicsEngine()!;
  const floor = MeshBuilder.CreateBox('combat-floor', { width: 400, depth: 400, height: 1 }, scene);
  floor.position.y = -0.5;
  const floorBody = new PhysicsAggregate(floor, PhysicsShapeType.BOX, { mass: 0, friction: 0.5, restitution: 0 }, scene);
  const nearTarget = MeshBuilder.CreateBox('near-target', { width: 8, height: 3, depth: 0.2 }, scene);
  nearTarget.position.set(0, 2.5, 30);
  const nearBody = new PhysicsAggregate(nearTarget, PhysicsShapeType.BOX, { mass: 0, friction: 0.5, restitution: 0 }, scene);
  const farTarget = MeshBuilder.CreateBox('far-target', { width: 8, height: 3, depth: 0.2 }, scene);
  farTarget.position.set(0, 2.5, 45);
  const farBody = new PhysicsAggregate(farTarget, PhysicsShapeType.BOX, { mass: 0, friction: 0.5, restitution: 0 }, scene);
  const raycast = (from: Vector3, to: Vector3): ProjectileHit | undefined => {
    const hit = physics.raycast(from, to);
    return hit.hasHit
      ? { point: hit.hitPointWorld.clone(), normal: hit.hitNormalWorld.clone(), body: hit.body, distance: hit.hitDistance }
      : undefined;
  };
  const projectiles = new ProjectileSystem(scene, raycast);
  try {
    // Semi-implicit gravity drop over one second of fixed steps.
    const falling = projectiles.spawn(new Vector3(0, 100, -30), Vector3.Forward(), 180)!;
    for (let i = 0; i < 60; i++) projectiles.fixedUpdate(1 / 60);
    const expectedDrop = 9.81 * (1 / 60) ** 2 * 60 * 61 / 2;
    near(100 - falling.position.y, expectedDrop, 0.05);

    const positions = [30, 60, 120].map(fps => {
      projectiles.reset(); const clock = new FixedStep();
      const shot = projectiles.spawn(new Vector3(0, 100, -30), Vector3.Forward(), 180)!;
      for (let frame = 0; frame < fps; frame++) {
        const alpha = clock.advance(1 / fps, dt => projectiles.fixedUpdate(dt)); projectiles.render(alpha);
      }
      return shot.position.clone();
    });
    assert.deepEqual(positions[0], positions[1]); assert.deepEqual(positions[1], positions[2]);
    for (const meters of [50, 150, 300]) {
      projectiles.reset();
      const shot = projectiles.spawn(new Vector3(0, 100, 0), Vector3.Forward(), 180)!;
      while (shot.alive && shot.position.z < meters) projectiles.fixedUpdate(1 / 60);
      assert.ok(100 - shot.position.y > (meters === 300 ? 13 : meters === 150 ? 3 : 0.3));
    }
    projectiles.reset();
    for (let i = 0; i < projectiles.capacity; i++) assert.ok(projectiles.spawn(new Vector3(0, 500, 0), Vector3.Up(), 10));
    assert.equal(projectiles.spawn(Vector3.Zero(), Vector3.Up(), 10), undefined);
    for (let i = 0; i < 500; i++) projectiles.fixedUpdate(1 / 60);
    assert.equal(projectiles.active.length, 0, 'age terminates slow shells');
    assert.equal(projectiles.projectiles.length, projectiles.capacity);
    projectiles.reset();
    // A 0.2 m thin plate must stop the shell; the swept query cannot tunnel past it.
    let impact: ProjectileHit | undefined;
    const shot = projectiles.spawn(new Vector3(0, 2.5, 0), Vector3.Forward(), 900)!;
    for (let i = 0; i < 120 && shot.alive; i++) {
      projectiles.fixedUpdate(1 / 60, (hit, projectile) => {
        if (projectile === shot) impact = hit;
      });
    }
    assert.ok(impact, 'thin target is hit');
    assert.ok(impact!.point.z > 29.7 && impact!.point.z <= 30.01, `impact z ${impact!.point.z}`);
    assert.equal(impact!.body, nearBody.body);
    assert.notEqual(impact!.body, farBody.body, 'first obstacle stops the shell');
    assert.equal(shot.alive, false);

    // A shell fired above the targets falls to the ground, not through it.
    let groundImpact: ProjectileHit | undefined;
    const lob = projectiles.spawn(new Vector3(0, 20, 0), Vector3.Forward(), 60)!;
    for (let i = 0; i < 300 && lob.alive; i++) {
      projectiles.fixedUpdate(1 / 60, hit => { groundImpact = hit; });
    }
    assert.ok(groundImpact, 'ground stops the falling shell');
    assert.equal(groundImpact!.body, floorBody.body);

    projectiles.reset();
    assert.equal(projectiles.active.length, 0);
    console.log('Projectiles: gravity drop, swept thin-plate hit, first obstacle and ground stop passed.');
  } finally {
    projectiles.dispose();
    nearBody.dispose(); farBody.dispose(); floorBody.dispose();
    nearTarget.dispose(); farTarget.dispose(); floor.dispose();
    scene.dispose();
    engine.dispose();
  }
}

function testEffects() {
  const { engine, scene } = makeScene(false);
  try {
    for (let cycle = 0; cycle < 3; cycle++) {
      const baseline = { sprites: scene.spriteManagers?.length ?? 0, textures: scene.textures.length, lights: scene.lights.length };
      const effects = new CombatEffects(scene);
      assert.equal(impactSurface(), 'soil');
      for (const surface of ['soil', 'concrete', 'metal'] as const) {
        effects.reset(); effects.impact(Vector3.Zero(), Vector3.Up(), surface);
        assert.ok(effects.particles.length > 0);
        const bright = effects.particles.filter(p => p.gravity < 0).length;
        assert.equal(bright, surface === 'soil' ? 0 : surface === 'concrete' ? 2 : 9);
      }
      effects.reset();
      effects.muzzleFlash(new Vector3(0, 2, 0), Vector3.Forward());
      assert.equal(effects.particles.filter(p => p.kind === 'dust').length, 0, 'no invented ground in the air');
      assert.ok(effects.particles.filter(p => p.kind === 'smoke').every(p => p.velocity.z > 6), 'gas follows bore');
      const gasCount = effects.particles.length;
      effects.reset();
      effects.muzzleFlash(new Vector3(0, 2, 0), Vector3.Forward(), { point: Vector3.Zero(), normal: Vector3.Up() });
      assert.ok(effects.particles.length > gasCount, 'near soil produces pressure dust');
      assert.ok(effects.particles.filter(p => p.kind === 'dust').every(p => p.position.y > 0));
      for (let i = 0; i < 12; i++) effects.fixedUpdate(1 / 60);
      assert.ok(effects.particles.filter(p => p.kind === 'flash').every(p => p.age >= p.life));
      assert.ok(effects.particles.filter(p => p.kind === 'smoke').some(p => p.age < p.life), 'gas outlasts flash');
      effects.reset();
      effects.muzzleFlash(new Vector3(0, 5, 0), Vector3.Forward(), { point: Vector3.Zero(), normal: Vector3.Up() });
      assert.equal(effects.particles.filter(p => p.kind === 'dust').length, 0, 'high muzzle creates no soil blast');
      for (let i = 0; i < 1000; i++) effects.muzzleFlash(Vector3.Zero(), Vector3.Forward());
      assert.ok(effects.particles.length <= COMBAT_PARTICLE_CAPACITY);
      for (let i = 0; i < 120; i++) effects.fixedUpdate(1 / 60);
      effects.render(0); assert.ok(effects.particles.every(p => p.age >= p.life));
      assert.ok(scene.spriteManagers.filter(m => m.name.startsWith('combat-')).every(m => m.sprites.every(s => !s.isVisible)), 'expired interpolated particles never reappear');
      effects.reset(); effects.dispose();
      assert.equal(scene.spriteManagers.length, baseline.sprites);
      assert.equal(scene.textures.length, baseline.textures);
      assert.equal(scene.lights.length, baseline.lights);
    }
    console.log('Effects: soil/concrete/metal response, bounded pool and 3 cleanup cycles passed.');
  } finally { scene.dispose(); engine.dispose(); }
}
function testArmorMath() {
  near(penetrationAtRangeMm(IRON_DUST_01_AMMO, 0), 220);
  near(penetrationAtRangeMm(IRON_DUST_01_AMMO, 500), 180);
  near(penetrationAtRangeMm(IRON_DUST_01_AMMO, 1000), 140);
  near(penetrationAtRangeMm(IRON_DUST_01_AMMO, 2000), 77);
  near(effectiveArmorMm(100, 0), 100);
  near(effectiveArmorMm(100, Math.PI / 3), 200, 1e-9);
  near(effectiveArmorMm(100, Math.PI * 0.49), 2000, 1e-6);
  const normal = Vector3.Forward();
  const headOn = resolveArmor(IRON_DUST_01_AMMO, 100, normal, normal, 0);
  assert.equal(headOn.kind, 'penetrated');
  near(headOn.incidenceDegrees, 0);
  const sloped = resolveArmor(IRON_DUST_01_AMMO, 100,
    normal, new Vector3(Math.sin(Math.PI / 3), 0, Math.cos(Math.PI / 3)), 0);
  near(sloped.effectiveMm, 200, 1e-6);
  assert.equal(sloped.kind, 'penetrated');
  const ricochet = resolveArmor(IRON_DUST_01_AMMO, 100,
    normal, new Vector3(Math.sin(75 * Math.PI / 180), 0, Math.cos(75 * Math.PI / 180)), 0);
  assert.equal(ricochet.kind, 'ricochet');
  const distant = resolveArmor(IRON_DUST_01_AMMO, 100, normal, normal, 2000);
  assert.equal(distant.kind, 'no-penetration');
  console.log('Armor: range curve, angled thickness, ricochet threshold and penetration result passed.');
}

function testTargets() {
  const { engine, scene } = makeScene(true);
  const physics = scene.getPhysicsEngine()!;
  const range = new ArmorRange(scene, new Vector3(-34, 0, -42));
  try {
    const target = range.targets[0];
    const hull = target.hull.mesh;
    const yaw = hull.rotationQuaternion!;
    const forward = Vector3.Forward().rotateByQuaternionToRef(yaw, new Vector3()).normalize();
    const right = Vector3.Right().rotateByQuaternionToRef(yaw, new Vector3()).normalize();
    const cast = (offset: Vector3) => {
      const from = hull.position.add(offset);
      const direction = hull.position.subtract(from).normalize();
      const hit = physics.raycast(from, hull.position);
      assert.ok(hit.hasHit, 'target plate is hit');
      return { hit, direction };
    };
    const front = cast(forward.scale(24));
    const frontResolution = range.resolve(IRON_DUST_01_AMMO,
      { point: front.hit.hitPointWorld, normal: front.hit.hitNormalWorld, body: front.hit.body, distance: front.hit.hitDistance },
      front.direction, 24);
    assert.ok(frontResolution, 'front plate is tracked');
    assert.equal(frontResolution!.part, 'hull');
    assert.equal(frontResolution!.face, 'front');
    near(frontResolution!.result.effectiveMm, 180, 1e-5);
    assert.equal(frontResolution!.result.kind, 'penetrated');
    const side = cast(right.scale(24));
    const sideResolution = range.resolve(IRON_DUST_01_AMMO,
      { point: side.hit.hitPointWorld, normal: side.hit.hitNormalWorld, body: side.hit.body, distance: side.hit.hitDistance },
      side.direction, 24);
    assert.ok(sideResolution, 'side plate is tracked');
    assert.equal(sideResolution!.part, 'hull');
    assert.equal(sideResolution!.face, 'right');
    near(sideResolution!.result.effectiveMm, 80, 1e-5);
    assert.equal(range.targets.length, 3);
    console.log('Targets: static hull/turret bodies, front/side thickness mapping and 3 placements passed.');
  } finally {
    range.dispose();
    scene.dispose();
    engine.dispose();
  }
}

try {
  await testWeapon();
  testProjectiles();
  testEffects();
  testArmorMath();
  testTargets();
} finally {
  // Havok is process-scoped in this harness.
}

// Camera motion must end at the same real time regardless of render rate.
for (const fps of [30, 60, 120]) {
  const motion = new ShotCameraMotion(); motion.impulse(0.7);
  let peak = 0;
  for (let i = 0; i < fps; i++) {
    const sample = motion.update(1 / fps);
    peak = Math.max(peak, Math.abs(sample.pitch));
    assert.ok(Math.abs(sample.pitch) < 0.015 && Math.abs(sample.yaw) < 0.005 && Math.abs(sample.roll) < 0.005);
  }
  assert.ok(peak > 0.001, 'small but visible camera impulse');
  assert.deepEqual(motion.update(0), { pitch: 0, yaw: 0, roll: 0 });
  motion.impulse(); motion.reset();
  assert.deepEqual(motion.update(0), { pitch: 0, yaw: 0, roll: 0 });
}

async function testHullShotImpulse() {
  const { engine, scene } = makeScene(true);
  const tank = await loadTankModel(scene, bytes, Vector3.Zero());
  const vehicle = new TankVehicle(scene, extractTankRig(tank), Vector3.Zero());
  try {
    for (const direction of [Vector3.Forward(), Vector3.Right()]) {
      vehicle.reset();
      const mount = vehicle.node.position.add(new Vector3(0, 1.1, 0));
      vehicle.body.applyImpulse(direction.scale(-SHOT_FEEDBACK.hullImpulse), mount);
      const linear = vehicle.body.getLinearVelocity();
      const angular = vehicle.body.getAngularVelocity();
      assert.ok(Vector3.Dot(linear, direction) < -0.05 && linear.length() < 0.5, 'heavy hull receives a small opposing velocity');
      const axis = Vector3.Cross(Vector3.Up(), direction.negate()).normalize();
      assert.ok(Vector3.Dot(angular, axis) > 0, 'pitch/roll follows the gun direction');
    }
  } finally { vehicle.dispose(); tank.dispose(); scene.dispose(); engine.dispose(); }
}
await testHullShotImpulse();
console.log('Shot feedback: render-rate recoil equality, camera bounds/settling and directional Havok hull impulses passed.');
