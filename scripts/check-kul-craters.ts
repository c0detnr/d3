import assert from 'node:assert/strict';
import { NullEngine, Scene } from '@babylonjs/core';
import { KUL_FIELD_COVER, KUL_FIELD_ROCKS } from '../src/game/world/kulBattlefieldLayout.ts';
import { KUL_CRATER_RIM, KUL_FIELD_CRATERS } from '../src/game/world/kulCraterLayout.ts';
import { KUL_FIELD_CROSSINGS, KUL_FIELD_LANDMARKS, KUL_LANDMARK_CLEARANCE } from '../src/game/world/kulLandmarkLayout.ts';
import { KUL_STRUCTURES, kulRoadDistance, kulTerrainHeight } from '../src/game/world/kulVadisiLayout.ts';
import { createKulGroundDecals } from '../src/game/world/createKulGroundDecals.ts';

const rectDistance = (x: number, z: number, p: { x: number; z: number; width: number; depth: number }) =>
  Math.hypot(Math.max(0, Math.abs(x - p.x) - p.width / 2), Math.max(0, Math.abs(z - p.z) - p.depth / 2));
const slope = (x: number, z: number) => Math.hypot(kulTerrainHeight(x + 1, z) - kulTerrainHeight(x - 1, z), kulTerrainHeight(x, z + 1) - kulTerrainHeight(x, z - 1)) / 2;

let maxSlope = 0;
assert.ok(KUL_FIELD_CRATERS.length >= 12 && KUL_FIELD_CRATERS.length <= 16, 'Krater sayısı');
for (const c of KUL_FIELD_CRATERS) {
  const id = `krater ${c.x},${c.z}`, outer = c.radius * KUL_CRATER_RIM.extent;
  assert.ok(KUL_FIELD_CRATERS.some(m => m.x === -c.x && m.z === -c.z && m.radius === c.radius && m.depth === c.depth), `${id}: nokta simetrisi`);
  assert.ok(Math.abs(c.x) <= 115 && Math.abs(c.z) <= 155, `${id}: merkez alan içinde`);
  assert.ok(kulRoadDistance(c.x, c.z) - outer >= 14, `${id}: yola uzak`);
  for (const x of KUL_FIELD_CROSSINGS) assert.ok(Math.abs(c.x - x) - outer >= 6, `${id}: x=${x} geçişi açık`);
  for (const p of KUL_FIELD_COVER) assert.ok(rectDistance(c.x, c.z, p) - outer >= 8, `${id}: mevziye uzak`);
  for (const r of KUL_FIELD_ROCKS) assert.ok(Math.hypot(c.x - r.x, c.z - r.z) - outer >= r.scale + 6, `${id}: kayaya uzak`);
  for (const l of KUL_FIELD_LANDMARKS) assert.ok(Math.hypot(c.x - l.x, c.z - l.z) >= KUL_LANDMARK_CLEARANCE[l.kind] + outer, `${id}: ${l.id} açıklığı`);
  for (const s of KUL_STRUCTURES) if (s.kind === 'hangar' || s.kind === 'workshop') assert.ok(rectDistance(c.x, c.z, s) - outer >= 10, `${id}: ${s.id} uzak`);
  for (const o of KUL_FIELD_CRATERS) if (o !== c) assert.ok(Math.hypot(c.x - o.x, c.z - o.z) >= outer + o.radius * KUL_CRATER_RIM.extent, `${id}: kraterler ayrık`);
  // Bowl is actually lowered and stays drivable across its whole footprint.
  const rim = Math.max(...[0, 1, 2, 3, 4, 5].map(a => kulTerrainHeight(c.x + Math.cos(a) * c.radius, c.z + Math.sin(a) * c.radius)));
  assert.ok(rim - kulTerrainHeight(c.x, c.z) > c.depth * 0.8, `${id}: çukur derinliği`);
  for (let dx = -outer; dx <= outer; dx += 0.5) for (let dz = -outer; dz <= outer; dz += 0.5) {
    if (Math.hypot(dx, dz) <= outer) maxSlope = Math.max(maxSlope, slope(c.x + dx, c.z + dz));
  }
}
assert.ok(maxSlope < 0.45, `Krater eğimi sürülebilir: ${maxSlope}`);

for (const l of KUL_FIELD_LANDMARKS) {
  const c = Math.cos(l.yaw), s = Math.sin(l.yaw), base = kulTerrainHeight(l.x, l.z);
  for (const lx of [-1, 0, 1]) for (const lz of [-1, 0, 1]) {
    const ax = lx * l.width / 2, az = lz * l.depth / 2;
    const y = kulTerrainHeight(l.x + ax * c + az * s, l.z - ax * s + az * c);
    assert.ok(Math.abs(y - base) < 0.01, `${l.id}: düz pad (${lx},${lz}) ${y - base}`);
  }
}

const engine = new NullEngine(), scene = new Scene(engine);
try {
  const baseline = { meshes: scene.meshes.length, materials: scene.materials.length, textures: scene.textures.length };
  for (let cycle = 0; cycle < 2; cycle++) {
    const decals = createKulGroundDecals(scene);
    assert.ok(decals.meshes.length > 0 && decals.meshes.length <= 4, 'Az sayıda birleşik decal mesh');
    for (const m of decals.meshes) assert.ok(!m.isPickable && !m.physicsBody, 'Decal fiziksiz ve seçilemez');
    const pos = decals.meshes[0].getVerticesData('position')!;
    for (let i = 0; i < pos.length; i += 3 * 97) assert.ok(pos[i + 1] - kulTerrainHeight(pos[i], pos[i + 2]) > 0.02, 'Decal arazinin üstünde');
    decals.dispose();
    assert.deepEqual({ meshes: scene.meshes.length, materials: scene.materials.length, textures: scene.textures.length }, baseline, 'Decal kaynakları temizlendi');
  }
} finally { scene.dispose(); engine.dispose(); }
console.log(`Geçti: ${KUL_FIELD_CRATERS.length} krater kuralları/simetri, en yüksek krater eğimi ${maxSlope.toFixed(3)}, landmark pad düzlüğü, decal temizliği.`);
