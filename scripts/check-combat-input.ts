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
function key(type: string, code: string) {
  const event = new Event(type, { cancelable: true }); Object.assign(event, { code }); win.dispatchEvent(event);
}
function wheel(canvas: EventTarget, deltaY: number, shiftKey = false, deltaMode = 0) {
  const event = new Event('wheel', { cancelable: true }); Object.assign(event, { deltaY, deltaMode, shiftKey });
  canvas.dispatchEvent(event); assert.ok(event.defaultPrevented, 'game wheel prevents page scroll');
}
for (let cycle = 0; cycle < 3; cycle++) {
  const canvas = new Surface(); let ready = true, enabled = true, moves = 0, releases = 0;
  const input = new CombatInput(canvas as unknown as HTMLCanvasElement, () => ready && enabled, () => enabled,
    () => moves++, () => releases++);
  key('keydown', 'KeyQ'); assert.equal(input.turretTurn, -1, 'Q turns left without zoom');
  key('keydown', 'KeyE'); assert.equal(input.turretTurn, 0, 'opposing keys cancel');
  key('keyup', 'KeyQ'); assert.equal(input.turretTurn, 1, 'E turns right');
  key('keyup', 'KeyE'); assert.equal(input.turretTurn, 0, 'release stops turning');
  wheel(canvas, -100); const regular = input.consumeElevation(); assert.ok(regular > 0, 'scroll up elevates');
  assert.equal(input.consumeElevation(), 0, 'wheel delta consumed once across physics substeps');
  wheel(canvas, -100, true); assert.ok(Math.abs(input.consumeElevation() - regular / 5) < 1e-12, 'Shift is five times finer');
  wheel(canvas, 3, false, 1); assert.ok(Math.abs(input.consumeElevation() + regular) < 1e-12, 'line-mode wheel lowers');
  const editable = new Surface(); Object.assign(editable, { closest: () => true });
  const editableKey = new Event('keydown'); Object.assign(editableKey, { code: 'KeyE' });
  Object.defineProperty(editableKey, 'target', { value: editable }); win.dispatchEvent(editableKey);
  assert.equal(input.turretTurn, 0, 'editing UI cannot turn the turret');
  key('keydown', 'KeyE');
  pointer(canvas, 'pointerdown', 2); assert.equal(input.aiming, true);
  wheel(canvas, -100); assert.equal(input.consumeElevation(), regular, 'wheel works while zoomed');
  pointer(canvas, 'pointermove', 3); assert.equal(input.consumeFire(), true, 'chord adds one shot');
  pointer(canvas, 'pointermove', 3); assert.equal(input.consumeFire(), false, 'holding does not repeat');
  pointer(canvas, 'pointermove', 1); assert.equal(input.aiming, false); assert.equal(releases, 1);
  pointer(win, 'pointerup', 0);
  canvas.dispatchEvent(new Event('lostpointercapture'));
  assert.equal(input.turretTurn, 1, 'normal mouse release preserves held E');
  key('keyup', 'KeyE');
  ready = false; pointer(canvas, 'pointerdown', 1); ready = true;
  assert.equal(input.consumeFire(), false, 'reload click is discarded at event time');
  pointer(canvas, 'pointermove', 1); assert.equal(input.consumeFire(), false, 'reload completion cannot auto fire');
  for (const cancel of ['blur', 'pointercancel', 'lostpointercapture', 'visibilitychange', 'keydown']) {
    input.clear(); key('keydown', 'KeyQ'); wheel(canvas, -100); pointer(canvas, 'pointerdown', 3);
    const event = new Event(cancel); Object.assign(event, { code: 'Escape' }); doc.hidden = true;
    (cancel === 'visibilitychange' ? doc : cancel === 'blur' || cancel === 'keydown' ? win : canvas).dispatchEvent(event);
    assert.equal(input.aiming, false, cancel); assert.equal(input.consumeFire(), false, cancel);
    assert.equal(input.turretTurn, 0, cancel); assert.equal(input.consumeElevation(), 0, cancel);
    pointer(canvas, 'pointermove', 3); assert.equal(input.consumeFire(), false, 'hover cannot restore fire');
  }
  input.clear(); enabled = false; pointer(canvas, 'pointerdown', 3);
  assert.equal(input.aiming, false); assert.equal(input.consumeFire(), false, 'overview blocks combat');
  key('keydown', 'KeyQ'); wheel(canvas, -100); assert.equal(input.turretTurn, 0); assert.equal(input.consumeElevation(), 0, 'overview blocks gun input');
  enabled = true;
  input.dispose(); key('keydown', 'KeyE'); canvas.dispatchEvent(Object.assign(new Event('wheel'), { deltaY: -100 }));
  assert.equal(input.turretTurn, 0); assert.equal(input.consumeElevation(), 0, 'disposed listeners cannot move gun');
  const before = moves; pointer(canvas, 'pointermove', 0); assert.equal(moves, before);
}
console.log('Combat input: Q/E, wheel normal/zoom/fine/line-mode, UI gating, chords, single press, reload rejection, overview, cancel/focus/Esc and 3 disposal cycles passed.');
