import assert from 'node:assert/strict';
import test from 'node:test';
import { DAMAGE, applyDamage, driveDisabled, freshDamage, hitFacing, tickDamage, trackPower, turretTraverse } from './DamageModel.ts';

const size = { x: 3.6, z: 7.6 };

test('hit facing scales shell damage: front < side < rear', () => {
  assert.equal(hitFacing({ x: 0, z: 3.5 }, size), 'front');
  assert.equal(hitFacing({ x: 1.7, z: .4 }, size), 'side');
  assert.equal(hitFacing({ x: -.2, z: -3.6 }, size), 'rear');
  const hp = (facing: 'front' | 'side' | 'rear') => { const s = freshDamage(); applyDamage(s, null, facing); return s.hp; };
  assert.ok(hp('front') > hp('side') && hp('side') > hp('rear'));
  assert.equal(hp('side'), 75);
});

test('a destroyed module is field-repaired after the repair delay', () => {
  const s = freshDamage();
  applyDamage(s, 'leftTrack'); applyDamage(s, 'leftTrack');
  assert.equal(s.modules.leftTrack, 0); assert.equal(trackPower(s).left, 0);
  for (let t = 0; t < DAMAGE.repairSeconds - .1; t += 1 / 60) tickDamage(s, 1 / 60);
  assert.equal(s.modules.leftTrack, 0);
  for (let i = 0; i < 12; i++) tickDamage(s, 1 / 60);
  assert.equal(s.modules.leftTrack, DAMAGE.repairTo);
  assert.ok(trackPower(s).left > 0 && trackPower(s).left < 1);
});

test('engine kill starts a fire that burns HP but never finishes the tank', () => {
  const s = freshDamage();
  applyDamage(s, 'engine'); applyDamage(s, 'engine'); applyDamage(s, null); // hp 25
  assert.ok(s.fire > 0 && driveDisabled(s));
  s.hp = 3;
  for (let i = 0; i < 60 * (DAMAGE.fireSeconds + 1); i++) tickDamage(s, 1 / 60);
  assert.equal(s.fire, 0); assert.equal(s.hp, 1);
});

test('destroyed tanks stop burning and repairing; turret damage slows traverse', () => {
  const s = freshDamage();
  assert.equal(turretTraverse(s), 1);
  applyDamage(s, 'turret'); assert.ok(turretTraverse(s) < 1);
  applyDamage(s, 'engine'); applyDamage(s, 'engine', 'rear'); applyDamage(s, null, 'rear');
  assert.equal(s.hp, 0); assert.equal(s.fire, 0); assert.equal(s.repair.engine, 0);
  assert.equal(tickDamage(s, 10), false);
});
