import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import HavokPhysics from '@babylonjs/havok';
import { NullEngine, Scene, Vector3, type PhysicsEngineV2 } from '@babylonjs/core';
import { loadTankModel } from '../src/game/vehicle/loadTankModel.ts';
import { TurretController } from '../src/game/vehicle/TurretController.ts';
import { DuelSimulation } from '../src/game/network/DuelSimulation.ts';
import { parseCommand, type ClientCommand, type Slot } from '../src/game/network/protocol.ts';
import type { DuelTank } from '../src/game/combat/DuelTank.ts';
import type { ProjectileSystem } from '../src/game/combat/ProjectileSystem.ts';

// Run: node --experimental-strip-types scripts/check-network-simulation.ts
const input = (sequence: number, fields = {}): ClientCommand => ({ type: 'input', sequence,
  throttle: 0, steer: 0, brake: 1, turn: 0, elevation: 0, fire: false, ...fields });
assert.ok(parseCommand(input(0)));
assert.deepEqual(parseCommand({ type: 'ready' }), { type: 'ready' });
for (const bad of [null, [], {}, { type: 'input' }, input(-1), input(0.5), input(Infinity),
  input(0, { throttle: NaN }), input(0, { throttle: 1.1 }), input(0, { steer: -2 }),
  input(0, { brake: -1 }), input(0, { turn: 2 }), input(0, { elevation: 0.151 }), input(0, { fire: 1 })]) {
  assert.equal(parseCommand(bad), undefined, JSON.stringify(bad));
}
const wasmBinary = await readFile(new URL('../node_modules/@babylonjs/havok/lib/esm/HavokPhysics.wasm', import.meta.url));
const havok = await HavokPhysics({ wasmBinary: new Uint8Array(wasmBinary).buffer });
const sources = await Promise.all(['01', '02'].map(id => readFile(new URL(`../assets/tanks/iron_dust_${id}/iron_dust_${id}.glb`, import.meta.url))));
const sim = await DuelSimulation.create(havok, [sources[0], sources[1]]);
// White-box fixtures only place/aim real vehicles; damage uses the production swept query.
const fixture = sim as unknown as { tanks: DuelTank[]; shells: ProjectileSystem[]; physics: PhysicsEngineV2 }; 
let seq = 0;
const send = (slot: Slot, fields = {}) => sim.command(slot, input(seq++, fields));
const run = (ticks: number) => { for (let i = 0; i < ticks; i++) sim.step(); };
const ready = () => { sim.command(0, { type: 'ready' }); sim.command(1, { type: 'ready' }); };
try {
  assert.equal(sim.snapshot().phase, 'waiting');
  sim.connect(0); sim.command(0, { type: 'ready' });
  assert.equal(sim.snapshot().phase, 'waiting');
  sim.connect(1); sim.command(1, { type: 'ready' });
  assert.equal(sim.snapshot().phase, 'playing');
  fixture.tanks.forEach(t => t.vehicle.reset(t.vehicle.spawn.add(new Vector3(0, 30, 0))));
  const heights = fixture.tanks.map(t => t.vehicle.node.position.y);
  run(30);
  fixture.tanks.forEach((t, i) => {
    assert.ok(Math.abs(t.vehicle.body.getLinearVelocity().y + 9.81 * 0.5) < 0.03, 'each hull gets exactly one gravity step per tick');
    assert.ok(heights[i] - t.vehicle.node.position.y > 1.2 && heights[i] - t.vehicle.node.position.y < 1.3);
    t.vehicle.reset(); t.render(1);
  });
  const falling = fixture.shells[0].spawn(new Vector3(-34, 100, -42), Vector3.Forward(), 10)!;
  run(60);
  assert.ok(Math.abs(100 - falling.position.y - 9.81 / 3600 * 60 * 61 / 2) < 0.01, 'real ballistic gravity, not hitscan');
  fixture.shells[0].reset();
  const insideShooter = fixture.tanks[0].vehicle.node.position.clone();
  const selfRay = fixture.shells[0].raycast(insideShooter, insideShooter.add(new Vector3(0, 0, 5)));
  assert.notEqual(selfRay?.body, fixture.tanks[0].vehicle.body, 'sweep actually ignores shooter even from inside its collider');
  const groundRay = fixture.shells[0].raycast(new Vector3(-34, 10, -42), new Vector3(-34, -10, -42));
  assert.ok(groundRay && Math.abs(groundRay.point.y) < 0.03, 'real world geometry occludes shells');
  run(180);
  const tank = fixture.tanks[0];
  assert.ok(tank.vehicle.contacts.some(c => c.grounded), 'real terrain supports real GLB hull');
  const state = sim.snapshot().tanks[0];
  assert.deepEqual(state.position, tank.tank.anchor.position.asArray());
  assert.ok(Vector3.Distance(tank.tank.anchor.position, tank.vehicle.node.position) > 0.2, 'anchor is not body center');
  send(0, { throttle: 1, brake: 0, turn: 1, elevation: 0.05 });
  run(10);
  assert.ok(tank.vehicle.driveForce > 0, 'authoritative input drives real physics');
  run(6);
  assert.equal(tank.vehicle.driveForce, 0, '250 ms stale input neutralized');
  const yaw = tank.turret.angles.yaw;
  run(120);
  assert.ok(Math.abs(tank.turret.angles.yaw - yaw) < 0.3, 'stale yaw stops instead of rotating forever');

  // Sustained Q/E must match standalone manual smoothing, not restart its response every tick.
  const referenceEngine = new NullEngine();
  const referenceScene = new Scene(referenceEngine);
  try {
    const model = await loadTankModel(referenceScene, sources[0], Vector3.Zero());
    const manual = new TurretController(model);
    try {
      for (const turn of [-1, 1]) {
        tank.turret.reset(); manual.reset();
        for (let i = 0; i < 60; i++) {
          send(0, { turn }); sim.step();
          manual.fixedUpdateManual(turn, 0, 1 / 60);
          assert.ok(Math.abs(tank.turret.angles.yaw - manual.angles.yaw) < 1e-10,
            'server advances manual turret exactly once per fixed step');
        }
        const degrees = tank.turret.angles.yaw * 180 / Math.PI;
        assert.ok(Math.abs(degrees) > 31 && Math.abs(degrees) < 33,
          `one second of held Q/E turns about 32 degrees, got ${degrees}`);
        assert.equal(Math.sign(degrees), -turn);
      }
    } finally { manual.dispose(); model.dispose(); }
  } finally { referenceScene.dispose(); referenceEngine.dispose(); }

  // Both real GLB turrets sit above their Havok hulls. Hits there must still damage.
  for (const targetSlot of [0, 1] as const) {
    const shooterSlot: Slot = targetSlot === 0 ? 1 : 0;
    const target = fixture.tanks[targetSlot], shooter = fixture.tanks[shooterSlot];
    shooter.vehicle.reset(new Vector3(-50, 20, -42)); shooter.render(1);
    target.vehicle.reset(new Vector3(-34, 20, -42)); target.turret.reset(); target.render(1);
    const turretMesh = target.tank.assets.meshes.find(mesh => mesh.metadata?.gltf?.extras?.asset_node_id === 'TurretMesh')!;
    turretMesh.computeWorldMatrix(true);
    const center = turretMesh.getBoundingInfo().boundingBox.centerWorld.clone();
    // Change authoritative pose without rendering/recomputing the mesh: the query must refresh it.
    const move = new Vector3(0, 0, 4);
    target.vehicle.reset(new Vector3(-34, 20, -42).add(move));
    target.visual.syncHull(target.vehicle, 1);
    center.addInPlace(move);
    const from = center.add(new Vector3(-6, 0, 0)), to = center.add(new Vector3(6, 0, 0));
    assert.equal(fixture.physics.raycast(from, to, { ignoreBody: shooter.vehicle.body }).hasHit, false,
      `model ${targetSlot + 1} turret-only ray misses the physical hull`);
    const hit = fixture.shells[shooterSlot].raycast(from, to);
    assert.equal(hit?.body, target.vehicle.body, `model ${targetSlot + 1} visible turret is hittable`);
    assert.ok(hit && hit.distance > 0 && hit.distance < 6, 'nearest entry surface, not tank center');
    assert.equal(fixture.shells[targetSlot].raycast(from, to), undefined,
      'the same visible turret is excluded when it belongs to the shooter');
    const hp = sim.snapshot().tanks[targetSlot].hp;
    fixture.shells[shooterSlot].spawn(from, Vector3.Right(), 1000);
    sim.step();
    assert.equal(sim.snapshot().tanks[targetSlot].hp, hp - 25, 'real turret-only shell applies 25 damage');
    assert.equal(fixture.shells[shooterSlot].active.length, 0, 'turret impact consumes the shell');

    // Put the same turret beneath terrain so its triangle hit is behind the ground surface.
    const below = new Vector3(-34, -5, -42);
    target.vehicle.reset(below); target.render(1);
    turretMesh.computeWorldMatrix(true);
    const buriedCenter = turretMesh.getBoundingInfo().boundingBox.centerWorld.clone();
    const above = buriedCenter.add(new Vector3(0, 12, 0));
    const ground = fixture.physics.raycast(above, buriedCenter, { ignoreBody: shooter.vehicle.body });
    const occluded = fixture.shells[shooterSlot].raycast(above, buriedCenter);
    assert.ok(ground.hasHit && ground.body !== target.vehicle.body);
    assert.ok(occluded && occluded.body === ground.body && Math.abs(occluded.distance - ground.hitDistance) < 1e-6,
      'closer Havok terrain occludes visible turret triangles');
    const beforeGround = sim.snapshot().tanks[targetSlot].hp;
    fixture.shells[shooterSlot].spawn(above, Vector3.Down(), 1000);
    sim.step();
    assert.equal(sim.snapshot().tanks[targetSlot].hp, beforeGround, 'occluded turret takes no damage');
    assert.equal(fixture.shells[shooterSlot].active.length, 0, 'terrain consumes the shell first');
  }
  sim.disconnect(1); sim.connect(1); ready();

  // Head-on, short range, aim below muzzle height at the physical opponent center.
  fixture.tanks[0].vehicle.reset(new Vector3(-34, 0, -49), 0);
  fixture.tanks[1].vehicle.reset(new Vector3(-34, 0, -35), Math.PI);
  fixture.tanks.forEach(t => { t.turret.reset(); t.render(1); });
  run(180);
  for (let shot = 0; shot < 4; shot++) {
    for (let i = 0; i < 120; i++) {
      tank.turret.fixedUpdate(fixture.tanks[1].vehicle.node.position, 1 / 60);
    }
    const hp = sim.snapshot().tanks[1].hp;
    send(0, { fire: true }); sim.step();
    const fired = sim.snapshot();
    assert.equal(fired.tanks[0].shots, shot + 1);
    assert.equal(fired.tanks[0].reload, 5);
    assert.ok(tank.vehicle.body.getLinearVelocity().length() > 0.01, 'shot applies physical recoil');
    run(30);
    assert.equal(sim.snapshot().tanks[1].hp, hp - 25, 'real ballistic direct hit does 25 HP');
    assert.equal(sim.snapshot().tanks[0].hp, 100, 'shooter is ignored');
    if (shot < 3) {
      send(0, { fire: true }); run(1);
      assert.equal(sim.snapshot().tanks[0].shots, shot + 1, 'reload rejects early fire');
      run(300);
      assert.equal(sim.snapshot().tanks[0].shots, shot + 1, 'consumed fire does not repeat after reload');
    }
  }
  assert.equal(sim.snapshot().phase, 'finished'); assert.equal(sim.snapshot().winner, 0);
  sim.command(0, { type: 'ready' }); assert.equal(sim.snapshot().phase, 'finished');
  sim.command(1, { type: 'ready' });
  assert.equal(sim.snapshot().phase, 'playing');
  for (const t of sim.snapshot().tanks) {
    assert.equal(t.hp, 100); assert.equal(t.shots, 0); assert.equal(t.reload, 0);
    assert.equal(t.yaw, 0); assert.equal(t.elevation, 0);
  }
  assert.equal(sim.snapshot().projectiles.length, 0);
  send(0, { fire: true }); sim.step();
  const shots = sim.snapshot().tanks[0].shots;
  sim.command(0, input(seq - 1, { fire: true, throttle: 1 }));
  run(400); assert.equal(sim.snapshot().tanks[0].shots, shots, 'duplicate sequence never replayed');
  sim.disconnect(1); assert.equal(sim.snapshot().phase, 'cancelled');
  assert.deepEqual(sim.snapshot().ready, [false, false]);
  assert.equal(sim.snapshot().projectiles.length, 0);
  sim.connect(1); ready(); assert.equal(sim.snapshot().phase, 'playing');
  assert.deepEqual(sim.snapshot().tanks.map(t => t.hp), [100, 100]);
  const tick = sim.snapshot().tick; sim.step(1 / 120); assert.equal(sim.snapshot().tick, tick);
  sim.step(1 / 120); assert.equal(sim.snapshot().tick, tick + 1);
  assert.doesNotThrow(() => JSON.stringify(sim.snapshot()));
  assert.throws(() => sim.step(NaN), RangeError);
} finally { sim.dispose(); sim.dispose(); }
console.log('Passed: real 01/02 GLBs + Havok terrain, validation, shared fixed clock, anchor snapshot, input timeout, sustained Q/E parity, physical recoil, visible 01/02 turret hits, terrain occlusion, shooter exclusion, swept hits, 4-hit win, reload/fire consumption, rematch and reconnect.');
