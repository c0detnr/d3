import assert from 'node:assert/strict';
import { applyDamage, damageRegion, driveDisabled, freshDamage, MODULES } from '../src/game/combat/DamageModel.ts';

const size = { x: 3.6, z: 6.8 };
for (const [point, expected] of [
  [{ x: -1.7, y: 0.7, z: 0 }, 'leftTrack'], [{ x: 1.7, y: 0.7, z: 0 }, 'rightTrack'],
  [{ x: 0, y: 1.3, z: -2.5 }, 'engine'], [{ x: 0, y: 2, z: 0 }, 'turret'],
  [{ x: 0, y: 1.2, z: 2.5 }, null],
] as const) assert.equal(damageRegion(point, size), expected);
for (const module of MODULES) {
  const state = freshDamage();
  assert.equal(driveDisabled(state), false);
  assert.ok(applyDamage(state, module)); assert.equal(state.hp, 75); assert.equal(state.modules[module], 50);
  assert.equal(driveDisabled(state), false);
  assert.ok(applyDamage(state, module)); assert.equal(state.hp, 50); assert.equal(state.modules[module], 0);
  assert.equal(driveDisabled(state), module !== 'turret');
  for (const other of MODULES) if (other !== module) assert.equal(state.modules[other], 100);
  applyDamage(state, null); applyDamage(state, null);
  assert.equal(state.hp, 0); assert.equal(driveDisabled(state), true);
  assert.equal(applyDamage(state, module), false, 'wrecks cannot retrigger damage/destruction');
  assert.equal(state.modules[module], 0);
}
const a = freshDamage(), b = freshDamage(); applyDamage(a, 'engine');
assert.equal(b.modules.engine, 100, 'vehicles and resets never share mutable module state');
console.log('Passed: hit regions, independent modules, two-hit failures, four-hit destruction, drive gating and dead-state idempotence.');
