import { freezeSceneMaterials } from './game/world/optimizeStaticProps.ts';
import { GunnerSight } from './game/ui/GunnerSight.ts';
import { ThermalView } from './game/effects/ThermalView.ts';
import { LaserRangefinder } from './game/aim/LaserRangefinder.ts';
import { nextSightMode, sightAzimuth, type SightMode } from './game/aim/gunnerSightModel.ts';
import { PLAY_CONFIG, type DevSessionConfig } from './game/core/devConfig.ts';
import { KUL_JAMMERS } from './game/world/jammerLayout.ts';
import { Minimap, type MinimapState } from './game/ui/Minimap.ts';
import { KUL_LIMIT, KUL_PATHS, KUL_SPAWNS, KUL_STRUCTURES } from './game/world/kulVadisiLayout.ts';
import { KUL_FIELD_LANDMARKS } from './game/world/kulLandmarkLayout.ts';
import { KUL_RAIL_DEPOT } from './game/world/kulRailYardLayout.ts';
import { TERRAIN_LIMIT, pathCenter } from './game/world/terrain.ts';
import { AIRFIELD, AIRFIELD_HANGARS, FILM_LIMIT, FILM_BUILDINGS, FILM_ROADS, FUEL_DEPOT, RUNWAY, VILLAGE_BUILDINGS } from './game/world/filmSetLayout.ts';
import { FpvDrone, type FpvTarget } from './game/drone/FpvDrone.ts';
import { TankJammer } from './game/vehicle/TankJammer.ts';
import { InfantryNpcs } from './game/infantry/InfantryNpcs.ts';
import { SoldierProfileCard } from './game/ui/SoldierProfileCard.ts';
import infantryFallbackUrl from '../assets/characters/ua_infantry_01/ua_infantry_01.glb?url';
// Optional while the rig is being produced; Vite also packages it when present.
const infantryRigUrls = import.meta.glob('../assets/characters/ua_infantry_01/ua_infantry_01_rigged.glb',
  { eager: true, query: '?url', import: 'default' }) as Record<string, string>;
import { RookieMission } from './game/mission/RookieMission.ts';
import type { MissionScore } from './game/mission/MissionDirector.ts';
import { LaneDrones } from './game/combat/LaneDrones.ts';
import { LANE_DRONES } from './game/combat/LaneDroneModel.ts';
import './game/input/gamePointerLock.css';
import { GamePointerLock } from './game/input/GamePointerLock.ts';
import { DamageHud } from './game/ui/DamageHud.ts';
import { freshDamage, applyDamage, driveDisabled, trackPower, ricochets, tickDamage, turretTraverse } from './game/combat/DamageModel.ts';
import { pickTankHit, tankDamageRegion, tankHitFacing } from './game/combat/tankHit.ts';
import { IRON_DUST_01_AMMO } from './game/combat/WeaponDefinition.ts';
import { DuelTank } from './game/combat/DuelTank.ts';
import { TeamDuel, type TeamImpact } from './game/combat/TeamDuel.ts';
import { FILM_TEAM_LAYOUT } from './game/combat/filmTeamLayout.ts';
import { KUL_TEAM_LAYOUT } from './game/combat/teamDuelLayout.ts';
import { TeamDuelHud, addTeamDuelLink } from './game/ui/TeamDuelHud.ts';
import { EasyDuelAI } from './game/combat/EasyDuelAI.ts';
import { terrainHeight } from './game/world/terrain.ts';
import { createKulVadisi } from './game/world/createKulVadisi.ts';
import { kulTerrainHeight } from './game/world/kulVadisiLayout.ts';
import { createFilmSet } from './game/world/createFilmSet.ts';
import { FILM_SPOTS, filmSetHeight, filmSpotFromSearch } from './game/world/filmSetLayout.ts';
import { addMapControls } from './game/world/kulVadisiControls.ts';
import { TouchControls } from './game/input/TouchControls.ts';
import './mapPreview.css';
import { TacticalHud } from './game/ui/TacticalHud.ts';
import { SmokeSupply, turretLauncherPose } from './game/items/SmokeSupply.ts';
import { SmokeInventory } from './game/ui/SmokeInventory.ts';
import smokeSupplyUrl from '../assets/items/smoke_supply_01/smoke_supply_01.glb?url';
import smokeCapsuleUrl from '../assets/items/smoke_supply_01/smoke_capsule_01.glb?url';
import { MachineGun, MG } from './game/combat/MachineGun.ts';
import mgUrl from '../assets/weapons/iron_dust_mg_02/iron_dust_mg_02.glb?url';
import { MovementEffects } from './game/effects/MovementEffects.ts';
import { Color3, DirectionalLight, Engine, HemisphericLight,
  HavokPlugin, Scene, Vector3, type PhysicsBody } from '@babylonjs/core';
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
import { IRON_DUST_AUDIO, type TankAudioId } from './game/audio/AudioDefinition.ts';
import { VehicleAudio } from './game/audio/VehicleAudio.ts';
import type { VehicleAudioSnapshot } from './game/audio/VehicleAudioModel.ts';
import { WeaponSystem } from './game/combat/WeaponSystem.ts';
import { ProjectileSystem, type ProjectileHit } from './game/combat/ProjectileSystem.ts';
import { ArmorRange } from './game/combat/ArmorTarget.ts';
import { CombatEffects } from './game/combat/CombatEffects.ts';
import { CombatInput } from './game/input/CombatInput.ts';
import { IRON_DUST_01_WEAPON, SHOT_FEEDBACK } from './game/combat/WeaponDefinition.ts';
import { CALM_WEATHER, KUL_WEATHER, TEST_GROUND_ATMOSPHERE, weatherFromSearch } from './game/world/atmosphereSettings.ts';
import { createChaoticSky } from './game/world/SkyAtmosphere.ts';
import { RainEffect } from './game/world/RainEffect.ts';
import { Studio } from './game/studio/Studio.ts';
import { addShadowCasters, applySunShadowQuality, createSunShadows } from './game/world/createSunShadows.ts';
import tankUrl from '../assets/tanks/iron_dust_01/iron_dust_01.glb?url';
import secondTankUrl from '../assets/tanks/iron_dust_02/iron_dust_02.glb?url';

import { t } from './game/i18n/index.ts';
import { readSave, hasSavedQuality, defaultQuality, type Quality, type Settings } from './game/core/playerSave.ts';

export interface GameSessionOptions {
  shell?: boolean;
  onDefaultQuality?: (quality: Quality) => void;
  settings?: Settings;
  dev?: DevSessionConfig;
  onReady?: () => void;
  onError?: () => void;
  onTeamResult?: (result: { outcome: 'A' | 'B' | 'draw'; score: { A: number; B: number }; kills: number; deaths: number; seconds: number }) => void;
  onMissionResult?: (score: MissionScore) => void;
}
export function createGameSession(options: GameSessionOptions = {}) {
let settings = options.settings ?? readSave().settings;
let shellPaused = !!options.shell;
let attract = !!options.shell;
let attractAngle = 0;
let resultView = false;
let resultAngle = .7;
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
const HIT_SHAKE = 5, DESTROYED_SHAKE = 9; // camera shake relative to a cannon shot
const HIT_IMPULSE_SCALE = 0.6; // incoming shell momentum relative to the cannon recoil impulse

const dev = !options.shell && new URLSearchParams(location.search).has('studio') ? undefined
  : settings.devMode ? options.dev : options.shell && options.dev ? options.dev : { ...PLAY_CONFIG, tank: settings.tank };
const teamDuelMode = dev ? (dev.map === 'kul' && dev.mode === '5v5' || dev.map === 'set' && dev.mode === '3v3') : !options.shell && ['5v5', '3v3'].includes(new URLSearchParams(location.search).get('duel') ?? '');
const kulVadisi = dev ? dev.map === 'kul' : !options.shell && (new URLSearchParams(location.search).get('duel') === '5v5' || new URLSearchParams(location.search).get('map') === 'kul');
const kulTeam = dev ? dev.mode === '3v3' ? 'A' : dev.base : new URLSearchParams(location.search).get('base') === 'B' ? 'B' : 'A';
const filmSet = dev ? dev.map === 'set' : !options.shell && !kulVadisi && new URLSearchParams(location.search).get('map') === 'set';
const filmSpot = FILM_SPOTS[dev ? dev.filmSpot : filmSpotFromSearch(location.search)];
const teamLayout = filmSet ? FILM_TEAM_LAYOUT : KUL_TEAM_LAYOUT;
const layoutSpawn = (team: 'A' | 'B', slot: number) => { const p = teamLayout.spawn(team, slot); return new Vector3(p.x, p.y, p.z); };
let spawnYaw = teamDuelMode ? teamLayout.yaw(kulTeam) : kulVadisi && kulTeam === 'B' ? Math.PI : filmSet ? filmSpot.yaw : 0;
const mapHeight = kulVadisi ? kulTerrainHeight : filmSet ? filmSetHeight : terrainHeight;
const twoTankTest = dev ? dev.mode === 'duel' : !options.shell && !teamDuelMode && new URLSearchParams(location.search).has('duel');
const secondTank = dev ? dev.tank === '02' : !options.shell && new URLSearchParams(location.search).get('tank') === '02';
const studioMode = !dev && !options.shell && new URLSearchParams(location.search).has('studio');
document.querySelector<HTMLButtonElement>('[data-action="weapon"]')!.hidden = secondTank;

const canvas = document.querySelector<HTMLCanvasElement>('#map')!;
const status = document.querySelector<HTMLElement>('#status')!;
const mobile = matchMedia('(pointer: coarse)').matches;
// Studio reads rendered frames back, so the drawing buffer must survive the frame.
const engine = new Engine(canvas, !mobile, studioMode ? { preserveDrawingBuffer: true, stencil: true } : undefined);
if (!hasSavedQuality()) {
  const quality = defaultQuality(engine.getGlInfo().renderer);
  settings = { ...settings, quality };
  options.onDefaultQuality?.(quality);
}
const scaleMobile = () => { if (mobile) engine.setHardwareScalingLevel(Math.max(1, innerWidth / 1280, innerHeight / 720)); };
scaleMobile();
const scene = new Scene(engine);
scene.skipPointerMovePicking = true;
scene.imageProcessingConfiguration.exposure = 1;
scene.imageProcessingConfiguration.contrast = 1.15;
const weatherId = kulVadisi || filmSet ? dev ? dev.weather : weatherFromSearch(location.search) : undefined;
const atmosphere = weatherId ? KUL_WEATHER[weatherId] : TEST_GROUND_ATMOSPHERE;
const weather = atmosphere.weather ?? CALM_WEATHER;
const sky = createChaoticSky(scene, kulVadisi || filmSet ? 2800 : 1800, atmosphere);
const rain = weather.rain > 0 ? new RainEffect(scene, weather.rain, settings.quality) : undefined;
/** New spawn seed per session: every match (and replay) draws different spawn points. */
const matchSeed = (Math.random() * 2 ** 32) >>> 0;
const followCamera = new FollowCamera(scene, canvas, mobile);
followCamera.camera.maxZ = 1600;
const mapControls = options.shell || !settings.devMode ? { follow: () => followCamera.follow(spawnYaw), dispose() {} } : addMapControls(followCamera, kulVadisi, () => spawnYaw);
const removeTeamDuelLink = options.shell || !settings.devMode ? () => {} : addTeamDuelLink();
const clock = new FixedStep();
const input = new DriveInput();
let fpv: FpvDrone | undefined;
let infantry: InfantryNpcs | undefined;
const soldierProfiles = new SoldierProfileCard();
let studio: Studio | undefined;
let teamDuel: TeamDuel | undefined;
let teamDuelHud: TeamDuelHud | undefined;
let laneDrones: LaneDrones | undefined;
let mission: RookieMission | undefined;
let missionRequested = false;
let opponent: DuelTank | undefined;
let opponentAI: EasyDuelAI | undefined;
let opponentProjectiles: ProjectileSystem | undefined;
let vehicle: TankVehicle | undefined;
let visual: TankVisual | undefined;
let movementEffects: MovementEffects | undefined;
let observation: DrivingObservation | undefined;
let turret: TurretController | undefined;
let tankJammer: TankJammer | undefined;
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
const gunnerSight = new GunnerSight();
const thermalView = new ThermalView(scene, followCamera.camera);
const laserRangefinder = new LaserRangefinder();
let sightMode: SightMode = 'DAY';
function sightEnabled() {
  return !!vehicle && !!weapon && !paused && !attract && !resultView && pointerLock.active
    && !freeCamera.active && !fpv?.active && !mgMode && !followCamera.isOverview && damageHudState.hp > 0;
}
function updateGunnerSight() {
  const enabled = sightEnabled();
  const active = enabled && combatInput.aiming;
  if (!active) sightMode = 'DAY';
  else if (combatInput.consumeThermal()) sightMode = nextSightMode(sightMode);
  thermalView.setMode(active ? sightMode : 'DAY');
  const bore = turret?.getMuzzleRay().direction;
  gunnerSight.update({ active, enabled, mode: sightMode, fov: followCamera.camera.fov,
    magnification: followCamera.magnification, azimuth: bore ? sightAzimuth(bore.x, bore.z) : '000',
    reloadRemaining: weapon?.reloadRemaining ?? 0, blocked: aim.marker.classList.contains('blocked') && !aim.marker.hidden,
    sample: laserRangefinder.sample, now: performance.now() / 1000 });
}
const combatInput = new CombatInput(canvas, () => (mgMode || !!weapon?.ready) && !followCamera.isOverview && !paused && pointerLock.active && !freeCamera.active && !fpv?.active,
  () => !!vehicle && !followCamera.isOverview && !paused && pointerLock.active && !freeCamera.active && !fpv?.active,
  (x, y) => { if (paused) return; x *= settings.sensitivity; y *= settings.sensitivity * (settings.invertY ? -1 : 1); if (mgMode) machineGun?.look(x, y); else followCamera.look(x, y); }, () => { followCamera.aiming = false; sightMode = 'DAY'; thermalView.setMode('DAY'); },
  notches => { if (!mgMode) { followCamera.aiming = combatInput.aiming; followCamera.zoom(notches); } });
function selectWeapon(useMG: boolean) {
  if (!machineGun || !vehicle || freeCamera.active || fpv?.active) return;
  combatInput.clear(); alignDirection = undefined;
  if (followCamera.isOverview || !useMG) mapControls.follow();
  mgMode = useMG;
  scene.activeCamera = useMG ? machineGun.camera : followCamera.camera;
  if (useMG) machineGun.updateCamera();
  updateCombatHud();
}
const weaponKey = (event: KeyboardEvent) => {
  if (paused || !pointerLock.active || event.repeat || (event.target as HTMLElement)?.closest?.('input, textarea, select, button, [contenteditable="true"]')) return;
  if (event.code === 'Digit1' || event.code === 'Digit2' || event.code === 'Numpad1' || event.code === 'Numpad2') {
    event.preventDefault(); selectWeapon(event.code.endsWith('2'));
  }
};
window.addEventListener('keydown', weaponKey);
let lastTime = performance.now();
let paused = shellPaused || document.hidden;
const keys = bindDriveKeys(window, () => reset(), () => !paused && pointerLock.active && !freeCamera.active && !fpv?.active);
const pointerLock = new GamePointerLock(canvas, () => {
  combatInput.clear(); keys.clear(); input.reset(); alignDirection = undefined;
}, () => !!vehicle && !paused, !mobile);
const freeCamera = new FreeFlyCamera(scene, canvas, () => !options.shell && !!vehicle && !paused && pointerLock.active && !fpv?.active, () => {
  combatInput.clear(); keys.clear(); input.reset(); alignDirection = undefined;
});
const touch = new TouchControls(document.querySelector<HTMLElement>('#touch-controls')!, canvas, {
  look: (x, y) => { if (paused) return; x *= settings.sensitivity; y *= settings.sensitivity * (settings.invertY ? -1 : 1); if (mgMode) machineGun?.look(x, y); else followCamera.look(x, y); },
  fireReady: () => !!vehicle && !paused && (mgMode || !!weapon?.ready),
  weapon: () => { if (!paused) selectWeapon(!mgMode); }, reset: () => { if (!paused) reset(); },
  sound: () => { soundEnabled = !soundEnabled;
    document.querySelector('[data-action="sound"]')!.setAttribute('aria-pressed', String(!soundEnabled));
    void toggleSound(); },
});
const tacticalHud = new TacticalHud(!secondTank, useMG => selectWeapon(useMG));
const minimap = new Minimap({
  limit: kulVadisi ? KUL_LIMIT : filmSet ? FILM_LIMIT : TERRAIN_LIMIT,
  height: mapHeight,
  jammers: kulVadisi ? KUL_JAMMERS : [],
  paths: kulVadisi ? KUL_PATHS : filmSet
    ? [...[RUNWAY, AIRFIELD.runway, AIRFIELD.taxiway].map(r => ({ points: [{ x: 'x' in r ? r.x : 0, z: r.zMin }, { x: 'x' in r ? r.x : 0, z: r.zMax }] })), ...FILM_ROADS]
    : [{ points: Array.from({ length: 38 }, (_, i) => { const z = -80 + i * 5; return { x: pathCenter(z), z }; }) }],
  buildings: kulVadisi ? [...KUL_STRUCTURES, ...KUL_FIELD_LANDMARKS, KUL_RAIL_DEPOT] : filmSet ? [...FILM_BUILDINGS, ...AIRFIELD_HANGARS.map(h => ({ x: h.x - h.length / 2, z: h.z, width: h.length, depth: h.width })),
    ...VILLAGE_BUILDINGS, ...FUEL_DEPOT.tanks.map(t => ({ ...t, width: FUEL_DEPOT.tankDiameter, depth: FUEL_DEPOT.tankDiameter }))] : [],
}, () => !!vehicle && !paused && !attract && !resultView && !freeCamera.active && !followCamera.isOverview
  && (!options.shell || document.body.classList.contains('shell-playing')));
function checkTargetSight(from: Vector3, target: { vehicle: TankVehicle }, ignoreBody?: PhysicsBody): boolean {
  const to = target.vehicle.node.position.add(new Vector3(0, 1.15, 0));
  if (Vector3.DistanceSquared(from, to) > 180 ** 2 || smokeSupply?.model.blocksSight(from, to)) return false;
  const hit = scene.getPhysicsEngine()!.raycast(from, to, { ignoreBody });
  return !hit.hasHit || hit.body === target.vehicle.body;
}
function minimapState(): MinimapState {
  const tank = vehicle!.node.position, forward = vehicle!.node.getDirection(Vector3.Forward());
  const contacts: MinimapState['contacts'] = [];
  const drone = fpv?.active ? { x: fpv.flight.position.x, z: fpv.flight.position.z, yaw: fpv.flight.yaw } : undefined;
  const canSee = (target: { vehicle: TankVehicle }) => {
    const from = drone ? fpv!.flight.position : tank.add(new Vector3(0, 1.2, 0));
    return checkTargetSight(from, target, vehicle!.body);
  };
  if (teamDuel) for (const [i, member] of teamDuel.members.entries()) {
    if (member === teamDuel.player || member.damage.hp <= 0) continue;
    const friend = member.team === kulTeam;
    const visible = friend || (drone ? canSee(member) : teamDuel.canSee(teamDuel.player, member));
    if (visible) contacts.push({ id: `team-${i}`, position: member.vehicle.node.position, friend, visible });
  }
  const enemies = opponent ? [opponent] : mission?.scouts.map(scout => scout.actor) ?? [];
  for (const [i, actor] of enemies.entries()) {
    if (actor.damage.hp > 0 && actor.tank.anchor.isEnabled() && canSee(actor))
      contacts.push({ id: `enemy-${i}`, position: actor.vehicle.node.position, friend: false, visible: true });
  }
  const look = turret?.getMuzzleRay().direction ?? forward;
  return { tank: { x: tank.x, z: tank.z, yaw: Math.atan2(forward.x, forward.z) },
    lookYaw: Math.atan2(look.x, look.z), drone, contacts, waypoint: mission?.waypoint,
    tankJammer: damageHudState.hp > 0 ? vehicle!.definition.jammerRadius : undefined };
}

const smokeInventory = new SmokeInventory(() => useSmoke(), () => collectSmoke());
function updateMenuSupplyVisibility() {
  if (!options.shell || !smokeSupply) return;
  smokeSupply.supplies.forEach(supply => supply.anchor.setEnabled(!attract && !supply.collected));
  scene.meshes.filter(mesh => mesh.name === 'smoke-supply-beacon').forEach((marker, index) =>
    marker.setEnabled(!attract && !smokeSupply!.supplies[index]?.collected));
}
function smokeEnabled() {
  return !!vehicle && !!smokeSupply && !paused && !freeCamera.active && !fpv?.active && !followCamera.isOverview && damageHudState.hp > 0;
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
  if (paused || !pointerLock.active || event.repeat || (event.target as HTMLElement)?.closest?.('input, textarea, select, button, [contenteditable="true"]')) return;
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
  ammoState.textContent = mgMode ? `${t('machineGun')} · ${machineGun?.shotsFired ?? 0} ${t('shots')}` : weapon.ready
    ? `${t('weaponReady')} · APFSDS`
    : `${t('reload')} · ${weapon.reloadRemaining.toFixed(1)} s`;
  rangeReadout.textContent = `${aim.rangeMeters.toFixed(0)} m`;
  hitResult.textContent = lastCombatResult;
  hitResult.className = '';
  document.querySelector<HTMLProgressElement>('#reload-progress')!.value = mgMode ? 1 : weapon.reloadFraction;
}
function hitShake(direction: Vector3, destroyed: boolean) {
  if (!reducedMotion.matches) followCamera.impulse(direction, destroyed ? DESTROYED_SHAKE : HIT_SHAKE);
}
/** Cannon voice of the player's tank; bots always drive the other model. */
const playerCannonAudio: TankAudioId = secondTank ? '02' : '01';
const enemyCannonAudio: TankAudioId = secondTank ? '01' : '02';
/** Bot cannon shot: muzzle effects (ground dust over terrain) and the firing tank's report, delayed and muffled by distance. */
function remoteCannonShot(origin: Vector3, direction: Vector3, tankId: TankAudioId) {
  const ground = scene.getPhysicsEngine()?.raycast(origin, origin.add(new Vector3(0, -4.5, 0)));
  combatEffects!.muzzleFlash(origin, direction, ground?.hasHit && ground.body?.transformNode.name === 'natural-terrain'
    ? { point: ground.hitPointWorld.clone(), normal: ground.hitNormalWorld.clone() } : undefined);
  if (audio.muted) return;
  const offset = origin.subtract(followCamera.camera.position);
  const right = Vector3.Cross(Vector3.Up(), followCamera.direction).normalize();
  combatAudio?.shot(tankId, offset.length(), Vector3.Dot(offset.normalizeToNew(), right));
}
function teamImpact(event: TeamImpact) {
  if (fpv?.intercept(event.hit)) return;
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
    lastCombatResult = victim ? applied ? `${t('target')} · ${victim.damage.hp} / 100` : t('friendlyNoDamage') : t('hit');
    combatResultTime = 3;
  }
}
function reset() {
  if (teamDuel?.rules && !studioMode) return;
  if (fpv?.active) return;
  minimap.reset();
  studio?.gameReset();
  mission?.recover();
  laneDrones?.reset();
  smokeSupply?.reset();
  if (freeCamera.active) freeCamera.toggle();
  teamDuel?.reset();
  opponent?.reset(); opponentAI?.reset(); opponentProjectiles?.reset(); Object.assign(damageHudState, freshDamage()); damageHud.reset(); damageHud.setState(damageHudState); damageTrailTime = 0;
  touch.clear(); keys.clear(); input.reset(); clock.reset(); vehicle?.reset(undefined, spawnYaw); visual?.reset(); movementEffects?.reset();
  alignDirection = undefined;
  vehicleAudio?.reset(); combatAudio?.reset(); turret?.reset(); weapon?.reset(); projectiles?.reset(); combatEffects?.reset();
  machineGun?.reset(); mgProjectiles?.reset(); selectWeapon(false);
  combatInput.clear(); lastCombatResult = ''; combatResultTime = 0;
  aim.reset(); laserRangefinder.reset(); sightMode = 'DAY'; thermalView.setMode('DAY'); mapControls.follow();
  lastTime = performance.now();
}
const visibility = () => {
  alignDirection = undefined;
  paused = shellPaused || document.hidden; movementEffects?.reset(); keys.clear(); input.reset(); clock.reset(); lastTime = performance.now();
  combatInput.clear();
  if (document.hidden) { combatAudio?.reset(); void audio.suspend(); }
  else if (soundEnabled && !paused) void audio.resume();
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
const shadows = createSunShadows(sun, mobile);

// Audio defaults no longer depend on the removed developer panel.
let soundEnabled = true;
const audio = new AudioSystem({ volume: settings.volume });
let vehicleAudio: VehicleAudio | undefined;
let combatAudio: CombatAudio | undefined;
let audioSnapshot: VehicleAudioSnapshot | undefined;
let audioUnlockStarted = false;
function ensureVehicleAudio() {
  if (vehicleAudio || !vehicle || !audio.graph || !audioSnapshot) return;
  const graph = audio.graph;
  vehicleAudio = new VehicleAudio(graph.context, graph.output, IRON_DUST_AUDIO);
  combatAudio = new CombatAudio(graph.context, graph.output);
  vehicleAudio.setWeather(weather.audio);
  vehicleAudio.reset();
}
async function unlockAudio() {
  if (audioUnlockStarted || !soundEnabled || paused) return;
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
const resize = () => { if (studio?.rendering) return; if (!options.shell) scaleMobile(); engine.resize(); };
window.addEventListener('resize', resize);
let disposed = false;
let ground: ReturnType<typeof createTestGround> | Awaited<ReturnType<typeof createKulVadisi>> | Awaited<ReturnType<typeof createFilmSet>> | undefined;
let tank: Awaited<ReturnType<typeof loadTankModel>> | undefined;

async function start() {
  const havok = await HavokPhysics({ locateFile: () => wasmUrl });
  if (disposed) return;
  scene.enablePhysics(new Vector3(0, -9.81, 0), new HavokPlugin(true, havok));
  scene.getPhysicsEngine()!.setTimeStep(1 / 60);
  // Only FixedStep advances this world, never the render loop.
  scene.physicsEnabled = false;
  ground = kulVadisi ? await createKulVadisi(scene, kulTeam) : filmSet ? await createFilmSet(scene, filmSpot) : createTestGround(scene);
  if (disposed) { ground.dispose(); return; }
  addShadowCasters(shadows, ground.shadowCasters);
  status.textContent = t('tankLoading');
  const playerSpawn = teamDuelMode ? layoutSpawn(kulTeam, 0) : ground.spawn;
  tank = await loadTankModel(scene, secondTank ? secondTankUrl : tankUrl, playerSpawn);
  if (disposed) { tank.dispose(); return; }
  thermalView.register(tank.assets.meshes);
  addShadowCasters(shadows, tank.assets.meshes);
  const rig = extractTankRig(tank);
  vehicle = new TankVehicle(scene, rig, playerSpawn);
  if (spawnYaw) vehicle.reset(playerSpawn, spawnYaw);
  visual = new TankVisual(tank, rig);
  movementEffects = new MovementEffects(scene, vehicle);
  turret = new TurretController(tank, vehicle.definition);
  tankJammer = new TankJammer(scene, tank.anchor, vehicle.definition.jammerRadius, mapHeight);
  weapon = new WeaponSystem(turret, IRON_DUST_01_WEAPON);
  if (!secondTank) {
    machineGun = await MachineGun.load(scene, mgUrl, turret.yawPivot);
    if (disposed) { machineGun.dispose(); return; }
    addShadowCasters(shadows, machineGun.assets.meshes);
  }
  mgProjectiles = new ProjectileSystem(scene, (from, to) => {
    if (teamDuel) return teamDuel.raycast(vehicle!.body, from, to);
    const hit = scene.getPhysicsEngine()!.raycast(from, to, { ignoreBody: vehicle!.body, shouldHitTriggers: true });
    const worldHit = hit.hasHit ? { point: hit.hitPointWorld.clone(), normal: hit.hitNormalWorld.clone(), body: hit.body, distance: hit.hitDistance } : undefined;
    const tankHit = opponent ? pickTankHit(scene, opponent, from, to, worldHit) : worldHit;
    return mission ? mission.raycast(from, to, tankHit) : tankHit;
  }, 40, { gravity: -9.81, maxRange: 600, maxAge: 3, trailSeconds: 0.015, trailLength: 2.2, diameter: 0.035 });
  scene.activeCamera = followCamera.camera;
  if (!kulVadisi && !filmSet) {
    combatRange = new ArmorRange(scene, ground.spawn);
    combatRange.targets.forEach(target => addShadowCasters(shadows, target.shadowCasters));
  }
  combatEffects = new CombatEffects(scene);
  smokeSupply = await SmokeSupply.load(scene, smokeSupplyUrl, smokeCapsuleUrl, filmSet ? (ground as Awaited<ReturnType<typeof createFilmSet>>).supplyAnchor : ground.spawn, mapHeight,
    kulVadisi && kulTeam === 'B' ? Math.PI : 0);
  if (disposed) { smokeSupply.dispose(); smokeSupply = undefined; return; }
  smokeSupply.launcherPose = () => turretLauncherPose(turret!.yawPivot);
  updateMenuSupplyVisibility();
  smokeSupply.supplies.forEach(supply => supply.nodes.rootNodes.forEach(node =>
    addShadowCasters(shadows, node.getChildMeshes())));
  projectiles = new ProjectileSystem(scene, (from, to) => {
    if (teamDuel) return teamDuel.raycast(vehicle!.body, from, to);
    const hit = scene.getPhysicsEngine()!.raycast(from, to, { ignoreBody: vehicle!.body, shouldHitTriggers: true });
    const worldHit = hit.hasHit ? { point: hit.hitPointWorld.clone(), normal: hit.hitNormalWorld.clone(), body: hit.body, distance: hit.hitDistance } : undefined;
    const tankHit = opponent ? pickTankHit(scene, opponent, from, to, worldHit) : worldHit;
    return mission ? mission.raycast(from, to, tankHit) : tankHit;
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
    status.textContent = t('opponentLoading');
    const spawn = ground.spawn.add(new Vector3(24, 0, 0));
    spawn.y = mapHeight(spawn.x, spawn.z);
    opponent = await DuelTank.load(scene, secondTank ? tankUrl : secondTankUrl, spawn);
    if (disposed) { opponent.dispose(); opponent = undefined; return; }
    addShadowCasters(shadows, opponent.tank.assets.meshes);
    opponentAI = new EasyDuelAI();
  }
  if (teamDuelMode) {
    status.textContent = t('teamsLoading');
    teamDuel = new TeamDuel(scene, { tank, vehicle, damage: damageHudState, team: kulTeam }, teamLayout, matchSeed);
    teamDuel.sightRange = weather.sightRange;
    teamDuel.onSpawn = yaw => {
      spawnYaw = yaw; visual?.reset(); movementEffects?.reset(); turret?.reset();
      if (!attract) mapControls.follow();
    };
    teamDuel.onRespawn = () => {
      keys.clear(); touch.clear(); combatInput.clear(); input.reset();
      visual?.reset(); movementEffects?.reset(); turret?.reset(); weapon?.reset();
      projectiles?.reset(); mgProjectiles?.reset(); machineGun?.reset(); selectWeapon(false);
      damageHud.reset(); damageHud.setState(damageHudState); combatEffects?.reset();
    };
    teamDuel.blocksSight = (from, to) => smokeSupply!.model.blocksSight(from, to);
    teamDuel.onImpact = teamImpact;
    teamDuel.onShot = (origin, direction) => remoteCannonShot(origin, direction, enemyCannonAudio);
    await teamDuel.load(secondTank ? tankUrl : secondTankUrl);
    teamDuel.setDifficulty(settings.difficulty);
    if (disposed) { teamDuel.dispose(); return; }
    for (const bot of teamDuel.bots) addShadowCasters(shadows, bot.actor.tank.assets.meshes);
    teamDuelHud = new TeamDuelHud(teamDuel, reset, teamDuel.rules ? weatherId : undefined);
  }
  {
    // Three soldiers per garrison; cap the 5v5 preview at nine scenery actors.
    const otherTeam = kulTeam === 'A' ? 'B' : 'A';
    const otherSpawn = teamDuelMode ? layoutSpawn(otherTeam, 0) :
      new Vector3(KUL_SPAWNS[otherTeam].x, 0, KUL_SPAWNS[otherTeam].z);
    const garrisons = [{ position: playerSpawn, yaw: spawnYaw },
      ...(opponent || kulVadisi ? [{ position: opponent?.vehicle.node.position ?? otherSpawn, yaw: spawnYaw + Math.PI }] : []),
      ...(teamDuelMode ? [{ position: layoutSpawn(kulTeam, 1), yaw: spawnYaw }] : [])];
    infantry = await InfantryNpcs.load(scene, { rigged: Object.values(infantryRigUrls)[0], fallback: infantryFallbackUrl },
      garrisons, mapHeight);
    if (disposed) { infantry.dispose(); infantry = undefined; return; }
    infantry.npcs.forEach(npc => {
      const parts = npc.anchor.getChildMeshes().filter(mesh => mesh.isVisible && mesh.getTotalVertices() > 0);
      parts.forEach(mesh => mesh.computeWorldMatrix(true));
      // The torso is below the prop cutoff; keep two largest parts per soldier.
      parts.sort((a, b) => b.getBoundingInfo().boundingSphere.radiusWorld - a.getBoundingInfo().boundingSphere.radiusWorld);
      addShadowCasters(shadows, parts.slice(0, 2), 0);
    });
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
  if (options.shell && !dev) {
    mission = new RookieMission({ scene, player: { tank, vehicle, damage: damageHudState }, range: combatRange!,
      blocksSight: (from, to) => smokeSupply!.model.blocksSight(from, to),
      lastFlightActive: () => !!fpv?.active,
      interceptProjectile: hit => fpv?.intercept(hit) ?? false,
      onFinish: score => {
        setSessionPaused(true);
        selectWeapon(false);
        followCamera.follow();
        resultView = true; resultAngle = .7;
        followCamera.resultOrbit(vehicle!, tank!.anchor.position, resultAngle);
        scene.activeCamera = followCamera.camera;
        options.onMissionResult?.(score);
      },
      onConfirm: () => {
        if (audio.muted || !audio.graph) return;
        const { context, output } = audio.graph;
        const oscillator = context.createOscillator(), gain = context.createGain();
        oscillator.frequency.setValueAtTime(620, context.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(940, context.currentTime + .12);
        gain.gain.setValueAtTime(.055, context.currentTime);
        gain.gain.exponentialRampToValueAtTime(.001, context.currentTime + .2);
        oscillator.connect(gain); gain.connect(output); oscillator.start(); oscillator.stop(context.currentTime + .22);
        oscillator.onended = () => { oscillator.disconnect(); gain.disconnect(); };
      },
      onShot: (origin, direction) => remoteCannonShot(origin, direction, '02'),
      onEnemyHit: (hit, destroyed, penetrated) => {
        combatEffects!.armorImpact(hit.point, hit.normal, penetrated);
        if (destroyed) combatEffects!.destruction(hit.point);
        damageHud.outgoing(null, false, destroyed, penetrated);
        if (!audio.muted) combatAudio?.armorHit(penetrated, Vector3.Distance(hit.point, followCamera.camera.position), 0, destroyed);
      },
      onPlayerHit: (hit, velocity, destroyed) => {
        damageHud.setState(damageHudState);
        damageHud.incoming(Math.atan2(hit.point.x - vehicle!.node.position.x, hit.point.z - vehicle!.node.position.z), null, false, destroyed);
        hitShake(velocity, destroyed); combatEffects!.armorImpact(hit.point, hit.normal, true);
        if (destroyed) combatEffects!.destruction(hit.point);
        if (!audio.muted) combatAudio?.armorHit(true, Vector3.Distance(hit.point, followCamera.camera.position), 0, destroyed);
      },
    });
    await mission.load(secondTankUrl);
    if (disposed) { mission.dispose(); return; }
    mission.scouts.forEach(scout => addShadowCasters(shadows, scout.actor.tank.assets.meshes));
    if (missionRequested) mission.start();
  }
  fpv = new FpvDrone({ scene, canvas, initialMode: settings.droneMode,
    jammers: kulVadisi ? KUL_JAMMERS.map(p => ({ ...p, y: mapHeight(p.x, p.z) + p.y })) : [],
    ready: () => !!vehicle && !paused && !attract && !resultView && !freeCamera.active && !teamDuel?.finished && !studio,
    controlsEnabled: () => !paused && pointerLock.active,
    tankAlive: () => damageHudState.hp > 0,
    tankPosition: () => vehicle!.node.position,
    tankYaw: () => { const f = vehicle!.node.getDirection(Vector3.Forward()); return Math.atan2(f.x, f.z); },
    ground: mapHeight,
    raycast: (from, to, ownBody) => {
      const result = scene.getPhysicsEngine()!.raycast(from, to, { ignoreBody: ownBody, shouldHitTriggers: true });
      let hit: ProjectileHit | undefined = result.hasHit ? { point: result.hitPointWorld.clone(), normal: result.hitNormalWorld.clone(), body: result.body, distance: result.hitDistance } : undefined;
      const actors = teamDuel ? teamDuel.members : opponent ? [opponent] : [];
      for (const actor of actors) {
        const segment = to.subtract(from), length = segment.lengthSquared();
        const fraction = length ? Math.max(0, Math.min(1, Vector3.Dot(actor.vehicle.node.position.subtract(from), segment) / length)) : 0;
        if (Vector3.DistanceSquared(actor.vehicle.node.position, from.add(segment.scale(fraction))) <= 100) hit = pickTankHit(scene, actor, from, to, hit);
      }
      return mission ? mission.raycast(from, to, hit) : hit;
    },
    onLaunch: () => { mgMode = false; combatInput.clear(); keys.clear(); touch.clear(); input.reset(); alignDirection = undefined; mission?.shot(); pointerLock.enter(); },
    onImpact: (hit, detonate) => {
      combatEffects!.destruction(hit.point);
      if (!audio.muted) combatAudio?.armorHit(true, 0, 0, true);
      if (!detonate) return;
      const casualties = infantry?.detonate(hit.point) ?? [];
      soldierProfiles.queue.enqueue(casualties.map(npc => npc.profile));
      // First prototype uses the existing 25 HP hit; no real-world warhead simulation.
      if (mission?.impact(hit, hit.normal.scale(-1), true)) return;
      mission?.hitTarget(hit);
      if (laneDrones?.hit(hit, kulTeam, 25)) return;
      if (teamDuel) { teamDuel.playerImpact(hit); return; }
      if (opponent && hit.body === opponent.vehicle.body) {
        const module = tankDamageRegion(opponent, hit.point);
        const applied = applyDamage(opponent.damage, module, tankHitFacing(opponent, hit.point));
        damageHud.outgoing(module, !!module && opponent.damage.modules[module] === 0, opponent.damage.hp === 0, applied);
      }
    },
    onEnd: () => {
      combatInput.clear(); keys.clear(); touch.clear(); input.reset();
      if (!resultView) { mapControls.follow(); scene.activeCamera = followCamera.camera; }
      lastCombatResult = damageHudState.hp > 0 ? 'FPV bağlantısı kesildi' : 'Son uçuş tamamlandı — tank imha edildi'; combatResultTime = 5;
    },
    audio: () => audio.muted ? null : audio.graph,
  });
  status.hidden = true;
  lastTime = performance.now();
  let hudElapsed = 0;
  const startLoop = () => {
    lastTime = performance.now();
    engine.runRenderLoop(() => {
      const now = performance.now();
      const dt = Math.max(0, (now - lastTime) / 1000); lastTime = now;
      frame(dt);
    });
  };
  if (studioMode) studio = new Studio({ engine, scene, ground: mapHeight, sceneKey: studioSceneKey(),
    target: { hull: tank.anchor, pitchPivot: turret.pitchPivot, muzzle: turret.muzzle },
    maxZ: followCamera.camera.maxZ, audio,
    gameCamera: () => mgMode ? machineGun!.camera : followCamera.camera, freeCameraActive: () => freeCamera.active,
    reset, frame: dt => frame(dt), startLoop, stopLoop: () => engine.stopRenderLoop() });
  freezeSceneMaterials(scene);
  applySettings(settings);
  // A single registry includes every actor source, without coupling thermal rendering to AI.
  if (opponent) thermalView.register(opponent.tank.assets.meshes);
  for (const bot of teamDuel?.bots ?? []) thermalView.register(bot.actor.tank.assets.meshes);
  for (const scout of mission?.scouts ?? []) thermalView.register(scout.actor.tank.assets.meshes);
  for (const npc of infantry?.npcs ?? []) thermalView.register(npc.anchor.getChildMeshes());
  options.onReady?.();
  startLoop();
  function frame(dt: number) {
    if (!vehicle || !visual || !tank) return;
    minimap.update(performance.now() / 1000, minimapState);
    updateGunnerSight();
    if (rain && scene.activeCamera) rain.update(Math.min(dt, .1), scene.activeCamera);
    if (paused && !studio?.rendering) {
      if (resultView) {
        if (!reducedMotion.matches) resultAngle += Math.min(dt, .1) * .035;
        followCamera.resultOrbit(vehicle, tank.anchor.position, resultAngle);
        sky.update(Math.min(dt, .1));
        scene.render();
        return;
      }
      if (attract) {
        if (!reducedMotion.matches) attractAngle += Math.min(dt, .1) * .045;
        const target = tank.anchor.position.add(new Vector3(0, 2, 0));
        followCamera.camera.position.copyFrom(target.add(new Vector3(Math.sin(attractAngle + .7) * 20, 8, -Math.cos(attractAngle + .7) * 20)));
        const direction = target.subtract(followCamera.camera.position).normalize();
        const right = Vector3.Cross(Vector3.Up(), direction).normalize();
        followCamera.camera.setTarget(target.subtract(right.scale(5)));
        scene.imageProcessingConfiguration.exposure = 1.28;
        scene.imageProcessingConfiguration.contrast = 1.08;
        ambient.intensity = Math.max(1.15, atmosphere.hemisphere.intensity);
        ambient.diffuse = Color3.FromHexString('#d5d6c2');
        ambient.groundColor = Color3.FromHexString('#a7997a');
        sun.intensity = Math.max(1.35, atmosphere.sun.intensity);
        sky.update(Math.min(dt, .1));
        scene.render();
      }
      return;
    }
    sky.update(dt);
    const stormFlash = sky.flash;
    scene.imageProcessingConfiguration.exposure = (atmosphere.exposure ?? 1) + stormFlash * 0.32;
    ambient.intensity = atmosphere.hemisphere.intensity + stormFlash * 0.4;
    sun.intensity = atmosphere.sun.intensity + stormFlash * 0.25;
    followCamera.aiming = !fpv?.active && !mgMode && (combatInput.aiming || touch.aiming);
    const alpha = clock.advance(dt, step => {
      if (shellPaused) return;
      if (combatInput.consumeRange() && sightEnabled()) {
        const ray = turret!.getMuzzleRay();
        laserRangefinder.measure(scene, vehicle!.body, ray.origin, ray.direction, performance.now() / 1000);
      }
      mission?.beforeStep(step);
      smokeSupply!.fixedUpdate(step);
      let command = fpv?.active || freeCamera.active || teamDuel?.finished || driveDisabled(damageHudState) ? { throttle: 0, steer: 0, brake: 1 }
        : input.resolve(observation?.keys() ?? Object.fromEntries(Object.entries(keys.keys).map(([key, value]) => [key, value || touch.keys[key as keyof typeof touch.keys]])) as typeof keys.keys, vehicle!.speed, step, vehicle!.definition.reverseDelay);
      let turn = touch.turn;
      let elevation = touch.elevation * step * 15 * Math.PI / 180;
      const desktopTracking = !mobile && pointerLock.active && !freeCamera.active && !fpv?.active && !mgMode && !followCamera.isOverview;
      const viewTarget = desktopTracking ? followCamera.aimTarget(vehicle!) : undefined;
      // Preserve the ray hit distance in Studio’s existing relative aim vector.
      alignDirection = viewTarget ? viewTarget.subtract(turret!.yawPivot.getAbsolutePosition()).scale(1 / 10000) : undefined;
      let fire = combatInput.consumeFire() || touch.consumeFire();
      // Studio takes record these per step; renders replay them in place of live input.
      if (studio) ({ command, turn, elevation, align: alignDirection, fire } = studio.step({ command, turn, elevation, align: alignDirection, fire }));
      if (tickDamage(damageHudState, step)) damageHud.setState(damageHudState);
      turret!.traverseScale = turretTraverse(damageHudState);
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
      laneDrones?.fixedUpdate(step, teamDuel?.finished, damageHudState.hp > 0
        ? [{ team: kulTeam, position: vehicle!.node.position, radius: vehicle!.definition.jammerRadius }] : []);
      fpv?.fixedUpdate(step);
      scene.getPhysicsEngine()!._step(step);
      vehicle!.afterStep();
      mission?.afterStep(step);
      opponent?.afterStep(step, aiState?.target ?? null);
      observation?.step();
      visual!.fixedUpdate(vehicle!, step);
      // Joint calculations use the current physics pose; render interpolation follows below.
      visual!.syncHull(vehicle!, 1);
      teamDuel?.afterStep(step);
      if (fpv?.active || freeCamera.active || (!mobile && !pointerLock.active && !studio?.rendering)) turret!.fixedUpdate(null, step);
      else if (alignDirection) {
        turret!.yawPivot.computeWorldMatrix(true);
        turret!.fixedUpdate(turret!.yawPivot.getAbsolutePosition().add(alignDirection.scale(10000)), step);
      } else turret!.fixedUpdateManual(followCamera.isOverview || mgMode ? 0 : turn, mgMode ? 0 : elevation, step);
      if (mgMode) machineGun!.look(touch.turn * step * 220, -touch.elevation * step * 160);
      const wasReady = weapon!.ready;
      weapon!.fixedUpdate(step);
      if (!wasReady && weapon!.ready && !audio.muted) combatAudio?.reload();
      if (!fpv?.active && fire && !mgMode && damageHudState.hp > 0 && !teamDuel?.finished) {
        const shot = weapon!.fire();
        if (shot) {
          mission?.shot();
          projectiles!.spawn(shot.origin, shot.direction, IRON_DUST_01_WEAPON.ammo.muzzleVelocity);
          const ground = scene.getPhysicsEngine()!.raycast(shot.origin,
            shot.origin.add(new Vector3(0, -4.5, 0)), { ignoreBody: vehicle!.body });
          combatEffects!.muzzleFlash(shot.origin, shot.direction,
            ground.hasHit && ground.body?.transformNode.name === 'natural-terrain'
              ? { point: ground.hitPointWorld.clone(), normal: ground.hitNormalWorld.clone() } : undefined);
          followCamera.impulse(shot.direction);
          vehicle!.body.applyImpulse(shot.direction.scale(-SHOT_FEEDBACK.hullImpulse), turret!.pitchPivot.getAbsolutePosition());
          if (!audio.muted) combatAudio?.shot(playerCannonAudio);
          lastCombatResult = t('shotFlying'); combatResultTime = 3;
        } else {
          lastCombatResult = t('reloadOngoing'); combatResultTime = 1;
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
            remoteCannonShot(shot.origin, shot.direction, enemyCannonAudio);
          }
        }
      }
      machineGun?.fixedUpdate(step, !fpv?.active && damageHudState.hp > 0 && !teamDuel?.finished && mgMode && !followCamera.isOverview && (combatInput.fireHeld || touch.fireHeld), (origin, direction) => {
        mission?.shot();
        mgProjectiles!.spawn(origin, direction, MG.speed);
        combatEffects!.machineGunFlash(origin, direction);
        if (!audio.muted) combatAudio?.machineGunShot();
        lastCombatResult = t('mgFire'); combatResultTime = 0.4;
      });
      mgProjectiles!.fixedUpdate(step, hit => {
        if (mission?.impact(hit, Vector3.Zero(), false)) return;
        mission?.hitTarget(hit);
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
        lastCombatResult = t('mgHit'); combatResultTime = 0.4;
      });
      projectiles!.fixedUpdate(step, (hit, shell) => {
        if (mission?.impact(hit, shell.velocity, true)) return;
        mission?.hitTarget(hit);
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
          combatEffects!.armorImpact(hit.point, hit.normal, !!penetrated, shell.velocity);
          const module = tankHit ? tankDamageRegion(opponent!, hit.point) : null;
          const applied = tankHit && !glanced && applyDamage(opponent!.damage, module, tankHitFacing(opponent!, hit.point));
          const destroyed = !!applied && opponent!.damage.hp === 0;
          const disabled = !!module && opponent!.damage.modules[module] === 0;
          if (destroyed) combatEffects!.destruction(hit.point);
          damageHud.outgoing(module, disabled, destroyed, !!penetrated);
          if (!audio.muted) combatAudio?.armorHit(!!penetrated, offset.length(), pan, destroyed);
          lastCombatResult = glanced ? t('ricochet') : tankHit ? `${t('target')} · ${opponent!.damage.hp} / 100` : armor!.result.kind === 'ricochet' ? t('ricochet') : penetrated ? t('penetrated') : t('notPenetrated');
        } else {
          combatEffects!.impact(hit.point, hit.normal, surface);
          if (!audio.muted) combatAudio?.impact(surface, offset.length(), pan);
          lastCombatResult = `${t('hit')} · ${{ soil: t('soil'), concrete: t('concrete'), metal: t('metal') }[surface]}`;
        }
        combatResultTime = 4;
      });
      opponentProjectiles?.fixedUpdate(step, (hit, shell) => {
        if (fpv?.intercept(hit)) return;
        if (laneDrones?.hit(hit, kulTeam === 'A' ? 'B' : 'A', 25)) return;
        if (hit.body !== vehicle!.body) {
          combatEffects!.impact(hit.point, hit.normal, impactSurface(hit.body)); return;
        }
        if (ricochets(shell.velocity, hit.normal)) {
          combatEffects!.armorImpact(hit.point, hit.normal, false, shell.velocity);
          if (!audio.muted) combatAudio?.armorHit(false, Vector3.Distance(hit.point, followCamera.camera.position), 0, false);
          lastCombatResult = t('shellRicochet'); combatResultTime = 4;
          return;
        }
        const module = tank && vehicle ? tankDamageRegion({ tank, vehicle }, hit.point) : null;
        const applied = applyDamage(damageHudState, module, tank && vehicle ? tankHitFacing({ tank, vehicle }, hit.point) : 'side');
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
        lastCombatResult = destroyed ? t('destroyedRetry') : `${t('incomingHit')} · ${damageHudState.hp} / 100`;
        combatResultTime = 4;
      });
      teamDuel?.finishStep();
      if (teamDuel?.rules && teamDuel.finished && !resultView) {
        resultView = true; resultAngle = .7;
        const rules = teamDuel.rules;
        selectWeapon(false); followCamera.follow(); scene.activeCamera = followCamera.camera;
        setSessionPaused(true);
        options.onTeamResult?.({ outcome: teamDuel.result!, score: { ...rules.score },
          kills: rules.members[0].kills, deaths: rules.members[0].deaths, seconds: rules.elapsed });
      }
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
    tankJammer?.render(tank!.anchor.position, damageHudState.hp > 0 && !studio);
    movementEffects!.render(alpha);
    turret!.render(alpha);
    weapon!.render(alpha);
    projectiles!.render(alpha);
    opponentProjectiles?.render(alpha);
    mgProjectiles!.render(alpha);
    combatEffects!.render(alpha);
    if (resultView) followCamera.resultOrbit(vehicle, tank.anchor.position, resultAngle);
    else followCamera.update(vehicle, tank.anchor.position, Math.min(dt, 0.1), turret);
    updateGunnerSight();
    if (mgMode) machineGun!.updateCamera();
    freeCamera.update(dt);
    fpv?.render(dt, alpha);
    studio?.update(dt);
    smokeSupply!.render();
    mission?.render(Math.min(dt, .1), alpha);
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
    if (options.shell && settings.quality !== 'high') {
      // Cosmetic sprite budgets only; gameplay smoke stays visible at every quality.
      for (const manager of scene.spriteManagers ?? []) {
        if (!manager.name.startsWith('track-') && !manager.name.startsWith('combat-')) continue;
        manager.sprites.forEach((sprite, i) => {
          if (i % (settings.quality === 'low' ? 3 : 2) !== 0) sprite.isVisible = false;
        });
      }
    }
    scene.render();
    if (!freeCamera.active && !fpv?.active) aim.render(vehicle, mgMode ? machineGun! : turret!);
    else { aim.marker.hidden = true; aim.label.hidden = true; }
    observation?.frame(dt, vehicle);
  }
}
/** Takes replay only into the same map, tank and mode they were recorded in. */
function studioSceneKey() {
  const params = new URLSearchParams(location.search);
  params.delete('studio'); params.sort();
  return params.toString();
}
start().catch((error: unknown) => {
  if (disposed) return;
  console.error(error);
  status.hidden = false; status.textContent = t('loadError'); options.onError?.();
});
function dispose() {
  if (disposed) return;
  disposed = true;
  window.removeEventListener('pagehide', dispose);
  engine.stopRenderLoop();
  gunnerSight.dispose(); thermalView.dispose();
  fpv?.dispose();
  infantry?.dispose();
  soldierProfiles.dispose();
  studio?.dispose();
  window.removeEventListener('resize', resize);
  window.removeEventListener('keydown', weaponKey);
  window.removeEventListener('keydown', smokeKey);
  smokeInventory.dispose(); smokeSupply?.dispose();
  minimap.dispose();
  tacticalHud.dispose();
  touch.dispose();
  freeCamera.dispose();
  pointerLock.dispose();
  combatInput.dispose();
  window.removeEventListener('pointerdown', unlockOnGesture);
  window.removeEventListener('keydown', unlockOnGesture);
  laneDrones?.dispose();
  mission?.dispose();
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
  aim.dispose(); turret?.dispose(); tankJammer?.dispose(); visual?.dispose(); vehicle?.dispose(); followCamera.dispose();
  mgProjectiles?.dispose(); machineGun?.dispose();
  removeTeamDuelLink(); teamDuelHud?.dispose(); teamDuel?.dispose();
  opponent?.dispose();
  tank?.dispose();
  mapControls.dispose();
  ground?.dispose();
  sky.dispose(); rain?.dispose();
  scene.dispose();
  engine.dispose();
}

window.addEventListener('pagehide', dispose, { once: true });

function applySettings(value: Settings) {
  settings = value;
  teamDuel?.setDifficulty(value.difficulty);
  audio.setVolume(value.volume);
  const level = value.quality;
  if (mobile) scaleMobile();
  else engine.setHardwareScalingLevel(level === 'low' ? 1.6 : level === 'medium' ? 1.2 : 1);
  const shadowsChanged = scene.shadowsEnabled !== (level !== 'low');
  scene.shadowsEnabled = level !== 'low';
  if (shadowsChanged) for (const material of scene.materials) if (material.isFrozen) material.markDirty(true);
  applySunShadowQuality(shadows, level, mobile);
  scene.particlesEnabled = level !== 'low';
  rain?.setQuality(level);
  if (movementEffects) movementEffects.enabled = level !== 'low';
  damageHud.setState(damageHudState);
  // Both CPU and GPU particle systems expose emitRate; retain authored rates.
  for (const particle of scene.particleSystems) {
    const source = particle as typeof particle & { shellEmitRate?: number; emitRate: number };
    source.shellEmitRate ??= source.emitRate;
    source.emitRate = source.shellEmitRate * (level === 'low' ? 0 : level === 'medium' ? .5 : 1);
  }
  engine.resize();
  if (paused && vehicle) scene.render();
}
function setSessionPaused(value: boolean) {
  shellPaused = value; paused = value || document.hidden;
  fpv?.clear(); keys.clear(); touch.clear(); combatInput.clear(); input.reset(); clock.reset();
  lastTime = performance.now();
  if (paused) { combatAudio?.reset(); void audio.suspend(); }
  else { void unlockAudio(); if (soundEnabled) void audio.resume(); }
}
return {
  dispose, applySettings,
  startMission() { missionRequested = true; if (mission?.director.state === 'briefing') mission.start(); },
  ...(import.meta.env.DEV ? { missionTest: {
    loadout: () => ({ tank: secondTank ? '02' : '01', droneMode: fpv?.flight.mode, attract, position: vehicle?.node.position.asArray() }),
    team: () => teamDuel?.rules ? { score: teamDuel.rules.score, elapsed: teamDuel.rules.elapsed, result: teamDuel.result,
      members: teamDuel.members.map((m, i) => ({ hp: m.damage.hp, ...teamDuel!.rules!.members[i], position: m.vehicle.node.position.asArray().map(v => Math.round(v * 10) / 10) })),
      seed: matchSeed, weather: weatherId, sightRange: teamDuel.sightRange, fogDensity: scene.fogDensity } : undefined,
    inspectAI: (index = 0) => {
      const center = teamDuel?.bots[index]?.actor.vehicle.node.position;
      if (!center) return;
      followCamera.overview(); followCamera.camera.position.copyFrom(center.add(new Vector3(42, 65, -48))); followCamera.camera.setTarget(center);
    },
    ai: () => teamDuel?.bots.map(b => ({ team: b.member.team, slot: b.slot, state: b.ai.state, visible: b.visible, position: b.actor.vehicle.node.position.asArray(), hp: b.member.damage.hp, shots: b.actor.weapon.shotsFired, drive: b.state?.drive, path: b.context.navigation?.path.length })),
    teamHit: (victim = 0, shooter = 3) => {
      if (!teamDuel) return;
      const member = teamDuel.members[victim];
      const hit = { body: member.vehicle.body, point: member.vehicle.node.position.clone(), normal: Vector3.Up(), distance: 0 };
      // Shared impact path, including damage, spawn protection, score and kill feed.
      for (let i = 0; i < 12; i++) teamDuel['impact'](teamDuel.members[shooter], hit);
    },
    teamExpire: () => { if (teamDuel?.rules) teamDuel.rules.elapsed = 360 - 1 / 60; },
    fps: () => ({ fps: engine.getFps(), renderer: engine.getGlInfo(), width: canvas.width, height: canvas.height, quality: settings.quality }),
    fpv: () => ({ active: fpv?.active, mode: fpv?.flight.mode, position: fpv?.flight.position.asArray(), tankHp: damageHudState.hp, elapsed: fpv?.flight.elapsed }),
    launchFpv: () => fpv?.launch(),
    detonateFpvAtInfantry: (index = 0) => {
      const npc = infantry?.npcs[index];
      if (!fpv?.active || !npc) return false;
      // Exercise the terrain collision and shared FPV impact callback in browser checks.
      fpv.flight.position.copyFrom(npc.position);
      fpv.flight.previous.copyFrom(npc.position);
      fpv.flight.velocity.setAll(0);
      fpv.fixedUpdate(1 / 60);
      return !fpv.active;
    },
    shootFpv: () => {
      if (!fpv?.active) return false;
      const hit = scene.getPhysicsEngine()!.raycast(fpv.flight.position.add(new Vector3(0, 0, -5)), fpv.flight.position.add(new Vector3(0, 0, 5)), { shouldHitTriggers: true });
      return hit.hasHit && fpv.intercept({ point: hit.hitPointWorld.clone(), normal: hit.hitNormalWorld.clone(), body: hit.body, distance: hit.hitDistance });
    },
    destroyTankForFpv: () => { damageHudState.hp = 0; damageHud.setState(damageHudState); },
    camera: () => ({ resultView, aiming: followCamera.aiming, active: scene.activeCamera?.name,
      fov: scene.activeCamera?.fov, position: scene.activeCamera?.position.asArray(),
      distance: vehicle && scene.activeCamera ? Vector3.Distance(scene.activeCamera.position, vehicle.node.position) : 0 }),
    snapshot: () => mission ? { state: mission.director.state, step: mission.director.step?.id, progress: mission.director.progress, score: mission.director.score(), enemies: mission.scouts.map(s => ({ hp: s.actor.damage.hp, position: s.actor.vehicle.node.position.asArray() })) } : undefined,
    advance: () => mission?.testAdvance(), defeat: () => mission?.testDefeat(),
    inspectBattle: () => {
      const point = mission?.waypoint;
      if (point && vehicle) {
        const center = Vector3.Center(point, vehicle.node.position);
        followCamera.overview(); followCamera.camera.position.copyFrom(center.add(new Vector3(22, 32, -26))); followCamera.camera.setTarget(center);
      }
    },
    lookAtObjective: () => {
      const point = mission?.waypoint;
      if (point && vehicle) { const delta = point.subtract(vehicle.node.position); followCamera.follow(Math.atan2(delta.x, delta.z)); followCamera.look(0, 120); }
    },
  } } : {}),
  get disposed() { return disposed; },
  get missionState() { return mission?.director.state; },
  setPaused: setSessionPaused,
  setAttract(value: boolean) {
    resultView = false;
    if (attract && !value) {
      followCamera.follow(spawnYaw);
      scene.imageProcessingConfiguration.contrast = 1.15;
      ambient.diffuse = atmosphere.hemisphere.sky;
      ambient.groundColor = atmosphere.hemisphere.ground;
    }
    attract = value;
    updateMenuSupplyVisibility();
  },
  enter() { pointerLock.enter(); },
  reset,
};
}
