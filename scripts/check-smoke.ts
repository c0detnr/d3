import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { FreeCamera, GetEnvironmentBRDFTexture, NullEngine, Scene, Vector3 } from '@babylonjs/core';
import { FixedStep } from '../src/game/core/fixedStep.ts';
import { SMOKE, SmokeModel, smokeLifetime, smokeOpticalDepth, smokeStrength } from '../src/game/items/SmokeModel.ts';
import { SmokeSupply } from '../src/game/items/SmokeSupply.ts';

const centers = [-6, 0, 6].map(x => new Vector3(x, 2.1, 12));
const model = new SmokeModel();
assert.equal(model.fire(centers), false, 'empty inventory cannot fire');
for (let i = 0; i < SMOKE.capacity; i++) assert.ok(model.collect());
assert.equal(model.collect(), false, 'capacity cannot overflow');
assert.equal(model.fire(centers.slice(1)), false, 'invalid salvo does not consume ammo');
assert.ok(model.fire(centers)); assert.equal(model.count, 2);
assert.equal(model.fire(centers), false, 'cooldown cannot consume another charge');
assert.equal(model.clouds.length, 3);
assert.equal(model.blocksSight(new Vector3(0, 2, 0), new Vector3(0, 2, 24)), false, 'capsule flight does not instantly blind');
model.fixedUpdate(SMOKE.flight + SMOKE.growth);
const from = new Vector3(0, 2, 0), to = new Vector3(0, 2, 24);
assert.ok(model.blocksSight(from, to), 'full curtain blocks AI sight');
assert.ok(model.blocksSight(to, from), 'same concealment in both directions');
assert.ok(model.blocksSight(centers[1], to), 'observer inside smoke cannot see through');
assert.ok(model.blocksSight(from, centers[1]), 'target inside smoke is concealed');
assert.equal(model.blocksSight(from, new Vector3(0, 2, 3)), false, 'objects in front remain visible');
assert.equal(model.blocksSight(new Vector3(0, 20, 0), new Vector3(0, 20, 24)), false, 'above cloud remains visible');
assert.equal(smokeOpticalDepth(from, from, model.clouds), 0, 'zero length ray');
assert.equal(smokeStrength(smokeLifetime), 0);
model.fixedUpdate(smokeLifetime);
assert.equal(model.clouds.length, 0); assert.equal(model.cooldown, 0);
assert.ok(model.fire(centers));
model.reset(); assert.equal(model.count, 0); assert.equal(model.clouds.length, 0);

for (const fps of [30, 60, 120]) {
  const state = new SmokeModel(), clock = new FixedStep(); state.collect(); state.fire(centers);
  for (let frame = 0; frame < fps * 22; frame++) clock.advance(1 / fps, dt => state.fixedUpdate(dt));
  assert.equal(state.cooldown, 0); assert.equal(state.clouds.length, 0, `lifetime at ${fps} FPS`);
}

const engine = new NullEngine(), scene = new Scene(engine);
const camera = new FreeCamera('test', new Vector3(0, 4, -10), scene); scene.activeCamera = camera;
// PBR's shared scene lookup is owned by the scene, not by a particular loaded item.
GetEnvironmentBRDFTexture(scene);
const bytes = async (file: string) => new Uint8Array(await readFile(new URL(`../assets/items/smoke_supply_01/${file}.glb`, import.meta.url)));
const crate = await bytes('smoke_supply_01'), capsule = await bytes('smoke_capsule_01');
const resources = () => [scene.meshes.length, scene.transformNodes.length, scene.materials.length, scene.textures.length, scene.postProcesses.length];
const baseline = resources();
try {
  for (let cycle = 0; cycle < 2; cycle++) {
    const system = await SmokeSupply.load(scene, crate, capsule, Vector3.Zero(), () => 0, cycle * Math.PI);
    assert.equal(system.supplies.length, 3);
    const supply = system.supplies[0];
    const children = supply.anchor.getChildMeshes();
    assert.ok(children.some(mesh => mesh.getTotalVertices() > 0), 'actual GLB loaded');
    let minY = Infinity, maxY = -Infinity, minX = Infinity, maxX = -Infinity;
    for (const mesh of children) {
      mesh.computeWorldMatrix(true);
      const box = mesh.getBoundingInfo().boundingBox;
      minY = Math.min(minY, box.minimumWorld.y); maxY = Math.max(maxY, box.maximumWorld.y);
      minX = Math.min(minX, box.minimumWorld.x); maxX = Math.max(maxX, box.maximumWorld.x);
      assert.equal(mesh.isPickable, false, 'loot cannot obstruct aim');
    }
    assert.ok(minY >= -.001 && maxY < .8 && maxX-minX < 1, 'metre scale and ground alignment');
    assert.equal(system.collect(new Vector3(100, 0, 100), () => true), false, 'range gate');
    assert.equal(system.collect(Vector3.Zero(), () => false), false, 'wall gate');
    assert.ok(system.collect(Vector3.Zero(), () => true));
    assert.equal(system.collect(Vector3.Zero(), () => true), false, 'same crate cannot be collected twice');
    assert.equal(system.model.count, 1); assert.equal(supply.anchor.isEnabled(), false);
    assert.ok(system.fire(new Vector3(0, 2, 0), Vector3.Forward(), (_from, to) => to));
    system.fixedUpdate(3); system.render();
    assert.equal(scene.postProcesses.length, baseline[4] + 1, 'depth screen attaches');
    const otherCamera = new FreeCamera('other', new Vector3(0, 2, 12), scene); scene.activeCamera = otherCamera;
    system.render(); assert.equal(scene.postProcesses.length, baseline[4] + 1, 'camera switch releases previous effect');
    system.reset(); assert.ok(supply.anchor.isEnabled()); assert.equal(system.model.count, 0);
    assert.equal(scene.postProcesses.length, baseline[4], 'reset releases depth resources');
    scene.activeCamera = camera; otherCamera.dispose(); system.dispose();
    assert.deepEqual(resources(), baseline, `dispose releases resources; remaining textures: ${scene.textures.map(t => t.name).join(', ')}`);
  }
  console.log('SMOKE PASS: capacity/consumption/cooldown, growth/fade, bilateral depth, inside/foreground/above, 30/60/120 FPS, actual GLBs, range/wall/duplicate gates, reset and camera/disposal lifecycle.');
} finally { scene.dispose(); engine.dispose(); }
