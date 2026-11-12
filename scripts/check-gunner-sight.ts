import assert from 'node:assert/strict';
import { nextSightMode, sightMagnification, rangeSample, rangeVisible, sightAzimuth, LRF } from '../src/game/aim/gunnerSightModel.ts';
import { CombatInput } from '../src/game/input/CombatInput.ts';
import { ThermalView } from '../src/game/effects/ThermalView.ts';
import { FreeCamera, MeshBuilder, NullEngine, Scene, Vector3 } from '@babylonjs/core';

assert.equal(nextSightMode('DAY'), 'WHT');
assert.equal(nextSightMode(nextSightMode(nextSightMode('DAY'))), 'DAY');
assert.equal(sightMagnification(0.8), 1);
assert.ok(Math.abs(sightMagnification(0.2) - 4.213829294) < 1e-6);
assert.ok(sightMagnification(0.2) > sightMagnification(0.5));
assert.equal(sightMagnification(NaN), 1);
assert.equal(sightAzimuth(0, 1), '000');
assert.equal(sightAzimuth(-1, 0), '270');
assert.equal(sightAzimuth(-0.0001, 1), '000');
const sample = rangeSample(1239.7, 10);
assert.equal(sample.meters, 1240);
assert.equal(rangeVisible(sample, 13.999), true);
assert.equal(rangeVisible(sample, 14), false);
for (const distance of [null, -1, Infinity, NaN, LRF.maxRange + 1]) assert.equal(rangeSample(distance, 0).meters, null);
assert.equal(rangeSample(LRF.maxRange, 0).meters, LRF.maxRange);
assert.equal(rangeVisible(undefined, 0), false);

class Surface extends EventTarget {
  hidden = false;
  closest() { return false; }
}
const win = new Surface(), doc = new Surface(), canvas = new Surface();
Object.assign(globalThis, { window: win, document: doc });
let enabled = true;
const input = new CombatInput(canvas as unknown as HTMLCanvasElement, () => enabled, () => enabled, () => {}, () => {});
function key(code: string, values = {}) {
  const e = new Event('keydown', { cancelable: true }); Object.assign(e, { code, ...values }); win.dispatchEvent(e);
}
key('KeyT'); assert.equal(input.consumeThermal(), false, 'thermal requires right mouse');
key('KeyL'); assert.equal(input.consumeRange(), true, 'LRF available in ordinary view');
const right = new Event('pointerdown', { cancelable: true });
Object.assign(right, { pointerType: 'mouse', pointerId: 1, buttons: 2 }); canvas.dispatchEvent(right);
key('KeyT'); assert.equal(input.consumeThermal(), true);
assert.equal(input.consumeThermal(), false, 'one cycle per keydown');
key('KeyT', { repeat: true }); assert.equal(input.consumeThermal(), false);
key('KeyT', { ctrlKey: true }); assert.equal(input.consumeThermal(), false);
const editable = new Event('keydown'); Object.assign(editable, { code: 'KeyL' });
Object.defineProperty(editable, 'target', { value: { closest: () => true } }); win.dispatchEvent(editable);
assert.equal(input.consumeRange(), false, 'typing does not range');
key('KeyL'); input.clear(); assert.equal(input.consumeRange(), false, 'focus loss clears pending query');
enabled = false; key('KeyL'); assert.equal(input.consumeRange(), false);
input.dispose(); enabled = true; key('KeyL'); assert.equal(input.consumeRange(), false, 'disposed listener removed');

const engine = new NullEngine(), scene = new Scene(engine), camera = new FreeCamera('test', Vector3.Zero(), scene);
const cold = MeshBuilder.CreateBox('wall', {}, scene), hot = MeshBuilder.CreateBox('tank', {}, scene);
const materials = scene.materials.length, textures = scene.textures.length;
const thermal = new ThermalView(scene, camera);
const unregister = thermal.register([hot]);
for (let i = 0; i < 3; i++) {
  thermal.setMode('WHT');
  assert.equal(scene.customRenderTargets.length, 1);
  const mask = scene.customRenderTargets[0];
  assert.equal(hot.getMaterialForRenderPass(mask.renderPassId)?.name, 'thermal-hot');
  assert.equal(cold.getMaterialForRenderPass(mask.renderPassId)?.name, 'thermal-cold');
  const later = MeshBuilder.CreateBox('later', {}, scene);
  mask.onBeforeBindObservable.notifyObservers(mask);
  assert.equal(later.getMaterialForRenderPass(mask.renderPassId)?.name, 'thermal-cold', 'new occluders enter mask');
  later.dispose();
  thermal.setMode('BHT'); assert.equal(scene.customRenderTargets.length, 1, 'polarity reuses target');
  thermal.setMode('DAY');
  assert.equal(scene.customRenderTargets.length, 0);
  assert.equal(scene.materials.length, materials);
  assert.equal(scene.textures.length, textures);
  assert.equal(camera._postProcesses.filter(Boolean).length, 0);
}
unregister(); thermal.dispose(); scene.dispose(); engine.dispose();
console.log('Gunner sight: mode, magnification, azimuth, LRF hold/range, input gates and thermal lifecycle passed.');
