import assert from 'node:assert/strict';
import { bindDriveKeys } from '../src/game/input/DriveInput.ts';
import { CombatInput } from '../src/game/input/CombatInput.ts';
class Surface extends EventTarget {
  captures = new Set<number>(); hidden = false;
  closest() { return false; }
  setPointerCapture(id: number) { this.captures.add(id); }
  hasPointerCapture(id: number) { return this.captures.has(id); }
  releasePointerCapture(id: number) { this.captures.delete(id); }
}
const win = new Surface(), doc = new Surface();
Object.assign(globalThis, { window: win, document: doc });
function pointer(target: EventTarget, type: string, buttons: number) {
  const event = new Event(type); Object.assign(event, { pointerType: 'mouse', pointerId: 1, buttons, movementX: 10, movementY: -5 }); target.dispatchEvent(event);
}
function key(type: string, code: string) {
  const event = new Event(type, { cancelable: true }); Object.assign(event, { code }); win.dispatchEvent(event);
}
function wheel(canvas: EventTarget, deltaY: number, shiftKey = false, deltaMode = 0, handled = true) {
  const event = new Event('wheel', { cancelable: true }); Object.assign(event, { deltaY, deltaMode, shiftKey });
  canvas.dispatchEvent(event); assert.equal(event.defaultPrevented, handled, 'wheel listener lifecycle');
}
for (let cycle = 0; cycle < 3; cycle++) {
  const canvas = new Surface(); let ready = true, enabled = true, moves = 0, releases = 0, zoom = 0;
  const input = new CombatInput(canvas as unknown as HTMLCanvasElement, () => ready && enabled, () => enabled,
    () => moves++, () => releases++, notches => { zoom += notches; });
  key('keydown', 'AltLeft'); assert.equal(input.freeLooking, true, 'Alt holds free look');
  pointer(canvas, 'pointermove', 0); assert.equal(moves, 1, 'Alt keeps camera look enabled');
  key('keydown', 'AltRight'); key('keyup', 'AltLeft');
  assert.equal(input.freeLooking, true, 'other Alt remains held');
  key('keyup', 'AltRight'); assert.equal(input.freeLooking, false, 'last Alt release resumes tracking');
  key('keydown', 'Space'); key('keydown', 'KeyQ'); key('keydown', 'KeyE');
  assert.equal(zoom, 0, 'retired alignment/turn keys do not issue camera commands');
  wheel(canvas, -100); assert.equal(zoom, -1, 'scroll up zooms in');
  wheel(canvas, -100, true); assert.equal(zoom, -2, 'Shift does not change zoom speed');
  wheel(canvas, 3, false, 1); assert.equal(zoom, -1, 'line-mode wheel zooms out');
  wheel(canvas, 0.25, false, 2); assert.equal(zoom, -0.75, 'page-mode preserves fractions');
  wheel(canvas, 10000); assert.equal(zoom, 3.25, 'large deltas are bounded');
  const editable = new Surface(); Object.assign(editable, { closest: () => true });
  const editableKey = new Event('keydown'); Object.assign(editableKey, { code: 'KeyE' });
  Object.defineProperty(editableKey, 'target', { value: editable }); win.dispatchEvent(editableKey);
  assert.equal(zoom, 3.25, 'editing UI does not issue camera commands');
  key('keydown', 'KeyE');
  pointer(canvas, 'pointerdown', 2); assert.equal(input.aiming, true);
  wheel(canvas, -100); assert.equal(zoom, 2.25, 'wheel works while aiming');
  pointer(canvas, 'pointermove', 3); assert.equal(input.consumeFire(), true, 'chord adds one shot');
  pointer(canvas, 'pointermove', 3); assert.equal(input.consumeFire(), false, 'holding does not repeat');
  pointer(canvas, 'pointermove', 1); assert.equal(input.aiming, false); assert.equal(releases, 1);
  pointer(win, 'pointerup', 0);
  canvas.dispatchEvent(new Event('lostpointercapture'));
  key('keyup', 'KeyE');
  ready = false; pointer(canvas, 'pointerdown', 1); ready = true;
  assert.equal(input.consumeFire(), false, 'reload click is discarded at event time');
  pointer(canvas, 'pointermove', 1); assert.equal(input.consumeFire(), false, 'reload completion cannot auto fire');
  for (const cancel of ['blur', 'pointercancel', 'lostpointercapture', 'visibilitychange', 'keydown']) {
    input.clear(); key('keydown', 'AltLeft'); assert.equal(input.freeLooking, true); key('keydown', 'KeyQ'); wheel(canvas, -100); pointer(canvas, 'pointerdown', 3);
    const event = new Event(cancel); Object.assign(event, { code: 'Escape' }); doc.hidden = true;
    (cancel === 'visibilitychange' ? doc : cancel === 'blur' || cancel === 'keydown' ? win : canvas).dispatchEvent(event);
    assert.equal(input.freeLooking, false, cancel);
    assert.equal(input.aiming, false, cancel); assert.equal(input.consumeFire(), false, cancel);
    pointer(canvas, 'pointermove', 3); assert.equal(input.consumeFire(), false, 'hover cannot restore fire');
  }
  input.clear(); enabled = false; pointer(canvas, 'pointerdown', 3);
  key('keydown', 'AltLeft'); assert.equal(input.freeLooking, false, 'disabled combat cannot enter free look');
  assert.equal(input.aiming, false); assert.equal(input.consumeFire(), false, 'overview blocks combat');
  const heldZoom = zoom;
  key('keydown', 'Space'); key('keydown', 'KeyQ'); wheel(canvas, -100);
  assert.equal(zoom, heldZoom, 'disabled combat blocks zoom');
  const heldMoves = moves; pointer(canvas, 'pointermove', 0);
  assert.equal(moves, heldMoves, 'disabled combat blocks mouse look');
  enabled = true;
  input.dispose(); wheel(canvas, -100, false, 0, false);
  assert.equal(zoom, heldZoom, 'disposed listeners cannot zoom');
  const before = moves; pointer(canvas, 'pointermove', 0); assert.equal(moves, before);
}
console.log('Combat input: Alt hold/release/cleanup, retired Q/E/Space, zoom pixel/line/page/bounds, UI gating, chords, single press, reload rejection, overview, cancel/focus/Esc and 3 disposal cycles passed.');

const drive = bindDriveKeys(win as unknown as Window, () => {});
key('keydown', 'Space'); assert.equal(drive.keys.brake, false, 'Space aim cannot brake');
key('keydown', 'ShiftLeft'); assert.equal(drive.keys.brake, true, 'left Shift brakes');
key('keyup', 'ShiftLeft'); assert.equal(drive.keys.brake, false, 'brake releases');
drive.dispose();
