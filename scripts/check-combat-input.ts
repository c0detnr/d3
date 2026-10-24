import assert from 'node:assert/strict';
import { CombatInput } from '../src/game/input/CombatInput.ts';
class Surface extends EventTarget {
  captures = new Set<number>(); hidden = false;
  setPointerCapture(id: number) { this.captures.add(id); }
  hasPointerCapture(id: number) { return this.captures.has(id); }
  releasePointerCapture(id: number) { this.captures.delete(id); }
}
const win = new Surface(), doc = new Surface();
Object.assign(globalThis, { window: win, document: doc });
function pointer(target: EventTarget, type: string, buttons: number) {
  const event = new Event(type); Object.assign(event, { pointerType: 'mouse', pointerId: 1, buttons, movementX: 10, movementY: -5 }); target.dispatchEvent(event);
}
for (let cycle = 0; cycle < 3; cycle++) {
  const canvas = new Surface(); let ready = true, enabled = true, moves = 0, releases = 0;
  const input = new CombatInput(canvas as unknown as HTMLCanvasElement, () => ready && enabled, () => enabled,
    () => moves++, () => releases++);
  pointer(canvas, 'pointerdown', 2); assert.equal(input.aiming, true);
  pointer(canvas, 'pointermove', 3); assert.equal(input.consumeFire(), true, 'chord adds one shot');
  pointer(canvas, 'pointermove', 3); assert.equal(input.consumeFire(), false, 'holding does not repeat');
  pointer(canvas, 'pointermove', 1); assert.equal(input.aiming, false); assert.equal(releases, 1);
  pointer(win, 'pointerup', 0);
  ready = false; pointer(canvas, 'pointerdown', 1); ready = true;
  assert.equal(input.consumeFire(), false, 'reload click is discarded at event time');
  pointer(canvas, 'pointermove', 1); assert.equal(input.consumeFire(), false, 'reload completion cannot auto fire');
  for (const cancel of ['blur', 'pointercancel', 'lostpointercapture', 'visibilitychange', 'keydown']) {
    input.clear(); pointer(canvas, 'pointerdown', 3);
    const event = new Event(cancel); Object.assign(event, { code: 'Escape' }); doc.hidden = true;
    (cancel === 'visibilitychange' ? doc : cancel === 'blur' || cancel === 'keydown' ? win : canvas).dispatchEvent(event);
    assert.equal(input.aiming, false, cancel); assert.equal(input.consumeFire(), false, cancel);
    pointer(canvas, 'pointermove', 3); assert.equal(input.consumeFire(), false, 'hover cannot restore fire');
  }
  input.clear(); enabled = false; pointer(canvas, 'pointerdown', 3);
  assert.equal(input.aiming, false); assert.equal(input.consumeFire(), false, 'overview blocks combat');
  input.dispose(); const before = moves; pointer(canvas, 'pointermove', 0); assert.equal(moves, before);
}
console.log('Combat input: chords, single press, reload rejection, overview, cancel/focus/Esc and 3 disposal cycles passed.');
