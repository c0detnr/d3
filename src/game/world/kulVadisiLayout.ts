import { KUL_FIELD_COVER, KUL_FIELD_RELIEF } from './kulBattlefieldLayout.ts';
import { smooth, terrainNoise } from './terrain.ts';

export type MapPoint = { x: number; z: number };
export const KUL_LIMIT = 360;
export const KUL_STEP = 3;
export const KUL_ROAD_WIDTH = 18;
export const KUL_SPAWNS = { A: { x: 0, z: -309 }, B: { x: 0, z: 309 } };
const point = (x: number, z: number): MapPoint => ({ x, z });
const mirror = (p: MapPoint) => point(-p.x, -p.z);
export const KUL_ROUTES = [
  { id: 'west', name: 'Ormanlık sırt', points: [point(0, -309), point(-78, -300), point(-90, -240), point(-180, -180), point(-210, -90), point(-186, 0), point(-210, 90), point(-180, 180), point(-90, 240), point(-78, 300), point(0, 309)] },
  { id: 'center', name: 'Açık savaş alanı', points: [point(0, -309), point(-78, -300), point(-78, -252), point(-30, -198), point(-24, -132), point(-24, -66), point(0, 0), point(24, 66), point(24, 132), point(30, 198), point(78, 252), point(78, 300), point(0, 309)] },
  { id: 'east', name: 'Taş ocağı', points: [point(0, -309), point(78, -300), point(90, -240), point(180, -180), point(210, -90), point(186, 0), point(210, 90), point(180, 180), point(90, 240), point(78, 300), point(0, 309)] },
];
export const KUL_CONNECTIONS = [-102, 102].map(z => ({ id: `creek-${z}`, name: 'Kuru dere', points: [point(-210, z), point(-108, z + 18), point(0, z), point(108, z - 18), point(210, z)] }));
export const KUL_PATHS = [...KUL_ROUTES, ...KUL_CONNECTIONS];
export function segmentDistance(p: MapPoint, a: MapPoint, b: MapPoint) {
  const dx = b.x - a.x, dz = b.z - a.z;
  const t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.z - a.z) * dz) / (dx * dx + dz * dz)));
  return Math.hypot(p.x - a.x - dx * t, p.z - a.z - dz * t);
}
export function kulRoadDistance(x: number, z: number) {
  let distance = Infinity;
  for (const path of KUL_PATHS) for (let i = 1; i < path.points.length; i++) {
    distance = Math.min(distance, segmentDistance({ x, z }, path.points[i - 1], path.points[i]));
  }
  return distance;
}
export type KulStructure = MapPoint & { id: string; team?: 'A' | 'B'; kind: 'outer' | 'inner' | 'command' | 'hangar' | 'workshop' | 'berm' | 'emplacement'; width: number; depth: number; height: number; yaw?: number };
const base: Omit<KulStructure, 'team'>[] = [
  { id: 'outer-west', kind: 'outer', x: -132, z: -183, width: 24, depth: 21, height: 9 },
  { id: 'outer-center', kind: 'outer', x: 9, z: -201, width: 24, depth: 21, height: 9 },
  { id: 'outer-east', kind: 'outer', x: 132, z: -183, width: 24, depth: 21, height: 9 },
  { id: 'inner', kind: 'inner', x: 0, z: -249, width: 30, depth: 24, height: 11 },
  { id: 'command', kind: 'command', x: -42, z: -282, width: 30, depth: 24, height: 14 },
  { id: 'hangar', kind: 'hangar', x: 0, z: -336, width: 40, depth: 24, height: 11.74 },
  { id: 'spawn-screen', kind: 'berm', x: 0, z: -279, width: 51, depth: 9, height: 8 },
];
export const KUL_STRUCTURES: KulStructure[] = [
  ...base.map(s => ({ ...s, team: 'A' as const, id: `A-${s.id}` })),
  ...base.map(s => ({ ...s, ...mirror(s), team: 'B' as const, id: `B-${s.id}`, yaw: Math.PI })),
  { id: 'factory-hangar', kind: 'hangar', x: -135, z: -36, width: 40, depth: 24, height: 11.74 },
  { id: 'factory-workshop', kind: 'workshop', x: 132, z: -48, width: 23, depth: 14, height: 6.71 },
  { id: 'factory-store', kind: 'workshop', x: 138, z: 66, width: 23, depth: 14, height: 6.71 },
];

/** K0 provisional heights in metres. Roads are graded, with a smooth base apron. */
function rawTerrainHeight(x: number, z: number) {
  const front = 1 - smooth((Math.abs(z) - 156) / 96);
  const west = 15 * Math.exp(-(((x + 210) / 100) ** 2));
  const quarry = -12 * Math.exp(-(((x - 210) / 95) ** 2));
  const shelves = 2.5 * Math.sin((x - 120) / 22) * Math.exp(-(((x - 210) / 100) ** 2));
  const road = 1 - smooth((kulRoadDistance(x, z) - KUL_ROAD_WIDTH / 2) / 12);
  const bumps = (terrainNoise(x / 34 + 7, z / 34 + 19) - 0.5) * 6;
  const creek = Math.max(...KUL_CONNECTIONS.map(c => 1 - smooth((Math.abs(z - c.points[2].z) - 9) / 24)));
  // Gentle verge only; the visible horizon is the visual-only mountain ring (createKulMountains).
  const rim = smooth((Math.max(Math.abs(x), Math.abs(z)) - 352) / 8) * 5;
  const relief = KUL_FIELD_RELIEF.reduce((sum, p) => {
    const radius = Math.hypot((x - p.x) / p.rx, (z - p.z) / p.rz);
    return sum + p.height * (1 - smooth(radius));
  }, 0) * (1 - road);
  return relief + front * (west + quarry + shelves * (1 - road) + bumps * (1 - road) - creek * 2) + rim;
}

/** Level building pads with a six-metre apron; keep terrain and Havok on one surface. */
export function kulTerrainHeight(x: number, z: number) {
  const height = rawTerrainHeight(x, z);
  for (const p of KUL_FIELD_COVER) {
    const edge = Math.max(Math.abs(x - p.x) - (p.width + 1) / 2, Math.abs(z - p.z) - (p.depth + 1) / 2);
    if (edge < 3) {
      const blend = smooth(Math.max(0, edge) / 3);
      return rawTerrainHeight(p.x, p.z) * (1 - blend) + height * blend;
    }
  }
  for (const s of KUL_STRUCTURES) {
    if (s.kind !== 'hangar' && s.kind !== 'workshop') continue;
    const edge = Math.max(Math.abs(x - s.x) - s.width / 2, Math.abs(z - s.z) - s.depth / 2);
    if (edge < 6) {
      const blend = smooth(Math.max(0, edge) / 6);
      return rawTerrainHeight(s.x, s.z) * (1 - blend) + height * blend;
    }
  }
  return height;
}
