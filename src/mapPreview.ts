import { LaneDrones } from './game/combat/LaneDrones.ts';
import { LANE_DRONES } from './game/combat/LaneDroneModel.ts';
import './game/input/gamePointerLock.css';
import { GamePointerLock } from './game/input/GamePointerLock.ts';
import { DamageHud } from './game/ui/DamageHud.ts';
import { freshDamage, applyDamage, driveDisabled, trackPower, ricochets } from './game/combat/DamageModel.ts';
import { pickTankHit, tankDamageRegion } from './game/combat/tankHit.ts';
import { IRON_DUST_01_AMMO } from './game/combat/WeaponDefinition.ts';
import { DuelTank } from './game/combat/DuelTank.ts';
import { TeamDuel, type TeamImpact } from './game/combat/TeamDuel.ts';
import { teamSpawn } from './game/combat/teamDuelLayout.ts';
import { TeamDuelHud, addTeamDuelLink } from './game/ui/TeamDuelHud.ts';
import { EasyDuelAI } from './game/combat/EasyDuelAI.ts';
import { terrainHeight } from './game/world/terrain.ts';
import { createKulVadisi } from './game/world/createKulVadisi.ts';
import { kulTerrainHeight } from './game/world/kulVadisiLayout.ts';
import { addMapControls } from './game/world/kulVadisiControls.ts';
import { TouchControls } from './game/input/TouchControls.ts';
import './mapPreview.css';
import { TacticalHud } from './game/ui/TacticalHud.ts';
import { SmokeSupply } from './game/items/SmokeSupply.ts';
import { SmokeInventory } from './game/ui/SmokeInventory.ts';
import smokeSupplyUrl from '../assets/items/smoke_supply_01/smoke_supply_01.glb?url';
import smokeCapsuleUrl from '../assets/items/smoke_supply_01/smoke_capsule_01.glb?url';
import { MachineGun, MG } from './game/combat/MachineGun.ts';
import mgUrl from '../assets/weapons/iron_dust_mg_02/iron_dust_mg_02.glb?url';
import { MovementEffects } from './game/effects/MovementEffects.ts';
import { Color3, DirectionalLight, Engine, HemisphericLight,
  HavokPlugin, Scene, ShadowGenerator, Vector3 } from '@babylonjs/core';
import HavokPhysics from '@babylonjs/havok';
import wasmUrl from '@babylonjs/havok/lib/esm/HavokPhysics.wasm?url';
import { createTestGround } from './game/world/createTestGround';
import { loadTankModel } from './game/vehicle/loadTankModel';
import { DrivingObservation } from './game/core/DrivingObservation.ts';
import { FixedStep } from './game/core/fixedStep.ts';
import { bindDriveKeys, DriveInput } from './game/input/DriveInput.ts';
import { extractTankRig } from './game/vehicle/tankRig.ts';
import { TankVehicle } from './game/vehicle/TankVehicle.ts';
import { TankVisual } from './game/vehicle/TankVisual.ts';
import { AimSystem } from './game/aim/AimSystem.ts';
import { TurretController } from './game/vehicle/TurretController.ts';
import { FreeFlyCamera } from './game/camera/FreeFlyCamera.ts';
import { FollowCamera } from './game/camera/FollowCamera.ts';
import { CombatAudio } from './game/audio/CombatAudio.ts';
import { impactSurface } from './game/combat/ImpactSurface.ts';
import { AudioSystem } from './game/audio/AudioSystem.ts';
import { IRON_DUST_AUDIO } from './game/audio/AudioDefinition.ts';
import { VehicleAudio } from './game/audio/VehicleAudio.ts';
import type { VehicleAudioSnapshot } from './game/audio/VehicleAudioModel.ts';
import { WeaponSystem } from './game/combat/WeaponSystem.ts';
import { ProjectileSystem } from './game/combat/ProjectileSystem.ts';
import { ArmorRange } from './game/combat/ArmorTarget.ts';
import { CombatEffects } from './game/combat/CombatEffects.ts';
import { CombatInput } from './game/input/CombatInput.ts';
import { IRON_DUST_01_WEAPON, SHOT_FEEDBACK } from './game/combat/WeaponDefinition.ts';
import { KUL_WEATHER, TEST_GROUND_ATMOSPHERE, weatherFromSearch } from './game/world/atmosphereSettings.ts';
import { createChaoticSky } from './game/world/SkyAtmosphere.ts';
import tankUrl from '../assets/tanks/iron_dust_01/iron_dust_01.glb?url';
import secondTankUrl from '../assets/tanks/iron_dust_02/iron_dust_02.glb?url';

const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
const HIT_SHAKE = 5, DESTROYED_SHAKE = 9; // camera shake relative to a cannon shot
const HIT_IMPULSE_SCALE = 0.6; // incoming shell momentum relative to the cannon recoil impulse

const teamDuelMode = new URLSearchParams(location.search).get('duel') === '5v5';
const kulVadisi = teamDuelMode || new URLSearchParams(location.search).get('map') === 'kul';
const kulTeam = new URLSearchParams(location.search).get('base') === 'B' ? 'B' : 'A';
const mapHeight = kulVadisi ? kulTerrainHeight : terrainHeight;
const twoTankTest = !teamDuelMode && new URLSearchParams(location.search).has('duel');
const secondTank = new URLSearchParams(location.search).get('tank') === '02';
if (secondTank) document.querySelector<HTMLButtonElement>('[data-action="weapon"]')!.hidden = true;

const canvas = document.querySelector<HTMLCanvasElement>('#map')!;
const status = document.querySelector<HTMLElement>('#status')!;
const mobile = matchMedia('(pointer: coarse)').matches;
const engine = new Engine(canvas, !mobile);
const scaleMobile = () => { if (mobile) engine.setHardwareScalingLevel(Math.max(1, innerWidth / 1280, innerHeight / 720)); };
scaleMobile();
const scene = new Scene(engine);
scene.skipPointerMovePicking = true;
scene.imageProcessingConfiguration.exposure = 1;
scene.imageProcessingConfiguration.contrast = 1.15;
const atmosphere = kulVadisi ? KUL_WEATHER[weatherFromSearch(location.search)] : TEST_GROUND_ATMOSPHERE;
const sky = createChaoticSky(scene, kulVadisi ? 2800 : 1800, atmosphere);
const followCamera = new FollowCamera(scene, canvas);
followCamera.camera.maxZ = 1600;
const mapControls = addMapControls(followCamera, kulVadisi, kulVadisi && kulTeam === 'B' ? Math.PI : 0);
const removeTeamDuelLink = addTeamDuelLink();
const clock = new FixedStep();
const input = new DriveInput();
let teamDuel: TeamDuel | undefined;
let teamDuelHud: TeamDuelHud | undefined;
let laneDrones: LaneDrones | undefined;
let opponent: DuelTank | undefined;
let opponentAI: EasyDuelAI | undefined;
let opponentProjectiles: ProjectileSystem | undefined;
let vehicle: TankVehicle | undefined;
let visual: TankVisual | undefined;
let movementEffects: MovementEffects | undefined;
let observation: DrivingObservation | undefined;
let turret: TurretController | undefined;
let alignDirection: Vector3 | undefined;
let weapon: WeaponSystem | undefined;
let machineGun: MachineGun | undefined;
let mgProjectiles: ProjectileSystem | undefined;
let mgMode = false;
let projectiles: ProjectileSystem | undefined;
let combatRange: ArmorRange | undefined;
let combatEffects: CombatEffects | undefined;
let smokeSupply: SmokeSupply | undefined;
let lastCombatResult = '';
let combatResultTime = 0;
const damageHud = new DamageHud();
const damageHudState = freshDamage();
damageHud.setState(damageHudState);
let damageTrailTime = 0;
let damageSoundTime = 0;
const aim = new AimSystem(scene, followCamera, document.querySelector<HTMLElement>('#aim-bore')!,
  document.querySelector<HTMLElement>('#aim-status')!);
const combatInput = new CombatInput(canvas, () => (mgMode || !!weapon?.ready) && !followCamera.isOverview && !paused && pointerLock.active && !freeCamera.active,
  () => !!vehicle && !followCamera.isOverview && !paused && pointerLock.active && !freeCamera.active,
  (x, y) => { if (mgMode) machineGun?.look(x, y); else followCamera.look(x, y); }, () => { followCamera.aiming = false; },
  () => { if (!mgMode) alignDirection = followCamera.camera.getForwardRay().direction.clone(); });
function selectWeapon(useMG: boolean) {
  if (!machineGun || !vehicle || freeCamera.active) return;
  combatInput.clear(); alignDirection = undefined;
  if (followCamera.isOverview || !useMG) mapControls.follow();
  mgMode = useMG;
  scene.activeCamera = useMG ? machineGun.camera : followCamera.camera;
  if (useMG) machineGun.updateCamera();
  updateCombatHud();
}
const weaponKey = (event: KeyboardEvent) => {
  if (!pointerLock.active || event.repeat || (event.target as HTMLElement)?.closest?.('input, textarea, select, button, [contenteditable="true"]')) return;
  if (event.code === 'Digit1' || event.code === 'Digit2' || event.code === 'Numpad1' || event.code === 'Numpad2') {
    event.preventDefault(); selectWeapon(event.code.endsWith('2'));
  }
};
window.addEventListener('keydown', weaponKey);
let lastTime = performance.now();
let paused = document.hidden;
const keys = bindDriveKeys(window, () => reset(), () => pointerLock.active && !freeCamera.active);
const pointerLock = new GamePointerLock(canvas, () => {
  combatInput.clear(); keys.clear(); input.reset(); alignDirection = undefined;
}, () => !!vehicle && !paused, !mobile);
const freeCamera = new FreeFlyCamera(scene, canvas, () => !!vehicle && !paused && pointerLock.active, () => {
  combatInput.clear(); keys.clear(); input.reset(); alignDirection = undefined;
});
const touch = new TouchControls(document.querySelector<HTMLElement>('#touch-controls')!, canvas, {
  look: (x, y) => { if (mgMode) machineGun?.look(x, y); else followCamera.look(x, y); },
  fireReady: () => !!vehicle && !paused && (mgMode || !!weapon?.ready),
  weapon: () => selectWeapon(!mgMode), reset: () => reset(),
  sound: () => { soundEnabled = !soundEnabled;
    document.querySelector('[data-action="sound"]')!.setAttribute('aria-pressed', String(!soundEnabled));
    void toggleSound(); },
});
const tacticalHud = new TacticalHud(!secondTank, useMG => selectWeapon(useMG));
const smokeInventory = new SmokeInventory(() => useSmoke(), () => collectSmoke());
function smokeEnabled() {
  return !!vehicle && !!smokeSupply && !paused && !freeCamera.active && !followCamera.isOverview && damageHudState.hp > 0;
}
function clearLootPath(to: Vector3) {
  if (!vehicle) return false;
  const from = vehicle.node.position.add(new Vector3(0, 1.2, 0));
  return !scene.getPhysicsEngine()!.raycast(from, to, { ignoreBody: vehicle.body }).hasHit;
}
function collectSmoke() {
  if (smokeEnabled()) smokeSupply!.collect(vehicle!.node.position, clearLootPath);
}
function useSmoke() {
  if (!smokeEnabled()) return;
  const from = vehicle!.node.position.add(new Vector3(0, 2, 0));
  smokeSupply!.fire(from, vehicle!.node.getDirection(Vector3.Forward()), (origin, to) => {
    const hit = scene.getPhysicsEngine()!.raycast(origin, to, { ignoreBody: vehicle!.body });
    return hit.hasHit ? hit.hitPointWorld.subtract(to.subtract(origin).normalize().scale(.6)) : to;
  });
}
const smokeKey = (event: KeyboardEvent) => {
  if (!pointerLock.active || event.repeat || (event.target as HTMLElement)?.closest?.('input, textarea, select, button, [contenteditable="true"]')) return;
  if (event.code === 'KeyF') { event.preventDefault(); collectSmoke(); }
  if (event.code === 'KeyG') { event.preventDefault(); useSmoke(); }
};
window.addEventListener('keydown', smokeKey);
const ammoState = document.querySelector<HTMLElement>('#ammo-state')!;
const rangeReadout = document.querySelector<HTMLElement>('#range-readout')!;
const hitResult = document.querySelector<HTMLElement>('#hit-result')!;
function updateCombatHud() {
  if (!weapon) return;
  touch.update(weapon.ready, mgMode);
  if (vehicle && turret) {
    const cameraForward = scene.activeCamera!.getForwardRay().direction;
    const hullForward = vehicle.node.getDirection(Vector3.Forward());
    tacticalHud.update({ cameraYaw: Math.atan2(cameraForward.x, cameraForward.z),
      hullYaw: Math.atan2(hullForward.x, hullForward.z), turretYaw: turret.angles.yaw,
      speed: vehicle.speed, reloadRemaining: weapon.reloadRemaining, reloadFraction: weapon.reloadFraction,
      machineGun: mgMode, range: aim.rangeMeters, blocked: aim.marker.classList.contains('blocked') && !aim.marker.hidden });
  }
  ammoState.textContent = mgMode ? `MAKİNELİ TÜFEK · ${machineGun?.shotsFired ?? 0} ATIM` : weapon.ready
    ? `SİLAH HAZIR · ${IRON_DUST_01_WEAPON.ammo.label}`
    : `DOLUM · ${weapon.reloadRemaining.toFixed(1)} s`;
  rangeReadout.textContent = `${aim.rangeMeters.toFixed(0)} m`;
  hitResult.textContent = lastCombatResult;
  hitResult.className = '';
  document.querySelector<HTMLProgressElement>('#reload-progress')!.value = mgMode ? 1 : weapon.reloadFraction;
}
function hitShake(direction: Vector3, destroyed: boolean) {
  if (!reducedMotion.matches) followCamera.impulse(direction, destroyed ? DESTROYED_SHAKE : HIT_SHAKE);
}
function teamImpact(event: TeamImpact) {
  if (laneDrones?.hit(event.hit, event.shooter.team, 25)) return;
  const { hit, victim, applied, module, disabled, destroyed, playerShot } = event;
  if (victim) combatEffects!.armorImpact(hit.point, hit.normal, applied);
  else combatEffects!.impact(hit.point, hit.normal, impactSurface(hit.body));
  if (destroyed) combatEffects!.destruction(hit.point);
  const distance = Vector3.Distance(hit.point, followCamera.camera.position);
  if (!audio.muted) {
    if (victim) combatAudio?.armorHit(applied, distance, 0, destroyed);
    else combatAudio?.impact(impactSurface(hit.body), distance, 0);
  }
  if (victim === teamDuel?.player && applied) {
    damageHud.setState(damageHudState);
    damageHud.incoming(Math.atan2(hit.point.x - vehicle!.node.position.x, hit.point.z - vehicle!.node.position.z), module, disabled, destroyed);
    hitShake(vehicle!.node.position.subtract(hit.point).normalize(), destroyed);
  }
  if (playerShot) {
    if (victim) damageHud.outgoing(module, disabled, destroyed, applied);
    lastCombatResult = victim ? applied ? `HEDEF · ${victim.damage.hp} / 100` : 'DOST ARAÇ · HASAR YOK' : 'İSABET';
    combatResultTime = 3;
  }
}
function reset() {
  laneDrones?.reset();
  smokeSupply?.reset();
  if (freeCamera.active) freeCamera.toggle();
  teamDuel?.reset();
  opponent?.reset(); opponentAI?.reset(); opponentProjectiles?.reset(); damageHudState.hp = 100;
  Object.assign(damageHudState.modules, freshDamage().modules); damageHud.reset(); damageHud.setState(damageHudState); damageTrailTime = 0;
  touch.clear(); keys.clear(); input.reset(); clock.reset(); vehicle?.reset(undefined, kulVadisi && kulTeam === 'B' ? Math.PI : 0); visual?.reset(); movementEffects?.reset();
  alignDirection = undefined;
  vehicleAudio?.reset(); combatAudio?.reset(); turret?.reset(); weapon?.reset(); projectiles?.reset(); combatEffects?.reset();
  machineGun?.reset(); mgProjectiles?.reset(); selectWeapon(false);
  combatInput.clear(); lastCombatResult = ''; combatResultTime = 0;
  aim.reset(); mapControls.follow();
  lastTime = performance.now();
}
const visibility = () => {
  alignDirection = undefined;
  paused = document.hidden; movementEffects?.reset(); keys.clear(); input.reset(); clock.reset(); lastTime = performance.now();
  combatInput.clear();
  if (document.hidden) { combatAudio?.reset(); void audio.suspend(); }
  else if (soundEnabled) void audio.resume();
};
const blur = () => { keys.clear(); input.reset(); combatInput.clear(); combatAudio?.reset(); };
document.addEventListener('visibilitychange', visibility);
window.addEventListener('blur', blur);
const ambient = new HemisphericLight('sky', new Vector3(0, 1, 0), scene);
ambient.intensity = atmosphere.hemisphere.intensity;
ambient.diffuse = atmosphere.hemisphere.sky;
ambient.groundColor = atmosphere.hemisphere.ground;
const sun = new DirectionalLight('sun', new Vector3(...atmosphere.sun.direction), scene);
sun.intensity = atmosphere.sun.intensity;
sun.diffuse = atmosphere.sun.color;
sun.position = sun.direction.normalizeToNew().scale(-130);
sun.autoCalcShadowZBounds = true;
const shadows = new ShadowGenerator(mobile ? 1024 : 2048, sun);
shadows.usePercentageCloserFiltering = true;
shadows.bias = 0.001;
shadows.normalBias = 0.04;
shadows.setDarkness(0.25);

// Audio defaults no longer depend on the removed developer panel.
let soundEnabled = true;
const audio = new AudioSystem({ volume: 0.7 });
let vehicleAudio: VehicleAudio | undefined;
let combatAudio: CombatAudio | undefined;
let audioSnapshot: VehicleAudioSnapshot | undefined;
let audioUnlockStarted = false;
function ensureVehicleAudio() {
  if (vehicleAudio || !vehicle || !audio.graph || !audioSnapshot) return;
  const graph = audio.graph;
  vehicleAudio = new VehicleAudio(graph.context, graph.output, IRON_DUST_AUDIO);
  combatAudio = new CombatAudio(graph.context, graph.output);
  vehicleAudio.reset();
}
async function unlockAudio() {
  if (audioUnlockStarted || !soundEnabled) return;
  audioUnlockStarted = true;
  const unlocked = await audio.unlock();
  if (!unlocked) {
    audioUnlockStarted = false;
    return;
  }
  audio.setMuted(!soundEnabled);
  ensureVehicleAudio();
}
const unlockOnGesture = () => { void unlockAudio(); };
const toggleSound = async () => {
  if (soundEnabled) {
    if (!audio.ready) audioUnlockStarted = false;
    await unlockAudio();
    if (audio.ready) {
      audio.setMuted(false);
    }
  } else {
    combatAudio?.reset(); audio.setMuted(true);
  }
};
window.addEventListener('pointerdown', unlockOnGesture);
window.addEventListener('keydown', unlockOnGesture);
const resize = () => { scaleMobile(); engine.resize(); };
window.addEventListener('resize', resize);
let disposed = false;
let ground: ReturnType<typeof createTestGround> | Awaited<ReturnType<typeof createKulVadisi>> | undefined;
let tank: Awaited<ReturnType<typeof loadTankModel>> | undefined;

async function start() {
  const havok = await HavokPhysics({ locateFile: () => wasmUrl });
  if (disposed) return;
  scene.enablePhysics(new Vector3(0, -9.81, 0), new HavokPlugin(true, havok));
  scene.getPhysicsEngine()!.setTimeStep(1 / 60);
  // Only FixedStep advances this world, never the render loop.
  scene.physicsEnabled = false;
  ground = kulVadisi ? await createKulVadisi(scene, kulTeam) : createTestGround(scene);
  if (disposed) { ground.dispose(); return; }
  ground.shadowCasters.forEach(mesh => shadows.addShadowCaster(mesh));
  status.textContent = 'Harita hazır, tank modeli yükleniyor…';
  const playerSpawn = teamDuelMode ? teamSpawn(kulTeam, 0) : ground.spawn;
  tank = await loadTankModel(scene, secondTank ? secondTankUrl : tankUrl, playerSpawn);
  if (disposed) { tank.dispose(); return; }
  tank.assets.meshes.filter(mesh => mesh.isVisible).forEach(mesh => shadows.addShadowCaster(mesh));
  const rig = extractTankRig(tank);
  vehicle = new TankVehicle(scene, rig, playerSpawn);
  if (kulVadisi && kulTeam === 'B') vehicle.reset(playerSpawn, Math.PI);
  visual = new TankVisual(tank, rig);
  movementEffects = new MovementEffects(scene, vehicle);
  turret = new TurretController(tank, vehicle.definition);
  weapon = new WeaponSystem(turret, IRON_DUST_01_WEAPON);
  if (!secondTank) {
    machineGun = await MachineGun.load(scene, mgUrl, turret.yawPivot);
    if (disposed) { machineGun.dispose(); return; }
    machineGun.assets.meshes.filter(mesh => mesh.isVisible).forEach(mesh => shadows.addShadowCaster(mesh));
  }
  mgProjectiles = new ProjectileSystem(scene, (from, to) => {
    if (teamDuel) return teamDuel.raycast(vehicle!.body, from, to);
    const hit = scene.getPhysicsEngine()!.raycast(from, to, { ignoreBody: vehicle!.body, shouldHitTriggers: true });
    const worldHit = hit.hasHit ? { point: hit.hitPointWorld.clone(), normal: hit.hitNormalWorld.clone(), body: hit.body, distance: hit.hitDistance } : undefined;
    return opponent ? pickTankHit(scene, opponent, from, to, worldHit) : worldHit;
  }, 40, { gravity: -9.81, maxRange: 600, maxAge: 3, trailSeconds: 0.015, trailLength: 2.2, diameter: 0.035 });
  scene.activeCamera = followCamera.camera;
  if (!kulVadisi) {
    combatRange = new ArmorRange(scene, ground.spawn);
    combatRange.targets.forEach(target => target.shadowCasters.forEach(mesh => shadows.addShadowCaster(mesh)));
  }
  combatEffects = new CombatEffects(scene);
  smokeSupply = await SmokeSupply.load(scene, smokeSupplyUrl, smokeCapsuleUrl, ground.spawn, mapHeight,
    kulVadisi && kulTeam === 'B' ? Math.PI : 0);
  if (disposed) { smokeSupply.dispose(); smokeSupply = undefined; return; }
  smokeSupply.supplies.forEach(supply => supply.nodes.rootNodes.forEach(node =>
    node.getChildMeshes().forEach(mesh => shadows.addShadowCaster(mesh))));
  projectiles = new ProjectileSystem(scene, (from, to) => {
    if (teamDuel) return teamDuel.raycast(vehicle!.body, from, to);
    const hit = scene.getPhysicsEngine()!.raycast(from, to, { ignoreBody: vehicle!.body, shouldHitTriggers: true });
    const worldHit = hit.hasHit ? { point: hit.hitPointWorld.clone(), normal: hit.hitNormalWorld.clone(), body: hit.body, distance: hit.hitDistance } : undefined;
    return opponent ? pickTankHit(scene, opponent, from, to, worldHit) : worldHit;
  });
  opponentProjectiles = new ProjectileSystem(scene, (from, to) => {
    const hit = scene.getPhysicsEngine()!.raycast(from, to, { ignoreBody: opponent!.vehicle.body, shouldHitTriggers: true });
    const worldHit = hit.hasHit ? { point: hit.hitPointWorld.clone(), normal: hit.hitNormalWorld.clone(), body: hit.body, distance: hit.hitDistance } : undefined;
    const playerTarget = { tank: tank!, vehicle: vehicle! };
    return pickTankHit(scene, playerTarget, from, to, worldHit);
  }, 4);
  audioSnapshot = {
    speed: 0, forwardSpeed: vehicle.definition.forwardSpeed, driveForce: 0,
    traction: vehicle.definition.traction, contacts: vehicle.contacts,
    sides: rig.wheels.map(wheel => wheel.side),
  };
  ensureVehicleAudio();
  mapControls.follow();
  if (import.meta.env.DEV && new URLSearchParams(location.search).has('rimView')) {
    followCamera.overview();
    followCamera.camera.position.copyFrom(new Vector3(-25, 6, -235));
    followCamera.camera.setTarget(new Vector3(0, -12, -152));
  }
  if (import.meta.env.DEV && new URLSearchParams(location.search).has('driveTest')) observation = new DrivingObservation(engine, reset);
  if (twoTankTest) {
    status.textContent = 'İkinci tank yükleniyor…';
    const spawn = ground.spawn.add(new Vector3(24, 0, 0));
    spawn.y = mapHeight(spawn.x, spawn.z);
    opponent = await DuelTank.load(scene, secondTank ? tankUrl : secondTankUrl, spawn);
    if (disposed) { opponent.dispose(); opponent = undefined; return; }
    opponent.tank.assets.meshes.filter(mesh => mesh.isVisible).forEach(mesh => shadows.addShadowCaster(mesh));
    opponentAI = new EasyDuelAI();
  }
  if (teamDuelMode) {
    status.textContent = '5’e 5 takımlar yükleniyor…';
    teamDuel = new TeamDuel(scene, { tank, vehicle, damage: damageHudState, team: kulTeam });
    teamDuel.blocksSight = (from, to) => smokeSupply!.model.blocksSight(from, to);
    teamDuel.onImpact = teamImpact;
    teamDuel.onShot = (origin, direction) => {
      combatEffects!.muzzleFlash(origin, direction);
      if (!audio.muted) combatAudio?.shot();
    };
    await teamDuel.load(secondTank ? tankUrl : secondTankUrl);
    if (disposed) { teamDuel.dispose(); return; }
    for (const bot of teamDuel.bots) bot.actor.tank.assets.meshes.filter(mesh => mesh.isVisible).forEach(mesh => shadows.addShadowCaster(mesh));
    teamDuelHud = new TeamDuelHud(teamDuel, reset);
  }
  if (kulVadisi) {
    laneDrones = new LaneDrones(scene, () => teamDuel?.members ?? [
      { vehicle: vehicle!, damage: damageHudState, team: kulTeam },
      ...(opponent ? [{ vehicle: opponent.vehicle, damage: opponent.damage, team: kulTeam === 'A' ? 'B' as const : 'A' as const }] : []),
    ]);
    laneDrones.blocksSight = (from, to) => smokeSupply!.model.blocksSight(from, to) || (teamDuel?.blocksSight(from, to) ?? false);
    laneDrones.onImpact = (point, destroyed) => {
      combatEffects!.armorImpact(point, Vector3.Up(), true);
      if (destroyed) combatEffects!.destruction(point);
    };
    laneDrones.onTankHit = (member, point, destroyed) => {
      combatEffects!.armorImpact(point, Vector3.Up(), true);
      if (destroyed) combatEffects!.destruction(point);
      if (member.damage === damageHudState) {
        damageHud.setState(damageHudState);
        damageHud.incoming(Math.atan2(point.x - vehicle!.node.position.x, point.z - vehicle!.node.position.z), null, false, destroyed);
      }
    };
  }
  status.hidden = true;
  lastTime = performance.now();
  let hudElapsed = 0;
  engine.runRenderLoop(() => {
    const now = performance.now();
    const dt = Math.max(0, (now - lastTime) / 1000); lastTime = now;
    if (paused || !vehicle || !visual || !tank) return;
    sky.update(dt);
    const stormFlash = sky.flash;
    scene.imageProcessingConfiguration.exposure = (atmosphere.exposure ?? 1) + stormFlash * 0.32;
    ambient.intensity = atmosphere.hemisphere.intensity + stormFlash * 0.4;
    sun.intensity = atmosphere.sun.intensity + stormFlash * 0.25;
    followCamera.aiming = !mgMode && (combatInput.aiming || touch.aiming);
    const alpha = clock.advance(dt, step => {
      smokeSupply!.fixedUpdate(step);
      const command = freeCamera.active || teamDuel?.finished || driveDisabled(damageHudState) ? { throttle: 0, steer: 0, brake: 1 }
        : input.resolve(observation?.keys() ?? Object.fromEntries(Object.entries(keys.keys).map(([key, value]) => [key, value || touch.keys[key as keyof typeof touch.keys]])) as typeof keys.keys, vehicle!.speed, step, vehicle!.definition.reverseDelay);
      vehicle!.beforeStep(step, command, trackPower(damageHudState));
      movementEffects!.fixedUpdate(vehicle!, step);
      const aiState = opponentAI && opponent && vehicle ? (() => {
        const from = opponent!.vehicle.node.position.add(new Vector3(0, 1.2, 0));
        const to = vehicle!.node.position.add(new Vector3(0, 1.2, 0));
        const sight = scene.getPhysicsEngine()!.raycast(from, to, { ignoreBody: opponent!.vehicle.body, shouldHitTriggers: true });
        const visible = (!sight.hasHit || sight.body === vehicle!.body) && !smokeSupply!.model.blocksSight(from, to);
        return opponentAI!.update(opponent!, { vehicle: vehicle! },
          visible && damageHudState.hp > 0, step);
      })() : undefined;
      opponent?.beforeStep(step, opponent?.damage.hp === 0 || damageHudState.hp === 0 ? undefined : aiState?.drive);
      teamDuel?.beforeStep(step);
      laneDrones?.fixedUpdate(step, teamDuel?.finished);
      scene.getPhysicsEngine()!._step(step);
      vehicle!.afterStep();
      opponent?.afterStep(step, aiState?.target ?? null);
      observation?.step();
      visual!.fixedUpdate(vehicle!, step);
      // Joint calculations use the current physics pose; render interpolation follows below.
      visual!.syncHull(vehicle!, 1);
      teamDuel?.afterStep(step);
      const turn = combatInput.turretTurn + touch.turn;
      const elevation = combatInput.consumeElevation() + touch.elevation * step * 15 * Math.PI / 180;
      if (turn || elevation || mgMode || followCamera.isOverview) alignDirection = undefined;
      if (alignDirection) {
        turret!.yawPivot.computeWorldMatrix(true);
        turret!.fixedUpdate(turret!.yawPivot.getAbsolutePosition().add(alignDirection.scale(10000)), step);
      } else turret!.fixedUpdateManual(followCamera.isOverview || mgMode ? 0 : turn, mgMode ? 0 : elevation, step);
      if (mgMode) machineGun!.look(touch.turn * step * 220, -touch.elevation * step * 160);
      const wasReady = weapon!.ready;
      weapon!.fixedUpdate(step);
      if (!wasReady && weapon!.ready && !audio.muted) combatAudio?.reload();
      if ((combatInput.consumeFire() || touch.consumeFire()) && !mgMode && damageHudState.hp > 0 && !teamDuel?.finished) {
        const shot = weapon!.fire();
        if (shot) {
          projectiles!.spawn(shot.origin, shot.direction, IRON_DUST_01_WEAPON.ammo.muzzleVelocity);
          const ground = scene.getPhysicsEngine()!.raycast(shot.origin,
            shot.origin.add(new Vector3(0, -4.5, 0)), { ignoreBody: vehicle!.body });
          combatEffects!.muzzleFlash(shot.origin, shot.direction,
            ground.hasHit && ground.body?.transformNode.name === 'natural-terrain'
              ? { point: ground.hitPointWorld.clone(), normal: ground.hitNormalWorld.clone() } : undefined);
          followCamera.impulse(shot.direction);
          vehicle!.body.applyImpulse(shot.direction.scale(-SHOT_FEEDBACK.hullImpulse), turret!.pitchPivot.getAbsolutePosition());
          if (!audio.muted) combatAudio?.shot();
          lastCombatResult = 'ATIŞ · UÇUYOR'; combatResultTime = 3;
        } else {
          lastCombatResult = 'DOLUM SÜRÜYOR'; combatResultTime = 1;
        }
      }
      if (opponent && opponentAI && opponentProjectiles && opponent.damage.hp > 0 && damageHudState.hp > 0) {
        const ray = opponent.turret.getMuzzleRay();
        const toPlayer = vehicle!.node.position.add(new Vector3(0, 1.15, 0)).subtract(ray.origin).normalize();
        if (aiState?.target && opponentAI.canShoot && opponent.weapon.ready && Vector3.Dot(ray.direction, toPlayer) > 0.965) {
          const shot = opponent.weapon.fire();
          if (shot) {
            opponentProjectiles.spawn(shot.origin, shot.direction, IRON_DUST_01_WEAPON.ammo.muzzleVelocity);
            opponentAI.shotFired();
            combatEffects!.muzzleFlash(shot.origin, shot.direction);
            if (!audio.muted) combatAudio?.shot();
          }
        }
      }
      machineGun?.fixedUpdate(step, damageHudState.hp > 0 && !teamDuel?.finished && mgMode && !followCamera.isOverview && (combatInput.fireHeld || touch.fireHeld), (origin, direction) => {
        mgProjectiles!.spawn(origin, direction, MG.speed);
        combatEffects!.machineGunFlash(origin, direction);
        if (!audio.muted) combatAudio?.machineGunShot();
        lastCombatResult = 'MG · ATEŞ'; combatResultTime = 0.4;
      });
      mgProjectiles!.fixedUpdate(step, hit => {
        if (laneDrones?.hit(hit, kulTeam, LANE_DRONES.mgDamage)) return;
        if (teamDuel) {
          const tankHit = teamDuel.members.some(m => m.vehicle.body === hit.body);
          if (tankHit) { combatEffects!.armorImpact(hit.point, hit.normal, false); damageHud.outgoing(null, false, false, false); }
          else combatEffects!.impact(hit.point, hit.normal, impactSurface(hit.body));
          return;
        }
        if (opponent && hit.body === opponent.vehicle.body) {
          combatEffects!.armorImpact(hit.point, hit.normal, false);
          damageHud.outgoing(null, false, false, false);
        } else combatEffects!.impact(hit.point, hit.normal, impactSurface(hit.body));
        lastCombatResult = 'MG · İSABET'; combatResultTime = 0.4;
      });
      projectiles!.fixedUpdate(step, (hit, shell) => {
        if (laneDrones?.hit(hit, kulTeam, 25)) return;
        if (teamDuel) { teamDuel.playerImpact(hit); return; }
        const tankHit = opponent && hit.body === opponent.vehicle.body;
        const armor = tankHit ? undefined : combatRange?.resolve(IRON_DUST_01_AMMO, hit, shell.velocity, shell.traveled);
        const surface = tankHit || armor ? 'metal' : impactSurface(hit.body);
        const glanced = !!tankHit && ricochets(shell.velocity, hit.normal);
        const penetrated = (tankHit && !glanced) || armor?.result.kind === 'penetrated';
        const offset = hit.point.subtract(followCamera.camera.position);
        const right = Vector3.Cross(Vector3.Up(), followCamera.direction).normalize();
        const pan = Vector3.Dot(offset.normalizeToNew(), right);
        if (tankHit || armor) {
          combatEffects!.armorImpact(hit.point, hit.normal, !!penetrated);
          const module = tankHit ? tankDamageRegion(opponent!, hit.point) : null;
          const applied = tankHit && !glanced && applyDamage(opponent!.damage, module);
          const destroyed = !!applied && opponent!.damage.hp === 0;
          const disabled = !!module && opponent!.damage.modules[module] === 0;
          if (destroyed) combatEffects!.destruction(hit.point);
          damageHud.outgoing(module, disabled, destroyed, !!penetrated);
          if (!audio.muted) combatAudio?.armorHit(!!penetrated, offset.length(), pan, destroyed);
          lastCombatResult = glanced ? 'SEKTİ' : tankHit ? `HEDEF · ${opponent!.damage.hp} / 100` : armor!.result.kind === 'ricochet' ? 'SEKTİ' : penetrated ? 'ZIRH DELİNDİ' : 'ZIRH DELİNMEDİ';
        } else {
          combatEffects!.impact(hit.point, hit.normal, surface);
          if (!audio.muted) combatAudio?.impact(surface, offset.length(), pan);
          lastCombatResult = `İSABET · ${{ soil: 'TOPRAK', concrete: 'BETON', metal: 'METAL' }[surface]}`;
        }
        combatResultTime = 4;
      });
      opponentProjectiles?.fixedUpdate(step, (hit, shell) => {
        if (laneDrones?.hit(hit, kulTeam === 'A' ? 'B' : 'A', 25)) return;
        if (hit.body !== vehicle!.body) {
          combatEffects!.impact(hit.point, hit.normal, impactSurface(hit.body)); return;
        }
        if (ricochets(shell.velocity, hit.normal)) {
          combatEffects!.armorImpact(hit.point, hit.normal, false);
          if (!audio.muted) combatAudio?.armorHit(false, Vector3.Distance(hit.point, followCamera.camera.position), 0, false);
          lastCombatResult = 'MERMİ SEKTİ'; combatResultTime = 4;
          return;
        }
        const module = tank && vehicle ? tankDamageRegion({ tank, vehicle }, hit.point) : null;
        const applied = applyDamage(damageHudState, module);
        // The shell's momentum jolts the hull at the contact point, so the hit also yaws and pitches it.
        vehicle!.body.applyImpulse(shell.velocity.normalizeToNew().scale(SHOT_FEEDBACK.hullImpulse * HIT_IMPULSE_SCALE), hit.point);
        const disabled = !!module && damageHudState.modules[module] === 0;
        const destroyed = applied && damageHudState.hp === 0;
        damageHud.setState(damageHudState);
        damageHud.incoming(Math.atan2(hit.point.x - vehicle!.node.position.x, hit.point.z - vehicle!.node.position.z), module, disabled, !!destroyed);
        hitShake(shell.velocity, !!destroyed);
        combatEffects!.armorImpact(hit.point, hit.normal, true);
        if (destroyed) combatEffects!.destruction(hit.point);
        if (!audio.muted) combatAudio?.armorHit(true, Vector3.Distance(hit.point, followCamera.camera.position), 0, destroyed);
        lastCombatResult = destroyed ? 'İMHA EDİLDİN · R İLE YENİDEN DENE' : `İSABET ALDIN · ${damageHudState.hp} / 100`;
        combatResultTime = 4;
      });
      teamDuel?.finishStep();
      damageTrailTime += step; damageSoundTime += step;
      if (damageTrailTime >= 0.05) {
        damageTrailTime -= 0.05;
        if (teamDuel) for (const member of teamDuel.members) {
          const deck = Vector3.TransformCoordinates(new Vector3(0, 1.95, -2), member.tank.anchor.computeWorldMatrix(true));
          combatEffects!.damageTrail(deck, member.damage);
        }
        if (tank) combatEffects!.damageTrail(Vector3.TransformCoordinates(new Vector3(0, 1.95, -2), tank.anchor.computeWorldMatrix(true)), damageHudState);
        if (opponent) {
          const deck = Vector3.TransformCoordinates(new Vector3(0, 1.95, -2), opponent.tank.anchor.computeWorldMatrix(true));
          combatEffects!.damageTrail(deck, opponent.damage);
          if (damageSoundTime >= 0.4 && !audio.muted && document.hasFocus()) {
            const offset = deck.subtract(followCamera.camera.position);
            combatAudio?.damageAmbience(opponent.damage.hp, opponent.damage.modules.engine, offset.length(),
              Vector3.Dot(offset.normalizeToNew(), Vector3.Cross(Vector3.Up(), followCamera.direction).normalize()));
          }
        }
      }
      if (damageSoundTime >= 0.4) damageSoundTime = 0;
      combatEffects!.fixedUpdate(step);
    });
    laneDrones?.render(alpha);
    teamDuel?.render(alpha);
    opponent?.render(alpha);
    visual.render(vehicle, alpha);
    movementEffects!.render(alpha);
    turret!.render(alpha);
    weapon!.render(alpha);
    projectiles!.render(alpha);
    opponentProjectiles?.render(alpha);
    mgProjectiles!.render(alpha);
    combatEffects!.render(alpha);
    followCamera.update(vehicle, tank.anchor.position, Math.min(dt, 0.1), turret);
    if (mgMode) machineGun!.updateCamera();
    freeCamera.update(dt);
    smokeSupply!.render();
    const cameraDirection = scene.activeCamera!.getForwardRay().direction;
    damageHud.update(Math.min(dt, 0.1), Math.atan2(cameraDirection.x, cameraDirection.z));
    hudElapsed += dt;
    combatResultTime = Math.max(0, combatResultTime - dt);
    if (combatResultTime === 0 && lastCombatResult) lastCombatResult = '';
    if (hudElapsed >= 0.1) {
      updateCombatHud();
      teamDuelHud?.update();
      const nearSupply = smokeSupply!.nearest(vehicle.node.position);
      smokeInventory.update(smokeSupply!.model, smokeEnabled() && !!nearSupply && clearLootPath(nearSupply.position.add(new Vector3(0, .6, 0))), damageHudState.hp > 0);
      hudElapsed = 0;
    }
    if (vehicleAudio && audioSnapshot) {
      audioSnapshot.speed = vehicle.speed;
      audioSnapshot.driveForce = vehicle.driveForce;
      vehicleAudio.update(audioSnapshot, dt);
    }
    scene.render();
    if (!freeCamera.active) aim.render(vehicle, mgMode ? machineGun! : turret!);
    else { aim.marker.hidden = true; aim.label.hidden = true; }
    observation?.frame(dt, vehicle);
  });
}
start().catch((error: unknown) => {
  if (disposed) return;
  console.error(error);
  status.textContent = 'Sahne yüklenemedi. Sayfayı yenileyerek tekrar deneyin.';
});
function dispose() {
  if (disposed) return;
  disposed = true;
  window.removeEventListener('pagehide', dispose);
  engine.stopRenderLoop();
  window.removeEventListener('resize', resize);
  window.removeEventListener('keydown', weaponKey);
  window.removeEventListener('keydown', smokeKey);
  smokeInventory.dispose(); smokeSupply?.dispose();
  tacticalHud.dispose();
  touch.dispose();
  freeCamera.dispose();
  pointerLock.dispose();
  combatInput.dispose();
  window.removeEventListener('pointerdown', unlockOnGesture);
  window.removeEventListener('keydown', unlockOnGesture);
  laneDrones?.dispose();
  shadows.dispose();
  keys.dispose();
  document.removeEventListener('visibilitychange', visibility);
  window.removeEventListener('blur', blur);
  observation?.dispose();
  movementEffects?.dispose();
  projectiles?.dispose(); opponentProjectiles?.dispose(); combatEffects?.dispose(); combatRange?.dispose();
  combatAudio?.dispose(); vehicleAudio?.dispose();
  audio.dispose();
  damageHud.dispose();
  aim.dispose(); turret?.dispose(); visual?.dispose(); vehicle?.dispose(); followCamera.dispose();
  mgProjectiles?.dispose(); machineGun?.dispose();
  removeTeamDuelLink(); teamDuelHud?.dispose(); teamDuel?.dispose();
  opponent?.dispose();
  tank?.dispose();
  mapControls.dispose();
  ground?.dispose();
  sky.dispose();
  scene.dispose();
  engine.dispose();
}
if (import.meta.hot) import.meta.hot.dispose(dispose);
window.addEventListener('pagehide', dispose, { once: true });
