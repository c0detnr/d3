import { filmSetHeight } from '../world/filmSetLayout.ts';
import type { DuelTeam, TeamDuelLayout } from './teamDuelLayout.ts';
const point = (x: number, z: number) => ({ x, y: filmSetHeight(x, z), z });
/**
 * Random-spawn pool (x, z metres), ten per team on its own half and ≥ 70 m apart within the team.
 * Picked by farthest-point sampling over FilmNavigation nodes with all eight neighbours, inside
 * |x| ≤ 140, flat under the hull and clear of colliders; team:test re-checks each against Havok.
 */
const POOL = {
  A: [[-2, -153], [-140, -213], [136, -213], [106, -99], [-128, -99], [52, -213], [-74, -177], [-56, -105], [40, -99], [94, -165]],
  B: [[-2, 57], [-140, -3], [136, -3], [-110, 111], [106, 111], [-56, -3], [58, 3], [-44, 111], [-98, 45], [46, 99]],
} as const;
const POOL_POINTS = { A: POOL.A.map(([x, z]) => point(x, z)), B: POOL.B.map(([x, z]) => point(x, z)) };
/** 310 m between bases, straddling the hangar, ruined house and west ridge. No world assets move. */
export const FILM_TEAM_LAYOUT: TeamDuelLayout = {
  navigation: 'film', teamSize: 3, respawn: true,
  spawn(team: DuelTeam, slot: number) {
    if (!Number.isInteger(slot) || slot < 0 || slot >= 3) throw new RangeError('Film team slot must be 0..2');
    return point(-65 - slot * 18, team === 'A' ? -205 : 105);
  },
  yaw: team => team === 'A' ? 0 : Math.PI,
  spawnPool: team => POOL_POINTS[team],
  center: point(0, -50),
  route(team, slot) {
    // Strategic centre / west flank goals. FilmNavigation supplies the actual collision-safe A* path.
    const x = [-120, -145, -120][slot];
    const points = [point(x, -184), point(x, -105), point(x, -65), point(x - 8, 15), point(x, 80), point(-65 - slot * 18, 105)];
    if (team === 'A') return points;
    return [point(x, 80), point(x - 8, 15), point(x, -65), point(x, -105), point(x, -184), point(-65 - slot * 18, -205)];
  },
};
