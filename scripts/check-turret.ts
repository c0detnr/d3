import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { NullEngine, Quaternion, Scene, Vector3 } from '@babylonjs/core';
import { loadTankModel } from '../src/game/vehicle/loadTankModel.ts';
import { TurretController, wrapAngle } from '../src/game/vehicle/TurretController.ts';
import { IRON_DUST_01 } from '../src/game/vehicle/VehicleDefinition.ts';
import { FixedStep } from '../src/game/core/fixedStep.ts';

const engine = new NullEngine();
const scene = new Scene(engine);
const bytes = new Uint8Array(await readFile(new URL('../assets/tanks/iron_dust_01/iron_dust_01.glb', import.meta.url)));
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
    near(Math.abs(turret.angles.yaw), IRON_DUST_01.turretYawSpeed / 60);
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
    turret.reset(); near(turret.angles.yaw, 0); near(turret.angles.elevation, 0);
    turret.dispose(); tank.dispose();
    assert.equal(scene.meshes.length, 0); assert.equal(scene.transformNodes.length, 0); assert.equal(scene.materials.length, 0);
  }
  console.log('Turret: real GLB aim, independent hull, slew rates, pitch limits, angle wrap, inclined hull stabilization, interpolation, 30/60/120 FPS and 3 disposal cycles passed.');
} finally { scene.dispose(); engine.dispose(); }
