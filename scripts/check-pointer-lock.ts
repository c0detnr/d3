import assert from 'node:assert/strict';
import { GamePointerLock } from '../src/game/input/GamePointerLock.ts';
import { CombatInput } from '../src/game/input/CombatInput.ts';
import { bindDriveKeys } from '../src/game/input/DriveInput.ts';
class Surface extends EventTarget {
  hidden = false;
  textContent = ''; innerHTML = ''; title = ''; dataset: Record<string, string> = {};
  setAttribute() {}
  removed = false;
  closest() { return null; }
  focus() {}
  remove() { this.removed = true; }
}
const win = new Surface();
const prompt = new Surface();
const doc = Object.assign(new Surface(), {
  pointerLockElement: null as Surface | null,
  body: { append() {} }, createElement: () => prompt,
  exitPointerLock() { this.pointerLockElement = null; this.dispatchEvent(new Event('pointerlockchange')); },
});
Object.assign(globalThis, { window: win, document: doc });
let allowed = true, requests = 0, moves = 0, zoom = 0;
const canvas = Object.assign(new Surface(), {
  setPointerCapture() { assert.fail('locked mouse must not request pointer capture'); },
  requestPointerLock() { requests++; doc.pointerLockElement = canvas; doc.dispatchEvent(new Event('pointerlockchange')); },
});
const lock = new GamePointerLock(canvas as unknown as HTMLCanvasElement, () => { combat.clear(); keys.clear(); }, () => allowed, true);
const combat = new CombatInput(canvas as unknown as HTMLCanvasElement, () => lock.active, () => lock.active, () => moves++, () => {}, notches => { zoom += notches; });
const keys = bindDriveKeys(win as unknown as Window, () => {}, () => lock.active);
const key = (code: string) => win.dispatchEvent(Object.assign(new Event('keydown', { cancelable: true }), { code }));
const pointer = (type: string, buttons = 0) => canvas.dispatchEvent(Object.assign(new Event(type, { cancelable: true }), {
  pointerType: 'mouse', pointerId: 1, buttons, movementX: 20, movementY: 5,
}));
assert.equal(lock.active, false);
key('KeyW'); key('KeyQ'); pointer('pointermove');
assert.equal(keys.keys.forward, false); assert.equal(moves, 0);
const wheel = () => canvas.dispatchEvent(Object.assign(new Event('wheel'), { deltaY: 100, deltaMode: 0 }));
wheel(); assert.equal(zoom, 0, 'unlocked wheel cannot zoom');
allowed = false; prompt.dispatchEvent(new Event('click')); assert.equal(requests, 0, 'loading cannot enter');
allowed = true; pointer('pointerdown', 1); assert.equal(requests, 1);
assert.equal(lock.active, true); assert.equal(prompt.hidden, true); assert.equal(combat.consumeFire(), false, 'entry cannot fire');
wheel(); assert.equal(zoom, 1, 'locked wheel zooms');
pointer('pointerdown', 1); assert.equal(combat.consumeFire(), true, 'locked left click fires');
pointer('pointerup', 0);
pointer('pointerdown', 2); assert.equal(combat.aiming, true, 'locked right click aims');
pointer('pointermove', 3); assert.equal(combat.consumeFire(), true, 'locked chord fires');
pointer('pointermove', 1); assert.equal(combat.aiming, false, 'right release keeps left held');
pointer('pointerup', 0); moves = 0;
key('KeyW'); key('KeyQ'); pointer('pointerdown', 3); pointer('pointermove', 3);
assert.equal(keys.keys.forward, true); assert.equal(combat.aiming, true); assert.equal(moves, 1);
key('AltLeft'); assert.equal(combat.freeLooking, true);
key('Escape');
assert.equal(combat.freeLooking, false, 'lock exit clears free look');
assert.equal(lock.active, false); assert.equal(prompt.hidden, false);
assert.equal(keys.keys.forward, false); assert.equal(combat.fireHeld, false); assert.equal(combat.consumeFire(), false); assert.equal(combat.aiming, false);
wheel(); assert.equal(zoom, 1, 'Escape stops zoom');
pointer('pointermove', 3); key('KeyW'); assert.equal(moves, 1); assert.equal(keys.keys.forward, false);
prompt.dispatchEvent(new Event('click')); assert.equal(lock.active, true); assert.equal(combat.fireHeld, false, 're-entry cannot resume held fire');
win.dispatchEvent(new Event('blur')); assert.equal(lock.active, false, 'blur releases lock');
prompt.dispatchEvent(new Event('click')); doc.hidden = true; doc.dispatchEvent(new Event('visibilitychange')); assert.equal(lock.active, false);
doc.hidden = false; prompt.dispatchEvent(new Event('click')); doc.exitPointerLock(); assert.equal(lock.active, false, 'browser initiated exit clears input');
canvas.requestPointerLock = () => { throw Error('denied'); };
prompt.dispatchEvent(new Event('click')); assert.equal(prompt.dataset.failed, 'true');
lock.dispose(); combat.dispose(); keys.dispose(); assert.equal(prompt.removed, true);
const mobile = new GamePointerLock(canvas as unknown as HTMLCanvasElement, () => assert.fail('mobile cleared'), () => true, false);
assert.equal(mobile.active, true); mobile.dispose();
console.log('Pointer lock: entry, focus gates, Escape, re-entry, blur, hidden tab, browser exit, failure, disposal and mobile passed.');
