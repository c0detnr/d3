import { test } from 'node:test';
import assert from 'node:assert/strict';
import { WaveRules, waveDifficulty, waveEnemies, WAVE_MAX_ALIVE } from './waveRules.ts';
test('waves grow, reserve six live slots, wait ten seconds and stop on death', () => {
  const rules = new WaveRules();
  for (let wave = 1; wave <= 12; wave++) {
    assert.equal(rules.wave, wave);
    assert.equal(rules.remaining, waveEnemies(wave));
    let alive = 0;
    while (alive < WAVE_MAX_ALIVE && rules.takeSpawn()) alive++;
    while (rules.remaining) {
      assert.ok(alive > 0 && alive <= 6);
      alive--; const cleared = rules.killed();
      assert.equal(cleared, rules.remaining === 0);
      if (rules.takeSpawn()) alive++;
    }
    assert.equal(alive, 0);
    assert.equal(rules.advance(9.9, true), false);
    assert.equal(rules.advance(.1, true), true);
  }
  assert.equal(rules.kills, Array.from({ length: 12 }, (_, i) => waveEnemies(i + 1)).reduce((a, b) => a + b, 0));
  rules.advance(10, false);
  assert.equal(rules.finished, true);
  assert.equal(rules.takeSpawn(), false);
});
test('reaction and spread improve gradually with a bounded floor; death cancels break', () => {
  let previous = waveDifficulty(1);
  for (let wave = 2; wave <= 100; wave++) {
    const next = waveDifficulty(wave);
    assert.ok(next.reaction <= previous.reaction && next.reaction >= .55);
    assert.ok(next.dispersion <= previous.dispersion && next.dispersion >= .55);
    previous = next;
  }
  const rules = new WaveRules(); rules.takeSpawn(); rules.takeSpawn(); rules.killed(); rules.killed();
  assert.equal(rules.advance(10, false), false);
  assert.equal(rules.wave, 1);
});
