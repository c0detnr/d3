import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import HavokPhysics from '@babylonjs/havok';
import { HavokPlugin, Mesh, NullEngine, Scene, Vector3, type TransformNode } from '@babylonjs/core';
import { createKulLandmarks } from '../src/game/world/createKulLandmarks.ts';
import { KUL_FIELD_LANDMARKS } from '../src/game/world/kulLandmarkLayout.ts';
import { kulTerrainHeight } from '../src/game/world/kulVadisiLayout.ts';

const engine = new NullEngine(), scene = new Scene(engine);
const wasmBinary = await readFile(new URL('../node_modules/@babylonjs/havok/lib/esm/HavokPhysics.wasm', import.meta.url));
scene.enablePhysics(new Vector3(0, -9.81, 0), new HavokPlugin(true, await HavokPhysics({ wasmBinary })));
const glb = async (path: string) => new Uint8Array(await readFile(new URL(`../assets/environment/${path}`, import.meta.url)));
try {
  const before = { meshes: scene.meshes.length, nodes: scene.transformNodes.length, materials: scene.materials.length };
  const landmarks = await createKulLandmarks(scene, { ruin: await glb('farmhouse_ruin_01/farmhouse_ruin_01.glb'), wreck: await glb('armored_wreck_01/armored_wreck_01.glb') });
  const physics = scene.getPhysicsEngine()!;
  const colliderCount = { ruin: 20, wreck: 2 }, offsets: string[] = [];
  assert.equal(physics.getBodies().length, KUL_FIELD_LANDMARKS.reduce((n, p) => n + colliderCount[p.kind], 0));
  for (const p of KUL_FIELD_LANDMARKS) {
    const own = landmarks.meshes.filter(m => m.metadata.structure === p.id);
    const colliders = own.filter(m => m.metadata.gltf?.extras?.collision_only), visible = own.filter(m => !colliders.includes(m));
    assert.equal(colliders.length, colliderCount[p.kind], p.id);
    assert.ok(colliders.every(m => !m.isVisible && !m.isPickable && m.physicsBody?.getMotionType() === 0), `${p.id}: hidden static colliders`);
    assert.ok(own.every(m => m.metadata.battlefield === true && m.metadata.landmark === p.kind && m.metadata.surface === (p.kind === 'wreck' ? 'metal' : 'concrete')));
    assert.ok(visible.every(m => landmarks.shadowCasters.includes(m)));
    // Metre footprint along the landmark's own axes must fit the layout slot.
    const anchor = scene.getTransformNodeByName(p.id) as TransformNode;
    const ax = anchor.getDirection(Vector3.Right()), az = anchor.getDirection(Vector3.Forward());
    const corners = visible.flatMap(m => m.getBoundingInfo().boundingBox.vectorsWorld);
    const span = (axis: Vector3) => { const d = corners.map(c => Vector3.Dot(c, axis)); return [Math.min(...d), Math.max(...d)]; };
    const [x0, x1] = span(ax), [z0, z1] = span(az), minY = Math.min(...corners.map(c => c.y));
    const [width, depth] = [x1 - x0, z1 - z0];
    assert.ok(width <= p.width && depth <= p.depth && width > p.width - 1 && depth > p.depth - 1.3, `${p.id}: ${width.toFixed(2)} × ${depth.toFixed(2)} m`);
    const centre = ax.scale((x0 + x1) / 2).add(az.scale((z0 + z1) / 2));
    // loadFactoryBuilding centres the yawed world AABB, so a rotated asymmetric model may sit a few cm off its slot centre.
    const offset = Math.hypot(centre.x - p.x, centre.z - p.z);
    assert.ok(offset < 0.25 && Math.abs(minY - kulTerrainHeight(p.x, p.z)) < 1e-3, `${p.id}: centred on ground (${offset.toFixed(3)} m)`);
    offsets.push(`${p.id} ${width.toFixed(2)}×${depth.toFixed(2)} m, merkez sapması ${offset.toFixed(3)} m`);
    // Shell rays: only this landmark's bodies count.
    const ground = kulTerrainHeight(p.x, p.z);
    const shot = (at: Vector3, dir: Vector3) => {
      const hit = physics.raycast(at.subtract(dir.scale(15)), at.add(dir.scale(15)));
      return hit.hasHit && hit.body?.transformNode.metadata?.structure === p.id;
    };
    const centreOf = (name: string) => { const m = colliders.find(c => c.name.includes(name)); assert.ok(m, name); return m.getBoundingInfo().boundingBox.centerWorld; };
    const flat = (v: Vector3, y: number) => new Vector3(v.x, ground + y, v.z);
    const mid = new Vector3(p.x, 0, p.z);
    if (p.kind === 'ruin') {
      assert.ok(shot(flat(mid, 1), az) && shot(flat(mid, 1), ax), `${p.id}: hull-height walls/rubble stop shells`);
      assert.ok(shot(flat(centreOf('NorthWallE'), 3.3), az), `${p.id}: tall north wall stops shells`);
      assert.ok(shot(flat(centreOf('ChimneyStack'), 5.6), ax), `${p.id}: chimney is solid`);
      assert.ok(!shot(flat(mid, 4.6), ax), `${p.id}: no invisible roof`);
      const down = physics.raycast(flat(mid, 10), flat(mid, -1));
      assert.ok(down.hasHit && down.hitPointWorld.y - ground > 0.7, `${p.id}: interior filled, no room for a tank`);
    } else {
      assert.ok(shot(flat(mid, 1.2), az) && shot(flat(mid, 0.3), ax), `${p.id}: hull and running gear stop shells`);
      assert.ok(shot(flat(centreOf('Turret'), 2.0), az), `${p.id}: turret is solid`);
      assert.ok(!shot(flat(mid, 3.0), az), `${p.id}: nothing invisible above the wreck`);
    }
  }
  landmarks.dispose();
  assert.equal(physics.getBodies().length, 0);
  assert.deepEqual({ meshes: scene.meshes.length, nodes: scene.transformNodes.length, materials: scene.materials.length }, before);
  assert.ok(!scene.meshes.some(m => m instanceof Mesh && m.metadata?.landmark));
  console.log(offsets.join('; '));
  console.log('Geçti: 2 yıkık çiftlik evi + 2 enkaz gerçek GLB, ayak izi/zemin/merkez, gizli statik collider, mermi ışınları (alçak/yüksek duvar, baca, gövde, kule), dolu iç alan, görünmez tavan yok, kaynak temizliği.');
} finally { scene.dispose(); engine.dispose(); }
