import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { NullEngine, Quaternion, Scene, Vector3 } from '@babylonjs/core';
import { loadTankModel } from '../src/game/vehicle/loadTankModel.ts';
import { TurretController, wrapAngle } from '../src/game/vehicle/TurretController.ts';
import { IRON_DUST_01 } from '../src/game/vehicle/VehicleDefinition.ts';
import { FixedStep } from '../src/game/core/fixedStep.ts';

const engine = new NullEngine();
const scene = new Scene(engine);
const tankId = process.argv[2] === '02' ? '02' : '01';
const bytes = new Uint8Array(await readFile(new URL(`../assets/tanks/iron_dust_${tankId}/iron_dust_${tankId}.glb`, import.meta.url)));
const near = (a: number, b: number, epsilon = 1e-6) => assert.ok(Math.abs(a - b) < epsilon, `${a} != ${b}`);
try {
  for (let cycle = 0; cycle < 3; cycle++) {
    const tank = await loadTankModel(scene, bytes, Vector3.Zero());
    const turret = new TurretController(tank);
    const hull = [...tank.assets.transformNodes, ...tank.assets.meshes].find(node => node.metadata?.gltf?.extras?.asset_node_id === 'Hull')!;
    hull.computeWorldMatrix(true);
    const hullBefore = hull.getWorldMatrix().clone();
    const advance = (target: Vector3, seconds: number) => { for (let i = 0; i < Math.round(seconds * 60); i++) turret.fixedUpdate(target, 1 / 60); };
    for (const target of [new Vector3(100, 2, 0), new Vector3(-100, 10, 20), new Vector3(20, 2, -100)]) {
      advance(target, 12);
      const ray = turret.getMuzzleRay();
      assert.ok(Vector3.Dot(ray.direction, target.subtract(ray.origin).normalize()) > 0.99999, 'actual GLB muzzle converges to world target');
    }
    hull.computeWorldMatrix(true);
    assert.ok(hull.getWorldMatrix().equals(hullBefore), 'joints do not rotate the hull');
    turret.reset();
    turret.fixedUpdate(new Vector3(100, 2, 0), 1 / 60);
    assert.ok(Math.abs(turret.angles.yaw) > 0 && Math.abs(turret.angles.yaw) < IRON_DUST_01.turretYawSpeed / 60, 'yaw starts smoothly');
    assert.ok(Math.abs(turret.angles.elevation) <= IRON_DUST_01.gunPitchSpeed / 60 + 1e-9);
    advance(new Vector3(0, 1000, 100), 12);
    near(turret.angles.elevation, IRON_DUST_01.gunMaxElevation);
    assert.ok(turret.limited);
    advance(new Vector3(0, -1000, 100), 12);
    near(turret.angles.elevation, IRON_DUST_01.gunMinElevation);
    assert.ok(turret.getMuzzleRay().direction.y < 0);
    // Crossing the -pi/+pi boundary must take the short path.
    turret.reset();
    advance(new Vector3(1, 2, -100), 12);
    const before = turret.angles.yaw;
    advance(new Vector3(-1, 2, -100), 0.1);
    assert.ok(Math.abs(wrapAngle(turret.angles.yaw - before)) < 0.03);
    // World aim remains stable while the hull changes yaw, pitch and roll.
    const target = new Vector3(100, 8, 200);
    tank.anchor.rotationQuaternion = Quaternion.RotationYawPitchRoll(1.2, 0.06, -0.08);
    tank.anchor.computeWorldMatrix(true);
    advance(target, 12);
    const ray = turret.getMuzzleRay();
    assert.ok(Vector3.Dot(ray.direction, target.subtract(ray.origin).normalize()) > 0.99999, 'inclined hull uses world target');
    // Cancelling an unfinished alignment must hold the current elevation.
    turret.reset();
    turret.fixedUpdate(new Vector3(100, 30, 100), 1 / 60);
    const interruptedElevation = turret.angles.elevation;
    for (let i = 0; i < 120; i++) turret.fixedUpdateManual(0, 0, 1 / 60);
    near(turret.angles.elevation, interruptedElevation);
    advance(target, 12);
    // Switching back from automatic world aim must preserve the new elevation.
    const automaticElevation = turret.angles.elevation;
    for (let i = 0; i < 120; i++) turret.fixedUpdateManual(0, 0, 1 / 60);
    near(turret.angles.elevation, automaticElevation);
    const held = turret.angles;
    for (let i = 0; i < 60; i++) turret.fixedUpdate(null, 1 / 60);
    assert.deepEqual(turret.angles, held, 'release immediately freezes local joint angles');
    tank.anchor.rotationQuaternion = Quaternion.RotationYawPitchRoll(-1, 0.1, 0.12);
    tank.anchor.computeWorldMatrix(true);
    turret.fixedUpdate(null, 1 / 60);
    assert.deepEqual(turret.angles, held, 'hull rotation carries the held turret');
    tank.anchor.rotationQuaternion = Quaternion.RotationYawPitchRoll(1.2, 0.06, -0.08);
    tank.anchor.computeWorldMatrix(true); turret.render(1);
    // Interpolation must not change the simulation state.
    const angles = turret.angles;
    turret.render(0.4);
    assert.deepEqual(turret.angles, angles);
    turret.render(1);
    near(Vector3.Dot(turret.getMuzzleRay().direction, ray.direction), 1);
    tank.anchor.rotationQuaternion = Quaternion.Identity(); tank.anchor.computeWorldMatrix(true);
    const results = [30, 60, 120].map(fps => {
      turret.reset(); const clock = new FixedStep();
      for (let frame = 0; frame < fps; frame++) clock.advance(1 / fps, dt => turret.fixedUpdate(new Vector3(100, 8, 100), dt));
      return turret.angles;
    });
    assert.deepEqual(results[0], results[1]); assert.deepEqual(results[1], results[2]);
    // Manual controls preserve physical rates, local angles and render-rate independence.
    const manualResults = [30, 60, 120].map(fps => {
      turret.reset(); const clock = new FixedStep(); let delta = 5 * Math.PI / 180;
      for (let frame = 0; frame < fps; frame++) clock.advance(1 / fps, dt => {
        turret.fixedUpdateManual(1, delta, dt); delta = 0;
      });
      return turret.angles;
    });
    assert.deepEqual(manualResults[0], manualResults[1]); assert.deepEqual(manualResults[1], manualResults[2]);
    near(manualResults[0].yaw, -IRON_DUST_01.turretYawSpeed * (1 - IRON_DUST_01.turretResponseTime * (1 - Math.exp(-1 / IRON_DUST_01.turretResponseTime))));
    near(manualResults[0].elevation, 5 * Math.PI / 180);
    for (let i = 0; i < 120; i++) turret.fixedUpdateManual(0, 0, 1 / 60);
    const manualHeld = turret.angles;
    tank.anchor.rotationQuaternion = Quaternion.RotationYawPitchRoll(-1, 0.1, 0.12);
    tank.anchor.computeWorldMatrix(true);
    turret.fixedUpdateManual(0, 0, 1 / 60);
    near(turret.angles.yaw, manualHeld.yaw); near(turret.angles.elevation, manualHeld.elevation);
    turret.reset(); const straight = turret.getMuzzleRay().direction;
    turret.fixedUpdateManual(-1, 10, 1 / 60);
    assert.ok(turret.angles.yaw > 0 && turret.angles.yaw < IRON_DUST_01.turretYawSpeed / 60);
    assert.ok(turret.angles.elevation > 0 && turret.angles.elevation < IRON_DUST_01.gunPitchSpeed / 60);
    assert.ok(turret.limited);
    for (let i = 0; i < 180; i++) turret.fixedUpdateManual(0, 0, 1 / 60);
    near(turret.angles.elevation, IRON_DUST_01.gunMaxElevation);
    turret.fixedUpdateManual(0, -100, 1 / 60);
    for (let i = 0; i < 180; i++) turret.fixedUpdateManual(0, 0, 1 / 60);
    near(turret.angles.elevation, IRON_DUST_01.gunMinElevation);
    // Reversing at a limit responds immediately, with no queued overshoot to unwind.
    turret.fixedUpdateManual(0, 0.15 * Math.PI / 180, 1 / 60);
    assert.ok(turret.angles.elevation > IRON_DUST_01.gunMinElevation);
    for (let i = 0; i < 120; i++) turret.fixedUpdateManual(0, 0, 1 / 60);
    near(turret.angles.elevation, IRON_DUST_01.gunMinElevation + 0.15 * Math.PI / 180);
    turret.reset(); near(Vector3.Dot(straight, turret.getMuzzleRay().direction), 1);
    tank.anchor.rotationQuaternion = Quaternion.Identity(); tank.anchor.computeWorldMatrix(true);
    for (const hullYaw of [0, 1.2, -2]) {
      tank.anchor.rotationQuaternion = Quaternion.RotationYawPitchRoll(hullYaw, 0, 0);
      tank.anchor.computeWorldMatrix(true);
      turret.reset();
      const right = Vector3.Cross(Vector3.Up(), turret.getMuzzleRay().direction).normalize();
      for (const turn of [-1, 1]) {
        turret.reset(); turret.fixedUpdateManual(turn, 0, 0.5);
        assert.ok(Vector3.Dot(right, turret.getMuzzleRay().direction) * turn > 0.1,
          'Q turns the actual GLB muzzle left; E turns it right relative to the hull');
      }
    }
    tank.anchor.rotationQuaternion = Quaternion.Identity(); tank.anchor.computeWorldMatrix(true);
    turret.reset(); near(turret.angles.yaw, 0); near(turret.angles.elevation, 0);
    // Smooth start, release, reversal, mechanical bounds and a fine wheel increment.
    turret.reset();
    let lastYaw = 0, lastSpeed = 0;
    for (let i = 0; i < 60; i++) {
      turret.fixedUpdateSmoothManual(1, i === 0 ? 0.01 : 0, 1 / 60);
      const speed = -wrapAngle(turret.angles.yaw - lastYaw) * 60;
      assert.ok(speed > 0 && speed >= lastSpeed - 1e-9 && speed <= IRON_DUST_01.turretYawSpeed);
      assert.ok(turret.angles.elevation >= 0 && turret.angles.elevation <= 0.01);
      lastYaw = turret.angles.yaw; lastSpeed = speed;
    }
    let lastReleaseSpeed = lastSpeed;
    for (let i = 0; i < 90; i++) {
      turret.fixedUpdateSmoothManual(0, 0, 1 / 60);
      const speed = -wrapAngle(turret.angles.yaw - lastYaw) * 60;
      assert.ok(speed >= -1e-9 && speed <= lastReleaseSpeed + 1e-9, 'release decelerates monotonically');
      lastYaw = turret.angles.yaw; lastReleaseSpeed = speed;
    }
    near(turret.angles.elevation, 0.01);
    assert.ok(lastReleaseSpeed < 1e-7);
    for (let i = 0; i < 240; i++) {
      turret.fixedUpdateSmoothManual(-1, i === 0 ? 100 : 0, 1 / 60);
      assert.ok(turret.angles.elevation <= IRON_DUST_01.gunMaxElevation);
    }
    near(turret.angles.elevation, IRON_DUST_01.gunMaxElevation);
    turret.fixedUpdateSmoothManual(0, -0.001, 1 / 60);
    assert.ok(turret.angles.elevation < IRON_DUST_01.gunMaxElevation, 'fine reversal starts immediately');
    turret.reset();
    turret.fixedUpdateSmoothManual(0, 0, 1 / 60);
    near(turret.angles.yaw, 0); near(turret.angles.elevation, 0);
    const smoothResults = [30, 60, 120].map(fps => {
      turret.reset(); const clock = new FixedStep(); let ticks = 0;
      for (let frame = 0; frame < fps * 3; frame++) clock.advance(1 / fps, dt => {
        turret.fixedUpdateSmoothManual(ticks < 60 ? 1 : ticks < 120 ? -1 : 0,
          ticks === 0 ? 0.2 : ticks === 90 ? -0.3 : 0, dt); ticks++;
      });
      return turret.angles;
    });
    assert.deepEqual(smoothResults[0], smoothResults[1]); assert.deepEqual(smoothResults[1], smoothResults[2]);
    turret.dispose(); tank.dispose();
    assert.equal(scene.meshes.length, 0); assert.equal(scene.transformNodes.length, 0); assert.equal(scene.materials.length, 0);
  }
  console.log('Turret: real GLB aim, independent hull, slew rates, pitch limits, angle wrap, inclined hull stabilization, interpolation, 30/60/120 FPS and 3 disposal cycles passed.');
} finally { scene.dispose(); engine.dispose(); }
