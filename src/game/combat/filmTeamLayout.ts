import { filmSetHeight } from '../world/filmSetLayout.ts';
import type { DuelTeam, TeamDuelLayout } from './teamDuelLayout.ts';
const point = (x: number, z: number) => ({ x, y: filmSetHeight(x, z), z });
/** 310 m between bases, straddling the hangar, ruined house and west ridge. No world assets move. */
export const FILM_TEAM_LAYOUT: TeamDuelLayout = {
  navigation: 'film', teamSize: 3, respawn: true,
  spawn(team: DuelTeam, slot: number) {
    if (!Number.isInteger(slot) || slot < 0 || slot >= 3) throw new RangeError('Film team slot must be 0..2');
    return point(-65 - slot * 18, team === 'A' ? -205 : 105);
  },
  yaw: team => team === 'A' ? 0 : Math.PI,
  route(team, slot) {
    // Strategic centre / west flank goals. FilmNavigation supplies the actual collision-safe A* path.
    const x = [-120, -145, -120][slot];
    const points = [point(x, -184), point(x, -105), point(x, -65), point(x - 8, 15), point(x, 80), point(-65 - slot * 18, 105)];
    if (team === 'A') return points;
    return [point(x, 80), point(x - 8, 15), point(x, -65), point(x, -105), point(x, -184), point(-65 - slot * 18, -205)];
  },
};
