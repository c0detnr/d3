import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import HavokPhysics from '@babylonjs/havok';
import { HavokPlugin, MeshBuilder, NullEngine, PhysicsAggregate, PhysicsShapeType, Scene, Vector3 } from '@babylonjs/core';
import { FollowCamera } from '../src/game/camera/FollowCamera.ts';
import { loadTankModel } from '../src/game/vehicle/loadTankModel.ts';
import { extractTankRig } from '../src/game/vehicle/tankRig.ts';
import { TankVehicle } from '../src/game/vehicle/TankVehicle.ts';
import { TurretController } from '../src/game/vehicle/TurretController.ts';
const bytes = new Uint8Array(await readFile(new URL('../assets/tanks/iron_dust_01/iron_dust_01.glb', import.meta.url)));
const wasmBinary = await readFile(new URL('../node_modules/@babylonjs/havok/lib/esm/HavokPhysics.wasm', import.meta.url));
const havok = await HavokPhysics({ wasmBinary });
const engine = new NullEngine(), scene = new Scene(engine);
scene.enablePhysics(new Vector3(0, -9.81, 0), new HavokPlugin(true, havok)); scene.physicsEnabled = false;
try {
  for (let cycle = 0; cycle < 3; cycle++) {
    const canvas = new EventTarget() as HTMLCanvasElement;
    const tank = await loadTankModel(scene, bytes, Vector3.Zero());
    const vehicle = new TankVehicle(scene, extractTankRig(tank), Vector3.Zero());
    const turret = new TurretController(tank);
    const camera = new FollowCamera(scene, canvas);
    const update = () => camera.update(vehicle, tank.anchor.position, 1 / 60, turret);
    update(); const far = camera.camera.position.clone(), intent = camera.direction.clone();
    camera.aiming = true;
    for (let i = 0; i < 180; i++) update();
    assert.ok(camera.camera.position.x > 2.5, 'close camera is to the real +Z bore right');
    assert.ok(Vector3.Distance(camera.camera.position, tank.anchor.position) < 8);
    assert.ok(Vector3.Distance(camera.direction, intent) < 1e-9, 'transition preserves intent');
    const near = camera.camera.position.clone();
    const wheel = new Event('wheel'); Object.assign(wheel, { deltaY: 1000 }); canvas.dispatchEvent(wheel);
    for (let i = 0; i < 60; i++) update();
    assert.ok(Vector3.Distance(camera.camera.position, near) < 0.001, 'aim zoom is fixed');
    camera.aiming = false;
    for (let i = 0; i < 300; i++) update();
    assert.ok(Vector3.Distance(camera.camera.position, far) < 0.001, 'original follow distance restored');
    camera.impulse(); update(); assert.deepEqual(camera.direction, intent, 'kick never changes aim intent');
    const wall = MeshBuilder.CreateBox('camera-wall', { width: 30, height: 20, depth: 0.2 }, scene);
    wall.position.set(0, 5, -8); wall.computeWorldMatrix(true);
    const obstacle = new PhysicsAggregate(wall, PhysicsShapeType.BOX, { mass: 0 }, scene);
    // New camera boom must stay on the tank side of a thin wall.
    camera.follow(); update(); assert.ok(camera.camera.position.z > -7.6);
    const blocked = camera.camera.position.clone(); obstacle.dispose(); wall.dispose(); update();
    assert.ok(camera.camera.position.z < blocked.z && camera.camera.position.z > -10, 'obstruction recovery opens smoothly');
    camera.look(300, -100); const held = turret.angles; update();
    assert.deepEqual(turret.angles, held, 'camera alone never mutates gun angles');
    // Free look may point away from a sideways/backwards turret on zoom entry.
    for (const target of [new Vector3(100, 30, 0), new Vector3(-2, 0, -100)]) {
      camera.follow(); camera.look(1400, 120);
      for (let i = 0; i < 600; i++) turret.fixedUpdate(target, 1 / 60);
      turret.render(1);
      const free = camera.direction.clone(), heldAngles = turret.angles;
      camera.aiming = true;
      for (let i = 0; i < 180; i++) update();
      const bore = turret.getMuzzleRay().direction;
      assert.ok(Vector3.Dot(camera.camera.getForwardRay().direction, bore) > 0.99999, 'zoom faces actual bore including elevation');
      const offset = camera.camera.position.subtract(turret.yawPivot.getAbsolutePosition());
      const flat = new Vector3(bore.x, 0, bore.z).normalize();
      assert.ok(Vector3.Dot(offset, flat) < -4, 'shoulder stays behind rotated turret');
      assert.ok(Vector3.Dot(offset, Vector3.Cross(Vector3.Up(), flat)) > 2, 'shoulder stays on turret right');
      assert.deepEqual(turret.angles, heldAngles, 'zoom does not rotate turret');
      assert.deepEqual(camera.direction, free, 'free look stays independent');
      // Rotation while zoomed must continue to track the real rendered bore.
      for (let i = 0; i < 180; i++) { turret.fixedUpdate(new Vector3(100, 10, 100), 1 / 60); turret.render(1); update(); }
      assert.ok(Vector3.Dot(camera.camera.getForwardRay().direction, turret.getMuzzleRay().direction) > 0.99999);
      camera.aiming = false;
      for (let i = 0; i < 300; i++) update();
      assert.ok(Vector3.Dot(camera.camera.getForwardRay().direction, free) > 0.99999, 'release restores free look');
    }
    camera.overview(); assert.equal(camera.aiming, false);
    camera.dispose(); turret.dispose(); vehicle.dispose(); tank.dispose();
    assert.equal(scene.cameras.length, 0); assert.equal(scene.meshes.length, 0); assert.equal(scene.transformNodes.length, 0);
  }
  console.log('Camera turret zoom regression: real GLB shoulder, independent intent, fixed aim zoom, restored follow radius, Havok wall/recovery and 3 disposal cycles passed.');
} finally { scene.dispose(); engine.dispose(); }
