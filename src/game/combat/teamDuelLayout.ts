import { Vector3 } from '@babylonjs/core';
import { KUL_ROUTES, kulTerrainHeight } from '../world/kulVadisiLayout.ts';

export type DuelTeam = 'A' | 'B';
const formation = [[0, -285], [-12, -299], [12, -299], [-7, -314], [7, -314]];
export function teamSpawn(team: DuelTeam, slot: number) {
  if (!Number.isInteger(slot) || slot < 0 || slot >= 5) throw new RangeError('Team slot must be 0..4');
  const sign = team === 'A' ? 1 : -1;
  const [x, z] = formation[slot].map(value => value * sign);
  return new Vector3(x, kulTerrainHeight(x, z), z);
}
export const teamYaw = (team: DuelTeam) => team === 'A' ? 0 : Math.PI;
export function teamRoute(team: DuelTeam, slot: number) {
  const route = KUL_ROUTES[[1, 0, 2, 1, 0][slot]];
  const points = team === 'A' ? route.points : [...route.points].reverse();
  const waypoints = points.slice(1).map(p => new Vector3(p.x, kulTerrainHeight(p.x, p.z), p.z));
  if (Math.abs(points[1].x) < 40) {
    const sign = team === 'A' ? 1 : -1;
    const x = (slot % 2 ? -7 : 7) * sign, z = -274 * sign;
    waypoints.unshift(new Vector3(x, kulTerrainHeight(x, z), z));
  }
  return waypoints;
}
export function duelOutcome(a: number, b: number): DuelTeam | 'draw' | undefined {
  return a === 0 && b === 0 ? 'draw' : a === 0 ? 'B' : b === 0 ? 'A' : undefined;
}

export interface TeamPoint { x: number; y: number; z: number }
export interface TeamDuelLayout {
  navigation?: 'film';
  teamSize: number;
  respawn: boolean;
  spawn: (team: DuelTeam, slot: number) => TeamPoint;
  yaw: (team: DuelTeam) => number;
  route: (team: DuelTeam, slot: number) => TeamPoint[];
  /** Optional verified random-spawn pool per team (own half); without it `spawn` slots are fixed. */
  spawnPool?: (team: DuelTeam) => readonly TeamPoint[];
  /** Facing target for a spawn when no enemy is alive. */
  center?: TeamPoint;
}
export const KUL_TEAM_LAYOUT: TeamDuelLayout = { teamSize: 5, respawn: false, spawn: teamSpawn, yaw: teamYaw, route: teamRoute };
