import { FILM_SPAWN, RUNWAY, WHOOPS, filmSetHeight } from '../world/filmSetLayout.ts';
import type { DuelTeam, TeamDuelLayout } from './teamDuelLayout.ts';

const south = FILM_SPAWN.z + 20;
const north = RUNWAY.zMax - 22;
const point = (x: number, z: number) => ({ x, y: filmSetHeight(x, z), z });
/** Bases are 300 m apart. Flanks stay inside the existing runway camera lanes. */
export const FILM_TEAM_LAYOUT: TeamDuelLayout = {
  teamSize: 3, respawn: true,
  spawn(team: DuelTeam, slot: number) {
    if (!Number.isInteger(slot) || slot < 0 || slot >= 3) throw new RangeError('Film team slot must be 0..2');
    return point((slot - 1) * RUNWAY.halfWidth * 1.5, team === 'A' ? south : north);
  },
  yaw: team => team === 'A' ? 0 : Math.PI,
  route(team, slot) {
    const x = [0, -RUNWAY.halfWidth * 4, WHOOPS.x][slot];
    const points = [point(x, south), point(x, south + 22), point(x, -70), point(x, 0), point(x, 70), point(x, north - 22), point(x, north)];
    return team === 'A' ? points : points.reverse();
  },
};
