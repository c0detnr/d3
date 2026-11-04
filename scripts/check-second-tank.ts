import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { Matrix, NullEngine, Scene, Vector3 } from '@babylonjs/core';
import { loadTankModel } from '../src/game/vehicle/loadTankModel.ts';
import { extractTankRig } from '../src/game/vehicle/tankRig.ts';
import { TurretController } from '../src/game/vehicle/TurretController.ts';
import { WeaponSystem } from '../src/game/combat/WeaponSystem.ts';
import { TankVisual } from '../src/game/vehicle/TankVisual.ts';

const engine = new NullEngine();
const scene = new Scene(engine);
const bytes = new Uint8Array(await readFile(new URL('../assets/tanks/iron_dust_02/iron_dust_02.glb', import.meta.url)));
try {
  for (let cycle = 0; cycle < 3; cycle++) {
    const tank = await loadTankModel(scene, bytes, Vector3.Zero());
    const rig = extractTankRig(tank);
    const nodes = [...tank.assets.transformNodes, ...tank.assets.meshes];
    const find = (id: string) => nodes.find(n => n.metadata?.gltf?.extras?.asset_node_id === id)!;
    assert.equal(rig.wheels.length, 14);
    assert.equal(rig.wheels.filter(w => w.side === -1).length, 7);
    assert.ok(rig.wheels.every(w => w.radius > .5 && w.radius < .7));
    assert.ok(Math.abs(rig.size.z - 7.15) < .001);
    assert.equal(find('COL_Hull').isEnabled(), true);
    const collision = tank.assets.meshes.find(m => m.metadata?.gltf?.extras?.collision_only)!;
    assert.equal(collision.isVisible, false);
    const visible = tank.assets.meshes.filter(m => m.isVisible && m.getTotalVertices() > 0);
    assert.equal(visible.reduce((n, m) => n + m.getTotalIndices() / 3, 0), 27988);
    const minY = Math.min(...visible.map(m => m.getBoundingInfo().boundingBox.minimumWorld.y));
    assert.ok(Math.abs(minY) < .00001);
    const turret = new TurretController(tank);
    const weapon = new WeaponSystem(turret);
    const visual = new TankVisual(tank, rig);
    assert.equal(turret.recoilParts.length, 1);
    assert.equal(turret.recoilParts[0], find('GunRecoilRoot'));
    const attachments = ['Barrel', 'ThermalSleeve', 'MuzzleShroud', 'MuzzlePoint'];
    for (const target of [new Vector3(0, 10, 100), new Vector3(100, 5, 0), new Vector3(-40, 5, -100)]) {
      weapon.reset();
      for (let i = 0; i < 720; i++) turret.fixedUpdate(target, 1 / 60);
      const ray = turret.getMuzzleRay();
      assert.ok(Vector3.Dot(ray.direction, target.subtract(ray.origin).normalize()) > .9999);
      const rest = attachments.map(id => { const n = find(id); n.computeWorldMatrix(true); return n.getAbsolutePosition().clone(); });
      const shot = weapon.fire()!;
      assert.ok(Vector3.Distance(shot.origin, rest[3]) < .00001);
      assert.equal(weapon.fire(), undefined);
      for (let i = 0; i < 4; i++) weapon.fixedUpdate(1 / 60);
      weapon.render(1);
      for (let i = 0; i < attachments.length; i++) {
        const node = find(attachments[i]); node.computeWorldMatrix(true);
        const delta = node.getAbsolutePosition().subtract(rest[i]);
        assert.ok(Vector3.Distance(delta, shot.direction.scale(-weapon.recoilOffset)) < .00001, `${attachments[i]} must recoil exactly once`);
      }
      for (let i = 0; i < 300; i++) weapon.fixedUpdate(1 / 60);
      assert.ok(weapon.ready);
      assert.ok(Vector3.Distance(turret.getMuzzleRay().origin, rest[3]) < .00001);
    }
    weapon.reset(); turret.reset();
    assert.ok(Vector3.TransformNormal(Vector3.Forward(), find('MuzzlePoint').computeWorldMatrix(true)).normalize().z > .999);
    for (const id of ['Left_TrackBelt', 'Right_TrackBelt']) {
      const mesh = tank.assets.meshes.find(m => m.metadata?.gltf?.extras?.asset_node_id === id)!;
      assert.ok(mesh.isVerticesDataPresent('uv'));
      assert.ok(mesh.material?.name.endsWith('temporary-tread'));
    }
    visual.dispose(); turret.dispose(); tank.dispose();
    assert.equal(scene.meshes.length, 0); assert.equal(scene.transformNodes.length, 0); assert.equal(scene.materials.length, 0);
  }
  console.log('Second tank: actual GLB, 14 paired contacts, hidden collision, 27988 triangles, UV tracks, 3-direction fire/reload/single-root recoil and 3 cleanup cycles passed.');
} finally { scene.dispose(); engine.dispose(); }
