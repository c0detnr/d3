import assert from 'node:assert/strict';
import { CombatInput } from '../src/game/input/CombatInput.ts';
class Surface extends EventTarget {
  hidden = false;
  setPointerCapture() {}
  hasPointerCapture() { return false; }
}
const win = new Surface(), doc = new Surface(), canvas = new Surface();
Object.assign(globalThis, { window: win, document: doc });
let allowed = true;
const input = new CombatInput(canvas as unknown as HTMLCanvasElement, () => allowed, () => allowed, () => {}, () => {});
const press = () => canvas.dispatchEvent(Object.assign(new Event('pointerdown'), { pointerType: 'mouse', pointerId: 1, buttons: 1 }));
press();assert.equal(input.fireHeld,true);input.consumeFire();assert.equal(input.fireHeld,true,'automatic fire survives edge consumption');
win.dispatchEvent(Object.assign(new Event('pointerup'),{pointerId:1,buttons:0}));assert.equal(input.fireHeld,false,'release stops automatic fire');
for(const stop of ['blur','pointercancel','visibilitychange','keydown']) {
 press();doc.hidden=true;
 (stop==='blur'||stop==='keydown'?win:stop==='visibilitychange'?doc:canvas).dispatchEvent(Object.assign(new Event(stop),{code:'Escape'}));
 assert.equal(input.fireHeld,false,stop);
}
press();input.clear();assert.equal(input.fireHeld,false,'weapon switching clears held fire');
press();allowed=false;assert.equal(input.fireHeld,false,'disabled combat cannot fire');
input.dispose();allowed=true;press();assert.equal(input.fireHeld,false,'disposed listener cannot start fire');
console.log('MG held input: press, release, edge consumption, mode switch, blur, cancellation, hidden tab, Escape and disposal passed.');
