import assert from 'node:assert/strict';
import { TouchControls } from '../src/game/input/TouchControls.ts';

class Element extends EventTarget {
  captures = new Set<number>();
  properties = new Map<string, string>();
  classes = new Set<string>();
  textContent = '';
  classList = { add: (s: string) => this.classes.add(s), remove: (s: string) => this.classes.delete(s), toggle: (s: string, enabled: boolean) => enabled ? this.classes.add(s) : this.classes.delete(s) };
  style = { setProperty: (name: string, value: string) => this.properties.set(name, value) };
  setPointerCapture(id: number) { this.captures.add(id); }
  hasPointerCapture(id: number) { return this.captures.has(id); }
  releasePointerCapture(id: number) { this.captures.delete(id); }
  getBoundingClientRect() { return { left: 0, top: 0, width: 100, height: 100 }; }
}
const win = new EventTarget();
const doc = Object.assign(new EventTarget(), { hidden: false });
Object.assign(globalThis, { window: win, document: doc });
const elements = new Map<string, Element>();
const root = { querySelector: (selector: string) => {
  if (!elements.has(selector)) elements.set(selector, new Element());
  return elements.get(selector)!;
} };
const canvas = new Element();
let ready = true, weapons = 0, looks = 0;
const touch = new TouchControls(root as unknown as HTMLElement, canvas as unknown as HTMLCanvasElement, {
  fireReady: () => ready, look: () => looks++, weapon: () => weapons++, reset: () => {}, sound: () => {},
});
const get = (name: string, stick = false) => root.querySelector(`[data-${stick ? 'stick' : 'action'}="${name}"]`);
const pointer = (el: Element, type: string, id: number, x = 50, y = 50) => {
  const event = new Event(type, { cancelable: true });
  Object.assign(event, { pointerId: id, pointerType: 'touch', clientX: x, clientY: y }); el.dispatchEvent(event);
};
pointer(get('drive', true), 'pointerdown', 1, 80, 10);
pointer(get('aim', true), 'pointerdown', 2, 80, 20);
pointer(get('fire'), 'pointerdown', 3);
assert.ok(touch.keys.forward && touch.keys.right && touch.turn > 0 && touch.elevation > 0 && touch.fireHeld);
assert.equal(touch.consumeFire(), true); assert.equal(touch.consumeFire(), false);
pointer(get('drive', true), 'pointerup', 9); assert.ok(touch.keys.forward, 'unrelated pointer cannot release drive');
pointer(get('fire'), 'pointerup', 3); assert.equal(touch.fireHeld, false); assert.ok(touch.keys.forward);
pointer(get('drive', true), 'pointercancel', 1); assert.equal(touch.keys.forward, false);
pointer(get('aim', true), 'lostpointercapture', 2); assert.equal(touch.turn, 0);
ready = false; pointer(get('fire'), 'pointerdown', 4); assert.equal(touch.consumeFire(), false, 'reload touch cannot queue a future shot');
win.dispatchEvent(new Event('blur')); assert.equal(touch.fireHeld, false);
pointer(get('brake'), 'pointerdown', 5); pointer(get('zoom'), 'pointerdown', 6);
assert.ok(touch.keys.brake && touch.aiming);
doc.hidden = true; doc.dispatchEvent(new Event('visibilitychange')); assert.equal(touch.keys.brake, false); assert.equal(touch.aiming, false);
pointer(canvas, 'pointerdown', 7); pointer(canvas, 'pointermove', 7, 70, 30); assert.equal(looks, 1);
get('weapon').dispatchEvent(new Event('click')); assert.equal(weapons, 1);
touch.dispose(); pointer(get('fire'), 'pointerdown', 8); pointer(canvas, 'pointermove', 7, 80, 30);
assert.equal(touch.fireHeld, false); assert.equal(looks, 1);
console.log('Touch controls: concurrent drive/aim/fire, pointer ownership, release/cancel/capture loss, reload, blur, visibility, camera and cleanup passed.');
