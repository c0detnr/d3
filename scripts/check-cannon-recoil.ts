import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import HavokPhysics from '@babylonjs/havok';
import { HavokPlugin, MeshBuilder, NullEngine, PhysicsAggregate, PhysicsShapeType, Quaternion, Matrix, Scene, Vector3 } from '@babylonjs/core';
import { loadTankModel } from '../src/game/vehicle/loadTankModel.ts';
import { extractTankRig } from '../src/game/vehicle/tankRig.ts';
import { TankVehicle } from '../src/game/vehicle/TankVehicle.ts';
import { TankVisual } from '../src/game/vehicle/TankVisual.ts';
import { TurretController } from '../src/game/vehicle/TurretController.ts';
import { WeaponSystem } from '../src/game/combat/WeaponSystem.ts';
import { SHOT_FEEDBACK } from '../src/game/combat/WeaponDefinition.ts';
import { FixedStep } from '../src/game/core/fixedStep.ts';

const havok = await HavokPhysics({ wasmBinary: await readFile(new URL('../node_modules/@babylonjs/havok/lib/esm/HavokPhysics.wasm', import.meta.url)) });
const engine = new NullEngine();
const scene = new Scene(engine);
scene.enablePhysics(new Vector3(0, -9.81, 0), new HavokPlugin(true, havok));
scene.physicsEnabled = false;
const physics = scene.getPhysicsEngine()!;
physics.setTimeStep(1 / 60);
const ground = MeshBuilder.CreateBox('recoil-floor', { width: 100, depth: 100, height: 1 }, scene);
ground.position.y = -0.5;
const floor = new PhysicsAggregate(ground, PhysicsShapeType.BOX, { mass: 0, friction: 0.85, restitution: 0 }, scene);
const bytes = new Uint8Array(await readFile(new URL('../assets/tanks/iron_dust_01/iron_dust_01.glb', import.meta.url)));
const tank = await loadTankModel(scene, bytes, Vector3.Zero());
const rig = extractTankRig(tank);
const vehicle = new TankVehicle(scene, rig, Vector3.Zero());
const visual = new TankVisual(tank, rig);
const turret = new TurretController(tank);
const weapon = new WeaponSystem(turret);
const idle = { throttle: 0, steer: 0, brake: 0 };
const step = () => {
  vehicle.beforeStep(1 / 60, idle); physics._step(1 / 60); vehicle.afterStep();
  visual.fixedUpdate(vehicle, 1 / 60); visual.syncHull(vehicle, 1);
};
const tilt = (a: Quaternion, b: Quaternion) => {
  const up = (q: Quaternion) => Vector3.TransformNormal(Vector3.Up(), Matrix.Compose(Vector3.One(), q, Vector3.Zero()));
  return Math.acos(Math.min(1, Math.max(-1, Vector3.Dot(up(a), up(b)))));
};
try {
  // Compare world displacement: matching local Z alone would miss mirrored/rotated asset mistakes.
  for (const target of [new Vector3(0, 12, 100), new Vector3(100, 8, 0), new Vector3(-60, 1, -100)]) {
    weapon.reset();
    for (let i = 0; i < 720; i++) turret.fixedUpdate(target, 1 / 60);
    const rest = turret.recoilParts.map(node => { node.computeWorldMatrix(true); return node.getAbsolutePosition().clone(); });
    const direction = turret.getMuzzleRay().direction;
    weapon.fire();
    for (let i = 0; i < 4; i++) weapon.fixedUpdate(1 / 60);
    for (const alpha of [0, 0.5, 1]) {
      if ('render' in weapon && typeof weapon.render === 'function') weapon.render(alpha);
      const moved = turret.barrel.getAbsolutePosition().subtract(rest[0]);
      assert.ok(Vector3.Dot(moved, direction) < -0.01, 'tube travels backwards along bore');
      turret.recoilParts.forEach((node, i) => {
        node.computeWorldMatrix(true);
        assert.ok(Vector3.Distance(node.getAbsolutePosition().subtract(rest[i]), moved) < 1e-5, `${node.name} stays attached during recoil/interpolation`);
      });
    }
    weapon.reset();
    turret.recoilParts.forEach((node, i) => {
      node.computeWorldMatrix(true);
      assert.ok(Vector3.Distance(node.getAbsolutePosition(), rest[i]) < 1e-5, `${node.name} returns on reset`);
    });
  }
  const results = [];
  for (const target of [new Vector3(0, 2.4, 100), new Vector3(100, 2.4, 0)]) {
    const rates = [];
    for (const fps of [30, 60, 120]) {
      vehicle.reset(); turret.reset(); weapon.reset();
      for (let i = 0; i < 240; i++) step();
      for (let i = 0; i < 720; i++) turret.fixedUpdate(target, 1 / 60);
      const initial = vehicle.current.rotation.clone();
      const initialPosition = vehicle.current.position.clone();
      const shot = weapon.fire()!;
      vehicle.body.applyImpulse(shot.direction.scale(-SHOT_FEEDBACK.hullImpulse), turret.pitchPivot.getAbsolutePosition());
      assert.ok(Vector3.Dot(vehicle.body.getLinearVelocity(), shot.direction) < -0.3, 'immediate backwards hull velocity');
      const clock = new FixedStep();
      let peak = 0, maxCompression = 0, minCompression = 1, reversed = false;
      const axis = Vector3.Cross(Vector3.Up(), shot.direction.negate()).normalize();
      let lastAngular = Vector3.Dot(vehicle.body.getAngularVelocity(), axis);
      for (let frame = 0; frame < fps * 3; frame++) {
        const alpha = clock.advance(1 / fps, () => {
          step();
          peak = Math.max(peak, tilt(initial, vehicle.current.rotation));
          vehicle.contacts.forEach(c => { maxCompression = Math.max(maxCompression, c.compression); minCompression = Math.min(minCompression, c.compression); });
          const angular = Vector3.Dot(vehicle.body.getAngularVelocity(), axis);
          if (lastAngular > 0 && angular < -0.001) reversed = true;
          lastAngular = angular;
        });
        visual.render(vehicle, alpha);
      }
      assert.ok(peak > 0.002 && peak < 0.06, `visible bounded pitch/roll: ${peak}`);
      assert.ok(reversed, 'suspension rocks back after initial kick');
      assert.ok(maxCompression - minCompression > 0.008, 'suspension responds to the shot');
      assert.ok(tilt(initial, vehicle.current.rotation) < 0.001, 'hull settles within 3 seconds');
      assert.ok(vehicle.body.getAngularVelocity().length() < 0.005, 'no continuing vibration');
      assert.ok(Vector3.Distance(initialPosition, vehicle.current.position) < 0.5, 'no excessive slide');
      rates.push({ peak, position: vehicle.current.position.asArray(), rotation: vehicle.current.rotation.asArray() });
    }
    assert.deepEqual(rates[0], rates[1]); assert.deepEqual(rates[1], rates[2]);
    results.push({ direction: target.asArray(), peakDegrees: rates[0].peak * 180 / Math.PI });
  }
  vehicle.reset();
  assert.equal(vehicle.body.getLinearVelocity().length(), 0);
  assert.equal(vehicle.body.getAngularVelocity().length(), 0);
  console.log('Cannon recoil: attached shroud/sleeve/muzzle at 3 gun poses, interpolation/reset; directional suspension kick, rocking, settling and 30/60/120 FPS equality passed.', results);
} finally {
  turret.dispose(); visual.dispose(); vehicle.dispose(); tank.dispose(); floor.dispose(); ground.dispose(); scene.dispose(); engine.dispose();
}
