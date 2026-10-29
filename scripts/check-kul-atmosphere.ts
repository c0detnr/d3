import assert from 'node:assert/strict';
import { FreeCamera, NullEngine, Scene, Vector3, type ParticleSystem } from '@babylonjs/core';
import { createKulAtmosphere, KUL_ATMOSPHERE } from '../src/game/world/createKulAtmosphere.ts';
import { KUL_FIELD_LANDMARKS } from '../src/game/world/kulLandmarkLayout.ts';
import { kulTerrainHeight } from '../src/game/world/kulVadisiLayout.ts';

const engine = new NullEngine(), scene = new Scene(engine);
new FreeCamera('atmosphere-camera', new Vector3(0, 20, -60), scene).setTarget(Vector3.Zero());
scene.render();
const counts = () => [scene.particleSystems.length, scene.textures.length, scene.materials.length, scene.meshes.length, scene.onBeforeRenderObservable.observers.length];
const baseline = counts();

for (let cycle = 0; cycle < 2; cycle++) {
  const atmosphere = createKulAtmosphere(scene);
  for (let frame = 0; frame < 10; frame++) scene.render();
  const systems = scene.particleSystems as ParticleSystem[];
  const smoke = systems.filter(ps => ps.metadata?.atmosphere === 'wreck-smoke');
  const wrecks = KUL_FIELD_LANDMARKS.filter(l => l.kind === 'wreck');
  assert.equal(smoke.length, wrecks.length);
  for (const w of wrecks) {
    const source = smoke.find(ps => (ps.emitter as Vector3).x === w.x && (ps.emitter as Vector3).z === w.z);
    assert.ok(source, `${w.id} duman kaynağı enkaz noktasında olmalı`);
    assert.ok(Math.abs((source!.emitter as Vector3).y - kulTerrainHeight(w.x, w.z) - KUL_ATMOSPHERE.wreckSmokeHeight) < 1e-6);
  }
  const total = systems.reduce((sum, ps) => sum + ps.getCapacity(), 0);
  assert.ok(systems.every(ps => ps.getCapacity() <= 300) && total <= 700, `Partikül bütçesi düşük kalmalı: ${total}`);
  assert.ok(systems.some(ps => ps.getActiveCount() > 0), 'Ön ısıtma sonrası partikül görünmeli');
  assert.equal(atmosphere.meshes.length, 0, 'Devre dışı alçak sis yüzeyi oluşturulmaz');
  atmosphere.dispose();
  assert.deepEqual(counts(), baseline, 'dispose sonrası sahne kaynakları başlangıca dönmeli');
}
scene.dispose(); engine.dispose();
console.log('Kül atmosferi kontrolü geçti');
