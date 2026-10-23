import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { ArcRotateCamera, HavokPlugin, NullEngine, Scene, Vector3 } from '@babylonjs/core';
import HavokPhysics from '@babylonjs/havok';
import { createTestGround } from '../src/game/world/createTestGround.ts';
import { terrainHeight, pathWeight } from '../src/game/world/terrain.ts';

const wasmBinary = await readFile(new URL('../node_modules/@babylonjs/havok/lib/esm/HavokPhysics.wasm', import.meta.url));
const havok = await HavokPhysics({ wasmBinary });
const engine = new NullEngine();
const scene = new Scene(engine);
new ArcRotateCamera('test-camera', 0, 1, 20, Vector3.Zero(), scene);
scene.enablePhysics(new Vector3(0, -9.81, 0), new HavokPlugin(true, havok));
const physics = scene.getPhysicsEngine()!;
const baseline = { meshes: scene.meshes.length, materials: scene.materials.length, textures: scene.textures.length };
let previousTrees = '';
for (let cycle = 0; cycle < 3; cycle++) {
  const ground = createTestGround(scene);
  scene.render();
  const heightAt = (x: number, z: number) => {
    const hit = physics.raycast(new Vector3(x, 80, z), new Vector3(x, -30, z));
    assert.ok(hit.hasHit, `Zemin bulunamadı: ${x}, ${z}`);
    return hit.hitPointWorld.y;
  };
  for (const dx of [-4, 0, 4]) for (const dz of [-5, 0, 5]) {
    assert.ok(Math.abs(heightAt(ground.spawn.x + dx, ground.spawn.z + dz)) < 0.03,
      'Tankın iki paleti ve başlangıç çevresi düz zeminde olmalı');
  }
  // Sample the actual render triangles, including off-grid coordinates. Ray hits must
  // match rendered height rather than just the analytic height generator.
  const positions = ground.terrain.getVerticesData('position')!;
  const indices = ground.terrain.getIndices()!;
  const normals = ground.terrain.getVerticesData('normal')!;
  assert.ok(normals[1] > 0, 'Arazi üst yüzeyi yukarı bakmalı');
  let minHeight = Infinity, maxHeight = -Infinity;
  for (let triangle = 4998; triangle < indices.length - 3; triangle += 1611) {
    const a = indices[triangle] * 3, b = indices[triangle + 1] * 3, c = indices[triangle + 2] * 3;
    const x = (positions[a] + positions[b] + positions[c]) / 3;
    const z = (positions[a + 2] + positions[b + 2] + positions[c + 2]) / 3;
    const y = (positions[a + 1] + positions[b + 1] + positions[c + 1]) / 3;
    if (Math.abs(x) > 160 || Math.abs(z) > 160) continue;
    // Decorations may be above the terrain: isolate the terrain collider for these rays.
    const hit = physics.raycast(new Vector3(x, y + 0.08, z), new Vector3(x, y - 1, z));
    assert.ok(hit.hasHit && Math.abs(hit.hitPointWorld.y - y) < 0.025,
      `Görsel arazi/çarpışma eşleşmeli: ${x}, ${z}`);
    minHeight = Math.min(minHeight, y); maxHeight = Math.max(maxHeight, y);
  }
  assert.ok(maxHeight - minHeight > 4, 'Arazi anlamlı doğal yükseklik farkına sahip olmalı');
  assert.ok(Math.abs(heightAt(-300, -300) - terrainHeight(-300, -300)) < 0.04, 'Uzak tepeler de sürekli zemine ait olmalı');
  assert.ok(ground.treePositions.length > 250, 'İleride yoğun bir orman bulunmalı');
  for (const tree of ground.treePositions) {
    assert.ok(Math.hypot(tree.x + 34, tree.z + 42) >= 29, 'Tank çevresi açık kalmalı');
    assert.ok(pathWeight(tree.x, tree.z) <= 0.12, 'Ağaçlar patikayı kapatmamalı');
  }
  const nearTree = ground.treePositions.find(tree => Math.abs(tree.x) < 110 && tree.z > 25 && tree.z < 110)!;
  const trunkHit = physics.raycast(new Vector3(nearTree.x - 2, terrainHeight(nearTree.x, nearTree.z) + 2, nearTree.z),
    new Vector3(nearTree.x + 2, terrainHeight(nearTree.x, nearTree.z) + 2, nearTree.z));
  assert.ok(trunkHit.hasHit, 'Yakın orman gövdeleri fiziksel engel olmalı');
  const slopeHit = physics.raycast(new Vector3(-50, 20, -42), new Vector3(-50, -5, -42));
  assert.ok(slopeHit.hasHit && slopeHit.body?.transformNode.name === 'side-slope-test', 'Yan eğim yüzeyi');
  const layout = JSON.stringify(ground.treePositions);
  if (cycle) assert.equal(layout, previousTrees, 'Dünya tekrar kurulumda aynı yerleşimi üretmeli');
  previousTrees = layout;
  ground.dispose();
  assert.equal(scene.meshes.length, baseline.meshes, 'Harita meshleri temizlenmeli');
  assert.equal(scene.materials.length, baseline.materials, 'Harita materyalleri temizlenmeli');
  assert.equal(scene.textures.length, baseline.textures, 'Harita kaplamaları temizlenmeli');
  assert.equal(physics.getBodies().length, 0, 'Harita fizik gövdeleri temizlenmeli');
}
scene.dispose();
engine.dispose();
console.log('Geçti: düz tank açıklığı, doğal eğimler, görsel/fizik üçgen eşleşmesi, uzak arazi, orman/patika ve gövde çarpışması, deterministik yerleşim, üç kur/temizle çevrimi.');
