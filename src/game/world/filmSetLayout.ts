import { smooth, terrainNoise } from './terrain.ts';

/**
 * Film set ("Çekim Sahası", ?map=set): an open training ground built for content shots.
 * Metres; the tank spawns at FILM_SPAWN facing +Z. Every lane is clear of props so the
 * studio cameras (side 9 m, flyby 5 m, orbit 11 m) never clip into scenery.
 */
export const FILM_LIMIT = 420;
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

/** GLB footprints in metres; yaw in radians. Kept outside the camera lanes. */
export const FILM_BUILDINGS = [
  { id: 'film-hangar', kind: 'hangar', x: -70, z: -150, yaw: 0, width: 39.32, depth: 23.43, height: 11.74 },
  { id: 'film-workshop', kind: 'workshop', x: 82, z: -115, yaw: Math.PI / 2, width: 23, depth: 13.6, height: 6.71 },
  { id: 'film-command', kind: 'command', x: -90, z: 205, yaw: 0.35, width: 29, depth: 23.05, height: 14.55 },
  { id: 'film-ruin', kind: 'ruin', x: -100, z: -25, yaw: -0.4, width: 11.62, depth: 8.75, height: 6.09 },
  { id: 'film-wreck', kind: 'wreck', x: 28, z: 110, yaw: 0.9, width: 7.35, depth: 3.72, height: 2.51 },
  { id: 'film-emplacement', kind: 'emplacement', x: 40, z: 215, yaw: -Math.PI / 2, width: 8.4, depth: 3.5, height: 2.672 },
] as const;

/**
 * Military airfield east of the original set (metres). Runway runs north–south along +Z;
 * hangar doors face +X toward the apron. All airfield ground is graded flat to y = 0.
 */
export const AIRFIELD = {
  runway: { x: 330, halfWidth: 15, zMin: -320, zMax: 320 },
  taxiway: { x: 286, halfWidth: 9, zMin: -290, zMax: 290 },
  /** Taxiway ↔ runway links (z centres). */
  links: [-290, 0, 290],
  linkHalfWidth: 9,
  apron: { xMin: 222, xMax: 277, zMin: -160, zMax: 160 },
  /** Shelter row on the apron's west edge; front (door) faces +X. */
  hangarRow: { xMin: 186, xMax: 222, zMin: -150, zMax: 150 },
  /** Approach light bars beyond each runway end. */
  approachLength: 48,
} as const;

/** Hangars: `shelter` = hardened arch, `hall` = large maintenance hall. x/z = door centre. */
export const AIRFIELD_HANGARS = [
  { id: 'af-shelter-1', kind: 'shelter', x: 222, z: -115, width: 24, length: 34, height: 10 },
  { id: 'af-shelter-2', kind: 'shelter', x: 222, z: -80, width: 24, length: 34, height: 10 },
  { id: 'af-shelter-3', kind: 'shelter', x: 222, z: 80, width: 24, length: 34, height: 10 },
  { id: 'af-hall', kind: 'hall', x: 222, z: 0, width: 54, length: 36, height: 15 },
] as const;

/** Aircraft parking stands for later: x, z in metres, yaw in radians (0 = nose +Z). */
export const AIRFIELD_STANDS = [
  ...AIRFIELD_HANGARS.map(h => ({ id: `${h.id}-bay`, x: h.x - h.length / 2, z: h.z, yaw: Math.PI / 2, covered: true })),
  ...[-135, -100, -45, 45, 100, 135].map((z, i) => ({ id: `af-apron-${i + 1}`, x: 258, z, yaw: -Math.PI / 2, covered: false })),
];

/** Control tower and fuel farm sit south of the apron, clear of the taxi lanes. */
export const AIRFIELD_TOWER = { x: 250, z: -205 };
export const AIRFIELD_FUEL = { x: 236, z: 200 };

/**
 * River west of the set (metres). Centre line meanders around x = -205 along +Z and runs into the rim.
 * Bed sits `depth` below the graded bank; the water surface is flat at `level`. Steep banks keep tanks
 * on the three crossings: road bridge, shallow ford and a collapsed bridge (cover only).
 */
export const RIVER = { x: -205, amplitude: 14, wavelength: 70, innerHalf: 7, bank: 6, depth: 3.2, level: -1, waterHalf: 16 } as const;
export const riverCenterX = (z: number) => RIVER.x + RIVER.amplitude * Math.sin(z / RIVER.wavelength);
/** Ford: shallow bed and long gentle banks around z. */
export const RIVER_FORD = { z: -110, halfLength: 9, fade: 14, depth: 1.5, bank: 20 } as const;
export const RIVER_BRIDGE = { z: 60, halfLength: 16, halfWidth: 4.5, deckY: 0.15 } as const;
export const RIVER_BROKEN_BRIDGE = { z: 230, halfLength: 16, halfWidth: 4 } as const;

/** Village crossroads beyond the river; ground inside `area` is graded flat. */
export const VILLAGE = { x: -300, z: 60, area: { xMin: -362, xMax: -246, zMin: -20, zMax: 150 }, plazaRadius: 3 } as const;
export type VillageKind = 'house' | 'shop' | 'church' | 'barn' | 'ruin';
/** Footprints in metres: width along X, depth along Z before yaw. `floors` × 3 m walls. */
export const VILLAGE_BUILDINGS: readonly { id: string; kind: VillageKind; x: number; z: number; width: number; depth: number; floors: number; yaw: number }[] = [
  { id: 'vl-shop', kind: 'shop', x: -284, z: 75, width: 12, depth: 10, floors: 2, yaw: 0 },
  { id: 'vl-house-ne1', kind: 'house', x: -266, z: 76, width: 9, depth: 9, floors: 1, yaw: 0.05 },
  { id: 'vl-house-ne2', kind: 'house', x: -286, z: 101, width: 8, depth: 10, floors: 1, yaw: Math.PI / 2 },
  { id: 'vl-church', kind: 'church', x: -322, z: 84, width: 12, depth: 20, floors: 2, yaw: 0 },
  { id: 'vl-house-nw', kind: 'house', x: -346, z: 75, width: 9, depth: 9, floors: 1, yaw: -0.06 },
  { id: 'vl-barn', kind: 'barn', x: -332, z: 124, width: 14, depth: 10, floors: 2, yaw: 0.1 },
  { id: 'vl-house-sw1', kind: 'house', x: -315, z: 45, width: 10, depth: 9, floors: 2, yaw: 0 },
  { id: 'vl-ruin', kind: 'ruin', x: -340, z: 44, width: 10, depth: 9, floors: 2, yaw: 0.12 },
  { id: 'vl-house-sw2', kind: 'house', x: -314, z: 20, width: 9, depth: 8, floors: 1, yaw: Math.PI / 2 },
  { id: 'vl-house-se1', kind: 'house', x: -284, z: 45, width: 11, depth: 9, floors: 2, yaw: 0 },
  { id: 'vl-house-se2', kind: 'house', x: -264, z: 44, width: 9, depth: 9, floors: 1, yaw: -0.08 },
  { id: 'vl-house-se3', kind: 'house', x: -285, z: 19, width: 9, depth: 8, floors: 1, yaw: 0 },
];

/** Fuel depot north of the pad; road reaches it from the pad and continues to the airfield. */
export const FUEL_DEPOT = {
  area: { xMin: 38, xMax: 152, zMin: 312, zMax: 362 },
  tanks: [{ x: 56, z: 342 }, { x: 78, z: 342 }, { x: 100, z: 342 }],
  tankDiameter: 16, tankHeight: 10,
  bund: { xMin: 45, xMax: 111, zMin: 331, zMax: 355 },
  gantry: { x: 134, z: 330, width: 18, depth: 16, height: 6.5 },
  /** Truck gate in the south fence, x range. */
  gate: { xMin: 120, xMax: 148 },
} as const;

/** Graded roads: polylines in metres; `kind` picks the surface colour. */
export const FILM_ROADS = [
  { id: 'road-village', kind: 'asphalt', halfWidth: 4.5, points: [{ x: -8, z: 60 }, { x: -362, z: 60 }] },
  { id: 'road-village-ns', kind: 'asphalt', halfWidth: 4, points: [{ x: -300, z: -60 }, { x: -300, z: 190 }] },
  { id: 'road-depot', kind: 'asphalt', halfWidth: 4.5, points: [{ x: 0, z: 220 }, { x: 0, z: 305 }, { x: 196, z: 305 }] },
  { id: 'track-ford', kind: 'track', halfWidth: 3.5, points: [{ x: -36, z: -102 }, { x: riverCenterX(RIVER_FORD.z), z: RIVER_FORD.z }, { x: -300, z: -60 }] },
] as const;

const band = (distance: number, inner: number, fade: number) => 1 - smooth((distance - inner) / fade);
function segmentDistance(x: number, z: number, a: { x: number; z: number }, b: { x: number; z: number }) {
  const dx = b.x - a.x, dz = b.z - a.z;
  const t = Math.max(0, Math.min(1, ((x - a.x) * dx + (z - a.z) * dz) / (dx * dx + dz * dz)));
  return Math.hypot(x - a.x - dx * t, z - a.z - dz * t);
}
/** 1 on the road surface of the given kind (or any kind), fading over `fade` metres. */
export function roadWeight(x: number, z: number, kind?: 'asphalt' | 'track', fade = 1.5) {
  let w = 0;
  for (const road of FILM_ROADS) {
    if (kind && road.kind !== kind) continue;
    for (let i = 1; i < road.points.length; i++)
      w = Math.max(w, band(segmentDistance(x, z, road.points[i - 1], road.points[i]), road.halfWidth, fade));
  }
  return w;
}
/** 0..1 across the river channel: 1 on the bed, 0 at the top of the banks. Also returns local depth. */
export function riverProfile(x: number, z: number) {
  const ford = band(Math.abs(z - RIVER_FORD.z), RIVER_FORD.halfLength, RIVER_FORD.fade);
  const bank = RIVER.bank + (RIVER_FORD.bank - RIVER.bank) * ford;
  const depth = RIVER.depth + (RIVER_FORD.depth - RIVER.depth) * ford;
  return { weight: band(Math.abs(x - riverCenterX(z)), RIVER.innerHalf, bank), depth };
}
const rect = (x: number, z: number, r: { xMin: number; xMax: number; zMin: number; zMax: number }, fade: number) =>
  band(Math.max(r.xMin - x, x - r.xMax, 0), 0, fade) * band(Math.max(r.zMin - z, z - r.zMax, 0), 0, fade);
const strip = (s: { x: number; halfWidth: number; zMin: number; zMax: number }) =>
  ({ xMin: s.x - s.halfWidth, xMax: s.x + s.halfWidth, zMin: s.zMin, zMax: s.zMax });

/** 1 on paved airfield surfaces (runway, taxiway, links, apron). */
export function airfieldPavedWeight(x: number, z: number) {
  const { runway, taxiway, apron, links, linkHalfWidth } = AIRFIELD;
  let w = Math.max(rect(x, z, strip(runway), 2), rect(x, z, strip(taxiway), 2), rect(x, z, apron, 2));
  for (const lz of links) w = Math.max(w, rect(x, z, { xMin: taxiway.x, xMax: runway.x, zMin: lz - linkHalfWidth, zMax: lz + linkHalfWidth }, 2));
  return w;
}
/** 1 across the whole graded airfield, including shoulders, hangar row, tower and fuel farm. */
export function airfieldGradeWeight(x: number, z: number) {
  const { runway, apron, hangarRow, approachLength } = AIRFIELD;
  return Math.max(
    rect(x, z, { xMin: hangarRow.xMin - 8, xMax: runway.x + runway.halfWidth + 22, zMin: runway.zMin - approachLength - 6, zMax: runway.zMax + approachLength + 6 }, 24),
    rect(x, z, { xMin: hangarRow.xMin - 8, xMax: apron.xMax, zMin: AIRFIELD_TOWER.z - 25, zMax: AIRFIELD_FUEL.z + 25 }, 20),
  );
}

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
  const rim = smooth((radius - (FILM_LIMIT - 45)) / 40) * (10 + terrainNoise(x / 30, z / 30) * 8);
  const flatten = Math.max(runwayWeight(x, z), whoopsWeight(x, z), padWeight(x, z), airfieldGradeWeight(x, z),
    roadWeight(x, z, undefined, 10), rect(x, z, VILLAGE.area, 18), rect(x, z, FUEL_DEPOT.area, 14));
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

  // River carves last so roads dip into it under the bridge and at the ford.
  const river = riverProfile(x, z);
  return height * (1 - river.weight) - river.depth * river.weight;
}

/** Named start marks (?spawn=…); yaw in radians, 0 = facing +Z. Studio takes stay tied to their mark. */
export const FILM_SPOTS = {
  runway: { x: FILM_SPAWN.x, z: FILM_SPAWN.z, yaw: 0 },
  whoops: { x: WHOOPS.x, z: WHOOPS.zMin - 14, yaw: 0 },
  ridge: { x: RIDGE.x, z: RIDGE.z - 75, yaw: 0 },
  pad: { x: PAD.x, z: PAD.z, yaw: 0 },
  range: { x: PAD.x + 14, z: PAD.z, yaw: Math.PI / 2 },
  airfield: { x: 248, z: -20, yaw: Math.PI / 2 },
  bridge: { x: riverCenterX(RIVER_BRIDGE.z) + 45, z: RIVER_BRIDGE.z, yaw: -Math.PI / 2 },
  village: { x: VILLAGE.x + 40, z: VILLAGE.z, yaw: -Math.PI / 2 },
  ford: { x: -120, z: -105, yaw: -Math.PI / 2 },
  depot: { x: 0, z: 260, yaw: 0 },
} as const;
export type FilmSpot = keyof typeof FILM_SPOTS;
export function filmSpotFromSearch(search: string): FilmSpot {
  const value = new URLSearchParams(search).get('spawn');
  return value && value in FILM_SPOTS ? value as FilmSpot : 'runway';
}
