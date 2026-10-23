import './mapPreview.css';
import { Color3, Color4, DirectionalLight, Engine, HemisphericLight,
  HavokPlugin, MeshBuilder, Scene, ShadowGenerator, StandardMaterial, Vector3 } from '@babylonjs/core';
import HavokPhysics from '@babylonjs/havok';
import wasmUrl from '@babylonjs/havok/lib/esm/HavokPhysics.wasm?url';
import { createTestGround } from './game/world/createTestGround';
import { loadTankModel } from './game/vehicle/loadTankModel';
import { FixedStep } from './game/core/fixedStep.ts';
import { bindDriveKeys, DriveInput } from './game/input/DriveInput.ts';
import { extractTankRig } from './game/vehicle/tankRig.ts';
import { TankVehicle } from './game/vehicle/TankVehicle.ts';
import { TankVisual } from './game/vehicle/TankVisual.ts';
import { FollowCamera } from './game/camera/FollowCamera.ts';
import tankUrl from '../assets/tanks/iron_dust_01/iron_dust_01.glb?url';

const canvas = document.querySelector<HTMLCanvasElement>('#map')!;
const status = document.querySelector<HTMLElement>('#status')!;
const engine = new Engine(canvas, true);
const scene = new Scene(engine);
scene.clearColor = new Color4(0.65, 0.71, 0.72, 1);
scene.fogMode = Scene.FOGMODE_EXP2;
scene.fogDensity = 0.0032;
scene.fogColor = new Color3(0.65, 0.71, 0.70);
scene.imageProcessingConfiguration.exposure = 1;
scene.imageProcessingConfiguration.contrast = 1.15;
const skyDome = MeshBuilder.CreateSphere('atmosphere', { diameter: 1800, segments: 24 }, scene);
const skyMaterial = new StandardMaterial('sky-gradient', scene);
skyMaterial.backFaceCulling = false;
skyMaterial.disableLighting = true;
skyMaterial.emissiveColor = Color3.White();
skyMaterial.fogEnabled = false;
const skyVertices = skyDome.getVerticesData('position')!;
const skyColors: number[] = [];
for (let i = 0; i < skyVertices.length; i += 3) {
  const t = Math.max(0, skyVertices[i + 1] / 900);
  const color = Color3.Lerp(new Color3(0.73, 0.76, 0.73), new Color3(0.35, 0.49, 0.60), Math.sqrt(t));
  skyColors.push(color.r, color.g, color.b, 1);
}
skyDome.setVerticesData('color', skyColors);
skyDome.material = skyMaterial;
skyDome.infiniteDistance = true;
skyDome.isPickable = false;
const followCamera = new FollowCamera(scene, canvas);
followCamera.camera.maxZ = 1600;
const clock = new FixedStep();
const input = new DriveInput();
let vehicle: TankVehicle | undefined;
let visual: TankVisual | undefined;
let lastTime = performance.now();
let paused = document.hidden;
const keys = bindDriveKeys(window, () => reset());
const telemetry = document.querySelector<HTMLElement>('#telemetry')!;
function reset() {
  keys.clear(); input.reset(); clock.reset(); vehicle?.reset(); visual?.reset(); followCamera.follow();
  lastTime = performance.now();
}
const visibility = () => {
  paused = document.hidden; keys.clear(); input.reset(); clock.reset(); lastTime = performance.now();
};
const blur = () => { keys.clear(); input.reset(); };
document.addEventListener('visibilitychange', visibility);
window.addEventListener('blur', blur);
const ambient = new HemisphericLight('sky', new Vector3(0, 1, 0), scene);
ambient.intensity = 0.7;
ambient.diffuse = new Color3(0.81, 0.87, 0.96);
ambient.groundColor = new Color3(0.32, 0.29, 0.22);
const sun = new DirectionalLight('sun', new Vector3(-0.65, -0.8, 0.55), scene);
sun.intensity = 1.25;
sun.diffuse = new Color3(1, 0.88, 0.71);
sun.position.set(70, 100, -80);
sun.autoCalcShadowZBounds = true;
const shadows = new ShadowGenerator(2048, sun);
shadows.usePercentageCloserFiltering = true;
shadows.bias = 0.001;
shadows.normalBias = 0.04;
shadows.setDarkness(0.25);

const overview = () => followCamera.overview();
const spawn = () => reset();
document.querySelector('#overview')!.addEventListener('click', overview);
document.querySelector('#spawn')!.addEventListener('click', spawn);
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
  followCamera.follow();
  status.textContent = '42 ton · Palet kuvvetleriyle sürüş · R ile kurtar';
  lastTime = performance.now();
  let hudElapsed = 0;
  engine.runRenderLoop(() => {
    const now = performance.now();
    const dt = Math.max(0, (now - lastTime) / 1000); lastTime = now;
    if (paused || !vehicle || !visual || !tank) return;
    const alpha = clock.advance(dt, step => {
      const command = input.resolve(keys.keys, vehicle!.speed, step, vehicle!.definition.reverseDelay);
      vehicle!.beforeStep(step, command);
      scene.getPhysicsEngine()!._step(step);
      vehicle!.afterStep();
      visual!.fixedUpdate(vehicle!, step);
    });
    visual.render(vehicle, alpha);
    followCamera.update(vehicle, tank.anchor.position, Math.min(dt, 0.1));
    hudElapsed += dt;
    if (hudElapsed >= 0.1) {
      telemetry.textContent = `${(vehicle.speed * 3.6).toFixed(0)} km/sa · ${vehicle.contacts.filter(c => c.grounded).length}/12 temas`;
      hudElapsed = 0;
    }
    scene.render();
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
  shadows.dispose();
  keys.dispose();
  document.removeEventListener('visibilitychange', visibility);
  window.removeEventListener('blur', blur);
  visual?.dispose(); vehicle?.dispose(); followCamera.dispose();
  tank?.dispose();
  ground?.dispose();
  scene.dispose();
  engine.dispose();
}
if (import.meta.hot) import.meta.hot.dispose(dispose);
window.addEventListener('pagehide', dispose, { once: true });
