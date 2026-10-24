import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { NullEngine, Scene, Vector3, Quaternion } from '@babylonjs/core';
import { MachineGun, MG } from '../src/game/combat/MachineGun.ts';
import { loadTankModel } from '../src/game/vehicle/loadTankModel.ts';
import { TurretController } from '../src/game/vehicle/TurretController.ts';
import { ProjectileSystem } from '../src/game/combat/ProjectileSystem.ts';
import { FixedStep } from '../src/game/core/fixedStep.ts';
const engine = new NullEngine(), scene = new Scene(engine);
const tankBytes = new Uint8Array(await readFile(new URL('../assets/tanks/iron_dust_01/iron_dust_01.glb', import.meta.url)));
const mgBytes = new Uint8Array(await readFile(new URL('../assets/weapons/iron_dust_mg_02/iron_dust_mg_02.glb', import.meta.url)));
const near = (a: number, b: number, epsilon = 1e-5) => assert.ok(Math.abs(a-b) < epsilon, `${a} != ${b}`);
try {
 for (let cycle = 0; cycle < 3; cycle++) {
  const tank = await loadTankModel(scene, tankBytes, Vector3.Zero());
  const turret = new TurretController(tank);
  const before = { meshes: scene.meshes.length, nodes: scene.transformNodes.length, cameras: scene.cameras.length, materials: scene.materials.length };
  const gun = await MachineGun.load(scene, mgBytes, turret.yawPivot);
  assert.equal(gun.mount.parent, turret.yawPivot);
  let ray = gun.getMuzzleRay();
  near(ray.direction.z, 1); near(ray.direction.y, 0);
  gun.updateCamera();
  const cameraBefore = gun.camera.position.clone();
  near(Vector3.Dot(gun.camera.getForwardRay().direction, ray.direction), 1);
  near(ray.origin.subtract(cameraBefore).length(), Math.hypot(0.18, 0.994, 0.19));
  gun.fixedUpdate(1/60, true, (origin) => assert.ok(origin.equalsWithEpsilon(ray.origin)));
  gun.updateCamera(); near(Vector3.Distance(gun.camera.position, cameraBefore), 0);
  gun.look(50, -50); ray = gun.getMuzzleRay();
  assert.ok(ray.direction.x > 0, 'mouse right aims right');
  assert.ok(ray.direction.y > 0, 'mouse up elevates');
  gun.look(1e6, -1e6); near(gun.angles.yaw, -MG.yawLimit); near(gun.angles.elevation, MG.maxElevation);
  assert.ok(gun.limited);
  gun.look(-1e6, 1e6); near(gun.angles.yaw, MG.yawLimit); near(gun.angles.elevation, MG.minElevation);
  gun.reset();
  turret.yawPivot.rotationQuaternion = Quaternion.RotationAxis(Vector3.Up(), 0.7);
  turret.yawPivot.computeWorldMatrix(true);
  gun.updateCamera();
  near(Vector3.Dot(gun.getMuzzleRay().direction, turret.getMuzzleRay().direction), 1);
  tank.anchor.rotationQuaternion = Quaternion.RotationYawPitchRoll(0.7, 0.1, -0.12);
  tank.anchor.computeWorldMatrix(true); gun.updateCamera();
  near(Vector3.Dot(gun.getMuzzleRay().direction, gun.camera.getForwardRay().direction), 1);
  for (const fps of [30,60,120]) {
   gun.reset(); const clock = new FixedStep(); let emitted = 0;
   for(let frame=0;frame<fps*10;frame++) clock.advance(1/fps, dt => gun.fixedUpdate(dt,true,()=>emitted++));
   assert.equal(emitted,100, `600 rounds/min at ${fps} FPS`);
   for(let i=0;i<120;i++) gun.fixedUpdate(1/60,false,()=>emitted++);
   assert.equal(emitted,100,'release/mode exit stops firing');
  }
  const pool = new ProjectileSystem(scene, (from, to) => to.z >= 1 && from.z < 1 ? { point: new Vector3(0,0,1), normal: new Vector3(0,0,-1), distance: 1 } : undefined, 40,
   { gravity: -9.81,maxRange: 600,maxAge: 3,trailLength: 2.2,trailSeconds: 0.015,diameter: 0.035 });
  pool.spawn(Vector3.Zero(),Vector3.Forward(),MG.speed); let hit=false;
  pool.fixedUpdate(1/60,()=>hit=true); assert.ok(hit,'MG cannot skip thin close obstacles'); pool.dispose();
  gun.dispose();
  assert.deepEqual({ meshes: scene.meshes.length, nodes: scene.transformNodes.length, cameras: scene.cameras.length, materials: scene.materials.length },before,'MG dispose returns scene resources');
  turret.dispose();tank.dispose();
 }
 console.log('MG02: real GLB mount, direction, recoil-independent POV, limits, hull/turret attachment, 30/60/120 FPS automatic fire, swept close hit and 3 cleanup cycles passed.');
} finally { scene.dispose();engine.dispose(); }
