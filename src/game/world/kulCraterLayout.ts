import { smooth } from './terrain.ts';

export type KulCrater = { x: number; z: number; radius: number; depth: number };

/** Raised rim height and outer extent (fraction of radius), in metres / unitless. */
export const KUL_CRATER_RIM = { height: 0.3, extent: 1.4 } as const;

/**
 * Metres. Fixed, point-symmetric shell craters in the open centre (x −115..115, z −155..155).
 * Radius/depth suit the 3 m terrain grid: hull-down spots, never a trap for a tank.
 */
const HALF: KulCrater[] = [
  { x: -93, z: -139, radius: 7, depth: 0.9 },
  { x: 8, z: -150, radius: 7, depth: 1.0 },
  { x: 100, z: -151, radius: 6.5, depth: 0.8 },
  { x: -95, z: -117, radius: 6, depth: 0.7 },
  { x: 12, z: -66, radius: 6.5, depth: 0.9 },
  { x: 76, z: -58, radius: 6, depth: 0.8 },
  { x: 97, z: -78, radius: 6, depth: 0.7 },
  { x: 99, z: -17, radius: 5.5, depth: 0.6 },
];
export const KUL_FIELD_CRATERS: KulCrater[] = [...HALF, ...HALF.map(c => ({ ...c, x: -c.x, z: -c.z }))];

/** Height offset of all craters at (x, z): bowl down to −depth, rim peak +0.3 m at the radius. */
export function kulCraterHeight(x: number, z: number) {
  let height = 0;
  for (const c of KUL_FIELD_CRATERS) {
    const dx = x - c.x, dz = z - c.z;
    const reach = c.radius * KUL_CRATER_RIM.extent;
    if (dx * dx + dz * dz >= reach * reach) continue;
    const t = Math.hypot(dx, dz) / c.radius;
    height += -c.depth * (1 - smooth(t / 0.95)) + KUL_CRATER_RIM.height * (1 - smooth(Math.abs(t - 1) / (KUL_CRATER_RIM.extent - 1)));
  }
  return height;
}
