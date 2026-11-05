import assert from 'node:assert/strict';
import { FreeCamera, NullEngine, Scene, Vector3 } from '@babylonjs/core';
import { FreeFlyCamera } from '../src/game/camera/FreeFlyCamera.ts';
import { CombatInput } from '../src/game/input/CombatInput.ts';
import { bindDriveKeys } from '../src/game/input/DriveInput.ts';
const win = Object.assign(new EventTarget(), { closest: () => null }), doc = new EventTarget(), canvas = new EventTarget();
let removed = false;
Object.assign(globalThis, { window: win, document: Object.assign(doc, {
  createElement: () => ({ style: {}, hidden: true, remove() { removed = true; } }), body: { append() {} },
}) });
const engine = new NullEngine(), scene = new Scene(engine);
const normal = new FreeCamera('normal', new Vector3(10, 20, -30), scene);
normal.setTarget(new Vector3(10, 20, 100)); normal.getViewMatrix(true);
let enabled = true;
const free = new FreeFlyCamera(scene, canvas as HTMLCanvasElement, () => enabled, () => { combat.clear(); drive.clear(); });
const combat = new CombatInput(canvas as HTMLCanvasElement, () => !free.active, () => !free.active, () => {}, () => {});
const drive = bindDriveKeys(win as Window, () => {}, () => !free.active);
const key = (code: string, type = 'keydown', repeat = false) => win.dispatchEvent(Object.assign(new Event(type, { cancelable: true }), { code, repeat }));
const move = () => canvas.dispatchEvent(Object.assign(new Event('pointermove'), { pointerType: 'mouse', movementX: 100, movementY: -30 }));
try {
  const aim = () => canvas.dispatchEvent(Object.assign(new Event('pointerdown', { cancelable: true }), { pointerType: 'mouse', pointerId: 1, buttons: 2 }));
  key('KeyW'); key('KeyQ'); aim();
  assert.equal(drive.keys.forward, true); assert.equal(combat.aiming, true);
  key('Digit0'); assert.equal(free.active, true); assert.equal(scene.activeCamera, free.camera);
  assert.equal(drive.keys.forward, false); assert.equal(combat.aiming, false, 'entering flight clears gunner input');
  aim(); assert.equal(combat.aiming, false, 'flight blocks new gunner input');
  assert.ok(Vector3.Distance(free.camera.position, normal.position) < 1e-6);
  key('Digit0', 'keydown', true); assert.equal(free.active, true, 'held 0 cannot flicker modes');
  for (const fps of [30, 60, 120]) {
    free.camera.position.set(0, 0, 0); free.camera.rotation.set(0, 0, 0); free.camera.getViewMatrix(true);
    key('KeyW');
    for (let frame = 0; frame < fps; frame++) free.update(1 / fps);
    key('KeyW', 'keyup');
    assert.ok(Math.abs(free.camera.position.z - 25) < 1e-6, '25 m/s independent of frame rate');
  }
  key('KeyE'); key('ShiftLeft'); free.update(0.1);
  assert.equal(free.camera.position.y, 10); assert.equal(drive.keys.brake, false); assert.equal(combat.aiming, false);
  win.dispatchEvent(new Event('blur')); const stopped = free.camera.position.clone(); free.update(0.1);
  assert.deepEqual(free.camera.position, stopped, 'focus loss releases movement');
  move(); assert.ok(free.camera.rotation.y > 0); assert.ok(free.camera.rotation.x < 0);
  enabled = false; const rotation = free.camera.rotation.clone(); move(); key('Digit0');
  assert.deepEqual(free.camera.rotation, rotation); assert.equal(free.active, true);
  enabled = true; key('Numpad0'); assert.equal(scene.activeCamera, normal); assert.equal(free.active, false);
  key('KeyW'); assert.equal(drive.keys.forward, true, 'normal drive restored');
  key('Digit0'); free.dispose(); assert.equal(scene.activeCamera, normal); assert.equal(removed, true);
  key('Digit0'); assert.equal(free.active, false, 'disposed listeners cannot toggle');
  assert.equal(scene.cameras.length, 1);
  console.log('Free camera: toggle/repeat, pose/return, drive/combat gates, 30/60/120 FPS, speed, mouse, focus and disposal passed.');
} finally { combat.dispose(); drive.dispose(); scene.dispose(); engine.dispose(); }
