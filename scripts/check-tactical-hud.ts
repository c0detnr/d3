import assert from 'node:assert/strict';
import { headingDegrees, headingLabel, speedLabel } from '../src/game/ui/tacticalHudModel.ts';

assert.equal(headingLabel(0), '000');
assert.equal(headingLabel(Math.PI / 2), '090');
assert.equal(headingLabel(-Math.PI / 2), '270');
assert.equal(headingLabel(2 * Math.PI - 0.0001), '000');
assert.equal(headingLabel(8 * Math.PI), '000');
assert.ok(Math.abs(headingDegrees(-9 * Math.PI / 2) - 270) < 1e-9);
assert.equal(speedLabel(10), '36');
assert.equal(speedLabel(-10), '36');
assert.equal(speedLabel(0.01), '0');
console.log('Taktik HUD: pusula sarımı, kuzey sınırı ve ileri/geri km/sa dönüşümü geçti.');
