import assert from 'node:assert/strict';
import { MinimapContacts, worldToMinimap } from '../src/game/ui/minimapModel.ts';
const center = { x: 73, z: -128 };
assert.deepEqual(worldToMinimap(center, center, 220, 400), { x: 110, y: 110 });
assert.deepEqual(worldToMinimap({ x: 73, z: -28 }, center, 220, 400), { x: 110, y: 55 });
assert.deepEqual(worldToMinimap({ x: 173, z: -128 }, center, 220, 400), { x: 165, y: 110 });
assert.deepEqual(worldToMinimap({ x: 173, z: -228 }, center, 220, 800), { x: 137.5, y: 137.5 });
assert.deepEqual(worldToMinimap({ x: 1000, z: 1000 }, { x: 900, z: 900 }, 220, 400), { x: 165, y: 55 });
// Lost enemies keep a copy, never a mutable reference to their live position.
const contacts = new MinimapContacts(), enemy = { x: 40, z: 60 };
contacts.observe('enemy', enemy, 10); enemy.x = 200;
assert.deepEqual(contacts.markers(12), [{ x: 40, z: 60, alpha: .5 }]);
assert.deepEqual(contacts.markers(14), []);
contacts.observe('enemy', enemy, 15); contacts.clear(); assert.deepEqual(contacts.markers(15), []);
console.log('minimap: north, centering, metre scale, zoom, last sighting expiry and reset passed');
