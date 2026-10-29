import assert from 'node:assert/strict';
import { applyDamage, damageRegion, driveDisabled, freshDamage, MODULES, trackPower } from '../src/game/combat/DamageModel.ts';

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
  assert.equal(driveDisabled(state), module === 'engine');
  assert.deepEqual(trackPower(state), { left: module === 'leftTrack' ? 0 : 1, right: module === 'rightTrack' ? 0 : 1 });
  for (const other of MODULES) if (other !== module) assert.equal(state.modules[other], 100);
  applyDamage(state, null); applyDamage(state, null);
  assert.equal(state.hp, 0); assert.equal(driveDisabled(state), true);
  assert.equal(applyDamage(state, module), false, 'wrecks cannot retrigger damage/destruction');
  assert.equal(state.modules[module], 0);
}
const a = freshDamage(), b = freshDamage(); applyDamage(a, 'engine');
assert.equal(b.modules.engine, 100, 'vehicles and resets never share mutable module state');
console.log('Passed: hit regions, independent modules, two-hit failures, four-hit destruction, drive gating and dead-state idempotence.');
import { ricochets } from '../src/game/combat/DamageModel.ts';
assert.equal(ricochets({ x: 0, y: 0, z: -1 }, { x: 0, y: 0, z: 1 }), false, 'head-on hit is not a ricochet');
assert.equal(ricochets({ x: 1, y: 0, z: -0.2 }, { x: 0, y: 0, z: 1 }), true, 'grazing hit ricochets');
assert.equal(ricochets({ x: 0.5, y: 0, z: -1 }, { x: 0, y: 0, z: 1 }), false, 'moderate angle still hits');
console.log('Passed: ricochet angle.');
