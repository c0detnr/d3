import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import { ArcRotateCamera, DirectionalLight, HavokPlugin, InstancedMesh, LoadAssetContainerAsync, NullEngine, Scene, ShadowGenerator, Vector3, type AbstractMesh } from '@babylonjs/core';
import HavokPhysics from '@babylonjs/havok';
import { createKulBattlefield, fieldSources } from '../src/game/world/createKulBattlefield.ts';

const engine = new NullEngine(), scene = new Scene(engine);
new ArcRotateCamera('check', 0, 0.8, 300, Vector3.Zero(), scene);
const havok = await HavokPhysics({ wasmBinary: await readFile(new URL('../node_modules/@babylonjs/havok/lib/esm/HavokPhysics.wasm', import.meta.url)) });
scene.enablePhysics(new Vector3(0, -9.81, 0), new HavokPlugin(true, havok));
scene.physicsEnabled = false;
const physics = scene.getPhysicsEngine()!;
const sources = Object.fromEntries(await Promise.all(Object.entries(fieldSources).map(async ([key, url]) =>
  [key, new Uint8Array(await readFile(new URL(url)))]))) as Record<keyof typeof fieldSources, Uint8Array>;
const cover = new Uint8Array(await readFile(new URL('../assets/environment/concrete_emplacement_01/concrete_emplacement_01.glb', import.meta.url)));
// glTF's scene-owned BRDF texture survives asset disposal.
(await LoadAssetContainerAsync(sources.pine, scene, { pluginExtension: '.glb' })).dispose();
const counts = () => [scene.meshes.length, scene.transformNodes.length, scene.materials.length, scene.textures.length, physics.getBodies().length];
const baseline = counts();
const source = (mesh: AbstractMesh) => mesh instanceof InstancedMesh ? mesh.sourceMesh : mesh;
const round = (n: number) => Math.round(n * 1e5) / 1e5;
const snapshotPath = process.argv[process.argv.indexOf('--snapshot') + 1];
const comparePath = process.argv[process.argv.indexOf('--compare') + 1];

try {
  for (let cycle = 0; cycle < 2; cycle++) {
    const field = await createKulBattlefield(scene, sources, cover);
    const shadows = new ShadowGenerator(2048, new DirectionalLight('sun', new Vector3(-1, -2, 1), scene));
    field.shadowCasters.forEach(mesh => shadows.addShadowCaster(mesh));
    scene.render();
    const nature = field.meshes.filter(mesh => /^(field-(rock|plant|dead-tree)|ridge-(tree|understory)|quarry-(rock|tree)|creek-(plant|pebble))-/.test(mesh.name) && !mesh.metadata?.treeTrunk && mesh.getTotalVertices() > 0);
    const placements = Object.fromEntries(nature.map(mesh => [mesh.name, {
      matrix: Array.from(mesh.getWorldMatrix().asArray(), round),
      min: mesh.getBoundingInfo().boundingBox.minimumWorld.asArray().map(round),
      max: mesh.getBoundingInfo().boundingBox.maximumWorld.asArray().map(round),
      vertices: mesh.getTotalVertices(), material: mesh.material?.name,
      pickable: mesh.isPickable, receivesShadows: mesh.receiveShadows,
    }]));
    const instances = nature.filter(mesh => mesh instanceof InstancedMesh);
    const summary = {
      natureParts: nature.length, instances: instances.length,
      uniqueNatureRenderSources: new Set(nature.map(source)).size,
      shadowParts: field.shadowCasters.length,
      uniqueShadowRenderSources: new Set(field.shadowCasters.map(source)).size,
      sceneMeshes: scene.meshes.length, physicsBodies: physics.getBodies().length,
    };
    if (process.argv.includes('--snapshot')) await writeFile(snapshotPath, JSON.stringify({ summary, placements }, null, 2) + '\n');
    else {
      assert.ok(instances.length > 300, 'Repeated decorative nature uses shared render sources');
      assert.ok(summary.uniqueNatureRenderSources < nature.length / 4, 'Nature render sources reduced by at least 75%');
      assert.ok(instances.every(m => !m.physicsBody && m.isWorldMatrixFrozen), 'Static instances are frozen and have no physics');
      assert.ok(instances.every(m => m.material === m.sourceMesh.material), 'Instances keep the shared source material');
      assert.ok(instances.every(m => m.getWorldMatrix().determinant() * m.sourceMesh.getWorldMatrix().determinant() > 0), 'glTF handedness matches each source');
      if (process.argv.includes('--compare')) {
        const previous = JSON.parse(await readFile(comparePath, 'utf8'));
        assert.deepEqual(Object.keys(placements).sort(), Object.keys(previous.placements).sort(), 'Same nature parts remain');
        for (const [name, placement] of Object.entries(placements)) {
          assert.deepEqual(placement, previous.placements[name], `${name}: scale, orientation, bounds, materials and picking unchanged`);
        }
        assert.equal(summary.physicsBodies, previous.summary.physicsBodies, 'Collision bodies unchanged');
      }
    }
    if (!cycle) console.log(JSON.stringify(summary));
    const light = shadows.getLight(); shadows.dispose(); light.dispose(); field.dispose();
    assert.deepEqual(counts(), baseline, 'Reload leaves no meshes, transform nodes, materials, textures or bodies');
  }
  console.log('Geçti: doğa render kaynakları, yerleşim ve iki kur/kapat çevriminde temizlik (NullEngine; GPU/FPS ölçümü değildir).');
} finally { scene.dispose(); engine.dispose(); }
