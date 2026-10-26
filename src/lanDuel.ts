import './lanDuel.css';
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
let elevation = 0;
let dragging = false;
let dragDistance = 0;
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
const active = () => !disposed && !failed && focused && !document.hidden && latest?.phase === 'playing' && slot !== undefined;
function send(value: object) {
  if (socket?.readyState === WebSocket.OPEN) socket.send(JSON.stringify(value));
}
function sendInput(neutral = false) {
  const enabled = !neutral && active();
  send({ type: 'input', sequence: ++sequence,
    throttle: enabled ? Number(keys.has('KeyW')) - Number(keys.has('KeyS')) : 0,
    steer: enabled ? Number(keys.has('KeyD')) - Number(keys.has('KeyA')) : 0,
    brake: enabled && keys.has('Space') ? 1 : 0,
    turn: enabled ? Number(keys.has('KeyE')) - Number(keys.has('KeyQ')) : 0,
    elevation: enabled ? clamp(elevation, -0.15, 0.15) : 0,
    fire: enabled && fire,
  });
  // Never accumulate unsent fire/elevation or replay a background-tab backlog.
  fire = false; elevation = 0;
}
function clearInput() {
  keys.clear(); fire = false; elevation = 0; dragging = false; zoom = false;
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
      && vector(t.rotation, 4) && [t.yaw, t.elevation, t.hp, t.reload, t.shots].every(Number.isFinite))
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
      if (reset) { frames = []; effects.reset(); clearTracers(); visuals.forEach(v => { v.shots = 0; }); }
      if (latest?.phase !== message.phase) clearInput();
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
    const own = visuals[slot ?? 0];
    if (own) {
      const muzzle = own.turret.getMuzzleRay();
      const targetPosition = zoom ? own.turret.pitchPivot.getAbsolutePosition().clone()
        : own.model.anchor.position.add(new Vector3(0, 2.7, 0));
      const direction = zoom ? muzzle.direction
        : new Vector3(Math.sin(yaw) * Math.cos(pitch), Math.sin(pitch), Math.cos(yaw) * Math.cos(pitch));
      const distance = zoom ? 3 : 17;
      const desired = targetPosition.subtract(direction.scale(distance));
      if (zoom) desired.addInPlace(Vector3.Cross(Vector3.Up(), direction).normalize().scale(1.7)).addInPlace(new Vector3(0, 0.7, 0));
      // Static-world ray keeps the orbit boom out of walls; no physics step is run.
      const hit = scene.getPhysicsEngine()?.raycast(targetPosition, desired);
      if (hit?.hasHit) desired.copyFrom(hit.hitPointWorld).addInPlace(direction.scale(0.5));
      camera.position.copyFrom(desired); camera.setTarget(zoom ? muzzle.origin.add(muzzle.direction.scale(150)) : targetPosition);
      camera.fov = zoom ? 0.5 : 0.8;
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
  effects.fixedUpdate(dt); effects.render(1);
  scene.render();
}
const listeners = new AbortController();
const options = { signal: listeners.signal };
const driveCodes = new Set(['KeyW', 'KeyS', 'KeyA', 'KeyD', 'Space', 'KeyQ', 'KeyE']);
window.addEventListener('keydown', event => {
  if (!driveCodes.has(event.code) || (event.target as HTMLElement)?.closest('button, a, input, textarea, select, [contenteditable]')) return;
  event.preventDefault(); if (active()) keys.add(event.code);
}, options);
window.addEventListener('keyup', event => { keys.delete(event.code); }, options);
window.addEventListener('blur', () => { focused = false; clearInput(); }, options);
window.addEventListener('focus', () => { focused = true; }, options);
document.addEventListener('visibilitychange', () => { clearInput(); frames = []; lastTime = performance.now(); }, options);
canvas.addEventListener('contextmenu', event => event.preventDefault(), options);
canvas.addEventListener('pointerdown', event => {
  if (!active() || (event.button !== 0 && event.button !== 2)) return;
  canvas.focus();
  if (event.button === 2) zoom = true;
  else { dragging = true; dragDistance = 0; }
  pointerId = event.pointerId; canvas.setPointerCapture(event.pointerId);
}, options);
canvas.addEventListener('pointermove', event => {
  if (!active() || !dragging) return;
  dragDistance += Math.abs(event.movementX) + Math.abs(event.movementY);
  yaw += event.movementX * 0.002;
  pitch = clamp(pitch - event.movementY * 0.002, -1.1, 0.4);
}, options);
canvas.addEventListener('pointerup', event => {
  if (event.button === 0) { if (active() && dragging && dragDistance < 5) fire = true; dragging = false; }
  if (event.button === 2) zoom = false;
  if (canvas.hasPointerCapture(event.pointerId)) canvas.releasePointerCapture(event.pointerId);
  pointerId = undefined;
}, options);
canvas.addEventListener('pointercancel', clearInput, options);
canvas.addEventListener('lostpointercapture', () => { dragging = false; zoom = false; }, options);
canvas.addEventListener('wheel', event => {
  event.preventDefault(); if (active()) elevation = clamp(elevation - Math.sign(event.deltaY) * 0.025, -0.15, 0.15);
}, { ...options, passive: false });
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
  listeners.abort(); if (timer) clearInterval(timer);
  if (socket) { socket.onmessage = null; socket.onerror = null; socket.onclose = null; socket.close(); }
  engine.stopRenderLoop(); clearTracers(); effects.dispose();
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
