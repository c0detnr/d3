import './mapPreview.css';
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
import { createChaoticSky } from './game/world/SkyAtmosphere.ts';
import tankUrl from '../assets/tanks/iron_dust_01/iron_dust_01.glb?url';

const canvas = document.querySelector<HTMLCanvasElement>('#map')!;
const status = document.querySelector<HTMLElement>('#status')!;
const engine = new Engine(canvas, true);
const scene = new Scene(engine);
scene.imageProcessingConfiguration.exposure = 1;
scene.imageProcessingConfiguration.contrast = 1.15;
const sky = createChaoticSky(scene);
const followCamera = new FollowCamera(scene, canvas);
followCamera.camera.maxZ = 1600;
const clock = new FixedStep();
const input = new DriveInput();
let vehicle: TankVehicle | undefined;
let visual: TankVisual | undefined;
let movementEffects: MovementEffects | undefined;
let observation: DrivingObservation | undefined;
let turret: TurretController | undefined;
let weapon: WeaponSystem | undefined;
let projectiles: ProjectileSystem | undefined;
let combatRange: ArmorRange | undefined;
let combatEffects: CombatEffects | undefined;
let lastCombatResult = '';
let combatResultTime = 0;
const aim = new AimSystem(scene, followCamera, document.querySelector<HTMLElement>('#aim-bore')!,
  document.querySelector<HTMLElement>('#aim-status')!);
const combatInput = new CombatInput(canvas, () => !!weapon?.ready && !followCamera.isOverview && !paused,
  () => !!vehicle && !followCamera.isOverview && !paused,
  (x, y) => followCamera.look(x, y), () => { followCamera.aiming = false; });
let lastTime = performance.now();
let paused = document.hidden;
const keys = bindDriveKeys(window, () => reset());
const telemetry = document.querySelector<HTMLElement>('#telemetry')!;
const ammoState = document.querySelector<HTMLElement>('#ammo-state')!;
const rangeReadout = document.querySelector<HTMLElement>('#range-readout')!;
const hitResult = document.querySelector<HTMLElement>('#hit-result')!;
function updateCombatHud() {
  if (!weapon) return;
  ammoState.textContent = weapon.ready
    ? `SİLAH HAZIR · ${IRON_DUST_01_WEAPON.ammo.label}`
    : `DOLUM · ${weapon.reloadRemaining.toFixed(1)} s`;
  rangeReadout.textContent = `${aim.rangeMeters.toFixed(0)} m`;
  hitResult.textContent = lastCombatResult;
  hitResult.className = '';
  document.querySelector<HTMLProgressElement>('#reload-progress')!.value = weapon.reloadFraction;
}
function reset() {
  keys.clear(); input.reset(); clock.reset(); vehicle?.reset(); visual?.reset(); movementEffects?.reset();
  vehicleAudio?.reset(); combatAudio?.reset(); turret?.reset(); weapon?.reset(); projectiles?.reset(); combatEffects?.reset();
  combatInput.clear(); lastCombatResult = ''; combatResultTime = 0;
  aim.reset(); followCamera.follow();
  lastTime = performance.now();
}
const visibility = () => {
  paused = document.hidden; movementEffects?.reset(); keys.clear(); input.reset(); clock.reset(); lastTime = performance.now();
  combatInput.clear();
  if (document.hidden) { combatAudio?.reset(); void audio.suspend(); }
  else if (soundToggle.checked) void audio.resume();
};
const blur = () => { keys.clear(); input.reset(); combatInput.clear(); combatAudio?.reset(); };
document.addEventListener('visibilitychange', visibility);
window.addEventListener('blur', blur);
const ambient = new HemisphericLight('sky', new Vector3(0, 1, 0), scene);
ambient.intensity = 0.6;
ambient.diffuse = new Color3(0.7, 0.74, 0.74);
ambient.groundColor = new Color3(0.27, 0.24, 0.19);
const sun = new DirectionalLight('sun', new Vector3(-0.58, -0.62, 0.53), scene);
sun.intensity = 1.05;
sun.diffuse = new Color3(1, 0.79, 0.56);
sun.position.set(70, 82, -80);
sun.autoCalcShadowZBounds = true;
const shadows = new ShadowGenerator(2048, sun);
shadows.usePercentageCloserFiltering = true;
shadows.bias = 0.001;
shadows.normalBias = 0.04;
shadows.setDarkness(0.25);

const overview = () => { combatInput.clear(); followCamera.overview(); };
const spawn = () => reset();
document.querySelector('#overview')!.addEventListener('click', overview);
document.querySelector('#spawn')!.addEventListener('click', spawn);
const dustToggle = document.querySelector<HTMLInputElement>('#dust-enabled')!;
const soundToggle = document.querySelector<HTMLInputElement>('#sound-enabled')!;
const soundVolume = document.querySelector<HTMLInputElement>('#sound-volume')!;
const audioStatus = document.querySelector<HTMLElement>('#audio-status')!;
const audio = new AudioSystem({
  volume: Number(soundVolume.value) / 100,
  muted: !soundToggle.checked,
});
let vehicleAudio: VehicleAudio | undefined;
let combatAudio: CombatAudio | undefined;
let audioSnapshot: VehicleAudioSnapshot | undefined;
let audioUnlockStarted = false;
const toggleDust = () => { if (movementEffects) { movementEffects.enabled = dustToggle.checked; movementEffects.reset(); } };
dustToggle.addEventListener('change', toggleDust);
function ensureVehicleAudio() {
  if (vehicleAudio || !vehicle || !audio.graph || !audioSnapshot) return;
  const graph = audio.graph;
  vehicleAudio = new VehicleAudio(graph.context, graph.output, IRON_DUST_AUDIO);
  combatAudio = new CombatAudio(graph.context, graph.output);
  vehicleAudio.reset();
}
async function unlockAudio() {
  if (audioUnlockStarted || !soundToggle.checked) return;
  audioUnlockStarted = true;
  const unlocked = await audio.unlock();
  if (!unlocked) {
    audioUnlockStarted = false;
    audioStatus.textContent = 'Ses başlatılamadı';
    return;
  }
  audio.setMuted(!soundToggle.checked);
  ensureVehicleAudio();
  audioStatus.textContent = audio.muted ? 'Ses: kapalı' : 'Ses: motor, palet, rüzgâr, atış';
}
const unlockOnGesture = () => { void unlockAudio(); };
const toggleSound = async () => {
  if (soundToggle.checked) {
    if (!audio.ready) audioUnlockStarted = false;
    await unlockAudio();
    if (audio.ready) {
      audio.setMuted(false);
      audioStatus.textContent = 'Ses: motor, palet, rüzgâr, atış';
    }
  } else {
    combatAudio?.reset(); audio.setMuted(true);
    audioStatus.textContent = 'Ses: kapalı';
  }
};
const changeVolume = () => audio.setVolume(Number(soundVolume.value) / 100);
window.addEventListener('pointerdown', unlockOnGesture);
window.addEventListener('keydown', unlockOnGesture);
soundToggle.addEventListener('change', toggleSound);
soundVolume.addEventListener('input', changeVolume);
const resize = () => engine.resize();
window.addEventListener('resize', resize);
let disposed = false;
let ground: ReturnType<typeof createTestGround> | undefined;
let tank: Awaited<ReturnType<typeof loadTankModel>> | undefined;

async function start() {
  const havok = await HavokPhysics({ locateFile: () => wasmUrl });
  if (disposed) return;
  scene.enablePhysics(new Vector3(0, -9.81, 0), new HavokPlugin(true, havok));
  scene.getPhysicsEngine()!.setTimeStep(1 / 60);
  // Only FixedStep advances this world, never the render loop.
  scene.physicsEnabled = false;
  ground = createTestGround(scene);
  ground.shadowCasters.forEach(mesh => shadows.addShadowCaster(mesh));
  status.textContent = 'Harita hazır, tank modeli yükleniyor…';
  tank = await loadTankModel(scene, tankUrl, ground.spawn);
  if (disposed) { tank.dispose(); return; }
  tank.assets.meshes.filter(mesh => mesh.isVisible).forEach(mesh => shadows.addShadowCaster(mesh));
  const rig = extractTankRig(tank);
  vehicle = new TankVehicle(scene, rig, ground.spawn);
  visual = new TankVisual(tank, rig);
  movementEffects = new MovementEffects(scene, vehicle);
  movementEffects.enabled = dustToggle.checked;
  turret = new TurretController(tank, vehicle.definition);
  weapon = new WeaponSystem(turret, IRON_DUST_01_WEAPON);
  combatRange = new ArmorRange(scene, ground.spawn);
  combatRange.targets.forEach(target => target.shadowCasters.forEach(mesh => shadows.addShadowCaster(mesh)));
  combatEffects = new CombatEffects(scene);
  projectiles = new ProjectileSystem(scene, (from, to) => {
    const hit = scene.getPhysicsEngine()!.raycast(from, to, { ignoreBody: vehicle!.body });
    return hit.hasHit
      ? { point: hit.hitPointWorld.clone(), normal: hit.hitNormalWorld.clone(), body: hit.body, distance: hit.hitDistance }
      : undefined;
  });
  audioSnapshot = {
    speed: 0, forwardSpeed: vehicle.definition.forwardSpeed, driveForce: 0,
    traction: vehicle.definition.traction, contacts: vehicle.contacts,
    sides: rig.wheels.map(wheel => wheel.side),
  };
  ensureVehicleAudio();
  followCamera.follow();
  if (import.meta.env.DEV && new URLSearchParams(location.search).has('rimView')) {
    followCamera.overview();
    followCamera.camera.position.copyFrom(new Vector3(-25, 6, -235));
    followCamera.camera.setTarget(new Vector3(0, -12, -152));
  }
  if (import.meta.env.DEV && new URLSearchParams(location.search).has('driveTest')) observation = new DrivingObservation(engine, reset);
  status.textContent = '42 ton · Palet kuvvetleriyle sürüş · R ile kurtar';
  lastTime = performance.now();
  let hudElapsed = 0;
  engine.runRenderLoop(() => {
    const now = performance.now();
    const dt = Math.max(0, (now - lastTime) / 1000); lastTime = now;
    if (paused || !vehicle || !visual || !tank) return;
    sky.update(dt);
    const stormFlash = sky.flash;
    scene.imageProcessingConfiguration.exposure = 1 + stormFlash * 0.32;
    ambient.intensity = 0.6 + stormFlash * 0.4;
    sun.intensity = 1.05 + stormFlash * 0.25;
    followCamera.aiming = combatInput.aiming;
    aim.acquire(vehicle);
    const alpha = clock.advance(dt, step => {
      const command = input.resolve(observation?.keys() ?? keys.keys, vehicle!.speed, step, vehicle!.definition.reverseDelay);
      vehicle!.beforeStep(step, command);
      movementEffects!.fixedUpdate(vehicle!, step);
      scene.getPhysicsEngine()!._step(step);
      vehicle!.afterStep();
      observation?.step();
      visual!.fixedUpdate(vehicle!, step);
      // Joint calculations use the current physics pose; render interpolation follows below.
      visual!.syncHull(vehicle!, 1);
      turret!.fixedUpdate(combatInput.aiming ? aim.target : null, step);
      const wasReady = weapon!.ready;
      weapon!.fixedUpdate(step);
      if (!wasReady && weapon!.ready && !audio.muted) combatAudio?.reload();
      if (combatInput.consumeFire()) {
        const shot = weapon!.fire();
        if (shot) {
          projectiles!.spawn(shot.origin, shot.direction, IRON_DUST_01_WEAPON.ammo.muzzleVelocity);
          combatEffects!.muzzleFlash(shot.origin, shot.direction);
          followCamera.impulse();
          vehicle!.body.applyImpulse(shot.direction.scale(-SHOT_FEEDBACK.hullImpulse), turret!.pitchPivot.getAbsolutePosition());
          if (!audio.muted) combatAudio?.shot();
          lastCombatResult = 'ATIŞ · UÇUYOR'; combatResultTime = 3;
        } else {
          lastCombatResult = 'DOLUM SÜRÜYOR'; combatResultTime = 1;
        }
      }
      projectiles!.fixedUpdate(step, (hit) => {
        const surface = impactSurface(hit.body);
        combatEffects!.impact(hit.point, hit.normal, surface);
        const offset = hit.point.subtract(followCamera.camera.position);
        const right = Vector3.Cross(Vector3.Up(), followCamera.direction).normalize();
        if (!audio.muted) combatAudio?.impact(surface, offset.length(), Vector3.Dot(offset.normalizeToNew(), right));
        lastCombatResult = `İSABET · ${{ soil: 'TOPRAK', concrete: 'BETON', metal: 'METAL' }[surface]}`;
        combatResultTime = 4;
      });
      combatEffects!.fixedUpdate(step);
    });
    visual.render(vehicle, alpha);
    movementEffects!.render(alpha);
    turret!.render(alpha);
    projectiles!.render(alpha);
    combatEffects!.render(alpha);
    followCamera.update(vehicle, tank.anchor.position, Math.min(dt, 0.1), turret);
    hudElapsed += dt;
    combatResultTime = Math.max(0, combatResultTime - dt);
    if (combatResultTime === 0 && lastCombatResult) lastCombatResult = '';
    if (hudElapsed >= 0.1) {
      telemetry.textContent = `${(vehicle.speed * 3.6).toFixed(0)} km/sa · ${vehicle.contacts.filter(c => c.grounded).length}/12 temas`;
      updateCombatHud();
      hudElapsed = 0;
    }
    if (vehicleAudio && audioSnapshot) {
      audioSnapshot.speed = vehicle.speed;
      audioSnapshot.driveForce = vehicle.driveForce;
      vehicleAudio.update(audioSnapshot, dt);
    }
    scene.render();
    aim.render(vehicle, turret!);
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
  document.querySelector('#overview')?.removeEventListener('click', overview);
  document.querySelector('#spawn')?.removeEventListener('click', spawn);
  dustToggle.removeEventListener('change', toggleDust);
  combatInput.dispose();
  soundToggle.removeEventListener('change', toggleSound);
  soundVolume.removeEventListener('input', changeVolume);
  window.removeEventListener('pointerdown', unlockOnGesture);
  window.removeEventListener('keydown', unlockOnGesture);
  shadows.dispose();
  keys.dispose();
  document.removeEventListener('visibilitychange', visibility);
  window.removeEventListener('blur', blur);
  observation?.dispose();
  movementEffects?.dispose();
  projectiles?.dispose(); combatEffects?.dispose(); combatRange?.dispose();
  combatAudio?.dispose(); vehicleAudio?.dispose();
  audio.dispose();
  aim.dispose(); turret?.dispose(); visual?.dispose(); vehicle?.dispose(); followCamera.dispose();
  tank?.dispose();
  ground?.dispose();
  sky.dispose();
  scene.dispose();
  engine.dispose();
}
if (import.meta.hot) import.meta.hot.dispose(dispose);
window.addEventListener('pagehide', dispose, { once: true });
