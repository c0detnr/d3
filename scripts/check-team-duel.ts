import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import HavokPhysics from '@babylonjs/havok';
import { ArcRotateCamera, HavokPlugin, NullEngine, Scene, Vector3 } from '@babylonjs/core';
import { createKulVadisi } from '../src/game/world/createKulVadisi.ts';
import { DuelTank } from '../src/game/combat/DuelTank.ts';
import { TeamDuel } from '../src/game/combat/TeamDuel.ts';
import { teamSpawn, teamYaw, duelOutcome } from '../src/game/combat/teamDuelLayout.ts';
import { FixedStep } from '../src/game/core/fixedStep.ts';

const wasmBinary = await readFile(new URL('../node_modules/@babylonjs/havok/lib/esm/HavokPhysics.wasm', import.meta.url));
const havok = await HavokPhysics({ wasmBinary });
const engine = new NullEngine(), scene = new Scene(engine);
new ArcRotateCamera('check', 0, 1, 20, Vector3.Zero(), scene);
scene.enablePhysics(new Vector3(0, -9.81, 0), new HavokPlugin(true, havok)); scene.physicsEnabled = false;
const physics = scene.getPhysicsEngine()!; physics.setTimeStep(1 / 60);
const sources = await Promise.all(['01', '02'].map(id => readFile(new URL(`../assets/tanks/iron_dust_${id}/iron_dust_${id}.glb`, import.meta.url))));
const warmup = await DuelTank.load(scene, sources[0], Vector3.Zero()); warmup.dispose();
const resources = () => [scene.meshes.length, scene.transformNodes.length, scene.materials.length, scene.textures.length, physics.getBodies().length];
const empty = resources();
const factorySources = {
  emplacement: new Uint8Array(await readFile(new URL('../assets/environment/concrete_emplacement_01/concrete_emplacement_01.glb', import.meta.url))),
  hangar: new Uint8Array(await readFile(new URL('../assets/environment/maintenance_hangar_01/maintenance_hangar_01.glb', import.meta.url))),
  workshop: new Uint8Array(await readFile(new URL('../assets/environment/maintenance_workshop_01/maintenance_workshop_01.glb', import.meta.url))),
  command: new Uint8Array(await readFile(new URL('../assets/environment/command_center_01/command_center_01.glb', import.meta.url))),
};
const natureSources = {
  rock1: new Uint8Array(await readFile(new URL('../assets/environment/quaternius_nature/Rock_Medium_1.glb', import.meta.url))),
  rock2: new Uint8Array(await readFile(new URL('../assets/environment/quaternius_nature/Rock_Medium_2.glb', import.meta.url))),
  pine: new Uint8Array(await readFile(new URL('../assets/environment/quaternius_nature/Pine_5.glb', import.meta.url))),
  pineTall: new Uint8Array(await readFile(new URL('../assets/environment/quaternius_nature/Pine_2.glb', import.meta.url))),
  deadTree: new Uint8Array(await readFile(new URL('../assets/environment/quaternius_nature/DeadTree_2.glb', import.meta.url))),
  broadTree: new Uint8Array(await readFile(new URL('../assets/environment/quaternius_nature/CommonTree_3.glb', import.meta.url))),
  rock3: new Uint8Array(await readFile(new URL('../assets/environment/quaternius_nature/Rock_Medium_3.glb', import.meta.url))),
  pebble: new Uint8Array(await readFile(new URL('../assets/environment/quaternius_nature/Pebble_Square_2.glb', import.meta.url))),
  shortGrass: new Uint8Array(await readFile(new URL('../assets/environment/quaternius_nature/Grass_Common_Short.glb', import.meta.url))),
  fern: new Uint8Array(await readFile(new URL('../assets/environment/quaternius_nature/Fern_1.glb', import.meta.url))),
  bush: new Uint8Array(await readFile(new URL('../assets/environment/quaternius_nature/Bush_Common.glb', import.meta.url))),
  grass: new Uint8Array(await readFile(new URL('../assets/environment/quaternius_nature/Grass_Wispy_Short.glb', import.meta.url))),
};
const propSources = {
  bushFlowers: new Uint8Array(await readFile(new URL('../assets/environment/quaternius_nature/Bush_Common_Flowers.glb', import.meta.url))),
  tallGrass: new Uint8Array(await readFile(new URL('../assets/environment/quaternius_nature/Grass_Common_Tall.glb', import.meta.url))),
};
const landmarkSources = {
  ruin: new Uint8Array(await readFile(new URL('../assets/environment/farmhouse_ruin_01/farmhouse_ruin_01.glb', import.meta.url))),
  wreck: new Uint8Array(await readFile(new URL('../assets/environment/armored_wreck_01/armored_wreck_01.glb', import.meta.url))),
};

assert.equal(duelOutcome(5, 5), undefined); assert.equal(duelOutcome(0, 5), 'B');
assert.equal(duelOutcome(5, 0), 'A'); assert.equal(duelOutcome(0, 0), 'draw');
assert.throws(() => teamSpawn('A', 5), RangeError);
const map = await createKulVadisi(scene, 'A', factorySources, natureSources, propSources, landmarkSources);
scene.render(); const mapResources = resources();
try {
  for (const team of ['A', 'B'] as const) {
    const human = await DuelTank.load(scene, sources[team === 'A' ? 0 : 1], teamSpawn(team, 0));
    human.vehicle.reset(human.vehicle.spawn, teamYaw(team)); human.render(1);
    const duel = new TeamDuel(scene, { tank: human.tank, vehicle: human.vehicle, damage: human.damage, team });
    await duel.load(sources[team === 'A' ? 1 : 0]);
    assert.equal(duel.bots.length, 9); assert.equal(duel.alive('A'), 5); assert.equal(duel.alive('B'), 5);
    assert.equal(physics.getBodies().length, mapResources[4] + 10, 'ten hulls in one physics world');
    for (const member of duel.members) {
      const p = member.vehicle.node.position;
      assert.ok(member.team === 'A' ? p.z < -275 : p.z > 275, 'each team starts in its own courtyard');
      member.vehicle.node.computeWorldMatrix(true);
      const forward = member.vehicle.node.getDirection(Vector3.Forward());
      assert.ok(forward.z * (member.team === 'A' ? 1 : -1) > .99, `faces the exits: ${member.team} at ${p.asArray()} forward=${forward.asArray()} rotation=${member.vehicle.node.rotationQuaternion?.asArray()}`);
      for (const other of duel.members) if (other !== member) assert.ok(Vector3.Distance(p, other.vehicle.node.position) > 12, 'spawn hulls do not overlap');
    }
    let events = 0, destructions = 0;
    duel.onImpact = event => { events++; if (event.destroyed) destructions++; };
    const foe = duel.bots.find(bot => bot.member.team !== team)!;
    const ally = duel.bots.find(bot => bot.member.team === team)!;
    const hit = (member: typeof duel.player) => ({ body: member.vehicle.body, point: member.vehicle.node.position.clone(), normal: Vector3.Up(), distance: 0 });
    duel.playerImpact({ point: new Vector3(0, 0, 0), normal: Vector3.Up(), distance: 0 });
    assert.equal(duel.player.damage.hp, 100, 'world impacts cannot damage player');
    duel.playerImpact(hit(ally.member)); assert.equal(ally.member.damage.hp, 100, 'no friendly damage');
    duel.playerImpact(hit(foe.member)); assert.equal(foe.member.damage.hp, 75, 'enemy damage');
    for (let i = 0; i < 5; i++) duel.playerImpact(hit(foe.member));
    assert.equal(foe.member.damage.hp, 0); assert.equal(destructions, 1, 'destruction emitted once');
    for (let cycle = 0; cycle < 5; cycle++) {
      duel.reset(); human.vehicle.reset(human.vehicle.spawn, teamYaw(team));
      assert.equal(duel.result, undefined); assert.equal(duel.alive('A'), 5); assert.equal(duel.alive('B'), 5);
      for (const bot of duel.bots) {
        assert.equal(bot.actor.weapon.shotsFired, 0); assert.equal(bot.shells.active.length, 0);
        assert.ok(Vector3.Distance(bot.actor.vehicle.node.position, bot.actor.vehicle.spawn.add(bot.actor.vehicle.rig.center)) < 1e-6);
      }
    }
    // Perception callback applies to friend and foe, including the muzzle fire gate.
    const observer = duel.player, target = duel.members.find(m => m.team !== observer.team)!;
    target.vehicle.reset(observer.vehicle.spawn.add(new Vector3(0, 0, observer.team === 'A' ? 60 : -60)), teamYaw(target.team));
    assert.ok(duel.canSee(observer, target), 'clear sight in courtyard exit');
    duel.blocksSight = () => true; assert.equal(duel.canSee(observer, target), false, 'smoke/perception blocker');
    duel.blocksSight = () => false; target.vehicle.reset(target.vehicle.spawn, teamYaw(target.team));
    // The shared ray query must hit a friendly turret before the enemy behind it.
    ally.actor.vehicle.reset(new Vector3(0, 0, team === 'A' ? -255 : 255), teamYaw(team)); ally.actor.render(1);
    foe.actor.vehicle.reset(new Vector3(0, 0, team === 'A' ? -225 : 225), teamYaw(foe.member.team)); foe.actor.render(1);
    const origin = human.vehicle.node.position.add(new Vector3(0, 1.15, 0));
    const end = foe.actor.vehicle.node.position.add(new Vector3(0, 1.15, 0));
    const intercepted = duel.raycast(human.vehicle.body, origin, end);
    assert.equal(intercepted?.body, ally.actor.vehicle.body, 'friendly hull/turret intercepts first');
    duel.playerImpact(intercepted!); assert.equal(ally.member.damage.hp, 100); assert.equal(foe.member.damage.hp, 100);
    const building = duel.raycast(human.vehicle.body, new Vector3(0, 2, -310), new Vector3(0, 2, -350));
    assert.ok(building && !duel.members.some(m => m.vehicle.body === building.body), 'hangar blocks the shell');
    duel.reset(); human.vehicle.reset(human.vehicle.spawn, teamYaw(team)); human.render(1);
    const tick = (dt: number) => {
      human.beforeStep(dt); duel.beforeStep(dt); physics._step(dt); human.afterStep(dt); duel.afterStep(dt); duel.finishStep();
    };
    if (team === 'A') {
      const clock = new FixedStep(); let shots = 0;
      duel.onShot = () => { shots++; };
      for (let second = 0; second < 150 && !duel.finished; second++) {
        for (let frame = 0; frame < 60; frame++) clock.advance(1 / 60, tick);
        if (second === 59) assert.ok(duel.bots.every(b => Math.abs(b.actor.vehicle.node.position.z) < 275 || b.member.damage.hp === 0), 'all bots leave their own base even if the player parks');
        if (second % 30 === 29) console.log('AI MATCH', second + 1, 'seconds', duel.alive('A'), duel.alive('B'), 'shots', shots,
          duel.bots.map(b => [b.member.team, Math.round(b.actor.vehicle.node.position.x), Math.round(b.actor.vehicle.node.position.z), b.member.damage.hp]));
      }
      assert.ok(shots > 0, 'bots navigate from their bases and fire at enemies');
      assert.ok(duel.members.some(m => m.damage.hp < 100), 'real ballistic shells damage tanks');
    } else {
      for (const fps of [30, 60, 120]) {
        duel.reset(); human.vehicle.reset(human.vehicle.spawn, teamYaw(team));
        const clock = new FixedStep();
        for (let i = 0; i < fps * 3; i++) clock.advance(1 / fps, tick);
        assert.ok(duel.members.every(m => Number.isFinite(m.vehicle.node.position.y) && Math.abs(m.vehicle.node.position.y) < 4), 'stable five-tank courtyards');
      }
    }
    duel.reset(); for (const member of duel.members) member.damage.hp = 0;
    duel.finishStep(); assert.equal(duel.result, 'draw');
    foe.member.damage.hp = 100; const beforeEvents = events;
    duel.playerImpact(hit(foe.member)); assert.equal(foe.member.damage.hp, 100, 'result freezes damage'); assert.equal(events, beforeEvents);
    duel.reset(); for (const member of duel.members) if (member.team !== team) member.damage.hp = 0;
    duel.finishStep(); assert.equal(duel.result, team, 'victory');
    duel.reset(); duel.player.damage.hp = 0; duel.finishStep(); assert.equal(duel.result, undefined, 'allies continue after player destruction');
    for (const member of duel.members) if (member.team === team) member.damage.hp = 0;
    duel.finishStep(); assert.equal(duel.result, team === 'A' ? 'B' : 'A', 'defeat');
    duel.dispose(); human.dispose(); assert.deepEqual(resources(), mapResources, 'all tanks/shells clean up');
  }
  map.dispose(); assert.deepEqual(resources(), empty, 'map and combat resources released');
  console.log('TEAM DUEL PASS: ten real GLB/Havok tanks, both bases/headings, spawn spacing, AI navigation/fire/damage, perception blocker, friendly/world hit rules, five resets, results/freeze, player death continuation, 30/60/120 FPS stepping, cleanup.');
} finally { scene.dispose(); engine.dispose(); }
