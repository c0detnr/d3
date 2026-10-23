/** Deterministic world coordinates, in metres. Shared by visuals and collision mesh. */
export const TERRAIN_SPAWN = { x: -34, z: -42 };
export const TERRAIN_LIMIT = 160;

export const smooth = (value: number) => {
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

/** Irregular plateau rim; the detailed playable area ends at this escarpment. */
export function terrainRim(x: number, z: number) {
  const angle = Math.atan2(z, x);
  const radius = Math.hypot(x, z);
  const radiusNoise = terrainNoise(Math.cos(angle) * 2.3 + 13.1, Math.sin(angle) * 2.3 - 7.4);
  const jaggedNoise = terrainNoise(Math.cos(angle) * 7.6 - 2.9, Math.sin(angle) * 7.6 + 5.3);
  const strengthNoise = terrainNoise(Math.cos(angle) * 4.1 - 3.7, Math.sin(angle) * 4.1 + 9.2);
  return {
    radius,
    edge: 136 + radiusNoise * 20 + (jaggedNoise - 0.5) * 9,
    drop: 22 + strengthNoise * 10 + (terrainNoise(Math.cos(angle) * 11.3, Math.sin(angle) * 11.3) - 0.5) * 7,
    faceWidth: 6 + terrainNoise(x / 23 + 4, z / 23 - 6) * 4,
  };
}

export function terrainHeight(x: number, z: number) {
  const clearing = smooth((Math.hypot(x + 34, z + 42) - 10) / 18);
  const rim = terrainRim(x, z);
  const warpX = (terrainNoise(x / 190 + 5.2, z / 190 - 3.7) - 0.5) * 72;
  const warpZ = (terrainNoise(x / 190 - 2.3, z / 190 + 7.1) - 0.5) * 72;
  const wx = x + warpX, wz = z + warpZ;
  const hills = (terrainNoise(wx / 96, wz / 96) - 0.44) * 11
    + (terrainNoise(wx / 40 + 8, wz / 40 - 4) - 0.5) * 5.4
    + (terrainNoise(wx / 16, wz / 16) - 0.5) * 1.5
    + (terrainNoise(wx / 7, wz / 7) - 0.5) * 0.4;
  const ridgeField = 1 - Math.abs(terrainNoise(wx / 55 + 21, wz / 55 - 9) * 2 - 1);
  const ridgeMask = smooth((rim.radius - 34) / 60);
  const ridges = Math.pow(ridgeField, 1.7) * 4.4 * ridgeMask;
  const gullyField = 1 - Math.abs(terrainNoise(wx / 33 + 3, wz / 33 - 11) * 2 - 1);
  const gullies = -Math.pow(gullyField, 3) * 2.8 * smooth((rim.radius - 20) / 55);
  const upperFace = smooth((rim.radius - rim.edge) / rim.faceWidth);
  const lowerFace = smooth((rim.radius - rim.edge - rim.faceWidth * 2.4) / (rim.faceWidth * 0.9));
  const escarpment = -rim.drop * (upperFace * 0.58 + lowerFace * 0.42);
  const farRidge = 1 - Math.abs(terrainNoise(x / 130 + 40, z / 130 - 17) * 2 - 1);
  const highlands = smooth((rim.radius - 205) / 280) * (34 + Math.pow(farRidge, 1.6) * 30);
  return (hills + ridges + gullies) * clearing + escarpment + highlands;
}

export function terrainSlope(x: number, z: number) {
  const sample = 1.5;
  const dx = terrainHeight(x + sample, z) - terrainHeight(x - sample, z);
  const dz = terrainHeight(x, z + sample) - terrainHeight(x, z - sample);
  return Math.hypot(dx, dz) / (sample * 2);
}
export function seededRandom(seed: number) {
  let state = seed >>> 0;
  return () => {
    state = (Math.imul(1664525, state) + 1013904223) >>> 0;
    return state / 4294967296;
  };
}
