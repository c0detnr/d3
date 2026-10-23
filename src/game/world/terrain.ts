/** Deterministic world coordinates, in metres. Shared by visuals and collision mesh. */
export const TERRAIN_SPAWN = { x: -34, z: -42 };
export const TERRAIN_LIMIT = 160;

const smooth = (value: number) => {
  const t = Math.max(0, Math.min(1, value));
  return t * t * (3 - 2 * t);
};
const hash = (x: number, z: number) => {
  const value = Math.sin(x * 127.1 + z * 311.7) * 43758.5453;
  return value - Math.floor(value);
};
export function terrainNoise(x: number, z: number): number {
  const ix = Math.floor(x), iz = Math.floor(z);
  const tx = smooth(x - ix), tz = smooth(z - iz);
  const a = hash(ix, iz) * (1 - tx) + hash(ix + 1, iz) * tx;
  const b = hash(ix, iz + 1) * (1 - tx) + hash(ix + 1, iz + 1) * tx;
  return a * (1 - tz) + b * tz;
}
export function pathCenter(z: number) {
  return -34 + 12 * Math.sin((z + 42) * 0.018);
}
export function pathWeight(x: number, z: number) {
  return (1 - smooth((Math.abs(x - pathCenter(z)) - 2.8) / 4))
    * (1 - smooth((z - 105) / 30));
}
export function terrainHeight(x: number, z: number) {
  const hills = (terrainNoise(x / 75, z / 75) - 0.45) * 12
    + (terrainNoise(x / 29 + 8, z / 29 - 4) - 0.5) * 3
    + (terrainNoise(x / 11, z / 11) - 0.5) * 0.65;
  const ridges = smooth((Math.hypot(x, z) - 110) / 150) * 28
    * (0.4 + terrainNoise(x / 110 + 30, z / 110) * 0.6);
  const clearing = smooth((Math.hypot(x + 34, z + 42) - 10) / 18);
  return (hills + ridges) * clearing;
}
export function seededRandom(seed: number) {
  let state = seed >>> 0;
  return () => {
    state = (Math.imul(1664525, state) + 1013904223) >>> 0;
    return state / 4294967296;
  };
}
