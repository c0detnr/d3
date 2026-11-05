import './game/input/gamePointerLock.css';
import { GamePointerLock } from './game/input/GamePointerLock.ts';
import { DamageHud } from './game/ui/DamageHud.ts';
import { MODULES } from './game/combat/DamageModel.ts';
import { AudioSystem } from './game/audio/AudioSystem.ts';
import { CombatAudio } from './game/audio/CombatAudio.ts';
import { ShotCameraMotion } from './game/camera/ShotCameraMotion.ts';
import { FixedStep } from './game/core/fixedStep.ts';
import type { ImpactEvent } from './game/network/protocol.ts';
import './lanDuel.css';
import { TacticalHud } from './game/ui/TacticalHud.ts';
import {
  Color3, DirectionalLight, Engine, FreeCamera, HavokPlugin, HemisphericLight,
  Matrix, MeshBuilder, Quaternion, Scene, ShadowGenerator, StandardMaterial, Vector3,
  type LinesMesh,
} from '@babylonjs/core';
import HavokPhysics from '@babylonjs/havok';
import wasmUrl from '@babylonjs/havok/lib/esm/HavokPhysics.wasm?url';
import tankUrl from '../assets/tanks/iron_dust_01/iron_dust_01.glb?url';
import secondTankUrl from '../assets/tanks/iron_dust_02/iron_dust_02.glb?url';
import { loadTankModel } from './game/vehicle/loadTankModel';
import { TurretController, wrapAngle } from './game/vehicle/TurretController';
import { createTestGround } from './game/world/createTestGround';
import { createChaoticSky } from './game/world/SkyAtmosphere';
import { CombatEffects } from './game/combat/CombatEffects';

// Type-only wire contract: never import or advance the server simulation here.
import type { Slot, TankState, ServerState as DuelState } from './game/network/protocol';
interface Frame { state: DuelState; time: number }
const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const canvas = $<HTMLCanvasElement>('duel');
const readyButton = $<HTMLButtonElement>('ready');
const connection = $('connection');
const result = $('result');
const errorLabel = $('error');
const engine = new Engine(canvas, true);
const scene = new Scene(engine);
const camera = new FreeCamera('lan-camera', new Vector3(0, 12, -20), scene);
camera.inputs.clear(); camera.minZ = 0.15; camera.maxZ = 1600; camera.fov = 0.8;
camera.setTarget(Vector3.Zero());
const sky = createChaoticSky(scene);
const ambient = new HemisphericLight('sky', Vector3.Up(), scene);
ambient.intensity = 0.6;
ambient.groundColor = new Color3(0.27, 0.24, 0.19);
const sun = new DirectionalLight('sun', new Vector3(-0.58, -0.62, 0.53), scene);
sun.position.set(70, 82, -80); sun.intensity = 1.05;
sun.diffuse = new Color3(1, 0.79, 0.56);
const shadows = new ShadowGenerator(2048, sun);
shadows.usePercentageCloserFiltering = true;
shadows.bias = 0.001; shadows.normalBias = 0.04;
const effects = new CombatEffects(scene);
const tacticalHud = new TacticalHud(false);
const damageHud = new DamageHud();
const cameraMotion = new ShotCameraMotion();
const effectClock = new FixedStep();
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
const audio = new AudioSystem({ volume: 0.65 });
let combatAudio: CombatAudio | undefined;
let lastImpactId = 0;
let trailTime = 0;
let damageSoundTime = 0;
const soundButton = $<HTMLButtonElement>('sound');
async function unlockAudio() {
  if (disposed || audio.muted) return;
  if (await audio.unlock()) {
    if (disposed) return;
    if (!combatAudio && audio.graph) combatAudio = new CombatAudio(audio.graph.context, audio.graph.output);
  }
}
function presentImpact(hit: ImpactEvent, state: DuelState) {
  const point = Vector3.FromArray(hit.point), normal = Vector3.FromArray(hit.normal);
  const offset = point.subtract(camera.position), distance = offset.length();
  const pan = Vector3.Dot(offset.normalizeToNew(), camera.getDirection(Vector3.Right()));
  if (hit.target === null) {
    effects.impact(point, normal, hit.surface);
    if (!audio.muted) combatAudio?.impact(hit.surface, distance, pan);
    return;
  }
  const target = state.tanks[hit.target];
  const disabled = hit.module !== null && target.modules[hit.module] === 0;
  effects.armorImpact(point, normal, !hit.ricochet);
  if (hit.destroyed) effects.destruction(point);
  if (!audio.muted) combatAudio?.armorHit(!hit.ricochet, distance, pan, hit.destroyed);
  if (hit.shooter === slot) damageHud.outgoing(hit.module, disabled, hit.destroyed, !hit.ricochet);
  if (hit.target === slot) {
    const source = Vector3.FromArray(hit.source).subtract(point);
    if (hit.ricochet) return;
    damageHud.incoming(Math.atan2(source.x, source.z), hit.module, disabled, target.hp <= 25 || disabled);
    if (!reducedMotion.matches) cameraMotion.impulse(pan, hit.destroyed ? 9 : 5);
  }
}
type Model = Awaited<ReturnType<typeof loadTankModel>>;
interface Visual {
  model: Model; turret: TurretController; yawRest: Quaternion; pitchRest: Quaternion; shots: number;
}
const visuals: Visual[] = [];
let ground: ReturnType<typeof createTestGround> | undefined;
let socket: WebSocket | undefined;
let slot: Slot | undefined;
let latest: DuelState | undefined;
let frames: Frame[] = [];
let sequence = 0;
let disposed = false;
let failed = false;
let readyPending = false;
let timer: ReturnType<typeof setInterval> | undefined;
let focused = document.hasFocus();
const keys = new Set<string>();
let fire = false;
let followRadius = 17;
let aimFov = 0.5;
let zoom = false;
let yaw = 0;
let pitch = -0.15;
let pointerId: number | undefined;
const tracers = new Map<number, LinesMesh>();
const projectileMaterial = new StandardMaterial('lan-tracers', scene);
projectileMaterial.emissiveColor = new Color3(1, 0.75, 0.25);
projectileMaterial.disableLighting = true;
const tracerPoints = [Vector3.Zero(), Vector3.Zero()];
const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));
const canPlay = () => !disposed && !failed && focused && !document.hidden && latest?.phase === 'playing' && slot !== undefined;
const pointerLock = new GamePointerLock(canvas, () => clearInput(), canPlay);
const active = () => canPlay() && pointerLock.active;
function send(value: object) {
  if (socket?.readyState === WebSocket.OPEN) socket.send(JSON.stringify(value));
}
function sendInput(neutral = false) {
  const enabled = !neutral && active();
  const direction = new Vector3(Math.sin(yaw) * Math.cos(pitch), Math.sin(pitch), Math.cos(yaw) * Math.cos(pitch));
  const to = camera.position.add(direction.scale(1000));
  const hit = enabled ? scene.getPhysicsEngine()?.raycast(camera.position, to) : undefined;
  const pivot = visuals[slot ?? 0]?.turret.yawPivot;
  pivot?.computeWorldMatrix(true);
  const aimDirection = pivot ? (hit?.hasHit ? hit.hitPointWorld : to).subtract(pivot.getAbsolutePosition()).normalize().asArray() : undefined;
  send({ type: 'input', sequence: ++sequence,
    throttle: enabled ? Number(keys.has('KeyW')) - Number(keys.has('KeyS')) : 0,
    steer: enabled ? Number(keys.has('KeyD')) - Number(keys.has('KeyA')) : 0,
    brake: enabled && keys.has('ShiftLeft') ? 1 : 0,
    turn: 0,
    elevation: 0,
    fire: enabled && fire,
    aimDirection: enabled ? aimDirection : undefined,
  });
  // Never replay a fire request from a background tab.
  fire = false;
}
function clearInput() {
  keys.clear(); fire = false; zoom = false;
  if (pointerId !== undefined && canvas.hasPointerCapture(pointerId)) canvas.releasePointerCapture(pointerId);
  pointerId = undefined;
  if (slot !== undefined) sendInput(true);
}
function fail(message: string) {
  failed = true; clearInput(); readyButton.disabled = true;
  errorLabel.hidden = false; errorLabel.textContent = message;
  connection.textContent = 'Bağlantı kapalı · maç iptal edildi';
  result.textContent = 'Devam etmek için sayfayı yenileyin. Maça yeniden bağlanma desteklenmez.';
}
function updateHud(state: DuelState) {
  connection.textContent = slot === undefined ? 'Oyuncu ataması bekleniyor…' : `Tank ${slot + 1} sizsiniz · ${state.connected.filter(Boolean).length}/2 bağlı`;
  for (const i of [0, 1] as const) {
    $<HTMLProgressElement>(`hp-${i}`).value = clamp(state.tanks[i].hp, 0, 100);
    $(`hp-text-${i}`).textContent = `${state.tanks[i].hp} / 100${i === slot ? ' · SİZ' : ''}`;
  }
  $('ready-state').textContent = `Hazır: ${state.ready.map(value => value ? '✓' : '—').join(' / ')}`;
  const own = slot === undefined ? undefined : state.tanks[slot];
  if (own) damageHud.setState(own);
  $('reload').textContent = own ? own.reload > 0 ? `DOLUM · ${own.reload.toFixed(1)} sn` : 'ANA TOP HAZIR' : 'Ana top · bekleniyor';
  $<HTMLProgressElement>('reload-progress').value = own ? clamp(5 - own.reload, 0, 5) : 0;
  readyButton.disabled = failed || slot === undefined || state.phase === 'playing' || state.phase === 'cancelled' || state.ready[slot] || readyPending;
  readyButton.textContent = state.phase === 'finished' ? 'Rövanşa hazırım' : 'Hazırım';
  result.textContent = state.phase === 'playing' ? 'Düello başladı · yalnız sunucu isabetleri belirler.'
    : state.phase === 'finished' ? state.winner === null ? 'Maç bitti · rövanş için ikiniz de hazır olun.'
      : `${state.winner === slot ? 'KAZANDINIZ' : 'KAYBETTİNİZ'} · Tank ${state.winner + 1} kazandı. Rövanş için ikiniz de hazır olun.`
    : state.phase === 'cancelled' ? 'Bağlantı kaybı · maç iptal edildi.' : 'İki oyuncu bağlanıp hazır olduğunda maç başlar.';
}
function validState(value: unknown): value is DuelState {
  if (!value || typeof value !== 'object') return false;
  const s = value as DuelState;
  const vector = (v: unknown, n: number): v is number[] => Array.isArray(v) && v.length === n && v.every(Number.isFinite);
  const pair = (v: unknown) => Array.isArray(v) && v.length === 2 && v.every(x => typeof x === 'boolean');
  return s.type === 'state' && Number.isFinite(s.tick) && ['waiting', 'playing', 'finished', 'cancelled'].includes(s.phase)
    && (s.winner === null || s.winner === 0 || s.winner === 1) && pair(s.ready) && pair(s.connected)
    && Array.isArray(s.tanks) && s.tanks.length === 2 && s.tanks.every(t => t && vector(t.position, 3)
      && vector(t.rotation, 4) && t.modules && MODULES.every(module => Number.isFinite(t.modules[module]) && t.modules[module] >= 0 && t.modules[module] <= 100)
      && t.hp >= 0 && t.hp <= 100 && [t.yaw, t.elevation, t.hp, t.reload, t.shots].every(Number.isFinite))
    && Array.isArray(s.impacts) && s.impacts.length <= 32 && s.impacts.every(h => h && Number.isSafeInteger(h.id) && h.id > 0
      && Number.isSafeInteger(h.tick) && h.tick >= 0 && h.tick <= s.tick && (h.shooter === 0 || h.shooter === 1)
      && (h.target === null || h.target === 0 || h.target === 1) && vector(h.point, 3) && vector(h.normal, 3) && vector(h.source, 3)
      && ['soil', 'concrete', 'metal'].includes(h.surface) && (h.module === null || MODULES.includes(h.module)) && typeof h.destroyed === 'boolean' && (h.ricochet === undefined || typeof h.ricochet === 'boolean'))
    && Array.isArray(s.projectiles) && s.projectiles.every(p => p && Number.isFinite(p.id) && vector(p.position, 3));
}
function connect() {
  connection.textContent = 'Sunucuya bağlanılıyor…';
  const url = new URL('/duel', location.href);
  url.protocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
  socket = new WebSocket(url);
  socket.onmessage = event => {
    if (disposed || failed) return;
    let message: unknown;
    try { message = JSON.parse(String(event.data)); } catch { fail('Sunucudan geçersiz mesaj alındı.'); socket?.close(); return; }
    const m = message as { type?: string; slot?: number; message?: string } | null;
    if (m?.type === 'welcome' && (m.slot === 0 || m.slot === 1)) {
      slot = m.slot; yaw = slot === 0 ? 0 : Math.PI; connection.textContent = `Tank ${slot + 1} sizsiniz · durum bekleniyor…`;
      if (latest) updateHud(latest);
    } else if (m?.type === 'error') {
      fail(typeof m.message === 'string' ? m.message : 'Sunucu bağlantıyı reddetti.'); socket?.close();
    } else if (validState(message)) {
      const now = performance.now();
      const reset = !!latest && (message.tick < latest.tick || (message.phase === 'playing' && latest.phase !== 'playing'));
      if (reset) { frames = []; effects.reset(); damageHud.reset(); cameraMotion.reset(); combatAudio?.reset(); effectClock.reset(); trailTime = 0; lastImpactId = 0; clearTracers(); visuals.forEach(v => { v.shots = 0; }); }
      if (latest?.phase !== message.phase) clearInput();
      if (!latest) lastImpactId = message.impacts.at(-1)?.id ?? 0;
      latest = message; readyPending = false;
      visuals.forEach(v => v.model.anchor.setEnabled(true));
      frames.push({ state: message, time: now });
      if (frames.length > 32) frames.shift();
      updateHud(message);
      if (message.phase === 'cancelled') fail('Oyunculardan biri ayrıldı. Maç iptal edildi.');
    }
  };
  socket.onerror = () => { if (!disposed && !failed) fail('LAN sunucusuna erişilemiyor. Adresi ve sunucuyu kontrol edin.'); };
  socket.onclose = () => { if (!disposed && !failed) fail('Sunucu bağlantısı kesildi. Maç iptal edildi.'); };
  timer = setInterval(() => {
    // Backpressure drops commands rather than delivering stale driving/fire later.
    if ((socket?.bufferedAmount ?? 0) > 16384) { fail('Bağlantı gecikti; güvenlik için maç durduruldu.'); socket?.close(); return; }
    if (!document.hidden && !failed && slot !== undefined) sendInput();
  }, 1000 / 30);
}
function clearTracers() { tracers.forEach(mesh => mesh.dispose()); tracers.clear(); }
function applyPose(visual: Visual, a: TankState, b: TankState, alpha: number) {
  const anchor = visual.model.anchor;
  Vector3.LerpToRef(Vector3.FromArray(a.position), Vector3.FromArray(b.position), alpha, anchor.position);
  anchor.rotationQuaternion = Quaternion.Slerp(Quaternion.FromArray(a.rotation), Quaternion.FromArray(b.rotation), alpha);
  visual.turret.yawPivot.rotationQuaternion = visual.yawRest.multiply(Quaternion.RotationAxis(Vector3.Up(), a.yaw + wrapAngle(b.yaw - a.yaw) * alpha));
  visual.turret.pitchPivot.rotationQuaternion = visual.pitchRest.multiply(Quaternion.RotationAxis(Vector3.Right(), -(a.elevation + (b.elevation - a.elevation) * alpha)));
  anchor.computeWorldMatrix(true);
  // Shot counters, not clicks, trigger feedback; the server alone authorizes shots.
  const shots = alpha >= 1 ? b.shots : a.shots;
  if (shots > visual.shots) {
    const ray = visual.turret.getMuzzleRay(); effects.muzzleFlash(ray.origin, ray.direction);
    const offset = ray.origin.subtract(camera.position);
    if (!audio.muted) combatAudio?.shot(offset.length(), Vector3.Dot(offset.normalizeToNew(), camera.getDirection(Vector3.Right())));
  }
  visual.shots = shots;
}
let lastTime = performance.now();
function render() {
  const now = performance.now();
  const dt = Math.min(0.1, Math.max(0, (now - lastTime) / 1000)); lastTime = now;
  if (document.hidden || disposed) return;
  sky.update(dt);
  const target = now - 100; // Small interpolation buffer; never extrapolate/locally simulate.
  while (frames.length > 2 && frames[1].time <= target) frames.shift();
  const a = frames[0]; const b = frames[1] ?? a;
  if (a && b) {
    const alpha = b.time > a.time ? clamp((target - a.time) / (b.time - a.time), 0, 1) : 1;
    visuals.forEach((visual, index) => applyPose(visual, a.state.tanks[index], b.state.tanks[index], alpha));
    const visible = alpha >= 1 ? b.state.projectiles : a.state.projectiles;
    const ids = new Set(visible.map(p => p.id));
    tracers.forEach((mesh, id) => { if (!ids.has(id)) { mesh.dispose(); tracers.delete(id); } });
    visible.forEach(p => {
      const end = b.state.projectiles.find(next => next.id === p.id);
      const startPosition = Vector3.FromArray(p.position);
      const position = end ? Vector3.Lerp(startPosition, Vector3.FromArray(end.position), alpha) : startPosition;
      // Segment is purely a snapshot-derived tracer, not a ballistic prediction.
      const direction = end ? Vector3.FromArray(end.position).subtract(startPosition) : Vector3.Zero();
      if (direction.lengthSquared() > 0.001) direction.normalize().scaleInPlace(-1.8);
      else direction.set(0, 0.12, 0);
      tracerPoints[0].copyFrom(position); tracerPoints[1].copyFrom(position).addInPlace(direction);
      const mesh = MeshBuilder.CreateLines(`server-projectile-${p.id}`, { points: tracerPoints, instance: tracers.get(p.id), updatable: true }, scene);
      mesh.color = projectileMaterial.emissiveColor; mesh.isPickable = false;
      tracers.set(p.id, mesh);
    });
    const displayedTick = a.state.tick + (b.state.tick - a.state.tick) * alpha;
    for (const hit of latest?.impacts ?? []) {
      if (hit.id <= lastImpactId || hit.tick > displayedTick) continue;
      lastImpactId = hit.id;
      presentImpact(hit, latest!);
    }
    const own = visuals[slot ?? 0];
    if (own) {
      const muzzle = own.turret.getMuzzleRay();
      if (slot !== undefined) {
        const first = a.state.tanks[slot], second = b.state.tanks[slot];
        const hullForward = own.model.anchor.getDirection(Vector3.Forward());
        const seconds = (b.state.tick - a.state.tick) / 60;
        const speed = seconds > 0 ? Vector3.Dot(Vector3.FromArray(second.position).subtract(Vector3.FromArray(first.position)), hullForward) / seconds : 0;
        const forward = camera.getForwardRay().direction;
        tacticalHud.update({ cameraYaw: Math.atan2(forward.x, forward.z),
          hullYaw: Math.atan2(hullForward.x, hullForward.z), turretYaw: first.yaw + wrapAngle(second.yaw - first.yaw) * alpha,
          speed, reloadRemaining: second.reload, reloadFraction: clamp(1 - second.reload / 5, 0, 1), machineGun: false });
      }
      const targetPosition = zoom ? own.turret.pitchPivot.getAbsolutePosition().clone()
        : own.model.anchor.position.add(new Vector3(0, 2.7, 0));
      const direction = new Vector3(Math.sin(yaw) * Math.cos(pitch), Math.sin(pitch), Math.cos(yaw) * Math.cos(pitch));
      const distance = zoom ? 3 : followRadius;
      const desired = targetPosition.subtract(direction.scale(distance));
      if (zoom) desired.addInPlace(Vector3.Cross(Vector3.Up(), direction).normalize().scale(1.7)).addInPlace(new Vector3(0, 0.7, 0));
      // Static-world ray keeps the orbit boom out of walls; no physics step is run.
      const hit = scene.getPhysicsEngine()?.raycast(targetPosition, desired);
      if (hit?.hasHit) desired.copyFrom(hit.hitPointWorld).addInPlace(direction.scale(0.5));
      camera.position.copyFrom(desired); camera.setTarget(desired.add(direction.scale(1000)));
      camera.fov = zoom ? aimFov : 0.8;
      const motion = cameraMotion.update(dt);
      if (!reducedMotion.matches) { camera.rotation.x += motion.pitch; camera.rotation.y += motion.yaw; camera.rotation.z += motion.roll; }
      const bore = document.querySelector<HTMLElement>('.reticle')!;
      const point = muzzle.origin.add(muzzle.direction.scale(150));
      const projected = Vector3.Project(point, Matrix.Identity(), scene.getTransformMatrix(),
        camera.viewport.toGlobal(engine.getRenderWidth(), engine.getRenderHeight()));
      const rect = canvas.getBoundingClientRect();
      bore.hidden = Vector3.Dot(point.subtract(camera.position), camera.getForwardRay().direction) <= 0
        || projected.z < 0 || projected.z > 1;
      bore.style.left = `${rect.left + projected.x / engine.getRenderWidth() * rect.width}px`;
      bore.style.top = `${rect.top + projected.y / engine.getRenderHeight() * rect.height}px`;
    }
  }
  effectClock.advance(dt, step => {
    trailTime += step; damageSoundTime += step;
    if (trailTime >= 0.05 && latest) {
      trailTime -= 0.05;
      visuals.forEach((visual, index) => {
        const deck = Vector3.TransformCoordinates(new Vector3(0, 1.95, -2), visual.model.anchor.computeWorldMatrix(true));
        const state = latest!.tanks[index];
        effects.damageTrail(deck, state);
        if (damageSoundTime >= 0.4 && !audio.muted && focused) {
          const offset = deck.subtract(camera.position);
          combatAudio?.damageAmbience(state.hp, state.modules.engine, offset.length(), Vector3.Dot(offset.normalizeToNew(), camera.getDirection(Vector3.Right())));
        }
      });
      if (damageSoundTime >= 0.4) damageSoundTime = 0;
    }
    effects.fixedUpdate(step);
  });
  effects.render(1);
  const forward = camera.getForwardRay().direction;
  damageHud.update(dt, Math.atan2(forward.x, forward.z));
  scene.render();
}
const listeners = new AbortController();
const options = { signal: listeners.signal };
const driveCodes = new Set(['KeyW', 'KeyS', 'KeyA', 'KeyD', 'ShiftLeft']);
window.addEventListener('keydown', event => {
  if (!driveCodes.has(event.code) || (event.target as HTMLElement)?.closest('button, a, input, textarea, select, [contenteditable]')) return;
  event.preventDefault();
  if (!active()) return;
  keys.add(event.code);
}, options);
window.addEventListener('keyup', event => { keys.delete(event.code); }, options);
window.addEventListener('blur', () => { focused = false; clearInput(); combatAudio?.reset(); void audio.suspend(); }, options);
window.addEventListener('focus', () => { focused = true; void audio.resume(); }, options);
document.addEventListener('visibilitychange', () => { clearInput(); frames = []; lastTime = performance.now(); damageHud.reset(); cameraMotion.reset(); effects.reset(); effectClock.reset(); lastImpactId = latest?.impacts.at(-1)?.id ?? lastImpactId; combatAudio?.reset(); if (document.hidden) void audio.suspend(); else void audio.resume(); }, options);
canvas.addEventListener('contextmenu', event => event.preventDefault(), options);
canvas.addEventListener('pointerdown', event => {
  if (!active() || (event.button !== 0 && event.button !== 2)) return;
  canvas.focus();
  if (event.button === 2) zoom = true;
  else fire = true;
  pointerId = event.pointerId;
  if (!document.pointerLockElement) canvas.setPointerCapture(event.pointerId);
}, options);
canvas.addEventListener('pointermove', event => {
  if (!active()) return;
  yaw += event.movementX * 0.002;
  pitch = clamp(pitch - event.movementY * 0.002, -1.1, 0.4);
}, options);
canvas.addEventListener('pointerup', event => {
  if (event.button === 2) zoom = false;
  if (canvas.hasPointerCapture(event.pointerId)) canvas.releasePointerCapture(event.pointerId);
  pointerId = undefined;
}, options);
canvas.addEventListener('pointercancel', clearInput, options);
canvas.addEventListener('lostpointercapture', () => { zoom = false; }, options);
canvas.addEventListener('wheel', event => {
  event.preventDefault();
  if (!active()) return;
  const notches = clamp(event.deltaY / (event.deltaMode === 1 ? 3 : event.deltaMode === 2 ? 1 : 100), -4, 4);
  if (zoom) aimFov = clamp(aimFov + notches * 0.05, 0.2, 0.7);
  else followRadius = clamp(followRadius + notches * 1.5, 6, 35);
}, { ...options, passive: false });
window.addEventListener('pointerdown', () => { void unlockAudio(); }, options);
window.addEventListener('keydown', () => { void unlockAudio(); }, options);
soundButton.addEventListener('click', () => {
  audio.setMuted(!audio.muted); combatAudio?.reset();
  soundButton.textContent = audio.muted ? 'SES KAPALI' : 'SES AÇIK';
  soundButton.setAttribute('aria-pressed', String(!audio.muted));
  if (!audio.muted) void unlockAudio();
}, options);
readyButton.addEventListener('click', () => {
  if (readyButton.disabled || socket?.readyState !== WebSocket.OPEN) return;
  clearInput(); readyPending = true; readyButton.disabled = true; send({ type: 'ready' });
}, options);
window.addEventListener('resize', () => engine.resize(), options);
async function start() {
  const havok = await HavokPhysics({ locateFile: () => wasmUrl });
  if (disposed) return;
  scene.enablePhysics(new Vector3(0, -9.81, 0), new HavokPlugin(true, havok));
  // Havok exists only to construct the shared static map and query the camera boom.
  scene.physicsEnabled = false;
  ground = createTestGround(scene);
  ground.shadowCasters.forEach(mesh => shadows.addShadowCaster(mesh));
  for (let i = 0; i < 2; i++) {
    const model = await loadTankModel(scene, i === 0 ? tankUrl : secondTankUrl, ground.spawn);
    if (disposed) { model.dispose(); return; }
    const turret = new TurretController(model);
    visuals.push({ model, turret,
      yawRest: turret.yawPivot.rotationQuaternion?.clone() ?? Quaternion.FromEulerVector(turret.yawPivot.rotation),
      pitchRest: turret.pitchPivot.rotationQuaternion?.clone() ?? Quaternion.FromEulerVector(turret.pitchPivot.rotation), shots: 0 });
    model.assets.meshes.filter(mesh => mesh.isVisible).forEach(mesh => shadows.addShadowCaster(mesh));
    model.anchor.setEnabled(false);
  }
  connect(); // No welcome/state can arrive before both visual rigs exist.
  engine.runRenderLoop(render);
}
function dispose() {
  if (disposed) return;
  clearInput(); disposed = true;
  pointerLock.dispose();
  listeners.abort(); if (timer) clearInterval(timer);
  if (socket) { socket.onmessage = null; socket.onerror = null; socket.onclose = null; socket.close(); }
  engine.stopRenderLoop(); clearTracers(); effects.dispose(); tacticalHud.dispose(); damageHud.dispose(); combatAudio?.dispose(); audio.dispose();
  visuals.forEach(v => { v.turret.dispose(); v.model.dispose(); });
  shadows.dispose(); ground?.dispose(); sky.dispose(); projectileMaterial.dispose();
  scene.dispose(); engine.dispose();
}
window.addEventListener('pagehide', dispose, { ...options, once: true });
if (import.meta.hot) import.meta.hot.dispose(dispose);
void start().catch((error: unknown) => {
  if (disposed) return;
  console.error(error); fail('Sahne yüklenemedi. Sayfayı yenileyerek tekrar deneyin.');
});
