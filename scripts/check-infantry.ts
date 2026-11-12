import assert from 'node:assert/strict';
import { mock } from 'node:test';
import { SOLDIER_PROFILES, soldierProfileAt } from '../src/game/infantry/soldierProfiles.ts';
import { SoldierProfileQueue } from '../src/game/infantry/SoldierProfileQueue.ts';
import { readFile } from 'node:fs/promises';
import { NullEngine, Scene, Vector3 } from '@babylonjs/core';
import { InfantryNpcs } from '../src/game/infantry/InfantryNpcs.ts';
import { INFANTRY, infantryBlastVictims, type InfantryTarget } from '../src/game/infantry/infantryConfig.ts';

const target = (x: number, y = 0, z = 0, state: InfantryTarget['state'] = 'alert', hp = 100): InfantryTarget =>
  ({ position: { x, y, z }, state, hp });
const direct = target(0), edge = target(7), diagonal = target(3, 2, 6, 'smoke');
const outside = target(7.001), above = target(0, 7.001), dead = target(0, 0, 0, 'dead'), zeroHp = target(0, 0, 0, 'alert', 0);
const npcs = [direct, edge, diagonal, outside, above, dead, zeroHp];
const before = structuredClone(npcs);
assert.deepEqual(infantryBlastVictims({ x: 0, y: 0, z: 0 }, npcs), [direct, edge, diagonal]);
assert.deepEqual(npcs, before, 'blast query must not mutate actors');
assert.deepEqual(infantryBlastVictims({ x: 100, y: 2, z: -200 }, [target(107, 2, -200), target(107.01, 2, -200)]).length, 1,
  'world-space translation must preserve the inclusive radius');
assert.deepEqual(infantryBlastVictims({ x: 0, y: 0, z: 0 }, []), []);
direct.hp = 0; direct.state = 'dead';
assert.ok(!infantryBlastVictims(direct.position, npcs).includes(direct), 'dead NPC cannot die twice');
for (const offset of INFANTRY.offsets) assert.ok(Math.hypot(offset.x, offset.z) >= 3 && Math.hypot(offset.x, offset.z) <= 5);
console.log('INFANTRY PASS: direct hit, inclusive 7 m sphere, vertical/diagonal distance, living-only, pure query, spawn spacing');

assert.equal(new Set(SOLDIER_PROFILES.map(profile => profile.id)).size, 5);
for (const profile of SOLDIER_PROFILES) {
  assert.equal(profile.portrait, `/infantry-profiles/${profile.id}.png`);
  for (const language of ['tr', 'en'] as const) {
    for (const value of Object.values(profile.text[language])) assert.ok(value.trim().length);
  }
}
assert.equal(soldierProfileAt(5), SOLDIER_PROFILES[0]);
mock.timers.enable({ apis: ['setTimeout'] });
try {
  const shown: (string | undefined)[] = [];
  const queue = new SoldierProfileQueue(profile => shown.push(profile?.id));
  queue.enqueue([]); assert.deepEqual(shown, []);
  queue.enqueue(SOLDIER_PROFILES.slice(0, 3));
  assert.deepEqual(shown, ['andriy'], 'simultaneous casualties show one at a time');
  mock.timers.tick(7499); assert.deepEqual(shown, ['andriy']);
  mock.timers.tick(1); assert.deepEqual(shown, ['andriy', 'oleksandr']);
  mock.timers.tick(1000); queue.dismiss();
  assert.deepEqual(shown, ['andriy', 'oleksandr', 'taras'], 'manual dismiss advances immediately');
  queue.enqueue(SOLDIER_PROFILES.slice(3));
  mock.timers.tick(6500); assert.equal(shown.at(-1), 'taras', 'dismiss restarts the full reading window');
  mock.timers.tick(1000); assert.equal(shown.at(-1), 'ivan');
  queue.dismiss(); assert.equal(shown.at(-1), 'mykola');
  mock.timers.tick(7500); assert.equal(shown.at(-1), undefined, 'last card hides');
  queue.enqueue([SOLDIER_PROFILES[0], SOLDIER_PROFILES[1]]);
  const beforeDispose = [...shown]; queue.dispose(); queue.dispose();
  queue.enqueue(SOLDIER_PROFILES); queue.dismiss(); mock.timers.tick(30000);
  assert.deepEqual(shown, beforeDispose, 'dispose cancels timers, pending cards and later calls');
} finally { mock.timers.reset(); }
console.log('INFANTRY PROFILES PASS: local bilingual data, cyclic assignment, ordered queue, 7.5 s, dismiss, dispose');

const engine = new NullEngine(), scene = new Scene(engine);
try {
  const bytes = new Uint8Array(await readFile(new URL('../assets/characters/ua_infantry_01/ua_infantry_01.glb', import.meta.url)));
  // The static asset as a rig source also exercises the missing-clips fallback.
  for (const rigged of [undefined, bytes]) {
    const system = await InfantryNpcs.load(scene, { rigged, fallback: bytes }, [0, 30, 60].map(x => ({ position: new Vector3(x, 0, 0), yaw: Math.PI / 2 })), () => 2);
    assert.equal(system.npcs.length, 9);
    assert.deepEqual(system.npcs.slice(0, 5).map(npc => npc.profile.id), SOLDIER_PROFILES.map(profile => profile.id));
    assert.equal(system.npcs[5].profile, system.npcs[0].profile);
    assert.equal(system.npcs[8].profile, system.npcs[3].profile);
    for (const npc of system.npcs) assert.equal(npc.position.y, 2);
    assert.equal(system.detonate(new Vector3(0, 2, 0)).length, 3);
    assert.equal(system.npcs.filter(npc => npc.state !== 'dead').length, 6);
    for (const npc of system.npcs.slice(0, 3)) {
      assert.equal(npc.state, 'dead'); assert.equal(npc.hp, 0);
      assert.equal(npc.anchor.rotation.x, Math.PI / 2);
    }
    assert.equal(system.detonate(new Vector3(0, 2, 0)).length, 0);
    system.dispose(); system.dispose();
    assert.equal(scene.meshes.length, 0); assert.equal(scene.transformNodes.length, 0);
    assert.equal(scene.animationGroups.length, 0); assert.equal(scene.skeletons.length, 0);
    assert.ok(scene.materials.every(material => material === scene.defaultMaterial));
    assert.ok(scene.textures.every(texture => texture === scene.environmentBRDFTexture), 'only scene-owned BRDF cache remains');
  }
  console.log('INFANTRY RUNTIME PASS: actual static GLB, missing-clips fallback, clones, terrain height, death and disposal');
} finally { scene.dispose(); engine.dispose(); }
