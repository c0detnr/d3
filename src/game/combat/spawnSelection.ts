import type { TeamPoint } from './teamDuelLayout.ts';

/** Distances in metres (XZ plane). */
export const SPAWN_RULES = {
  /** A spawn closer than this to a living enemy is unsafe. */
  minEnemyDistance: 60,
  /** Two tanks never share a spawn: hull length plus margin. */
  minTankGap: 14,
} as const;

/** Small deterministic PRNG (mulberry32); returns [0, 1). */
export function seededRandom(seed: number) {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6D2B79F5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export interface SpawnQuery {
  /** Living enemy positions. */
  threats: readonly TeamPoint[];
  /** Positions already held by other living tanks (either team). */
  occupied: readonly TeamPoint[];
  random: () => number;
  /** Optional line-of-sight test from a threat to a candidate. */
  visible?: (threat: TeamPoint, point: TeamPoint) => boolean;
}

const flat = (a: TeamPoint, b: TeamPoint) => Math.hypot(a.x - b.x, a.z - b.z);

/**
 * Random among free, safe (≥ minEnemyDistance) candidates, preferring those no enemy can see.
 * With no safe candidate the free point farthest from every enemy wins (deterministic).
 */
export function chooseSpawn(pool: readonly TeamPoint[], query: SpawnQuery): TeamPoint {
  if (!pool.length) throw new RangeError('Empty spawn pool');
  const free = pool.filter(p => query.occupied.every(o => flat(o, p) >= SPAWN_RULES.minTankGap));
  const candidates = free.length ? free : pool;
  const clearance = (p: TeamPoint) => query.threats.reduce((d, t) => Math.min(d, flat(t, p)), Infinity);
  const safe = candidates.filter(p => clearance(p) >= SPAWN_RULES.minEnemyDistance);
  if (safe.length) {
    const hidden = query.visible ? safe.filter(p => query.threats.every(t => !query.visible!(t, p))) : safe;
    const choice = hidden.length ? hidden : safe;
    return choice[Math.min(choice.length - 1, Math.floor(query.random() * choice.length))];
  }
  return candidates.reduce((best, p) => clearance(p) > clearance(best) ? p : best);
}

/** Yaw (radians, 0 = +Z) facing the nearest threat, or the fallback point when no enemy lives. */
export function spawnYaw(at: TeamPoint, threats: readonly TeamPoint[], fallback: TeamPoint) {
  let target = fallback, distance = Infinity;
  for (const t of threats) { const d = flat(t, at); if (d < distance) { distance = d; target = t; } }
  return Math.atan2(target.x - at.x, target.z - at.z);
}
