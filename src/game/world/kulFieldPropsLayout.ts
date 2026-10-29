/**
 * Metres / radians. Fixed, point-symmetric field props for the open Kül Vadisi centre.
 * Each list holds the team-A half; `mirror` adds the (x, z) → (−x, −z), yaw + π copy.
 * Local offsets rotate like Babylon `rotation.y`: x' = x·cos + z·sin, z' = −x·sin + z·cos.
 */
import type { MapPoint } from './kulVadisiLayout.ts';

type Placed = MapPoint & { yaw: number };
export type FieldPropKind = 'dragon-teeth' | 'hedgehogs' | 'sandbags' | 'hedge' | 'barrels' | 'crates' | 'pole' | 'barbed-wire';
/** Footprint circle of one piece; `hard` pieces stop tanks and projectiles. */
export type FieldPropPiece = MapPoint & { id: string; kind: FieldPropKind; hard: boolean; radius: number; yaw: number; team: 'A' | 'B' };

const mirrorPoint = (p: MapPoint) => ({ x: -p.x, z: -p.z });
const mirror = <T extends Placed>(list: T[]) => list.flatMap(p => [p, { ...p, ...mirrorPoint(p), yaw: p.yaw + Math.PI }]);
const mirrorLines = <T extends { points: MapPoint[] }>(list: T[]) => list.flatMap(l => [l, { ...l, points: l.points.map(mirrorPoint) }]);
export function localToWorld(p: Placed, dx: number, dz: number): MapPoint {
  const c = Math.cos(p.yaw), s = Math.sin(p.yaw);
  return { x: p.x + dx * c + dz * s, z: p.z - dx * s + dz * c };
}

/** Truncated concrete pyramids, 1.2 m base, 0.5 m top, 1.35 m tall, 2 m centre spacing along local x. */
export const DRAGON_TOOTH = { base: 1.2, top: 0.5, height: 1.35, spacing: 2 } as const;
export const KUL_DRAGON_TEETH_ROWS = mirror([
  { x: 4, z: -140, yaw: 0, count: 5 },
  { x: 18, z: -126, yaw: 0.5, count: 4 },
  { x: 88, z: -82, yaw: 1.2, count: 5 },
]);
export const toothPositions = (row: (typeof KUL_DRAGON_TEETH_ROWS)[number]) =>
  Array.from({ length: row.count }, (_, i) => localToWorld(row, (i - (row.count - 1) / 2) * DRAGON_TOOTH.spacing, 0));

/** Three crossed I-beams, 2.8 m long → about 1.6 m tall and 2.3 m wide. */
export const HEDGEHOG = { beam: 2.8, flange: 0.2, radius: 1.2 } as const;
const HEDGEHOG_OFFSETS = [[-3.2, 0], [0, 2.3], [3.3, -0.4]] as const;
export const KUL_HEDGEHOG_GROUPS = mirror([
  { x: -80, z: -125, yaw: 0.3 },
  { x: 20, z: -48, yaw: 0.4 },
  { x: 100, z: -140, yaw: -0.5 },
]);
export const hedgehogPositions = (g: Placed) => HEDGEHOG_OFFSETS.map(([dx, dz], i) => ({ ...localToWorld(g, dx, dz), yaw: g.yaw + i * 0.9 }));

/** Four layers of 0.65 × 0.28 × 0.42 m bags (1.12 m); broken lines on the positive earth ridges. */
export const SANDBAG = { length: 0.65, height: 0.28, depth: 0.42, layers: 4 } as const;
export const KUL_SANDBAG_LINES = mirrorLines([
  { points: [{ x: -70, z: -119 }, { x: -66, z: -117.3 }, { x: -62, z: -117.6 }] },
  { points: [{ x: -46, z: -130 }, { x: -45, z: -125.5 }, { x: -46, z: -121.5 }] },
  { points: [{ x: 47, z: -35 }, { x: 45.5, z: -30.5 }, { x: 46, z: -26.5 }] },
  { points: [{ x: 61, z: -17 }, { x: 65.5, z: -15.8 }, { x: 69.5, z: -16.6 }] },
]);
export const lineSegments = (points: MapPoint[]) => points.slice(1).map((b, i) => {
  const a = points[i], length = Math.hypot(b.x - a.x, b.z - a.z);
  // yaw turns local +x onto the segment direction.
  return { a, b, length, x: (a.x + b.x) / 2, z: (a.z + b.z) / 2, yaw: Math.atan2(-(b.z - a.z), b.x - a.x) };
});

/** Soft cover: bush/tall-grass rows block sight only; no physics. */
export const KUL_HEDGE_ROWS = mirror([
  { x: -52, z: -71, yaw: Math.PI / 2, length: 14 },
  { x: 10, z: -80, yaw: 0, length: 14 },
]);
export const hedgePlants = (row: (typeof KUL_HEDGE_ROWS)[number]) => {
  const count = Math.round(row.length / 1.75);
  return Array.from({ length: count * 2 }, (_, i) => {
    const bush = i % 2 === 0, j = Math.floor(i / 2), along = (j - (count - 1) / 2) * 1.75 + (bush ? 0 : 0.85);
    const side = bush ? (j % 2 ? 0.35 : -0.25) : (j % 2 ? -0.7 : 0.6);
    return { ...localToWorld(row, along, side), yaw: row.yaw + i * 1.37, bush, size: bush ? 2.1 + (i % 3) * 0.15 : 1.5 + (i % 4) * 0.1 };
  });
};

/** Supply dumps: rusty barrels (some tipped) and wooden crates (some broken). */
const BARRELS = [[0, 0, 0], [0.7, 0.15, 0], [0.3, 0.75, 0], [-0.9, 0.5, 1], [1.7, -0.7, 1]] as const;
const CRATES = [[-1.6, -1.2, 0.3, 0], [-0.5, -2.0, 0.9, 1], [-1.3, -2.1, 0.2, 0]] as const;
export const KUL_SUPPLY_DUMPS = mirror([
  { x: -50, z: -152, yaw: 0.4 },
  { x: 80, z: -98, yaw: 2.1 },
  { x: 55, z: -44, yaw: -0.8 },
  { x: -100, z: -130, yaw: 1.3 },
]);
export const dumpBarrels = (d: Placed) => BARRELS.map(([dx, dz, tipped], i) => ({ ...localToWorld(d, dx, dz), yaw: d.yaw + i * 1.1, tipped: tipped === 1 }));
export const dumpCrates = (d: Placed) => CRATES.map(([dx, dz, yaw, broken]) => ({ ...localToWorld(d, dx, dz), yaw: d.yaw + yaw, broken: broken === 1 }));

/** 7.5 m wooden telephone poles; lean in radians towards `leanYaw`, cable between consecutive tops. */
export const POLE = { height: 7.5, diameter: 0.26, arm: 1.8 } as const;
export const KUL_POLE_LINES = [
  { points: [{ x: 104, z: -72, lean: 0.14, leanYaw: 0.4 }, { x: 96, z: -58, lean: 0.55, leanYaw: 2.2 }] },
].flatMap(l => [l, { points: l.points.map(p => ({ ...p, x: -p.x, z: -p.z, leanYaw: p.leanYaw + Math.PI })) }]);

/** Barbed-wire fences: pickets every ~2.5 m, concertina coil and a sagging top strand. */
export const KUL_WIRE_LINES = mirrorLines([
  { points: [{ x: -62, z: -111 }, { x: -54, z: -109.5 }, { x: -47, z: -111 }] },
  { points: [{ x: 58, z: -10 }, { x: 64, z: -8 }, { x: 70, z: -9.5 }] },
]);

const teamOf = (p: MapPoint) => (p.z < 0 || (p.z === 0 && p.x < 0) ? 'A' : 'B') as 'A' | 'B';
/** Every piece's footprint; used for placement checks and by other layout code to keep clear. */
export function kulFieldPropPieces(): FieldPropPiece[] {
  const out: FieldPropPiece[] = [];
  const add = (id: string, kind: FieldPropKind, hard: boolean, radius: number, p: MapPoint & { yaw?: number }) =>
    out.push({ id, kind, hard, radius, x: p.x, z: p.z, yaw: p.yaw ?? 0, team: teamOf(p) });
  KUL_DRAGON_TEETH_ROWS.forEach((row, r) => toothPositions(row).forEach((p, i) => add(`teeth-${r}`, 'dragon-teeth', true, DRAGON_TOOTH.base * Math.SQRT1_2, { ...p, yaw: row.yaw })));
  KUL_HEDGEHOG_GROUPS.forEach((g, r) => hedgehogPositions(g).forEach(p => add(`hedgehogs-${r}`, 'hedgehogs', true, HEDGEHOG.radius, p)));
  KUL_SANDBAG_LINES.forEach((line, r) => lineSegments(line.points).forEach(s => {
    for (let t = 0; t <= s.length + 1e-6; t += 0.5) add(`sandbags-${r}`, 'sandbags', true, SANDBAG.depth * 1.2,
      { x: s.a.x + (s.b.x - s.a.x) * t / s.length, z: s.a.z + (s.b.z - s.a.z) * t / s.length, yaw: s.yaw });
  }));
  KUL_HEDGE_ROWS.forEach((row, r) => hedgePlants(row).forEach(p => add(`hedge-${r}`, 'hedge', false, p.size / 2, p)));
  KUL_SUPPLY_DUMPS.forEach((d, r) => {
    dumpBarrels(d).forEach(p => add(`dump-${r}`, 'barrels', false, p.tipped ? 0.5 : 0.3, p));
    dumpCrates(d).forEach(p => add(`dump-${r}`, 'crates', false, 0.65, p));
  });
  KUL_POLE_LINES.forEach((line, r) => line.points.forEach((p, i) => {
    // Lean moves the top away from the base; sample the whole projected shaft.
    const reach = Math.sin(p.lean) * POLE.height;
    for (let t = 0; t <= 1; t += 0.25) add(`pole-${r}-${i}`, 'pole', true, POLE.arm / 2,
      { x: p.x + Math.sin(p.leanYaw) * reach * t, z: p.z + Math.cos(p.leanYaw) * reach * t });
  }));
  KUL_WIRE_LINES.forEach((line, r) => lineSegments(line.points).forEach(s => {
    for (let t = 0; t <= s.length + 1e-6; t += 1) add(`wire-${r}`, 'barbed-wire', false, 0.4,
      { x: s.a.x + (s.b.x - s.a.x) * t / s.length, z: s.a.z + (s.b.z - s.a.z) * t / s.length });
  }));
  return out;
}
