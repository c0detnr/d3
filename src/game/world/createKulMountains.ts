import { optimizeStaticProps } from './optimizeStaticProps.ts';
import { Color3, Mesh, Scene as BabylonScene, StandardMaterial, VertexData, type Scene } from '@babylonjs/core';
import { KUL_ATMOSPHERE } from './atmosphereSettings.ts';
import { cellHash } from './facetedTerrain.ts';
import { smooth, terrainNoise } from './terrain.ts';

const hex = Color3.FromHexString;
const ROCK = hex('#7E7B72'), ROCK_DARK = hex('#68665F'), FOREST = hex('#596340'), DIRT = hex('#8C7855');

/**
 * Three layers measured as Chebyshev distance from the map centre (square rings).
 * Farther layers are higher, coarser and hazier. Heights are metres above y = 0.
 */
export const KUL_MOUNTAIN_LAYERS = [
  { start: 356, crest: 410, end: 470, height: 38, segments: 120, haze: 0.28, seed: 11 },
  { start: 440, crest: 520, end: 620, height: 70, segments: 72, haze: 0.55, seed: 23 },
  { start: 580, crest: 690, end: 820, height: 115, segments: 40, haze: 0.8, seed: 37 },
];

/** Purely visual ridge ring around the playable square: no physics, not pickable, no shadows. */
export function createKulMountains(scene: Scene, limit = 360) {
  /** Distant layers are baked toward the scene fog tone (fog is off for this mesh); the active weather sets it. */
  const HAZE = scene.fogMode === BabylonScene.FOGMODE_NONE ? KUL_ATMOSPHERE.fog.color : scene.fogColor.clone();
  const material = new StandardMaterial('kul-mountains', scene);
  material.diffuseColor = Color3.White(); material.specularColor = Color3.Black();
  material.emissiveColor = new Color3(0.08, 0.08, 0.07);
  // Calm weather keeps the baked haze only; fog, rain and night haze swallow the ring like the rest of the world.
  material.fogEnabled = scene.fogDensity > 0;
  const meshes: Mesh[] = [];
  const scale = limit / 360;

  KUL_MOUNTAIN_LAYERS.forEach((layer, li) => {
    const n = layer.segments, profile = 4; // inner base, slope, crest, outer base
    const grid = new Float32Array(n * profile * 3);
    const info: { quarry: number; wooded: number }[] = [];
    for (let i = 0; i < n; i++) {
      const a = i / n * Math.PI * 2, c = Math.cos(a), s = Math.sin(a);
      const k = 1 / Math.max(Math.abs(c), Math.abs(s)); // Chebyshev -> Euclidean
      const quarry = smooth((c - 0.35) / 0.5), wooded = smooth((-c - 0.35) / 0.5);
      info.push({ quarry, wooded });
      const ridge = 0.45 + 0.55 * terrainNoise(c * 2.3 + layer.seed, s * 2.3 - layer.seed)
        + 0.25 * (terrainNoise(c * 6 + layer.seed, s * 6) - 0.5);
      const peak = layer.height * ridge * (1 + 0.25 * wooded - 0.3 * quarry);
      const j = (p: number) => (cellHash(i, p, layer.seed) - 0.5);
      const radial = [layer.start, (layer.start + layer.crest) / 2 + j(1) * 14, layer.crest + j(2) * 22, layer.end];
      const heights = [-4, peak * 0.55 + j(3) * peak * 0.14, quarry > 0.5 ? peak * 0.8 : peak, -6];
      for (let p = 0; p < profile; p++) {
        const t = radial[p] * scale * k, o = (i * profile + p) * 3;
        grid[o] = c * t; grid[o + 1] = heights[p]; grid[o + 2] = s * t;
      }
    }
    const positions: number[] = [], colors: number[] = [], indices: number[] = [];
    const tint = (ox: number, oy: number, oz: number, ny: number, v: number, i: number) => {
      const { quarry, wooded } = info[i];
      let base = ny < 0.72 ? (v < 0.5 ? ROCK : ROCK_DARK) : ROCK;
      if (ny >= 0.72) base = Color3.Lerp(base, wooded > 0.4 ? FOREST : quarry > 0.4 ? DIRT : ROCK_DARK, 0.6);
      void ox; void oz;
      const shade = 0.9 + v * 0.16 + Math.min(1, Math.max(0, oy / 90)) * 0.08;
      return Color3.Lerp(base.scale(shade), HAZE, layer.haze);
    };
    for (let i = 0; i < n; i++) {
      const i2 = (i + 1) % n;
      for (let p = 0; p < profile - 1; p++) {
        const v = (q: number, r: number) => (q * profile + r) * 3;
        const a = v(i, p), b = v(i2, p), c = v(i, p + 1), d = v(i2, p + 1);
        const tris = cellHash(i, p, layer.seed + 5) < 0.5 ? [[a, b, c], [b, d, c]] : [[a, b, d], [a, d, c]];
        for (const t of tris) {
          const [p0, p1, p2] = t;
          const ax = grid[p1] - grid[p0], ay = grid[p1 + 1] - grid[p0 + 1], az = grid[p1 + 2] - grid[p0 + 2];
          const bx = grid[p2] - grid[p0], by = grid[p2 + 1] - grid[p0 + 1], bz = grid[p2 + 2] - grid[p0 + 2];
          const ny = az * bx - ax * bz; // y of cross(a, b) before orientation fix
          const nx = ay * bz - az * by, nz = ax * by - ay * bx;
          const len = Math.hypot(nx, ny, nz) || 1;
          const up = Math.abs(ny) / len;
          const cy = (grid[p0 + 1] + grid[p1 + 1] + grid[p2 + 1]) / 3;
          const color = tint(0, cy, 0, up, cellHash(i, p * 2 + (t === tris[0] ? 0 : 1), layer.seed + 9), i);
          const base = positions.length / 3;
          // Face upward so the single-sided mesh is visible from outside the ring.
          const order = ny >= 0 ? t : [p0, p2, p1];
          for (const q of order) { positions.push(grid[q], grid[q + 1], grid[q + 2]); colors.push(color.r, color.g, color.b, 1); }
          indices.push(base, base + 1, base + 2);
        }
      }
    }
    const normals: number[] = [];
    VertexData.ComputeNormals(positions, indices, normals);
    const mesh = new Mesh(`kul-mountains-${li}`, scene);
    const data = new VertexData();
    Object.assign(data, { positions, indices, normals, colors });
    data.applyToMesh(mesh);
    mesh.material = material; mesh.isPickable = false; mesh.receiveShadows = false;
    mesh.checkCollisions = false; mesh.alwaysSelectAsActiveMesh = true; mesh.doNotSyncBoundingInfo = false;
    meshes.push(mesh);
  });
  optimizeStaticProps(meshes, []);
  return { meshes, material, dispose() { meshes.forEach(m => m.dispose()); material.dispose(); } };
}
