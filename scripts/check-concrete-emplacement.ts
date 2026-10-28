import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import HavokPhysics from '@babylonjs/havok';
import { HavokPlugin, LoadAssetContainerAsync, Mesh, NullEngine, PhysicsAggregate, PhysicsShapeType, Scene, Vector3 } from '@babylonjs/core';
import { registerBuiltInLoaders } from '@babylonjs/loaders/dynamic.js';

registerBuiltInLoaders();
const engine = new NullEngine(), scene = new Scene(engine);
const wasmBinary = await readFile(new URL('../node_modules/@babylonjs/havok/lib/esm/HavokPhysics.wasm', import.meta.url));
scene.enablePhysics(new Vector3(0, -9.81, 0), new HavokPlugin(true, await HavokPhysics({ wasmBinary })));
const bodies: PhysicsAggregate[] = [];
try {
  const bytes = new Uint8Array(await readFile(new URL('../assets/environment/concrete_emplacement_01/concrete_emplacement_01.glb', import.meta.url)));
  const assets = await LoadAssetContainerAsync(bytes, scene, { pluginExtension: '.glb' }); assets.addAllToScene();
  const geometry = assets.meshes.filter((m): m is Mesh => m instanceof Mesh && m.getTotalVertices() > 0);
  const colliders = geometry.filter(m => m.metadata?.gltf?.extras?.collision_only);
  assert.equal(colliders.length, 7);
  assert.equal(assets.cameras.length, 0); assert.equal(assets.lights.length, 0);
  for (const mesh of colliders) {
    mesh.isVisible = false; mesh.isPickable = false; mesh.computeWorldMatrix(true);
    bodies.push(new PhysicsAggregate(mesh, PhysicsShapeType.MESH, { mass: 0 }, scene));
  }
  const physics = scene.getPhysicsEngine()!;
  const ray = (x: number, y: number) => physics.raycast(new Vector3(x, y, -8), new Vector3(x, y, 8));
  assert.ok(ray(0, 1.5).hasHit && ray(0, 2.4).hasHit, 'Main wall is solid cover');
  assert.ok(!ray(-3.9, 2.4).hasHit && !ray(3.9, 2.4).hasHit, 'Broken upper ends have no invisible wall');
  assert.ok(!ray(-5, 1).hasHit && !ray(5, 1).hasHit, 'Both ends can be passed');
  const visible = geometry.filter(m => !m.metadata?.gltf?.extras?.collision_only);
  visible.forEach(m => m.computeWorldMatrix(true));
  const lo = visible.reduce((v, m) => Vector3.Minimize(v, m.getBoundingInfo().boundingBox.minimumWorld), new Vector3(Infinity, Infinity, Infinity));
  const hi = visible.reduce((v, m) => Vector3.Maximize(v, m.getBoundingInfo().boundingBox.maximumWorld), new Vector3(-Infinity, -Infinity, -Infinity));
  assert.ok(Math.abs(hi.x - lo.x - 8.4) < 0.001 && Math.abs(hi.z - lo.z - 3.5) < 0.001);
  assert.ok(Math.abs(lo.y) < 0.001 && hi.y < 2.8 && hi.y > 2.5);
  bodies.forEach(b => b.dispose()); bodies.length = 0; assets.dispose();
  assert.equal(physics.getBodies().length, 0);
  console.log('Geçti: gerçek mevzi GLB metre/zemin, yedi gizli çarpışma, duvar/hasarlı köşe mermi sorguları, yan açıklık ve kaynak temizliği.');
} finally { bodies.forEach(b => b.dispose()); scene.dispose(); engine.dispose(); }
