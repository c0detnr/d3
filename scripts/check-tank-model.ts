import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { NullEngine, Scene, Vector3 } from '@babylonjs/core';
import { loadTankModel } from '../src/game/vehicle/loadTankModel.ts';

const engine = new NullEngine();
const scene = new Scene(engine);
const bytes = new Uint8Array(await readFile(new URL('../assets/tanks/iron_dust_01/iron_dust_01.glb', import.meta.url)));
try {
  for (let cycle = 0; cycle < 3; cycle++) {
    const tank = await loadTankModel(scene, bytes, new Vector3(-34, 0, -42));
    const nodes = [...tank.assets.transformNodes, ...tank.assets.meshes];
    const find = (id: string) => nodes.find((node) => node.metadata?.gltf?.extras?.asset_node_id === id);
    assert.equal(find('GunPitchPivot')?.parent, find('TurretPivot'));
    assert.equal(find('MuzzlePoint')?.parent, find('GunPitchPivot'));
    assert.equal(nodes.filter((node) => /^(Left|Right)_RoadWheel_\d\d$/.test(node.name)).length, 12);
    const collision = tank.assets.meshes.find((mesh) => mesh.metadata?.gltf?.extras?.collision_only);
    assert.ok(collision);
    assert.equal(collision.isVisible, false);
    assert.equal(collision.isPickable, false);
    const visible = tank.assets.meshes.filter((mesh) => mesh.isVisible && mesh.getTotalVertices() > 0);
    assert.ok(visible.length > 0);
    assert.equal(visible.reduce((total, mesh) => total + mesh.getTotalIndices() / 3, 0), 14512);
    const min = visible.reduce((bounds, mesh) => Vector3.Minimize(bounds, mesh.getBoundingInfo().boundingBox.minimumWorld), new Vector3(Infinity, Infinity, Infinity));
    const max = visible.reduce((bounds, mesh) => Vector3.Maximize(bounds, mesh.getBoundingInfo().boundingBox.maximumWorld), new Vector3(-Infinity, -Infinity, -Infinity));
    assert.ok(Math.abs(min.y) < 0.00001, `track bottom: ${min.y}`);
    assert.ok(Math.abs(max.x - min.x - 4.16) < 0.001);
    assert.ok(Math.abs(max.z - min.z - 9.235) < 0.001);
    const muzzle = find('MuzzlePoint')!;
    muzzle.computeWorldMatrix(true);
    assert.ok(muzzle.getAbsolutePosition().z > -42, 'barrel points toward world +Z');
    tank.dispose();
    assert.equal(scene.meshes.length, 0);
    assert.equal(scene.transformNodes.length, 0);
    assert.equal(scene.materials.length, 0);
  }
  console.log('Tank GLB: scale, ground placement, +Z forward, hierarchy, hidden collision, geometry budget and 3 dispose cycles passed.');
} finally {
  scene.dispose();
  engine.dispose();
}
