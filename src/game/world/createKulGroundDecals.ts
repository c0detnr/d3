import { optimizeStaticProps } from './optimizeStaticProps.ts';
import { Color3, Mesh, MeshBuilder, RawTexture, StandardMaterial, Texture, type Scene } from '@babylonjs/core';
import { KUL_FIELD_CRATERS } from './kulCraterLayout.ts';
import { KUL_STEP, kulTerrainHeight } from './kulVadisiLayout.ts';

/** Metres. Point-symmetric damp patches, mostly in the shallow field depressions. */
const MUD_HALF = [
  { x: -67, z: -60, width: 15, depth: 11, yaw: 0.4 },
  { x: 9, z: -42, width: 11, depth: 8, yaw: -0.3 },
  { x: 42, z: -100, width: 16, depth: 7, yaw: 0.15 },
  { x: -96, z: -86, width: 10, depth: 7, yaw: 1.1 },
];
const MUD = [...MUD_HALF, ...MUD_HALF.map(p => ({ ...p, x: -p.x, z: -p.z }))];
/** Decals float this far above the analytic or grid-interpolated terrain, in metres. */
const LIFT = 0.04;

/** Visual-only scorch and mud patches; no physics, never pickable. */
export function createKulGroundDecals(scene: Scene) {
  const meshes: Mesh[] = [], materials: StandardMaterial[] = [];
  // Soft radial alpha mask with slight angular breakup; RawTexture works without a canvas.
  const size = 64, data = new Uint8Array(size * size * 4);
  for (let j = 0; j < size; j++) for (let i = 0; i < size; i++) {
    const u = (i + 0.5) / size * 2 - 1, v = (j + 0.5) / size * 2 - 1;
    const wobble = 1 + 0.12 * Math.sin(Math.atan2(v, u) * 5 + 1.3) + 0.06 * Math.sin(Math.atan2(v, u) * 11);
    const t = Math.min(1, Math.hypot(u, v) * wobble);
    const k = (j * size + i) * 4;
    data[k] = data[k + 1] = data[k + 2] = 255;
    data[k + 3] = Math.round(255 * (1 - t * t) ** 1.6);
  }
  const mask = RawTexture.CreateRGBATexture(data, size, size, scene, true, false, Texture.TRILINEAR_SAMPLINGMODE);
  mask.name = 'kul-decal-mask'; mask.hasAlpha = true;
  mask.wrapU = mask.wrapV = Texture.CLAMP_ADDRESSMODE;
  const material = (name: string, color: string, alpha: number) => {
    const m = new StandardMaterial(name, scene);
    m.diffuseColor = Color3.FromHexString(color); m.specularColor = Color3.Black();
    m.diffuseTexture = mask; m.useAlphaFromDiffuseTexture = true; m.alpha = alpha;
    m.zOffset = -2; m.backFaceCulling = true; materials.push(m); return m;
  };
  const burn = material('kul-decal-scorch', '#2E2A24', 0.78);
  const mud = material('kul-decal-mud', '#4A4532', 0.62);

  // Terrain is a 3 m triangle grid; in concave bowls the triangles sit above the analytic surface.
  const grid = (x: number, z: number) => {
    const x0 = Math.floor(x / KUL_STEP) * KUL_STEP, z0 = Math.floor(z / KUL_STEP) * KUL_STEP;
    const tx = (x - x0) / KUL_STEP, tz = (z - z0) / KUL_STEP;
    const a = kulTerrainHeight(x0, z0) * (1 - tx) + kulTerrainHeight(x0 + KUL_STEP, z0) * tx;
    const b = kulTerrainHeight(x0, z0 + KUL_STEP) * (1 - tx) + kulTerrainHeight(x0 + KUL_STEP, z0 + KUL_STEP) * tx;
    return a * (1 - tz) + b * tz;
  };
  const patch = (name: string, x: number, z: number, width: number, depth: number, yaw: number) => {
    const mesh = MeshBuilder.CreateGround(name, { width, height: depth, subdivisions: Math.max(4, Math.ceil(Math.max(width, depth) / 1.5)) }, scene);
    const positions = mesh.getVerticesData('position')!;
    const c = Math.cos(yaw), s = Math.sin(yaw);
    for (let i = 0; i < positions.length; i += 3) {
      const px = x + positions[i] * c + positions[i + 2] * s, pz = z - positions[i] * s + positions[i + 2] * c;
      positions[i] = px; positions[i + 1] = Math.max(kulTerrainHeight(px, pz), grid(px, pz)) + LIFT; positions[i + 2] = pz;
    }
    mesh.updateVerticesData('position', positions);
    mesh.refreshBoundingInfo();
    return mesh;
  };
  const merge = (name: string, parts: Mesh[], mat: StandardMaterial) => {
    const mesh = Mesh.MergeMeshes(parts, true, true)!;
    mesh.name = name; mesh.material = mat; mesh.isPickable = false; mesh.receiveShadows = true;
    mesh.metadata = { battlefield: true, decal: true };
    mesh.freezeWorldMatrix(); meshes.push(mesh); return mesh;
  };
  const scorch: Mesh[] = [];
  for (const [i, c] of KUL_FIELD_CRATERS.entries()) {
    scorch.push(patch(`kul-scorch-${i}`, c.x, c.z, c.radius * 3, c.radius * 2.6, i * 0.9));
    // One offset blast streak per crater breaks up the perfect circle.
    const a = i * 2.4;
    scorch.push(patch(`kul-scorch-streak-${i}`, c.x + Math.cos(a) * c.radius * 1.3, c.z + Math.sin(a) * c.radius * 1.3, c.radius * 2.2, c.radius * 1.1, -a));
  }
  merge('kul-ground-scorch', scorch, burn);
  merge('kul-ground-mud', MUD.map((p, i) => patch(`kul-mud-${i}`, p.x, p.z, p.width, p.depth, p.yaw)), mud);

  optimizeStaticProps(meshes, []);
  return {
    meshes,
    shadowCasters: [] as Mesh[],
    dispose() { meshes.forEach(m => m.dispose()); materials.forEach(m => m.dispose()); mask.dispose(); },
  };
}
