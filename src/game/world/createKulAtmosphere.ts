import {
  Color3, Color4, Material, MeshBuilder, ParticleSystem, RawTexture, StandardMaterial, Texture, Vector3,
  VertexBuffer, Scene, type Mesh, type Observer,
} from '@babylonjs/core';
import { KUL_FIELD_RELIEF } from './kulBattlefieldLayout.ts';
import { KUL_FIELD_LANDMARKS } from './kulLandmarkLayout.ts';
import { kulTerrainHeight } from './kulVadisiLayout.ts';

/** Metres and metres per second. Render-side ambience only: no physics, picking or shadows. */
export const KUL_ATMOSPHERE = {
  wreckSmokeHeight: 2.4,
  /** Constant drift (m/s²) applied to smoke as gravity: plumes lean east-north-east. */
  wind: new Vector3(0.16, 0.04, 0.07),
  dustArea: { minX: -115, maxX: 115, minZ: -160, maxZ: 160 },
  budget: { wreckSmoke: 110, ruinWisp: 36, dust: 240 },
  fogLift: 0.9,
} as const;

/** Soft radial alpha sprite; white RGB so particle/material colours tint it. */
function createSoftSprite(scene: Scene) {
  const size = 64, data = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const r = Math.hypot((x + 0.5) / size * 2 - 1, (y + 0.5) / size * 2 - 1);
    const a = Math.max(0, 1 - r) ** 2 * (3 - 2 * Math.max(0, 1 - r)); // smoothstep falloff
    data.set([255, 255, 255, Math.round(a * 255)], (y * size + x) * 4);
  }
  const texture = RawTexture.CreateRGBATexture(data, size, size, scene, true, false, Texture.TRILINEAR_SAMPLINGMODE);
  texture.name = 'kul-atmosphere-soft';
  texture.hasAlpha = true;
  texture.wrapU = texture.wrapV = Texture.CLAMP_ADDRESSMODE;
  return texture;
}

export function createKulAtmosphere(scene: Scene): { dispose(): void; meshes: Mesh[] } {
  const texture = createSoftSprite(scene);
  // Ambience follows the weather: tints derive from the scene fog, scaled so the storm preset keeps its original colours.
  const fog = scene.fogMode === Scene.FOGMODE_NONE ? new Color3(0.45, 0.42, 0.37) : scene.fogColor;
  const brightness = Math.min(1.5, Math.max(0.3, (fog.r + fog.g + fog.b) / 3 / 0.413));
  const haze = new Color3(Math.min(0.75, fog.r * 1.5), Math.min(0.75, fog.g * 1.5), Math.min(0.75, fog.b * 1.5));
  const systems: ParticleSystem[] = [];
  const meshes: Mesh[] = [];
  const materials: StandardMaterial[] = [];

  const particles = (name: string, capacity: number) => {
    const ps = new ParticleSystem(name, capacity, scene);
    ps.particleTexture = texture;
    ps.blendMode = ParticleSystem.BLENDMODE_STANDARD;
    ps.isLocal = false;
    ps.preWarmStepOffset = 10;
    ps.preWarmCycles = 60;
    systems.push(ps);
    return ps;
  };

  const plume = (name: string, x: number, z: number, y: number, capacity: number, dark: boolean) => {
    const ps = particles(name, capacity);
    ps.emitter = new Vector3(x, y, z);
    ps.createCylinderEmitter(dark ? 0.6 : 0.4, 0.1, 0, 0);
    ps.minLifeTime = dark ? 8 : 5; ps.maxLifeTime = dark ? 11 : 7;
    ps.emitRate = capacity / (dark ? 10 : 6.5);
    ps.minEmitPower = dark ? 0.55 : 0.35; ps.maxEmitPower = dark ? 0.8 : 0.5;
    ps.gravity = KUL_ATMOSPHERE.wind.clone();
    ps.minAngularSpeed = -0.15; ps.maxAngularSpeed = 0.15;
    ps.minInitialRotation = 0; ps.maxInitialRotation = Math.PI * 2;
    ps.minSize = 1; ps.maxSize = 1;
    ps.addSizeGradient(0, dark ? 0.9 : 0.6); ps.addSizeGradient(1, dark ? 5 : 2.8);
    // Pale, slightly warm greys; alpha stays low so the plume reads as haze, not a pillar.
    const tone = (dark ? new Color3(0.26, 0.24, 0.22) : new Color3(0.68, 0.65, 0.6)).scale(brightness);
    const peak = dark ? 0.32 : 0.14;
    ps.addColorGradient(0, Color4.FromColor3(tone, 0));
    ps.addColorGradient(0.12, Color4.FromColor3(tone, peak));
    ps.addColorGradient(0.6, Color4.FromColor3(tone.scale(1.35), peak * 0.6));
    ps.addColorGradient(1, Color4.FromColor3(tone.scale(1.6), 0));
    ps.metadata = { atmosphere: dark ? 'wreck-smoke' : 'ruin-wisp', source: { x, y, z } };
    ps.start();
  };

  for (const l of KUL_FIELD_LANDMARKS) {
    const ground = kulTerrainHeight(l.x, l.z);
    if (l.kind === 'wreck') plume(`kul-smoke-${l.id}`, l.x, l.z, ground + KUL_ATMOSPHERE.wreckSmokeHeight, KUL_ATMOSPHERE.budget.wreckSmoke, true);
    // Both ruins smoulder faintly so the point-symmetric field stays equal for both teams.
    else plume(`kul-wisp-${l.id}`, l.x, l.z, ground + 1.2, KUL_ATMOSPHERE.budget.ruinWisp, false);
  }

  // Sparse airborne dust fixed to the central field, not the camera.
  const { minX, maxX, minZ, maxZ } = KUL_ATMOSPHERE.dustArea;
  const dust = particles('kul-field-dust', KUL_ATMOSPHERE.budget.dust);
  dust.emitter = Vector3.Zero();
  dust.startPositionFunction = (_matrix, position) => {
    const x = minX + Math.random() * (maxX - minX), z = minZ + Math.random() * (maxZ - minZ);
    position.set(x, kulTerrainHeight(x, z) + 0.8 + Math.random() * 7, z);
  };
  dust.direction1 = new Vector3(-0.25, -0.05, -0.15); dust.direction2 = new Vector3(0.35, 0.08, 0.25);
  dust.minEmitPower = 0.2; dust.maxEmitPower = 0.5;
  dust.minLifeTime = 14; dust.maxLifeTime = 22;
  dust.emitRate = KUL_ATMOSPHERE.budget.dust / 18;
  dust.minSize = 0.06; dust.maxSize = 0.16;
  dust.addColorGradient(0, Color4.FromColor3(haze, 0));
  dust.addColorGradient(0.2, Color4.FromColor3(haze, 0.45));
  dust.addColorGradient(0.8, Color4.FromColor3(haze, 0.45));
  dust.addColorGradient(1, Color4.FromColor3(haze, 0));
  dust.preWarmCycles = 120;
  dust.metadata = { atmosphere: 'field-dust' };
  dust.start();

  // Low fog pooled in negative relief: flat at the bowl floor, draped over the rim, radial fade.
  KUL_FIELD_RELIEF.filter(p => p.height < 0 && false).forEach((p, index) => {
    const floor = kulTerrainHeight(p.x, p.z);
    const mesh = MeshBuilder.CreateGround(`kul-low-fog-${index}`, { width: p.rx * 2.2, height: p.rz * 2.2, subdivisions: 18, updatable: true }, scene);
    mesh.position.set(p.x, floor, p.z);
    const positions = mesh.getVerticesData(VertexBuffer.PositionKind)!;
    for (let i = 0; i < positions.length; i += 3) {
      const x = p.x + positions[i], z = p.z + positions[i + 2];
      positions[i + 1] = Math.max(kulTerrainHeight(x, z) + 0.35, floor + KUL_ATMOSPHERE.fogLift) - floor;
    }
    mesh.updateVerticesData(VertexBuffer.PositionKind, positions);
    mesh.refreshBoundingInfo();
    const material = new StandardMaterial(`kul-low-fog-${index}`, scene);
    material.diffuseTexture = texture;
    material.useAlphaFromDiffuseTexture = true;
    material.diffuseColor = haze.clone();
    material.specularColor = Color3.Black();
    material.disableLighting = true;
    material.alpha = 0.2;
    material.backFaceCulling = false;
    material.transparencyMode = Material.MATERIAL_ALPHABLEND;
    mesh.material = material;
    mesh.isPickable = false;
    mesh.receiveShadows = false;
    mesh.checkCollisions = false;
    mesh.metadata = { atmosphere: 'low-fog' };
    materials.push(material); meshes.push(mesh);
  });

  // Slow breathing of fog opacity; time-based so it is frame-rate independent.
  let time = 0;
  const observer: Observer<Scene> | null = scene.onBeforeRenderObservable.add(() => {
    time += scene.getEngine().getDeltaTime() / 1000;
    materials.forEach((m, i) => { m.alpha = 0.17 + 0.05 * Math.sin(time * 0.18 + i * 1.7); });
  });

  return {
    meshes,
    dispose() {
      observer?.remove();
      systems.forEach(ps => ps.dispose(false));
      meshes.forEach(m => m.dispose());
      materials.forEach(m => m.dispose());
      texture.dispose();
      systems.length = meshes.length = materials.length = 0;
    },
  };
}
