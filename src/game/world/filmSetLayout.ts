import { smooth, terrainNoise } from './terrain.ts';

/**
 * Film set ("Çekim Sahası", ?map=set): an open training ground built for content shots.
 * Metres; the tank spawns at FILM_SPAWN facing +Z. Every lane is clear of props so the
 * studio cameras (side 9 m, flyby 5 m, orbit 11 m) never clip into scenery.
 */
export const FILM_LIMIT = 240;
export const FILM_STEP = 2;
export const FILM_SPAWN = { x: 0, z: -170 };

/** Straight graded runway along x = 0. */
export const RUNWAY = { halfWidth: 7, zMin: -205, zMax: 172 };
/** Washboard lane for suspension and stabiliser shots; bump period and height in metres. */
export const WHOOPS = { x: 46, halfWidth: 6, zMin: -140, zMax: 80, period: 12, height: 0.5 };
/** Ridge crossing the west lane; the tank crests it against the sky. */
export const RIDGE = { x: -55, halfWidth: 22, z: 0, height: 7, length: 26 };
/** Flat concrete pad at the runway end for orbit and turntable shots. */
export const PAD = { x: 0, z: 192, radius: 30 };
/** Firing range east of the pad; hulks face the pad. */
export const RANGE_TARGETS = [{ x: 112, z: 186 }, { x: 142, z: 168 }, { x: 166, z: 204 }];
export const RANGE_BERM = { x: 190, zMin: 140, zMax: 235, height: 6 };

const band = (distance: number, inner: number, fade: number) => 1 - smooth((distance - inner) / fade);

export function runwayWeight(x: number, z: number) {
  return band(Math.abs(x), RUNWAY.halfWidth, 6) * band(Math.max(RUNWAY.zMin - z, z - RUNWAY.zMax, 0), 0, 8);
}
export function whoopsWeight(x: number, z: number) {
  return band(Math.abs(x - WHOOPS.x), WHOOPS.halfWidth, 4) * band(Math.max(WHOOPS.zMin - z, z - WHOOPS.zMax, 0), 0, 10);
}
export function padWeight(x: number, z: number) {
  return band(Math.hypot(x - PAD.x, z - PAD.z), PAD.radius, 8);
}

/** Smooth dunes away from the lanes, rising to a rim of hills that closes the horizon. */
export function filmSetHeight(x: number, z: number) {
  const radius = Math.max(Math.abs(x), Math.abs(z));
  const dunes = (terrainNoise(x / 48 + 3, z / 48 - 5) - 0.5) * 3.2 + (terrainNoise(x / 17 - 7, z / 17 + 2) - 0.5) * 0.9;
  const rim = smooth((radius - 195) / 40) * (10 + terrainNoise(x / 30, z / 30) * 8);
  const flatten = Math.max(runwayWeight(x, z), whoopsWeight(x, z), padWeight(x, z));
  let height = (dunes + rim) * (1 - flatten);

  // Whoops: alternating left/right phase so the hull both pitches and rolls.
  const w = whoopsWeight(x, z);
  if (w > 0) {
    const side = (x - WHOOPS.x) / WHOOPS.halfWidth;
    const phase = (z - WHOOPS.zMin) / WHOOPS.period * Math.PI * 2 + side * 0.9;
    height += w * WHOOPS.height * (0.5 - 0.5 * Math.cos(phase)) * smooth((z - WHOOPS.zMin) / 8);
  }

  const ridgeAcross = band(Math.abs(x - RIDGE.x), RIDGE.halfWidth, 14);
  height += ridgeAcross * RIDGE.height * Math.exp(-(((z - RIDGE.z) / RIDGE.length) ** 2));

  const berm = band(Math.abs(x - RANGE_BERM.x), 3, 8) * band(Math.max(RANGE_BERM.zMin - z, z - RANGE_BERM.zMax, 0), 0, 10);
  height += berm * RANGE_BERM.height;
  return height;
}

/** Named start marks (?spawn=…); yaw in radians, 0 = facing +Z. Studio takes stay tied to their mark. */
export const FILM_SPOTS = {
  runway: { x: FILM_SPAWN.x, z: FILM_SPAWN.z, yaw: 0 },
  whoops: { x: WHOOPS.x, z: WHOOPS.zMin - 14, yaw: 0 },
  ridge: { x: RIDGE.x, z: RIDGE.z - 75, yaw: 0 },
  pad: { x: PAD.x, z: PAD.z, yaw: 0 },
  range: { x: PAD.x + 14, z: PAD.z, yaw: Math.PI / 2 },
} as const;
export type FilmSpot = keyof typeof FILM_SPOTS;
export function filmSpotFromSearch(search: string): FilmSpot {
  const value = new URLSearchParams(search).get('spawn');
  return value && value in FILM_SPOTS ? value as FilmSpot : 'runway';
}
