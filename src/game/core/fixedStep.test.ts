import assert from 'node:assert/strict';
import test from 'node:test';
import { FixedStep } from './fixedStep.ts';
import { DriveInput, releasedKeys } from '../input/DriveInput.ts';

test('30/60/120 render FPS produces exactly sixty physics steps per second', () => {
  for (const fps of [30, 60, 120]) {
    const clock = new FixedStep(); let count = 0;
    for (let i = 0; i < fps * 10; i++) clock.advance(1 / fps, dt => { assert.equal(dt, 1 / 60); count++; });
    assert.equal(count, 600);
  }
});
test('catch-up stops at five steps and reset discards hidden-tab debt', () => {
  const clock = new FixedStep(); let count = 0;
  clock.advance(12, () => count++);
  assert.equal(count, 5);
  assert.ok(clock.advance(0, () => count++) < 0.001);
  clock.advance(1 / 120, () => count++);
  clock.reset();
  clock.advance(1 / 120, () => count++);
  assert.equal(count, 5);
});
test('S brakes before stop; reverse dwell starts after stop and resets on release', () => {
  const input = new DriveInput(); const keys = { ...releasedKeys(), reverse: true };
  for (let i = 0; i < 90; i++) assert.equal(input.resolve(keys, 5, 1 / 60).brake, 1);
  for (let i = 0; i < 14; i++) assert.equal(input.resolve(keys, 0, 1 / 60).brake, 1);
  assert.equal(input.resolve(keys, 0, 1 / 60).throttle, -1);
  input.resolve(releasedKeys(), 0, 1 / 60);
  assert.equal(input.resolve(keys, 0, 1 / 60).throttle, 0);
  input.reset();
  assert.equal(input.resolve(keys, 0, 1 / 60).brake, 1);
});
test('Space and W+S have braking priority, including simultaneous steering', () => {
  const input = new DriveInput();
  for (const keys of [
    { ...releasedKeys(), forward: true, reverse: true, right: true },
    { ...releasedKeys(), forward: true, brake: true, left: true },
  ]) assert.deepEqual(input.resolve(keys, 8, 1 / 60), { throttle: 0, steer: 0, brake: 1 });
  assert.equal(input.resolve({ ...releasedKeys(), forward: true }, -3, 1 / 60).brake, 1);
});
