import { Color3, Mesh, VertexData, type Scene } from '@babylonjs/core';

/** Stable 0..1 hash for grid cells; keeps the facet pattern identical on every load. */
export function cellHash(x: number, z: number, seed: number) {
  let value = Math.imul(x | 0, 374761393) ^ Math.imul(z | 0, 668265263) ^ Math.imul(seed, 69069);
  value = Math.imul(value ^ (value >>> 13), 1274126177);
  value ^= value >>> 16;
  return (value >>> 0) / 4294967296;
}

/** Colour for one facet. `up` is the facet normal's Y (1 = flat); `variation` is 0..1 per facet. */
export type FacetShade = (x: number, y: number, z: number, up: number, variation: number) => Color3;

/**
 * Low-poly terrain in metres. Grid points are jittered (edges stay fixed) and
 * cell diagonals alternate so the triangles read as hand-cut facets. The hidden
 * collider and the visible flat-shaded mesh share the exact same triangles.
 */
export function buildFacetedTerrain(scene: Scene, options: {
  name: string; limit: number; step: number; jitter: number;
  height: (x: number, z: number) => number; shade: FacetShade;
}) {
  const { limit, step, jitter, height, shade } = options;
  const row = Math.round(limit * 2 / step) + 1;
  const grid = new Float32Array(row * row * 3);
  for (let iz = 0; iz < row; iz++) for (let ix = 0; ix < row; ix++) {
    const edge = ix === 0 || iz === 0 || ix === row - 1 || iz === row - 1;
    const x = -limit + ix * step + (edge ? 0 : (cellHash(ix, iz, 1) - 0.5) * 2 * jitter * step);
    const z = -limit + iz * step + (edge ? 0 : (cellHash(ix, iz, 2) - 0.5) * 2 * jitter * step);
    const i = (iz * row + ix) * 3;
    grid[i] = x; grid[i + 1] = height(x, z); grid[i + 2] = z;
  }
  const indices = new Uint32Array((row - 1) * (row - 1) * 6);
  let n = 0;
  for (let iz = 0; iz < row - 1; iz++) for (let ix = 0; ix < row - 1; ix++) {
    const a = iz * row + ix, b = a + 1, c = a + row, d = c + 1;
    if (cellHash(ix, iz, 3) < 0.5) indices.set([a, b, c, b, d, c], n);
    else indices.set([a, b, d, a, d, c], n);
    n += 6;
  }

  const collider = new Mesh(options.name, scene);
  const colliderNormals: number[] = [];
  VertexData.ComputeNormals(grid, indices, colliderNormals);
  const colliderData = new VertexData();
  Object.assign(colliderData, { positions: grid, indices, normals: colliderNormals });
  colliderData.applyToMesh(collider);
  collider.isVisible = false;

  const count = indices.length;
  const positions = new Float32Array(count * 3), normals = new Float32Array(count * 3), colors = new Float32Array(count * 4);
  const visualIndices = new Uint32Array(count);
  for (let t = 0; t < count; t += 3) {
    const p = [indices[t] * 3, indices[t + 1] * 3, indices[t + 2] * 3];
    const ax = grid[p[1]] - grid[p[0]], ay = grid[p[1] + 1] - grid[p[0] + 1], az = grid[p[1] + 2] - grid[p[0] + 2];
    const bx = grid[p[2]] - grid[p[0]], by = grid[p[2] + 1] - grid[p[0] + 1], bz = grid[p[2] + 2] - grid[p[0] + 2];
    let nx = ay * bz - az * by, ny = az * bx - ax * bz, nz = ax * by - ay * bx;
    const length = Math.hypot(nx, ny, nz) || 1;
    const flip = ny < 0 ? -1 : 1;
    nx = nx / length * flip; ny = ny / length * flip; nz = nz / length * flip;
    const cx = (grid[p[0]] + grid[p[1]] + grid[p[2]]) / 3;
    const cy = (grid[p[0] + 1] + grid[p[1] + 1] + grid[p[2] + 1]) / 3;
    const cz = (grid[p[0] + 2] + grid[p[1] + 2] + grid[p[2] + 2]) / 3;
    const color = shade(cx, cy, cz, ny, cellHash(t, 0, 7));
    for (let k = 0; k < 3; k++) {
      const v = t + k;
      positions.set([grid[p[k]], grid[p[k] + 1], grid[p[k] + 2]], v * 3);
      normals.set([nx, ny, nz], v * 3);
      colors.set([color.r, color.g, color.b, 1], v * 4);
      visualIndices[v] = v;
    }
  }
  const visual = new Mesh(`${options.name}-facets`, scene);
  const visualData = new VertexData();
  Object.assign(visualData, { positions, normals, colors, indices: visualIndices });
  visualData.applyToMesh(visual);
  visual.isPickable = false;
  visual.receiveShadows = true;
  return { collider, visual };
}
