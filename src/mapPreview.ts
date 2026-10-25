import { TouchControls } from './game/input/TouchControls.ts';
import './mapPreview.css';
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
const mobile = matchMedia('(pointer: coarse)').matches;
const engine = new Engine(canvas, !mobile);
const scaleMobile = () => { if (mobile) engine.setHardwareScalingLevel(Math.max(1, innerWidth / 1280, innerHeight / 720)); };
scaleMobile();
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
let machineGun: MachineGun | undefined;
let mgProjectiles: ProjectileSystem | undefined;
let mgMode = false;
let projectiles: ProjectileSystem | undefined;
let combatRange: ArmorRange | undefined;
let combatEffects: CombatEffects | undefined;
let lastCombatResult = '';
let combatResultTime = 0;
const aim = new AimSystem(scene, followCamera, document.querySelector<HTMLElement>('#aim-bore')!,
  document.querySelector<HTMLElement>('#aim-status')!);
const combatInput = new CombatInput(canvas, () => (mgMode || !!weapon?.ready) && !followCamera.isOverview && !paused,
  () => !!vehicle && !followCamera.isOverview && !paused,
  (x, y) => { if (mgMode) machineGun?.look(x, y); else followCamera.look(x, y); }, () => { followCamera.aiming = false; });
function selectWeapon(useMG: boolean) {
  if (!machineGun || !vehicle) return;
  combatInput.clear();
  if (followCamera.isOverview || !useMG) followCamera.follow();
  mgMode = useMG;
  scene.activeCamera = useMG ? machineGun.camera : followCamera.camera;
  if (useMG) machineGun.updateCamera();
  updateCombatHud();
}
const weaponKey = (event: KeyboardEvent) => {
  if (event.repeat || (event.target as HTMLElement)?.closest?.('input, textarea, select, button, [contenteditable="true"]')) return;
  if (event.code === 'Digit1' || event.code === 'Digit2' || event.code === 'Numpad1' || event.code === 'Numpad2') {
    event.preventDefault(); selectWeapon(event.code.endsWith('2'));
  }
};
window.addEventListener('keydown', weaponKey);
let lastTime = performance.now();
let paused = document.hidden;
const keys = bindDriveKeys(window, () => reset());
const touch = new TouchControls(document.querySelector<HTMLElement>('#touch-controls')!, canvas, {
  look: (x, y) => { if (mgMode) machineGun?.look(x, y); else followCamera.look(x, y); },
  fireReady: () => !!vehicle && !paused && (mgMode || !!weapon?.ready),
  weapon: () => selectWeapon(!mgMode), reset: () => reset(),
  sound: () => { soundEnabled = !soundEnabled;
    document.querySelector('[data-action="sound"]')!.setAttribute('aria-pressed', String(!soundEnabled));
    void toggleSound(); },
});
const ammoState = document.querySelector<HTMLElement>('#ammo-state')!;
const rangeReadout = document.querySelector<HTMLElement>('#range-readout')!;
const hitResult = document.querySelector<HTMLElement>('#hit-result')!;
function updateCombatHud() {
  if (!weapon) return;
  touch.update(weapon.ready, mgMode);
  ammoState.textContent = mgMode ? `MAKİNELİ TÜFEK · ${machineGun?.shotsFired ?? 0} ATIM` : weapon.ready
    ? `SİLAH HAZIR · ${IRON_DUST_01_WEAPON.ammo.label}`
    : `DOLUM · ${weapon.reloadRemaining.toFixed(1)} s`;
  rangeReadout.textContent = `${aim.rangeMeters.toFixed(0)} m`;
  hitResult.textContent = lastCombatResult;
  hitResult.className = '';
  document.querySelector<HTMLProgressElement>('#reload-progress')!.value = mgMode ? 1 : weapon.reloadFraction;
}
function reset() {
  touch.clear(); keys.clear(); input.reset(); clock.reset(); vehicle?.reset(); visual?.reset(); movementEffects?.reset();
  vehicleAudio?.reset(); combatAudio?.reset(); turret?.reset(); weapon?.reset(); projectiles?.reset(); combatEffects?.reset();
  machineGun?.reset(); mgProjectiles?.reset(); selectWeapon(false);
  combatInput.clear(); lastCombatResult = ''; combatResultTime = 0;
  aim.reset(); followCamera.follow();
  lastTime = performance.now();
}
const visibility = () => {
  paused = document.hidden; movementEffects?.reset(); keys.clear(); input.reset(); clock.reset(); lastTime = performance.now();
  combatInput.clear();
  if (document.hidden) { combatAudio?.reset(); void audio.suspend(); }
  else if (soundEnabled) void audio.resume();
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
  turret = new TurretController(tank, vehicle.definition);
  weapon = new WeaponSystem(turret, IRON_DUST_01_WEAPON);
  machineGun = await MachineGun.load(scene, mgUrl, turret.yawPivot);
  if (disposed) { machineGun.dispose(); return; }
  machineGun.assets.meshes.filter(mesh => mesh.isVisible).forEach(mesh => shadows.addShadowCaster(mesh));
  mgProjectiles = new ProjectileSystem(scene, (from, to) => {
    const hit = scene.getPhysicsEngine()!.raycast(from, to, { ignoreBody: vehicle!.body });
    return hit.hasHit ? { point: hit.hitPointWorld.clone(), normal: hit.hitNormalWorld.clone(), body: hit.body, distance: hit.hitDistance } : undefined;
  }, 40, { gravity: -9.81, maxRange: 600, maxAge: 3, trailSeconds: 0.015, trailLength: 2.2, diameter: 0.035 });
  scene.activeCamera = followCamera.camera;
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
  status.hidden = true;
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
    followCamera.aiming = !mgMode && (combatInput.aiming || touch.aiming);
    const alpha = clock.advance(dt, step => {
      const command = input.resolve(observation?.keys() ?? Object.fromEntries(Object.entries(keys.keys).map(([key, value]) => [key, value || touch.keys[key as keyof typeof touch.keys]])) as typeof keys.keys, vehicle!.speed, step, vehicle!.definition.reverseDelay);
      vehicle!.beforeStep(step, command);
      movementEffects!.fixedUpdate(vehicle!, step);
      scene.getPhysicsEngine()!._step(step);
      vehicle!.afterStep();
      observation?.step();
      visual!.fixedUpdate(vehicle!, step);
      // Joint calculations use the current physics pose; render interpolation follows below.
      visual!.syncHull(vehicle!, 1);
      turret!.fixedUpdateManual(followCamera.isOverview || mgMode ? 0 : (combatInput.turretTurn + touch.turn), mgMode ? (combatInput.consumeElevation(), 0) : (combatInput.consumeElevation() + touch.elevation * step * 15 * Math.PI / 180), step);
      if (mgMode) machineGun!.look(touch.turn * step * 220, -touch.elevation * step * 160);
      const wasReady = weapon!.ready;
      weapon!.fixedUpdate(step);
      if (!wasReady && weapon!.ready && !audio.muted) combatAudio?.reload();
      if ((combatInput.consumeFire() || touch.consumeFire()) && !mgMode) {
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
      machineGun!.fixedUpdate(step, mgMode && !followCamera.isOverview && (combatInput.fireHeld || touch.fireHeld), (origin, direction) => {
        mgProjectiles!.spawn(origin, direction, MG.speed);
        combatEffects!.machineGunFlash(origin, direction);
        if (!audio.muted) combatAudio?.machineGunShot();
        lastCombatResult = 'MG · ATEŞ'; combatResultTime = 0.4;
      });
      mgProjectiles!.fixedUpdate(step, hit => {
        combatEffects!.impact(hit.point, hit.normal, impactSurface(hit.body));
        lastCombatResult = 'MG · İSABET'; combatResultTime = 0.4;
      });
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
    weapon!.render(alpha);
    projectiles!.render(alpha);
    mgProjectiles!.render(alpha);
    combatEffects!.render(alpha);
    followCamera.update(vehicle, tank.anchor.position, Math.min(dt, 0.1), turret);
    if (mgMode) machineGun!.updateCamera();
    hudElapsed += dt;
    combatResultTime = Math.max(0, combatResultTime - dt);
    if (combatResultTime === 0 && lastCombatResult) lastCombatResult = '';
    if (hudElapsed >= 0.1) {
      updateCombatHud();
      hudElapsed = 0;
    }
    if (vehicleAudio && audioSnapshot) {
      audioSnapshot.speed = vehicle.speed;
      audioSnapshot.driveForce = vehicle.driveForce;
      vehicleAudio.update(audioSnapshot, dt);
    }
    scene.render();
    aim.render(vehicle, mgMode ? machineGun! : turret!);
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
  touch.dispose();
  combatInput.dispose();
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
  mgProjectiles?.dispose(); machineGun?.dispose();
  tank?.dispose();
  ground?.dispose();
  sky.dispose();
  scene.dispose();
  engine.dispose();
}
if (import.meta.hot) import.meta.hot.dispose(dispose);
window.addEventListener('pagehide', dispose, { once: true });
