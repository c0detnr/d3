import { loadTankModel } from '../src/game/vehicle/loadTankModel.ts';
import { TurretController } from '../src/game/vehicle/TurretController.ts';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { FreeCamera, GetEnvironmentBRDFTexture, NullEngine, Scene, Quaternion, Vector3 } from '@babylonjs/core';
import { FixedStep } from '../src/game/core/fixedStep.ts';
import { setLanguage, t } from '../src/game/i18n/index.ts';
import { SMOKE, SmokeModel, smokeLifetime, smokeOpticalDepth, smokeStrength, smokeRadius, smokeCenter } from '../src/game/items/SmokeModel.ts';
import { LaneDroneModel } from '../src/game/combat/LaneDroneModel.ts';
import { TeamDuel, type DuelParticipant } from '../src/game/combat/TeamDuel.ts';
import { EasyDuelAI } from '../src/game/combat/EasyDuelAI.ts';
import type { DuelTank } from '../src/game/combat/DuelTank.ts';
import { SmokeSupply, turretLauncherPose } from '../src/game/items/SmokeSupply.ts';

const centers = Array.from({ length: SMOKE.salvo }, (_, i) => new Vector3((i - 2) * 3, SMOKE.cloudHeight, 12));
const model = new SmokeModel();
assert.equal(model.count, 2, 'two starting charges');
model.count = 0;
assert.equal(model.fire(centers), false, 'empty inventory cannot fire');
assert.equal(model.feedback?.key, 'smokeEmpty');
setLanguage('en');
const notice = () => model.feedback ? t(model.feedback.key).replace('{seconds}', String(model.feedback.seconds ?? '')) : '';
assert.equal(notice(), 'NO SMOKE CHARGES · F TO RESUPPLY');
model.fixedUpdate(2.1); assert.equal(model.feedbackTime, 0, 'warning expires');
for (let i = 0; i < SMOKE.capacity; i++) assert.ok(model.collect());
assert.equal(notice(), '+1 SMOKE CHARGE');
assert.equal(model.collect(), false, 'capacity cannot overflow');
assert.equal(model.fire(centers.slice(1)), false, 'invalid salvo does not consume ammo');
assert.ok(model.fire(centers)); assert.equal(model.count, 2);
assert.equal(notice(), 'DEPLOYING SMOKE SCREEN');
assert.equal(model.fire(centers), false, 'cooldown cannot consume another charge');
assert.equal(notice(), '12 s · SMOKE PREPARING');
model.fixedUpdate(.1); model.fire(centers);
assert.equal(model.feedback?.seconds, 12, 'fractional cooldown rounds up');
setLanguage('tr');
assert.equal(notice(), '12 sn · SİS HAZIRLANIYOR', 'active notice follows language changes');
setLanguage('en');
assert.equal(notice(), '12 s · SMOKE PREPARING');
assert.equal(model.clouds.length, SMOKE.salvo);
assert.equal(model.blocksSight(new Vector3(0, 2, 0), new Vector3(0, 2, 24)), false, 'capsule flight does not instantly blind');
model.fixedUpdate(SMOKE.flight + SMOKE.growth);
const from = new Vector3(0, 2, 0), to = new Vector3(0, 2, 24);
assert.ok(model.blocksSight(from, to), 'full curtain blocks AI sight');
assert.ok(model.blocksSight(to, from), 'same concealment in both directions');
assert.ok(model.blocksSight(centers[2], to), 'observer inside smoke cannot see through');
assert.ok(model.blocksSight(from, centers[2]), 'target inside smoke is concealed');
assert.equal(model.blocksSight(from, new Vector3(0, 2, 3)), false, 'objects in front remain visible');
assert.equal(model.blocksSight(new Vector3(0, 20, 0), new Vector3(0, 20, 24)), false, 'above cloud remains visible');
assert.equal(smokeOpticalDepth(from, from, model.clouds), 0, 'zero length ray');
assert.equal(smokeStrength(smokeLifetime), 0);
model.fixedUpdate(smokeLifetime);
assert.equal(model.clouds.length, 0); assert.equal(model.cooldown, 0);
assert.ok(model.fire(centers));
model.reset(); assert.equal(model.count, SMOKE.initialCharges); assert.equal(model.clouds.length, 0);
assert.equal(model.feedback, null, 'reset clears feedback key and parameters');
setLanguage('tr');

// Real AI consumes the same density decision as local/team gameplay, including reacquisition.
const actor = (position: Vector3) => ({ vehicle: { node: { position, rotationQuaternion: Quaternion.Identity() } } }) as Pick<DuelTank, 'vehicle'>;
const observer = actor(from), target = actor(to), ai = new EasyDuelAI(), curtain = new SmokeModel();
ai.update(observer, target, true, .01); ai.update(observer, target, true, 1);
assert.ok(ai.canShoot, 'clear sight permits shooting after reaction');
curtain.fire(centers); curtain.fixedUpdate(SMOKE.flight + SMOKE.growth);
let decision = ai.update(observer, target, !curtain.blocksSight(from, to), .01);
assert.equal(decision.target, undefined, 'smoke removes AI aim');
assert.equal(ai.canShoot, false, 'smoke immediately cancels AI fire');
for (const [eye, goal] of [[centers[2], to], [from, centers[2]], [to, from]]) {
  assert.ok(curtain.blocksSight(eye, goal), 'inside/behind/reverse sight is blocked');
}
const droneModel = new LaneDroneModel(() => 0);
droneModel.drones.push({ id: 'smoke-observer', team: 'A', position: from.clone(), previous: from.clone(), hp: 20,
  lane: 0, slot: 0, yaw: 0, waypoint: 1, age: 0, cooldown: 0, route: [from, to] });
const droneTarget = { id: 'concealed-tank', team: 'B' as const, position: to, hp: 100 };
let droneShots = 0;
const droneStep = () => droneModel.update(.1, [droneTarget], (a, b) => !curtain.blocksSight(a.position, b.position),
  () => false, () => { droneShots++; });
droneStep(); assert.equal(droneShots, 0, 'drone cannot fire through dense smoke');
const perceptionScene = { getPhysicsEngine: () => ({ raycast: () => ({ hasHit: false }) }) } as unknown as Scene;
const teamObserver = observer as unknown as DuelParticipant, teamTarget = target as unknown as DuelParticipant;
const team = new TeamDuel(perceptionScene, teamObserver);
team.blocksSight = (a, b) => curtain.blocksSight(a, b);
assert.equal(team.canSee(teamObserver, teamTarget), false, 'team perception rejects concealed target');
const denseRadius = smokeRadius(curtain.clouds[0].age);
curtain.fixedUpdate(SMOKE.hold + SMOKE.fade - .05);
assert.ok(smokeRadius(curtain.clouds[0].age) >= denseRadius, 'dissipation never shrinks the cloud');
assert.ok(smokeStrength(curtain.clouds[0].age) > 0, 'still present just before expiry');
assert.equal(curtain.blocksSight(from, to), false, 'thin smoke restores vision before removal');
droneStep(); assert.equal(droneShots, 1, 'drone resumes fire only after smoke thins');
assert.equal(team.canSee(teamObserver, teamTarget), true, 'team vision returns with thinning smoke');
ai.update(observer, target, !curtain.blocksSight(from, to), .01);
assert.equal(ai.canShoot, false, 'reacquisition still requires reaction');
ai.update(observer, target, true, 1); assert.ok(ai.canShoot);
const drifting = smokeCenter(curtain.clouds[2]);
assert.ok(drifting.x > centers[2].x && drifting.z > centers[2].z, 'wind moves the gameplay volume');
const overlap = new SmokeModel(); overlap.fire(centers); overlap.fixedUpdate(SMOKE.cooldown);
assert.ok(overlap.fire(centers)); assert.equal(overlap.clouds.length, SMOKE.maxClouds, 'two simultaneous curtains fit visual budget');
assert.equal(overlap.count, 0); overlap.fixedUpdate(SMOKE.cooldown);
assert.equal(overlap.fire(centers), false, 'spent starting charges require resupply');

for (const fps of [30, 60, 120]) {
  const state = new SmokeModel(), clock = new FixedStep(); state.collect(); state.fire(centers);
  for (let frame = 0; frame < fps * 22; frame++) clock.advance(1 / fps, dt => state.fixedUpdate(dt));
  assert.equal(state.cooldown, 0); assert.equal(state.clouds.length, 0, `lifetime at ${fps} FPS`);
}

const engine = new NullEngine(), scene = new Scene(engine);
const camera = new FreeCamera('test', new Vector3(0, 4, -10), scene); scene.activeCamera = camera;
// PBR's shared scene lookup is owned by the scene, not by a particular loaded item.
GetEnvironmentBRDFTexture(scene);
const bytes = async (file: string) => new Uint8Array(await readFile(new URL(`../assets/items/smoke_supply_01/${file}.glb`, import.meta.url)));
const crate = await bytes('smoke_supply_01'), capsule = await bytes('smoke_capsule_01');
const resources = () => [scene.meshes.length, scene.transformNodes.length, scene.materials.length, scene.textures.length, scene.postProcesses.length, (scene.spriteManagers?.length ?? 0)];
const baseline = resources();
try {
  for (let cycle = 0; cycle < 2; cycle++) {
    const system = await SmokeSupply.load(scene, crate, capsule, Vector3.Zero(), () => 0, cycle * Math.PI);
    assert.equal(system.supplies.length, 3);
    const supply = system.supplies[0];
    assert.equal(scene.spriteManagers.length, baseline[5] + 2, 'two shared sprite batches');
    assert.equal(scene.spriteManagers.find(m => m.name === 'smoke-billows')!.capacity,
      SMOKE.maxClouds * SMOKE.particlesPerCloud, 'bounded two-curtain billboard budget');
    const children = supply.anchor.getChildMeshes();
    assert.ok(children.some(mesh => mesh.getTotalVertices() > 0), 'actual GLB loaded');
    let minY = Infinity, maxY = -Infinity, minX = Infinity, maxX = -Infinity;
    for (const mesh of children) {
      mesh.computeWorldMatrix(true);
      const box = mesh.getBoundingInfo().boundingBox;
      minY = Math.min(minY, box.minimumWorld.y); maxY = Math.max(maxY, box.maximumWorld.y);
      minX = Math.min(minX, box.minimumWorld.x); maxX = Math.max(maxX, box.maximumWorld.x);
      assert.equal(mesh.isPickable, false, 'loot cannot obstruct aim');
    }
    assert.ok(minY >= -.001 && maxY < .8 && maxX-minX < 1, 'metre scale and ground alignment');
    assert.equal(system.collect(new Vector3(100, 0, 100), () => true), false, 'range gate');
    assert.equal(system.collect(Vector3.Zero(), () => false), false, 'wall gate');
    assert.ok(system.collect(Vector3.Zero(), () => true));
    assert.equal(system.collect(Vector3.Zero(), () => true), false, 'same crate cannot be collected twice');
    assert.equal(system.model.count, SMOKE.capacity); assert.equal(supply.anchor.isEnabled(), false);
    system.launcherPose = () => ({ origin: new Vector3(0, 2, 0), forward: Vector3.Right() });
    assert.ok(system.fire(new Vector3(999, 2, 999), Vector3.Forward(), (_from, to) => to));
    assert.ok(system.model.clouds.every(c => c.center.x >= 11 && Math.abs(c.center.z) <= SMOKE.spread),
      'turret launcher provider overrides legacy hull position and heading');
    assert.equal(system.model.clouds.length, SMOKE.salvo);
    system.fixedUpdate(.4);
    const flying = scene.transformNodes.filter(n => n.name === 'smoke-placement' && !system.supplies.some(s => s.anchor === n));
    assert.equal(flying.length, SMOKE.salvo, 'five capsules in flight');
    assert.ok(flying.every(n => n.position.y > 3), 'capsules follow a raised arc');
    system.fixedUpdate(2.6); system.render();
    assert.equal(scene.postProcesses.length, baseline[4] + 1, 'depth screen attaches');
    const otherCamera = new FreeCamera('other', new Vector3(0, 2, 12), scene); scene.activeCamera = otherCamera;
    system.render(); assert.equal(scene.postProcesses.length, baseline[4] + 1, 'camera switch releases previous effect');
    system.reset(); assert.ok(supply.anchor.isEnabled()); assert.equal(system.model.count, SMOKE.initialCharges);
    assert.equal(scene.postProcesses.length, baseline[4], 'reset releases depth resources');
    scene.activeCamera = camera; otherCamera.dispose(); system.dispose();
    assert.deepEqual(resources(), baseline, `dispose releases resources; remaining textures: ${scene.textures.map(t => t.name).join(', ')}`);
  }
  const tankBytes = new Uint8Array(await readFile(new URL('../assets/tanks/iron_dust_01/iron_dust_01.glb', import.meta.url)));
  const tank = await loadTankModel(scene, tankBytes, new Vector3(4, 0, 7));
  const turret = new TurretController(tank);
  const original = turretLauncherPose(turret.yawPivot);
  for (let i = 0; i < 120; i++) turret.fixedUpdateManual(1, 0, 1 / 60);
  turret.render(1);
  const rotated = turretLauncherPose(turret.yawPivot);
  assert.ok(Vector3.Dot(original.forward, rotated.forward) < .8, 'launcher turns with actual GLB turret, not the hull');
  assert.ok(Vector3.Dot(rotated.forward, turret.getMuzzleRay().direction) > .99, 'launcher points along the actual gun yaw');
  tank.anchor.rotationQuaternion = Quaternion.RotationYawPitchRoll(.4, .2, -.15);
  const sloped = turretLauncherPose(turret.yawPivot);
  assert.ok(Vector3.Distance(sloped.origin, rotated.origin) > .1, 'launcher origin follows sloping hull world transform');
  turret.dispose(); tank.dispose();
  console.log('SMOKE PASS: actual AI aim/fire occlusion and fading reacquisition, five-capsule arc, initial charges/warnings, wind, two curtains, capacity/consumption/cooldown, growth/fade, bilateral depth, inside/foreground/above, 30/60/120 FPS, actual GLBs, range/wall/duplicate gates, reset and camera/disposal lifecycle.');
} finally { scene.dispose(); engine.dispose(); }
